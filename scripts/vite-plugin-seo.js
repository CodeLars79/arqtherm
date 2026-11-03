/**
 * Plugin de Vite para el SEO del sitio estático:
 *  - completa index.html con canónica, hreflang, URLs absolutas de Open Graph y JSON-LD;
 *  - genera un HTML por ruta (dist/<ruta>/index.html) con su título, descripción y canónica,
 *    para que buscadores y redes sociales vean los metadatos correctos sin ejecutar JavaScript;
 *  - genera 404.html (noindex), robots.txt y sitemap.xml.
 *
 * El dominio se toma de VITE_SITE_URL (p. ej. https://arqtherm.es). Sin dominio, se omiten
 * las etiquetas que exigen URL absoluta y el sitemap.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SITE, ROUTES, NOT_FOUND, fullTitle, absoluteUrl, structuredData
} from '../src/seo/seo.config.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function siteUrlTags(siteUrl, routePath) {
  if (!siteUrl) return '';
  const url = absoluteUrl(siteUrl, routePath);
  return [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<link rel="alternate" hreflang="es-ES" href="${esc(url)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(url)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`
  ].join('\n    ');
}

function jsonLd(siteUrl) {
  // «<» escapado para que el JSON no pueda cerrar la etiqueta <script>.
  const json = JSON.stringify(structuredData(siteUrl)).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function setAttr(html, selectorRe, value) {
  return html.replace(selectorRe, (tag) => tag.replace(/content="[^"]*"/, `content="${esc(value)}"`));
}

/** Aplica título, descripción y robots de una ruta a un documento ya compilado. */
export function pageHtml(baseHtml, { title, description, routePath, siteUrl, noindex = false }) {
  const t = fullTitle(title);
  let html = baseHtml.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(t)}</title>`);
  html = setAttr(html, /<meta name="description"[^>]*>/, description);
  html = setAttr(html, /<meta property="og:title"[^>]*>/, t);
  html = setAttr(html, /<meta property="og:description"[^>]*>/, description);
  html = setAttr(html, /<meta name="twitter:title"[^>]*>/, t);
  html = setAttr(html, /<meta name="twitter:description"[^>]*>/, description);
  if (noindex) {
    html = setAttr(html, /<meta name="robots"[^>]*>/, 'noindex, follow');
    html = setAttr(html, /<meta name="googlebot"[^>]*>/, 'noindex, follow');
  }
  // Canónica y og:url de la ruta (las de la portada se sustituyen).
  html = html.replace(/\s*<link rel="canonical"[^>]*>\s*<link rel="alternate" hreflang="es-ES"[^>]*>\s*<link rel="alternate" hreflang="x-default"[^>]*>\s*<meta property="og:url"[^>]*>/,
    noindex || !siteUrl ? '' : `\n    ${siteUrlTags(siteUrl, routePath)}`);
  html = html.replace(/<!--seo:noscript-->[\s\S]*?<!--\/seo:noscript-->/,
    `<!--seo:noscript-->\n      <h1>${esc(title || SITE.defaultTitle)}</h1>\n      <p>${esc(description)}</p>\n      <!--/seo:noscript-->`);
  return html;
}

export function sitemapXml(siteUrl, lastmod) {
  const urls = ROUTES.map((r) => [
    '  <url>',
    `    <loc>${esc(absoluteUrl(siteUrl, r.path))}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${r.changefreq}</changefreq>`,
    `    <priority>${r.priority.toFixed(1)}</priority>`,
    '  </url>'
  ].join('\n'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(siteUrl) {
  const lines = ['User-agent: *', 'Allow: /', ''];
  if (siteUrl) lines.push(`Sitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}`, '');
  return lines.join('\n');
}

export default function seoPlugin({ siteUrl = '', enabled = true } = {}) {
  let outDir = 'dist';
  return {
    name: 'arqtherm-seo',
    configResolved(config) { outDir = config.build.outDir; },
    transformIndexHtml(html) {
      let out = html.replace('<!--seo:site-url-->', siteUrlTags(siteUrl, '/'));
      out = out.replace('<!--seo:json-ld-->', jsonLd(siteUrl));
      if (siteUrl) {
        const img = absoluteUrl(siteUrl, SITE.ogImage.path);
        out = out.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")\/og-image\.png(")/g, `$1${img}$2`);
      }
      return out;
    },
    closeBundle() {
      if (!enabled) return;
      const indexPath = path.resolve(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const base = fs.readFileSync(indexPath, 'utf8');
      for (const r of ROUTES) {
        if (r.path === '/') continue;
        const file = path.resolve(outDir, `.${r.path}`, 'index.html');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, pageHtml(base, { title: r.title, description: r.description, routePath: r.path, siteUrl }));
      }
      fs.writeFileSync(path.resolve(outDir, '404.html'),
        pageHtml(base, { title: NOT_FOUND.title, description: NOT_FOUND.description, routePath: null, siteUrl, noindex: true }));
      fs.writeFileSync(path.resolve(outDir, 'robots.txt'), robotsTxt(siteUrl));
      if (siteUrl) fs.writeFileSync(path.resolve(outDir, 'sitemap.xml'), sitemapXml(siteUrl, new Date().toISOString().slice(0, 10)));
    }
  };
}
