/**
 * Configuración del proyecto.
 * REPO_URL: URL pública del repositorio en GitHub. Déjela vacía hasta publicar el
 * repositorio; mientras esté vacía, la interfaz no muestra enlaces a GitHub.
 */
export const REPO_URL = '';
export const ISSUES_URL = REPO_URL ? `${REPO_URL}/issues` : '';
export const APP_NAME = 'Arqtherm';
export const APP_VERSION = '0.1.0';

/**
 * Versión alojada (página publicada en un marco restringido): sin impresión ni
 * descargas, y con enrutado en memoria. Se activa con `npm run build:hosted`.
 */
export const IS_HOSTED = import.meta.env.VITE_TARGET === 'hosted';
