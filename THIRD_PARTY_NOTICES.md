# Atribuciones de terceros

## Posiciones de guitarra

`src/data/guitar.json` deriva de [`tombatossals/chords-db`](https://github.com/tombatossals/chords-db), archivo `lib/guitar.json`, descargado el 20 de septiembre de 2026. Copyright © 2016 David Rubert. Licencia MIT, reproducida íntegramente en [`src/data/LICENSE.chords-db`](src/data/LICENSE.chords-db).

La transformación conserva los trastes de todas las posiciones, convirtiéndolos a trastes absolutos y normalizando raíces y bajos por clase de altura. No se incluyen nombres de dedos ni cejillas de la fuente original. El script de actualización está en `scripts/import-chords.mjs`. Las posiciones se ejecutan localmente; no se consulta ningún servicio en uso normal.

## Fuente del documento

Google Sans Code: licencia SIL Open Font License incluida en [`public/fonts/OFL-GoogleSansCode.txt`](public/fonts/OFL-GoogleSansCode.txt).

## Dependencias

Las versiones exactas están en `package-lock.json`. Cada paquete conserva su licencia. Este documento no sustituye esas licencias ni concede una licencia al código propio de Chordi.

La distribución web incluye también la licencia del catálogo en `public/licenses/chords-db.txt`, accesible desde el explorador de acordes.
