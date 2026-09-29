// Original demo songs written for Chordleaf. They are safe to publish and to
// show on the entry page.
const songs = {
  es: {
    title: "Al otro lado",
    artist: "Canción de ejemplo · Chordleaf",
    text: "[Intro] [G] [D] [Em] [C]\n\n[G]Hay un lugar al [D]otro lado\n[Em]donde el tiempo va [C]despacio.\n[G]Guardo la luz de [D]esta mañana\n[C]en las cuerdas de mi [G]guitarra.\n\n[Em]Y si la noche nos [C]encuentra,\n[G]que nos encuentre al [D]caminar.\n[Em]Con una canción [C]pequeña\n[G]y tantas cosas por [D]contar.\n\nEstribillo:\n[G]Vuelve a sonar, [D]vuelve a empezar,\n[Em]cada camino nos [C]trae hasta aquí.\n[G]Vuelve a sonar, [D]sin preguntar,\n[C]hoy esta canción es [G]para ti.",
  },
  en: {
    title: "The other side",
    artist: "Example song · Chordleaf",
    text: "[Intro] [G] [D] [Em] [C]\n\n[G]There's a place on the [D]other side\n[Em]where the hours move [C]slow.\n[G]I keep the light of [D]this new morning\n[C]in the strings of my [G]guitar.\n\n[Em]And if the night should [C]find us,\n[G]let it find us on the [D]road,\n[Em]with a little song to [C]carry\n[G]and a story to be [D]told.\n\nChorus:\n[G]Play it again, [D]start it again,\n[Em]every road has [C]brought us here.\n[G]Play it again, [D]don't ask me when,\n[C]this song is yours to [G]keep.",
  },
};

export function exampleSong(locale) {
  return songs[locale === "en" ? "en" : "es"];
}

/** Chord-over-lyric rows for the static entry sheet preview. */
export function chordRows(text, limit) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || /^\[[^\]]+\](\s*\[[^\]]+\])*$/.test(line.trim()))
      continue;
    let lyric = "",
      chords = "";
    for (const part of line.split(/(\[[^\]]+\])/)) {
      const chord = part.match(/^\[([^\]]+)\]$/)?.[1];
      if (chord) chords = chords.padEnd(lyric.length, " ") + chord + " ";
      else lyric += part;
    }
    rows.push({ chords: chords.trimEnd(), lyric });
    if (rows.length === limit) break;
  }
  return rows;
}
