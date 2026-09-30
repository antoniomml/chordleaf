// Keep source anchors intact. Only the printed layout gains space when two
// labels would collide; the editor and saved ChordPro remain unchanged.
export function spaceChordAnchors(lyric, marks) {
  let text = "";
  const positions = [],
    spaced = [];
  let index = 0,
    previousEnd = -1,
    previousAnchor = -1;
  const length = Math.max(lyric.length, ...marks.map((m) => m.at + 1), 0);
  for (let at = 0; at < length; at++) {
    const group = [];
    while (index < marks.length && marks[index].at === at)
      group.push(marks[index++]);
    if (group.length) {
      const padding = Math.max(0, previousEnd + 1 - text.length);
      if (padding) {
        // Prefer widening an existing word boundary over splitting a word.
        const space = text.lastIndexOf(" ");
        const insert = space > previousAnchor ? space + 1 : text.length;
        text = text.slice(0, insert) + " ".repeat(padding) + text.slice(insert);
        positions.splice(
          insert,
          0,
          ...Array(padding).fill(positions[insert] ?? at),
        );
      }
      for (const mark of group) {
        const x = Math.max(text.length, previousEnd + 1);
        const gap = x - text.length;
        text += " ".repeat(gap);
        positions.push(...Array(gap).fill(at));
        spaced.push({ ...mark, visualAt: x });
        previousAnchor = x;
        previousEnd = x + mark.chord.length;
      }
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
