//! Standalone check that Ableton Link works on this machine:
//! two peers discover each other and a tempo commit propagates.
//! Run: cargo run --manifest-path src-tauri/Cargo.toml --example link_probe

use rusty_link::{AblLink, SessionState};
use std::{thread, time::Duration};

fn main() {
    let a = AblLink::new(120.0);
    let b = AblLink::new(120.0);
    a.enable(true);
    b.enable(true);

    // Wait up to ~5s for the two peers to discover each other.
    for _ in 0..50 {
        if a.num_peers() >= 1 && b.num_peers() >= 1 {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }
    println!("peers: a={} b={}", a.num_peers(), b.num_peers());

    // Peer A sets tempo to 140; peer B should observe it.
    let mut sa = SessionState::new();
    a.capture_app_session_state(&mut sa);
    sa.set_tempo(140.0, a.clock_micros());
    a.commit_app_session_state(&sa);

    thread::sleep(Duration::from_millis(600));

    let mut sb = SessionState::new();
    b.capture_app_session_state(&mut sb);
    println!("b sees tempo: {:.2}", sb.tempo());

    let ok = a.num_peers() >= 1 && (sb.tempo() - 140.0).abs() < 0.01;
    println!("RESULT: {}", if ok { "PASS" } else { "FAIL" });

    a.enable(false);
    b.enable(false);
}
