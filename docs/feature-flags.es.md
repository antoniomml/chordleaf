# Activar y desactivar importaciones

En Vercel → **Chordleaf → Settings → Environment Variables**, estas dos variables públicas controlan las funciones:

| Variable                    | `true`                            | `false`                                                       |
| --------------------------- | --------------------------------- | ------------------------------------------------------------- |
| `VITE_FEATURE_AUDIO_IMPORT` | Importación experimental de audio | Oculta el acceso y no inicializa el importador ni sus modelos |
| `VITE_FEATURE_WEB_IMPORT`   | Importación desde webs            | Oculta el acceso y bloquea también `/api/import-web`          |

Están configuradas como `true` en **Production** y **Preview**. Para desactivar una función, cambia su valor a `false` y realiza un **Redeploy** del despliegue correspondiente. Son interruptores de compilación: no cambian una pestaña abierta instantáneamente. Las instalaciones PWA reciben el cambio con la actualización de la web; no se eliminan canciones ni modelos descargados.

Si una variable no existe, la función permanece activada. Sólo `true` activa una variable con valor; un valor incorrecto la desactiva. También funcionan en `.env.local` para desarrollo: reinicia Vite después de cambiarlas. No requieren un servicio de flags, llamadas adicionales, seguimiento de usuarios ni una suscripción.

La importación de webs conserva su protección previa: **`CHORDLEAF_WEB_IMPORT_ENABLED=true`** debe permitir la API en Vercel, además del flag de interfaz. Este control mantiene el límite de peticiones y las restricciones de fuentes; el flag público no elimina esas protecciones. La importación de audio en el navegador no utiliza esa API ni un servidor de inferencia: sigue procesando el archivo en el dispositivo.

Comprobaciones: `tests/feature-flags-browser.mjs` compila y abre tres combinaciones de flags, verifica accesos ocultos y bloqueados, el foco del menú y la edición de canciones; `tests/security.test.js` comprueba que el flag web desactivado devuelve 503 antes de descargar una página.
