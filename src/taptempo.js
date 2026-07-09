// Tap-tempo: average the intervals of the last few taps.
// Resets if the gap since the previous tap exceeds RESET_MS.

const RESET_MS = 2000;
const MAX_TAPS = 5; // -> up to 4 intervals averaged

let taps = [];

export function tap() {
  const t = performance.now();
  if (taps.length && t - taps[taps.length - 1] > RESET_MS) taps = [];
  taps.push(t);
  if (taps.length > MAX_TAPS) taps.shift();
  if (taps.length < 2) return null;

  let sum = 0;
  for (let i = 1; i < taps.length; i++) sum += taps[i] - taps[i - 1];
  const meanMs = sum / (taps.length - 1);
  return 60000 / meanMs;
}

export function resetTaps() {
  taps = [];
}
