import { useEffect } from 'react';
import { SITE, fullTitle, absoluteUrl, routeFor, NOT_FOUND } from './seo.config.js';

const SITE_URL = import.meta.env.VITE_SITE_URL || '';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el && value != null) el.setAttribute(attr, value);
}

/**
 * Actualiza título, descripción, canónica y Open Graph al navegar entre rutas,
 * para que coincidan con el HTML generado por ruta en la compilación.
 */
export function useSeo({ title, description, path, noindex = false }) {
  useEffect(() => {
    const t = fullTitle(title);
    const d = description || SITE.defaultDescription;
    document.title = t;
    setMeta('meta[name="description"]', 'content', d);
    setMeta('meta[property="og:title"]', 'content', t);
    setMeta('meta[property="og:description"]', 'content', d);
    setMeta('meta[name="twitter:title"]', 'content', t);
    setMeta('meta[name="twitter:description"]', 'content', d);
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    const url = path ? absoluteUrl(SITE_URL, path) : null;
    if (url) {
      setMeta('link[rel="canonical"]', 'href', url);
      setMeta('meta[property="og:url"]', 'content', url);
    }
  }, [title, description, path, noindex]);
}

/** Aplica los metadatos de la ruta actual (o de «no encontrada», con noindex). */
export function RouteSeo({ pathname }) {
  const route = routeFor(pathname);
  useSeo(route
    ? { title: route.title, description: route.description, path: route.path }
    : { title: NOT_FOUND.title, description: NOT_FOUND.description, path: null, noindex: true });
  return null;
}
