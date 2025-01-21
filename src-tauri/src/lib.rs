use std::env::temp_dir;
use std::fs::{create_dir_all, read_dir, DirEntry, File};
use std::io::{copy, Cursor};
use std::path::{Path, PathBuf};

use rusty_leveldb::{DBIterator, LdbIterator, Options, DB};
use serde::Serialize;
use tauri::{command, generate_context, generate_handler, Builder};
use tauri_plugin_opener::init;
use zip::read::{ZipArchive, ZipFile};

#[derive(Serialize)]
struct GUIFile {
    name: String,
    size: usize,
    content: Vec<u8>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[command]
fn extract_zip(zip_data: Vec<u8>) -> Result<Vec<GUIFile>, String> {
    // Create a cursor for the zip data
    let cursor: Cursor<Vec<u8>> = Cursor::new(zip_data);

    // Open the zip archive
    let mut archive: ZipArchive<Cursor<Vec<u8>>> = match ZipArchive::new(cursor) {
        Ok(archive) => archive,
        Err(err) => return Err(format!("Failed to read zip archive: {}", err)),
    };

    // Create a temporary directory to extract the files
    let temp_dir: PathBuf = temp_dir();
    // .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    let temp_path: &Path = temp_dir.as_path();

    // Extract files
    for i in 0..archive.len() {
        let mut file: ZipFile<'_> = match archive.by_index(i) {
            Ok(file) => file,
            Err(err) => return Err(format!("Failed to access file in archive: {}", err)),
        };

        let out_path: PathBuf = temp_path.join(file.name());
        if file.is_dir() {
            create_dir_all(&out_path).map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(parent) = out_path.parent() {
                create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
            }
            let mut outfile: File =
                File::create(&out_path).map_err(|e| format!("Failed to create file: {}", e))?;
            copy(&mut file, &mut outfile).map_err(|e| format!("Failed to write file: {}", e))?;
        }
    }

    // Locate the LevelDB directory (e.g., "db")
    let leveldb_path: PathBuf = temp_path.join("db");
    if !leveldb_path.exists() {
        return Err("LevelDB directory not found in the archive.".into());
    }

    // Open the LevelDB database
    let mut db: DB = DB::open(&leveldb_path, Options::default())
        .map_err(|e| format!("Failed to open LevelDB: {}", e))?;

    let mut iterator: DBIterator = db.new_iter().expect("Could not create database iterator");
    iterator.seek_to_first();

    // Log the keys
    while iterator.valid() {
        let (key, _): (Vec<u8>, Vec<u8>) = match iterator.next() {
            Some(entry) => entry,
            None => break,
        };
        println!("Key: {}", String::from_utf8_lossy(&key));
    }

    // Close the database
    // db.close();
    drop(db);

    // Collect file information (if required)
    let mut files: Vec<GUIFile> = Vec::new();
    for entry in read_dir(temp_path).map_err(|e| format!("Failed to read temp directory: {}", e))? {
        let entry: DirEntry =
            entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path: PathBuf = entry.path();
        if path.is_file() {
            let name: String = path.file_name().unwrap().to_string_lossy().to_string();
            let size: usize = path
                .metadata()
                .map_err(|e| format!("Failed to get file metadata: {}", e))?
                .len() as usize;
            files.push(GUIFile {
                name,
                size,
                content: vec![], // Skipping content for now
            });
        }
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
