import { IS_HOSTED } from '../config.js';

/**
 * Ofrece un archivo generado al usuario.
 * - Aplicación local: descarga directa del navegador.
 * - Versión alojada: el marco no permite descargas propias; se usa la capacidad
 *   `downloads` del visor, que pide confirmación al usuario.
 *
 * @param {{filename:string, blob:Blob}} file
 * @returns {Promise<'saved'|'declined'|'unavailable'|'error'>}
 */
export async function saveFile({ filename, blob }) {
  if (IS_HOSTED) {
    let downloads = null;
    try {
      downloads = await window.claude?.use?.('downloads');
    } catch {
      downloads = null;
    }
    if (!downloads) return 'unavailable';
    try {
      await downloads.save({ filename, data: blob });
      return 'saved';
    } catch (e) {
      if (e?.code === 'declined') return 'declined';
      if (e?.code === 'unavailable' || e?.code === 'not_granted' || e?.code === 'capability_disabled' || e?.code === 'capability_removed') {
        return 'unavailable';
      }
      return 'error';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
