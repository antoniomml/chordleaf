# Recorrido de los cambios móviles de Chordleaf 1.5.0

Abre [Chordleaf en español](https://chordleaf.com/es/) en Safari y recarga la página. Usa una canción de prueba para poder reconocer tus cambios. Si vienes de una URL de prueba, exporta allí una copia del espacio de trabajo e impórtala en el dominio público: cada dirección conserva sus propias canciones.

## 1. Editar la letra desde la hoja

En **Letra**, escribe este ejemplo y pulsa **Alinear**:

```text
[C]Una canción inventada para probar el teléfono
[G]Otra línea que quiero corregir
[Am]Un final para recordar
```

Toca la letra de un verso en la hoja. Aparece **Editar letra del verso**, con un campo de tamaño legible y los botones **Cancelar** y **Listo** encima del teclado. Prueba también un verso largo: el campo debe caber sin obligarte a desplazarlo horizontalmente.

Pulsa Retorno en el teclado: añade un salto de línea. Escribe unas palabras y pulsa **Cancelar**: recuperas el verso original completo. Vuelve a editarlo y pulsa **Listo**: se guarda tu corrección y se conservan los acordes. Recarga para comprobar el guardado.

## 2. Renombrar un acorde

En la hoja, selecciona un acorde y toca su nombre en los controles de alineación para editarlo. Aparece **Editar acorde** con los mismos botones. Cambia `C` por `Am` y pulsa **Listo**: cambia ese acorde, conservando la letra y los demás. Prueba **Cancelar** en una segunda edición.

## 3. Escribir con el teclado abierto

En **Configuración**, toca **Título** y **Artista**; en **Letra**, escribe varias líneas y comprueba que ves el cursor al final. Los campos deben quedar accesibles y el teclado no debe ampliar automáticamente la página.

Gira el teléfono a horizontal. Safari deja muy poco espacio si mantiene sus barras abiertas. Desliza hacia arriba sobre la parte superior de la aplicación para ocultarlas; puede requerir más de un gesto. Vuelve a tocar el campo: aparece una vista compacta con **Listo**. Ese botón cierra el teclado y conserva lo escrito. Si Safari no deja espacio utilizable, la aplicación cierra el teclado y muestra una indicación para ocultar las barras o girar el teléfono; conserva el borrador.

## 4. Importar una canción desde Archivos

Pulsa **+ → Importar audio**. En **Modelos y ajustes**, descarga **LV-Chordia** y empieza con **Whisper Base**. **Small** sigue disponible, con una descarga mayor y un procesamiento más lento. Turbo queda limitado en iPhone/iPad después de reproducir una recarga de Safari durante su descarga; Qwen no está disponible en Safari.

Elige un audio corto desde **Seleccionar archivo**. Mantén **Incluir la letra** y selecciona el idioma de la canción, por ejemplo **Español**. Pulsa **Obtener letra y acordes** y mantén Safari abierto hasta que termine. Debe aparecer una canción nueva con letra y acordes editables. La selección de idioma se recuerda al cerrar el diálogo y recargar.

Comprueba las palabras reconocidas, los saltos de verso y las separaciones entre estrofas. La organización usa pausas y duración de las frases; no corrige palabras mal reconocidas. Whisper puede seguir cometiendo errores con voz cantada. Si avisa de frases repetidas o de un resultado parcial, revisa el borrador y prueba el idioma explícito o un fragmento con la voz más clara.

## 5. Cancelación y diagnóstico

Durante otro análisis, pulsa **Cancelar análisis**: las canciones existentes deben conservarse y puedes volver a intentarlo. Si falla, abre **Diagnóstico del último intento** y descarga el informe antes de reintentar. Contiene etapas, tiempos y datos técnicos del intento; no incluye el audio ni la letra. Los modelos y el procesamiento de audio permanecen en el dispositivo.

El primer análisis requiere descargar los modelos. El funcionamiento físico comprobado corresponde a un iPhone 14 Pro con Safari/iOS 27; no es una garantía para todos los teléfonos, formatos o grabaciones. La [auditoría](iphone-audit.md) distingue las pruebas reales de las comprobaciones automáticas y recoge los límites pendientes.
