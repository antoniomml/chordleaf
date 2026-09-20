# Chordi

Herramienta local para crear hojas de acordes con letra, transporte, cejilla, vista previa y exportacion.

## Uso

Abre `index.html` en el navegador. El documento se edita con formato tipo ChordPro:

```txt
[G]Yo era el arbol
[Cadd9]En la obra de teatro de mi vida
```

Los acordes entre corchetes aparecen justo encima del texto siguiente. Los cambios se guardan en `localStorage`.

## Exportacion

- `PDF` abre la impresion del navegador para guardar como PDF.
- `DOCX` descarga un `.docx` real con estructura OpenXML basica.
- `TXT` descarga el documento fuente para conservarlo o volver a importarlo manualmente.
- Desde `Nueva cancion`, `Importar archivo` carga `.txt`, `.cho`, `.chordpro` y PDF con texto seleccionable mediante PDF.js. Los PDF escaneados necesitan OCR y los DOC/DOCX siguen pendientes.

## Herramientas incluidas

- Transporte por semitonos.
- Cejilla con ajuste opcional de acordes tocables.
- Vista en una o dos columnas.
- Tamano de partitura ajustable.
- Insercion rapida de acordes frecuentes.
- Edicion directa desde la hoja de la derecha por linea.
- Diagramas dinamicos de acordes comunes al pasar el cursor por encima.
- Paginacion visual con varias hojas, scroll y selector de pagina.
- Barra superior con acciones y pestanas para mantener varias canciones abiertas a la vez.
- Modal de nueva cancion para empezar de cero o importar un archivo.
- Control numerico de margenes y repaginacion sensible a tamano de letra.
- Analisis orientativo de tonalidad con acordes sugeridos.
- Cierre de pestanas con confirmacion y exportacion TXT opcional.
- Boton de edicion junto a la hoja y acordes rapidos generados desde la cancion o la tonalidad detectada.
- Navegacion lateral de secciones para documento y analisis musical.
- Importacion PDF mejorada con separacion por columnas antes de detectar acordes/letra.
- Cejilla y transporte vinculados mediante boton de cadena sin cambiar la vista al activar/desactivar.
- Separacion de acordes pegados como `Am7D7` al procesar importaciones.
- DOCX usa encabezado ancho y tabla de dos columnas para evitar que Word meta titulo/capo en la primera columna.
- CSS de impresion conserva margenes/fuente de la previsualizacion.
