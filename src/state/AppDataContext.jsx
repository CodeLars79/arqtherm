import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage, STORAGE_KEYS } from '../hooks/useLocalStorage.js';
import { buildMaterialsById } from '../data/index.js';
import { validateCustomMaterial } from '../utils/validateAssembly.js';

const AppDataContext = createContext(null);

const isMaterialList = (v) => Array.isArray(v) && v.every((m) => validateCustomMaterial(m).valid);

/** Materiales de usuario compartidos entre la biblioteca y la calculadora. */
export function AppDataProvider({ children }) {
  const [customMaterials, setCustomMaterials, { storageError }] = useLocalStorage(
    STORAGE_KEYS.materials,
    [],
    isMaterialList
  );

  const materialsById = useMemo(() => buildMaterialsById(customMaterials), [customMaterials]);

  const addCustomMaterial = useCallback((material) => {
    setCustomMaterials((list) => [...list.filter((m) => m.id !== material.id), material]);
  }, [setCustomMaterials]);

  const removeCustomMaterial = useCallback((id) => {
    setCustomMaterials((list) => list.filter((m) => m.id !== id));
  }, [setCustomMaterials]);

  const value = useMemo(() => ({
    customMaterials,
    materialsById,
    addCustomMaterial,
    removeCustomMaterial,
    storageError
  }), [customMaterials, materialsById, addCustomMaterial, removeCustomMaterial, storageError]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData debe usarse dentro de AppDataProvider');
  return ctx;
}
