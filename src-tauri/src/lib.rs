use tauri::{command, generate_context, generate_handler, Builder};
use tauri_plugin_opener::init;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[command]
fn manipulate_file(content: String) -> Result<String, String> {
    // Example manipulation: reverse the file content
    let manipulated_content: String = content.chars().rev().collect::<String>();
    Ok(manipulated_content)
}

#[cfg_attr(mobile, mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(init())
        .invoke_handler(generate_handler![manipulate_file])
        .run(generate_context!())
        .expect("error while running tauri application");
}
