//! Native touch-drag for the window on Windows.
//!
//! WebView2 doesn't let touch drive the OS window-move loop — `startDragging`
//! (WM_NCLBUTTONDOWN) and WM_SYSCOMMAND/SC_MOVE both ignore touch (see
//! tauri-apps/tauri#4746, MicrosoftEdge/WebView2Feedback#2243), and computing
//! the move in JS from webview coordinates suffers a feedback loop (moving the
//! window shifts the reported pointer position). Instead, when a touch/pen drag
//! starts, we read the OS cursor position from a Rust thread — Windows promotes
//! the primary touch contact to the cursor — and reposition the window to
//! follow it until the contact is released. The OS cursor is unaffected by the
//! window moving, so there's no feedback loop.

#[tauri::command]
pub fn start_touch_drag(window: tauri::Window) {
    #[cfg(target_os = "windows")]
    imp::run(window);
    #[cfg(not(target_os = "windows"))]
    let _ = window;
}

#[cfg(target_os = "windows")]
mod imp {
    use std::time::Duration;
    use tauri::{PhysicalPosition, Window};
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    const VK_LBUTTON: i32 = 0x01;

    pub fn run(window: Window) {
        std::thread::spawn(move || {
            let mut start = POINT::default();
            if unsafe { GetCursorPos(&mut start) }.is_err() {
                return;
            }
            let origin = match window.outer_position() {
                Ok(p) => p,
                Err(_) => return,
            };
            // Follow the cursor while the (touch-promoted) left button is held.
            loop {
                let held = unsafe { GetAsyncKeyState(VK_LBUTTON) } < 0;
                if !held {
                    break;
                }
                let mut cur = POINT::default();
                if unsafe { GetCursorPos(&mut cur) }.is_err() {
                    break;
                }
                let nx = origin.x + (cur.x - start.x);
                let ny = origin.y + (cur.y - start.y);
                let _ = window.set_position(PhysicalPosition::new(nx, ny));
                std::thread::sleep(Duration::from_millis(8));
            }
        });
    }
}
