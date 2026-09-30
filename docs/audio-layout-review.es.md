# Revisión de letra y colocación de acordes · 30 de septiembre de 2026

Se probaron canciones completas de la carpeta del usuario: **Guantanamera**, **More Than Words**, **Alone Again (Naturally)** y **Por qué te vas**. Se contrastó la estructura con sus cuatro PDFs de una página. Las grabaciones, letras, PDFs, respuestas y capturas permanecen en artefactos locales ignorados; no se publican ni se incluyen en la aplicación.

## Fallos encontrados y correcciones

El conversor anterior trataba una respiración de medio segundo como un pasaje instrumental y separaba su acorde de la siguiente palabra. También usaba los bloques de ASR como versos y colocaba todos los cambios de un grupo aproximado delante de su primera palabra. El alineador eliminaba puntuación presente en la transcripción.

Ahora se conservan la puntuación y las mayúsculas del ASR, se dividen líneas por frases, pausas y longitud, y los cambios durante respiraciones cortas se adjuntan a la letra. Los acordes se escriben sólo al cambiar la armonía, sin repetir el que sigue sonando al comenzar un verso. Las introducciones y los pasajes sin voz llevan una etiqueta explícita para que un acorde aislado no se asocie a la letra siguiente. Los grupos de varias palabras usan anclajes de texto proporcionales para la hoja, sin modificar sus tiempos JSON ni presentarlos como medidas por palabra. Un token largo que abarca un solo no acumula todos sus acordes encima: conserva el resto como una progresión separada.

En dos grabaciones el ASR entraba en un bucle de miles de repeticiones y agotaba el presupuesto antes de terminar la canción. Sus eventos superaban el límite de texto del importador. Ahora cada fragmento tiene su propio presupuesto; las repeticiones extremas activan un reintento con penalización de repetición. Si persisten o se alcanza el límite, el resultado indica letra incompleta y sigue con los fragmentos siguientes. Las repeticiones normales de estribillos se conservan. La aplicación mantiene los acordes aunque falle la letra.

También se acota un primer token de más de cuatro segundos cuando abarca la introducción, usando la mediana de duraciones posteriores. Este ajuste es una **heurística aproximada**, puede equivocarse con palabras realmente sostenidas y queda marcado para revisión. La alineación cruda se conserva en `rawAlignment`.

## Resultados operativos

La misma detección neuronal completa de acordes se utiliza en la comparación; se volvió a ejecutar Qwen sobre las cuatro grabaciones con los mismos pesos. La tabla describe importación y formato, **no precisión musical ni WER**. Las líneas de sólo acordes incluyen introducciones, finales y tramos sin anclaje fiable: no deben desaparecer todas.

| Canción         | Resultado anterior                      | Resultado revisado | Líneas de sólo acordes, antes → después | Mayor línea de letra, caracteres |
| --------------- | --------------------------------------- | ------------------ | --------------------------------------- | -------------------------------- |
| Guantanamera    | Importable                              | Importable         | 22 → 7                                  | 111 → 62                         |
| More Than Words | Importable                              | Importable         | 26 → 7                                  | 119 → 59                         |
| Alone Again     | Rechazado por texto repetitivo excesivo | Importable         | No comparable → 4                       | No comparable → 64               |
| Por qué te vas  | Rechazado por texto repetitivo excesivo | Importable         | No comparable → 3                       | No comparable → 46               |

La nueva conversión conserva el texto de cada nueva respuesta. Eso no significa que el ASR haya reconocido correctamente todas las palabras. Sigue habiendo errores de letra, vocalizaciones inventadas en instrumentales y colocación incierta en canto sostenido. El corpus es pequeño y de desarrollo; no sustituye al benchmark separado de precisión.

## Revisión y prueba local

El importador muestra una vista previa con acordes encima de la letra antes de crear la canción. Usa las mismas reglas de ajuste de líneas y separación de acordes que el documento, y se actualiza al editar el borrador.

La revisión se sirve localmente con `pnpm start:local-audio`, el Python portátil y la caché ya descargada. Su biblioteca pertenece al origen local y no se sincroniza con producción. El instalador anterior conserva la revisión con la que se empaquetó; modificar esta rama no actualiza automáticamente esa aplicación.

## Enlaces de YouTube

Es técnicamente viable descargar un audio autorizado en el equipo del usuario y pasarlo al mismo importador. Un extractor como yt-dlp requiere hoy un runtime JavaScript y sus componentes EJS, además del mantenimiento ante cambios de YouTube. La descarga necesita red; la inferencia posterior puede seguir siendo local. Esta revisión no incluye descarga desde enlaces ni añade un campo sin implementación.

La web pública actual no dispone de ese extractor ni del motor local. Las condiciones de YouTube restringen las descargas a los supuestos autorizados; el soporte debe respetar esas restricciones.

Fuentes: [requisitos oficiales de yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/EJS) y [condiciones de YouTube](https://www.youtube.com/static?template=terms).

## Cambios de acorde y comienzo aproximado · 30 de septiembre de 2026

Los saltos de verso ya no repiten la armonía anterior. Cada cambio detectado aparece una vez; un intervalo sin acorde mantiene una nueva entrada posterior. Las progresiones sin voz llevan etiquetas explícitas para impedir que el parser junte un acorde de introducción aislado con la letra siguiente.

La nueva prueba local de «Te vas» encontró una agrupación de «Te vas como» entre 0 y 12,64 segundos: el primer tiempo bruto de «Te» llegaba a 12,48 segundos y los dos siguientes se solapaban. Repartir esas tres palabras proporcionalmente fragmentaba la frase. En un grupo inicial reparado con duración de seis segundos o más y más de dos segundos por palabra, los cambios se conservan juntos en una progresión «Inicio», seguida de la frase completa. No se inventa un punto de entrada de la voz ni se modifica el JSON original. Los demás tramos siguen usando sus anclajes disponibles. Es una presentación conservadora de una alineación incierta, no una mejora medida de precisión del modelo.

La canción completa se analizó sin conexión, con Qwen 0,6B, su alineador y LV-Chordia: 167,36 segundos de audio y 46,29 segundos de análisis en este equipo. La letra sigue conteniendo errores del ASR; la corrección aborda repeticiones de acordes, fragmentación y posiciones engañosas al comienzo.
