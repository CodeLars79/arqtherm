import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ExternalLink, Calculator as CalculatorIcon } from 'lucide-react';
import geo from '../data/geo/spainProvinces.json';
import { climateZonesData, DATA_STATUS } from '../data/index.js';
import { usePreference } from '../state/ConsentContext.jsx';
import { parseZoneCode, winterIndex, zoneForAltitude, formatBand } from '../engine/index.js';

const provinces = climateZonesData.provinces;
const byCode = Object.fromEntries(provinces.map((p) => [p.ineCode, p]));

const WINTER_LEGEND = [
  { key: 'α', label: 'α', hint: 'Invierno muy suave' },
  { key: 'A', label: 'A' },
  { key: 'B', label: 'B' },
  { key: 'C', label: 'C' },
  { key: 'D', label: 'D' },
  { key: 'E', label: 'E', hint: 'Invierno más severo' }
];
const SUMMER_LEGEND = [
  { key: 1, label: '1', hint: 'Verano más suave' },
  { key: 2, label: '2' },
  { key: 3, label: '3' },
  { key: 4, label: '4', hint: 'Verano más severo' }
];

/** Zona de la capital (altitud de referencia) — solo para colorear el mapa. */
function capitalZone(p) {
  return zoneForAltitude(p, p.capitalReferenceAltitudeM)?.zone ?? p.bands[0].zone;
}

function fillFor(zone, mode) {
  const z = parseZoneCode(zone);
  if (!z) return 'var(--zone-none)';
  return mode === 'winter' ? `var(--zone-w${winterIndex(z.winter)})` : `var(--zone-s${z.summer})`;
}

function ZoneTag({ zone, mode, size }) {
  return (
    <span className={`zone-tag ${size === 'lg' ? 'zone-tag--lg' : ''}`} style={{ background: fillFor(zone, mode) }}>
      {zone}
    </span>
  );
}

