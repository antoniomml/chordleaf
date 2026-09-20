# Tu primera canción en Chordi

[← Volver a Chordi](../README.md)

Chordi tiene dos espacios: el editor, donde escribes, y la hoja, donde ves el resultado. Puedes ajustar la separación entre ambos o abrir el editor ampliado con el icono de flechas junto a **Letra y acordes**.

## Empezar o traer una canción

Pulsa **Nueva canción** y elige **Empezar de cero**. El título comienza vacío; «Nombre de la canción» es solo una pista del campo y no aparece impreso. Añade el artista si lo necesitas.

Si ya tienes una canción, elige **Importar una canción**:

| Archivo                     | Qué puedes esperar                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| TXT, CHO o ChordPro         | Letra y acordes entre corchetes, o líneas de acordes encima del verso. El TXT exportado por Chordi conserva los ajustes de composición. |
| PDF con texto seleccionable | Recuperación de letra, acordes, encabezados y columnas a partir de su posición. Revisa el resultado.                                    |
| Word (.docx)                | Recuperación del texto y de la estructura de columnas que pueda identificar. Revisa título y alineación.                                |

Un PDF escaneado necesita reconocimiento de texto (OCR) antes de importarlo. Los archivos antiguos `.doc` deben convertirse a `.docx`.

Cada canción se abre en una pestaña. Si cierras una con cambios sin exportar, Chordi te pide confirmación antes de descartarla.

## Poner el acorde justo ahí

Escribe el nombre del acorde entre corchetes, inmediatamente antes de la letra donde debe sonar:

```text
[G]Vuelve a sonar, [D]vuelve a empezar.
Una ca[Emaj7]sa junto al [Abm7b5]mar.
```

En `ca[Emaj7]sa`, el cambio queda en la **s**. Los corchetes no añaden espacio a la letra de la hoja.

En **Alineación** puedes elegir:

- **Inicio de la letra:** el borde izquierdo del acorde coincide con la letra marcada.
- **Centrado sobre la letra:** el centro del acorde coincide con el centro de esa letra. En el margen izquierdo, se limita el desplazamiento para mantener el acorde dentro de la hoja.

Si dos símbolos largos se pisan, Chordi los coloca en alturas distintas. No añade espacios a la letra ni cambia la sílaba marcada. El tamaño, el transporte y las columnas tampoco cambian el ancla musical.

Para versos largos, un salto manual te da más control sobre la composición. La alineación está pensada para letras y símbolos musicales habituales; los emojis y caracteres combinados pueden ocupar un ancho diferente.

## Escribir con comodidad

Arrastra la separación vertical para dar más espacio al editor o al documento. También puedes enfocar el separador con Tab y usar las flechas izquierda y derecha; Inicio o un doble clic restauran el ancho inicial. En móvil, el editor y la hoja se apilan.

El icono de expansión abre una ventana grande con el mismo texto. **Listo** o Escape te devuelven al documento. Los cambios se guardan mientras escribes.

También puedes pulsar el lápiz de la vista del documento y seleccionar un verso para editarlo sobre la hoja. Enter confirma, Escape cancela y Shift+Enter añade un salto.

## Consultar y cambiar acordes

**Explorar acordes** abre el catálogo de guitarra. Escribe un nombre y usa las flechas para recorrer sus posiciones. **Insertar acorde** lo añade donde dejaste el cursor en el editor.

El diagrama se lee de la sexta cuerda a la primera: `E A D G B e`. Un círculo vacío indica cuerda al aire, una cruz indica que no se toca y los puntos marcan los trastes. Un número junto al diagrama indica el traste inicial cuando la posición está más arriba en el mástil.

Hay 828 entradas y 3.283 posiciones en afinación estándar. Se admiten nombres equivalentes, por ejemplo:

| Puedes escribir     | Equivale a |
| ------------------- | ---------- |
| `EM7` o `EΔ7`       | `Emaj7`    |
| `A♭ø7` o `Abm7(b5)` | `Abm7b5`   |
| `C6/9`              | `C69`      |
| `Dm(maj7)`          | `Dmmaj7`   |

Reconocer un acorde no significa que exista una digitación en el catálogo. Cuando falta, se indica expresamente.

## Adaptar la canción a tu voz

Los botones de **Transportar** suben o bajan todos los acordes un semitono. Las etiquetas de secciones, como `[Estribillo]`, se mantienen.

La **cejilla** indica en qué traste se coloca. La cadena permite vincularla a los acordes: con el vínculo activo, subir un traste la cejilla baja los acordes un semitono para conservar la tonalidad que suena. Activar la cadena por sí solo no cambia los acordes.

La sección **Tonalidad** ofrece una estimación según los acordes escritos y muestra sus grados. Es una ayuda orientativa y no aparece en la exportación.

## Preparar la hoja

Ajusta el tamaño de letra, los márgenes y una o dos columnas. **Ajustar a 1 página** intenta reducir el tamaño hasta un mínimo legible; una canción larga puede necesitar más páginas.

Para forzar el comienzo de otra columna, escribe `{column}` en una línea propia. Con una sola columna, equivale a un salto de página. El marcador no se imprime. Los pasajes instrumentales admiten barras y guiones:

```text
[Emaj7] | [G#m7] - [E5+]
```

## Guardar y compartir

| Elige…          | Para…                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| **PDF**         | Imprimir o compartir una composición fija.                                         |
| **Word · DOCX** | Seguir editando en un procesador de textos. El lector puede variar la composición. |
| **Texto · TXT** | Conservar letra, anclas y ajustes para volver a abrirlos en Chordi.                |

La vista previa, PDF y Word parten de las mismas posiciones. Al reimportar PDF o Word se reconstruyen a partir de su apariencia: revisa los cambios de acorde, especialmente si estaban centrados. El TXT es la mejor copia para continuar el trabajo exacto.

El guardado automático pertenece a este navegador. No es una copia en la nube: exporta tus canciones antes de cambiar de dispositivo o borrar datos del navegador.
