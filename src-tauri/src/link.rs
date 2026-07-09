//! Ableton Link integration.
//!
//! One `AblLink` instance lives for the whole app inside Tauri managed state,
//! guarded by a `Mutex` (managed state must be `Send + Sync`; `Mutex<AblLink>`
//! is `Sync` because `AblLink` is `Send`). Every command follows Link's
//! capture -> mutate -> commit pattern with a fresh `SessionState` scratch
//! buffer. The `quantum` (beats-per-bar) is a *local* value: Link does not
//! transmit meter, so we never commit it to the session.
//!
//! Change notifications use a polling watcher thread rather than rusty_link's
//! `set_*_callback` API: that API takes the closure by value and hands a
//! pointer to the (soon-dropped) stack local to the C library, which is
//! unsound for any capturing closure (use-after-free when Link later invokes
//! it). Polling through the mutex is simple and fully safe.

use rusty_link::{AblLink, SessionState};
use serde::Serialize;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

pub const BPM_MIN: f64 = 20.0;
pub const BPM_MAX: f64 = 300.0;
pub const QUANTUM_MIN: f64 = 1.0;
pub const QUANTUM_MAX: f64 = 16.0;

const POLL_MS: u64 = 100;

pub struct AppState {
    pub link: Mutex<AblLink>,
    pub quantum: Mutex<f64>,
}

#[derive(Serialize, Clone)]
pub struct Snapshot {
    pub bpm: f64,
    pub quantum: f64,
    pub peers: u64,
    pub enabled: bool,
}

/// Create the Link peer and enable it.
pub fn build_link() -> AblLink {
    let link = AblLink::new(120.0);
    link.enable(true);
    link
}

/// Poll Link state and emit `link://tempo` / `link://peers` events on change.
/// Runs for the process lifetime; state must already be managed on `handle`.
pub fn spawn_watcher(handle: AppHandle) {
    std::thread::spawn(move || {
        let mut last_bpm = -1.0_f64;
        let mut last_peers = u64::MAX;
        let mut ss = SessionState::new();
        loop {
            {
                let state = handle.state::<AppState>();
                let link = state.link.lock().unwrap();
                link.capture_app_session_state(&mut ss);
                let bpm = ss.tempo();
                let peers = link.num_peers();
                drop(link);

                if (bpm - last_bpm).abs() > 0.0005 {
                    last_bpm = bpm;
                    let _ = handle.emit("link://tempo", bpm);
                }
                if peers != last_peers {
                    last_peers = peers;
                    let _ = handle.emit("link://peers", peers);
                }
            }
            std::thread::sleep(Duration::from_millis(POLL_MS));
        }
    });
}

/// Capture the current session, set a clamped tempo, commit it back.
/// Returns the value actually applied so the frontend can reconcile.
fn commit_tempo(link: &AblLink, bpm: f64) -> f64 {
    let mut ss = SessionState::new();
    link.capture_app_session_state(&mut ss);
    let clamped = bpm.clamp(BPM_MIN, BPM_MAX);
    ss.set_tempo(clamped, link.clock_micros());
    link.commit_app_session_state(&ss);
    clamped
}

#[tauri::command]
pub fn set_tempo(bpm: f64, state: State<AppState>) -> f64 {
    let link = state.link.lock().unwrap();
    commit_tempo(&link, bpm)
}

#[tauri::command]
pub fn nudge_tempo(delta: f64, state: State<AppState>) -> f64 {
    let link = state.link.lock().unwrap();
    let mut ss = SessionState::new();
    link.capture_app_session_state(&mut ss);
    let target = ss.tempo() + delta;
    commit_tempo(&link, target)
}

/// Local only — Link does not broadcast meter. Rounded to whole beats.
#[tauri::command]
pub fn set_quantum(quantum: f64, state: State<AppState>) -> f64 {
    let q = quantum.clamp(QUANTUM_MIN, QUANTUM_MAX).round();
    *state.quantum.lock().unwrap() = q;
    q
}

#[tauri::command]
pub fn get_state(state: State<AppState>) -> Snapshot {
    let link = state.link.lock().unwrap();
    let mut ss = SessionState::new();
    link.capture_app_session_state(&mut ss);
    Snapshot {
        bpm: ss.tempo(),
        quantum: *state.quantum.lock().unwrap(),
        peers: link.num_peers(),
        enabled: link.is_enabled(),
    }
}

#[tauri::command]
pub fn toggle_link_enabled(state: State<AppState>) -> bool {
    let link = state.link.lock().unwrap();
    let now = !link.is_enabled();
    link.enable(now);
    now
}
