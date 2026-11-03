# Esquema JSON de intercambio · `arqtherm.assembly` v1

Archivo generado por «Exportar JSON» (extensión `.arqtherm.json`) para documentar o intercambiar un elemento con otras herramientas. Los números usan punto decimal y precisión completa.

```jsonc
{
  "format": "arqtherm.assembly",
  "schemaVersion": 1,                     // entero
  "exportedAt": "2026-10-29T10:00:00.000Z",
  "app": { "name": "Arqtherm", "version": "0.1.0" },

  "assembly": {                           // datos de entrada del elemento
    "id": "asm-…",
    "name": "Fachada tipo",               // texto, 1–120 caracteres
    "elementTypeId": "fachada",           // ver src/data/cte/elementTypes.json
    "climateZone": "D",                   // "alpha" | "A" | "B" | "C" | "D" | "E" | null
    "contextId": null,                    // particiones: "same-use" | "other-use"
    "isExample": false,
    "layers": [                           // del exterior (primera) al interior (última), máx. 40
      {
        "id": "ly-…",                     // único dentro del elemento
        "materialId": "cec-mw",           // id de la biblioteca, "user-…" o null
        "name": null,
        "thicknessMm": 60,                // número o null
        "lambda": null,                   // solo si lambdaOverride = true, W/(m·K)
        "lambdaOverride": false
      }
    ]
  },

  "customMaterials": [                    // materiales de usuario usados por las capas
    {
      "id": "user-…", "name": "…", "category": "insulation",
      "thermalConductivity": 0.032, "unit": "W/(m·K)",
      "dataStatus": "user", "valueType": "design", "source": "…", "notes": ""
    }
  ],

  "technical": {                          // resultados y trazabilidad del cálculo
    "method": "DA DB-HE/1, apartado 2.1.1 …",
    "formulas": ["R = d / λ", "RT = Rsi + ΣRi + Rse", "U = 1 / RT"],
    "units": { "thickness": "mm", "lambda": "W/(m·K)", "resistance": "m²·K/W", "uValue": "W/(m²·K)" },
    "layerOrder": "exterior-to-interior",
    "status": "complete",                 // complete | incomplete | unsupported
    "dataQuality": "illustrative",        // verified | user | illustrative
    "results": { "rsi": 0.13, "rse": 0.04, "layersSum": 0, "totalResistance": 0, "uValue": 0, "totalThicknessMm": 0, "layers": [] },
    "compliance": { "state": "complies", "limit": 0.41, "reference": "…", "row": "…", "reasons": [], "scopeNote": "…" },
    "orientative": { "state": "above", "value": 0.27, "reference": "… Anejo E …", "row": "…", "reasons": [], "scopeNote": "…" },   // within | above | unavailable
    "assumptions": ["…"],
    "sources": [{ "materialId": "…", "name": "…", "reference": "…", "dataStatus": "…", "valueType": "…" }],
    "regulatoryDataset": { "id": "arqtherm-cte-he1", "version": "2026.10.3", "verifiedOn": "2026-10-29", "documents": [] }
  }
}
```

## Validación

El bloque `assembly` cumple las reglas de `src/utils/validateAssembly.js`: nombre de 1 a 120 caracteres, tipo de elemento conocido, como máximo 40 capas con identificadores únicos y espesores numéricos o `null`. Los materiales de usuario tienen id `user-…`, λ finita y positiva y `dataStatus: "user"`.


## Parámetros de procedimientos tabulados (`assembly.params`)

Opcional. Objeto plano con valores numéricos, de texto o booleanos, según el tipo de elemento:

| Tipo | Parámetros |
|---|---|
| `suelo-terreno` | `areaM2`, `perimeterM`, `depthM`, `insulation` (`none` · `band` · `full`), `bandWidthM`, `raMode` (`auto` · `manual`), `raManual` |
| `muro-terreno` | `depthM` |
| `cubierta-enterrada` | `soilThicknessMm` |
| `suelo-camara-sanitaria` | `areaM2`, `perimeterM`, `crawlConditionsMet` |
| `no-habitable` | `flow` (`horizontal` · `upward` · `downward`), `bMode` (`table` · `manual`), `bManual`, `partitionAreaM2`, `envelopeAreaM2`, `airtightness` (1–5), `insulationCase` |

En los resultados, `technical.calculationMethod` indica el procedimiento y `technical.tabulatedProcedure` recoge las entradas, los pasos y la tabla de origen. En los métodos tabulados, `rsi`, `rse` y `totalResistance` son `null` y `layersSum` es Rf o Rm.
