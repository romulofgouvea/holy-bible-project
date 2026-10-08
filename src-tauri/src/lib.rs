const DISABLE_CONTEXT_MENU: &str =
    "document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, true);";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_page_load(|webview, _payload| {
            let _ = webview.eval(DISABLE_CONTEXT_MENU);
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o aplicativo");
}
