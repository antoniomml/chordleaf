// ChordPro tokens anchor a lyric character. Odd labels put their middle letter
// there; even labels put the left middle letter there (E / Em / Em7 -> E / E / m).
export function chordAnchorOffset(label) {
  return Math.floor(Math.max(0, label.length - 1) / 2);
}

// Keep source anchors intact. Printed padding prevents centred labels colliding.
export function spaceChordAnchors(lyric, marks) {
  let text = "";
  const positions = [],
    spaced = [];
  let index = 0,
    previousEnd = -1,
    previousAnchor = -1;
  const length = Math.max(lyric.length, ...marks.map((m) => m.at + 1), 0);
  for (let at = 0; at < length; at++) {
    while (index < marks.length && marks[index].at === at) {
      const mark = marks[index++],
        anchorOffset = chordAnchorOffset(mark.chord);
      const padding = Math.max(
        0,
        previousEnd + 1 - (text.length - anchorOffset),
      );
      if (padding) {
        // Prefer widening a word boundary over splitting a word. The first
        // label may need leading space so its centre stays inside the margin.
        const space = text.lastIndexOf(" ");
        const insert = space > previousAnchor ? space + 1 : text.length;
        text = text.slice(0, insert) + " ".repeat(padding) + text.slice(insert);
        positions.splice(
          insert,
          0,
          ...Array(padding).fill(positions[insert] ?? at),
        );
      }
      const x = text.length - anchorOffset;
      spaced.push({ ...mark, visualAt: x, anchorOffset });
      previousAnchor = text.length;
      previousEnd = x + mark.chord.length;
    }
    text += lyric[at] ?? " ";
    positions.push(at);
  }
  while (text.length < previousEnd) {
    text += " ";
    positions.push(length);
  }
  return { lyric: text, marks: spaced, positions };
}