export default function ClimateZones() {

  const [storedMode, setMode] = usePreference('zonesMapMode', 'winter');
  const mode = storedMode === 'summer' ? 'summer' : 'winter';
  const [hover, setHover] = useState(null); // { code, x, y } — x/y en px relativos al mapa
  const [highlight, setHighlight] = useState(null); // fila de la tabla bajo el cursor
  const [query, setQuery] = useState('');
  const [storedCode, setLookupCode] = usePreference('zonesLookupProvince', '28');
  const lookupCode = byCode[storedCode] ? storedCode : '28';
  const [storedAltitude, setAltitude] = usePreference('zonesLookupAltitude', '650');
  const altitude = typeof storedAltitude === 'string' ? storedAltitude : '650';
  const mapRef = useRef(null);
  const tipRef = useRef(null);
  const [tipFlip, setTipFlip] = useState({ x: false, y: false });

  const capitalZones = useMemo(
    () => Object.fromEntries(provinces.map((p) => [p.ineCode, capitalZone(p)])),
    []
  );

  // Coloca la caja junto al cursor sin salirse del mapa.
  useEffect(() => {
    if (!hover || !tipRef.current || !mapRef.current) return;
    const box = mapRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    setTipFlip({
      x: hover.x + 18 + tip.width > box.width,
      y: hover.y + 18 + tip.height > box.height
    });
  }, [hover]);

  const showAt = (code, evt) => {
    const box = mapRef.current.getBoundingClientRect();
    setHover({ code, x: evt.clientX - box.left, y: evt.clientY - box.top });
  };
  const showAtCentroid = (code) => {
    const g = geo.provinces.find((p) => p.ineCode === code);
    const svg = mapRef.current.querySelector('svg').getBoundingClientRect();
    const box = mapRef.current.getBoundingClientRect();
    const [, , vw] = geo.viewBox.split(' ').map(Number);
    const k = svg.width / vw;
    setHover({ code, x: svg.left - box.left + g.cx * k, y: svg.top - box.top + g.cy * k, keyboard: true });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    if (!q) return provinces;
    return provinces.filter((p) =>
      `${p.name} ${p.capital} ${p.bands.map((b) => b.zone).join(' ')}`.toLocaleLowerCase('es').includes(q)
    );
  }, [query]);

  const lookupProvince = byCode[lookupCode];
  const lookupResult = altitude.trim() === '' ? null : zoneForAltitude(lookupProvince, altitude.replace(',', '.'));
  const altitudeInvalid = altitude.trim() !== '' && !lookupResult;

  const hovered = hover ? byCode[hover.code] : null;
  const legend = mode === 'winter' ? WINTER_LEGEND : SUMMER_LEGEND;
  const status = DATA_STATUS[climateZonesData.status];

  return (
    <div className="zones-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">CTE DB-HE · Anejo B</p>
          <h1 className="page-title">Zonas climáticas</h1>
          <p className="page-lead">
            La zona climática combina una letra de severidad de invierno (α, A–E) y un número de severidad de verano (1–4).
            Depende de la provincia y de la altitud de la localidad.
          </p>
        </div>
      </div>

      <section className="panel zones-map-panel" aria-labelledby="zones-map-title">
        <div className="panel__header panel__header--row zones-map-panel__head">
          <div>
            <h2 id="zones-map-title" className="panel__title">Mapa por provincias</h2>
            <p className="panel__subtitle">Color según la zona de la capital de provincia. Pase el cursor sobre una provincia.</p>
          </div>
          <div className="seg" role="radiogroup" aria-label="Colorear el mapa por">
            {[['winter', 'Invierno'], ['summer', 'Verano']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                className={`seg__btn ${mode === key ? 'seg__btn--active' : ''}`}
                onClick={() => setMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="zones-layout">
          <div className="zones-map" ref={mapRef} onPointerLeave={() => setHover(null)}>
            <svg viewBox={geo.viewBox} role="group" aria-label="Mapa de zonas climáticas de España por provincia">
              <path d={geo.canaryFrame} className="zones-map__frame" aria-hidden="true" />
              {geo.provinces.map((g) => {
                const zone = capitalZones[g.ineCode];
                const p = byCode[g.ineCode];
                const active = hover?.code === g.ineCode || highlight === g.ineCode;
                return (
                  <g
                    key={g.ineCode}
                    className={`zones-map__prov ${active ? 'is-active' : ''}`}
                    tabIndex={0}
                    role="img"
                    aria-label={`${p.name}: zona ${zone} en la capital (${p.capital}). Tramos: ${p.bands.map((b) => `${b.zone} ${formatBand(b)}`).join(', ')}.`}
                    onPointerMove={(e) => showAt(g.ineCode, e)}
                    onPointerEnter={(e) => showAt(g.ineCode, e)}
                    onFocus={() => showAtCentroid(g.ineCode)}
                    onBlur={() => setHover(null)}
                    onClick={() => setLookupCode(g.ineCode)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLookupCode(g.ineCode); } }}
                  >
                    <path d={g.d} style={{ fill: fillFor(zone, mode) }} />
                    {(g.ineCode === '51' || g.ineCode === '52') && (
                      <circle cx={g.cx} cy={g.cy} r="7" className="zones-map__hit" />
                    )}
                  </g>
                );
              })}
              {(hover?.code || highlight) && (
                <path
                  className="zones-map__outline"
                  d={geo.provinces.find((g) => g.ineCode === (hover?.code || highlight)).d}
                  aria-hidden="true"
                />
              )}
              <g className="zones-map__labels" aria-hidden="true">
                {geo.provinces.map((g) => (
                  <text key={g.ineCode} x={g.cx} y={g.cy + (g.ineCode === '51' || g.ineCode === '52' ? 18 : 3.5)} textAnchor="middle">
                    {capitalZones[g.ineCode]}
                  </text>
                ))}
              </g>
            </svg>

            {hovered && (
              <div
                ref={tipRef}
                className={`zones-tip ${tipFlip.x ? 'zones-tip--left' : ''} ${tipFlip.y ? 'zones-tip--up' : ''}`}
                style={{ left: hover.x, top: hover.y }}
                role="status"
              >
                <div className="zones-tip__head">
                  <ZoneTag zone={capitalZones[hovered.ineCode]} mode={mode} size="lg" />
                  <div>
                    <strong>{hovered.name}</strong>
                    <span>Capital: {hovered.capital}</span>
                  </div>
                </div>
                {hovered.bands.length > 1 ? (
                  <ul className="zones-tip__bands">
                    {hovered.bands.map((b) => (
                      <li key={b.zone + b.minM}><ZoneTag zone={b.zone} mode={mode} /> <span>{formatBand(b)}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="zones-tip__single">Zona única para cualquier altitud.</p>
                )}
              </div>
            )}
          </div>

          <aside className="zones-side">
            <div className="zones-legend">
              <h3 className="zones-side__title">{mode === 'winter' ? 'Severidad de invierno' : 'Severidad de verano'}</h3>
              <ol className="zones-legend__scale">
                {legend.map((l) => (
                  <li key={l.key}>
                    <span className="zones-legend__swatch" style={{ background: mode === 'winter' ? `var(--zone-w${winterIndex(l.key)})` : `var(--zone-s${l.key})` }} />
                    <span className="zones-legend__label">{l.label}</span>
                    {l.hint && <span className="zones-legend__hint">{l.hint}</span>}
                  </li>
                ))}
              </ol>
            </div>

            <form className="zones-lookup" onSubmit={(e) => e.preventDefault()} aria-labelledby="lookup-title">
              <h3 id="lookup-title" className="zones-side__title"><MapPin size={15} aria-hidden="true" /> Zona de una localidad</h3>
              <div className="field">
                <label className="field__label" htmlFor="lookup-province">Provincia</label>
                <select id="lookup-province" className="input select" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)}>
                  {provinces.map((p) => <option key={p.ineCode} value={p.ineCode}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="lookup-alt">Altitud de la localidad (m)</label>
                <input
                  id="lookup-alt"
                  className="input input--num"
                  inputMode="numeric"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  aria-invalid={altitudeInvalid}
                  aria-describedby="lookup-alt-hint"
                />
                {altitudeInvalid
                  ? <span className="field__error" id="lookup-alt-hint">Introduzca una altitud válida, en metros (0 o más).</span>
                  : <span className="field__hint" id="lookup-alt-hint">Altitud sobre el nivel del mar.</span>}
              </div>
              <div className="zones-lookup__result" aria-live="polite">
                {lookupResult ? (
                  <>
                    <ZoneTag zone={lookupResult.zone} mode={mode} size="lg" />
                    <span>
                      Zona <strong>{lookupResult.zone}</strong>
                      <small>{lookupProvince.name}, tramo {formatBand(lookupResult.band)}</small>
                    </span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              {lookupResult && (
                <Link
                  className="zones-lookup__link"
                  to="/calculadora"
                  state={{
                    climateZone: parseZoneCode(lookupResult.zone).winter === 'α' ? 'alpha' : parseZoneCode(lookupResult.zone).winter,
                    fullZone: lookupResult.zone,
                    place: `${lookupProvince.name}, ${altitude.trim()} m`,
                    ineCode: lookupProvince.ineCode,
                    altitudeM: Number(altitude.replace(',', '.'))
                  }}
                >
                  <CalculatorIcon size={14} aria-hidden="true" /> Usar zona {parseZoneCode(lookupResult.zone).winter} en la calculadora
                </Link>
              )}
            </form>
          </aside>
        </div>
      </section>

      <section className="panel zones-table-panel" aria-labelledby="zones-table-title">
        <div className="panel__header panel__header--row zones-table-panel__head">
          <div>
            <h2 id="zones-table-title" className="panel__title">{climateZonesData.title}</h2>
            <p className="panel__subtitle">Zona climática por provincia y altitud de la localidad (límites inclusivos).</p>
          </div>
          <div className="filters__search zones-search">
            <Search size={16} className="filters__icon" aria-hidden="true" />
            <label className="visually-hidden" htmlFor="zones-q">Buscar provincia, capital o zona</label>
            <input id="zones-q" className="input" type="search" placeholder="Buscar provincia, capital o zona…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap">
          <table className="zones-table">
            <thead>
              <tr>
                <th scope="col">Provincia</th>
                <th scope="col">Capital</th>
                <th scope="col" className="zones-table__cap">Zona capital<sup>*</sup></th>
                <th scope="col">Zonas por altitud de la localidad</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.ineCode}
                  className={hover?.code === p.ineCode ? 'is-active' : ''}
                  onPointerEnter={() => setHighlight(p.ineCode)}
                  onPointerLeave={() => setHighlight(null)}
                >
                  <th scope="row">{p.name}</th>
                  <td>{p.capital}</td>
                  <td className="zones-table__cap"><ZoneTag zone={capitalZones[p.ineCode]} mode={mode} /></td>
                  <td>
                    <ul className="zones-bands">
                      {p.bands.map((b) => (
                        <li key={b.zone + b.minM}>
                          <ZoneTag zone={b.zone} mode={mode} />
                          <span>{formatBand(b)}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="muted">Ninguna provincia coincide con «{query}».</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="zones-notes">
          <p className="zones-status">
            <span className={`badge ${climateZonesData.status === 'reference-verified' ? 'badge--success' : 'badge--warning'}`}>{status.short}</span>{' '}
            {climateZonesData.verification
              ? `Cotejada con el ${climateZonesData.verification.document}, pág. ${climateZonesData.verification.page}, el ${new Date(`${climateZonesData.verification.verifiedOn}T12:00:00`).toLocaleDateString('es-ES')}.`
              : status.description}
          </p>
          <ul>
            {climateZonesData.notes.map((n) => <li key={n}>{n.startsWith('La zona de la capital') ? <><sup>*</sup> {n}</> : n}</li>)}
          </ul>
          <h3 className="zones-side__title">Fuentes</h3>
          <ul className="zones-sources">
            {climateZonesData.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={12} aria-hidden="true" /></a></li>
            ))}
            <li>Cartografía: {geo.source}. {geo.license}.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
