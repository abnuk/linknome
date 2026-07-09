# Linknome

Linknome is a small, always-on-top remote control for the **tempo** and **meter**
of an [Ableton Link](https://www.ableton.com/en/link/) session over Wi‑Fi. It's
built so you can change tempo comfortably with either a **finger** (fast big
swings *and* small precise nudges) or a **mouse**, while it floats above your
other apps.

Available for **macOS** (Intel + Apple Silicon) and **Windows**.

---

## What it does

Ableton Link keeps tempo, beat, and phase in sync across music apps on the same
local network — Ableton Live, metronomes, loopers, DJ software, and more.
Linknome joins that session as a peer and gives you a dedicated, touch-friendly
remote:

- **Tempo (BPM)** — shared globally by Link. Change it in Linknome and every app
  in the session follows. Tempo is a whole number from 20 to 300 BPM.
- **Meter (beats per bar)** — mapped to Link's *quantum* (see the
  [note on meter](#a-note-on-meter) below).

## Features

- Shuttle-style tempo control tuned for both touch and mouse
- Always-on-top, adjustable transparency, and a compact mode
- Tap tempo, direct numeric entry, keyboard and mouse-wheel control
- Live peer count and tempo updates from other Link apps
- English and Polish interface with automatic system-language detection
- Tiny footprint (~4 MB); remembers window position and settings

## Install

Download the latest installer from the
[**Releases page**](https://github.com/abnuk/linknome/releases/latest):

| Platform | File |
| --- | --- |
| macOS (Intel + Apple Silicon) | `Linknome_<version>_universal.dmg` |
| Windows | `Linknome_<version>_x64-setup.exe` (installer) or `Linknome_<version>_x64_en-US.msi` |

The builds are currently **unsigned**, so your OS will warn you on first launch:

- **macOS** — open the `.dmg`, drag Linknome to Applications, then right‑click the
  app → **Open** → **Open** (only needed the first time). If it's still blocked,
  run `xattr -cr /Applications/Linknome.app` in Terminal.
- **Windows** — run the installer; on the SmartScreen prompt click
  **More info → Run anyway**.

## Getting started

1. Connect Linknome and your other Link‑enabled app to the **same Wi‑Fi / LAN**.
2. Enable **Link** in that app (e.g. the Link toggle in Ableton Live).
3. The dot in Linknome's top‑left turns green and shows the peer count once
   connected. Now change the tempo — the other apps follow.

## Controls

### Tempo

The large number in the middle is a **shuttle** (jog) control. Press anywhere on
it and move **left / right**: the farther you push, the faster the tempo changes —
slow and precise near the middle, fast toward the edges. Right speeds up, left
slows down; a small dead zone in the center lets you hold steady. The bar at the
bottom shows the current direction and speed.

You can also set tempo with:

| Control | Action |
| --- | --- |
| **Shuttle** — drag the number left/right | Change tempo; farther = faster |
| **−​ / +** buttons | Tap = ±1 BPM; hold to auto-repeat (speeds up to ±5) |
| **Mouse wheel** over the number | ±1 BPM (Shift = ±5) |
| **↑ / ↓** arrow keys | ±1 BPM (Shift = ±5) |
| **Page Up / Page Down** | ±10 BPM |
| **TAP** button | Tap along to set the tempo |
| **Double‑click / double‑tap** the number | Type an exact value |

### Meter

The **METER** stepper sets beats per bar (1–16). This maps to Link's *quantum*,
which decides where bar 1 / the downbeat falls for phase alignment.

#### A note on meter

Ableton Link synchronizes **tempo**, but it does **not** transmit the time
signature. Changing the meter in Linknome aligns *your* phase / downbeat; it does
**not** change the meter shown in other apps. That's a Link limitation, not a
Linknome one.

### Window (top bar)

| Button | Function |
| --- | --- |
| **PL / EN** | Switch interface language |
| 📌 | Always-on-top (on by default) |
| ◐ | Cycle transparency (opaque → translucent) |
| ⤢ | Compact / full size |
| ✕ | Close |

Drag the window by its top bar. Position, size, language, transparency, and the
current tempo/meter are remembered between launches.

### Language

Linknome starts in your system language — Polish if your system is set to Polish,
otherwise English — and you can switch any time with the **PL / EN** button. The
choice is remembered.

## Requirements

- Another Ableton Link–enabled app on the same local network with Link turned on
  (Ableton Live, a Link metronome, a looper, DJ software, etc.).
- The network must allow local UDP multicast: disable "AP/client isolation" on the
  router, and allow Linknome through the firewall on first run. Two devices on the
  same real Wi‑Fi is the reliable setup.

## Build from source

**Prerequisites**

- [Rust](https://rustup.rs/) (stable) with **CMake ≥ 3.14** and a C/C++ compiler —
  the [`rusty_link`](https://crates.io/crates/rusty_link) crate compiles Ableton's
  `abl_link` library.
  - macOS: Xcode Command Line Tools (`xcode-select --install`).
  - Windows: Visual Studio 2022 Build Tools ("Desktop development with C++") + CMake.
- [Node.js](https://nodejs.org/) 22 or newer and [pnpm](https://pnpm.io/).

**Commands**

```bash
pnpm install
pnpm tauri dev      # run in development
pnpm tauri build    # build installers for the current OS
```

The app is built with [Tauri 2](https://v2.tauri.app/) (Rust backend, web
frontend) and `rusty_link`.

## Releases

Pushing a version tag builds and publishes installers automatically via GitHub
Actions (macOS universal + Windows):

```bash
git tag v0.1.0
git push origin v0.1.0
```

## License

Linknome is licensed under **GPL‑2.0‑or‑later**, because it links Ableton Link,
whose free option is GPLv2+. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
Distributing Linknome under a closed-source license would require a commercial
Ableton Link license from Ableton.
