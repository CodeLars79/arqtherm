# Arqtherm

*Antes «U-Value Studio».*

Calculadora de transmitancia térmica (valor U) de código abierto para profesionales de la edificación en España, orientada al Código Técnico de la Edificación (CTE DB-HE).

Calcula la resistencia térmica y la transmitancia de elementos de capas, muestra cada fórmula, fuente e hipótesis, y compara el resultado con el valor límite del DB-HE cuando el caso está soportado y el dato reglamentario está verificado.

> **Aviso.** Arqtherm es una herramienta de apoyo. No sustituye la responsabilidad del técnico competente de verificar los requisitos aplicables a su proyecto. Que la transmitancia de un elemento no supere su valor límite **no acredita** que el edificio cumpla el CTE.

## Funcionalidades

- Editor de capas (exterior → interior): material, espesor en mm, λ en W/(m·K); añadir, duplicar, reordenar y eliminar.
- Cálculo en tiempo real: R de cada capa, Rsi, Rse, RT, U y espesor total. Precisión completa; redondeo solo al mostrar.
- Estado del resultado: *datos verificados*, *datos del usuario*, *ilustrativo*, *incompleto* o *no soportado*.
- Comprobación con las tablas 3.1.1.a-HE1 y 3.2-HE1: *cumple*, *no cumple* o *verificación no disponible*, siempre con el límite, su fuente y las hipótesis.
- **Elementos en contacto con el terreno y con espacios no habitables** (DA DB-HE/1, 2.1.2 y 2.1.3):
  - Soleras y losas: caso 1 (z ≤ 0,5 m, tabla 3, con B′ = A/(0,5·P), banda perimetral D y Ra) y caso 2 (z > 0,5 m, tabla 4 con Rf).
  - Muros enterrados (tabla 5, Rm y z) y cubiertas enterradas (terreno como capa de λ = 2 W/(m·K)).
  - Suelos sobre cámara sanitaria (tabla 9).
  - Particiones con espacios no habitables: U = Up · b, con Up según la tabla 6 y b de la tabla 7 (relación de superficies, aislamiento y nivel de estanqueidad de la tabla 8) o un b conocido.
  - Interpolación lineal; fuera del rango de una tabla se toma el extremo, del lado de la seguridad, y se avisa. Se comprueban con UT (tabla 3.1.1.a-HE1) y la fila UT del Anejo E. No se tratan los muros de composición variable con la profundidad (expresión 5).
- **Cubierta invertida** (opcional): corrección por agua de lluvia bajo el aislamiento según UNE-EN ISO 6946, anexo F: ΔUr = p · f · x · (R1/RT)², con x = 0,04 W·día/(m²·K·mm), p = precipitación media diaria en la temporada de calefacción (introducida por el usuario) y f = 1 / 0,75 / 0,5 según juntas y acabado. Se suma a U; avisa si es menor que el 3 % de U₀. No forma parte del DA DB-HE/1.
- **Condensaciones (DA DB-HE/2)**: superficiales (fRsi = 1 − 0,25·U frente a fRsi,min de la tabla 1, por zona y clase de higrometría) e intersticiales con diagrama de Glaser en enero (tabla C.1 de la capital, corregida por altitud: −1 °C cada 100 m con la misma humedad absoluta). μ del material o introducido por capa; cámaras de aire con μ = 1. Se aplica a fachadas, cubiertas y suelos en contacto con el aire exterior. No se calcula el balance anual mes a mes.
- **Espesor de aislamiento necesario**: espesor mínimo de una capa para cumplir Ulim o el valor orientativo del Anejo E, por bisección con el propio motor (vale también para terreno y espacios no habitables), redondeado a espesores comerciales (10 mm hasta 100 mm, 20 mm por encima) y aplicable con un clic.
- **Emplazamiento**: provincia y altitud de la localidad; propone la zona de invierno del Anejo B y aporta el clima de enero para condensaciones.
- **Plantillas** de soluciones habituales en España (SATE, fachada ventilada, aplacado de gres, fábrica con cámara, trasdosado de placa de yeso, sistema ligero, cubierta plana invertida y de teja, solera, muro de sótano, forjado sobre garaje), ilustrativas.
- **Compartir por enlace**: el elemento completo (capas, parámetros, emplazamiento, μ y materiales de usuario) se codifica en la URL (`/calculadora?e=…`), sin servidor. Al abrirlo se pide confirmación antes de sustituir el elemento actual.
- Comparación con los valores orientativos de la tabla a-Anejo E del DB-HE (fachadas, cubiertas y suelos exteriores): *dentro del valor orientativo*, *por encima* o *no disponible*. Se presenta separada del veredicto, porque no es una exigencia.
- Biblioteca de materiales con búsqueda, filtros, fuente y estado de cada dato; materiales de usuario.
- Guardado local, renombrar, duplicar, abrir y eliminar.
- **Informe PDF** descargable: una página de resumen gráfico (sección constructiva a escala con perfil de temperaturas, reparto de RT y escala de U frente a Ulim y al Anejo E) y el detalle técnico (tabla de capas, comprobaciones, método, hipótesis y fuentes). Se genera en el navegador con jsPDF y la tipografía Inter incrustada.
- **Zonas climáticas**: mapa interactivo de España por provincias (color según la zona de la capital, por severidad de invierno o de verano, con una caja junto al cursor que muestra la zona y sus tramos de altitud), buscador de la zona de una localidad por provincia y altitud que la envía a la calculadora, y la tabla a-Anejo B completa.
- **Privacidad y textos legales**: aviso legal (art. 10 LSSI-CE), política de privacidad (RGPD/LOPDGDD) y política de cookies, enlazados desde el pie. Aviso de cookies con «Aceptar todo» y «Rechazar opcionales» al mismo nivel y panel de configuración que se reabre desde el pie (Guía de cookies de la AEPD). La aplicación no instala cookies HTTP ni carga recursos de terceros (Inter está autoalojada); la tabla de la política se genera desde el inventario `STORAGE_REGISTRY` de `src/legal/consent.js`. Los datos del titular (Arqtherm, Lars Sørensen y correo de contacto) se editan en `src/legal/legalConfig.js`.
- Exportación JSON con resultados, fuentes, hipótesis y versión de los datos reglamentarios.

