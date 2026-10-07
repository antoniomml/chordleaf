# Correcciones de lanzamiento · Chordleaf 1.6.0

Esta versión resuelve los hallazgos de la [auditoría del 5 de octubre](audit-2026-10-05.es.md). Conserva los formatos de canción, el almacenamiento existente y la edición local. La comprobación privada del firewall y los controles de gasto siguen sujetos al acceso del proveedor.

## Correcciones y aceptación

| Hallazgo                | Corrección                                                                                                                                                                                                     | Verificación                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 · Borrado accidental | «Eliminar canción guardada» abre una confirmación con el nombre, la advertencia y Cancelar enfocado. Cancelar y Escape conservan la copia; un fallo al guardar revierte el borrado.                            | Escritorio y móvil, ES/EN, teclado, recarga y fallo de cuota simulado. Se conserva el JSON previo exactamente al cancelar o fallar.                                    |
| A2 · Menú horizontal    | Altura limitada al viewport visual, desplazamiento interno y navegación de foco dentro del menú. Los avisos transitorios dejan de cubrir las acciones mientras está abierto.                                   | Descarga real de backup en 844×390 y ventanas bajas, con aviso activo; End alcanza la última opción.                                                                   |
| A3 · Contraste          | Descripciones del menú más claras y legibles, con tamaño de 12 px.                                                                                                                                             | Axe sobre el menú abierto en escritorio, teléfonos y horizontal, además de la confirmación de borrado.                                                                 |
| A4 · Privacidad         | Páginas públicas ES/EN y wiki explican procesamiento local, descargas solicitadas a Hugging Face, metadatos de petición, caché y eliminación explícita.                                                        | Build de ambas páginas y comprobación de metadatos. Desinstalar la PWA ya no se presenta como garantía de borrar datos.                                                |
| A5 · Tablet             | Las tablets táctiles verticales usan vistas por tarea y una hoja a ancho completo.                                                                                                                             | 768×1024 y 820×1180; rotación y regreso al editor conservan la canción.                                                                                                |
| A6 · Exportación larga  | Estado accesible persistente hasta terminar, exclusión de trabajos duplicados y restauración tras error.                                                                                                       | Preparación Word retrasada más de cuatro segundos, edición simultánea, snapshot inmutable, una sola descarga y recuperación tras fallo de PDF.                         |
| A7 · Motor de audio     | Tamaños reales del build para pesos y motor compartido, separados en la interfaz y coherentes con el progreso.                                                                                                 | Comparación con los archivos WASM/JS distribuidos; se distinguen tamaño almacenado y tráfico comprimido.                                                               |
| A8 · Mantenimiento      | Hashes de distribución Python y exigencia al instalar, Dependabot y auditoría de los tres manifiestos en CI. Controladores de Recientes, backup, estado offline y eventos de vista previa extraídos de app.js. | Las versiones Python fijadas se conservan; instalación congelada npm y regresiones del editor.                                                                         |
| A8 · Backup grande      | Partes independientes y restaurables cuando se superan 500 canciones o 10 MiB, con descarga explícita de cada archivo.                                                                                         | Biblioteca de 601 canciones en navegador, 611 canciones abiertas/cerradas y límites de bytes Unicode en tests; todas las partes se validan antes de ofrecer descargas. |
| A8 · Offline            | El worker activo confirma que todos los recursos del build actual están guardados antes de mostrar «Offline: listo».                                                                                           | Offline real, fallo controlado del registro, build incorrecto, origen ajeno y caché incompleta; editar sigue disponible.                                               |
| A8 · SEO y rendimiento  | Fechas de contenido explícitas en el sitemap, catálogo de acordes diferido y eventos delegados. Se mantienen la pintura y el contenido completos para conservar los contratos de edición y geometría.          | Metadatos, importación, edición sobre la hoja, alineación, impresión y exportación existentes.                                                                         |

La revisión actual de dependencias encontró además dos avisos que no figuraban en el resultado del 5 de octubre: **GHSA-68fv-2mgg-jv7q** y **GHSA-hp3w-g68c-fv3c**. Se actualizan Vite y Mammoth, se fija source-map-js 1.2.2 y se limita el override de argparse 2.0.1 a Mammoth 1.13.0. El CLI opcional de Mammoth se comprobó con un DOCX inventado; no se instala ni ejecuta sobre documentos de usuarios.

