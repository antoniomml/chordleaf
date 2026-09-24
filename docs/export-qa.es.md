# Revisión de exportaciones P0

Corpus ficticio: una hoja corta con tildes y acordes, una canción de cuatro páginas y dos columnas, y 45 versos con un diagrama situado dentro del área de texto. `tests/browser.mjs`, `tests/project-browser.mjs` y `tests/diagram-export-browser.mjs` generan o verifican esos casos. `tests/project.test.js` comprueba la geometría en una y dos columnas y la ida y vuelta del proyecto.

Se compararon la vista y los PDF descargados con las páginas DOCX convertidas por LibreOffice a PDF. Los tres casos conservaron el contenido y el número de páginas; el bloque de diagramas dejó espacio antes y después de sus dibujos. No aparecieron páginas en blanco ni texto tapado en esos ejemplos. La importación del PDF generado vuelve a reconocer la letra sin incorporar `chordleaf.com`.

Word usa **Courier New**, con sustitución monospace si no está instalada, mientras la vista y el PDF usan Google Sans Code. Cambian ligeramente el peso y algunas métricas. Distintas versiones de Word o fuentes sustitutas pueden remaquetar líneas; PDF es el archivo de impresión fiel a la vista. Los diagramas se colocan como imágenes flotantes con hueco reservado en el texto.

Para repetir la revisión local: iniciar Vite y ejecutar `CHORDLEAF_URL=http://localhost:5173 pnpm test:e2e`, `node tests/project-browser.mjs` y `node tests/diagram-export-browser.mjs`. Con `CHORDLEAF_EXPORT_ARTIFACTS=1`, la última prueba guarda PDF y DOCX en `artifacts/` para abrirlos o convertirlos a imágenes.
