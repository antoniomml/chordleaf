import FFT from "fft.js";

// Peak interpolation and tuning histogram used by librosa estimate_tuning.
export function estimateTuning(audio, sampleRate = 22050) {
  const size = 2048,
    fft = new FFT(size);
  const frame = new Float64Array(size),
    spectrum = fft.createComplexArray();
  const magnitudes = new Float64Array(size / 2 + 1),
    peaks = [];
  for (let center = 0; center <= audio.length; center += 512) {
    for (let i = 0; i < size; i++) {
      const at = center + i - size / 2;
      frame[i] =
        (audio[at] || 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
    }
    fft.realTransform(spectrum, frame);
    let maximum = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      magnitudes[i] = Math.hypot(spectrum[2 * i], spectrum[2 * i + 1]);
      maximum = Math.max(maximum, magnitudes[i]);
    }
    for (
      let i = Math.ceil((150 * size) / sampleRate);
      i < Math.floor((4000 * size) / sampleRate);
      i++
    ) {
      const left = magnitudes[i - 1],
        middle = magnitudes[i],
        right = magnitudes[i + 1];
      if (middle <= maximum * 0.1 || middle <= left || middle < right) continue;
      const curvature = left - 2 * middle + right;
      let shift = curvature ? (0.5 * (left - right)) / curvature : 0;
      if (Math.abs(shift) > 1) shift = 0;
      peaks.push({
        frequency: ((i + shift) * sampleRate) / size,
        magnitude: middle + 0.25 * (right - left) * shift,
      });
    }
  }
  if (!peaks.length) return 0;
  const sorted = peaks.map((p) => p.magnitude).sort((a, b) => a - b);
  const median =
    (sorted[Math.floor((sorted.length - 1) / 2)] +
      sorted[Math.floor(sorted.length / 2)]) /
    2;
  const histogram = new Uint32Array(100);
  for (const peak of peaks) {
    if (peak.magnitude < median) continue;
    const pitch = 36 * Math.log2(peak.frequency / 440);
    const residual = pitch - Math.floor(pitch + 0.5);
    histogram[Math.max(0, Math.min(99, Math.floor((residual + 0.5) * 100)))]++;
  }
  let best = 0;
  for (let i = 1; i < 100; i++) if (histogram[i] > histogram[best]) best = i;
  return -0.5 + best * 0.01;
}
