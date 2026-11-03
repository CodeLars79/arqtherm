import { Link } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { REPO_URL, APP_VERSION } from '../../config.js';
import { cteMetadata } from '../../data/index.js';
import { useConsent } from '../../state/ConsentContext.jsx';
import { LEGAL } from '../../legal/legalConfig.js';

export default function Footer() {
  const { openSettings } = useConsent();
  return (
    <footer className="site-footer no-print">
      <div className="site-footer__inner">
        <div>
          <p className="site-footer__title">Arqtherm <span className="muted">v{APP_VERSION}</span></p>
          <p className="muted small">
            Código abierto (MIT). Herramienta de apoyo: no sustituye la verificación del
            técnico competente. Datos reglamentarios v{cteMetadata.datasetVersion}.
          </p>
        </div>
        <nav aria-label="Pie de página">
          <ul className="footer-links">
            <li><Link to="/acerca-de">Acerca de</Link></li>
            <li><Link to="/acerca-de#metodologia">Documentación y metodología</Link></li>
            {REPO_URL ? (
              <li>
                <a href={REPO_URL} rel="noopener noreferrer" target="_blank">
                  <Code2 aria-hidden="true" size={15} /> GitHub
                </a>
              </li>
            ) : (
              <li><Link to="/acerca-de#contribuir">Código fuente y contribuciones</Link></li>
            )}
            <li>
              <a href={cteMetadata.documents['DB-HE'].indexUrl} rel="noopener noreferrer" target="_blank">
                CTE · Ahorro de energía
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="site-footer__legal">
        <p className="small muted">© {new Date(`${LEGAL.lastUpdated}T12:00:00`).getFullYear()} {LEGAL.ownerName}. Código con licencia MIT.</p>
        <nav aria-label="Información legal">
          <ul className="footer-links footer-links--legal">
            <li><Link to="/legal/aviso-legal">Aviso legal</Link></li>
            <li><Link to="/legal/privacidad">Privacidad</Link></li>
            <li><Link to="/legal/cookies">Cookies</Link></li>
            <li><button type="button" className="footer-linkbtn" onClick={openSettings}>Configuración de cookies</button></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
