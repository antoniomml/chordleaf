<div align="center">
  <img src="public/logo.svg" width="76" height="76" alt="Logo de Chordi">
  <h1>Chordi</h1>
  <p><strong>Tu canción. Tus acordes. Todo en su sitio.</strong></p>
  <p>Un espacio para preparar letras y acordes, encontrar cómo tocarlos<br>y llevarte una hoja lista para el próximo ensayo.</p>
  <p>
    <a href="https://github.com/antoniomml/Chordi/releases/tag/v0.0.1"><img src="https://img.shields.io/badge/versión-0.0.1-c9e79c?style=flat-square&labelColor=263426" alt="Versión inicial 0.0.1"></a>
    <a href="https://github.com/antoniomml/Chordi/actions/workflows/checks.yml"><img src="https://github.com/antoniomml/Chordi/actions/workflows/checks.yml/badge.svg" alt="Comprobaciones automáticas"></a>
  </p>
  <p><a href="#un-pequeño-estudio-para-tus-canciones">Qué puedes hacer</a> · <a href="docs/guide.md">Guía de uso</a> · <a href="CHANGELOG.md">Novedades</a> · <a href="CONTRIBUTING.md">Participar</a></p>
</div>

![Chordi: editor de letra y acordes a la izquierda y hoja de canción a la derecha](docs/images/workspace.png)

## Un pequeño estudio para tus canciones

Preparar una canción debería dejarte tiempo para tocarla. Chordi reúne la letra, los acordes y el documento final en una misma pantalla: escribe un verso, mueve un cambio de acorde hasta la sílaba adecuada y comprueba cómo quedará en la hoja.

Está pensado para quien canta, toca la guitarra, prepara un ensayo o quiere tener sus canciones ordenadas. No necesitas saber programar para usar la interfaz.

| Para cuando quieres…            | Chordi te ayuda a…                                                          |
| ------------------------------- | --------------------------------------------------------------------------- |
| **Preparar una canción**        | Empezar con una hoja en blanco o importar un archivo TXT, PDF o Word.       |
| **Clavar el cambio de acorde**  | Colocar cada acorde en una letra concreta, al inicio o centrado sobre ella. |
| **Escribir con espacio**        | Ajustar el ancho del editor o ampliarlo en una ventana grande.              |
| **Llevarla a tu voz**           | Transportar los acordes por semitonos y ajustar la cejilla.                 |
| **Encontrar una posición**      | Explorar 828 acordes y 3.283 posiciones de guitarra en afinación estándar.  |
| **Preparar la hoja para tocar** | Elegir tamaño de letra, márgenes y una o dos columnas con vista previa A4.  |
| **Compartir el resultado**      | Descargar un PDF, un documento Word editable o el texto con sus acordes.    |

## Del primer verso a la hoja de ensayo

**1. Dale nombre a tu canción.** Pulsa **Nueva canción** y empieza de cero o importa un archivo. Puedes tener varias canciones abiertas en pestañas.

**2. Escribe la letra y coloca los acordes.** Pon el acorde entre corchetes justo donde cambia la armonía:

```text
[G]Guardo la luz de [D]esta mañana
[C]en las cuerdas de mi [G]guitarra.
```

Los corchetes desaparecen de la hoja: solo verás los acordes encima de la letra. Para afinar un cambio dentro de una palabra, escribe `ca[G]sa`: el acorde queda anclado a la **s**.

**3. Hazla cómoda para tocar.** Prueba otra tonalidad, consulta una posición de guitarra y ajusta el documento. Cuando esté listo, pulsa **Exportar**.

[Descubre los controles y los pequeños detalles en la guía de uso →](docs/guide.md)

## Ese acorde también tiene sitio

Mayores, menores, séptimas, disminuidos, extensiones e inversiones: el explorador permite escribir un nombre como `Emaj7`, `Abm7b5` o `C/G`, recorrer sus posiciones e insertar el acorde en la canción.

<div align="center">
  <img src="docs/images/chord-library.png" width="430" alt="Explorador de Abm7b5 con diagrama de guitarra y controles para recorrer sus posiciones">
</div>

Las digitaciones proceden de un catálogo abierto incluido en la aplicación. Si un símbolo no tiene una posición disponible, Chordi te lo indica. La tonalidad sugerida es una orientación musical; tú decides cómo interpretar la canción.

## Tu música se queda contigo

Las canciones y los archivos que importas se procesan en tu navegador. No hay cuentas ni un servidor que reciba tus canciones. Los cambios se guardan automáticamente en ese navegador para que puedas seguir trabajando.

**Exporta una copia de lo que quieras conservar.** El guardado del navegador no sincroniza dispositivos y puede desaparecer si borras sus datos. Para seguir editando con precisión, guarda también el TXT de Chordi.

La interfaz carga su tipografía desde Google Fonts; el texto de tus canciones no se envía a ese servicio.

## Una primera versión para seguir creciendo

**0.0.1** es la primera versión etiquetada de Chordi. Ya puedes editar, transportar, consultar acordes e importar y exportar canciones. Aún hay detalles que conviene revisar al traer un documento: los PDF escaneados necesitan reconocimiento de texto previo y las maquetaciones complejas pueden requerir ajustes. Word también puede variar según el lector y las fuentes instaladas.

La transcripción de letra y acordes desde audio es una idea para más adelante; todavía no está disponible. Consulta [las novedades y limitaciones de esta versión](CHANGELOG.md).

## Forma parte de Chordi

Una idea de músico, una explicación que falta o un fallo al colocar un acorde también son buenas aportaciones. Puedes [contar un problema](https://github.com/antoniomml/Chordi/issues/new?template=bug_report.yml) o [proponer una mejora](https://github.com/antoniomml/Chordi/issues/new?template=feature_request.yml). Utiliza ejemplos breves inventados cuando compartas una canción.

Para ejecutar tu propia copia o trabajar en el proyecto, sigue [la guía de desarrollo con pnpm](docs/development.md). No hay una instancia pública anunciada todavía.

---

<div align="center">
  <p><strong>Hecho para tocar.</strong></p>
  <p><a href="docs/guide.md">Guía de uso</a> · <a href="docs/architecture.md">Arquitectura</a> · <a href="THIRD_PARTY_NOTICES.md">Créditos y atribuciones</a></p>
  <sub>La licencia del código propio está pendiente de elección antes de su publicación como código abierto. Los datos y las fuentes conservan sus respectivas licencias.</sub>
</div>
