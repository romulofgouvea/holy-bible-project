const DISABLE_CONTEXT_MENU: &str =
    "document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, true);";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = tauri::Manager::get_webview_window(app, "main") {
                let _ = window.set_icon(tauri::include_image!("icons/128x128@2x.png"));
            }
            Ok(())
        })
        .on_page_load(|webview, _payload| {
            let _ = webview.eval(DISABLE_CONTEXT_MENU);
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o aplicativo");
}
