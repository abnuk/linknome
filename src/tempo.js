// The tempo interaction engine — a shuttle / jog control.
//
// Horizontal deflection from the press point sets the RATE of change
// (BPM per second): near the centre it changes slowly and precisely, the
// farther you push the faster it goes. Vertical position is ignored. Tempo
// is an integer. A dead zone around the anchor lets you hold steady.

export const MAX_RATE = 55; // BPM per second at full deflection
const DEAD_PX = 12; // no change within this distance of the anchor
const FULL_PX = 120; // deflection past the dead zone to reach MAX_RATE
const EXPO = 2.2; // curve: gentle near centre, steep far out
const TAP_MOVE = 8; // px — a release closer than this counts as a tap
const DOUBLE_TAP_MS = 320;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Signed rate in BPM/s for a horizontal deflection dx (px).
export function rateForDx(dx) {
  const a = Math.abs(dx);
  if (a <= DEAD_PX) return 0;
  const norm = Math.min((a - DEAD_PX) / FULL_PX, 1);
  return Math.sign(dx) * MAX_RATE * Math.pow(norm, EXPO);
}

/**
 * Wire the scrub surface.
 * opts: { el, getBpm, setBpm(int), commit(int), setRate(norm[-1..1]),
 *         onEdit, onDragStart, onDragEnd, min, max }
 */
export function setupScrub(opts) {
  const {
    el,
    getBpm,
    setBpm,
    commit,
    setRate,
    onEdit,
    onDragStart = () => {},
    onDragEnd = () => {},
    min,
    max,
  } = opts;

  let dragging = false;
  let startX = 0;
  let curX = 0;
  let curY = 0;
  let downX = 0;
  let downY = 0;
  let virt = 0; // float accumulator while dragging
  let lastT = 0;
  let rafId = 0;
  let lastTapUp = 0;

  function frame() {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.min((now - lastT) / 1000, 0.05); // clamp long gaps
    lastT = now;

    const rate = rateForDx(curX - startX);
    setRate(rate / MAX_RATE); // normalized for the UI meter

    if (rate !== 0) {
      virt = clamp(virt + rate * dt, min, max);
      const b = Math.round(virt);
      if (b !== getBpm()) {
        setBpm(b);
        commit(b);
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    startX = curX = downX = e.clientX;
    curY = downY = e.clientY;
    virt = getBpm();
    lastT = performance.now();
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
    onDragStart();
    e.preventDefault();
    rafId = requestAnimationFrame(frame);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    curX = e.clientX;
    curY = e.clientY;
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    el.classList.remove("dragging");
    try {
      el.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setRate(0);
    onDragEnd();

    const moved = Math.hypot(curX - downX, curY - downY);
    if (moved < TAP_MOVE) {
      const now = performance.now();
      if (now - lastTapUp < DOUBLE_TAP_MS) {
        lastTapUp = 0;
        onEdit();
        return;
      }
      lastTapUp = now;
    }
  }

  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  // Mouse wheel: ±1, Shift = ±5 (integer)
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const dir = e.deltaY < 0 ? 1 : -1;
      const next = clamp(getBpm() + dir * step, min, max);
      if (next !== getBpm()) {
        setBpm(next);
        commit(next);
      }
    },
    { passive: false },
  );
}
