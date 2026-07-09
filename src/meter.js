// Meter stepper -> Link quantum (beats per bar). Local phase reference only.

export const METER_MIN = 1;
export const METER_MAX = 16;

/**
 * opts: { decBtn, incBtn, valueEl, get(), set(q) }
 * `set` receives the new integer beats-per-bar and should persist + push to backend.
 */
export function setupMeter(opts) {
  const { decBtn, incBtn, valueEl, get, set } = opts;

  const clamp = (q) => Math.min(Math.max(q, METER_MIN), METER_MAX);

  function render(q) {
    valueEl.textContent = String(q);
  }

  function change(delta) {
    const q = clamp(get() + delta);
    render(q);
    set(q);
  }

  decBtn.addEventListener("click", () => change(-1));
  incBtn.addEventListener("click", () => change(1));

  return { render };
}
