# Navegador y audio de YouTube · revisión del 30 de septiembre de 2026

Es viable investigar una importación íntegra dentro del navegador de una web pública, sin servidor de procesamiento. **Todavía no está implementada en Chordleaf.** El importador actual sí funciona en un navegador local, acompañado del motor Python instalado en ese mismo ordenador. El empaquetado de escritorio conserva ese motor y facilita su instalación.

## Qué funcionaba antes y qué funciona hoy

La interfaz llama a `/api/audio-import`; el servicio local lanza Python para detectar acordes y transcribir. La aplicación de escritorio usa un puente al mismo tipo de motor. El código actual no ha sustituido una implementación neuronal JavaScript que funcionase en producción: esa implementación no existe en la rama. Publicar los archivos de la web no instala Python, MLX ni los pesos en los ordenadores de sus visitantes.

| Modalidad                                                  | ¿Importa audio hoy?         | Dónde calcula                                |
| ---------------------------------------------------------- | --------------------------- | -------------------------------------------- |
| Navegador con Chordleaf y motor servidos desde `127.0.0.1` | Sí, con modelos disponibles | Python en ese ordenador                      |
| Candidato de escritorio Apple Silicon                      | Sí, con modelos instalados  | Motor incluido en ese ordenador              |
| Web pública, sin instalación adicional                     | No con el motor actual      | Pendiente de portar a JavaScript/WASM/WebGPU |

El servicio local comprueba socket, host y origen. No se propone abrirlo a cualquier web mediante CORS para convertir la página pública en un cliente del motor privado.

## Vía para una web sin instalación nativa

