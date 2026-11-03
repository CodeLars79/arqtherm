import FormField from '../ui/FormField.jsx';
import { calculationData, materialCategories } from '../../data/index.js';
import { characteristicLength, ventilationCase, formatNumber, DRAINAGE_FACTORS } from '../../engine/index.js';

const T = calculationData.groundAndUnheated.tables;

/** Campo numérico que guarda el texto tal cual (admite coma decimal) y lo convierte a número. */
function NumberField({ label, hint, unit, value, onChange, min = 0, step = 'any' }) {
  return (
    <FormField label={unit ? `${label} (${unit})` : label} hint={hint}>
      {(p) => (
        <input
          {...p}
          className="input input--num"
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )}
    </FormField>
  );
}

function Select({ label, hint, value, onChange, options }) {
  return (
    <FormField label={label} hint={hint}>
      {(p) => (
        <select {...p} className="input select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </FormField>
  );
}

function BPrime({ params }) {
  const b = characteristicLength(params.areaM2, params.perimeterM);
  return (
    <p className="params__derived">
      Longitud característica <strong className="num">B′ = A / (0,5 · P) = {b === null ? '—' : `${formatNumber(b, 2)} m`}</strong>
    </p>
  );
}

const insulationLabel = materialCategories.find((c) => c.id === 'insulation')?.label ?? 'Aislamiento';

/** Parámetros del procedimiento según el tipo de elemento (DA DB-HE/1, 2.1.2 y 2.1.3). */
/** Corrección opcional de cubierta invertida (UNE-EN ISO 6946, anexo F). */
function InvertedRoof({ params, onChange, layers, materialsById }) {
  const enabled = params.invertedRoof === true;
  const insulation = layers.filter((l) => materialsById[l.materialId]?.category === 'insulation');
  return (
    <fieldset className="params">
      <legend className="params__title">Cubierta invertida (opcional)</legend>
      <label className="params__check">
        <input type="checkbox" checked={enabled} onChange={(e) => onChange({ invertedRoof: e.target.checked })} />
        <span>
          Aplicar la corrección por agua de lluvia bajo el aislamiento (UNE-EN ISO 6946, anexo F)
          <small> En cubiertas invertidas, el agua que circula sobre la impermeabilización bajo el aislamiento aumenta las pérdidas: ΔUr = p · f · x · (R1/RT)², con x = 0,04. No forma parte del DA DB-HE/1.</small>
        </span>
      </label>
      {enabled && (
        <div className="params__grid">
          <NumberField
            label="Precipitación media p"
            unit="mm/día"
            hint="Media diaria en la temporada de calefacción (octubre–mayo), según datos climáticos de la localidad (p. ej. AEMET)."
            value={params.rainMmDay}
            onChange={(v) => onChange({ rainMmDay: v })}
          />
          <Select
            label="Factor de drenaje f"
            value={String(params.drainageFactor ?? '1')}
            onChange={(v) => onChange({ drainageFactor: v })}
            options={DRAINAGE_FACTORS.map((d) => ({ value: d.id, label: `${String(d.value).replace('.', ',')} · ${d.label}` }))}
          />
          {insulation.length > 1 && (
            <Select
              label="Aislamiento sobre la impermeabilización (R1)"
              value={params.invertedInsulationLayerId ?? insulation[0].id}
              onChange={(v) => onChange({ invertedInsulationLayerId: v })}
              options={insulation.map((l) => ({ value: l.id, label: `${layers.indexOf(l) + 1}. ${l.name || materialsById[l.materialId]?.name}` }))}
            />
          )}
        </div>
      )}
    </fieldset>
  );
}

export default function ElementParameters({ elementType, params = {}, onChange, layers = [], materialsById = {} }) {
  const method = elementType?.calculationMethod;
  if (elementType?.id === 'cubierta') return <InvertedRoof params={params || {}} onChange={onChange} layers={layers} materialsById={materialsById} />;
  if (!method || method === 'layers') return null;
  const set = (key) => (value) => onChange({ [key]: value });

  let body = null;
  let intro = null;

  if (method === 'ground-slab') {
    const z = params.depthM ?? 0;
    const case2 = z > 0.5;
    const insulation = params.insulation || 'none';
    intro = case2
      ? 'Caso 2 (z > 0,5 m): Us se lee en la tabla 4 con la resistencia Rf de las capas, sin resistencias superficiales.'
      : 'Caso 1 (z ≤ 0,5 m): Us se lee en la tabla 3 según B′, el ancho D de la banda de aislamiento y su resistencia Ra.';
    body = (
      <>
        <div className="params__grid">
          <NumberField label="Superficie del suelo A" unit="m²" value={params.areaM2} onChange={set('areaM2')} />
          <NumberField label="Perímetro expuesto P" unit="m" hint="En contacto con el exterior o con espacios no calefactados." value={params.perimeterM} onChange={set('perimeterM')} />
          <NumberField label="Profundidad bajo el terreno z" unit="m" hint="0 si la solera apoya a nivel del terreno." value={params.depthM ?? 0} onChange={set('depthM')} />
        </div>
        <BPrime params={params} />
        {!case2 && (
          <div className="params__grid">
            <Select
              label="Aislamiento de la solera"
              value={insulation}
              onChange={set('insulation')}
              options={[
                { value: 'none', label: 'Sin aislamiento (Ra = 0)' },
                { value: 'band', label: 'Banda perimetral de ancho D' },
                { value: 'full', label: 'En toda la superficie (D ≥ 1,5 m)' }
              ]}
            />
            {insulation === 'band' && (
              <NumberField label="Ancho de la banda D" unit="m" hint="Tabla 3: 0,5 m, 1,0 m y ≥ 1,5 m; se interpola." value={params.bandWidthM} onChange={set('bandWidthM')} min={0.5} />
            )}
            {insulation !== 'none' && (
              <Select
                label="Resistencia del aislamiento Ra"
                value={params.raMode || 'auto'}
                onChange={set('raMode')}
                options={[
                  { value: 'auto', label: `Suma de las capas de «${insulationLabel}»` },
                  { value: 'manual', label: 'Introducir Ra manualmente' }
                ]}
              />
            )}
            {insulation !== 'none' && params.raMode === 'manual' && (
              <NumberField label="Ra" unit="m²·K/W" value={params.raManual} onChange={set('raManual')} />
            )}
          </div>
        )}
      </>
    );
  }

  if (method === 'ground-wall') {
    intro = 'UT se lee en la tabla 5 con la resistencia Rm de las capas del muro (sin resistencias superficiales) y la profundidad z de la parte enterrada.';
    body = (
      <div className="params__grid">
        <NumberField label="Profundidad de la parte enterrada z" unit="m" hint="Tabla 5: de 0,5 a ≥ 6 m; se interpola." value={params.depthM} onChange={set('depthM')} />
      </div>
    );
  }

  if (method === 'buried-roof') {
    intro = 'Se calcula como una cubierta en contacto con el aire exterior, añadiendo el terreno como una capa más de λ = 2 W/(m·K).';
    body = (
      <div className="params__grid">
        <NumberField label="Espesor de tierras sobre la cubierta" unit="mm" value={params.soilThicknessMm} onChange={set('soilThicknessMm')} />
      </div>
    );
  }

  if (method === 'crawl-space') {
    intro = 'Us se lee en la tabla 9 con B′ y la resistencia Rf del forjado sanitario, sin resistencias superficiales.';
    body = (
      <>
        <div className="params__grid">
          <NumberField label="Superficie del suelo A" unit="m²" value={params.areaM2} onChange={set('areaM2')} />
          <NumberField label="Perímetro expuesto P" unit="m" value={params.perimeterM} onChange={set('perimeterM')} />
        </div>
        <BPrime params={params} />
        <label className="params__check">
          <input type="checkbox" checked={params.crawlConditionsMet === true} onChange={(e) => onChange({ crawlConditionsMet: e.target.checked })} />
          <span>
            La cámara está ventilada por el exterior, su altura es h ≤ 1 m y el suelo está a z ≤ 0,5 m bajo el terreno exterior.
            <small> Si no se cumplen, el DA remite al apartado 2.1.1 o al cálculo general con b (2.1.3.1).</small>
          </span>
        </label>
      </>
    );
  }

  if (method === 'unheated-space') {
    const manual = params.bMode === 'manual';
    const kase = ventilationCase(params.airtightness);
    intro = 'U = Up · b. Up se calcula por capas con las resistencias superficiales de particiones (tabla 6) y b se lee en la tabla 7.';
    body = (
      <>
        <div className="params__grid">
          <Select
            label="Posición de la partición"
            value={params.flow || 'horizontal'}
            onChange={set('flow')}
            options={[
              { value: 'horizontal', label: 'Vertical (flujo horizontal)' },
              { value: 'upward', label: 'Horizontal, flujo ascendente (techo)' },
              { value: 'downward', label: 'Horizontal, flujo descendente (suelo)' }
            ]}
          />
          <Select
            label="Coeficiente de reducción b"
            value={params.bMode || 'table'}
            onChange={set('bMode')}
            options={[
              { value: 'table', label: 'Tabla 7 del DA DB-HE/1' },
              { value: 'manual', label: 'Valor conocido (p. ej. expresión 7)' }
            ]}
          />
        </div>
        {manual ? (
          <div className="params__grid">
            <NumberField label="b" hint="Entre 0 y 1." value={params.bManual} onChange={set('bManual')} />
          </div>
        ) : (
          <>
            <div className="params__grid">
              <NumberField label="Superficie de la partición Ah-nh" unit="m²" hint="Entre el espacio habitable y el no habitable." value={params.partitionAreaM2} onChange={set('partitionAreaM2')} />
              <NumberField label="Superficie del cerramiento Anh-e" unit="m²" hint="Entre el espacio no habitable y el exterior." value={params.envelopeAreaM2} onChange={set('envelopeAreaM2')} />
            </div>
            <div className="params__grid">
              <Select
                label="Estanqueidad del espacio no habitable (tabla 8)"
                hint={kase ? `Caso ${kase}: ${kase === 1 ? 'ligeramente ventilado' : 'muy ventilado'}.` : undefined}
                value={params.airtightness ?? ''}
                onChange={(v) => onChange({ airtightness: v === '' ? null : Number(v) })}
                options={[{ value: '', label: '— Seleccione —' }, ...T.T8.levels.map((l) => ({ value: String(l.level), label: `${l.level}. ${l.label}` }))]}
              />
              <Select
                label="Elementos aislados"
                value={params.insulationCase ?? ''}
                onChange={set('insulationCase')}
                options={[{ value: '', label: '— Seleccione —' }, ...T.T7.groups.map((g) => ({ value: g.id, label: g.label }))]}
              />
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <fieldset className="params">
      <legend className="params__title">Parámetros del procedimiento</legend>
      <p className="params__intro">{intro}</p>
      {body}
    </fieldset>
  );
}
