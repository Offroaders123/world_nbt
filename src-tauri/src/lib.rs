mod mcworld;
mod mojang_options;

use crate::mcworld::{open_mcworld, open_world_path};
use tauri::{generate_context, generate_handler, Builder};

#[cfg_attr(mobile, mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(generate_handler![open_world_path, open_mcworld])
        .run(generate_context!())
        .expect("error while running tauri application");
}
