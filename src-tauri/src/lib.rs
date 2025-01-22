mod mojang_options;

use std::fs::{create_dir_all, File};
use std::io::{copy, Cursor};
use std::path::{Path, PathBuf};

use crate::mojang_options::mojang_options;
use rusty_leveldb::{DBIterator, LdbIterator, Options, DB};
use serde::Serialize;
use tauri::{command, generate_context, generate_handler, Builder};
use tauri_plugin_opener::init;
use tempfile::{tempdir, TempDir};
use zip::read::{ZipArchive, ZipFile};

#[derive(Serialize)]
struct ExtractionResult {
    files: Vec<ExtractedFile>,
    db_keys: Vec<String>,
}

#[derive(Serialize)]
struct ExtractedFile {
    name: String,
    size: usize,
}

#[command]
fn extract_zip(zip_data: Vec<u8>) -> Result<ExtractionResult, String> {
    // Create a cursor for the zip data
    let cursor: Cursor<Vec<u8>> = Cursor::new(zip_data);

    // Open the zip archive
    let mut archive: ZipArchive<Cursor<Vec<u8>>> = match ZipArchive::new(cursor) {
        Ok(archive) => archive,
        Err(err) => return Err(format!("Failed to read zip archive: {}", err)),
    };

    // Create a temporary directory to extract the files
    let temp_dir: TempDir =
        tempdir().map_err(|e| format!("Failed to create temp directory: {}", e))?;
    let temp_path: &Path = temp_dir.path();

    // Prepare result containers
    let mut files: Vec<ExtractedFile> = Vec::new();
    let mut db_keys: Vec<String> = Vec::new();

    // Extract files
    for i in 0..archive.len() {
        let mut file: ZipFile<'_> = match archive.by_index(i) {
            Ok(file) => file,
            Err(err) => return Err(format!("Failed to access file in archive: {}", err)),
        };

        let file_name: String = file.name().to_string();

        if file.is_dir() {
            continue; // Skip directories
        }

        // Collect file metadata
        let size: usize = file.size() as usize;

        files.push(ExtractedFile {
            name: file_name.clone(),
            size,
        });

        // Extract the file
        let out_path: PathBuf = temp_path.join(&file_name);

        if let Some(parent) = out_path.parent() {
            create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        let mut outfile: File =
            File::create(&out_path).map_err(|e| format!("Failed to create file: {}", e))?;

        copy(&mut file, &mut outfile).map_err(|e| format!("Failed to write file: {}", e))?;
    }

    // Locate the LevelDB directory (e.g., "db")
    let leveldb_path: PathBuf = temp_path.join("db");
    if !leveldb_path.exists() {
        db_keys.push("LevelDB directory not found in the archive.".into());
    }

    let mut options: Options = mojang_options();
    options.create_if_missing = false;

    // Open the LevelDB database
    let mut db: DB =
        DB::open(&leveldb_path, options).map_err(|e| format!("Failed to open LevelDB: {}", e))?;

    let mut iterator: DBIterator = db.new_iter().expect("Could not create database iterator");
    iterator.seek_to_first();

    // Log the keys
    while iterator.valid() {
        let (key, _): (Vec<u8>, Vec<u8>) = match iterator.next() {
            Some(entry) => entry,
            None => break,
        };
        let key_string: String = String::from_utf8(key.clone())
            .map_err(|err| err.to_string())
            .and_then(|utf8_string| {
                if utf8_string.is_ascii() {
                    Ok(utf8_string)
                } else {
                    Err("Not an ASCII key".to_string())
                }
            })
            .unwrap_or_else(|_| {
                let hex_string: String = key.iter().map(|byte| format!("{:02x?}", byte)).collect();
                format!("0x{}", hex_string)
            });
        db_keys.push(key_string);
    }

    // Close the database
    drop(db);

    // Return the result
    Ok(ExtractionResult { files, db_keys })
}

#[cfg_attr(mobile, mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(init())
        .invoke_handler(generate_handler![extract_zip])
        .run(generate_context!())
        .expect("error while running tauri application");
}