[Transformers.js documenta Whisper multilingüe, fragmentación de audios largos y tiempos por palabra](https://huggingface.co/docs/transformers.js/api/pipelines). [ONNX Runtime Web ejecuta modelos en WASM o WebGPU](https://onnxruntime.ai/docs/tutorials/web/); WASM admite todos sus operadores ONNX, mientras que los proveedores GPU admiten un subconjunto. Estas capacidades demuestran que la arquitectura es posible, no que el conjunto de Chordleaf esté validado.

Hay además una [conversión comunitaria de Qwen3-ASR **0,6B** preparada para navegador](https://huggingface.co/jiangzhuo9357/Qwen3-ASR-0.6B-ONNX). Su ficha publica una variante WebGPU q4f16 de aproximadamente 0,7 GB más unos 156 MB de embeddings y otros recursos; exige `shader-f16`. La variante q4 publica aproximadamente 1,1 GB más esos recursos. Son cifras del autor, no mediciones nuestras. Su validación web usa ocho clips hablados en chino, inglés y japonés, incluyendo un Apple M4; no evalúa nuestras canciones españolas ni aporta el alineador de palabras que utiliza Chordleaf. No equivale al Qwen 1,7B MLX elegido en nuestras pruebas.

La [herramienta de exportación Qwen ASR a ONNX](https://github.com/andrewleech/qwen3-asr-onnx) también ofrece 1,7B. Sus pruebas de ONNX Runtime con proveedor WebGPU en Python no deben confundirse con una integración terminada en el navegador. Las conversiones Qwen de modelos de texto tampoco prueban compatibilidad de Qwen ASR.

Orden propuesto para validar el port:

1. Mantener el formato de resultados, la revisión y la colocación de acordes existentes. Incorporar una prueba aislada de Whisper multilingüe con tiempos por palabra, descarga explícita y ejecución en un Worker.
2. Exportar las cinco redes de LV-Chordia y reproducir su preprocesamiento CQT y decodificación temporal. Comparar características, salidas numéricas y eventos finales con Python sobre exactamente los mismos audios, antes de evaluar velocidad. Cambiarlo por un detector de tríadas reduciría el vocabulario que pidió el usuario.
3. Comparar Qwen 0,6B web y, si resulta viable, 1,7B con el motor local actual. Medir letra cantada y tiempos, incluyendo el coste y la viabilidad del alineador. No adoptar el modelo menor sólo porque se ejecute en WebGPU.
4. Medir memoria máxima, tiempo completo, cancelación, canciones de hasta diez minutos y compatibilidad real de navegadores/dispositivos. Detectar capacidades, ofrecer una alternativa WASM cuando sea practicable y explicar los equipos que no puedan completar la importación.
5. Probar caché, eliminación de modelos y uso sin conexión después de descargar la aplicación y sus recursos. Comprobar tráfico: los archivos de audio no deben enviarse a servidores.

En producción se servirían la web, los recursos del runtime y los pesos descargables. El servidor distribuye archivos; el equipo del visitante calcula. Eso conserva el requisito de no alojar un servicio de inferencia, aunque la descarga inicial sí necesita Internet. No se ha medido todavía una duración ni una precisión para esta futura implementación.

## YouTube: basta el audio

[yt-dlp permite seleccionar `bestaudio`, un flujo sólo de audio](https://github.com/yt-dlp/yt-dlp#format-selection). No hace falta descargar el vídeo ni convertir obligatoriamente a MP3. El motor actual decodifica el contenido con PyAV antes de obtener PCM; la futura integración deberá comprobar el contenedor recibido y aceptar o adaptar formatos como WebM/Opus y M4A/AAC en la entrada y reproducción, además de los formatos hoy anunciados por la interfaz.

La vía más directa en escritorio o en el servicio local sería: enlace → descarga temporal de audio → validación de tamaño/duración → importador existente → limpieza al terminar o cancelar. La descarga usa red, pero la inferencia conserva su bloqueo de red. El extractor debe ejecutarse separado de esa fase. Faltan implementar y probar el campo de enlace, progreso, cancelación, límites y errores. No se ha añadido un campo que prometa una descarga inexistente.

El mantenimiento forma parte de la viabilidad: [yt-dlp requiere un runtime JavaScript compatible y componentes EJS para YouTube](https://github.com/yt-dlp/yt-dlp/wiki/EJS). No se garantiza compatibilidad permanente ante cambios de YouTube.

En una web sin instalación hay un problema adicional a los modelos: [la API oficial del reproductor permite controlar la reproducción](https://developers.google.com/youtube/iframe_api_reference), pero no expone una descarga del audio bruto para inferencia. Las solicitudes entre orígenes [requieren permiso del servidor mediante CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS). Por ello, pegar un enlace y embeber un reproductor no resuelve la adquisición del audio. Un extractor central introduciría un servidor del que el usuario quiere prescindir; una extensión o aplicación auxiliar exigiría instalación. La entrada por archivo local sigue siendo la vía más directa para una primera versión íntegra en navegador.

Una integración pública también debe limitarse a las descargas autorizadas por el servicio o con los permisos exigidos por las [condiciones de YouTube](https://www.youtube.com/static?template=terms). Seleccionar sólo audio no cambia ese requisito.

## Prueba local preparada en este Mac

La revisión actual está servida en `http://127.0.0.1:5188/`, con Qwen y LV-Chordia disponibles. Abrir **Nueva canción → Importar audio**, seleccionar una grabación y pulsar **Obtener letra y acordes**. No hay que reinstalar el candidato de escritorio para esta prueba. El navegador muestra «Letra con Qwen» y «Todo listo. Elige una grabación» cuando está preparado.

El servicio iniciado durante esta revisión usa el Python portátil y los modelos ya descargados. Si se detiene, desde la raíz del proyecto se puede arrancar con:

```sh
PORT=5188 CHORDLEAF_AUDIO_PYTHON="$PWD/artifacts/desktop/runtime/python/bin/python3" HF_HOME="$PWD/artifacts/desktop/model-test-profile/models" pnpm start:local-audio
```

Este comando depende de esos artefactos locales y de `dist` ya compilado; no es una receta de instalación para cualquier visitante. La biblioteca del navegador local pertenece a ese origen y no se sincroniza con producción. La aplicación nativa anterior conserva la revisión con la que se empaquetó; actualizar esta rama no actualiza aquel instalador.
