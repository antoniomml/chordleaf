# Pruebas con tus MP3 y PDFs

Pruebas realizadas entre el 27 y el 28 de septiembre de 2026, en la rama `codex/audio-import-experiment`. No se han modificado los documentos originales ni publicado audio, letras o pesos. No se ha entrenado un modelo nuevo.

## Corpus y funcionamiento local

- 196 archivos de audio: todos emparejados por nombre con un PDF, normalizando acentos y puntuación.
- 34 PDFs sin texto extraíble quedan fuera de la comparación automática. No se ha supuesto que estén vacíos; necesitarían OCR/revisión.
- 162 PDFs tienen texto, pero eso no garantiza que sean referencias completas. Sólo se han revisado y comparado manualmente los pasajes indicados abajo; no hay una cifra de precisión para las 196 canciones.
- El detector neuronal procesó **196/196 canciones completas**, sin errores de ejecución ni intervalos fuera de los límites comprobados: **43.932 segundos de música, 12,2 horas**.
- Tiempo acumulado de decodificación e inferencia de acordes: **1.037 segundos, 17,3 minutos**. Mediana: **4,89 segundos por canción**, rango 2,11–18,11. Pesos ya instalados, macOS ARM, CPU; no incluye transcribir las 196 letras ni descargar modelos. No es una promesa para otros dispositivos.
- En el proceso del corpus y las pruebas de Whisper se bloquearon las conexiones de red de Python. Los audios se leyeron de disco. Los resultados detallados y sus SHA-256 están en el directorio ignorado `artifacts/audio-benchmark/full-corpus/`.

Se ha probado también la interfaz compilada con _Imagine_ completa: audio → modelo de acordes + Whisper → reproducción por intervalos → JSON → canción editable. El modo local utiliza modelos en caché; el servidor público normal no habilita el endpoint.

## Comparación musical

Se revisaron visualmente las hojas y se eligieron ventanas por la letra de la primera estrofa, usando los tiempos de Whisper. Todos los detectores procesaron el archivo completo antes de recortar su salida a esa ventana. Se comparan tres modelos neuronales y el detector básico, permitiendo una única transposición por pasaje y conservando la calidad e inversión de los acordes.

**Las cifras son coincidencias exactas / longitud de alineación, no porcentajes de precisión sobre el audio.** Los huecos y cambios extra cuentan en el denominador. La transposición se estima en el propio pasaje, los bordes de Whisper son aproximados y el arreglo escrito puede diferir de la grabación. No se ha buscado el fragmento que dé mejor resultado ni rellenado repeticiones omitidas.

| Pasaje vocal (segundos)            | Básico | LV-Chordia actual | BTC   | ChordNet 2E1D |
| ---------------------------------- | ------ | ----------------- | ----- | ------------- |
| Imagine, 12,50–37,70               | 8/18   | 7/12              | 7/12  | 7/12          |
| Fly Me to the Moon, 7,14–39,64     | 0/52   | 0/19              | 0/32  | 1/33          |
| More Than Words, 28,48–85,96       | 14/68  | 19/26             | 21/37 | 21/37         |
| I Fall in Love Too Easily, 0–54,50 | 0/68   | 9/31              | 10/46 | 5/40          |
| Guantanamera, 20,78–59,12          | 4/23   | 4/11              | 4/13  | 4/10          |
| Alone Again, 11,16–55,44           | 2/40   | 16/22             | 13/27 | 12/24         |

Se normalizaron equivalencias como `A#:min7`/`Bbm7`, `Bm7/5-`/`Bm7b5` y `Gaug7`/`G7#5` antes de puntuar; las pruebas automáticas cubren esas conversiones. Las variantes BTC y 2E1D utilizan los mismos checkpoints y configuración documentados en el [piloto anterior](audio-import-benchmark.es.md).

### Qué aportan y dónde fallan

- **More Than Words:** LV mantiene las 26 raíces de la secuencia alineada, transportada −1 semitono. Falla en algunas séptimas, `add9` e inversiones. Los otros modelos aciertan más etiquetas aisladas, pero añaden bastantes cambios.
- **Alone Again:** LV conserva varios acordes semidisminuidos y séptimas: 19 raíces y 16 acordes completos de 22 posiciones de alineación. La transposición estimada es +2. Omite el paso aumentado y la sexta, y simplifica algunas séptimas mayores.
- **I Fall in Love Too Easily:** se reconocen acordes como `Fm7`, `Ebmaj7` y `Dm7b5`; siguen perdiéndose alteraciones y extensiones como `Bb7b9` o `Ab9#11`. Tener una nota raíz correcta no resuelve la armonía de jazz.
- **Guantanamera:** aparece la progresión básica con transposición +2, pero el modelo reduce `add9` a mayor y pierde el bajo de algunas inversiones.
- **Imagine:** las tres redes omiten los pasos `Cmaj7` escritos en la hoja. El comienzo aproximado de la ventana también incluye el final del acorde anterior; no hay anotación temporal manual para resolver ese borde.
- **Fly Me to the Moon:** resultado especialmente malo en las calidades del acorde, con desacuerdo incluso en la transposición estimada entre modelos. Se conserva como caso fallido; no se descarta para mejorar la tabla. Hace falta contrastar su arreglo y tiempos antes de usarlo como dato de entrenamiento.

### Variantes probadas

La eliminación de cambios breves A–X–A de menos de 0,2 o 0,4 segundos no cambió las secuencias de estas seis ventanas. No se activó en la aplicación.

La separación armónico/percusiva HPSS, con margen 2, tampoco dio una mejora consistente: LV pasó de 19/26 a 18/26 en _More Than Words_, de 9/31 a 7/29 en Chet Baker y de 16/22 a 14/22 en _Alone Again_. _Guantanamera_ pasó de 4/11 a 4/10. Se mantiene el audio original como entrada. HPSS no es separación de voz e instrumentos.

Se asignaron tres ventanas al ajuste y tres a comprobación de estas variantes; es una comprobación exploratoria pequeña, no un conjunto de evaluación independiente: algunas canciones ya aparecían en el piloto anterior. No se han ajustado pesos ni entrenado con estas referencias.

## Letra y sincronización

Whisper `small`, CPU/int8, se ejecutó localmente con tiempos por palabra: _Imagine_ completa y los primeros 90 segundos de otras cinco canciones. Su tiempo medido para _Imagine_ fue 26,2 segundos en esa ejecución; puede variar con la carga del equipo.

Los resultados contienen frases incorrectas y una etiqueta «Music» durante una introducción instrumental. Los tiempos permiten construir un borrador alineado, pero no convierten la transcripción en una letra verificada. Se corrigió además el filtrado de palabras para descartar intervalos vacíos o invertidos después de recortarlos a la duración del audio.

## Decisión

Se mantiene LV-Chordia como motor predeterminado: en esta selección ofrece un equilibrio útil entre detalle armónico y cambios espurios. No se ha encontrado una variante que justifique sustituirlo de forma general. El resultado es un **borrador editable con acordes complejos**, todavía no una transcripción musical fiable sin revisión.

La mejora siguiente requiere anotaciones temporales revisadas y un vocabulario que represente los acordes de interés. Los PDFs ayudan a construirlas, pero no bastan para entrenar directamente. El requisito de ejecutar todo en el dispositivo se mantiene: [distribución local y arquitectura para producción](audio-local-production.es.md).
