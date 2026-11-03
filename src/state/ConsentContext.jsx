import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createConsent, readConsent, writeConsent, PREFS_KEY } from '../legal/consent.js';

const ConsentContext = createContext(null);

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPrefs(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PREFS_KEY) ?? 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Estado del consentimiento y preferencias de visualización.
 * Las preferencias solo se escriben en el navegador si la categoría «preferencias» está aceptada;
 * si no, viven en memoria durante la visita.
 */
export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readConsent(safeStorage()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => (consent?.categories.preferences ? readPrefs(safeStorage()) : {}));

  const decide = useCallback((choice) => {
    const record = createConsent(choice);
    const storage = safeStorage();
    writeConsent(storage, record);
    if (record.categories.preferences) {
      // Al aceptar, se conservan las preferencias elegidas durante esta visita.
      setPrefs((current) => {
        try { storage?.setItem(PREFS_KEY, JSON.stringify(current)); } catch { /* sin almacenamiento */ }
        return current;
      });
    }
    setConsent(record);
    setSettingsOpen(false);
  }, []);

  const setPreference = useCallback((name, value) => {
    setPrefs((current) => {
      const next = { ...current, [name]: value };
      if (consent?.categories.preferences) {
        try { safeStorage()?.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
      }
      return next;
    });
  }, [consent]);

  const value = useMemo(() => ({
    consent,
    hasDecided: Boolean(consent),
    allowsPreferences: Boolean(consent?.categories.preferences),
    acceptAll: () => decide({ preferences: true }),
    rejectOptional: () => decide({ preferences: false }),
    save: decide,
    settingsOpen,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    prefs,
    setPreference
  }), [consent, decide, settingsOpen, prefs, setPreference]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent debe usarse dentro de ConsentProvider');
  return ctx;
}

/** Preferencia de visualización: como useState, persistida solo con consentimiento. */
export function usePreference(name, initialValue) {
  const { prefs, setPreference } = useConsent();
  const value = Object.prototype.hasOwnProperty.call(prefs, name) ? prefs[name] : initialValue;
  const set = useCallback((v) => setPreference(name, v), [name, setPreference]);
  return [value, set];
}
