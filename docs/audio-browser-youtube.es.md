# Audio en el navegador y YouTube · 30 de septiembre de 2026

La rama `codex/audio-import-experiment` incorpora una importación íntegra en el navegador: Web Audio decodifica el archivo, un Worker ejecuta los modelos ONNX y al terminar se abre directamente la canción en el editor principal, sin una pantalla intermedia de revisión. No llama a `/api/audio-import` ni envía audio o letra a un servidor. La aplicación de escritorio conserva su motor nativo.

## Modelos y descarga

| Parte     | Modelo                                                                                             | Descarga              |
| --------- | -------------------------------------------------------------------------------------------------- | --------------------- |
| Letra     | [Qwen3-ASR 0,6B, ONNX q4f16](https://huggingface.co/jiangzhuo9357/Qwen3-ASR-0.6B-ONNX)             | 889.398.642 bytes     |
| Tiempos   | [Qwen3 ForcedAligner 0,6B, ONNX q4](https://huggingface.co/valoomba/Qwen3-ForcedAligner-0.6B-ONNX) | 1.059.845.860 bytes   |
| Acordes   | LV-Chordia: cinco redes CNN + BiLSTM, frontend CQT con afinación y decodificador temporal          | 12.672.180 bytes      |
| Ejecución | ONNX Runtime Web, WASM asyncify y JavaScript, servido por la propia web                            | Aproximadamente 27 MB |

El modal permite elegir **Letra y acordes** o **Sólo acordes**, muestra los tamaños antes de descargar y continúa directamente al importador. Los modelos disponibles muestran **✓ Ya en tu dispositivo** y **Siguiente**; la descarga sólo empieza al pulsar **Descargar y continuar**. Los modelos de voz vienen de revisiones inmutables de Hugging Face; el catálogo fija tamaño y SHA-256. Se comprueban ambos antes de guardar cada archivo. Los archivos completos se reutilizan al reintentar; un archivo incompleto se vuelve a descargar entero. No se descargan modelos automáticamente al visitar la página.

Los archivos se guardan en Cache Storage, separados de la caché de la aplicación. Una actualización de la PWA conserva los modelos. **Borrar** aparece junto a los modelos guardados; borrar la voz conserva el detector de acordes, y el motor compartido se conserva para no descargarlo de nuevo. Los audios seleccionados no se guardan allí. Al pulsar analizar, la canción resultante se guarda y abre automáticamente en el editor; si no se detecta nada, se conserva el importador con un aviso, sin crear una canción vacía. El navegador puede desalojar cachés por falta de espacio o al borrar los datos del sitio: la interfaz vuelve a comprobar su disponibilidad.

La descarga no se bloquea con `navigator.storage.estimate()`: sus cifras son aproximadas, indican la cuota del sitio y no el espacio libre del disco ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)). Se retiró el margen obligatorio del 20 % que provocaba rechazos preventivos. Si una escritura real produce `QuotaExceededError`, el modal mantiene el aviso visible y permite reintentar conservando los archivos completos. Las pruebas fuerzan tanto una estimación insuficiente con escritura permitida como un rechazo real de escritura, recuperación y reutilización de los archivos guardados.

Qwen requiere WebGPU con `shader-f16`, contexto seguro HTTPS o localhost y memoria suficiente. Recomendamos Chrome o Edge y al menos 8 GB de memoria; la detección de WebGPU no garantiza que cualquier GPU tenga memoria suficiente. Sin WebGPU está disponible la importación de **sólo acordes**, mediante WASM. Whisper sigue siendo una alternativa de escritorio; **no se ha incorporado un transcriptor Whisper de navegador**.

## Qué se ha medido

Pruebas privadas en el navegador integrado de Codex, Chromium con WebGPU, Apple M4 y 16 GB. Los audios de referencia permanecen fuera del repositorio.

