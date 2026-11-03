import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { useConsent } from '../../state/ConsentContext.jsx';
import { CONSENT_CATEGORIES } from '../../legal/consent.js';

/** Aviso de primera capa: aceptar y rechazar con la misma prominencia (Guía de cookies AEPD, 2023). */
export function CookieBanner() {
  const { hasDecided, acceptAll, rejectOptional, openSettings, settingsOpen } = useConsent();
  if (hasDecided || settingsOpen) return null;

  return (
    <section className="cookie-banner no-print" role="region" aria-labelledby="cookie-banner-title">
      <div className="cookie-banner__icon" aria-hidden="true"><Cookie size={20} strokeWidth={1.75} /></div>
      <div className="cookie-banner__body">
        <h2 id="cookie-banner-title" className="cookie-banner__title">Su privacidad en Arqtherm</h2>
        <p>
          No usamos cookies de análisis, de publicidad ni de terceros. Su navegador guarda lo necesario
          para que la aplicación funcione (sus elementos y materiales) y, si lo acepta, sus preferencias
          de visualización. Puede cambiar su elección en cualquier momento.{' '}
          <Link to="/legal/cookies">Política de cookies</Link>
        </p>
      </div>
      <div className="cookie-banner__actions">
        <Button variant="ghost" onClick={openSettings}>Configurar</Button>
        <Button variant="primary" onClick={rejectOptional}>Rechazar opcionales</Button>
        <Button variant="primary" onClick={acceptAll}>Aceptar todo</Button>
      </div>
    </section>
  );
}

/** Panel de configuración (segunda capa). Se abre desde el aviso o desde el pie de página. */
export function CookieSettings() {
  const { settingsOpen, closeSettings, save, acceptAll, rejectOptional, consent } = useConsent();
  const [preferences, setPreferences] = useState(Boolean(consent?.categories.preferences));

  useEffect(() => {
    if (settingsOpen) setPreferences(Boolean(consent?.categories.preferences));
  }, [settingsOpen, consent]);

  return (
    <Modal
      open={settingsOpen}
      onClose={closeSettings}
      title="Configuración de cookies"
      description="Elija qué datos puede guardar Arqtherm en este navegador. Nada de lo que se guarda sale de su dispositivo."
      footer={(
        <>
          <Button variant="secondary" onClick={rejectOptional}>Rechazar opcionales</Button>
          <Button variant="secondary" onClick={acceptAll}>Aceptar todo</Button>
          <Button variant="primary" onClick={() => save({ preferences })}>Guardar selección</Button>
        </>
      )}
    >
      <ul className="consent-list">
        {Object.entries(CONSENT_CATEGORIES).map(([key, cat]) => {
          const checked = cat.required ? true : preferences;
          const id = `consent-${key}`;
          return (
            <li key={key} className="consent-item">
              <div className="consent-item__text">
                <label htmlFor={id} className="consent-item__label">{cat.label}</label>
                <p id={`${id}-desc`}>{cat.description}</p>
              </div>
              <span className="switch">
                <input
                  id={id}
                  type="checkbox"
                  role="switch"
                  checked={checked}
                  disabled={cat.required}
                  aria-describedby={`${id}-desc`}
                  onChange={(e) => setPreferences(e.target.checked)}
                />
                <span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
                <span className="switch__state">{cat.required ? 'Siempre activas' : checked ? 'Activadas' : 'Desactivadas'}</span>
              </span>
            </li>
          );
        })}
        <li className="consent-item consent-item--none">
          <div className="consent-item__text">
            <span className="consent-item__label">Análisis, publicidad y terceros</span>
            <p>Arqtherm no las utiliza. No hay nada que activar.</p>
          </div>
        </li>
      </ul>
      <p className="consent-more">
        Detalle de cada dato guardado en la <Link to="/legal/cookies" onClick={closeSettings}>Política de cookies</Link>.
        {consent && <> Su elección actual se registró el {new Date(consent.decidedAt).toLocaleDateString('es-ES')}.</>}
      </p>
    </Modal>
  );
}
