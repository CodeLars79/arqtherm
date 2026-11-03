import { useEffect } from 'react';
import { ExternalLink, Mail } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cteMetadata, uValueLimits, calculationData } from '../data/index.js';
import { REPO_URL, ISSUES_URL } from '../config.js';
import { LEGAL } from '../legal/legalConfig.js';

export default function About() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <article className="prose">
      <p className="eyebrow">Acerca de</p>
      <h1 className="page-title">Arqtherm</h1>
      <p className="page-lead">
        Una calculadora de transmitancia térmica libre y abierta para profesionales de la
        edificación en España, pensada para que cada resultado se pueda revisar.
      </p>

      <h2 id="proposito">Propósito</h2>
      <p>
        Calcular con rapidez la resistencia térmica y la transmitancia U de elementos de la envolvente
        formados por capas, documentando el método, los datos y las hipótesis, y compararla con el
        valor límite del DB-HE cuando el caso está soportado y el dato reglamentario está verificado.
      </p>

      <h2 id="autor">Autor</h2>
      <div className="author">
        <span className="author__mark" aria-hidden="true">LS</span>
        <div className="author__body">
          <p className="author__name">Lars Sørensen</p>
          <p className="author__role">Arquitecto · Consultor · Especialista en fachadas</p>
          <p>
            Arquitecto de origen danés que lleva más de veinte años trabajando en España como
            arquitecto, consultor y especialista en fachadas.
          </p>
          <p>
            <a className="author__link" href="https://www.linkedin.com/in/lars-bcn/" target="_blank" rel="noopener noreferrer">
              Perfil de LinkedIn <ExternalLink aria-hidden="true" size={14} />
              <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
            </a>
          </p>
        </div>
      </div>

      <h2 id="filosofia">Código abierto</h2>
      <p>
        El código original se publica con licencia MIT. Sin registro, sin servidor y sin funciones de pago:
        todo se calcula en su navegador y los elementos se guardan en su almacenamiento local, que no se
        sincroniza entre dispositivos. Los datos técnicos están en archivos JSON separados de la interfaz,
        con su fuente y estado de verificación.
      </p>

      <h2 id="metodologia">Metodología de cálculo</h2>
      <p>Para un elemento de capas térmicamente homogéneas (DA DB-HE/1, apartado 2.1.1):</p>
      <ul>
        <li><span className="mono">R = d / λ</span> para cada capa, con d en metros y λ el valor térmico de diseño en W/(m·K).</li>
        <li><span className="mono">R<sub>T</sub> = R<sub>si</sub> + ΣR<sub>i</sub> + R<sub>se</sub></span>, con las resistencias superficiales de la tabla 1 (cerramientos exteriores) o la tabla 6 (particiones) del DA DB-HE/1.</li>
        <li><span className="mono">U = 1 / R<sub>T</sub></span>.</li>
      </ul>
      <p>Casos especiales implementados, según el DA DB-HE/1:</p>
      <ul>
        <li>Cámaras de aire sin ventilar: tabla 2, 10 a 50 mm, con interpolación lineal; ligeramente ventiladas: la mitad.</li>
        <li>Cámaras muy ventiladas: se desprecian la cámara y las capas exteriores, y R<sub>se</sub> = R<sub>si</sub>.</li>
        <li>Medianerías: resistencias superficiales interiores en ambas caras.</li>
        <li>Fábricas con resistencia tabulada en el CEC, solo dentro de su rango de espesores.</li>
        <li>Soleras y losas en contacto con el terreno: tabla 3 (z ≤ 0,5 m, con B′ = A/(0,5·P), banda perimetral D y R<sub>a</sub>) y tabla 4 (z &gt; 0,5 m, con R<sub>f</sub>).</li>
        <li>Muros enterrados: tabla 5 (R<sub>m</sub> y profundidad z). Cubiertas enterradas: el terreno como capa de λ = 2 W/(m·K).</li>
        <li>Suelos sobre cámara sanitaria (h ≤ 1 m, z ≤ 0,5 m): tabla 9.</li>
        <li>Particiones con espacios no habitables: U = U<sub>p</sub> · b, con b de la tabla 7 según la relación de superficies, el aislamiento y la estanqueidad (tabla 8).</li>
        <li>Las tablas se interpolan linealmente; fuera de su rango se toma el valor extremo, del lado de la seguridad, con aviso.</li>
        <li>Condensaciones según el DA DB-HE/2: superficiales con f<sub>Rsi</sub> = 1 − 0,25 · U frente a f<sub>Rsi,min</sub> (tabla 1) e intersticiales con el diagrama de Glaser para enero (tabla C.1, corregida por altitud).</li>
        <li>Espesor de aislamiento necesario para U<sub>lim</sub> o el Anejo E, calculado con el mismo motor y redondeado a espesores comerciales.</li>
      </ul>
      <p>
        Lo que no está implementado no se aproxima: muros enterrados de composición variable, huecos, capas heterogéneas, cámaras fuera de la tabla 2 o con flujo descendente y
        puentes térmicos aparecen como «no soportado» o «incompleto», sin resultado parcial.
      </p>
      <p className="small muted">{calculationData.unventilatedAirCavities.assumptionNote}</p>

      <h2 id="cte">Relación con el CTE</h2>
      <p>
        Datos reglamentarios versión {cteMetadata.datasetVersion}, cotejados el {cteMetadata.verifiedOn} con:
      </p>
      <ul>
        {Object.values(cteMetadata.documents).map((d) => (
          <li key={d.id}>
            <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">{d.title}</a>, {d.revision}. {d.notes}
          </li>
        ))}
      </ul>
      <p>Tablas de valores límite incluidas:</p>
      <ul>{uValueLimits.tables.map((t) => <li key={t.id}>{t.reference} — {t.validationStatus === 'verified' ? 'verificada' : 'sin verificar'}</li>)}</ul>
      <p>
        Además del valor límite, Arqtherm compara la transmitancia con el valor orientativo de la
        tabla a-Anejo E del DB-HE en fachadas, cubiertas y suelos en contacto con el aire exterior.
        Es una referencia para el predimensionado en uso residencial privado, con vistas a cumplir
        el coeficiente global K, que presupone un correcto tratamiento de los puentes térmicos.
        No es una exigencia: se muestra separada del veredicto de cumplimiento.
      </p>
      <p>Régimen transitorio y avisos:</p>
      <ul>{cteMetadata.applicability.transitionalNotes.map((n) => <li key={n}>{n}</li>)}</ul>

      <h2 id="alcance">Valor U frente a cumplimiento normativo</h2>
      <p>
        Que la transmitancia de un elemento no supere su U<sub>lim</sub> es solo una de las condiciones del
        HE1. El cumplimiento del CTE exige además, entre otras, el coeficiente global K, el control solar
        q<sub>sol;jul</sub>, la permeabilidad al aire, la limitación de condensaciones, el consumo de
        energía (HE0) y el resto de documentos básicos. Esta herramienta no sustituye la responsabilidad
        del técnico competente de verificar los requisitos aplicables a su proyecto.
      </p>

      <h2 id="datos">Procedencia de los datos de materiales</h2>
      <p>
        Los valores de referencia proceden del Catálogo de Elementos Constructivos del CTE (v6.3, marzo 2010),
        tal como lo publica codigotecnico.org (rotulado como versión preliminar). El 2 de noviembre de 2026 se
        cotejaron con ese PDF, valor a valor, mediante un script y la revisión del autor: cada material indica la
        página de origen. Las fábricas usan la resistencia del conjunto con sus juntas (apartado 3.17), no la
        de la pieza aislada. Para productos industriales, el propio DB-HE indica que estos valores son genéricos
        y orientativos. Los materiales con datos de fabricante o del autor figuran como «pendiente de cotejo».
        Las tablas 1 a 9 del DA DB-HE/1 (enero 2020) y los datos del DA DB-HE/2 (tabla 1 y clima de la tabla C.1) también se han cotejado con sus PDF oficiales.
      </p>

      <h2 id="zonas">Zonas climáticas y cartografía</h2>
      <p>
        La página de zonas climáticas reproduce la tabla a-Anejo B del DB-HE, que asigna la zona según la
        provincia y la altitud de la localidad, cotejada con el DB-HE consolidado (pág. 46). Los documentos
        que aprueben las comunidades autónomas prevalecen sobre ella. La cartografía de provincias procede del
        Instituto Geográfico Nacional (CC BY 4.0).
      </p>

      <h2 id="contribuir">Contribuir y comunicar errores</h2>
      <p>
        Arqtherm mejora con la experiencia de quienes lo usan en sus proyectos. Si detecta un resultado que no
        coincide con otra herramienta, un dato que conviene revisar, un material o una solución constructiva que
        echa en falta, o simplemente tiene una idea para mejorar la aplicación, escríbame.
      </p>
      <p>
        Para comunicar un error, indique el tipo de elemento, las capas y, si puede, adjunte el JSON exportado o el
        enlace «Compartir» del elemento: así podré reproducirlo y corregirlo cuanto antes.
      </p>
      {LEGAL.email && (
        <p className="contact-line">
          <Mail aria-hidden="true" size={16} />
          <a href={`mailto:${LEGAL.email}?subject=${encodeURIComponent('Arqtherm: sugerencia o error')}`}>{LEGAL.email}</a>
        </p>
      )}
      {REPO_URL ? (
        <p>
          El código está en <a href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.
          Puede comunicar errores o proponer mejoras en <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">issues</a>.
        </p>
      ) : (
        <p>
          El repositorio público aún no se ha publicado. Consulte el archivo CONTRIBUTING.md del código
          fuente para el procedimiento de contribución.
        </p>
      )}
      <p>
        Las contribuciones de datos deben citar la fuente exacta (documento, versión, tabla y página) y
        acompañarse de una prueba que use un cálculo verificado de forma independiente.
      </p>
    </article>
  );
}
