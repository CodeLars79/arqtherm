import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { LEGAL } from '../legal/legalConfig.js';
import {
  STORAGE_REGISTRY, CONSENT_CATEGORIES, COOKIE_POLICY_VERSION, CONSENT_MAX_AGE_MONTHS
} from '../legal/consent.js';
import { useConsent } from '../state/ConsentContext.jsx';
import { IS_HOSTED } from '../config.js';
import Button from '../components/ui/Button.jsx';

const PAGES = [
  { path: 'aviso-legal', title: 'Aviso legal' },
  { path: 'privacidad', title: 'Política de privacidad' },
  { path: 'cookies', title: 'Política de cookies' }
];

function formatDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Dato del titular; si falta, se muestra resaltado para que no pase desapercibido. */
function Datum({ value, label, href }) {
  if (!value) return <mark className="legal-missing" title="Dato pendiente de completar por el titular">[{label}: pendiente]</mark>;
  return href ? <a href={href}>{value}</a> : <>{value}</>;
}

const Email = () => <Datum value={LEGAL.email} label="correo de contacto" href={LEGAL.email ? `mailto:${LEGAL.email}` : undefined} />;

function OwnerTable() {
  return (
    <dl className="legal-owner">
      <dt>Sitio web</dt><dd>{LEGAL.websiteName}{LEGAL.websiteUrl ? ` (${LEGAL.websiteUrl})` : ''}</dd>
      <dt>Titular</dt><dd>{LEGAL.ownerName}</dd>
      <dt>Correo de contacto</dt><dd><Email /></dd>
    </dl>
  );
}

function AvisoLegal() {
  return (
    <>
      <h2>1. Datos identificativos</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la
        información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de {LEGAL.websiteName}:
      </p>
      <OwnerTable />

      <h2>2. Objeto</h2>
      <p>
        Este aviso legal regula el acceso y el uso de {LEGAL.websiteName}, una herramienta gratuita y de código abierto
        para calcular la transmitancia térmica (valor U) de elementos constructivos opacos según la metodología del
        Documento de Apoyo DA DB-HE/1, y para compararla con los valores del Documento Básico HE del Código Técnico de
        la Edificación (CTE). El acceso a la aplicación atribuye la condición de usuario e implica la aceptación de
        estas condiciones en la versión publicada en cada momento.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El uso de la aplicación es gratuito y no requiere registro. El usuario se compromete a utilizarla de acuerdo
        con la ley, la buena fe y el presente aviso, y a no emplearla para fines ilícitos ni para dañar, inutilizar o
        sobrecargar el sitio o impedir su normal funcionamiento.
      </p>

      <h2>4. Naturaleza de los resultados y responsabilidad</h2>
      <p>
        {LEGAL.websiteName} es una herramienta de apoyo al cálculo. Sus resultados tienen carácter informativo y
        <strong> no sustituyen el proyecto ni la verificación por un técnico competente</strong>, a quien corresponde
        justificar el cumplimiento del CTE conforme a la Ley 38/1999, de Ordenación de la Edificación.
      </p>
      <ul>
        <li>
          Los datos se cotejan con los documentos oficiales; los que aún no lo están se identifican en la aplicación
          como «pendiente de cotejo». Para productos concretos deben usarse los valores declarados por el fabricante.
        </li>
        <li>
          La normativa puede modificarse. El usuario debe comprobar la versión del CTE aplicable a su proyecto y la
          normativa autonómica o municipal que corresponda.
        </li>
        <li>
          El titular procura que la información y los cálculos sean correctos, pero no garantiza la ausencia de
          errores ni la disponibilidad ininterrumpida del servicio.
        </li>
      </ul>
      <p>
        En la medida en que la ley lo permita, el titular no responde de los daños derivados del uso de los resultados
        sin la comprobación profesional indicada, de interrupciones del servicio o de la pérdida de los datos guardados
        en el navegador del usuario. Esta limitación no se aplica a los supuestos en que la ley no permita excluir
        o limitar la responsabilidad.
      </p>

      <h2>5. Propiedad intelectual e industrial</h2>
      <ul>
        <li>
          El código fuente de {LEGAL.websiteName} se distribuye con licencia MIT, que permite usarlo, copiarlo,
          modificarlo y redistribuirlo conservando el aviso de copyright y la licencia.
        </li>
        <li>
          El nombre «{LEGAL.websiteName}», su logotipo y el diseño de la aplicación pertenecen a su titular.
        </li>
        <li>
          Los textos normativos del CTE son disposiciones legales y, conforme al artículo 13 del texto refundido de
          la Ley de Propiedad Intelectual, no están protegidos por derechos de propiedad intelectual. Se citan con
          indicación de su fuente.
        </li>
        <li>
          Cartografía de provincias: © Instituto Geográfico Nacional, licencia CC BY 4.0. Tipografía Inter: SIL Open
          Font License 1.1. Iconos Lucide: licencia ISC. El resto de componentes de terceros se usan conforme a sus
          licencias, indicadas en la documentación del proyecto.
        </li>
      </ul>

      <h2>6. Enlaces a otros sitios</h2>
      <p>
        La aplicación contiene enlaces a sitios de terceros, como codigotecnico.org o LinkedIn. El titular no controla
        esos sitios ni responde de sus contenidos. Si tuviera conocimiento efectivo de que un enlace remite a contenidos
        ilícitos, lo retirará con diligencia (artículo 17 LSSI-CE).
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        El titular puede modificar este aviso legal para adaptarlo a cambios legislativos o de la aplicación. La fecha
        de la última actualización figura al pie de esta página.
      </p>

      <h2>8. Legislación aplicable y jurisdicción</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Cuando el usuario tenga la condición de consumidor,
        serán competentes los juzgados y tribunales de su domicilio. En los demás casos, las partes se someten a los
        juzgados y tribunales de {LEGAL.jurisdictionCity}.
      </p>
    </>
  );
}

