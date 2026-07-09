import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";

import {
  commitTempo,
  setQuantum,
  getState,
  onRemoteTempo,
  onPeers,
  setInteracting,
} from "./bridge.js";
import { setupScrub } from "./tempo.js";
import { setupMeter, METER_MIN, METER_MAX } from "./meter.js";
import { tap as tapTempo, resetTaps } from "./taptempo.js";
import { STRINGS, LANGS, detectLang, normalizeLang } from "./i18n.js";

const BPM_MIN = 20;
const BPM_MAX = 300;
const ALPHAS = [1, 0.72, 0.42];

const appWindow = getCurrentWindow();
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const clampBpm = (v) => clamp(Math.round(v), BPM_MIN, BPM_MAX);

// ---- DOM ------------------------------------------------------------
const el = (id) => document.getElementById(id);
const panel = el("app");
const bpmValue = el("bpm-value");
const bpmRow = document.querySelector(".bpm-row");
const bpmInput = el("bpm-input");
const scrub = el("scrub");
const precisionFill = el("precision-fill");
const peersLabel = el("peers-label");
const linkDot = el("link-dot");

// ---- State ----------------------------------------------------------
const state = {
  bpm: 120,
  quantum: 4,
  peers: 0,
  alphaIdx: 0,
  compact: false,
  onTop: true,
  lang: "en",
};

// ---- Persistence (webview localStorage) -----------------------------
const SETTINGS_KEY = "linknome.settings";
function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch (_) {
    return {};
  }
}
let persistTimer = 0;
function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        lastBpm: state.bpm,
        quantum: state.quantum,
        alphaIdx: state.alphaIdx,
        compact: state.compact,
        onTop: state.onTop,
        lang: state.lang,
      }),
    );
  }, 350);
}

// ---- i18n -----------------------------------------------------------
function applyLang(lang) {
  state.lang = normalizeLang(lang);
  const t = STRINGS[state.lang];
  document.documentElement.lang = state.lang;

  el("btn-ontop").title = t.ontop;
  el("btn-opacity").title = t.opacity;
  el("btn-compact").title = t.compact;
  el("btn-close").title = t.close;

  const langBtn = el("btn-lang");
  langBtn.textContent = state.lang.toUpperCase();
  langBtn.title = t.lang;

  el("btn-minus").setAttribute("aria-label", t.slower);
  el("btn-plus").setAttribute("aria-label", t.faster);
  bpmInput.setAttribute("aria-label", t.enterTempo);
  el("scrub-hint").textContent = t.scrubHint;

  document.querySelector(".meter").title = t.meterTip;
  document.querySelector(".meter-label").textContent = t.meter;
  el("meter-dec").setAttribute("aria-label", t.fewerBeats);
  el("meter-inc").setAttribute("aria-label", t.moreBeats);
}

// ---- Tempo (integer) -----------------------------------------------
function renderBpm() {
  bpmValue.textContent = String(state.bpm);
}
// optimistic local update (drag / wheel / buttons) — no persistence spam
function setBpm(v) {
  state.bpm = clampBpm(v);
  renderBpm();
}
// fire-and-forget commit to the Link session
function commit(v) {
  commitTempo(clampBpm(v));
  persistSoon();
}
// discrete step (buttons / keyboard)
function adjust(delta) {
  const v = clampBpm(state.bpm + delta);
  setBpm(v);
  commit(v);
}
// authoritative set (tap / typed value) — reconcile with backend clamp
async function setAuthoritative(v) {
  setBpm(v);
  const applied = await commitTempo(state.bpm);
  if (typeof applied === "number") setBpm(applied);
  persistSoon();
}
// inbound tempo from another Link peer (guarded in bridge)
function setFromRemote(v) {
  state.bpm = clampBpm(v);
  renderBpm();
}

// Rate meter: norm in [-1, 1], center-origin fill (right = faster up).
function setRate(norm) {
  const mag = Math.min(Math.abs(norm), 1) * 50; // percent of half-track
  if (norm >= 0) {
    precisionFill.style.left = "50%";
  } else {
    precisionFill.style.left = `${50 - mag}%`;
  }
  precisionFill.style.width = `${mag}%`;
}

// ---- Peers ----------------------------------------------------------
function renderPeers() {
  const connected = state.peers > 0;
  linkDot.classList.toggle("connected", connected);
  peersLabel.textContent = connected ? `LINK · ${state.peers}` : "LINK";
}

