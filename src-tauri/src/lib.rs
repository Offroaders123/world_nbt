use tauri::{command, generate_context, generate_handler, Builder};
use tauri_plugin_opener::init;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(init())
        .invoke_handler(generate_handler![greet])
        .run(generate_context!())
        .expect("error while running tauri application");
}
