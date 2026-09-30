// Sheet layout only: preserve the model's words, timings and chord anchors.
// Model chunk IDs are computation boundaries, not musical verse boundaries.
const dangling =
  /^(?:a|an|the|of|to|and|or|but|if|in|on|for|with|my|your|de|del|el|la|los|las|un|una|unos|unas|y|o|que|con|por|para)$/iu;
const phraseEnd = /[.!?。！？]["'»”)]?$/u;

export function lyricLineStarts(words) {
  const starts = new Set();
  let segment = 0;
  function arrange(end) {
    const size = end - segment;
    const costs = new Float64Array(size + 1);
    const next = new Uint32Array(size);
    for (let i = size - 1; i >= 0; i--) {
      costs[i] = Infinity;
      let length = 0;
      for (let j = i + 1; j <= size; j++) {
        const word = words[segment + j - 1];
        length += word.text.length + (j > i + 1 ? 1 : 0);
        if (length > 64 && j > i + 1) break;
        // Choose the whole run jointly, so a greedy long line cannot leave
        // two orphaned words on the final line. Short actual phrases can stay.
        let cost = ((length - 44) / 20) ** 2 + Math.max(0, 24 - length) * 0.12;
        if (j < size) {
          const pause = words[segment + j].start - word.end;
          cost -= pause >= 1.2 ? 1.8 : pause >= 0.55 ? 0.9 : 0;
          cost -= phraseEnd.test(word.text)
            ? length >= 18
              ? 1.8
              : 0.25
            : /[,;:，；：]$/u.test(word.text)
              ? 0.25
              : 0;
          if (dangling.test(word.text)) cost += 1.4;
        }
        cost += costs[j];
        if (cost < costs[i]) {
          costs[i] = cost;
          next[i] = j;
        }
      }
    }
    for (let i = 0; i < size; i = next[i]) starts.add(segment + i);
    segment = end;
  }
  for (let i = 1; i < words.length; i++) {
    // Keep real silence/interludes separate, even for a short sung phrase.
    if (words[i].start - words[i - 1].end > 2) arrange(i);
  }
  arrange(words.length);
  return starts;
}
