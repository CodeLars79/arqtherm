# Cómo contribuir

Gracias por su interés en Arqtherm. El proyecto prioriza la exactitud y la trazabilidad por encima del número de funciones.

## Comunicar errores

Abra una incidencia indicando: versión de la aplicación, elemento (exporte el JSON y adjúntelo), resultado obtenido, resultado esperado y la referencia normativa o el cálculo que lo justifica.

## Datos técnicos

Toda contribución de datos (materiales, límites, tablas) debe:

1. Citar la fuente exacta: documento, versión o fecha, tabla o apartado y página.
2. Indicar el tipo de valor (diseño, declarado, resistencia tabulada) y sus condiciones.
3. Asignar un `dataStatus` honesto: `reference-verified` solo si se ha cotejado con la publicación oficial vigente.
4. Comprobar que la licencia de la fuente permite su redistribución.
5. Actualizar `datasetVersion` y, en datos reglamentarios, `verifiedOn` y las notas de régimen transitorio.

No se aceptan valores sin fuente presentados como referencia.

## Código

- El motor (`src/engine/`) no debe depender de React.
- No implemente aproximaciones para casos especiales: si un procedimiento oficial no está implementado, el resultado debe ser «no soportado» o «incompleto».
- Añada pruebas con oráculos calculados de forma independiente (aritmética explícita o valores de una fuente publicada), nunca la salida de la propia aplicación.
- Mantenga la accesibilidad: etiquetas en todos los controles, foco visible, estados que no dependan solo del color, diálogos accesibles.
- Ejecute `npm test` y `npm run build` antes de enviar cambios.

## Nuevos procedimientos

Para añadir un tipo de elemento (p. ej., suelos en contacto con el terreno), implemente el procedimiento del DA DB-HE/1 correspondiente como módulo independiente en `src/engine/`, sus tablas en `src/data/cte/` con referencia y estado de validación, y pruebas basadas en ejemplos resueltos de forma independiente.
