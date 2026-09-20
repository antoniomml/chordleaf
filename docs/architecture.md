# Arquitectura

Chordi es una aplicación de navegador con módulos ES y Vite. No necesita backend. Las canciones viven en memoria y se guardan en `localStorage` bajo `chordi-v1`; las exportaciones son la copia portable del usuario.

## Módulos

| Archivo                | Responsabilidad                                                             |
| ---------------------- | --------------------------------------------------------------------------- |
| `src/app.js`           | Estado de canciones, controles y renderizado de la interfaz                 |
| `src/editor-tools.js`  | Diálogo de edición, separador accesible y explorador de posiciones          |
| `src/music.js`         | Símbolos, transporte, análisis de líneas, tonalidad orientativa y diagramas |
| `src/data/guitar.json` | Catálogo local de posiciones con trastes absolutos                          |
| `src/layout.js`        | Modelo común de líneas, colisiones, columnas y páginas                      |
| `src/files.js`         | Importación y exportación, dependencias cargadas bajo demanda               |
| `src/pdf-import.js`    | Interpretación geométrica de textos extraídos del PDF                       |
| `src/fonts.js`         | Carga e incrustación de la fuente del documento                             |

El editor ampliado mueve el textarea existente. No mantiene una segunda copia del texto: conserva el cursor, el historial de edición y el guardado habitual. El diálogo nativo gestiona foco, fondo inerte y Escape.

## Posiciones musicales

`parseSong` produce letra y marcas `{ at, chord }`. `at` es el índice en la letra sin etiquetas de acorde. `layout` añade `x` (borde izquierdo de la etiqueta, en caracteres monoespaciados) y `lane` (altura para evitar colisiones). El ancla no cambia al centrar el símbolo. Los exportadores usan ese mismo modelo; DOCX emplea tabulaciones con posiciones explícitas cuando hay desplazamientos de medio carácter.

El formato de edición usa índices UTF-16, como el textarea; está orientado a letras y cifrado musical occidentales. Los emojis y caracteres combinados no tienen garantías de alineación monoespaciada. Los PDF escaneados necesitan OCR externo.

## Catálogo

El JSON usa claves `pitchClass:suffix`; las notas son 0–11 (C–B). Las inversiones convierten el bajo en su clase de altura. Cada posición contiene seis trastes de grave a agudo: `-1` silenciada, `0` al aire, positivos absolutos. Se conserva la lista de posiciones de chords-db; no se generan digitaciones aproximadas. `scripts/import-chords.mjs` transforma una copia local del JSON original. La licencia MIT y procedencia están en `THIRD_PARTY_NOTICES.md`.

## Verificación y evolución

Las pruebas unitarias cubren importación, anclas, armonía, posiciones concretas y paginación. Las pruebas de navegador ejercitan edición, diálogos, adaptación de pantalla y los tres formatos. `artifacts/` y `output/` son resultados locales ignorados por Git.

Para añadir una funcionalidad, separa la transformación del modelo de los controles de interfaz. El reconocimiento de audio se reserva para una futura propuesta: necesitará decidir modelos, privacidad, coste y revisión manual antes de introducir servicios o claves.
