# Prueba con tus PDFs y audio real

27 de septiembre de 2026 · Rama `codex/audio-import-experiment`.

**Resultado:** sustituir el detector de triadas por un modelo neuronal ya entrenado mejora mucho la estabilidad y permite reconocer acordes más ricos. Todavía simplifica armonías y comete errores en las extensiones. Recomiendo usarlo como generador de un borrador revisable; no entrenar desde cero todavía.

## Material revisado

He inventariado y extraído el texto de **252 PDFs**, sin modificar los originales. Una búsqueda preliminar encontró candidatos a acordes extendidos en 104 archivos; es un filtro de selección, no una clasificación musical validada de toda la colección. He revisado visualmente la página completa de estas cuatro hojas y transcrito sus acordes para el ensayo:

| Hoja                                          | Casos que aporta                                               |
| --------------------------------------------- | -------------------------------------------------------------- |
| Die with a smile - Bruno Mars & Lady Gaga.pdf | maj7, m7, sus2, sus4, dominantes; capo/transposición.          |
| The Winner Takes It All - ABBA.pdf            | D/F#, E7/G#, dominantes secundarias; arreglo abreviado.        |
| I fall in love too easily.pdf                 | m7b5, maj7, novenas, acordes aumentados y alteraciones b9/#11. |