- Tres fragmentos de 25 segundos, desde el segundo 30 de _Guantanamera_, _More Than Words_ y _Por qué te vas_: Qwen tardó aproximadamente 1,6–2 segundos por fragmento una vez cargado en la repetición completa; el alineador, 2,5–3,4 segundos. Una ejecución anterior de Qwen tardó hasta 3 segundos. La cadena completa de los tres fragmentos tardó 23,3 segundos, incluyendo carga del alineador y de acordes, pero excluyendo descarga y carga inicial de Qwen.
- Las cinco redes ONNX tienen un error absoluto máximo de aproximadamente `4e-6`–`1,5e-5` frente a PyTorch cuando reciben las mismas características.
- El frontend con estimación de afinación alcanzó 100 %, 99,91 % y 99,91 % de coincidencia por cuadro con el detector Python original en esos fragmentos. El navegador real produjo 100 % de coincidencia con las etiquetas de esa conversión ONNX, sobre el mismo PCM. **Son pruebas de equivalencia, no precisión musical frente a una anotación humana o los PDFs**.
- _Guantanamera_ completa, 193,30 segundos: 46,51 segundos de análisis, 60 intervalos de acordes. Hubo errores de transcripción, tiempos aproximados y una repetición artificial de vocales. Esa prueba motivó un límite de ciclos repetidos y cortes de audio cercanos a puntos de menor energía; su efecto se comprueba por separado.
- Tras introducir cortes cercanos a puntos de menor energía y un límite de ciclos repetidos, Guantanamera se volvió a completar en 50,98 segundos: desapareció la larga repetición artificial de vocales y no hubo aviso de letra parcial en esa ejecución. Persisten palabras erróneas y tiempos aproximados; no se ha calculado una tasa de error frente a una letra revisada.
- _More Than Words_ completa, 255,51 segundos: 58,05 segundos de análisis, con tiempos aproximados. La letra resulta más legible que la de Guantanamera; también aparecen errores y una palabra inventada en la introducción instrumental.
- _Por qué te vas_ completa, 205,39 segundos: 50,01 segundos de análisis y 77 intervalos de acordes, con tiempos aproximados.
- En la revisión de apertura directa se descubrió un fallo con el idioma automático: un fragmento instrumental podía devolver cero tokens, y el tokenizador lo rechazaba como error, descartando la letra completa. Se trata ahora como una transcripción vacía válida. Se repitió _More Than Words_ completa con el idioma en automático: obtuvo letra y acordes y abrió directamente el editor; persistieron errores de letra y tiempos aproximados. El fragmento de 25 segundos con idioma inglés también completó letra, alineación y acordes.
- Con el servidor de archivos apagado, se recargó la PWA y se completó letra, alineado y acordes de un fragmento de 25 segundos en 11,75 segundos, usando la caché local.
- Una prueba de carga de diez minutos, construida repitiendo un fragmento privado, completó los acordes en 39,68 segundos, con 313 intervalos. Es una prueba del límite de duración en este M4, no una evaluación musical ni una garantía para móviles.
- Una prueba automatizada ejecuta los modelos reales de acordes en WASM sobre cuatro segundos de acordes sintetizados con armónicos y decaimiento, abre la canción directamente y repite el cálculo sin conexión con los mismos intervalos. La prueba anterior de un segundo validó la duración mínima de entrada; los tonos sinusoidales puros no son una referencia musical adecuada para comprobar reconocimiento de guitarra. No hubo POST ni solicitudes a `/api/audio-import`. También verificó que los mensajes atrasados de un Worker terminado no alteran el estado después de cancelar.

La letra cantada requiere revisión. El modelo puede inventar palabras durante instrumentales, perder finales de frases o repetir sílabas. Se limita la generación y se avisa cuando queda parcial. El alineador también puede dar tiempos invertidos, repetidos o fuera del fragmento: se agrupan los tramos inconsistentes como aproximados, conservando el orden de la letra. No se presentan esos grupos como tiempos exactos por palabra.

Falta una evaluación de precisión sobre anotaciones temporales revisadas, comparaciones de letra con referencias completas, equipos con poca memoria y una matriz amplia de navegadores. Estas pruebas no convierten el resultado en una transcripción definitiva ni garantizan prestaciones idénticas en todos los equipos.

## YouTube sin servidor

Sólo se necesita audio para el análisis. Sin embargo, pegar un enlace no da acceso al audio bruto desde otra web: [CORS depende de los permisos de YouTube](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS). Una prueba real desde el navegador obtuvo `Failed to fetch` al intentar leer directamente una página de YouTube. El [ejemplo de navegador de YouTube.js](https://github.com/LuanRT/YouTube.js/blob/main/examples/browser/README.md), aunque está señalado como antiguo, requiere un proxy. La [API oficial del reproductor](https://developers.google.com/youtube/iframe_api_reference) no ofrece una descarga del audio para procesarlo.

Se ensayó la captura del audio de una pestaña, pero se retiró de la interfaz: obligaba a reproducir la canción completa y no ofrece la experiencia de descarga directa solicitada.

Se revisó también el ejemplo actualizado [Kira, del autor de YouTube.js](https://github.com/LuanRT/kira): su uso en navegador depende de una extensión o un proxy. Su [configuración de proxy](https://github.com/LuanRT/kira/blob/main/src/composables/useProxySettings.ts) no es una solución puramente estática. Guardar un audio en CacheStorage no concede permiso para obtenerlo desde YouTube. La web conserva únicamente la importación de archivos de audio; no añade un campo de enlace que prometa una descarga no implementada. Una extensión o la aplicación de escritorio permitirían investigar un extractor local sin servidor alojado, como funcionalidad separada.

## Probar y publicar

En este Mac está servida la compilación estática de prueba en **http://127.0.0.1:5191/**. Abrir **Nueva canción → Importar audio**. Los modelos descargados en otro puerto, dominio o navegador pertenecen a otro origen y requieren una descarga inicial en éste.

Para reproducir una compilación sin Python:

```sh
pnpm build
pnpm start
```

En producción basta publicar la web estática con las cabeceras de `vercel.json`. Los pesos de voz se descargan directamente de Hugging Face; la web distribuye sus recursos y los pesos pequeños de acordes. **No se necesita servidor de inferencia, GPU alojada ni API de pago por canción**. El alojamiento y la transferencia de archivos siguen sujetos a los límites del proveedor; no se promete un coste cero para tráfico ilimitado. No se ha desplegado todavía esta revisión en el dominio público.

Licencias y atribuciones: [`public/licenses/browser-audio.txt`](../public/licenses/browser-audio.txt). Scripts de conversión y comparación: `experiments/audio/`; sus salidas y los audios privados quedan en `artifacts/browser-audio`, ignorado por Git.