// ---- Window chrome --------------------------------------------------
function applyAlpha() {
  document.documentElement.style.setProperty("--alpha", ALPHAS[state.alphaIdx]);
}
function renderCompact() {
  panel.dataset.mode = state.compact ? "compact" : "expanded";
  el("btn-compact").classList.toggle("is-on", state.compact);
}
async function resizeForMode() {
  try {
    const factor = await appWindow.scaleFactor();
    const size = (await appWindow.innerSize()).toLogical(factor);
    await appWindow.setSize(new LogicalSize(size.width, state.compact ? 112 : 220));
  } catch (e) {
    console.error("resize failed", e);
  }
}
async function applyOnTop() {
  el("btn-ontop").classList.toggle("is-on", state.onTop);
  try {
    await appWindow.setAlwaysOnTop(state.onTop);
  } catch (e) {
    console.error("setAlwaysOnTop failed", e);
  }
}

// ---- Numeric entry --------------------------------------------------
function openEditor() {
  bpmInput.value = String(state.bpm);
  bpmRow.classList.add("hidden");
  bpmInput.classList.remove("hidden");
  setInteracting(true);
  bpmInput.focus();
  bpmInput.select();
}
function closeEditor(applyValue) {
  if (applyValue) {
    const v = parseFloat(bpmInput.value.replace(",", "."));
    if (isFinite(v)) setAuthoritative(v);
  }
  bpmInput.classList.add("hidden");
  bpmRow.classList.remove("hidden");
  setInteracting(false);
}
bpmInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") closeEditor(true);
  else if (e.key === "Escape") closeEditor(false);
  e.stopPropagation();
});
bpmInput.addEventListener("blur", () => {
  if (!bpmInput.classList.contains("hidden")) closeEditor(true);
});

// ---- Step buttons with accelerating auto-repeat (integer) -----------
function attachRepeat(btn, dir) {
  let startTimer = 0;
  let repeatTimer = 0;
  let elapsed = 0;
  const stop = () => {
    clearTimeout(startTimer);
    clearInterval(repeatTimer);
    startTimer = repeatTimer = 0;
  };
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try {
      btn.setPointerCapture(e.pointerId);
    } catch (_) {}
    adjust(dir * 1);
    elapsed = 0;
    startTimer = setTimeout(() => {
      repeatTimer = setInterval(() => {
        elapsed += 90;
        adjust(dir * (elapsed > 1000 ? 5 : 1));
      }, 90);
    }, 360);
  });
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("pointercancel", stop);
}

// ---- Wiring ---------------------------------------------------------
setupScrub({
  el: scrub,
  min: BPM_MIN,
  max: BPM_MAX,
  getBpm: () => state.bpm,
  setBpm,
  commit,
  setRate,
  onEdit: openEditor,
  onDragStart: () => setInteracting(true),
  onDragEnd: () => setInteracting(false),
});

attachRepeat(el("btn-minus"), -1);
attachRepeat(el("btn-plus"), 1);

const meter = setupMeter({
  decBtn: el("meter-dec"),
  incBtn: el("meter-inc"),
  valueEl: el("meter-value"),
  get: () => state.quantum,
  set: (q) => {
    state.quantum = q;
    setQuantum(q);
    persistSoon();
  },
});

// Tap tempo
const tapBtn = el("btn-tap");
tapBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  tapBtn.classList.add("flash");
  const bpm = tapTempo();
  if (bpm !== null) setAuthoritative(bpm);
});
tapBtn.addEventListener("pointerup", () => tapBtn.classList.remove("flash"));
tapBtn.addEventListener("pointerleave", () => tapBtn.classList.remove("flash"));

// Keyboard: arrows ±1, Shift+arrows ±5, PageUp/Down ±10
window.addEventListener("keydown", (e) => {
  if (document.activeElement === bpmInput) return;
  let step = 0;
  switch (e.key) {
    case "ArrowUp":
      step = e.shiftKey ? 5 : 1;
      break;
    case "ArrowDown":
      step = e.shiftKey ? -5 : -1;
      break;
    case "PageUp":
      step = 10;
      break;
    case "PageDown":
      step = -10;
      break;
    default:
      return;
  }
  e.preventDefault();
  adjust(step);
});