YouTube devolvió HTTP 403 al descargar el vídeo oficial de «Die With a Smile». Se utilizaron **tres muestras oficiales de Apple, de 29,9755 segundos cada una**: [Die With a Smile, single](https://music.apple.com/es/album/die-with-a-smile/1762656724?i=1762656732), [The Winner Takes It All, ABBA Gold](https://music.apple.com/es/album/the-winner-takes-it-all/1440816833?i=1440816849) e [I Fall in Love Too Easily, Chet Baker Sings](https://music.apple.com/es/album/i-fall-in-love-too-easily/1440864756?i=1440866092). Se descartó una edición instrumental distinta de Chet Baker antes del ensayo para mantener la versión vocal como fuente.

**Son fragmentos, no canciones completas.** Estos ejemplos elegidos deliberadamente por su armonía no representan todo el repertorio ni constituyen un conjunto de evaluación independiente. Los audios, texto extraído y resultados detallados se guardan localmente en `artifacts/audio-benchmark/`, excluido de Git.

## Qué he ejecutado

1. Detector anterior: cromagrama, 24 triadas y suavizado temporal.
2. [lv-chordia 1.1.0](https://github.com/openmirlab/lv-chordia), que empaqueta los modelos de [Jiang y colaboradores, ISMIR 2019](https://github.com/music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition): cinco redes CNN/LSTM y decodificación temporal. Descargados e instalados sus cinco checkpoints, unos 28 MB en total. No es un modelo entrenado aquí.
3. El mismo modelo con su diccionario `full` en vez de `submission`.
4. El modelo estándar después de separación armónica/percusiva, HPSS, con librosa. Esto no es separación neuronal de voz con Demucs.
5. Whisper `small` sobre los tres fragmentos para ayudar a identificar el pasaje de letra. No se ha medido WER porque no se ha preparado una transcripción de referencia anotada del audio.

El diccionario estándar contiene **301 etiquetas**, contando raíces e inversiones: mayor, menor, séptimas, novenas, onceavas, treceavas, suspendidos, disminuidos, aumentados y determinadas inversiones. Que una etiqueta exista no significa que el modelo la detecte bien. Muchas alteraciones de tu hoja de jazz ni siquiera están en ese diccionario estándar.

## Cómo se comparó

Tus PDFs contienen arreglos, posiciones y repeticiones abreviadas, pero no tiempos. No sería correcto presentar su comparación como un porcentaje de acierto por segundo.

- Se igualan notas enarmónicas: D#maj7 y Ebmaj7 son equivalentes.
- Se normaliza tu notación: Dm7-5 → Dm7b5, Bb7-9 → Bb7b9, Ab9+11 → Ab9#11.
- Se aplica **un único desplazamiento a toda la secuencia**, tanto a raíces como a bajos. No se transporta cada acorde por separado.
- Se conservan calidad, extensiones y bajo para el cotejo exacto. Un G en lugar de G7 no cuenta como coincidencia exacta.
- Se eliminan intervalos `N` y se comprimen etiquetas consecutivas equivalentes para comparar cambios, no duración.
- El alineamiento penaliza acordes añadidos y omitidos. Se guarda la correspondencia completa para poder inspeccionarla.

En «Die With a Smile» la letra transcrita permite ubicar el final del primer preestribillo y el inicio del estribillo: se comparó ese pasaje fijado, conservando incluso el cambio Bsus4 → B que el modelo fusiona. En ABBA el fragmento incluye una estrofa posterior que no figura en tu versión corta; se buscó el pasaje armónico más parecido. En Chet Baker Whisper no devolvió palabras: no hay ancla de letra y la comparación es también de mejor pasaje. En esos dos casos las coincidencias son exploratorias y la selección del pasaje puede favorecer el resultado.

Los desplazamientos usados, estimados en estas mismas muestras y aplicados por igual a ambos detectores, fueron **−5, −1 y 0 semitonos** respectivamente, de PDF a grabación. No son estimaciones de cejilla. En particular, el «capo 4» de tu PDF de «Die With a Smile» no permite reconstruir automáticamente el tono de la grabación desde las posiciones escritas.

## Resultados observados

Cada fracción es el número de coincidencias / posiciones del alineamiento, **no precisión musical validada**. Las posiciones incluyen huecos por cambios añadidos u omitidos; por eso los denominadores difieren entre modelos.

| Fragmento                 | Detector anterior: raíz / exacto | Neuronal: raíz / exacto |
| ------------------------- | -------------------------------- | ----------------------- |
| Die With a Smile          | 11/24 · 3/24                     | 12/13 · 6/13            |
| The Winner Takes It All   | 17/33 · 11/33                    | 11/11 · 8/11            |
| I Fall in Love Too Easily | 18/44 · 0/44                     | 13/16 · 3/16            |

La reducción de intervalos emitidos, incluyendo `N`, fue de **42 → 13**, **48 → 12** y **65 → 16**. Es una señal de menor fragmentación, no una métrica de corrección por sí sola.

Ejemplos concretos, expresados en la tonalidad de la grabación:

| Caso             | Referencia transportada | Salida neuronal | Lectura                                                           |
| ---------------- | ----------------------- | --------------- | ----------------------------------------------------------------- |
| Die With a Smile | C#m7                    | C#m7            | Conserva la séptima menor.                                        |
| Die With a Smile | Bm7                     | Bm7             | Coincide en raíz y calidad.                                       |
| Die With a Smile | Esus2                   | E7              | Coincide en raíz, discrepa en suspensión/séptima.                 |
| Die With a Smile | F#m                     | F#m7            | Añade una séptima que no está en la hoja.                         |
| ABBA             | C#/F                    | C#/F            | Recupera la inversión del D/F# original.                          |
| ABBA             | Bb7                     | Bb/D            | Coincide en raíz; cambia el bajo y pierde la séptima.             |
| ABBA             | Eb7/G                   | Eb              | Simplifica la dominante invertida.                                |
| Chet Baker       | Ebmaj7                  | Ebmaj7          | Reconoce la séptima mayor.                                        |
| Chet Baker       | Dm7b5                   | Dm7b5           | Detecta un semidisminuido en un cambio; en otros lo reduce a Dm7. |
| Chet Baker       | Bb7b9                   | Bb7             | Pierde la novena bemol.                                           |
| Chet Baker       | Gaug7                   | G7              | Pierde la quinta aumentada.                                       |
| Chet Baker       | Ab9#11                  | Ab7             | Pierde extensiones y alteración.                                  |

Una discrepancia no demuestra por sí sola que el detector esté equivocado: tu arreglo puede omitir notas, cambiar un bajo o corresponder a otra interpretación. Tampoco debemos dar automáticamente la razón al modelo. Haría falta escuchar y anotar esos instantes para decidir.

El diccionario `full` no mejoró el cotejo exacto: dejó **6/15**, **8/11** y **3/16**, frente a **6/13**, **8/11** y **3/16** del estándar. En «Die With a Smile» añadió cambios. HPSS obtuvo **7/13**, **8/11** y **3/16**: una mejora puntual, insuficiente para adoptarlo por defecto. Aumentar el número de etiquetas disponibles no resuelve por sí solo la detección de alteraciones.

En este Mac ARM, el reconocimiento neuronal tardó **2,285 s**, **0,644 s** y **0,639 s** para los tres fragmentos; el primero incluye inicialización de bibliotecas. Son tiempos dentro de un proceso, con cuatro hilos, audio ya decodificado y modelos instalados. Excluyen descarga, arranque del proceso, transcripción y la interfaz; no deben extrapolarse como latencia garantizada por canción.

Whisper `small` permitió localizar el fragmento de «Die With a Smile», pero cambió algunas palabras. En ABBA también hubo errores; en Chet Baker no produjo texto. La letra sigue necesitando revisión separada de la armonía.

## Contraste adicional: Guantanamera

Tras elegir la configuración anterior, probé una cuarta muestra de 29,9755 s: [Guantanamera, Guitarricadelafuente](https://music.apple.com/es/album/guantanamera/1753062808?i=1753062818). Revisé visualmente su PDF, que contiene `Em7`, `Cadd9` y `D/F#`. No ajusté el modelo con esta canción.

Whisper `small` permitió localizar el final de la primera estrofa y la segunda estrofa, aunque cometió errores en palabras y en el título cantado. Fijé ese pasaje antes de recalcular el cotejo. El desplazamiento estimado fue **+2 semitonos**, distinto de aplicar literalmente el «capo 4» de la hoja.

| Detector              | Raíz | Coincidencia exacta | Intervalos emitidos |
| --------------------- | ---- | ------------------- | ------------------- |
| Referencia de triadas | 8/18 | 3/18                | 35                  |
| Neuronal estándar     | 7/8  | 3/8                 | 9                   |

El modelo conserva mejor la secuencia, pero reduce el `Cadd9` transportado (`Dadd9`) a `D`, omite el bajo del `D/F#` transportado (`E/C#`) y propone `D/A` donde la hoja transportada indica `F#m7`. No basta con que el audio sea acústico para resolver la armonía con precisión. El diccionario `full` devolvió la misma secuencia de etiquetas. Este contraste refuerza la necesidad de revisar extensiones e inversiones y de distinguir un vocabulario amplio de una detección fiable.

## Contraste con modelos de 2026

También ejecuté los checkpoints públicos **BTC CL** y **ChordNet 2E1D CL** del [repositorio oficial de ChordMini](https://github.com/ptnghia-j/ChordMini), asociado al trabajo de Phan y colaboradores de 2026. No se entrenaron aquí. Se utilizó el commit `aa6e3a8d7b017f082fd2aaff9329d5c26af49c03`, con carga segura de pesos y comprobación estricta de parámetros.

Mismos cuatro audios PCM y referencias, cuatro hilos CPU, ventanas solapadas, agregación de logits y suavizado de tamaño 9; sin eliminar segmentos cortos del resultado. Se reutilizó nuestro entorno de inferencia, no la combinación antigua de versiones fijada por los autores. Es una comparación exploratoria de esta ejecución, no una reproducción del benchmark publicado.

| Fragmento        | LV-Chordia: exactos / alineamiento | BTC CL: exactos / alineamiento | 2E1D CL: exactos / alineamiento |
| ---------------- | ---------------------------------- | ------------------------------ | ------------------------------- |
| Die With a Smile | 6/13                               | 9/18                           | 8/18                            |
| ABBA             | 8/11                               | 9/14                           | 8/11                            |
| Chet Baker       | 3/16                               | 5/25                           | 3/24                            |
| Guantanamera     | 3/8                                | 3/14                           | 3/13                            |

BTC recupera algunas séptimas y calidades que LV simplifica, pero también introduce más cambios: por ejemplo, 18 intervalos en «Die With a Smile» frente a los 13 de LV, incluyendo el diminuto `N` inicial de este último. Los modelos CL emplean 170 clases con un vocabulario más limitado para extensiones y sin bajos invertidos; no resuelven el requisito de `add9` o inversiones por añadir otra arquitectura. Ninguno domina de forma clara en todas las dimensiones.

**Mantengo LV-Chordia como opción principal provisional** por su estabilidad y cobertura de inversiones/extensiones. BTC CL merece permanecer como comparador para un futuro ensayo de corrección humana y adaptación. No sumaría las predicciones ni escogería siempre el acorde más complejo: eso añadiría detalles sin evidencia. Las discrepancias entre modelos podrían servir para señalar pasajes a revisar, tras validar ese criterio.

## Cambios que quedan en la aplicación

- Selector de detector: neuronal con acordes complejos, o referencia mayor/menor.
- El neuronal es la opción predeterminada del experimento local.
- Acordes extendidos y bajos invertidos llegan al borrador y al editor sin recortarse a triadas.
- JSON conserva tanto la etiqueta legible como la original del modelo (`rawLabel`) y sus tiempos.
- Se verifica que existan los cinco checkpoints: se evita que la biblioteca siga con pesos aleatorios si falta alguno.
- Se normaliza el audio a PCM antes de entregarlo a la biblioteca, evitando el fallo de su lector con M4A. Se ha añadido la compatibilidad de `audioop` necesaria en Python 3.13.
- Whisper local pasa de `tiny` a `small` en la sesión de prueba.

No se han cambiado tus PDFs ni publicado audios o documentos. No se ha entrenado ni ajustado un modelo nuevo.

## La mejor continuación

**Usaría el modelo neuronal como base, con edición manual de los resultados y énfasis en séptimas e inversiones.** Mantendría las alteraciones de jazz como una capacidad experimental, no como una promesa.

Para entrenar algo que mejore de verdad necesitamos primero:

1. Entre 10 y 20 grabaciones completas como piloto, indicando qué versión corresponde a cada hoja. Ampliar después a 30–50 para evaluar diversidad.
2. Anotar los tiempos de cambios y revisar discrepancias sobre el audio. El PDF ayuda con la estructura, pero no aporta por sí solo etiquetas temporales fiables.
3. Separar canciones/artistas de entrenamiento y prueba antes de ajustar parámetros. Estas tres muestras ya se han usado para explorar y no deben convertirse en una prueba independiente.
4. Medir raíz, calidad, extensiones y bajo por separado, y sobre todo minutos de corrección manual ahorrados.
5. Adaptar un modelo existente con las correcciones reales, priorizando los errores frecuentes. No entrenar a ciegas con PDFs sin audio alineado ni con pseudoetiquetas del mismo detector como única verdad.

Para ampliar este ensayo sirven MP3, WAV, M4A o FLAC completos de las tres canciones, o de otras de la carpeta. Basta con proporcionar una carpeta local y, cuando haya varias versiones, identificar la grabación deseada.

## Reproducción y trazabilidad

Ver [instrucciones del experimento](../experiments/audio/README.md). El programa `experiments/audio/benchmark.py` acepta audios locales y un manifiesto con secuencias revisadas, ejecuta ambos modelos y guarda los alineamientos.

Evidencia local, excluida de Git: `pdf-inventory.json`, cuatro renders completos, `sources.json`, `model-checksums.json`, `references.json`, `evaluation/benchmark.json`, `spanish-evaluation/benchmark.json`, `variants.json`, `chordmini-comparison.json`, los resultados `.lab` de ambos modelos CL, las transcripciones y los intervalos originales. La carpeta es `artifacts/audio-benchmark/`. Las versiones completas del entorno están fijadas en `experiments/audio/requirements-neural.lock.txt`.

Para repetir el contraste CL, conservar el checkout externo en el commit indicado e instalar sus dependencias de evaluación adicionales (`mir_eval`, `matplotlib`, `seaborn`) en el entorno de investigación. Las versiones utilizadas están en `artifacts/audio-benchmark/research-environment.txt`. Ejecutar `experiments/audio/benchmark-chordmini.py --repo <checkout> --audio-dir <carpeta-PCM> --output <resultados>`. Este comparador no forma parte del analizador de la aplicación.