function Privacidad() {
  return (
    <>
      <div className="legal-summary">
        <h2>En resumen</h2>
        <ul>
          <li>{LEGAL.websiteName} funciona en su navegador. Sus cálculos, elementos y materiales se guardan solo en su dispositivo.</li>
          <li>No hay registro, formularios, analítica ni publicidad, y no se carga ningún recurso de terceros.</li>
          <li>Solo se tratan los datos técnicos de conexión que registra el servidor y, si nos escribe, su correo.</li>
        </ul>
      </div>

      <h2>1. Responsable del tratamiento</h2>
      <OwnerTable />

      <h2>2. Datos que no tratamos</h2>
      <p>
        Los elementos constructivos, los materiales propios, los resultados y los informes PDF o JSON se generan y
        guardan en el almacenamiento local de su navegador. No se envían al titular ni a ningún tercero, y el titular
        no tiene acceso a ellos. La aplicación no utiliza herramientas de analítica, publicidad, perfiles ni
        decisiones automatizadas. Las fuentes tipográficas y la cartografía se sirven desde el propio sitio.
      </p>

      <h2>3. Datos que sí tratamos</h2>
      <h3>3.1. Datos técnicos de conexión</h3>
      <p>
        Al visitar el sitio, el servidor de alojamiento registra automáticamente datos técnicos: dirección IP, fecha y
        hora, página solicitada y tipo de navegador.
      </p>
      <ul>
        <li><strong>Finalidad:</strong> servir la aplicación y garantizar su seguridad (prevención de abusos y ataques).</li>
        <li><strong>Base jurídica:</strong> interés legítimo del responsable (art. 6.1.f RGPD).</li>
        <li><strong>Conservación:</strong> el plazo que fije el proveedor de alojamiento para sus registros de seguridad, tras el cual se eliminan.</li>
        <li>
          <strong>Encargado del tratamiento:</strong>{' '}
          {LEGAL.hostingProvider ?? 'el proveedor de alojamiento del sitio'}. Si el proveedor está fuera del
          Espacio Económico Europeo, la transferencia se ampara en una decisión de adecuación o en cláusulas
          contractuales tipo de la Comisión Europea.
        </li>
      </ul>
      <h3>3.2. Comunicaciones por correo electrónico</h3>
      <p>Si escribe al correo de contacto para hacer una consulta o comunicar un error:</p>
      <ul>
        <li><strong>Datos:</strong> su dirección de correo, su nombre si lo indica y el contenido del mensaje.</li>
        <li><strong>Finalidad:</strong> responder a su consulta.</li>
        <li><strong>Base jurídica:</strong> su consentimiento, manifestado al escribirnos (art. 6.1.a RGPD).</li>
        <li><strong>Conservación:</strong> el tiempo necesario para atender la consulta y, después, durante los plazos de prescripción de las posibles responsabilidades.</li>
      </ul>

      <h2>4. Destinatarios</h2>
      <p>
        No se ceden datos a terceros, salvo obligación legal. El proveedor de alojamiento y, en su caso, el de correo
        electrónico acceden a los datos solo como encargados del tratamiento, en virtud de un contrato conforme al
        artículo 28 del RGPD.
      </p>

      <h2>5. Sus derechos</h2>
      <p>
        Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
        portabilidad, y retirar en cualquier momento el consentimiento prestado, escribiendo a <Email /> con el asunto
        «Protección de datos». Solo se le pedirá acreditar su identidad cuando sea necesario. Si considera que el
        tratamiento no se ajusta a la normativa, puede presentar una reclamación ante la Agencia Española de
        Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noreferrer">www.aepd.es</a>).
      </p>
      <p>
        Los datos guardados en su navegador están bajo su control: puede borrarlos desde «Mis elementos» o desde la
        configuración del navegador (véase la <Link to="/legal/cookies">política de cookies</Link>).
      </p>

      <h2>6. Menores de edad</h2>
      <p>
        La aplicación se dirige a profesionales y estudiantes de la edificación. No se recogen conscientemente datos de
        menores de 14 años (art. 7 LOPDGDD).
      </p>

      <h2>7. Seguridad</h2>
      <p>
        El sitio se sirve mediante conexión cifrada (HTTPS). Tenga en cuenta que cualquier persona con acceso a su
        dispositivo y navegador puede ver los datos guardados en él.
      </p>

      <h2>8. Normativa y cambios</h2>
      <p>
        Esta política se rige por el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). Puede
        actualizarse para reflejar cambios en la aplicación o en la normativa; la fecha de la última actualización
        figura al pie.
      </p>
    </>
  );
}

