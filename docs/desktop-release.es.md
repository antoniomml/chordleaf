# Distribución de escritorio: audio local

El candidato de escritorio es **Chordleaf 1.2.1 para Mac con Apple Silicon**, con macOS 15 o posterior y 16 GB de memoria recomendados. Es una beta del importador: las letras, armonías y tiempos deben revisarse. Windows, Linux e Intel no están empaquetados en esta versión.

## Qué recibe el usuario

Un instalador DMG con Chordleaf, Electron y un Python portátil con las dependencias y los cinco detectores de LV-Chordia. No necesita Node, Python, Homebrew, una cuenta ni comandos. La primera visita a Importar audio ofrece un modal de preparación. El usuario elige y confirma la descarga de un modelo de letra: Qwen3-ASR 1.7B + ForcedAligner (~3,8 GB), o Whisper small (~0,5 GB). La instalación comprueba espacio libre; permite cancelar y reintentar aprovechando los archivos de caché completos. El progreso indica el estado de la operación, no un porcentaje inventado de bytes descargados. El modal no vuelve a abrirse automáticamente; se recupera desde **Modelos y ajustes**. La elección se guarda. Qwen se recomienda en Apple Silicon con al menos 16 GB de RAM; en los demás casos se recomienda Whisper. Es una heurística de memoria, no una prueba de velocidad en cada equipo. LV-Chordia aparece como incluido y es el único detector del importador.

El selector de idioma ofrece detección automática y diez idiomas: español, inglés, francés, alemán, italiano, portugués, japonés, coreano, chino y ruso. Los dos motores y el alineador admiten estos idiomas con los mismos pesos. La ampliación del selector no significa que se haya medido la precisión en canciones de los diez idiomas; el benchmark conserva sus muestras de español e inglés.

Tras descargar los modelos se puede analizar sin conexión. El audio entra por el selector de archivos y permanece en el equipo. La instalación inicial sólo recibe pesos desde Hugging Face; no acepta audio. Eliminar los modelos de letra no elimina canciones. Los modelos de acordes forman parte de la aplicación.

Las bibliotecas de la web y del escritorio están separadas. Para trasladar canciones, exportar una copia completa JSON desde una y abrirla en la otra. Las actualizaciones consisten en sustituir la aplicación; la biblioteca y los modelos permanecen en Application Support. No hay sincronización ni actualizaciones automáticas del motor.

## Arquitectura

La interfaz se sirve desde el origen estable `chordleaf://app`. Eso mantiene la misma biblioteca aunque cambie el puerto interno. Un servicio Node ligado a `127.0.0.1` recibe exclusivamente peticiones con una capacidad aleatoria de 256 bits que sólo conoce el proceso principal. El renderer no conoce el puerto ni el token y no tiene acceso a Node. El protocolo reenvía únicamente peticiones del origen de la aplicación; no se abre CORS desde la web pública.

El renderer usa sandbox, aislamiento de contexto, CSP y permisos denegados por defecto. El puente permite sólo consultar/instalar/cancelar/eliminar modelos conocidos y cancelar análisis. Comprueba el emisor y su frame. No admite comandos, rutas de archivos ni URLs arbitrarias. Las ventanas nuevas sólo pueden abrir enlaces HTTPS en el navegador externo.

La inferencia es un proceso Python separado con caché local y bloqueo de conexiones en las APIs de Python. Cancelar o cerrar la aplicación termina los trabajos activos. Esta protección de Python **no es un sandbox del sistema operativo para librerías nativas**. Las grabaciones temporales no se incorporan al proyecto ni al paquete.

El Python portátil se descarga de python-build-standalone con URL y SHA-256 fijados. Las dependencias están fijadas en `requirements-desktop.lock.txt`; las revisiones de los modelos, en `model-catalog.json`. La copia de archivos del paquete usa una lista explícita: no incluye el corpus privado, PDFs, canciones, cachés de investigación ni credenciales.

## Construir y comprobar

En un Mac Apple Silicon:

```sh
pnpm install --frozen-lockfile
node node_modules/electron/install.js
pnpm desktop:runtime
pnpm check
pnpm test:desktop
pnpm desktop:dist
```

El resultado aparece en `release-desktop/Chordleaf-1.2.1-mac-arm64.dmg`. El build local sin credenciales es un **candidato sin firma de distribución**, no una publicación validada por Gatekeeper. No se deben dar instrucciones para desactivar las protecciones del sistema.

La prueba `test:desktop` usa un perfil independiente, comprueba el Python incluido, acordes neuronales, aislamiento del renderer y persistencia tras reiniciar. Para verificar modelos reales y audio propio:

```sh
CHORDLEAF_TEST_PACKAGED=1 node scripts/desktop/test-models.mjs /ruta/a/una/cancion.mp3
```

Esta prueba usa `artifacts/desktop/model-test-profile`; puede descargar los modelos y no modifica la biblioteca real. El análisis JSON y las capturas quedan en `artifacts/desktop/`. Los artefactos de investigación y las grabaciones no se suben a GitHub.

En la prueba local, Guantanamera completó el análisis desde el paquete con 142 grupos de palabras y acordes de LV-Chordia. También se ejecutó el Python incluido bajo `sandbox-exec` con `(deny network*)` y ambos modelos completaron el análisis. Es una comprobación adicional de funcionamiento sin red; la aplicación distribuida conserva la protección de Python descrita arriba. La descarga nueva, cancelación y continuación se probaron en un perfil independiente.

