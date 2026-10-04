# Importación de audio en Safari/iPhone · 4 de octubre de 2026

Hay una vía viable para conservar la importación móvil: LV-Chordia y Whisper Base con un motor de CPU sin Asyncify. Se han corregido riesgos concretos de compatibilidad y memoria y comprobado importaciones reales en WebKit y Chromium. **La auditoría posterior del iPhone 14 Pro físico confirmó importaciones con Base y Small, incluida una canción de 193 segundos con Base.** No se ha recuperado el error exacto del intento del 3 de octubre. Los resultados, teclado real, exportaciones y límites están en la [auditoría física](iphone-audit.md). Los cambios están en la rama de trabajo; este informe no implica publicación en producción.

## Registros y límites de la investigación

El despliegue de `chordleaf.com` estaba READY, en `main`, commit `2e9f6e266ec1149e925d45c7dc25c182af8fb0da`. La consulta de registros del 3 de octubre devolvió `403 Forbidden`. El análisis de audio no pasa por las funciones del alojamiento: se ejecuta en un worker del navegador. No había un registro persistente del intento en el teléfono; los mensajes de consola anteriores no permiten reconstruir una sesión remota cerrada.

La auditoría posterior identifica iOS 27.0 y Safari 27.0. Del intento original no se conoce si fallaba la descarga o el análisis, si Safari recargó la página, si se usaba navegación privada, ni el audio exacto. No se ha asignado retrospectivamente el fallo a una causa sin esa evidencia.

## Problemas encontrados y correcciones

- **Motor compartido:** se forzaba `ort-wasm-simd-threaded.asyncify` para todos los modelos. La propia versión instalada de Transformers.js elige otro motor en Safari anterior a 26 sin WebGPU. ONNX y WebKit también documentan consumos elevados al compilar Asyncify/JSEP; algunos casos están corregidos y otros informes recientes siguen abiertos. Son evidencia de un riesgo, no prueba del fallo concreto del teléfono. Ahora Whisper y los acordes usan el motor sin Asyncify, de unos 14 MB frente a 27 MB. Qwen conserva su motor de GPU donde se ofrece. En WebKit se ofrece CPU y se desactiva Qwen con una explicación: Safari 26 sí incorpora WebGPU, pero disponer de la API no acredita que esta cadena de Qwen y alineación sea fiable dentro del presupuesto del teléfono.
- **Descargas:** se retenían los trozos de red, un Blob y un ArrayBuffer completo. Los pesos ahora llenan un único buffer de tamaño conocido. Se conservan SHA-256, control de tamaño y reutilización de archivos completos. La respuesta de caché y el hash todavía necesitan memoria: no es una descarga de consumo constante ni una garantía para pesos de un gigabyte.
- **Audio:** se decodifica directamente a 22.050 Hz, se mezcla a mono reutilizando el primer canal y se libera la referencia multicanal. Sólo se genera la copia de 16.000 Hz cuando se pide letra. Antes se conservaba también el PCM a la frecuencia original y se renderizaban ambas copias. La reducción de copias está comprobada en el código; no se ha medido el pico de memoria del iPhone.
- **Recuperación:** hay un límite de cinco minutos sin mensajes del worker, cancelación con terminación del worker y mensajes para almacenamiento bloqueado. Se mantienen los acordes si falla la letra. No se aconseja cambiar a Chrome en iPhone como solución al motor de WebKit.
- **Diagnóstico local:** se puede descargar el informe del último intento. Registra versión, navegador, modelo, tamaño y tipo de archivo, duración, etapas y categorías de error. No guarda audio, nombre, letra, acordes, URLs ni errores internos sin filtrar. Se conserva sólo el último intento y hasta 40 eventos, sin transmisión automática. Tras una recarga, un intento pendiente pasa a `interrupted`: no distingue una recarga manual, un cierre y una terminación por memoria. Si el almacenamiento está bloqueado, sólo puede mantenerse durante esa sesión.

## Pruebas con modelos reales

Compilación de producción, Whisper Base e idioma español. Grabaciones y respuestas detalladas en `artifacts/`, ignorado por Git.

| Entrada                    | Motor    | Duración del audio | Análisis observado | Resultado                                         |
| -------------------------- | -------- | ------------------ | ------------------ | ------------------------------------------------- |
| WAV, fragmento cantado     | WebKit   | 25 s               | 4,67 s             | Letra, acordes y editor                           |
| M4A/AAC, fragmento cantado | WebKit   | 30 s               | 6,98 s             | Letra, acordes y editor                           |
| WAV, grabación completa    | WebKit   | 193,30 s           | 33,89 s            | 180 intervalos de letra, acordes y editor         |
| WAV, fragmento cantado     | Chromium | 25 s               | 4,99 s             | Importación sin conexión, letra, acordes y editor |

WebKit se ejecutó en este Mac con pantalla y agente de usuario de iPhone 14 Pro. **La emulación no reproduce su CPU, GPU, presupuesto de memoria ni versión de Safari.** Se verificó ausencia de peticiones externas durante la inferencia. El modo sin conexión de Playwright WebKit bloqueó incluso respuestas del service worker: esa ejecución no acredita funcionamiento sin conexión en iPhone. Chromium sí completó la importación sin conexión después de esperar la activación del service worker.

