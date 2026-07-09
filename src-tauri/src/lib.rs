mod link;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Remembers the window position & size across launches.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // Build the Ableton Link peer, store it as managed state, then
            // start the watcher thread that emits tempo/peer change events.
            let link = link::build_link();
            app.manage(link::AppState {
                link: std::sync::Mutex::new(link),
                quantum: std::sync::Mutex::new(4.0),
            });
            link::spawn_watcher(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            link::set_tempo,
            link::nudge_tempo,
            link::set_quantum,
            link::get_state,
            link::toggle_link_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Linknome");
}