const CATEGORY_LABEL = { necessary: 'Técnica', preferences: 'Preferencias' };

function Cookies() {
  const { openSettings, consent } = useConsent();
  return (
    <>
      <h2>1. Qué son</h2>
      <p>
        Las cookies y tecnologías similares, como el almacenamiento local del navegador (<code>localStorage</code>),
        permiten que un sitio guarde información en su dispositivo. El artículo 22.2 de la LSSI-CE se aplica a todas
        ellas: las que son necesarias para prestar el servicio que usted solicita están exentas de consentimiento; las
        demás requieren su consentimiento previo.
      </p>

      <h2>2. Qué utiliza {LEGAL.websiteName}</h2>
      <p>
        {LEGAL.websiteName} <strong>no instala cookies HTTP</strong> ni utiliza cookies de análisis, de publicidad o de
        terceros. Solo usa el almacenamiento local del navegador, de titularidad propia. Estos datos no se envían a
        ningún servidor.
      </p>
      <div className="table-wrap">
        <table className="legal-table">
          <thead>
            <tr>
              <th scope="col">Nombre (clave)</th>
              <th scope="col">Tipo</th>
              <th scope="col">Finalidad</th>
              <th scope="col">Titular</th>
              <th scope="col">Duración</th>
            </tr>
          </thead>
          <tbody>
            {STORAGE_REGISTRY.map((item) => (
              <tr key={item.key}>
                <th scope="row"><code>{item.key}</code></th>
                <td><span className={`badge ${item.category === 'necessary' ? 'badge--neutral' : 'badge--info'}`}>{CATEGORY_LABEL[item.category]}</span></td>
                <td>{item.purpose}</td>
                <td>Propia</td>
                <td>{item.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>3. Categorías</h2>
      <dl className="legal-categories">
        {Object.values(CONSENT_CATEGORIES).map((c) => (
          <div key={c.label}>
            <dt>{c.label}</dt>
            <dd>{c.description}</dd>
          </div>
        ))}
      </dl>

      <h2>4. Cómo gestionar su elección</h2>
      <p>
        Puede aceptar o rechazar el almacenamiento de preferencias, y cambiar su elección cuando quiera, desde la
        configuración de cookies. Su elección se conserva {CONSENT_MAX_AGE_MONTHS} meses y se le volverá a preguntar
        si esta política cambia.
        {consent && <> Elección actual: preferencias <strong>{consent.categories.preferences ? 'aceptadas' : 'rechazadas'}</strong>, registrada el {new Date(consent.decidedAt).toLocaleDateString('es-ES')}.</>}
      </p>
      <p><Button variant="secondary" icon={Settings2} onClick={openSettings}>Configuración de cookies</Button></p>
      <p>También puede borrar estos datos desde su navegador:</p>
      <ul>
        <li><strong>Chrome:</strong> Configuración › Privacidad y seguridad › Cookies y otros datos de sitios › Ver todos los datos y permisos de sitios.</li>
        <li><strong>Firefox:</strong> Ajustes › Privacidad &amp; Seguridad › Cookies y datos del sitio › Administrar datos.</li>
        <li><strong>Safari:</strong> Ajustes › Privacidad › Gestionar datos de sitios web.</li>
        <li><strong>Edge:</strong> Configuración › Cookies y permisos del sitio › Administrar y eliminar cookies y datos del sitio.</li>
      </ul>
      <p className="legal-note">
        Al borrar los datos del sitio se eliminan también sus elementos guardados y materiales propios. Si quiere
        conservarlos, expórtelos antes en JSON desde la calculadora.
      </p>
      {IS_HOSTED && (
        <p className="legal-note">
          Esta versión de demostración se muestra dentro de claude.ai. Ese entorno aplica su propia política de
          privacidad y de cookies, independiente de la de {LEGAL.websiteName}.
        </p>
      )}

      <h2>5. Enlaces externos</h2>
      <p>
        Los enlaces a otros sitios, como codigotecnico.org o LinkedIn, solo se cargan si usted los abre. Esos sitios
        aplican sus propias políticas de cookies.
      </p>
      <p className="muted small">Versión de la política: {COOKIE_POLICY_VERSION}.</p>
    </>
  );
}

const CONTENT = { 'aviso-legal': AvisoLegal, privacidad: Privacidad, cookies: Cookies };

function LegalDoc({ path }) {
  const page = PAGES.find((p) => p.path === path);
  const Body = CONTENT[path];
  return (
    <article className="legal-doc prose">
      <p className="eyebrow">Información legal</p>
      <h1 className="page-title">{page.title}</h1>
      <Body />
      <p className="legal-updated">Última actualización: {formatDate(LEGAL.lastUpdated)}.</p>
    </article>
  );
}

export default function Legal() {
  return (
    <div className="legal-layout">
      <nav className="legal-nav" aria-label="Información legal">
        <ul>
          {PAGES.map((p) => (
            <li key={p.path}>
              <NavLink to={`/legal/${p.path}`} className={({ isActive }) => `legal-nav__link ${isActive ? 'is-active' : ''}`}>
                {p.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Routes>
        <Route index element={<Navigate to="aviso-legal" replace />} />
        {PAGES.map((p) => <Route key={p.path} path={p.path} element={<LegalDoc path={p.path} />} />)}
        <Route path="*" element={<Navigate to="aviso-legal" replace />} />
      </Routes>
    </div>
  );
}