La nueva suite ejecuta también el modelo real de acordes sobre una progresión sintética C–Am–F–G en Chromium y WebKit, con las políticas de seguridad de producción. Comprueba el informe descargado, preservación de la canción anterior, errores de motor, cancelación, tiempo máximo, recuperación tras recargar y almacenamiento bloqueado. No descarga pesos de voz externos en CI.

Formato, compilación, metadatos y las 194 pruebas unitarias pasan. Pasan también las suites de modelos, importación, cuotas y audio web, las comprobaciones de PWA en Chromium/WebKit y los controles de texto de iPhone. La comprobación adicional de PWA en Firefox no llegó a ejecutar la aplicación: el binario local de Playwright no pudo abrir su perfil temporal, también al reintentarlo con otro directorio. No se presenta como una validación de Firefox ni como un fallo de Chordleaf.

## Letra y versos

El planificador usa también la duración de palabras, da más peso a respiraciones y evita terminar líneas en artículos, negaciones y pronombres que pertenecen a la frase siguiente. Las pausas largas separan estrofas aunque se mantenga la armonía. No se usan los bloques de cálculo del ASR como estrofas ni se repiten acordes por un salto visual. Se conservan las palabras, sus tiempos y el análisis original; los grupos con tiempos aproximados no se tratan como respiraciones medidas.

Esto mejora la presentación, **no la precisión de las palabras**. Whisper Base sigue produciendo errores considerables en las grabaciones cantadas revisadas. No se ha medido WER, entrenado otro modelo ni probado separación de voz en móvil. El resultado sigue siendo un borrador corregible.

## Recomendación antes de publicitar

Conservar la función como experimental. La primera prueba en iPhone debe ser Whisper Base o sólo acordes, un fragmento de 20–30 segundos y Safari en primer plano. Small descarga unos 252 MB, Turbo 1,09 GB, y Qwen con alineador 1,95 GB; estas cifras no incluyen memoria de ejecución. Base y Small completaron las pruebas físicas. Turbo se desactiva en iPhone/iPad WebKit tras una recarga de Safari durante su descarga; no llegó a ejecutar inferencia. Qwen también permanece desactivado en WebKit.

Las pruebas físicas cubren WAV corto, M4A corto en español e inglés, una canción completa y selección nativa de WAV. El M4A concreto del intento original sigue sin probarse. Si falla otro intento, descargar el informe antes de reintentar. Hay evidencia para mantener Base y Small como experimentales y limitar Turbo; no para anunciar compatibilidad móvil universal. Se ha reproducido el teclado horizontal sin espacio cuando las barras de Safari están abiertas. La corrección conserva el texto, cierra ese teclado con una indicación y permite ocultar las barras con un gesto; puede requerir más de un deslizamiento. La vista compacta dejó un campo de 54 px y «Listo» accesibles en la prueba real. El editor directo de versos también cabe en la pantalla y guarda o cancela con un toque. Tras reconectar el teléfono, la versión limpia confirmó en vertical Cancelar/Listo, renombrado de acordes, guardado tras recarga e importación nativa con Base y español (25 s de audio, 8,342 s de análisis). El idioma también sobrevivió a la recarga. La repetición horizontal limpia confirmó la recuperación de −9 px, Artista/Listo con 101 px disponibles y guardado/cancelación de versos conservando los acordes, sin ajustes temporales de la aplicación; véase la [auditoría](iphone-audit.md) y el [recorrido de los cambios](mobile-release-walkthrough.es.md).

Fuentes primarias: [ONNX: consumo de CPU y memoria de JSEP en Safari](https://github.com/microsoft/onnxruntime/issues/26827), [WebKit: memoria del compilador WebAssembly/Asyncify](https://bugs.webkit.org/show_bug.cgi?id=304810), [WebGPU en Safari 26](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/) y [código de Transformers.js](https://github.com/huggingface/transformers.js).

## Pulido posterior

Se recuerda el idioma de la canción entre importaciones y recargas. Automático puede confundir música en español con inglés: en la selección nativa final del WAV de prueba generó 22 líneas repetidas; al seleccionar español devolvió cuatro, todavía con errores de palabras. Se amplía la protección contra bucles a frases de más tokens, manteniendo repeticiones normales de estribillos y avisando de letra incompleta. No se eliminan ni inventan palabras después del reconocimiento.

Las 196 pruebas unitarias, 37 suites de navegador y la matriz Chromium/Firefox/WebKit pasan en CI para `bd1566a`; también pasa la comprobación de Mac. Con voz original generada localmente, WAV, AAC/M4A, MP3, FLAC y Vorbis/OGG completaron inferencia real de Base y acordes en Chromium y WebKit de escritorio. Chromium repitió los cuatro formatos posteriores al WAV sin red. Esto no acredita esos formatos ni Whisper sin conexión en el iPhone físico. La [lista de tareas](mobile-polish-tasks.md) conserva el estado y los límites de cobertura.
