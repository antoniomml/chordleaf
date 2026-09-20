# Desarrollo

[← Volver a Chordi](../README.md) · [Arquitectura](architecture.md) · [Contribuir](../CONTRIBUTING.md)

## Preparar el entorno

Usamos **Node.js 22.13 o posterior** y **pnpm 12.5.1**, fijado en `package.json`. Instala pnpm siguiendo [su guía oficial](https://pnpm.io/installation). El único lockfile del proyecto es `pnpm-lock.yaml`.

```sh
git clone https://github.com/antoniomml/Chordi.git
cd Chordi
pnpm install --frozen-lockfile
pnpm dev
```

Abre la dirección que imprime Vite, normalmente `http://localhost:5173`. Mientras el repositorio sea privado, necesitas acceso para clonarlo.

## Comandos

| Comando                 | Resultado                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm dev`              | Servidor de desarrollo con recarga automática.                    |
| `pnpm build`            | Aplicación estática en `dist/`.                                   |
| `pnpm preview`          | Revisión local de la compilación.                                 |
| `pnpm test`             | Pruebas unitarias del modelo musical, composición e importación.  |
| `pnpm test:e2e`         | Pruebas de navegador; necesita un servidor activo.                |
| `pnpm format`           | Formatea código y documentación.                                  |
| `pnpm format:check`     | Comprueba el formato sin modificar archivos.                      |
| `pnpm docs:screenshots` | Regenera las capturas de documentación con la canción de ejemplo. |

Para comprobar la interfaz y las exportaciones:

```sh
pnpm exec playwright install chromium
pnpm dev
# En otra terminal:
pnpm test:e2e
```

Las pruebas usan Chromium y escriben archivos en `artifacts/`, excluido de Git. Puedes cambiar el servidor mediante `CHORDI_URL`. Las capturas públicas de `docs/images/` se crean en un contexto limpio, sin datos del navegador del usuario.

Para revisar un PDF de referencia que tengas localmente:

```sh
CHORDI_REFERENCE_PDF="/ruta/al/original.pdf" pnpm exec node tests/reference-pdf.mjs
```

No incluyas ese documento ni sus resultados en el repositorio.

## Dependencias y pnpm

Añade o actualiza dependencias mediante `pnpm add`, `pnpm add -D` o `pnpm update`. Incluye los cambios de `package.json` y `pnpm-lock.yaml` en el mismo commit. Evita generar lockfiles de otros gestores.

`pnpm-workspace.yaml` define la política de scripts de instalación: permite el de esbuild, necesario para el compilador de Vite, y desactiva el de core-js. Revisa cualquier nueva dependencia que requiera scripts antes de ampliar esa lista. La configuración sigue el [modelo `allowBuilds` de pnpm](https://github.com/pnpm/pnpm.io/blob/main/docs/migration.md).

CI instala la versión de pnpm declarada, usa `--frozen-lockfile` y ejecuta formato, pruebas unitarias, compilación y navegador en Linux. Las bibliotecas de PDF y Word se cargan bajo demanda; Vite puede avisar del tamaño de alguno de sus paquetes de exportación.

## Qué pertenece al repositorio

Incluye código, pruebas con ejemplos inventados, documentación, capturas de demostración, fuentes con licencia y el catálogo atribuido. `node_modules/`, `dist/`, informes, archivos personales y configuración local no deben versionarse. Las reglas están en `.gitignore`.

La aplicación anterior se eliminó del árbol actual. Los commits históricos conservan su contenido: eliminarlos requeriría una operación explícita de reescritura de historial.

## Versiones

La primera versión etiquetada es **`v0.0.1`**. Antes de preparar otra:

1. Actualiza `version` en `package.json` y añade sus cambios a `CHANGELOG.md`.
2. Ejecuta instalación congelada, formato, pruebas, compilación y pruebas de navegador.
3. Crea un commit y una etiqueta anotada `vX.Y.Z` que apunte a él.
4. Sube el commit y esa etiqueta; publica las notas de la versión en GitHub.

`private: true` en `package.json` evita publicar el paquete accidentalmente en un registro; no controla la visibilidad del repositorio GitHub. La licencia del código propio sigue pendiente de elección antes de anunciarlo como código abierto.