## Instalación y desarrollo

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # pruebas del motor y utilidades (Vitest)
npm run build      # compilación en dist/
npm run build:hosted  # página única autocontenida en dist-hosted/arqtherm.html
npm run preview    # sirve la compilación
```

En la versión alojada, el PDF y el JSON se ofrecen mediante la confirmación de descarga del visor.

La aplicación usa `BrowserRouter`. Para alojarla como estática sin reescritura de rutas (p. ej., GitHub Pages), compile con `VITE_ROUTER=hash npm run build`.

Los elementos guardados en el navegador con el nombre anterior (U-Value Studio) se siguen leyendo.

Cuando publique el repositorio, indique su URL en `src/config.js` (`REPO_URL`) para que aparezcan los enlaces a GitHub.

## Estructura

```
src/
  engine/        Motor de cálculo puro (sin React): capas, cámaras de aire, RT, U, límites, formato
  data/          Datos JSON: materials.json y cte/ (metadatos, límites, resistencias, tipos de elemento)
  report/        Informe PDF (generatePdf.js, perfil de temperaturas, tipografías incrustadas)
  utils/         Validación, exportación JSON, guardado de archivos, identificadores
  hooks/         useAssembly, useLocalStorage, useSavedAssemblies
  state/         Contexto de materiales de usuario
  components/    layout/, calculator/, materials/, ui/
  pages/         Home, Calculator, Materials, About, NotFound
  styles/        variables, global, layout, calculator, materials, print
tests/
  engine/        Capas, ensamblaje, cámaras, cumplimiento y formato
  report/        Perfil de temperaturas y generación del PDF
  utils/         Exportación e integridad de datos
docs/schema.md   Esquema del JSON de intercambio
```

## SEO y publicación

- Metadatos completos en `index.html`: título y descripción, robots, Open Graph y Twitter/X con imagen 1200×630 (`public/og-image.png`, fuente en `scripts/og-image.html`), iconos y `site.webmanifest`, y datos estructurados schema.org (`WebSite` y `WebApplication`, gratuita, autor Lars Sørensen).
- Rutas en español (`/calculadora`, `/materiales`, `/zonas-climaticas`, `/acerca-de`, `/legal/…`); las antiguas en inglés redirigen.
- `src/seo/seo.config.js` es la fuente única de títulos y descripciones: la aplicación los aplica al navegar y la compilación (`scripts/vite-plugin-seo.js`) genera un HTML por ruta con sus metadatos y canónica, `404.html` (noindex), `robots.txt` y `sitemap.xml`. Las pruebas comprueban longitudes, unicidad y que cada ruta exista.
- El dominio público, `https://www.arqtherm.com`, se define en `.env.production` (`VITE_SITE_URL`). Sin dominio se omiten la canónica, el sitemap y las URL absolutas de las imágenes sociales. Configure en el alojamiento la redirección 301 de `arqtherm.com` (sin www) y de `http://` a `https://www.arqtherm.com`.
- Despliegue estático: sirva `dist/` en cualquier alojamiento con HTTPS; las rutas ya tienen su propio `index.html` y `404.html` cubre el resto. Después, dé de alta el sitio y el sitemap en Google Search Console y Bing Webmaster Tools.

