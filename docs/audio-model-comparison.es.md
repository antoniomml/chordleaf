# Comparación local de modelos y primer entrenamiento propio

Experimento del 29 de septiembre de 2026 en un Mac Apple M4 con 16 GB. La mejora adoptada es **Qwen3-ASR 1.7B, con Qwen3-ForcedAligner**, como opción local para Apple Silicon. LV-Chordia sigue siendo el detector de acordes: el primer modelo propio no lo supera. Los resultados son de muestras concretas, no garantías de precisión general.

## Letra: cuatro modelos ejecutados

Se ejecutaron Whisper small, NVIDIA Parakeet TDT 0.6B v3 y Qwen3-ASR 0.6B/1.7B sobre exactamente los mismos fragmentos PCM mono de 16 kHz, con idioma automático, sin proporcionar letras ni PDFs al modelo y con conexiones de red de Python bloqueadas durante la inferencia.

La evaluación pública usa 12 canciones de Jam-ALT: seis españolas y seis inglesas. La selección es determinista por SHA-256 del nombre, antes de predecir. De cada idioma, tres canciones son desarrollo y tres prueba reservada. Se toma el primer pasaje continuo de hasta aproximadamente 45 segundos con líneas completas. Los otros tres pasajes proceden de los PDFs revisados del usuario y sólo cuentan como desarrollo.

| Modelo                         | Errores / 510 palabras de desarrollo | Errores / 436 palabras reservadas | WER reservado | Tiempo de inferencia reservado |
| ------------------------------ | -----------------------------------: | --------------------------------: | ------------: | -----------------------------: |
| Whisper small, CPU int8        |                                  149 |                               112 |        25,7 % |                        38,49 s |
| Parakeet v3, MLX               |                                  136 |                               137 |        31,4 % |                         7,99 s |
| Qwen3-ASR 0.6B, MLX 8 bits     |                                   94 |                               122 |        28,0 % |                         9,37 s |
| **Qwen3-ASR 1.7B, MLX 8 bits** |                               **83** |                            **72** |    **16,5 %** |                    **24,86 s** |

Qwen 1.7B se seleccionó por desarrollo y también mejora en la prueba reservada: 35,7 % menos errores relativos que Whisper small. En los tres pasajes privados (64 palabras), los errores fueron respectivamente 10, 8, 8 y 4. Parakeet es muy rápido, pero eso no lo convierte en el mejor transcriptor de estas canciones.

WER suma sustituciones, omisiones e inserciones respecto al texto de referencia. Se normaliza Unicode, mayúsculas y puntuación, y «I'm» a «I am». Es nuestra métrica reproducible, **no el resultado oficial completo de Jam-ALT**. Sólo hay seis canciones reservadas, no se sabe si formaron parte del preentrenamiento de los modelos y las versiones MLX cuantizadas pueden diferir de las originales. Los tiempos excluyen carga del modelo y alineación posterior; CPU y GPU no son comparaciones de arquitectura en igualdad de hardware.

## Integración y tiempos

La pestaña de audio permite elegir Whisper o Qwen. Selecciona Qwen cuando sus dos modelos están instalados. Qwen reconoce fragmentos de 30 segundos; se libera el ASR antes de cargar el alineador para limitar la memoria. El alineador estima tiempos de las palabras reconocidas sobre el mismo audio. Ambos modelos se cargan de caché, sin descargas durante el análisis.

Si el alineador produce intervalos vacíos o solapados, se conservan todas las palabras agrupándolas y se muestra una advertencia. Si omite texto, se conserva el texto original con el intervalo del fragmento. El JSON distingue `timing: grouped` / `segment`, guarda `transcript` y `rawAlignment`, y mantiene los acordes aunque falle la letra. **No se ha medido todavía el error temporal contra anotaciones manuales por palabra**; un tiempo devuelto no demuestra sincronización exacta.

Se comprobó el recorrido real con Guantanamera: inferencia de ambos modelos, reproducción de intervalos, borrador editable, exportación JSON y creación de canción, además de diseño móvil. Se corrigió la política CSP de la versión compilada para permitir el audio local `blob:`; la prueba ahora comprueba reproducción efectiva. Las pruebas de interfaz cubren también instalación ausente, cancelación, fallo de letra y disponibilidad de Qwen sin Whisper.

## Entrenamiento propio de acordes: realizado, sin mejora

Se descargaron y verificaron los archivos oficiales de GuitarSet 1.1.0 (anotaciones y micrófono mono, CC BY 4.0). Se usan acordes **interpretados y verificados**, no la progresión teórica de la partitura. Se excluyeron tres grabaciones afectadas por incidencias conocidas de tiempos o notas.

