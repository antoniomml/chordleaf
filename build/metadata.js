import { introHtml } from "../src/ui/intro-copy.js";

const CHANGELOG_URL =
  "https://github.com/antoniomml/chordleaf/blob/main/CHANGELOG.md";
const REPOSITORY_URL = "https://github.com/antoniomml/chordleaf";
const WORKSPACE_IMAGE = "/images/editor-workspace.png";

const copy = {
  en: {
    title: "Chordleaf — Lyrics & Guitar Chords Editor | Free PDF Sheets",
    description:
      "Write lyrics and chords, explore guitar shapes, transpose songs and export rehearsal sheets as PDF, Word or text. Free browser workspace in English and Spanish.",
    heading: "Chordleaf — Lyrics & Guitar Chords Editor",
    intro:
      "Write lyrics and chords, explore guitar positions, transpose songs and prepare rehearsal sheets.",
    privacy:
      "Import TXT, PDF or Word and export an editable song sheet. Your songs stay in your browser.",
    imageAlt:
      "Chordleaf social card: a song sheet with lyrics, guitar chord positions and the Chordleaf logo.",
    featureList: [
      "Write lyrics and place chords on any syllable",
      "Transpose chords and adjust the capo",
      "Explore guitar chord positions and diagrams",
      "Import TXT, PDF, Word and supported song links",
      "Export rehearsal sheets as PDF, Word or text",
      "Local-first workspace: songs stay in the browser",
    ],
  },
  es: {
    title: "Chordleaf — Editor de letras y acordes | Hojas PDF gratis",
    description:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y exporta hojas de ensayo en PDF, Word o texto. Gratis, en español e inglés.",
    heading: "Chordleaf — Editor de letras y acordes",
    intro:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y prepara hojas de ensayo.",
    privacy:
      "Importa TXT, PDF o Word y exporta una hoja editable. Tus canciones se quedan en tu navegador.",
    imageAlt:
      "Tarjeta social de Chordleaf: una hoja con letra, acordes de guitarra y el logotipo de Chordleaf.",
    featureList: [
      "Escribe letras y coloca acordes sobre cualquier sílaba",
      "Transporta acordes y ajusta la cejilla",
      "Explora posiciones y diagramas de acordes de guitarra",
      "Importa TXT, PDF, Word y enlaces de canciones compatibles",
      "Exporta hojas de ensayo en PDF, Word o texto",
      "Espacio local: las canciones se quedan en el navegador",
    ],
  },
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * Static content pages are declared in ES/EN pairs so every page can link to
 * its counterpart with reciprocal canonical and hreflang tags. Each page keeps
 * its own copy, screenshot caption, FAQ and internal links; nothing here may
 * reproduce third-party lyrics or promise features that do not exist.
 */
const pairEditor = {
  id: "editor",
  es: {
    slug: "editor-de-acordes",
    kicker: "Editor de acordes",
    title: "Editor de acordes online y gratis — Chordleaf",
    description:
      "Escribe la letra, coloca los acordes sobre cada sílaba y exporta la hoja en PDF, Word, texto o ChordPro. Sin cuenta y con tus canciones en el navegador.",
    h1: "Editor de acordes para escribir canciones con letra y música",
    lead: "Chordleaf es un editor de acordes que funciona en el navegador. Escribe o pega la letra, coloca cada acorde sobre la sílaba exacta y prepara una hoja de ensayo limpia para imprimir o exportar. No hay cuentas, anuncios ni instalaciones obligatorias.",
    imageAlt:
      "Captura del editor de Chordleaf con una hoja abierta, acordes sobre la letra y el panel de ajustes del documento.",
    imageCaption:
      "El editor con la hoja abierta: acordes anclados a la letra y ajustes del documento a la derecha.",
    sections: [
      {
        h: "Qué puedes hacer en Chordleaf",
        p: [
          "Chordleaf reúne en una sola pantalla lo que suele estar repartido entre un editor de texto, una web de acordes y una aplicación de diagramas. Escribes la letra, colocas los acordes encima y el editor recalcula la maquetación de la página mientras trabajas.",
          "Está pensado para guitarristas que preparan canciones para clase, ensayo o culto, y para cualquier persona que quiera una hoja legible sin pelearse con tabulaciones ni con espacios manuales. También sirve para transcribir a mano una canción que ya conoces y guardarla con un formato consistente.",
        ],
        list: [
          "Colocar acordes sobre cualquier sílaba, sin alinear columnas a mano.",
          "Consultar posiciones de guitarra y crear diagramas para la hoja.",
          "Transportar la canción por semitonos y ajustar la cejilla.",
          "Importar TXT, PDF, Word o pegar la letra desde otra web.",
          "Exportar PDF A4, Word, texto o ChordPro, además del proyecto editable.",
        ],
      },
      {
        h: "Cómo se colocan los acordes sobre la letra",
        p: [
          "El flujo es directo: escribe o pega la letra, sitúa el cursor en el punto exacto y elige un acorde del panel de acordes. El editor guarda cada acorde anclado a esa posición en lugar de una fila de texto con espacios, así que puedes seguir editando la letra sin descolocar lo que ya habías puesto.",
          "Si un acorde importado no está en el vocabulario del editor, Chordleaf lo conserva y lo marca para revisarlo. Desde el panel puedes sustituirlo por la posición correcta o añadirlo a tus acordes personalizados; nada se borra sin que lo decidas tú.",
          "La colocación funciona igual con teclado o con pantalla táctil. En el móvil, el editor cambia entre la letra, los controles musicales y la vista previa para que cada tarea tenga espacio suficiente.",
        ],
      },
      {
        h: "Diagramas, cejilla y tonalidad",
        p: [
          "El diccionario incluye posiciones de guitarra y un mástil interactivo para dibujar acordes propios, incluso los que no aparecen en los diccionarios habituales. Los diagramas se colocan como bloques en la hoja y se distribuyen en columnas sin deformarse.",
          "La tonalidad probable se estima a partir de los acordes que has escrito. Con el transporte y la cejilla adaptas la canción a tu voz sin tocar la letra, y el aviso de tonalidad te dice en qué tono suena realmente lo que tocas cuando usas cejilla.",
        ],
      },
      {
        h: "De la pantalla al papel",
        p: [
          "La vista previa usa una página A4 real con márgenes, tamaño de letra y una o dos columnas. Puedes cambiar esos valores y comprobar el resultado antes de exportar, sin sorpresas al imprimir.",
          "El menú de exportación genera un PDF listo para imprimir, un documento Word, texto plano y ChordPro (.cho), además del proyecto .chordleaf.json para seguir editando otro día. La impresión directa del navegador comparte el mismo diseño: fondo blanco, sin la interfaz del editor y con las páginas cortadas donde corresponde.",
        ],
      },
      {
        h: "Tus canciones se quedan contigo",
        p: [
          "Chordleaf no pide cuenta ni sube tus canciones a un servidor. El trabajo se guarda en el almacenamiento local de tu navegador, en este dispositivo.",
          "Puedes exportar el proyecto .chordleaf.json como copia de seguridad y volver a abrirlo cuando quieras. Si borras los datos del navegador, esas canciones locales desaparecen, así que conviene guardar el proyecto o el PDF si quieres conservarlas.",
          "Al ser una aplicación web instalable, después de la primera visita puedes abrir el editor sin conexión y seguir trabajando con lo que tengas guardado en el dispositivo.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Chordleaf es gratis?",
        a: "Sí. Es un proyecto de código abierto con licencia MIT, sin anuncios ni planes de pago. Puedes usarlo y consultar su código en GitHub.",
      },
      {
        q: "¿Necesito una cuenta o instalar algo?",
        a: "No. Se abre en el navegador y funciona sin registro. Si quieres, puedes instalarlo como aplicación desde el propio navegador para tenerlo a mano y trabajar sin conexión.",
      },
      {
        q: "¿Puedo importar canciones que ya tengo?",
        a: "Sí: pega el texto, importa un TXT, PDF o DOCX, o usa un enlace compatible de Cifra Club, LaCuerda o Ultimate Guitar. La guía de importación explica los tres caminos y qué hacer cuando una web bloquea la descarga.",
      },
      {
        q: "¿Dónde se guardan mis canciones?",
        a: "En el almacenamiento local de tu navegador. No se sincronizan entre dispositivos y nadie más las ve desde Chordleaf. Exporta el proyecto para tener una copia.",
      },
    ],
    related: [
      {
        href: "/es/hoja-de-acordes-para-imprimir/",
        label: "Preparar una hoja A4 para el atril",
      },
      {
        href: "/es/transportar-acordes/",
        label: "Transportar acordes y usar la cejilla",
      },
      {
        href: "/es/importar-cifra-club/",
        label: "Importar una canción desde Cifra Club",
      },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "chord-sheet-maker",
    kicker: "Chord sheet maker",
    title: "Chord sheet maker for lyrics & guitar — Chordleaf",
    description:
      "Build a clear chord sheet in your browser: write lyrics, place chords on the right syllable, add diagrams and export PDF, Word or text. Free and local-first.",
    h1: "A chord sheet maker that keeps lyrics and chords aligned",
    lead: "Chordleaf turns a plain lyric text into a rehearsal-ready chord sheet. Write or paste the words, drop guitar chords on the exact syllable, add diagrams and export a clean A4 PDF. There is no account and nothing to install.",
    imageAlt:
      "Screenshot of the Chordleaf editor with a song sheet open, chords over the lyrics and document settings on the right.",
    imageCaption:
      "The editor with a song open: chords anchored to the lyrics and document settings on the right.",
    sections: [
      {
        h: "What a chord sheet maker gives you",
        p: [
          "A chord sheet maker keeps two things together that are easy to lose in a plain text file: the words and the chords that belong above them. Chordleaf stores every chord as an anchor on a syllable, so editing a line never drags the chord grid out of place.",
          "It is aimed at guitarists preparing songs for a lesson, a rehearsal or a worship set, and at anyone who wants a readable sheet without counting spaces by hand. You can start from a blank page, paste an existing text or import a file you already have.",
        ],
        list: [
          "Place a chord on any syllable without manual alignment.",
          "Look up guitar shapes and build diagrams for the sheet.",
          "Transpose by semitones and set a capo.",
          "Import TXT, PDF, Word or supported song links.",
          "Export A4 PDF, Word, plain text or ChordPro, plus an editable project.",
        ],
      },
      {
        h: "Placing chords on the lyrics",
        p: [
          "Write or paste the lyrics, put the cursor where the chord changes and pick a chord from the panel. The editor records the anchor at that position, so you can rewrite a verse later and the chords stay with the right syllables.",
          "When an imported chord is not recognised, Chordleaf keeps it and flags it for review instead of silently deleting it. You can replace it from the chord panel or save a custom shape; the final call is always yours.",
          "The same workflow works with a mouse, a keyboard or a touch screen. On a phone the workspace swaps between lyrics, music controls and the sheet preview so each task has room to breathe.",
        ],
      },
      {
        h: "Chord diagrams, capo and key",
        p: [
          "The chord dictionary holds guitar shapes and an interactive fretboard for drawing your own, including voicings that common dictionaries skip. Diagrams can be placed as blocks on the sheet and are distributed in columns without stretching.",
          "The likely key is estimated from the chords you wrote. Transposition and the capo let you fit the song to your voice without touching the lyrics, and the key note tells you what actually sounds when a capo is on the neck.",
        ],
      },
      {
        h: "From the screen to the music stand",
        p: [
          "The preview uses a real A4 page with margins, font size and one or two columns. Adjust those values and check the result before exporting; what you see in the preview is what comes out.",
          "The export menu produces a print-ready PDF, a Word document, plain text and ChordPro (.cho), in addition to the .chordleaf.json project for later edits. Printing from the browser uses the same layout: white background, no editor chrome and page breaks where they belong.",
        ],
      },
      {
        h: "Free, open source and local-first",
        p: [
          "Chordleaf does not ask for an account and does not upload your songs. Work is stored in your browser's local storage on this device.",
          "Export the .chordleaf.json project as a backup and reopen it whenever you want. Clearing the browser data removes those local songs, so save the project or the PDF when the arrangement matters.",
          "Installed as a web app, the editor opens offline after the first visit and keeps working with whatever is already stored on the device.",
        ],
      },
    ],
    faq: [
      {
        q: "Is Chordleaf free?",
        a: "Yes. It is an open source project under the MIT licence, with no ads and no paid tier. You can read the code on GitHub.",
      },
      {
        q: "Do I need an account or an installation?",
        a: "No. It runs in the browser without registration. You can install it as a web app if you want a shortcut and offline access.",
      },
      {
        q: "Can I bring songs I already have?",
        a: "Yes: paste the text, import a TXT, PDF or DOCX file, or use a supported link from Cifra Club, LaCuerda or Ultimate Guitar. The import guide explains all three routes and the manual fallback.",
      },
      {
        q: "Where are my songs stored?",
        a: "In your browser's local storage. They are not synchronised across devices and Chordleaf does not show them to anyone else. Export the project to keep a backup.",
      },
    ],
    related: [
      {
        href: "/en/printable-chord-sheets/",
        label: "Prepare an A4 sheet for the stand",
      },
      {
        href: "/en/transpose-chords/",
        label: "Transpose chords and use a capo",
      },
      {
        href: "/en/import-ultimate-guitar/",
        label: "Import a song from Ultimate Guitar",
      },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const pairPrint = {
  id: "print",
  es: {
    slug: "hoja-de-acordes-para-imprimir",
    kicker: "Impresión y PDF",
    title: "Hoja de acordes para imprimir en A4 — Chordleaf",
    description:
      "Prepara una hoja de acordes clara para el ensayo: ajusta márgenes, tamaño, columnas y saltos, revisa los diagramas y exporta el PDF A4 o imprime desde el navegador.",
    h1: "Hoja de acordes para imprimir: del editor al atril",
    lead: "Una hoja de acordes se entiende o no se entiende en el atril. Chordleaf maqueta la canción en una página A4 real, permite ajustar márgenes, tamaño de letra y columnas, y exporta un PDF con fondo blanco y sin la interfaz del editor.",
    imageAlt:
      "Captura del editor de Chordleaf con la hoja A4 de una canción y el panel de formato de página.",
    imageCaption:
      "La vista previa muestra la misma página A4 que se exporta o se envía a la impresora.",
    sections: [
      {
        h: "La página A4 como referencia",
        p: [
          "El editor trabaja sobre una página A4 de verdad, con sus medidas en puntos, así que la vista previa no es una aproximación: es el mismo documento que se exporta. Puedes acercar o alejar el zoom y, en el móvil, ajustar el ancho para revisar la hoja antes de imprimir.",
          "Cada canción guarda su propio formato de página. Puedes tener una balada a una columna con letra grande y un tema denso a dos columnas con letra más pequeña sin reconfigurar nada cada vez.",
        ],
      },
      {
        h: "Ajustes que cambian la lectura",
        p: [
          "El tamaño de letra, los márgenes y el número de columnas son los tres controles que más afectan a la legibilidad. Empieza por los valores por defecto, imprime una página de prueba y ajusta desde ahí: casi siempre basta con un punto más de letra o un margen algo menor.",
        ],
        list: [
          "Tamaño: entre 7 y 20 pt para adaptar la letra al papel.",
          "Márgenes: de 5 a 35 mm, útiles cuando la canción no cabe en una página.",
          "Columnas: una columna se lee mejor de pie; dos columnas aprovechan el papel en canciones largas.",
        ],
      },
      {
        h: "Colocar los diagramas en el papel",
        p: [
          "Los bloques de diagramas son elementos de la página, no imágenes sueltas. Puedes moverlos con el manejador, cambiar su ancho, alto y número de columnas, y el texto fluye alrededor del bloque para no quedar tapado.",
          "Antes de exportar, el editor comprueba que ningún bloque tapa la cabecera ni se sale del pie de página y avisa si hay que recolocarlo. Es más rápido mover un bloque que descubrir el problema en el papel.",
        ],
      },
      {
        h: "De la vista previa al papel",
        p: [
          "El menú Exportar genera un PDF A4 que puedes guardar o enviar a la impresora. La opción Imprimir abre el diálogo del navegador con el mismo diseño, fondo blanco y sin barras de herramientas.",
          "El PDF y el Word incluyen el título y el artista en la cabecera, y opcionalmente el pie «chordleaf.com», que puedes desactivar en Más opciones. Revisa siempre la primera página antes de imprimir el resto.",
        ],
        list: [
          "¿Cabe la canción en las páginas que esperabas?",
          "¿Los acordes quedan encima de la sílaba correcta?",
          "¿La letra se lee a la distancia del atril?",
          "¿Los diagramas están completos y sin tapar la letra?",
        ],
      },
      {
        h: "Consejos para el atril",
        p: [
          "Una hoja de uso real suele imprimirse en blanco y negro. Los diagramas y la letra funcionan bien sin color porque el contraste está en la tipografía, no en el fondo.",
          "Si el tema es largo, dos columnas y un tamaño moderado suelen caber en una cara. Si vas a repartir la hoja entre varias personas, el PDF es la versión más fiel. Guarda el proyecto .chordleaf.json si quieres volver a editar la maquetación más adelante.",
        ],
      },
    ],
    faq: [
      {
        q: "¿La impresión ocupa toda la página A4?",
        a: "Sí. El diseño usa A4 con márgenes configurables; la opción Imprimir del menú Exportar oculta la interfaz y pinta la hoja en blanco.",
      },
      {
        q: "¿Puedo evitar que una canción se parta en dos páginas?",
        a: "Reduce el tamaño de letra, ajusta los márgenes o usa dos columnas. El editor muestra dónde quedan los cortes para que puedas moverlos antes de imprimir.",
      },
      {
        q: "¿Qué diferencia hay entre PDF e Imprimir?",
        a: "El PDF es un archivo A4 que puedes guardar o compartir; Imprimir usa el mismo diseño a través del diálogo del navegador.",
      },
      {
        q: "¿Puedo quitar el pie «chordleaf.com»?",
        a: "Sí. Está activado por defecto y se desactiva desde Más opciones en los ajustes del documento; el cambio se aplica a la vista previa, al PDF y al Word.",
      },
    ],
    related: [
      {
        href: "/es/editor-de-acordes/",
        label: "Volver al editor de acordes",
      },
      {
        href: "/es/transportar-acordes/",
        label: "Transportar la canción antes de imprimir",
      },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "printable-chord-sheets",
    kicker: "Printing and PDF",
    title: "Printable chord sheets in A4 — Chordleaf",
    description:
      "Make a readable chord sheet for rehearsal: set font size, margins and columns, place chord diagrams, then export an A4 PDF or print from the browser.",
    h1: "Printable chord sheets that read well on a music stand",
    lead: "A chord sheet works when it can be read at a glance. Chordleaf lays the song out on a real A4 page, lets you tune the font size, margins and columns, and exports a white-background PDF without the editor interface.",
    imageAlt:
      "Screenshot of the Chordleaf editor showing an A4 song sheet and the page format settings.",
    imageCaption:
      "The preview shows the same A4 page that is exported or sent to the printer.",
    sections: [
      {
        h: "A real A4 page, not an approximation",
        p: [
          "The editor works on an actual A4 page measured in points, so the preview is the document that gets exported. Zoom in and out to inspect details, or fit the width on a phone while you check the layout.",
          "Each song keeps its own page format. A ballad with large type and a single column can live next to a dense song in two columns without reconfiguring the editor every time.",
        ],
      },
      {
        h: "Settings that change how the sheet reads",
        p: [
          "Font size, margins and column count have the biggest effect on legibility. Start with the defaults, print one test page and adjust from there; a slightly larger font or a smaller margin usually solves a tight song.",
        ],
        list: [
          "Size: 7 to 20 pt to fit the lyrics on paper.",
          "Margins: 5 to 35 mm when a song needs more room.",
          "Columns: one reads well standing up; two make better use of the page for long songs.",
        ],
      },
      {
        h: "Placing chord diagrams on the page",
        p: [
          "Diagram blocks are page objects rather than loose images. Drag a block with its handle, change its width, height and column count, and the lyrics flow around it instead of disappearing underneath.",
          "Before exporting, the editor checks that no block covers the header or runs past the footer and warns you when one needs to move. Fixing it on screen beats discovering it on paper.",
        ],
      },
      {
        h: "From the preview to paper",
        p: [
          "The Export menu produces an A4 PDF you can save or send to a printer. Print opens the browser dialog with the same layout, a white background and no toolbars.",
          "The PDF and Word files carry the title and artist in the header, plus the optional chordleaf.com footer that you can switch off under More options. Check the first page before printing the rest.",
        ],
        list: [
          "Does the song fit on the pages you expected?",
          "Are the chords sitting over the right syllables?",
          "Can you read the lyrics from where you stand?",
          "Are all diagrams present and clear of the text?",
        ],
      },
      {
        h: "Notes for real music stands",
        p: [
          "Most rehearsal sheets end up printed in black and white, and that is fine: contrast comes from the type and the chord placement, not from colour.",
          "For a long song, two columns at a moderate size often fit on one side. When you share the sheet with a band or a class, the PDF is the faithful version. Keep the .chordleaf.json project if you may want to adjust the layout later.",
        ],
      },
    ],
    faq: [
      {
        q: "Does printing use the full A4 page?",
        a: "Yes. The layout targets A4 with configurable margins, and the Print entry in the Export menu hides the interface and paints the sheet white.",
      },
      {
        q: "How do I keep a song from splitting across pages?",
        a: "Reduce the font size, adjust the margins or switch to two columns. The editor shows where the breaks land so you can move them before printing.",
      },
      {
        q: "What is the difference between PDF and Print?",
        a: "The PDF is an A4 file you can store or share; Print sends the same design through the browser's print dialog.",
      },
      {
        q: "Can I remove the chordleaf.com footer?",
        a: "Yes. It is on by default and can be switched off under More options in the document settings; the preview, PDF and Word file all follow that choice.",
      },
    ],
    related: [
      {
        href: "/en/chord-sheet-maker/",
        label: "Back to the chord sheet maker",
      },
      {
        href: "/en/transpose-chords/",
        label: "Transpose the song before printing",
      },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const pairTranspose = {
  id: "transpose",
  es: {
    slug: "transportar-acordes",
    kicker: "Transporte y cejilla",
    title: "Transportar acordes online y gratis — Chordleaf",
    description:
      "Sube o baja la canción por semitonos, ajusta la cejilla y consulta la tonalidad probable sin cambiar la letra. Gratis y directamente en el navegador.",
    h1: "Transportar acordes sin reescribir la letra",
    lead: "Transportar una canción no debería obligarte a corregir cada acorde a mano. En Chordleaf subes o bajas semitonos con un clic, ajustas la cejilla y ves la tonalidad probable mientras la letra permanece intacta.",
    imageAlt:
      "Captura del editor de Chordleaf con los controles de semitonos, cejilla y tonalidad probable.",
    imageCaption:
      "Los controles de semitonos, cejilla y tonalidad probable, junto a la letra sin tocar.",
    sections: [
      {
        h: "Qué significa transportar",
        p: [
          "Transportar es subir o bajar toda la armonía la misma distancia para que la canción encaje mejor en una voz o en un instrumento. Cada acorde cambia de nombre, pero las relaciones entre ellos se mantienen: la canción sigue sonando igual, más aguda o más grave.",
          "En Chordleaf el transporte se aplica a los acordes que el editor reconoce. Los acordes dudosos se conservan marcados para que los revises, en lugar de desaparecer sin avisar.",
        ],
      },
      {
        h: "Semitonos, tonos y tonalidad",
        p: [
          "Un semitono es la distancia más pequeña entre dos notas; doce semitonos forman una octava. Subir dos semitonos equivale a subir un tono. El contador del editor empieza en 0 y cada pulsación mueve la canción un semitono.",
          "La tonalidad probable se estima a partir de los acordes escritos y se actualiza al transportar. Ese dato ayuda a decidir si el resultado es cómodo para cantar o conviene probar otra distancia. Por ejemplo, al subir dos semitonos una progresión en Do mayor, los acordes pasan a Re mayor y la tonalidad probable cambia con ellos.",
          "Si practicas con la canción original «Al otro lado» de la documentación, verás cómo se mueven los grados de la escala al cambiar los semitonos: la letra no se toca y los acordes se recalculan solos.",
        ],
      },
      {
        h: "Cejilla: cuándo ayuda",
        p: [
          "La cejilla sube el sonido real sin cambiar las posiciones que tocas. Es la opción práctica cuando quieres seguir usando formas abiertas: pones cejilla en el traste 2 y tocas como si estuvieras en el tono original.",
          "La opción «Mantener el tono al mover la cejilla» compensa los acordes escritos para que el resultado suene igual mientras mueves la cejilla. Si la desactivas, ambos controles actúan por separado y puedes combinarlos a propósito.",
        ],
      },
      {
        h: "Cómo transportar en la práctica",
        p: [
          "Elige la distancia con los botones − y +, y usa el símbolo ↺ para volver al tono original cuando te pierdas. La letra, los saltos de página y los diagramas no se ven afectados por el transporte. En el móvil, los controles de semitonos y cejilla viven en la pestaña de música, junto a la tonalidad probable.",
        ],
        list: [
          "Comprueba el indicador antes de tocar: 0 es el tono original.",
          "Revisa los acordes marcados y resuélvelos antes de imprimir.",
          "Prueba el resultado con la cejilla real sobre el mástil.",
          "Si la tonalidad queda con demasiadas alteraciones, prueba otra distancia.",
        ],
      },
      {
        h: "Errores frecuentes al transportar",
        p: [
          "El más habitual es transportar dos veces la misma canción: si el indicador no está en 0, ya has movido la armonía. También conviene recordar que el tono escrito y el tono que suena no coinciden cuando hay cejilla, y que un acorde extraño sin revisar puede arruinar una hoja por lo demás correcta.",
          "Antes de exportar, revisa la tonalidad, los acordes marcados y la cejilla. El botón de deshacer devuelve todo al tono original en cualquier momento, así que puedes experimentar sin miedo. Si preparas la hoja para otra persona, anota en la cabecera el tono y la cejilla que has usado para que no tenga que adivinarlo.",
        ],
      },
    ],
    faq: [
      {
        q: "¿El transporte cambia la letra?",
        a: "No. Solo cambian los nombres de los acordes; la letra y su posición se mantienen exactamente igual.",
      },
      {
        q: "¿Cuántos semitonos puedo subir o bajar?",
        a: "Puedes mover la canción por semitonos arriba o abajo y volver a 0 cuando quieras. Para ajustar a una voz suele bastar con uno o dos semitonos.",
      },
      {
        q: "¿Qué pasa con los acordes que el editor no reconoce?",
        a: "Se conservan y se marcan para revisarlos. Puedes sustituirlos desde el panel de acordes o dejarlos tal cual si son correctos.",
      },
      {
        q: "¿Transportar y usar cejilla es lo mismo?",
        a: "No exactamente. Transportar cambia los acordes escritos; la cejilla cambia el sonido real sin cambiar las posiciones. Con la opción de mantener el tono puedes combinar ambos controles.",
      },
    ],
    related: [
      {
        href: "/es/editor-de-acordes/",
        label: "Volver al editor de acordes",
      },
      {
        href: "/es/hoja-de-acordes-para-imprimir/",
        label: "Imprimir la hoja ya transportada",
      },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "transpose-chords",
    kicker: "Transposing and capo",
    title: "Transpose chords online — Chordleaf",
    description:
      "Shift a song up or down by semitones, set a capo and check the likely key without rewriting the lyrics. Free, in your browser and with no account.",
    h1: "Transpose chords without rewriting the lyrics",
    lead: "Transposing a song should not mean correcting every chord by hand. Chordleaf moves the whole progression by semitones, sets a capo and shows the likely key while the lyrics stay exactly where they were.",
    imageAlt:
      "Screenshot of the Chordleaf editor with the semitone, capo and likely key controls.",
    imageCaption:
      "Semitone, capo and likely key controls sit next to the untouched lyrics.",
    sections: [
      {
        h: "What transposing actually does",
        p: [
          "Transposing moves the whole harmony by the same distance so a song fits a voice or an instrument better. Every chord changes name while the relationships between them stay the same: the song sounds identical, just higher or lower.",
          "Chordleaf transposes the chords it recognises. Anything doubtful is kept and flagged for review instead of vanishing silently.",
        ],
      },
      {
        h: "Semitones, tones and keys",
        p: [
          "A semitone is the smallest step between two notes, and twelve of them make an octave. Two semitones equal one tone. The counter starts at 0 and each press moves the song by one semitone.",
          "The likely key is estimated from the written chords and updates as you transpose, which helps you judge whether the result sits comfortably in your range. Move a progression in C major up two semitones, for instance, and the chords become D major while the key estimate follows along.",
          "The original demo song in the Chordleaf documentation, «Al otro lado», is a handy way to watch the scale degrees move as you change the offset: the lyrics stay put and the chords are recalculated for you.",
        ],
      },
      {
        h: "When a capo helps",
        p: [
          "A capo raises the sounding pitch without changing the shapes you play. It is the practical choice when you want to keep open chords: place it on fret 2 and play as if you were in the original key.",
          "The option to keep the key while moving the capo compensates the written chords so the result keeps sounding the same. Turn it off and both controls act independently, which you can also use on purpose.",
        ],
      },
      {
        h: "Transposing step by step",
        p: [
          "Choose the distance with the − and + buttons, and use the ↺ symbol to return to the original key whenever you lose track. Lyrics, page breaks and diagrams are untouched by transposition. On a phone, the semitone and capo controls sit in the music tab next to the likely key.",
        ],
        list: [
          "Check the counter before you start: 0 is the original key.",
          "Review the flagged chords and resolve them before printing.",
          "Try the result with the real capo on the neck.",
          "If the key ends up full of accidentals, try another offset.",
        ],
      },
      {
        h: "Common mistakes",
        p: [
          "The usual one is transposing twice: if the counter is not at 0, the harmony has already moved. It also helps to remember that the written key and the sounding key differ under a capo, and that one unreviewed chord can spoil an otherwise perfect sheet.",
          "Before exporting, check the key, the flagged chords and the capo. The undo button restores the original key at any time, so experimenting costs nothing. If the sheet is for someone else, write the key and capo in the header so they do not have to guess.",
        ],
      },
    ],
    faq: [
      {
        q: "Does transposing change the lyrics?",
        a: "No. Only the chord names change; the lyrics and their positions stay exactly the same.",
      },
      {
        q: "How far can I transpose?",
        a: "You can move the song by semitones up or down and return to 0 whenever you like. One or two semitones are usually enough to fit a voice.",
      },
      {
        q: "What happens to chords the editor does not recognise?",
        a: "They are kept and flagged for review. You can replace them from the chord panel or leave them if they are correct.",
      },
      {
        q: "Is transposing the same as using a capo?",
        a: "Not quite. Transposing changes the written chords; a capo changes the sounding pitch while you keep playing the same shapes. The keep-the-key option lets you combine both.",
      },
    ],
    related: [
      {
        href: "/en/chord-sheet-maker/",
        label: "Back to the chord sheet maker",
      },
      {
        href: "/en/printable-chord-sheets/",
        label: "Print the transposed sheet",
      },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const pairImport = {
  id: "import",
  es: {
    slug: "importar-cifra-club",
    kicker: "Importación web",
    title: "Importar canciones de Cifra Club — Chordleaf",
    description:
      "Trae una página pública de Cifra Club al editor, revisa la alineación de los acordes y exporta tu hoja. También puedes pegar el texto o importar TXT, PDF y DOCX.",
    h1: "Importar una canción de Cifra Club en el editor",
    lead: "Chordleaf puede leer una página pública de Cifra Club y convertirla en una hoja editable. Si la web bloquea la descarga desde servidores, siempre queda pegar el texto a mano, y para archivos propios tienes TXT, PDF y DOCX.",
    imageAlt:
      "Captura del editor de Chordleaf después de importar una canción, con los acordes colocados sobre la letra.",
    imageCaption:
      "Tras importar, la canción queda editable: acordes anclados a la letra y lista para revisar.",
    sections: [
      {
        h: "Tres formas de traer una canción",
        p: [
          "Las tres rutas terminan en el mismo editor y puedes combinarlas: no hay una sola manera correcta de empezar.",
        ],
        list: [
          "Pegar texto: copia la letra con acordes de la página y pégala en el editor; funciona siempre, incluso sin red.",
          "Archivos: TXT, PDF con texto seleccionable, DOCX de Word y archivos ChordPro.",
          "Enlaces compatibles: páginas públicas de Cifra Club, LaCuerda y Ultimate Guitar, siempre en HTTPS.",
        ],
      },
      {
        h: "Importar desde Cifra Club paso a paso",
        p: [
          "Abre la canción en Cifra Club y copia la dirección completa, que empieza por https://. Dentro de Chordleaf, abre Importar, pega el enlace y confirma.",
          "El servidor descarga la página pública y la envía al editor, que la analiza como texto: no se ejecuta nada de la web de origen. Después revisa el título, el artista y los acordes marcados, y ajusta lo que haga falta.",
          "La importación respeta la alineación original lo mejor que puede, pero cada web maqueta a su manera. Cuenta con dedicar un minuto a revisar los acordes que quedan sin resolver.",
        ],
      },
      {
        h: "Qué hace el servidor y qué no",
        p: [
          "La descarga la hace el servidor de Chordleaf, no tu navegador. Solo acepta enlaces HTTPS de una lista cerrada de hosts conocidos, rechaza credenciales y puertos no estándar, y vuelve a validar cada redirección.",
          "El HTML descargado se analiza como datos: no se ejecutan sus scripts ni se monta como página. Hay un límite de tamaño y de tiempo por descarga, y el servicio puede estar desactivado según la configuración del sitio.",
          "La importación web no guarda canciones en el servidor ni crea un catálogo: la página se procesa para devolverte el texto y se descarta.",
        ],
      },
      {
        h: "Si Cifra Club bloquea la descarga",
        p: [
          "Desde direcciones de centros de datos es habitual recibir un 403 o un 429: la web detecta tráfico automatizado y lo corta. Chordleaf no intenta saltarse ese bloqueo; simplemente te lo dice y te ofrece la alternativa.",
          "La salida fiable es copiar la letra con acordes de la página y pegarla en el editor. Para archivos que ya tengas, TXT, PDF o DOCX funcionan sin tocar la red. En la política de importación explicamos los límites y por qué existen.",
        ],
      },
      {
        h: "Después de importar: revisar y ordenar",
        p: [
          "Importar es el principio, no el final: la ventaja de Chordleaf es que la canción queda editable, con los acordes anclados a la letra.",
        ],
        list: [
          "Corrige los acordes marcados y colócalos en la sílaba correcta.",
          "Ajusta título, artista, cejilla y tonalidad.",
          "Elige el formato de página y añade diagramas si los quieres en la hoja.",
          "Exporta a PDF, Word, texto o ChordPro, o guarda el proyecto para más adelante.",
        ],
      },
      {
        h: "Contenido con derechos",
        p: [
          "Chordleaf procesa lo que tú aportas, igual que un editor de texto. No publica canciones ni crea un índice público, y no precarga contenido con derechos de terceros.",
          "La responsabilidad de usar y compartir el contenido importado es de quien lo importa. Si la canción es tuya o es de dominio público, perfecto; si no, respeta la licencia de la obra y las condiciones del sitio de origen.",
        ],
      },
    ],
    faq: [
      {
        q: "¿De qué webs puedo importar un enlace?",
        a: "De páginas públicas de Cifra Club, LaCuerda y Ultimate Guitar con enlace HTTPS. Para cualquier otro origen puedes pegar el texto o importar un archivo.",
      },
      {
        q: "¿Por qué a veces falla la importación?",
        a: "Las webs pueden responder 403 o 429 cuando detectan tráfico desde centros de datos; también falla si el enlace no es de un host compatible o la página cambia de formato. La alternativa es pegar el texto.",
      },
      {
        q: "¿Se ejecutan los scripts de la web importada?",
        a: "No. El HTML se analiza como datos y nunca se monta como página, así que los scripts del origen no se ejecutan en tu navegador.",
      },
      {
        q: "¿Chordleaf guarda las canciones que importo?",
        a: "No. La página se descarga para devolverte el texto y no se conserva en el servidor ni se añade a ningún catálogo público.",
      },
    ],
    related: [
      {
        href: "/es/politica-de-importacion/",
        label: "Política de importación: límites y condiciones",
      },
      {
        href: "/es/editor-de-acordes/",
        label: "Qué puedes hacer en el editor",
      },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "import-ultimate-guitar",
    kicker: "Web import",
    title: "Import songs from Ultimate Guitar — Chordleaf",
    description:
      "Bring a public Ultimate Guitar page into the editor, check the chord alignment and export your own sheet. Pasting text and importing TXT, PDF or DOCX also work.",
    h1: "Import a song from Ultimate Guitar into the editor",
    lead: "Chordleaf can read a public Ultimate Guitar page and turn it into an editable sheet. When a site blocks datacenter traffic, pasting the text always works, and your own TXT, PDF and DOCX files import without touching the network.",
    imageAlt:
      "Screenshot of the Chordleaf editor after importing a song, with chords placed above the lyrics.",
    imageCaption:
      "After importing, the song is editable: chords anchored to the lyrics, ready for review.",
    sections: [
      {
        h: "Three ways to bring a song in",
        p: [
          "All three routes end in the same editor, and you can mix them. There is no single correct start.",
        ],
        list: [
          "Paste text: copy the lyrics and chords from the page and paste them into the editor; it always works, even offline.",
          "Files: TXT, selectable PDF, Word DOCX and ChordPro files.",
          "Supported links: public pages from Ultimate Guitar, Cifra Club and LaCuerda over HTTPS.",
        ],
      },
      {
        h: "Importing from Ultimate Guitar step by step",
        p: [
          "Open the song on Ultimate Guitar and copy the full URL, starting with https://. In Chordleaf, open Import, paste the link and confirm.",
          "The server downloads the public page and hands it to the editor, which parses it as text; nothing from the source site is executed. Then check the title, the artist and any flagged chords, and fix what needs fixing.",
          "The importer keeps the original alignment as well as it can, but every site lays out its pages differently. Budget a minute to review the chords that could not be matched.",
        ],
      },
      {
        h: "What the server does and does not do",
        p: [
          "The download happens on the Chordleaf server, not in your browser. It only accepts HTTPS links from a closed list of known hosts, rejects credentials and non-standard ports, and revalidates every redirect.",
          "The downloaded HTML is parsed as data: its scripts are never run and it is never mounted as a page. There are size and time limits per request, and the feature can be switched off depending on how the site is configured.",
          "Web import does not store songs on the server or build a catalogue: the page is processed to return the text to you and then discarded.",
        ],
      },
      {
        h: "When a site blocks the download",
        p: [
          "Requests from datacenter addresses often get a 403 or 429 because the site detects automated traffic and cuts it off. Chordleaf does not try to bypass that block; it tells you what happened and offers a fallback.",
          "The reliable route is to copy the lyrics and chords from the page and paste them into the editor. For files you already have, TXT, PDF and DOCX import without any network request. The import policy page explains the limits and why they exist.",
        ],
      },
      {
        h: "After the import: review and arrange",
        p: [
          "Importing is the beginning, not the end: the point of Chordleaf is that the song stays editable, with chords anchored to the lyrics.",
        ],
        list: [
          "Fix flagged chords and place them on the right syllables.",
          "Set the title, artist, capo and key.",
          "Choose the page format and add diagrams if you want them on the sheet.",
          "Export to PDF, Word, text or ChordPro, or save the project for later.",
        ],
      },
      {
        h: "Content you have the right to use",
        p: [
          "Chordleaf processes what you provide, like a text editor does. It does not publish songs or build a public index, and it never preloads third-party copyrighted material.",
          "You are responsible for the content you import and share. If the song is yours or in the public domain, that is straightforward; otherwise respect the work's licence and the terms of the site you used.",
        ],
      },
    ],
    faq: [
      {
        q: "Which sites can I import a link from?",
        a: "Public HTTPS pages from Ultimate Guitar, Cifra Club and LaCuerda. For any other source you can paste the text or import a file.",
      },
      {
        q: "Why does an import fail sometimes?",
        a: "Sites may answer 403 or 429 when they see datacenter traffic; an import also fails if the link is not from a supported host or the page markup changes. Pasting the text is the fallback.",
      },
      {
        q: "Do the scripts on the imported page run?",
        a: "No. The HTML is parsed as data and never mounted as a page, so scripts from the source site do not run in your browser.",
      },
      {
        q: "Does Chordleaf keep imported songs?",
        a: "No. The page is downloaded only to return the text to you; it is not stored on the server or added to any public catalogue.",
      },
    ],
    related: [
      {
        href: "/en/import-policy/",
        label: "Import policy: limits and conditions",
      },
      { href: "/en/chord-sheet-maker/", label: "What the editor can do" },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const pairPrivacy = {
  id: "privacy",
  es: {
    slug: "privacidad",
    kicker: "Privacidad",
    title: "Privacidad — Chordleaf sin cuentas ni seguimiento",
    description:
      "Chordleaf no usa cuentas ni cookies de seguimiento. Tus canciones se quedan en tu navegador; solo la importación web pasa por el servidor para descargar la página pública.",
    h1: "Privacidad: tus canciones se quedan en tu navegador",
    lead: "Chordleaf se diseñó para trabajar sin cuentas y sin seguimiento. El editor y tus canciones viven en tu dispositivo; no hay perfil de usuario que crear ni historial que consultar.",
    imageAlt:
      "Captura del editor de Chordleaf trabajando en local, sin cuentas ni paneles de usuario.",
    imageCaption:
      "No hay inicio de sesión: el editor trabaja directamente en tu dispositivo.",
    sections: [
      {
        h: "Sin cuentas, sin perfiles",
        p: [
          "No hay registro, inicio de sesión ni área personal. Nadie en Chordleaf puede ver tus canciones porque nunca se suben a un servidor.",
          "La aplicación no pide permisos de cámara, micrófono o ubicación. Lo único que se instala, si decides instalar la aplicación web, es el service worker que permite abrir el editor sin conexión.",
        ],
      },
      {
        h: "Sin cookies de seguimiento ni analítica",
        p: [
          "Chordleaf no usa cookies de publicidad ni de medición, no incorpora píxeles de redes sociales y no envía eventos a herramientas de analítica. Tu visita no alimenta ningún perfil publicitario.",
          "Las fuentes y el código se sirven desde el propio dominio o desde tu propia copia, sin depender de CDNs de terceros que puedan observar la visita. Si en el futuro se activara una analítica agregada y sin cookies, esta página se actualizaría antes de ponerla en marcha.",
          "El proveedor de alojamiento entrega los archivos estáticos y conserva registros técnicos de acceso con la misma finalidad que cualquier servidor web: operar el servicio, medir fallos y defenderlo de abusos. Chordleaf no cruza esos registros con ninguna identidad porque no hay identidades que cruzar.",
        ],
      },
      {
        h: "Tus canciones se quedan contigo",
        p: [
          "Las canciones, los acordes personalizados y los ajustes se guardan en el almacenamiento local del navegador, en el dispositivo que estás usando. No se sincronizan entre dispositivos ni salen de él.",
          "Puedes borrar todo desde el propio navegador (borrar datos del sitio) o desinstalar la aplicación. Si quieres conservar las canciones, exporta antes una copia .chordleaf.json: ese archivo se descarga a tu equipo y no se envía a ningún sitio.",
          "El almacenamiento está ligado al origen del sitio. Si un día te mudas a una copia propia de Chordleaf, tus canciones no viajan solas: exporta el proyecto desde un origen e impórtalo en el otro. Es el mismo archivo que usarías para pasar una canción de un navegador a otro.",
        ],
      },
      {
        h: "Qué pasa por el servidor",
        p: [
          "La mayoría de funciones no tocan la red: escribir, colocar acordes, maquetar, transportar y exportar se ejecuta en el navegador. Las excepciones son la descarga de la aplicación y la importación web.",
          "Cuando importas por enlace, el servidor descarga la página pública para que tu navegador no tenga que hacerlo y registra en los logs técnicos la URL solicitada y, si algo falla, el error. Ese registro lo conserva el proveedor de alojamiento según su política y se usa para diagnosticar fallos o abusos, no para identificarte.",
          "El limitador de peticiones cuenta solicitudes por dirección para evitar abusos. No se asocia a ninguna identidad y no se usa con fines publicitarios.",
          "El resto del sitio es estático: no hay base de datos de usuarios, ni API de canciones, ni panel de administración que consultar. Los archivos que ves se sirven tal cual y las canciones que escribes nunca llegan a esa infraestructura.",
        ],
      },
      {
        h: "Transparencia y contacto",
        p: [
          "El código es abierto y puedes revisar exactamente qué se guarda y qué se envía. Las dudas de privacidad o seguridad se atienden por GitHub: hay un canal privado para vulnerabilidades y las incidencias normales pueden abrirse en el repositorio.",
          "Chordleaf es software libre. Si prefieres no depender de un servidor ajeno, puedes alojar tu propia copia del proyecto y mantener tus datos en tu infraestructura.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Usáis cookies?",
        a: "No usamos cookies de seguimiento ni de publicidad. La app guarda tus canciones en el almacenamiento local del navegador, que no es una cookie y no viaja al servidor.",
      },
      {
        q: "¿Puedo usar Chordleaf sin conexión?",
        a: "Sí. Tras la primera visita, la aplicación instalable guarda lo necesario para abrir el editor sin conexión y seguir trabajando con lo que tengas en el dispositivo.",
      },
      {
        q: "¿Qué datos se envían al importar un enlace?",
        a: "La URL de la canción y la página pública que el servidor descarga para devolvértela. Ni tus archivos ni tus canciones salen del navegador.",
      },
      {
        q: "¿Cómo borro mis datos?",
        a: "Borra los datos del sitio en tu navegador o desinstala la aplicación. Si quieres conservar las canciones, exporta antes el proyecto .chordleaf.json.",
      },
    ],
    related: [
      {
        href: "/es/politica-de-importacion/",
        label: "Política de importación",
      },
      { href: "/es/editor-de-acordes/", label: "Volver al editor de acordes" },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "privacy",
    kicker: "Privacy",
    title: "Privacy — Chordleaf, no accounts or tracking",
    description:
      "Chordleaf has no accounts and no tracking cookies. Your songs stay in your browser; only a web import touches the server, to fetch the public page you asked for.",
    h1: "Privacy: your songs stay in your browser",
    lead: "Chordleaf was built to work without accounts and without tracking. The editor and your songs live on your device; there is no user profile to create and no history to consult.",
    imageAlt:
      "Screenshot of the Chordleaf editor running locally, with no account or user panel.",
    imageCaption:
      "There is no sign-in: the editor works directly on your device.",
    sections: [
      {
        h: "No accounts, no profiles",
        p: [
          "There is no registration, sign-in or personal area. Nobody at Chordleaf can see your songs because they are never uploaded to a server.",
          "The app does not request camera, microphone or location permissions. The only thing an install adds is the service worker that lets the editor open offline.",
        ],
      },
      {
        h: "No tracking cookies and no analytics",
        p: [
          "Chordleaf does not use advertising or measurement cookies, does not embed social pixels and does not send events to analytics tools. Your visit does not feed an advertising profile.",
          "Fonts and code are served from the project's own domain, or from your own copy, without third-party CDNs watching the visit. If aggregate, cookie-free analytics were ever enabled, this page would be updated before switching it on.",
          "The hosting provider delivers the static files and keeps technical access logs for the same reasons any web server does: to run the service, spot failures and defend it from abuse. Chordleaf does not link those logs to an identity because there are no identities to link.",
        ],
      },
      {
        h: "Your songs stay with you",
        p: [
          "Songs, custom chords and settings are stored in your browser's local storage, on the device you are using. They are not synchronised across devices and do not leave it.",
          "You can erase everything from the browser itself (clear site data) or uninstall the app. If you want to keep your songs, export a .chordleaf.json project first: that file downloads to your machine and is not sent anywhere.",
          "Storage belongs to the site origin. If you move to your own Chordleaf copy one day, songs do not travel on their own: export the project from one origin and import it in the other. It is the same file you would use to move a song between browsers.",
        ],
      },
      {
        h: "What touches the server",
        p: [
          "Most features never use the network: writing, placing chords, layout, transposition and export all run in the browser. The exceptions are downloading the app and web imports.",
          "When you import a link, the server fetches the public page so your browser does not have to, and technical logs record the requested URL and any error. The hosting provider keeps those logs under its own policy; they are used to diagnose failures or abuse, not to identify you.",
          "A rate limiter counts requests per address to prevent abuse. It is not linked to any identity and is not used for advertising.",
          "The rest of the site is static: there is no user database, no song API and no admin panel to query. The files you see are served as they are, and the songs you write never reach that infrastructure.",
        ],
      },
      {
        h: "Transparency and contact",
        p: [
          "The code is open, so you can check exactly what is stored and what is sent. Privacy and security questions go through GitHub: there is a private channel for vulnerabilities, and ordinary issues can be opened in the repository.",
          "Chordleaf is free software. If you would rather not depend on someone else's server, you can host your own copy and keep your data on your own infrastructure.",
        ],
      },
    ],
    faq: [
      {
        q: "Do you use cookies?",
        a: "We use no tracking or advertising cookies. The app stores your songs in browser local storage, which is not a cookie and never travels to the server.",
      },
      {
        q: "Can I use Chordleaf offline?",
        a: "Yes. After the first visit, the installable app keeps what it needs to open the editor offline and work with whatever is stored on the device.",
      },
      {
        q: "What is sent when I import a link?",
        a: "The song URL and the public page the server fetches to hand back to you. Neither your files nor your songs leave the browser.",
      },
      {
        q: "How do I delete my data?",
        a: "Clear the site data in your browser or uninstall the app. Export the .chordleaf.json project first if you want to keep your songs.",
      },
    ],
    related: [
      { href: "/en/import-policy/", label: "Import policy" },
      {
        href: "/en/chord-sheet-maker/",
        label: "Back to the chord sheet maker",
      },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const pairPolicy = {
  id: "policy",
  es: {
    slug: "politica-de-importacion",
    kicker: "Política de importación",
    title: "Política de importación — Chordleaf",
    description:
      "Cómo funciona la importación desde enlaces, qué contenido puedes traer, qué límites aplica el servicio y por qué a veces conviene pegar el texto a mano.",
    h1: "Política de importación: qué se puede traer y cómo",
    lead: "La importación por enlace es una comodidad, no un derecho de acceso. Chordleaf descarga páginas públicas que tú indicas, con hosts permitidos y límites claros, y nunca intenta saltarse un bloqueo.",
    imageAlt:
      "Captura del editor de Chordleaf con el cuadro de importación de una canción.",
    imageCaption:
      "La importación por enlace convive con pegar el texto y con los archivos propios.",
    sections: [
      {
        h: "Qué hace exactamente el importador",
        p: [
          "Cuando pegas un enlace compatible, el servidor hace una petición HTTPS a la página pública, la descarga con un límite de tamaño y de tiempo y la devuelve al editor para analizarla como texto. Las redirecciones se vuelven a validar contra la lista de hosts permitidos, y se rechazan credenciales, puertos no estándar y esquemas que no sean HTTPS.",
          "El contenido descargado no se ejecuta, no se monta como página y no se guarda: se usa para extraer la letra y los acordes que el editor te mostrará. No hay caché de canciones de terceros ni índice público.",
        ],
      },
      {
        h: "Hosts permitidos",
        p: [
          "La lista es deliberadamente corta: Cifra Club (incluido su dominio brasileño), LaCuerda y Ultimate Guitar. Si tu canción está en otro sitio, pega el texto o importa un archivo; el editor no hace peticiones a dominios arbitrarios.",
          "La lista se revisa cuando cambia el panorama de webs de acordes. Si una web compatible cambia su estructura, el analizador puede dejar de entenderla hasta que se actualice; mientras tanto, pegar el texto sigue siendo la vía más estable.",
        ],
      },
      {
        h: "Qué contenido puedes importar",
        p: [
          "Chordleaf no publica nada de lo que importas. Cada persona procesa su copia en su navegador y la responsabilidad sobre el contenido es suya. Si una obra tiene derechos, respeta su licencia y las condiciones del sitio de origen.",
        ],
        list: [
          "Tus propias canciones, transcripciones y arreglos.",
          "Contenido de dominio público o con licencia que permita ese uso.",
          "Material que tengas derecho a usar en tu ensayo, clase o culto.",
        ],
      },
      {
        h: "Qué no es aceptable",
        p: [
          "El endpoint está pensado para importaciones puntuales de canciones que el usuario está preparando, no como API pública de scraping. Si se detecta un uso abusivo, el servicio puede desactivarse.",
        ],
        list: [
          "Usar la importación para saltarse muros de pago, inicios de sesión o controles de acceso.",
          "Descargar páginas en masa para crear catálogos o bases de datos ajenos al uso personal.",
          "Publicar o redistribuir letras y cifras de terceros como si fueran propias.",
          "Sondear el servicio para eludir el límite de peticiones.",
        ],
      },
      {
        h: "Límites técnicos y por qué existen",
        p: [
          "Los sitios de acordes también ponen sus propios límites: es habitual que bloqueen direcciones de centros de datos con un 403 o un 429. Chordleaf no los esquiva; te lo comunica y te propone pegar el texto o importar un archivo.",
        ],
        list: [
          "Solo HTTPS y hosts conocidos, sin credenciales ni puertos no estándar.",
          "Tamaño máximo por página, tiempo de espera y un número limitado de redirecciones.",
          "Límite de peticiones por dirección para proteger el coste del servicio.",
          "El servicio puede estar desactivado en una instalación concreta.",
        ],
      },
      {
        h: "Cambios y contacto",
        p: [
          "Esta política puede actualizarse si cambian los hosts compatibles o los límites técnicos. Las dudas o incidencias se atienden en el repositorio de GitHub; para vulnerabilidades hay un canal privado de reporte.",
          "Si tienes dudas sobre si un uso concreto entra dentro de esta política, abre una incidencia antes de automatizar nada: es más fácil aclararlo que revertir un abuso.",
        ],
      },
    ],
    faq: [
      {
        q: "¿La importación funciona con cualquier web?",
        a: "No. Solo con los hosts compatibles (Cifra Club, LaCuerda y Ultimate Guitar). Para el resto de orígenes, pega el texto o importa un archivo.",
      },
      {
        q: "¿Chordleaf guarda las páginas que descarga?",
        a: "No. Se procesan al vuelo para devolverte el texto y no se almacenan ni se añaden a ningún catálogo.",
      },
      {
        q: "¿Qué pasa si la web me bloquea?",
        a: "Te lo indicamos con un mensaje claro y puedes pegar el texto manualmente. No intentamos eludir el bloqueo ni cambiar de identidad para conseguirlo.",
      },
      {
        q: "¿Puedo importar una canción con derechos de autor?",
        a: "Solo si tienes derecho a usarla. Chordleaf no publica nada: la canción se queda en tu navegador y la responsabilidad de su uso es tuya.",
      },
    ],
    related: [
      { href: "/es/privacidad/", label: "Privacidad: qué datos se tratan" },
      {
        href: "/es/importar-cifra-club/",
        label: "Importar una canción desde Cifra Club",
      },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "import-policy",
    kicker: "Import policy",
    title: "Import policy — Chordleaf",
    description:
      "How link imports work, what content you may bring in, which limits the service applies and why pasting text by hand is sometimes the right fallback.",
    h1: "Import policy: what you can bring in and how",
    lead: "Importing from a link is a convenience, not a right of access. Chordleaf fetches public pages you point it to, within an allowed host list and clear limits, and never tries to bypass a block.",
    imageAlt:
      "Screenshot of the Chordleaf editor with the song import dialog open.",
    imageCaption:
      "Link imports sit next to text pasting and importing your own files.",
    sections: [
      {
        h: "What the importer actually does",
        p: [
          "When you paste a supported link, the server makes an HTTPS request to the public page, downloads it within size and time limits and hands it to the editor to parse as text. Redirects are revalidated against the allowed host list, and credentials, non-standard ports and non-HTTPS schemes are rejected.",
          "The downloaded content is never executed, never mounted as a page and never stored: it is used to extract the lyrics and chords the editor shows you. There is no cache of third-party songs and no public index.",
        ],
      },
      {
        h: "Supported hosts",
        p: [
          "The list is deliberately short: Cifra Club (including its Brazilian domain), LaCuerda and Ultimate Guitar. If your song lives somewhere else, paste the text or import a file; the editor does not send requests to arbitrary domains.",
          "The list is reviewed as the chord-site landscape changes. If a supported site alters its markup, the parser may stop understanding it until it is updated; pasting the text remains the most stable route in the meantime.",
        ],
      },
      {
        h: "Content you may import",
        p: [
          "Chordleaf publishes nothing of what you import. Every person processes their own copy in their browser and is responsible for the content. If a work is copyrighted, respect its licence and the terms of the source site.",
        ],
        list: [
          "Your own songs, transcriptions and arrangements.",
          "Public-domain material or content whose licence allows that use.",
          "Material you have the right to use in your rehearsal, class or service.",
        ],
      },
      {
        h: "What is not acceptable",
        p: [
          "The endpoint exists for occasional imports of songs the user is preparing, not as a public scraping API. If abuse is detected, the service can be switched off.",
        ],
        list: [
          "Using imports to get around paywalls, sign-ins or access controls.",
          "Downloading pages in bulk to build catalogues or databases beyond personal use.",
          "Publishing or redistributing third-party lyrics and chords as your own.",
          "Probing the service to work around the request limit.",
        ],
      },
      {
        h: "Technical limits and why they exist",
        p: [
          "Chord sites enforce their own limits too: datacenter addresses often get a 403 or 429. Chordleaf does not evade them; it reports what happened and suggests pasting the text or importing a file instead.",
        ],
        list: [
          "HTTPS and known hosts only, with no credentials or non-standard ports.",
          "A maximum page size, a timeout and a limited number of redirects.",
          "A per-address request limit that protects the running cost of the service.",
          "The feature can be switched off in a given installation.",
        ],
      },
      {
        h: "Changes and contact",
        p: [
          "This policy may be updated when the supported hosts or the technical limits change. Questions and issues are handled in the GitHub repository; vulnerabilities have a private reporting channel.",
          "If you are unsure whether a specific use fits this policy, open an issue before automating anything: clarifying it is easier than undoing an abuse.",
        ],
      },
    ],
    faq: [
      {
        q: "Does import work with any website?",
        a: "No. Only the supported hosts (Ultimate Guitar, Cifra Club and LaCuerda). For any other source, paste the text or import a file.",
      },
      {
        q: "Does Chordleaf store the pages it downloads?",
        a: "No. They are processed on the fly to return the text to you and are not stored or added to any catalogue.",
      },
      {
        q: "What happens when a site blocks the request?",
        a: "We tell you with a clear message and you can paste the text by hand. We do not try to evade the block or change identity to get through.",
      },
      {
        q: "Can I import a copyrighted song?",
        a: "Only if you have the right to use it. Chordleaf publishes nothing: the song stays in your browser and its use is your responsibility.",
      },
    ],
    related: [
      { href: "/en/privacy/", label: "Privacy: what data is handled" },
      {
        href: "/en/import-ultimate-guitar/",
        label: "Import a song from Ultimate Guitar",
      },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const pairGuide = {
  id: "guide",
  es: {
    slug: "guia",
    kicker: "Guía de uso",
    title: "Guía de Chordleaf — editor de acordes paso a paso",
    description:
      "Primeros pasos, colocación de acordes, transporte, diseño de página, exportación y solución de problemas en el editor de acordes Chordleaf.",
    h1: "Guía de Chordleaf: de la primera canción al PDF",
    lead: "Esta guía resume el recorrido completo: crear o importar una canción, colocar los acordes, ajustar la música y el formato, exportar la hoja y resolver los problemas más habituales.",
    imageAlt:
      "Captura del editor de Chordleaf con una canción completa, acordes y vista previa de la página.",
    imageCaption:
      "El recorrido completo: letra, acordes, música, formato y exportación en una sola pantalla.",
    sections: [
      {
        h: "Primeros pasos",
        p: [
          "Abre Chordleaf en el navegador. La primera vez verás el espacio vacío con la opción de crear una canción; después puedes volver desde el botón de nueva canción o desde las pestañas de la parte superior.",
        ],
        list: [
          "Escribe la letra directamente o pega un texto.",
          "O importa TXT, PDF, DOCX, ChordPro o un enlace compatible.",
          "Pon título y artista para que aparezcan en la cabecera de la hoja.",
        ],
      },
      {
        h: "La letra y los acordes",
        p: [
          "Selecciona el acorde en el panel y colócalo donde cambia la armonía. El editor ancla el acorde a la sílaba, así que puedes editar la letra sin rehacer la alineación.",
          "Los acordes que el editor no reconoce se marcan para revisarlos. También puedes crear acordes propios con el mástil interactivo y guardarlos para otras canciones.",
        ],
      },
      {
        h: "Música: tonalidad, cejilla y transporte",
        p: [
          "La tonalidad probable se calcula a partir de los acordes escritos. Con el transporte cambias la canción de tono en semitonos y con la cejilla adaptas las posiciones que tocas; el aviso de tonalidad te dice qué suena de verdad con la cejilla puesta.",
          "Ni el transporte ni la cejilla modifican la letra. El botón de deshacer devuelve la canción al tono original cuando quieras.",
        ],
      },
      {
        h: "El documento y su formato",
        p: [
          "En los ajustes del documento controlas el tamaño de letra (7–20 pt), los márgenes (5–35 mm) y una o dos columnas. Cada canción guarda su formato, y la vista previa muestra la misma página A4 que se exporta.",
          "Los bloques de diagramas se mueven por la página como objetos y el texto fluye a su alrededor. El pie «chordleaf.com» es opcional y se desactiva en Más opciones.",
        ],
      },
      {
        h: "Exportar y compartir",
        p: [
          "El menú de exportación reúne todos los formatos de salida. Elige según lo que vayas a hacer con la hoja.",
        ],
        list: [
          "PDF: la opción más fiel para imprimir o compartir.",
          "Imprimir: el diálogo del navegador con el diseño A4 y sin interfaz.",
          "Word (DOCX): para retocar el documento en un procesador de textos.",
          "Texto y ChordPro (.cho): para otros editores y aplicaciones.",
          "Proyecto .chordleaf.json: para seguir editando en Chordleaf.",
        ],
      },
      {
        h: "Guardado y copias",
        p: [
          "Chordleaf guarda cada canción en el almacenamiento local del navegador. No hay cuenta ni sincronización, así que conviene exportar el proyecto cuando la canción importe de verdad.",
          "Instalado como aplicación, el editor se abre sin conexión tras la primera visita. Si borras los datos del navegador, las canciones locales desaparecen y no hay forma de recuperarlas sin una copia.",
        ],
      },
      {
        h: "Problemas frecuentes",
        p: [
          "Casi todas las incidencias tienen una salida conocida. Estas son las más habituales.",
        ],
        list: [
          "La importación por enlace falla o responde 403/429: pega el texto; la web está bloqueando tráfico de servidores.",
          "Un acorde aparece marcado: sustitúyelo desde el panel o revisa su grafía.",
          "La canción se parte en dos páginas: reduce la letra, ajusta los márgenes o usa dos columnas.",
          "Has perdido las canciones: comprueba que estás en el mismo navegador y dominio; sin copia exportada no se pueden recuperar.",
          "El PDF no se genera: revisa que ningún bloque de diagramas tape la cabecera o el pie.",
        ],
      },
      {
        h: "Glosario breve",
        p: [
          "Cuatro términos que aparecen a menudo en las hojas y en la interfaz.",
        ],
        list: [
          "Transportar: cambiar el tono de una canción manteniendo la melodía y la letra.",
          "Cejilla (capo): cejilla que sube el sonido sin cambiar las posiciones que tocas.",
          "ChordPro: formato de texto con los acordes entre corchetes.",
          "A4: tamaño de papel estándar de 210 × 297 mm, el que usa la hoja.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Por dónde empiezo?",
        a: "Crea una canción en blanco, escribe o pega la letra y coloca los primeros acordes. Si ya tienes el texto con acordes, impórtalo y revisa los que queden marcados.",
      },
      {
        q: "¿Cómo consigo que quepa en una sola página?",
        a: "Ajusta el tamaño de letra y los márgenes, o cambia a dos columnas. El editor muestra dónde quedan los cortes para que los muevas antes de imprimir.",
      },
      {
        q: "¿Puedo seguir editando después de exportar?",
        a: "Sí. El PDF y el Word son copias de salida; guarda el proyecto .chordleaf.json y podrás reabrirlo con la letra, los acordes y el formato intactos.",
      },
      {
        q: "¿Dónde están mis canciones si cambio de dispositivo?",
        a: "No se sincronizan. Exporta el proyecto en un dispositivo e impórtalo en el otro para trasladar la canción.",
      },
    ],
    related: [
      { href: "/es/editor-de-acordes/", label: "El editor de acordes" },
      {
        href: "/es/hoja-de-acordes-para-imprimir/",
        label: "Hoja de acordes para imprimir",
      },
      { href: "/es/transportar-acordes/", label: "Transportar acordes" },
      {
        href: "/es/importar-cifra-club/",
        label: "Importar desde Cifra Club",
      },
      { href: "/es/privacidad/", label: "Privacidad" },
      {
        href: "/es/politica-de-importacion/",
        label: "Política de importación",
      },
    ],
  },
  en: {
    slug: "guide",
    kicker: "User guide",
    title: "Chordleaf user guide — lyrics and chords editor",
    description:
      "First steps, chord placement, transposition, page layout, export options and troubleshooting in the Chordleaf lyrics and chords editor.",
    h1: "Chordleaf user guide: from the first song to the PDF",
    lead: "This guide walks through the whole journey: create or import a song, place the chords, adjust the music and the page format, export the sheet and solve the most common problems.",
    imageAlt:
      "Screenshot of the Chordleaf editor with a complete song, chords and the page preview.",
    imageCaption:
      "The full journey: lyrics, chords, music, layout and export in one workspace.",
    sections: [
      {
        h: "First steps",
        p: [
          "Open Chordleaf in your browser. The first time you will see an empty workspace with the option to create a song; later you can return through the new song button or the tabs at the top.",
        ],
        list: [
          "Type the lyrics directly or paste a text.",
          "Or import TXT, PDF, DOCX, ChordPro or a supported link.",
          "Set the title and artist so they appear in the sheet header.",
        ],
      },
      {
        h: "Lyrics and chords",
        p: [
          "Pick a chord from the panel and place it where the harmony changes. The editor anchors each chord to a syllable, so you can edit the lyrics without rebuilding the alignment.",
          "Chords the editor does not recognise are flagged for review. You can also draw your own shapes on the interactive fretboard and keep them for other songs.",
        ],
      },
      {
        h: "Music: key, capo and transposition",
        p: [
          "The likely key is estimated from the written chords. Transposition moves the song by semitones and the capo adapts the shapes you play; the key note tells you what actually sounds with the capo on.",
          "Neither transposition nor the capo changes the lyrics. The undo button restores the original key whenever you need it.",
        ],
      },
      {
        h: "The document and its format",
        p: [
          "The document settings control font size (7–20 pt), margins (5–35 mm) and one or two columns. Each song keeps its own format, and the preview shows the same A4 page that gets exported.",
          "Diagram blocks move across the page as objects and the text flows around them. The chordleaf.com footer is optional and can be switched off under More options.",
        ],
      },
      {
        h: "Export and share",
        p: [
          "The export menu gathers every output format. Pick the one that matches what you will do with the sheet.",
        ],
        list: [
          "PDF: the most faithful option for printing or sharing.",
          "Print: the browser dialog with the A4 layout and no interface.",
          "Word (DOCX): to tweak the document in a word processor.",
          "Text and ChordPro (.cho): for other editors and applications.",
          "Project .chordleaf.json: to keep editing in Chordleaf.",
        ],
      },
      {
        h: "Saving and backups",
        p: [
          "Chordleaf stores each song in the browser's local storage. There is no account and no sync, so export the project whenever the song matters.",
          "Installed as an app, the editor opens offline after the first visit. Clearing the browser data removes the local songs, and without an exported copy there is no way to recover them.",
        ],
      },
      {
        h: "Common problems",
        p: [
          "Almost every issue has a known way out. These are the usual ones.",
        ],
        list: [
          "A link import fails or returns 403/429: paste the text; the site is blocking server traffic.",
          "A chord appears flagged: replace it from the panel or check its spelling.",
          "The song splits across two pages: reduce the font, adjust the margins or use two columns.",
          "You lost your songs: check that you are in the same browser and origin; without an exported copy they cannot be recovered.",
          "The PDF will not generate: check that no diagram block covers the header or the footer.",
        ],
      },
      {
        h: "Short glossary",
        p: [
          "Four terms that show up often in chord sheets and in the interface.",
        ],
        list: [
          "Transpose: change the key of a song while keeping the melody and lyrics.",
          "Capo: a clamp that raises the sounding pitch without changing the shapes you play.",
          "ChordPro: a text format with chords written in square brackets.",
          "A4: the standard 210 × 297 mm paper size used by the sheet.",
        ],
      },
    ],
    faq: [
      {
        q: "Where do I start?",
        a: "Create a blank song, write or paste the lyrics and place the first chords. If you already have a text with chords, import it and review anything flagged.",
      },
      {
        q: "How do I fit a song on one page?",
        a: "Adjust the font size and margins, or switch to two columns. The editor shows where the page breaks land so you can move them before printing.",
      },
      {
        q: "Can I keep editing after exporting?",
        a: "Yes. The PDF and Word files are outputs; save the .chordleaf.json project and reopen it with the lyrics, chords and format intact.",
      },
      {
        q: "Where are my songs if I change device?",
        a: "They are not synchronised. Export the project on one device and import it on the other to move the song.",
      },
    ],
    related: [
      { href: "/en/chord-sheet-maker/", label: "The chord sheet maker" },
      {
        href: "/en/printable-chord-sheets/",
        label: "Printable chord sheets",
      },
      { href: "/en/transpose-chords/", label: "Transpose chords" },
      {
        href: "/en/import-ultimate-guitar/",
        label: "Import from Ultimate Guitar",
      },
      { href: "/en/privacy/", label: "Privacy" },
      { href: "/en/import-policy/", label: "Import policy" },
    ],
  },
};

const contentPairs = [
  pairEditor,
  pairPrint,
  pairTranspose,
  pairImport,
  pairPrivacy,
  pairPolicy,
  pairGuide,
];

const chrome = {
  es: {
    siteName: "Chordleaf",
    home: "/es/",
    locale: "es_ES",
    alternateLocale: "en_US",
    langLabel: "English",
    skip: "Ir al contenido",
    footerLabel: "Navegación del sitio",
    faqHeading: "Preguntas frecuentes",
    relatedHeading: "Sigue leyendo",
    cta: "Abrir el editor",
    ctaHref: "/es/",
    footerNote:
      "Chordleaf es software libre con licencia MIT. Tus canciones se quedan en tu navegador.",
    footer: [
      ["/es/guia/", "Guía"],
      ["/es/privacidad/", "Privacidad"],
      ["/es/politica-de-importacion/", "Importación"],
      [CHANGELOG_URL, "Changelog"],
      [REPOSITORY_URL, "GitHub"],
    ],
    socialImageAlt:
      "Tarjeta social de Chordleaf: una hoja con letra, acordes de guitarra y el logotipo de Chordleaf.",
  },
  en: {
    siteName: "Chordleaf",
    home: "/",
    locale: "en_US",
    alternateLocale: "es_ES",
    langLabel: "Español",
    skip: "Skip to content",
    footerLabel: "Site navigation",
    faqHeading: "Frequently asked questions",
    relatedHeading: "Keep reading",
    cta: "Open the editor",
    ctaHref: "/",
    footerNote:
      "Chordleaf is free software under the MIT licence. Your songs stay in your browser.",
    footer: [
      ["/en/guide/", "Guide"],
      ["/en/privacy/", "Privacy"],
      ["/en/import-policy/", "Import policy"],
      [CHANGELOG_URL, "Changelog"],
      [REPOSITORY_URL, "GitHub"],
    ],
    socialImageAlt:
      "Chordleaf social card: a song sheet with lyrics, guitar chord positions and the Chordleaf logo.",
  },
};

const contentPagesCss = `main.content-main {
  display: block;
  height: auto;
  min-height: 0;
  padding: 34px 20px 10px;
}
.content-page {
  color: #cfd8c9;
  font-family: "DM Sans", Arial, sans-serif;
  font-size: 15.5px;
  line-height: 1.7;
}
.content-page a {
  color: var(--green, #c9e79c);
}
.content-shell,
.content-header,
.content-footer nav,
.content-footer p {
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 0;
}
.content-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #edf2e7;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}
.content-brand img {
  display: block;
}
.content-lang {
  font-size: 13px;
}
.content-kicker {
  margin: 0 0 10px;
  color: var(--green, #c9e79c);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.content-page h1 {
  margin: 0 0 14px;
  color: #edf2e7;
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.15;
  letter-spacing: -0.5px;
}
.content-lead {
  margin: 0 0 20px;
  color: #c3ceba;
  font-size: 17px;
  line-height: 1.65;
}
.content-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 26px;
}
.content-cta {
  display: inline-block;
  padding: 11px 18px;
  border-radius: 6px;
  background: var(--green, #c9e79c);
  color: #171a19 !important;
  font-weight: 700;
  text-decoration: none;
}
.content-figure {
  margin: 0 0 28px;
}
.content-figure img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--border, #343934);
  border-radius: 10px;
}
.content-figure figcaption {
  margin-top: 10px;
  color: var(--muted, #8a918b);
  font-size: 13px;
}
.content-page h2 {
  margin: 34px 0 12px;
  color: #edf2e7;
  font-size: 22px;
}
.content-page h3 {
  margin: 22px 0 8px;
  color: #e5e7df;
  font-size: 17px;
}
.content-page p {
  margin: 0 0 14px;
}
.content-page ul {
  margin: 0 0 16px;
  padding-left: 22px;
}
.content-page li {
  margin-bottom: 8px;
}
.content-faq p {
  color: #b9c4b0;
}
.content-related ul {
  display: grid;
  gap: 8px;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
}
.content-footer {
  margin-top: 40px;
  padding: 24px 20px 40px;
  border-top: 1px solid var(--border, #343934);
  color: var(--muted, #8a918b);
  font-size: 13px;
}
.content-footer nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 12px;
}
.content-footer p {
  margin: 0;
}
@media (max-width: 600px) {
  .content-page h2 {
    font-size: 20px;
  }
  .content-lead {
    font-size: 16px;
  }
}
`;

export function contentPageUrl(origin, page) {
  return `${origin}/${page.locale}/${page.slug}/`;
}

/** Flat registry used by tests and the sitemap builder. */
export function contentPageEntries() {
  const entries = [];
  for (const pair of contentPairs)
    for (const locale of ["es", "en"])
      if (pair[locale]) entries.push({ pair, locale, page: pair[locale] });
  return entries;
}

export { contentPagesCss, contentPairs, chrome };

function pageAlternates(origin, pair) {
  if (!origin) return "";
  const en = contentPageUrl(origin, pair.en);
  const es = contentPageUrl(origin, pair.es);
  return (
    `<link rel="alternate" hreflang="en" href="${en}">` +
    `<link rel="alternate" hreflang="es" href="${es}">` +
    `<link rel="alternate" hreflang="x-default" href="${en}">`
  );
}

export function buildContentJsonLd(origin, locale, page, pair) {
  const url = contentPageUrl(origin, page);
  const webpage = {
    "@type": "WebPage",
    url,
    name: page.title,
    description: page.description,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: "Chordleaf",
      url: `${origin}/`,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${origin}${WORKSPACE_IMAGE}`,
    },
  };
  const faq = {
    "@type": "FAQPage",
    mainEntity: page.faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [webpage, faq],
  }).replaceAll("<", "\\u003c");
}

export function renderContentPage(options) {
  const { origin, locale, page, pair, cssHref } = options;
  const c = chrome[locale];
  const otherLocale = locale === "es" ? "en" : "es";
  const other = pair[otherLocale];
  const url = origin ? contentPageUrl(origin, { ...page, locale }) : null;
  const otherUrl = origin
    ? contentPageUrl(origin, { ...other, locale: otherLocale })
    : `/${otherLocale}/${other.slug}/`;
  const canonical = url
    ? `<link rel="canonical" href="${url}">` + pageAlternates(origin, pair)
    : "";
  const socialImage = origin ? `${origin}/social-preview.png` : null;
  const ogTags =
    `<meta property="og:type" content="article">` +
    `<meta property="og:site_name" content="${c.siteName}">` +
    `<meta property="og:title" content="${escapeHtml(page.title)}">` +
    `<meta property="og:description" content="${escapeHtml(page.description)}">` +
    (url ? `<meta property="og:url" content="${url}">` : "") +
    `<meta property="og:locale" content="${c.locale}">` +
    `<meta property="og:locale:alternate" content="${c.alternateLocale}">` +
    (socialImage
      ? `<meta property="og:image" content="${socialImage}">` +
        `<meta property="og:image:type" content="image/png">` +
        `<meta property="og:image:width" content="1200">` +
        `<meta property="og:image:height" content="630">` +
        `<meta property="og:image:alt" content="${escapeHtml(c.socialImageAlt)}">`
      : "") +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${escapeHtml(page.title)}">` +
    `<meta name="twitter:description" content="${escapeHtml(page.description)}">` +
    (socialImage
      ? `<meta name="twitter:image" content="${socialImage}">` +
        `<meta name="twitter:image:alt" content="${escapeHtml(c.socialImageAlt)}">`
      : "");
  const jsonLd = origin
    ? `<script type="application/ld+json">${buildContentJsonLd(origin, locale, page, pair)}</script>`
    : "";
  const sections = page.sections
    .map(
      ({ h, p = [], list }) =>
        `<section><h2>${h}</h2>${p.map((text) => `<p>${text}</p>`).join("")}` +
        (list
          ? `<ul>${list.map((item) => `<li>${item}</li>`).join("")}</ul>`
          : "") +
        `</section>`,
    )
    .join("\n        ");
  const faq = page.faq
    .map(({ q, a }) => `<h3>${q}</h3><p>${a}</p>`)
    .join("\n        ");
  const related = page.related
    .map(({ href, label }) => `<li><a href="${href}">${label}</a></li>`)
    .join("\n          ");
  const footerNav = c.footer
    .map(
      ([href, label]) =>
        `<a href="${href}"${href.startsWith("http") ? ' rel="noopener"' : ""}>${label}</a>`,
    )
    .join("\n          ");
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover"
    />
    <meta name="theme-color" content="#171a19" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}" />
    <link rel="icon" href="/logo.svg" />
    ${canonical}
    ${ogTags}
    ${cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : ""}
    <link rel="stylesheet" href="/content-pages.css" />
    ${jsonLd}
  </head>
  <body>
    <div class="content-page">
      <header class="content-header">
        <a class="content-brand" href="${c.home}">
          <img src="/logo.svg" alt="" width="26" height="26" />
          ${c.siteName}
        </a>
        <a class="content-lang" href="${otherUrl}" hreflang="${otherLocale}" lang="${otherLocale}">${c.langLabel}</a>
      </header>
      <main class="content-main" id="content">
        <article class="content-shell">
          <p class="content-kicker">${page.kicker}</p>
          <h1>${page.h1}</h1>
          <p class="content-lead">${page.lead}</p>
          <p class="content-cta-row"><a class="content-cta" href="${c.ctaHref}">${c.cta}</a></p>
          <figure class="content-figure">
            <img
              src="${WORKSPACE_IMAGE}"
              alt="${escapeHtml(page.imageAlt)}"
              width="1440"
              height="1000"
            />
            <figcaption>${page.imageCaption}</figcaption>
          </figure>
        ${sections}
        <section class="content-faq">
          <h2>${c.faqHeading}</h2>
          ${faq}
        </section>
        <section class="content-related">
          <h2>${c.relatedHeading}</h2>
          <ul>
            ${related}
          </ul>
        </section>
        <p class="content-cta-row"><a class="content-cta" href="${c.ctaHref}">${c.cta}</a></p>
        </article>
      </main>
      <footer class="content-footer">
        <nav aria-label="${c.footerLabel}">
          ${footerNav}
        </nav>
        <p>${c.footerNote} · <a href="${otherUrl}" hreflang="${otherLocale}" lang="${otherLocale}">${c.langLabel}</a></p>
      </footer>
    </div>
  </body>
</html>
`;
}

export function buildJsonLd(origin, locale) {
  const c = copy[locale === "es" ? "es" : "en"];
  const url = locale === "es" ? `${origin}/es/` : `${origin}/`;
  const application = {
    "@type": "SoftwareApplication",
    name: "Chordleaf",
    url,
    applicationCategory: "MusicApplication",
    operatingSystem: "Any",
    inLanguage: ["es", "en"],
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" },
    featureList: [...c.featureList],
    screenshot: [`${origin}/social-preview.png`],
    description: c.description,
    isAccessibleForFree: true,
    sameAs: ["https://github.com/antoniomml/chordleaf"],
  };
  const website = {
    "@type": "WebSite",
    name: "Chordleaf",
    url: `${origin}/`,
    inLanguage: ["es", "en"],
    description: c.description,
  };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [application, website],
  }).replaceAll("<", "\\u003c");
}

export function buildSitemap(origin, lastmod) {
  const pairUrls = [
    { en: `${origin}/`, es: `${origin}/es/` },
    ...contentPairs.map((pair) => ({
      en: contentPageUrl(origin, { ...pair.en, locale: "en" }),
      es: contentPageUrl(origin, { ...pair.es, locale: "es" }),
    })),
  ];
  const urls = pairUrls
    .map(({ en, es }) => {
      const alternates =
        `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
        `<xhtml:link rel="alternate" hreflang="es" href="${es}"/>` +
        `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
      return [en, es]
        .map(
          (loc) =>
            `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>${alternates}</url>`,
        )
        .join("");
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">` +
    urls +
    `</urlset>`
  );
}

export function metadataPlugin(site) {
  return {
    name: "chordleaf-public-metadata",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (!index) throw new Error("Built index.html is missing");
        const cssAsset = Object.keys(bundle).find((name) =>
          name.endsWith(".css"),
        );
        const cssHref = cssAsset ? `/${cssAsset}` : null;
        const base = String(index.source);
        for (const locale of ["en", "es"]) {
          const c = copy[locale];
          let html = base
            .replace('<html lang="en">', `<html lang="${locale}">`)
            .replace(
              /<title>.*?<\/title>/s,
              `<title>${escapeHtml(c.title)}</title>`,
            )
            .replace(
              /(<meta\s+name="description"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.description)}$2`,
            )
            .replace(
              /(<meta\s+property="og:title"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.title)}$2`,
            )
            .replace(
              /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.description)}$2`,
            )
            .replace(
              /(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.imageAlt)}$2`,
            )
            .replace(
              /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.title)}$2`,
            )
            .replace(
              /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.description)}$2`,
            )
            .replace(
              /(<meta\s+name="twitter:image:alt"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.imageAlt)}$2`,
            )
            .replace(/<h1>.*?<\/h1>/s, `<h1>${escapeHtml(c.heading)}</h1>`)
            .replace(/<p>\s*Write lyrics.*?<\/p>/s, `<p>${c.intro}</p>`)
            .replace(/<p>\s*Import TXT.*?<\/p>/s, `<p>${c.privacy}</p>`)
            .replace('<div id="fallback-features"></div>', introHtml(locale));
          if (site) {
            const origin = site.origin;
            const pageUrl = locale === "en" ? `${origin}/` : `${origin}/es/`;
            const tags =
              `<link rel="canonical" href="${pageUrl}">` +
              `<link rel="alternate" hreflang="en" href="${origin}/">` +
              `<link rel="alternate" hreflang="es" href="${origin}/es/">` +
              `<link rel="alternate" hreflang="x-default" href="${origin}/">` +
              `<meta property="og:url" content="${pageUrl}">` +
              `<meta property="og:locale" content="${locale === "en" ? "en_US" : "es_ES"}">` +
              `<meta property="og:image" content="${origin}/social-preview.png">` +
              `<meta property="og:image:width" content="1200">` +
              `<meta property="og:image:height" content="630">` +
              `<meta name="twitter:image" content="${origin}/social-preview.png">` +
              `<script type="application/ld+json">${buildJsonLd(origin, locale)}</script>`;
            html = html.replace("</head>", tags + "</head>");
          }
          this.emitFile({
            type: "asset",
            fileName: `${locale}/index.html`,
            source: html,
          });
          if (locale === "en") index.source = html;
        }
        const origin = site ? site.origin : null;
        for (const pair of contentPairs) {
          for (const locale of ["es", "en"]) {
            const page = pair[locale];
            if (!page) continue;
            this.emitFile({
              type: "asset",
              fileName: `${locale}/${page.slug}/index.html`,
              source: renderContentPage({
                origin,
                locale,
                page,
                pair,
                cssHref,
              }),
            });
          }
        }
        this.emitFile({
          type: "asset",
          fileName: "content-pages.css",
          source: contentPagesCss,
        });
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source:
            "User-agent: *\nAllow: /\nDisallow: /api/\n" +
            (site ? `Sitemap: ${site.origin}/sitemap.xml\n` : ""),
        });
        if (site)
          this.emitFile({
            type: "asset",
            fileName: "sitemap.xml",
            source: buildSitemap(
              site.origin,
              new Date().toISOString().slice(0, 10),
            ),
          });
      },
    },
  };
}
