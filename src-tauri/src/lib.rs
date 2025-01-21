use serde::Serialize;
use std::io::{Cursor, Read};
use tauri::{command, generate_context, generate_handler, Builder};
use tauri_plugin_opener::init;
use zip::read::{ZipArchive, ZipFile};

#[derive(Serialize)]
struct File {
    name: String,
    size: usize,
    content: Vec<u8>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[command]
fn extract_zip(zip_data: Vec<u8>) -> Result<Vec<File>, String> {
    // Create a cursor for the zip data
    let cursor: Cursor<Vec<u8>> = Cursor::new(zip_data);

    // Open the zip archive
    let mut archive: ZipArchive<Cursor<Vec<u8>>> = match ZipArchive::new(cursor) {
        Ok(archive) => archive,
        Err(err) => return Err(format!("Failed to read zip archive: {}", err)),
    };

    // Extract files
    let mut files: Vec<File> = Vec::new();
    for i in 0..archive.len() {
        let mut file: ZipFile<'_> = match archive.by_index(i) {
            Ok(file) => file,
            Err(err) => return Err(format!("Failed to access file in archive: {}", err)),
        };

        let mut content: Vec<u8> = Vec::new();
        if let Err(err) = file.read_to_end(&mut content) {
            return Err(format!("Failed to read file content: {}", err));
        }

        files.push(File {
            name: file.name().to_string(),
            size: content.len(),
            content,
        });
    }

    Ok(files)
}

#[cfg_attr(mobile, mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(init())
        .invoke_handler(generate_handler![extract_zip])
        .run(generate_context!())
        .expect("error while running tauri application");
}
