/**
 * Configuración SEO única: la usan la aplicación (títulos y metadatos al navegar) y la compilación
 * (HTML por ruta, sitemap.xml, robots.txt y datos estructurados). Sin dependencias de React ni de Vite.
 */

export const SITE = {
  name: 'Arqtherm',
  locale: 'es_ES',
  language: 'es-ES',
  titleSeparator: ' · ',
  defaultTitle: 'Arqtherm · Calculadora de transmitancia térmica U según el CTE DB-HE',
  defaultDescription:
    'Calculadora gratuita de transmitancia térmica (valor U) de fachadas, cubiertas y suelos según el CTE DB-HE, con valores límite, Anejo E e informe PDF.',
  author: {
    name: 'Lars Sørensen',
    jobTitle: 'Arquitecto, consultor y especialista en fachadas',
    sameAs: ['https://www.linkedin.com/in/lars-bcn/']
  },
  ogImage: { path: '/og-image.png', width: 1200, height: 630, alt: 'Arqtherm: cálculo del valor U de un cerramiento con sección constructiva y comprobación del CTE DB-HE' },
  themeColor: '#1f5a6e',
  license: 'https://opensource.org/licenses/MIT',
  keywords: [
    'transmitancia térmica', 'valor U', 'calculadora transmitancia', 'CTE DB-HE', 'DB-HE 2019',
    'DA DB-HE/1', 'resistencia térmica', 'aislamiento térmico', 'envolvente térmica', 'fachada',
    'cubierta', 'zona climática', 'Anejo E', 'cámara de aire', 'eficiencia energética', 'arquitectura'
  ]
};

/**
 * Rutas indexables. `path` es la URL pública; `title` sin el sufijo del sitio.
 * Las descripciones deben tener entre 70 y 160 caracteres (se comprueba en las pruebas).
 */
export const ROUTES = [
  {
    path: '/',
    title: null,
    description: SITE.defaultDescription,
    changefreq: 'monthly',
    priority: 1.0
  },
  {
    path: '/calculadora',
    title: 'Calculadora de transmitancia térmica U',
    description:
      'Calcule el valor U capa a capa (DA DB-HE/1), compruébelo con el CTE DB-HE, revise condensaciones y obtenga el espesor de aislamiento necesario.',
    changefreq: 'monthly',
    priority: 0.9
  },
  {
    path: '/zonas-climaticas',
    title: 'Zonas climáticas de España según el CTE',
    description:
      'Mapa interactivo de las zonas climáticas del CTE DB-HE por provincia y altitud (tabla a-Anejo B), con buscador de la zona de cualquier localidad.',
    changefreq: 'yearly',
    priority: 0.8
  },
  {
    path: '/materiales',
    title: 'Materiales y conductividad térmica λ',
    description:
      'Biblioteca de materiales de construcción con conductividad térmica λ de referencia, fuente documental y estado de verificación de cada dato.',
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    path: '/acerca-de',
    title: 'Acerca de Arqtherm: metodología y autor',
    description:
      'Metodología de cálculo, fuentes del CTE, limitaciones y autoría de Arqtherm, calculadora de transmitancia térmica de código abierto creada por Lars Sørensen.',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    path: '/legal/aviso-legal',
    title: 'Aviso legal',
    description: 'Aviso legal de Arqtherm: titular, condiciones de uso, naturaleza de los resultados, propiedad intelectual y legislación aplicable.',
    changefreq: 'yearly',
    priority: 0.2
  },
  {
    path: '/legal/privacidad',
    title: 'Política de privacidad',
    description: 'Política de privacidad de Arqtherm: sus cálculos se guardan solo en su navegador; qué datos técnicos se tratan y cómo ejercer sus derechos.',
    changefreq: 'yearly',
    priority: 0.2
  },
  {
    path: '/legal/cookies',
    title: 'Política de cookies',
    description: 'Política de cookies de Arqtherm: sin cookies de análisis, publicidad ni terceros. Detalle del almacenamiento local y cómo gestionar su elección.',
    changefreq: 'yearly',
    priority: 0.2
  }
];

export const NOT_FOUND = { title: 'Página no encontrada', description: SITE.defaultDescription };

/** Título completo de una página. */
export function fullTitle(title) {
  return title ? `${title}${SITE.titleSeparator}${SITE.name}` : SITE.defaultTitle;
}

export function routeFor(path) {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return ROUTES.find((r) => r.path === clean) ?? null;
}

/** URL absoluta, o null si no hay dominio configurado. */
export function absoluteUrl(siteUrl, path) {
  if (!siteUrl) return null;
  return `${siteUrl.replace(/\/+$/, '')}${path === '/' ? '/' : path}`;
}

/** Datos estructurados schema.org (JSON-LD) del sitio. */
export function structuredData(siteUrl) {
  const url = absoluteUrl(siteUrl, '/');
  const author = {
    '@type': 'Person',
    name: SITE.author.name,
    jobTitle: SITE.author.jobTitle,
    sameAs: SITE.author.sameAs
  };
  const app = {
    '@type': 'WebApplication',
    name: SITE.name,
    alternateName: 'Calculadora de transmitancia térmica U según el CTE DB-HE',
    description: SITE.defaultDescription,
    applicationCategory: 'DesignApplication',
    applicationSubCategory: 'Cálculo de transmitancia térmica',
    operatingSystem: 'Web',
    browserRequirements: 'Requiere JavaScript',
    inLanguage: SITE.language,
    isAccessibleForFree: true,
    license: SITE.license,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    featureList: [
      'Cálculo del valor U capa a capa según el DA DB-HE/1',
      'Cámaras de aire sin ventilar, ligeramente y muy ventiladas',
      'Comprobación con la tabla 3.1.1.a-HE1 y los valores orientativos del Anejo E',
      'Mapa de zonas climáticas por provincia y altitud',
      'Informe PDF con sección constructiva y perfil de temperaturas'
    ],
    author,
    creator: author,
    audience: { '@type': 'Audience', audienceType: 'Arquitectos, ingenieros y técnicos de la edificación' }
  };
  const website = { '@type': 'WebSite', name: SITE.name, inLanguage: SITE.language, publisher: author };
  if (url) {
    app.url = url;
    app.image = absoluteUrl(siteUrl, SITE.ogImage.path);
    app.screenshot = app.image;
    website.url = url;
  }
  return { '@context': 'https://schema.org', '@graph': [website, app] };
}