### Integración con main · 30 de septiembre de 2026

El experimento se ha integrado en `main` y se publica con el tag `v1.2.0`, conservando la página de inicio, autoguardado, canciones recientes, notación latina y revisión consecutiva de acordes. El importador sigue siendo experimental y el instalador de escritorio continúa sujeto a la firma y notarización.

Antes del rediseño del importador se comprobaron 138 tests de Node, 16 de Python y las 23 suites de navegador, con Chromium y WebKit en las suites que comparan motores. Firefox no pudo arrancar en este equipo por un error de su perfil, pero las 23 suites y la prueba de compatibilidad con Chromium, Firefox y WebKit pasaron después en CI Linux. El Mac Apple Silicon de CI también construyó y probó el candidato. El test nativo analiza audio con el Python incluido, crea una canción y verifica su persistencia después de cerrar y abrir la aplicación. Un test adicional mata un proceso de inferencia activo y comprueba que su directorio de audio temporal desaparece antes de completar el cierre.

El paquete actualizado arrancó con un perfil vacío y volvió a analizar Guantanamera con Qwen y LV-Chordia: 142 grupos, reproducción real y cierre normal del proceso. El DMG pasó `hdiutil verify`. Estas comprobaciones verifican integración y funcionamiento; no constituyen una nueva medida de precisión musical. La puerta de publicación rechazó el candidato sin firma, como corresponde.

El rediseño de beta.2 añade una suite de preparación de modelos: recomendaciones para 8 y 32 GB, descarga explícita, cancelación, reintento, persistencia de la elección, ausencia de avisos repetidos y envío de un idioma nuevo al analizador. Pasaron las 24 suites de navegador, 138 tests de Node y 16 de Python, además de la importación nativa y persistencia. La revisión de accesibilidad del modal de preparación no detectó infracciones con axe. Se inspeccionaron las pantallas de preparación e importación en escritorio y móvil.

## Firma y publicación

Se necesita un certificado **Developer ID Application**, con su clave privada, y acceso de notarización de Apple. Un certificado **Apple Development** no sirve para esta distribución. Configurar las credenciales como secretos del repositorio, nunca en archivos versionados ni en un chat:

- `CSC_NAME`: nombre completo de la identidad Developer ID Application.
- `CSC_LINK`: certificado P12 codificado en base64, y `CSC_KEY_PASSWORD`: su contraseña.
- `APPLE_API_KEY_BASE64`: clave P8 de notarización codificada en base64.
- `APPLE_API_KEY_ID` y `APPLE_API_ISSUER`: identificadores de esa clave.

El workflow manual **Desktop candidate**, con `signed=true`, firma y solicita notarización. El fichero temporal P8 se elimina al finalizar. Con `signed=false` genera sólo un candidato. No publica releases automáticamente.

La modalidad firmada activa restricciones adicionales de Electron: deshabilita ejecución como Node, opciones Node desde variables y argumentos de inspección del proceso principal; verifica la integridad de ASAR y exige cargar la aplicación desde él. Antes de publicar, `node scripts/desktop/verify-release.mjs` exige que pasen `codesign --verify`, Gatekeeper y la validación del ticket de notarización, y genera `SHA256SUMS.txt`. Debe probarse también el binario firmado en un segundo Mac sin herramientas de desarrollo.

Una vez superadas las comprobaciones, publicar el DMG firmado y sus hashes en una release de GitHub. Configurar en Vercel `VITE_DESKTOP_DOWNLOAD_URL` con la URL exacta del DMG oficial y generar un preview. La web sólo muestra el enlace de descarga cuando esa variable contiene una URL del repositorio oficial. Mientras no exista una release verificada, indica que la versión está en preparación.

No se ha cambiado el despliegue público ni se ha activado procesamiento de audio en Vercel. La firma, notarización y prueba en otro Mac son requisitos pendientes antes de anunciar disponibilidad pública.

## Fuentes de implementación

- [Seguridad de Electron](https://www.electronjs.org/docs/latest/tutorial/security) y [fuses](https://www.electronjs.org/docs/latest/tutorial/fuses).
- [Distribución macOS con electron-builder v26](https://www.electron.build/v26/docs/mac/).
- [Python Build Standalone: ejecución y redistribución](https://gregoryszorc.com/docs/python-build-standalone/main/running.html).
- [Resultados medidos de los modelos](audio-model-comparison.es.md).

## Navegador y ejecución local

Actualmente, la app de escritorio incluye el motor. También se puede abrir la interfaz en un navegador iniciando el servicio local con `pnpm start:local-audio`; en ese caso los modelos se ejecutan en el Python de ese equipo, fuera del navegador. La web pública no ejecuta el motor ni recibe audio.

La ejecución dentro del navegador es técnicamente posible para modelos compatibles con WASM/WebGPU y formatos como ONNX. Este pipeline de LV-Chordia/Python y Qwen/MLX no está convertido ni validado para ese entorno; no basta con mostrar un botón de descarga. [Transformers.js](https://huggingface.co/docs/transformers.js/en/index) documenta la ejecución en navegador. Los idiomas de alineación se contrastaron con la [ficha oficial de Qwen3-ForcedAligner](https://huggingface.co/Qwen/Qwen3-ForcedAligner-0.6B).