## Validación de la versión

- `pnpm install --frozen-lockfile`: correcto con pnpm 12.5.1 y Node 24.
- `pnpm check`: formato, **201 tests**, build de producción y metadatos correctos.
- `pnpm audit --audit-level=low`: **ningún aviso conocido** después de las actualizaciones.
- Auditoría Python: ningún aviso conocido en los locks de escritorio, neuronal y conversión para navegador; sus pins no cambian.
- **38/38 suites de navegador**, además de compatibilidad de persistencia y backup en Chromium/WebKit locales. La regresión de lanzamiento y axe se repiten tras el ajuste final del aviso sobre el menú. CI ejecuta además Firefox y constituye la comprobación del commit publicado.
- Protección de main verificada: PR obligatorio, checks `app` y `Vercel`, rama actualizada y prohibición de borrado/force-push. La versión se publica mediante ese procedimiento.
- Capturas revisadas de escritorio, teléfono, horizontal y tablet, incluidos exportación y borrado. Las evidencias locales están en `artifacts/launch-readiness`, ignorado por Git.

El primer CI detectó lecturas de texto vacío antes del pintado al usar `content-visibility: auto` en la hoja. Se retiró esa optimización y se repiten las regresiones de navegación móvil y alineación, conservando la delegación de eventos y el catálogo diferido. Los resultados de CI, el commit publicado y el tag se comprueban durante la publicación. La release debe apuntar al commit de main fusionado, y `/release.json` debe devolver exactamente esa versión y SHA; no se etiqueta un build anterior.

## Medición de rendimiento

Se repite `scripts/audit-web.mjs` contra el build local servido con gzip, tres muestras por dispositivo y service worker bloqueado. El móvil usa 390×844, CPU ×4, latencia de 150 ms y descarga de 1,6 Mbps. Son mediciones de laboratorio; no equivalen a datos de usuarios, Lighthouse o INP.

| Mediana                   | Escritorio    | Móvil limitado |
| ------------------------- | ------------- | -------------- |
| Interfaz lista            | 256 ms        | 2.577 ms       |
| FCP                       | 180 ms        | 872 ms         |
| LCP                       | 268 ms        | 2.468 ms       |
| CLS                       | 0,001         | 0,040          |
| Bloqueo inicial observado | 5 ms          | 620 ms         |
| Transferencia inicial     | 299.740 bytes | 299.740 bytes  |
| PDF de 44.000 caracteres  | 289 ms        | 1.702 ms       |
| Word de 44.000 caracteres | 547 ms        | 2.746 ms       |

Las seis muestras terminan edición, guardado y exportación sin errores JavaScript ni desbordamiento horizontal. El Word largo se completa en 2,71–3,54 s en este perfil. El bloqueo móvil varía entre 490 y 647 ms y sigue siendo un área de mejora para dispositivos lentos; no se atribuye una reducción general de arranque a estos cambios. La prueba artificial de exportación superior a cuatro segundos comprueba el indicador persistente incluso cuando la preparación tarda más que estas muestras. Evidencias locales: `artifacts/audit/web-measurements.json`.

## Límites que permanecen

- La integración permite consultar el proyecto de Vercel, pero devuelve **403 por alcance de cuenta** al consultar su firewall privado. No se afirma que falte el WAF ni se cambia una regla a ciegas. El límite documentado por proceso en la aplicación no equivale a un límite distribuido; la regla del proveedor y los límites/avisos de gasto deben verificarse con acceso de administración.
- Las APIs privadas de alertas de Dependabot y code scanning también devuelven 403 al token disponible. Las auditorías locales y el CI añadido sí comprueban los manifiestos; no se deduce de ello la configuración de esas alertas privadas.
- La emulación y WebKit no sustituyen comprobar un iPhone/iPad físico con teclado, barras de Safari, instalación PWA y grandes modelos. El audio continúa marcado como experimental y se conserva la restricción de Whisper Turbo en estos dispositivos.
- No se publica un instalador de macOS sin firma/notarización. Los cambios de distribución y hashes se comprueban en el workflow de candidato; esa disponibilidad permanece deshabilitada.
- Los avisos de seguridad dependen de las bases públicas del día de la revisión. No son una garantía de ausencia de vulnerabilidades desconocidas.
