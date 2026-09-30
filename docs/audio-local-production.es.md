# Audio local: pruebas y distribución

Requisito: ningún servidor central procesa canciones. El audio, la letra y los acordes se calculan en el dispositivo de cada usuario.

La distribución de escritorio ya tiene un candidato empaquetado para Apple Silicon. Consultar [instalación, pruebas y requisitos de publicación](desktop-release.es.md). Las limitaciones descritas más abajo corresponden al punto de partida de la investigación.

## Lo que funciona ahora

La rama experimental ejecuta el detector neuronal y Whisper en Python, en el mismo ordenador que abre Chordleaf. El navegador entrega el archivo a `127.0.0.1`; ese tráfico no sale del equipo. Los archivos temporales se eliminan al terminar o cancelar. No se necesita una cuenta ni una API de pago.

`pnpm start:local-audio` permite usar la aplicación compilada con este motor. Fuerza la escucha en `127.0.0.1`, utiliza los modelos ya descargados y activa una protección de Python contra conexiones de red durante la inferencia. Si falta Whisper, falla sin descargarlo. El servicio público y `pnpm start` siguen sin activar el análisis de audio por defecto. La protección de Python no equivale a una sandbox del sistema operativo para bibliotecas nativas.

La instalación inicial de dependencias y modelos sí necesita Internet. Descargar un modelo no implica subir una canción. La prueba de navegador con _Imagine_ completa pasó por este modo: análisis real, reproducción de intervalos, exportación de tiempos y creación de una canción editable.

Instrucciones reproducibles: [README del experimento](../experiments/audio/README.md).

## Cómo distribuirlo

| Opción                                                | Dónde se procesa          | Situación                                                                                    |
| ----------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| Copia local actual, Node + Python                     | Ordenador de cada usuario | Funciona; instalación técnica, sin instalador                                                |
| Aplicación de escritorio con motor incluido           | Ordenador de cada usuario | Recomendación para conservar el motor probado; falta empaquetar y probar Windows/macOS/Linux |
| Web con modelos descargables y ejecución en navegador | Navegador de cada usuario | Arquitectura válida; falta portar y verificar el detector de acordes                         |

Para una primera distribución, una aplicación de escritorio evita pedir al usuario que instale Python. El instalador incluiría el motor y descargaría los pesos elegidos una vez. La interfaz puede seguir siendo la de Chordleaf. No hace falta alojar una GPU ni pagar por cada canción; el coste de cálculo y memoria recae en el equipo del usuario. El candidato de escritorio posterior ya incluye este motor; falta completar su firma y validación para publicación.

Si el requisito es entrar en chordleaf.com sin instalar nada, la opción es ejecutar todo dentro del navegador. [Transformers.js admite Whisper y caché local de modelos](https://huggingface.co/docs/transformers.js/pipelines), y [ONNX Runtime Web permite inferencia con WASM o WebGPU](https://onnxruntime.ai/docs/tutorials/web/). Son capacidades de esas herramientas, no una prueba de que nuestro detector ya funcione en ellas.

El trabajo pendiente para esa web es concreto:

1. Exportar las cinco redes a ONNX y comprobar equivalencia numérica con PyTorch.
2. Portar el preprocesamiento CQT y el decodificador temporal; convertir sólo las redes no reproduce todo el detector.
3. Ejecutar ambas ramas en un Web Worker, con cancelación y límites de memoria.
4. Descargar/cachear pesos y recursos, mostrar el tamaño antes de descargar y permitir eliminarlos.
5. Probar CPU/WASM, GPU compatible, móviles y equipos con poca memoria. [Los recursos WASM y modelos también deben distribuirse con la aplicación](https://onnxruntime.ai/docs/tutorials/web/deploy.html).
6. Comprobar sin conexión tanto resultados como ausencia de subidas; mantener los archivos originales fuera de sincronización automática.

Una web publicada no puede arrancar Python ni instalar modelos nativos en el equipo de una visita automáticamente. Tampoco conectaremos la web pública al servicio local abriendo CORS: el modo actual sirve interfaz y motor juntos desde el propio equipo.

## Precisión y entrenamiento

Los PDFs son arreglos útiles como referencia, pero no contienen tiempos y algunos omiten repeticiones. No conviene entrenar directamente con sus secuencias: aprenderíamos errores de alineación y diferencias entre arreglos. Primero hacen falta fragmentos anotados con tiempos, tonalidad real, calidad e inversión, y canciones separadas para ajuste y evaluación.

El modelo actual ya va más allá de mayor/menor. Aun así, su vocabulario no representa todos los `add9`, sextas o acordes alterados de las hojas. Cambiar la etiqueta de salida o pedir más acordes al decodificador no enseña al modelo a distinguirlos. Un entrenamiento propio necesitaría datos temporales fiables, ampliar las salidas correspondientes y medir las mejoras en canciones que no haya visto. Posteriormente se entrenó un modelo propio sobre GuitarSet, que quedó por debajo de LV-Chordia y no se desplegó; véase [la comparación](audio-model-comparison.es.md).
