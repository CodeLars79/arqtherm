import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { ROUTES, SITE, fullTitle, routeFor, absoluteUrl, structuredData } from '../../src/seo/seo.config.js';
import { pageHtml, sitemapXml, robotsTxt } from '../../scripts/vite-plugin-seo.js';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

describe('SEO configuration', () => {
  it('every indexable route exists in the router', () => {
    for (const r of ROUTES) {
      if (r.path === '/' ) continue;
      const top = '/' + r.path.split('/')[1];
      const declared = app.includes(`path="${r.path}"`) || app.includes(`path="${top}/*"`);
      expect(declared, r.path).toBe(true);
    }
  });
  it('titles and descriptions fit search-result limits and are unique', () => {
    const titles = new Set(); const descs = new Set();
    for (const r of ROUTES) {
      const t = fullTitle(r.title);
      expect(t.length, t).toBeLessThanOrEqual(70);
      expect(r.description.length, r.path).toBeGreaterThanOrEqual(70);
      expect(r.description.length, r.path).toBeLessThanOrEqual(160);
      titles.add(t); descs.add(r.description);
    }
    expect(titles.size).toBe(ROUTES.length);
    expect(descs.size).toBe(ROUTES.length);
  });
  it('index.html carries the default title and description', () => {
    expect(indexHtml).toContain(`<title>${SITE.defaultTitle}</title>`);
    expect(indexHtml).toContain(`content="${SITE.defaultDescription}"`);
  });
  it('normalises paths and builds absolute URLs', () => {
    expect(routeFor('/calculadora/').path).toBe('/calculadora');
    expect(routeFor('/nope')).toBeNull();
    expect(absoluteUrl('https://x.es/', '/calculadora')).toBe('https://x.es/calculadora');
    expect(absoluteUrl('', '/')).toBeNull();
  });
  it('structured data describes a free web application by the author', () => {
    const graph = structuredData('https://x.es')['@graph'];
    const appLd = graph.find((g) => g['@type'] === 'WebApplication');
    expect(appLd.offers.price).toBe('0');
    expect(appLd.author.name).toBe('Lars Sørensen');
    expect(appLd.url).toBe('https://x.es/');
    expect(structuredData('')['@graph'][1].url).toBeUndefined();
  });
});

describe('build output helpers', () => {
  const base = indexHtml
    .replace('<!--seo:site-url-->', '<link rel="canonical" href="https://x.es/" />\n    <link rel="alternate" hreflang="es-ES" href="https://x.es/" />\n    <link rel="alternate" hreflang="x-default" href="https://x.es/" />\n    <meta property="og:url" content="https://x.es/" />');
  it('rewrites head metadata per route', () => {
    const r = routeFor('/zonas-climaticas');
    const html = pageHtml(base, { title: r.title, description: r.description, routePath: r.path, siteUrl: 'https://x.es' });
    expect(html).toContain(`<title>${fullTitle(r.title)}</title>`);
    expect(html).toContain('<link rel="canonical" href="https://x.es/zonas-climaticas" />');
    expect(html).toContain(`<meta property="og:description" content="${r.description}" />`);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain(`<h1>${r.title}</h1>`);
  });
  it('marks the 404 page noindex without canonical', () => {
    const html = pageHtml(base, { title: 'Página no encontrada', description: SITE.defaultDescription, routePath: null, siteUrl: 'https://x.es', noindex: true });
    expect(html).toContain('<meta name="robots" content="noindex, follow" />');
    expect(html).not.toContain('rel="canonical"');
  });
  it('lists every route in the sitemap and points robots to it', () => {
    const xml = sitemapXml('https://x.es', '2026-10-31');
    for (const r of ROUTES) expect(xml).toContain(`<loc>${absoluteUrl('https://x.es', r.path)}</loc>`);
    expect(robotsTxt('https://x.es')).toContain('Sitemap: https://x.es/sitemap.xml');
    expect(robotsTxt('')).not.toContain('Sitemap');
  });
});