## Metodología

Para capas térmicamente homogéneas (DA DB-HE/1, apartado 2.1.1):

- `R = d / λ` (d en metros, λ valor térmico de diseño)
- `RT = Rsi + ΣRi + Rse`
- `U = 1 / RT`

| Elemento | Rse | Rsi | Fuente |
|---|---|---|---|
| Fachada (flujo horizontal) | 0,04 | 0,13 | DA DB-HE/1, tabla 1 |
| Cubierta (flujo ascendente) | 0,04 | 0,10 | DA DB-HE/1, tabla 1 |
| Suelo exterior (flujo descendente) | 0,04 | 0,17 | DA DB-HE/1, tabla 1 |
| Medianería | 0,13 | 0,13 | DA DB-HE/1, 2.1.1 |
| Particiones (horiz./asc./desc.) | 0,13 / 0,10 / 0,17 | igual | DA DB-HE/1, tabla 6 |

Casos especiales implementados según el DA DB-HE/1:

- Cámara sin ventilar: tabla 2 (10–50 mm, interpolación lineal). Ligeramente ventilada: la mitad.
- Cámara muy ventilada: se desprecian la cámara y las capas exteriores; Rse = Rsi (solo fachadas y cubiertas).
- Fábricas con resistencia tabulada (CEC 3.17), solo dentro de su rango de espesores.

Interpretación documentada: la columna «horizontal» de la tabla 2 se toma como cámara horizontal con flujo ascendente y «vertical» como cámara vertical con flujo horizontal (coherente con UNE-EN ISO 6946). Para flujo descendente la tabla no da valores y la cámara no se calcula.

En particiones entre unidades se adoptan las resistencias de la tabla 6 del DA DB-HE/1; es una hipótesis declarada en la interfaz.

## Limitaciones conocidas

No se calculan (aparecen como «no soportado» o «incompleto», sin aproximaciones):

- Muros enterrados de composición variable con la profundidad (DA DB-HE/1, expresión 5) y cálculo de b con la expresión 7 (puede introducirse b conocido).
- Huecos (UNE-EN ISO 10077), capas heterogéneas (DA DB-HE/1 apartado 3) y puentes térmicos.
- Cámaras de espesor fuera de 10–50 mm.
- K global, control solar, permeabilidad y HE0. En condensaciones intersticiales, el balance anual mes a mes cuando hay condensación.

## Referencias del CTE y procedencia de los datos

Conjunto de datos reglamentarios `2026.10.3` (tablas 3.1.1.a-HE1, 3.2-HE1 y Anejo E cotejadas el 2026-10-29; tablas 3 a 9 del DA DB-HE/1 añadidas el 2026-10-31):