// Window control buttons
el("btn-close").addEventListener("click", () => appWindow.close());
el("btn-ontop").addEventListener("click", () => {
  state.onTop = !state.onTop;
  applyOnTop();
  persistSoon();
});
el("btn-opacity").addEventListener("click", () => {
  state.alphaIdx = (state.alphaIdx + 1) % ALPHAS.length;
  applyAlpha();
  persistSoon();
});
el("btn-compact").addEventListener("click", () => {
  state.compact = !state.compact;
  renderCompact();
  resizeForMode();
  persistSoon();
});
el("btn-lang").addEventListener("click", () => {
  const next = LANGS[(LANGS.indexOf(state.lang) + 1) % LANGS.length];
  applyLang(next);
  persistSoon();
});

// Drag the window by its top bar.
// - Mouse: native OS drag (smooth, supports Aero snap).
// - Touch / pen: move the window manually via setPosition, because Windows /
//   WebView2 does NOT drive startDragging()'s OS move-loop from touch input
//   (tauri-apps/tauri#4746 — no upstream fix).
el("statusbar").addEventListener("pointerdown", async (e) => {
  if (e.target.closest("button")) return; // let the icon buttons work

  if (e.pointerType === "mouse") {
    if (e.button !== 0) return;
    appWindow.startDragging().catch(() => {});
    return;
  }

  // Touch / pen: follow the finger by repositioning the window. On Windows
  // this lags a bit and flickers (webview coordinate feedback loop), but it
  // does move — kept per user preference over the alternatives.
  const bar = e.currentTarget;
  bar.setPointerCapture(e.pointerId);
  e.preventDefault();
  const dpr = window.devicePixelRatio || 1;
  const startSX = e.screenX;
  const startSY = e.screenY;
  let wx, wy;
  try {
    const p = await appWindow.outerPosition();
    wx = p.x;
    wy = p.y;
  } catch {
    return;
  }
  let raf = 0;
  let latest = null;
  const flush = () => {
    raf = 0;
    if (!latest) return;
    appWindow
      .setPosition(
        new PhysicalPosition(
          Math.round(wx + (latest.screenX - startSX) * dpr),
          Math.round(wy + (latest.screenY - startSY) * dpr),
        ),
      )
      .catch(() => {});
  };
  const onMove = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    latest = ev;
    if (!raf) raf = requestAnimationFrame(flush);
  };
  const end = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    bar.removeEventListener("pointermove", onMove);
    bar.removeEventListener("pointerup", end);
    bar.removeEventListener("pointercancel", end);
    if (raf) cancelAnimationFrame(raf);
    try {
      bar.releasePointerCapture(e.pointerId);
    } catch {}
  };
  bar.addEventListener("pointermove", onMove);
  bar.addEventListener("pointerup", end);
  bar.addEventListener("pointercancel", end);
});

// Prevent context menu / browser zoom gestures in the shipped app
window.addEventListener("contextmenu", (e) => e.preventDefault());

// ---- Init -----------------------------------------------------------
async function init() {
  const s = loadSettings();
  applyLang(typeof s.lang === "string" ? s.lang : detectLang());
  if (typeof s.quantum === "number") state.quantum = clamp(s.quantum, METER_MIN, METER_MAX);
  if (typeof s.alphaIdx === "number") state.alphaIdx = s.alphaIdx % ALPHAS.length;
  if (typeof s.compact === "boolean") state.compact = s.compact;
  if (typeof s.onTop === "boolean") state.onTop = s.onTop;

  renderBpm();
  meter.render(state.quantum);
  applyAlpha();
  renderCompact(); // visual only — trust window-state plugin for geometry
  await applyOnTop();
  await setQuantum(state.quantum);

  // Adopt current session tempo; if we're alone, restore our last tempo.
  const snap = await getState();
  if (snap) {
    state.peers = snap.peers;
    renderPeers();
    if (snap.peers > 0) {
      setFromRemote(snap.bpm);
    } else if (typeof s.lastBpm === "number") {
      await setAuthoritative(s.lastBpm);
    } else {
      setFromRemote(snap.bpm);
    }
  }

  onRemoteTempo((bpm) => setFromRemote(bpm));
  onPeers((p) => {
    state.peers = Number(p);
    renderPeers();
  });
}

// Clear stale tap history when the window loses focus.
window.addEventListener("blur", resetTaps);

init();
