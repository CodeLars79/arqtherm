import { useCallback, useEffect, useState } from 'react';

/**
 * Estado persistido en localStorage del navegador.
 * Los datos solo existen en este navegador y dispositivo: no se sincronizan.
 *
 * @param {string} key
 * @param {*} initialValue  valor o función que lo devuelve
 * @param {(value:any)=>boolean} [isValid]  descarta datos guardados con forma no válida
 */
export function useLocalStorage(key, initialValue, isValid) {
  const [value, setValue] = useState(() => {
    const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
    try {
      let raw = window.localStorage.getItem(key);
      // Migración desde las claves anteriores al cambio de nombre (uvs:*).
      if (raw === null && LEGACY_KEYS[key]) raw = window.localStorage.getItem(LEGACY_KEYS[key]);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      if (isValid && !isValid(parsed)) return fallback;
      return parsed;
    } catch {
      return fallback;
    }
  });

  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setStorageError(null);
    } catch (e) {
      setStorageError('No se pudo guardar en el almacenamiento local del navegador (puede estar lleno o desactivado).');
    }
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(typeof initialValue === 'function' ? initialValue() : initialValue);
  }, [initialValue]);

  return [value, setValue, { storageError, reset }];
}

export const STORAGE_KEYS = {
  current: 'arqtherm:current-assembly:v1',
  saved: 'arqtherm:saved-assemblies:v1',
  materials: 'arqtherm:custom-materials:v1'
};

/** Claves usadas antes del cambio de nombre; se leen una vez si la nueva está vacía. */
const LEGACY_KEYS = {
  'arqtherm:current-assembly:v1': 'uvs:current-assembly:v1',
  'arqtherm:saved-assemblies:v1': 'uvs:saved-assemblies:v1',
  'arqtherm:custom-materials:v1': 'uvs:custom-materials:v1'
};
