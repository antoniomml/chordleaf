export function repetitionStart(tokens) {
  for (let size = 1; size <= 8; size++) {
    const repeats = Math.max(8, Math.ceil(24 / size));
    const start = tokens.length - size * repeats;
    if (start < 0) continue;
    let repeating = true;
    for (let i = start; i < tokens.length; i++)
      if (tokens[i] !== tokens[start + ((i - start) % size)]) {
        repeating = false;
        break;
      }
    if (repeating) return { start, keep: size * 2 };
  }
  return null;
}

// Non-overlapping chunks cover the complete file and end near a quiet point,
// without exceeding the model's 30-second context or duplicating lyrics.
export function audioChunks(audio, rate = 16000) {
  const chunks = [];
  let start = 0;
  while (start < audio.length) {
    let end = Math.min(audio.length, start + 25 * rate);
    if (end < audio.length) {
      let best = Infinity;
      const target = end;
      for (
        let candidate = target - 2 * rate;
        candidate <= target;
        candidate += Math.round(0.05 * rate)
      ) {
        let energy = 0;
        for (let i = candidate - Math.round(0.05 * rate); i < candidate; i++)
          energy += audio[i] ** 2;
        // Prefer the later point for equally quiet windows.
        if (energy <= best) {
          best = energy;
          end = candidate;
        }
      }
    }
    chunks.push({ start, end });
    start = end;
  }
  return chunks;
}
