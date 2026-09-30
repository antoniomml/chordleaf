# Audio local: pruebas y distribución

Requisito: ningún servidor central procesa canciones. El audio, la letra y los acordes se calculan en el dispositivo de cada usuario.

La aplicación de escritorio conserva el motor Python/MLX local y tiene un candidato Apple Silicon; su firma y notarización siguen pendientes. La rama actual también ejecuta **Qwen 0,6B, el alineador y LV-Chordia dentro del navegador**, mediante WebGPU/WASM, sin subir canciones.

Consultar la [implementación web, pruebas y limitaciones](audio-browser-youtube.es.md) y los [requisitos del candidato de escritorio](desktop-release.es.md). El frontend web actual elige el Worker del navegador; el puente de escritorio conserva `/api/audio-import` y el motor nativo. `pnpm start:local-audio` mantiene el servicio experimental de Python, pero la interfaz web actual ya no lo selecciona automáticamente. Los resultados históricos de ese modo no deben atribuirse a la nueva implementación web.

La instalación inicial de modelos requiere Internet. La inferencia usa los modelos guardados en el dispositivo. No hace falta una cuenta ni una API de pago por canción. La publicación estática tampoco instala Python en el ordenador del visitante.

## Precisión y entrenamiento

Los PDFs son arreglos útiles como referencia, pero no contienen tiempos y algunos omiten repeticiones. No conviene entrenar directamente con sus secuencias: aprenderíamos errores de alineación y diferencias entre arreglos. Primero hacen falta fragmentos anotados con tiempos, tonalidad real, calidad e inversión, y canciones separadas para ajuste y evaluación.

El modelo actual ya va más allá de mayor/menor. Aun así, su vocabulario no representa todos los `add9`, sextas o acordes alterados de las hojas. Cambiar la etiqueta de salida o pedir más acordes al decodificador no enseña al modelo a distinguirlos. Un entrenamiento propio necesitaría datos temporales fiables, ampliar las salidas correspondientes y medir las mejoras en canciones que no haya visto. Posteriormente se entrenó un modelo propio sobre GuitarSet, que quedó por debajo de LV-Chordia y no se desplegó; véase [la comparación](audio-model-comparison.es.md).
