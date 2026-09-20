# Chordi

Estudio local de canciones con letra y acordes, creado desde cero. La versión anterior se conserva, sin modificaciones, en `legacy/`.

## Ejecutar

```sh
npm install
npm run dev
```

`npm run build` genera `dist/`. `npm test` comprueba el análisis de acordes, el transporte, la alineación y la paginación.

## Uso

Escribe `[G]Hola [D]mundo` o coloca una línea de acordes entre corchetes encima del verso. Puedes abrir varias canciones, cambiar tamaño, márgenes y columnas, y editar cada verso desde el lápiz de la previsualización. Enter confirma, Escape cancela y Shift+Enter añade un salto.

La cadena no modifica acordes al activarse. Con el vínculo activo, subir un traste la cejilla baja los acordes un semitono y conserva la tonalidad que suena. La tonalidad es una estimación orientativa y no se exporta.

Las canciones se guardan automáticamente en localStorage de este navegador. Exporta copias para conservarlas fuera de él. Cerrar una canción con cambios sin exportar requiere confirmación.

## Formatos

- TXT: texto UTF-8 con metadatos ChordPro y acordes entre corchetes.
- PDF: importación local con PDF.js, basada en posiciones, encabezados y detección de dos columnas. Los PDF escaneados necesitan OCR previo. Las maquetaciones complejas deben revisarse a mano.
- DOCX: importación de texto mediante Mammoth y exportación editable con tablas sin bordes para las columnas. Los archivos Word antiguos `.doc` deben convertirse a `.docx`.
- PDF y DOCX comparten el cálculo de líneas y páginas de la previsualización. Word puede variar ligeramente según las fuentes y el procesador de documentos.

Los diagramas SVG se generan con posiciones de dedos, incluidas formas móviles. Cuando no se conoce una posición, se indica en lugar de mostrar un diagrama incorrecto.

No hay servidor de datos, cuentas ni envíos de canciones. Las dependencias de importación y exportación se cargan bajo demanda. La interfaz utiliza DM Sans de Google Fonts, con Arial como alternativa.

## Estilo del documento e importación PDF

La hoja usa **Google Sans Code**, servida desde `public/fonts` con licencia OFL. El PDF incrusta las variantes regular y negrita; el DOCX también incluye ambas. Algunos lectores de Word ignoran las fuentes incrustadas: en ese caso se puede instalar la fuente incluida para obtener la misma composición.

El estilo es compacto y en negro, con título y artista en la primera línea cuando caben, y la cejilla debajo. Las importaciones PDF recuperan el tamaño de letra y el margen aproximados del original, y leen cada columna de arriba abajo. El marcador editable `{column}` conserva un salto de columna; no se imprime. Con una sola columna equivale a un salto de página. Los pasajes instrumentales admiten barras y guiones, por ejemplo `[Emaj7] | [G#m7] - [E5+]`.

`npm run test:e2e` ejecuta las pruebas de navegador con el servidor iniciado. Para repetir la revisión de Alone Again sin incluir documentos personales en el repositorio:

```sh
CHORDI_REFERENCE_PDF="/ruta/al/original.pdf" node tests/reference-pdf.mjs
```
