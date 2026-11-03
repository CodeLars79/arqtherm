import { useCallback } from 'react';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage.js';
import { validateAssembly } from '../utils/validateAssembly.js';
import { createId } from '../utils/ids.js';

const isValidList = (v) => Array.isArray(v) && v.every((item) =>
  item && typeof item.savedAt === 'string' && validateAssembly(item.assembly).valid);

/** Elementos guardados en este navegador. */
export function useSavedAssemblies() {
  const [saved, setSaved, { storageError }] = useLocalStorage(STORAGE_KEYS.saved, [], isValidList);

  const save = useCallback((assembly) => {
    const entry = { savedAt: new Date().toISOString(), assembly: { ...assembly, isExample: false } };
    setSaved((list) => [entry, ...list.filter((e) => e.assembly.id !== assembly.id)]);
  }, [setSaved]);

  const rename = useCallback((id, name) => {
    setSaved((list) => list.map((e) => (e.assembly.id === id
      ? { ...e, savedAt: new Date().toISOString(), assembly: { ...e.assembly, name } }
      : e)));
  }, [setSaved]);

  const duplicate = useCallback((id) => {
    setSaved((list) => {
      const original = list.find((e) => e.assembly.id === id);
      if (!original) return list;
      const copy = {
        savedAt: new Date().toISOString(),
        assembly: {
          ...original.assembly,
          id: createId('asm'),
          name: `${original.assembly.name} (copia)`.slice(0, 120),
          layers: original.assembly.layers.map((l) => ({ ...l, id: createId('ly') }))
        }
      };
      return [copy, ...list];
    });
  }, [setSaved]);

  const remove = useCallback((id) => {
    setSaved((list) => list.filter((e) => e.assembly.id !== id));
  }, [setSaved]);

  return { saved, save, rename, duplicate, remove, storageError };
}
