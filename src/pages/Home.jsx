import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calculator as CalcIcon, Library, Sigma, Code2, ScrollText, ArrowRight } from 'lucide-react';
import AssemblyPreview from '../components/calculator/AssemblyPreview.jsx';
import { Badge } from '../components/ui/StatusMessage.jsx';
import { createExampleAssembly } from '../data/exampleAssembly.js';
import { buildMaterialsById, elementTypes, calculationData, uValueLimits, cteMetadata } from '../data/index.js';
import { calculateAssembly, evaluateCompliance, formatNumber, formatU } from '../engine/index.js';

export default function Home() {

  const { calc, materialsById, compliance } = useMemo(() => {
    const mats = buildMaterialsById();
    const example = createExampleAssembly();
    const c = calculateAssembly(example, { materialsById: mats, elementTypes, calculationData });
    const v = evaluateCompliance({ calculation: c, climateZone: example.climateZone, limitsData: uValueLimits });
    return { calc: c, materialsById: mats, compliance: v };
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">Código abierto · CTE DB-HE</p>
          <h1 className="hero__title">Transmitancia térmica de cerramientos, calculada con transparencia.</h1>
          <p className="hero__lead">
            Arqtherm calcula la resistencia térmica y el valor U de elementos de capas
            homogéneas según el DA DB-HE/1 y los compara con los valores límite del DB-HE,
            mostrando cada fórmula, fuente e hipótesis.
          </p>
          <div className="hero__actions">
            <Link to="/calculadora" className="btn btn--primary btn--lg">
              <CalcIcon aria-hidden="true" size={18} /> <span>Abrir calculadora</span>
            </Link>
            <Link to="/materiales" className="btn btn--secondary btn--lg">
              <Library aria-hidden="true" size={18} /> <span>Explorar materiales</span>
            </Link>
          </div>
          <p className="small muted">Sin registro. Los datos se guardan solo en su navegador.</p>
        </div>

        <figure className="hero__preview" aria-label="Vista previa de la calculadora con el elemento de ejemplo">
          <div className="mini">
            <div className="mini__head">
              <span className="mini__title">Ejemplo · Fachada de fábrica con cámara</span>
              <Badge tone="warning">Ilustrativo</Badge>
            </div>
            <AssemblyPreview calculation={calc} materialsById={materialsById} compact />
            <ol className="mini__layers">
              {calc.layers.map((l) => (
                <li key={l.id}><span>{l.name}</span><span className="num">{formatNumber(l.thicknessMm, 0)} mm</span></li>
              ))}
            </ol>
            <div className="mini__result">
              <span className="mini__label">U</span>
              <span className="mini__value num">{formatU(calc.uValue)}</span>
              <span className="mini__unit">W/(m²·K)</span>
            </div>
            <p className="small muted">
              Zona C · U<sub>lim</sub> fachada {formatNumber(compliance.limit, 2)} W/(m²·K) ·{' '}
              {compliance.state === 'complies' ? 'cumple el límite' : 'no cumple el límite'}
            </p>
          </div>
          <figcaption className="small muted">Cálculo real del ejemplo con datos genéricos del CEC, verificados con el catálogo oficial.</figcaption>
        </figure>
      </section>

      <section className="features" aria-labelledby="features-title">
        <h2 id="features-title" className="visually-hidden">Características</h2>
        <article className="feature">
          <Sigma aria-hidden="true" size={22} strokeWidth={1.5} />
          <h3>Cálculo transparente</h3>
          <p>R = d/λ, R<sub>T</sub> = R<sub>si</sub> + ΣR + R<sub>se</sub>, U = 1/R<sub>T</sub>. Cada capa muestra su resistencia y su fuente; se calcula a precisión completa y solo se redondea al mostrar.</p>
        </article>
        <article className="feature">
          <ScrollText aria-hidden="true" size={22} strokeWidth={1.5} />
          <h3>Orientado al CTE</h3>
          <p>Resistencias superficiales y cámaras de aire del DA DB-HE/1 y valores límite de las tablas 3.1.1.a-HE1 y 3.2-HE1, más los valores orientativos del Anejo E, versionados y cotejados ({cteMetadata.verifiedOn}).</p>
        </article>
        <article className="feature">
          <Code2 aria-hidden="true" size={22} strokeWidth={1.5} />
          <h3>Código abierto</h3>
          <p>Licencia MIT, motor de cálculo independiente de la interfaz y probado, datos en JSON con su procedencia, informe PDF y exportación JSON en un formato documentado.</p>
        </article>
      </section>

      <section className="scope" aria-labelledby="scope-title">
        <h2 id="scope-title">Alcance y limitaciones</h2>
        <div className="scope__grid">
          <div>
            <h3>Calcula</h3>
            <ul>
              <li>Fachadas, cubiertas y suelos en contacto con el aire exterior.</li>
              <li>Medianerías y particiones interiores entre unidades de uso.</li>
              <li>Soleras, muros y cubiertas en contacto con el terreno, cámaras sanitarias y espacios no habitables.</li>
              <li>Condensaciones superficiales e intersticiales (Glaser) y espesor de aislamiento necesario.</li>
              <li>Capas homogéneas, fábricas con resistencia tabulada y cámaras de aire (DA DB-HE/1).</li>
            </ul>
          </div>
          <div>
            <h3>No calcula (todavía)</h3>
            <ul>
              <li>Huecos, capas heterogéneas y puentes térmicos.</li>
              <li>K global ni control solar.</li>
            </ul>
          </div>
        </div>
        <p className="muted">
          Un valor U que no supera su límite no acredita que el edificio cumpla el CTE.{' '}
          <Link to="/acerca-de" className="inline-link"> Más sobre la metodología <ArrowRight aria-hidden="true" size={14} /></Link>
        </p>
      </section>
    </div>
  );
}
