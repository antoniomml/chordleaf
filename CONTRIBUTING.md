# Ayúdanos a hacer sitio a más canciones

[← Volver a Chordi](README.md)

No hace falta programar para aportar. Si un acorde no aparece, un documento se importa mal o un control resulta confuso, cuéntalo: los detalles del ensayo real ayudan a mejorar Chordi.

## Contar un problema

[Abre un informe](https://github.com/antoniomml/Chordi/issues/new?template=bug_report.yml) con lo que intentabas hacer, los pasos y el resultado esperado. Indica navegador y dispositivo. Si necesitas un ejemplo, utiliza dos o tres líneas inventadas y los nombres de los acordes afectados. No compartas documentos personales ni canciones ajenas completas.

## Proponer una idea

[Describe tu propuesta](https://github.com/antoniomml/Chordi/issues/new?template=feature_request.yml) desde el uso: qué te gustaría conseguir y en qué momento te ayudaría. Puedes aportar bocetos, mejoras de texto o sugerencias de accesibilidad.

## Trabajar en el código

Sigue la [guía de desarrollo con pnpm](docs/development.md) y consulta [la arquitectura](docs/architecture.md). Prepara una rama para un cambio concreto y explica el problema, el resultado y cómo lo has comprobado.

- Mantén las transformaciones musicales y la composición independientes de los controles de interfaz.
- Cubre los cambios de comportamiento con pruebas, especialmente anclas, importación y exportación.
- Ejecuta `pnpm format:check`, `pnpm test`, `pnpm build` y `pnpm test:e2e` con Vite activo.
- Usa exclusivamente pnpm y conserva su lockfile actualizado.
- Mantén las atribuciones de datos y fuentes; evita credenciales, documentos privados y resultados generados.

La publicación como código abierto y la licencia del código propio están pendientes de decisión del propietario. Las licencias de terceros se conservan en [las atribuciones](THIRD_PARTY_NOTICES.md).
