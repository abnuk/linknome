// Thin wrappers around the Rust commands + a feedback guard.
//
// Link's tempo callback fires for ANY session change, including our own
// commits. Without a guard the incoming value fights the finger mid-drag.
// We suppress inbound tempo while the user is interacting, and for a short
// window after each local commit (to swallow the echo of our own change).

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

let interacting = false;
let suppressUntil = 0;

export function setInteracting(v) {
  interacting = v;
}

export async function commitTempo(bpm) {
  suppressUntil = performance.now() + 250;
  try {
    return await invoke("set_tempo", { bpm });
  } catch (e) {
    console.error("set_tempo failed", e);
    return bpm;
  }
}

export async function nudgeTempo(delta) {
  suppressUntil = performance.now() + 250;
  try {
    return await invoke("nudge_tempo", { delta });
  } catch (e) {
    console.error("nudge_tempo failed", e);
    return null;
  }
}

export async function setQuantum(quantum) {
  try {
    return await invoke("set_quantum", { quantum });
  } catch (e) {
    console.error("set_quantum failed", e);
    return quantum;
  }
}

export async function getState() {
  try {
    return await invoke("get_state");
  } catch (e) {
    console.error("get_state failed", e);
    return null;
  }
}

export async function toggleLinkEnabled() {
  try {
    return await invoke("toggle_link_enabled");
  } catch (e) {
    console.error("toggle_link_enabled failed", e);
    return null;
  }
}

// Start the native (Rust) window drag that follows the OS cursor — used for
// touch/pen on Windows, where webview-based dragging doesn't work.
export async function startTouchDrag() {
  try {
    await invoke("start_touch_drag");
  } catch (e) {
    console.error("start_touch_drag failed", e);
  }
}

export function onRemoteTempo(cb) {
  return listen("link://tempo", (e) => {
    if (interacting || performance.now() < suppressUntil) return;
    cb(e.payload);
  });
}

export function onPeers(cb) {
  return listen("link://peers", (e) => cb(e.payload));
}
