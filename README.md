# Chordi

Estudio local de canciones con letra y acordes. Edita, transporta y prepara hojas para tocar, con importación y exportación TXT, PDF y DOCX.

## Ejecutar

```sh
npm ci
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

## Edición y acordes

Arrastra el separador entre el editor y la hoja para ajustar el ancho. Con el separador enfocado, usa las flechas; Inicio o doble clic restaura el ancho. En móvil los paneles se apilan. El botón de expansión abre el mismo editor en un diálogo grande; Listo o Escape lo cierra y conserva el cursor y los cambios.

Una canción nueva tiene el título vacío: «Nombre de la canción» es una ayuda del campo, no contenido exportado. La pestaña se llama «Nueva canción» hasta escribir un título.

Para colocar un cambio en una sílaba escribe `ca[G]sa`. El ancla es la `s`: los corchetes no ocupan espacio en la letra. La opción de alineación permite empezar el acorde en esa letra o centrarlo sobre ella. Cerca del margen izquierdo se limita el desplazamiento para que el acorde permanezca en la hoja. Los acordes que colisionan se apilan sin añadir espacios a la letra. Previsualización, PDF y DOCX comparten estas posiciones; los saltos manuales ayudan a controlar los versos largos. El formato TXT guarda la opción de alineación. Al reimportar un PDF o DOCX, revisa los anclajes: esos formatos conservan posiciones visuales, no el ancla musical original.

El explorador ofrece **828 entradas y 3.283 posiciones de guitarra** en afinación estándar. Admite equivalencias como `EM7` / `Emaj7`, `A♭ø7` / `Abm7b5`, `C6/9`, `Dm(maj7)` y bajos como `C/G`. Reconocer un símbolo y disponer de una digitación son capacidades diferentes: no se inventan posiciones para las extensiones que faltan.

## Desarrollo

Requiere Node.js 22.13 o posterior. El gestor de referencia es npm y `package-lock.json` fija las dependencias.

```sh
npm ci
npm test
npm run build
npm run dev
# En otra terminal, con el servidor anterior activo:
npx playwright install chromium
npm run test:e2e
```

Consulta [la arquitectura](docs/architecture.md), [la guía de contribución](CONTRIBUTING.md) y [las atribuciones](THIRD_PARTY_NOTICES.md). CI ejecuta pruebas unitarias, compilación y navegador. No subas canciones personales ni documentos de prueba con derechos ajenos. La licencia del código propio queda pendiente de elección antes de publicar el proyecto como código abierto; las licencias de terceros se incluyen por separado.