- **DB-HE** consolidado de 14 de junio de 2022 (RD 732/2019, RD 450/2022 y su corrección de errores de 02/02/2023): tablas 3.1.1.a-HE1 (pág. 16) y 3.2-HE1 (pág. 18). <https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf>
- **DB-HE, Anejo E**, tabla a-Anejo E (valores orientativos; pág. 51 del consolidado), cotejada con la reproducción de la *Guía de aplicación del DB-HE 2019* (codigotecnico.org, pág. 38). Se aplica a fachadas, cubiertas y suelos en contacto con el aire exterior; la tabla no incluye medianerías ni particiones. <https://www.codigotecnico.org/pdf/GuiasyOtros/Guia_aplicacion_DBHE2019.pdf>
- **DB-HE, Anejo B**, tabla a-Anejo B (zonas climáticas por provincia y altitud), en `src/data/cte/climateZones.json`. **Cotejada** con el DB-HE consolidado (pág. 46) el 2026-11-02 leyendo la geometría de la tabla del PDF (celdas combinadas): coinciden los 52 tramos. La columna rotulada «111 - 200 m» se lee como 151–200 m. La zona de la capital, usada solo para colorear el mapa, se obtiene con la altitud de referencia de la tabla B.1 del DB-HE 2013. Las comunidades autónomas pueden asignar zonas por municipio, y en ese caso prevalecen.
- **DA DB-HE/2** (octubre 2013): expresiones 3, 4 y 9, condiciones interiores, tabla 1 (fRsi,min, pág. 5) y tabla C.1 (clima mensual de las 52 capitales, págs. 12–13; se guardan los 12 meses), en `calculationData.json` › `condensation`. **Cotejado** con el PDF oficial el 2026-11-02.
- **DA DB-HE/1** (enero 2020), tablas 3, 4, 5, 7, 8 y 9 (terreno y espacios no habitables), en `calculationData.json` › `groundAndUnheated`. **Cotejadas celda a celda** con el PDF oficial el 2026-11-02 (págs. 6–12), igual que las tablas 1, 2 y 6.
- **DA DB-HE/1** (enero 2020): tablas 1, 2 y 6. <https://www.codigotecnico.org/DocumentosCTE/AhorroEnergia.html>

Régimen transitorio: las modificaciones del RD 450/2022 son obligatorias para licencias solicitadas desde el 16/12/2022. En noviembre de 2025 se sometió a audiencia pública un proyecto de real decreto de modificación del CTE (transposición parcial de la Directiva (UE) 2024/1275). En la fecha de verificación no se ha confirmado su publicación en el BOE ni sus efectos sobre la tabla 3.1.1.a-HE1: compruebe la versión aplicable a su proyecto.

**Materiales.** Los 72 materiales del *Catálogo de Elementos Constructivos del CTE* v6.3 (marzo 2010, IETcc-CSIC) están **verificados**: se cotejaron el 2026-11-02, valor a valor (λ o R, μ y rangos), con el PDF publicado en codigotecnico.org (rotulado «versión preliminar»), mediante un script y la revisión del autor; cada material guarda la página de origen. Las fábricas de ladrillo usan la resistencia del conjunto con juntas (apartado 3.17.1), no la de la pieza. μ = ∞ (metales, vidrio, azulejo, vidrio celular) se trata como capa estanca al vapor; para EPS, XPS y PUR el CEC da un rango de μ y se pide el valor del producto. La lana mineral usa por defecto λ = 0,036, valor del autor dentro del rango verificado 0,031–0,050. Los materiales de fabricante o del autor (placa de cemento, lámina transpirable) figuran como pendientes de cotejo. Los valores de documentos oficiales se reproducen con cita de su fuente.

## Pruebas

```bash
npm test
```

Los oráculos son cálculos verificados de forma independiente, escritos como aritmética explícita en las propias pruebas (p. ej., `1 / (0,04 + 0,2/2,3 + 0,08/0,04 + 0,13)`), y los valores límite se comparan con las tablas del DB-HE. Incluyen conversión mm→m, valores nulos, cero, negativos y no finitos, elementos vacíos, cámaras de aire, cámaras muy ventiladas, límites exactos, por encima y por debajo, perfil de temperaturas, generación del PDF y conservación de fuentes y versiones al exportar.

## Licencias de terceros

- React, React Router, Vite, Vitest: MIT.
- jsPDF (generación del PDF): MIT.
- Lucide (iconos): ISC.
- Cartografía de provincias: © Instituto Geográfico Nacional (CC BY 4.0), vía es-atlas (MIT); proyección `geoConicConformalSpain` de d3-composite-projections (BSD-3-Clause); d3-geo y topojson-client (ISC). Los trazados se precalculan en `src/data/geo/spainProvinces.json` con `node scripts/build-provinces.mjs`.
- Inter (tipografía; interfaz autoalojada con @fontsource-variable/inter y subconjunto incrustado en el PDF): SIL Open Font License 1.1, véase `src/report/fonts/OFL.txt`. Para regenerar `src/report/fontData.js` tras cambiar las fuentes: `node scripts/encode-fonts.mjs`.

## Autor

Lars Sørensen, arquitecto de origen danés que lleva más de veinte años trabajando en España como arquitecto, consultor y especialista en fachadas. [LinkedIn](https://www.linkedin.com/in/lars-bcn/)

## Contribuir

Consulte [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Código original bajo licencia [MIT](LICENSE).