El modelo propio es una red MLP sobre CQT y cinco ventanas de contexto, con cabezas separadas de raíz y calidad armónica, aumento por transposición y ponderación de clases. Se entrenaron 30 épocas; el checkpoint se elige exclusivamente por validación. Las composiciones completas permanecen en una sola partición, incluyendo intérpretes, tonalidades y tempos: 94 grabaciones de entrenamiento, 24 de validación y 59 de prueba.

| Detector      | Raíz + calidad exactas, validación | Raíz + calidad exactas, prueba |
| ------------- | ---------------------------------: | -----------------------------: |
| Modelo propio |                            32,94 % |                        46,05 % |
| LV-Chordia    |                            64,10 % |                        73,61 % |

Se puntúan los mismos fotogramas cada 64 ms, sólo cuando la anotación tiene un conjunto de notas exactamente representable por el vocabulario de 25 calidades. La cobertura de prueba es 24.198 de 30.390 fotogramas (79,6 %). Se excluyen inversiones de la métrica; las posiciones omitidas y voicings no representables no se fuerzan a etiquetas simples. Esto **no mide el porcentaje de acordes correctos en canciones comerciales completas** ni es una evaluación oficial de GuitarSet. La separación por composición corresponde a nuestro entrenamiento; no se ha verificado el conjunto de preentrenamiento de LV-Chordia.

Varias calidades no tienen ejemplos de entrenamiento. Declarar 25 salidas no significa que la red haya aprendido las 25. GuitarSet contiene guitarra acústica aislada y no representa una mezcla de voz, bajo, batería y guitarras. Por ello el modelo propio queda como experimento reproducible, sin sustituir al detector de la aplicación.

## Datos y siguiente mejora con fundamento

Los PDFs privados siguen siendo referencias parciales: permiten revisar secuencias y transporte, pero no ofrecen automáticamente tiempos fiables, inversiones ni una referencia completa. No se han convertido en etiquetas inventadas de entrenamiento. Las canciones de Jam-ALT se han utilizado sólo para evaluar; sus licencias varían por grabación y se conservan en el manifiesto. Audio, letras, pesos y resultados privados quedan fuera de Git.

Para mejorar acordes complejos hace falta un corpus de mezclas con anotaciones temporales verificadas, suficiente presencia de extensiones e inversiones y separación por composición entre entrenamiento y evaluación. El siguiente entrenamiento debería ajustar un modelo temporal preentrenado con esos datos y mantener una prueba nueva reservada; repetir ajustes contra esta prueba dejaría de ser evaluación independiente. DALI y MultilingualALT son vías de investigación para letra cantada, con sus condiciones de acceso; **no se ha entrenado ni ajustado un ASR propio** en este experimento.

## Ejecución local y reproducción

Instalación de Qwen en Apple Silicon (descarga explícita de dependencias y dos modelos, sin recibir audio):

```sh
pnpm audio:setup qwen
pnpm build
pnpm start:local-audio
```

Cada usuario ejecuta el análisis en su equipo. El servicio está ligado a `127.0.0.1`; no existe un servidor central de procesamiento. Este backend MLX requiere Apple Silicon. Whisper conserva la alternativa CPU. Subir la web estática a producción **no instala los modelos ni ejecuta Python en el navegador**: falta empaquetar un instalador local o desarrollar y medir un port WebGPU/WASM. El bloqueo de red de Python es una protección de regresión, no un sandbox del sistema operativo para librerías nativas.

Los scripts `prepare-research.py`, `benchmark-asr.py`, `train-guitarset.py` y `evaluate-guitarset.py` permiten reproducir descarga, comparación, entrenamiento y evaluación. Las revisiones de modelos/dataset están fijadas; los manifiestos guardan referencias, licencias y hashes de audio. Consultar los comandos en [experiments/audio/README.md](../experiments/audio/README.md). Usar carpetas nuevas al cambiar el preprocesamiento: las características y predicciones intermedias se reutilizan.

## Fuentes primarias

- [NVIDIA Parakeet TDT 0.6B v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) y [port Parakeet MLX](https://github.com/senstella/parakeet-mlx).
- [Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR/) y [MLX Audio](https://github.com/Blaizzy/mlx-audio).
- [Jam-ALT](https://huggingface.co/datasets/jamendolyrics/jam-alt) y [evaluador oficial ALT](https://github.com/audioshake/alt-eval).
- [GuitarSet 1.1.0](https://zenodo.org/records/3371780), [incidencias de tiempos](https://github.com/marl/GuitarSet/issues/5) y [notas duplicadas](https://github.com/marl/GuitarSet/issues/4).
- [DALI](https://github.com/gabolsgabs/DALI) y [MultilingualALT](https://github.com/jhuang448/MultilingualALT).
- [NVIDIA Canary-Qwen 2.5B](https://huggingface.co/nvidia/canary-qwen-2.5b): investigado, no ejecutado; su orientación inglesa no cubre esta comparación bilingüe.
