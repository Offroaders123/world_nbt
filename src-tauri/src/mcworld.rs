use std::fs::{create_dir_all, File};
use std::io::{copy, Cursor};
use std::path::{Path, PathBuf};

use crate::mojang_options::mojang_options;
use rusty_leveldb::{DBIterator, LdbIterator, Options, DB};
use serde::Serialize;
use tauri::command;
use tempfile::{tempdir, TempDir};
use zip::read::{ZipArchive, ZipFile};

#[derive(Serialize)]
pub struct ExtractionResult {
    root: DirChildren,
    db_keys: Vec<ExtractedFile>,
}

type DirChildren = Vec<ExtractedEntry>;

#[derive(Serialize)]
struct ExtractedDirectory {
    name: String,
    children: DirChildren,
}

#[derive(Serialize)]
#[serde(tag = "type")]
#[serde(rename_all = "snake_case")]
enum ExtractedEntry {
    File(ExtractedFile),
    Directory(ExtractedDirectory),
}

#[derive(Serialize)]
struct ExtractedFile {
    name: String,
    size: usize,
}

fn read_zip(zip_data: Vec<u8>) -> Result<ZipArchive<Cursor<Vec<u8>>>, String> {
    // Create a cursor for the zip data
    let cursor: Cursor<Vec<u8>> = Cursor::new(zip_data);

    // Open the zip archive
    match ZipArchive::new(cursor) {
        Ok(archive) => Ok(archive),
        Err(err) => Err(format!("Failed to read zip archive: {}", err)),
    }
}

#[command]
pub fn open_mcworld(zip_data: Vec<u8>) -> Result<ExtractionResult, String> {
    // Open the zip archive
    let mut archive: ZipArchive<Cursor<Vec<u8>>> = read_zip(zip_data)?;

    // Create a temporary directory to extract the files
    let temp_dir: TempDir =
        tempdir().map_err(|e| format!("Failed to create temp directory: {}", e))?;
    let temp_path: &Path = temp_dir.path();

    // Use a root directory to build the tree
    let mut root: DirChildren = Vec::new();

    let mut db_keys: Vec<ExtractedFile> = Vec::new();

    // Extract files
    for i in 0..archive.len() {
        let mut file: ZipFile<'_> = match archive.by_index(i) {
            Ok(file) => file,
            Err(err) => return Err(format!("Failed to access file in archive: {}", err)),
        };

        let file_name: String = file.name().to_string();
        let path_parts: Vec<&str> = file_name.split('/').collect(); // Split path by directory separators

        if file.is_dir() {
            continue; // Skip directories
        }

        // Collect file metadata
        let size: usize = file.size() as usize;

        let file_entry: ExtractedEntry = ExtractedEntry::File(ExtractedFile {
            name: path_parts.last().unwrap().to_string(),
            size,
        });

        // Insert the file into the directory structure
        insert_entry(&mut root, &path_parts, file_entry);

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

    let mut options: Options = mojang_options();
    options.create_if_missing = false;

    // Open the LevelDB database
    let mut db: DB =
        DB::open(&leveldb_path, options).map_err(|e| format!("Failed to open LevelDB: {}", e))?;

    let mut iterator: DBIterator = db.new_iter().expect("Could not create database iterator");
    iterator.seek_to_first();

    // Log the keys
    while iterator.valid() {
        let (key, value): (Vec<u8>, Vec<u8>) = match iterator.next() {
            Some(entry) => entry,
            None => break,
        };
        let key_string: String = String::from_utf8(key.clone())
            .map_err(|err| err.to_string())
            .and_then(|utf8_string| {
                if utf8_string
                    .chars()
                    .all(|char| char.is_ascii_alphanumeric() || char.is_ascii_punctuation())
                {
                    Ok(utf8_string)
                } else {
                    Err("Not an ASCII key".to_string())
                }
            })
            .unwrap_or_else(|_| {
                let hex_string: String = key.iter().map(|byte| format!("{:02x?}", byte)).collect();
                format!("0x{}", hex_string)
            });
        let size: usize = value.len();
        db_keys.push(ExtractedFile {
            name: key_string,
            size,
        });
    }

    // Close the database
    drop(db);

    // Return the result
    Ok(ExtractionResult { root, db_keys })
}

// Helper function to insert an entry into the directory structure
fn insert_entry(dir: &mut DirChildren, path_parts: &[&str], entry: ExtractedEntry) -> () {
    if path_parts.is_empty() {
        return;
    }
    let current_part: &str = path_parts[0];
    if path_parts.len() == 1 {
        // Base case: Add the file or directory
        dir.push(entry);
    } else {
        // Recursive case: Find or create the subdirectory
        if let Some(ExtractedEntry::Directory(sub_dir)) = dir
            .iter_mut()
            .find(|e| matches!(e, ExtractedEntry::Directory(d) if d.name == current_part))
        {
            insert_entry(&mut sub_dir.children, &path_parts[1..], entry);
        } else {
            let mut new_dir: ExtractedDirectory = ExtractedDirectory {
                name: current_part.to_string(),
                children: Vec::new(),
            };
            insert_entry(&mut new_dir.children, &path_parts[1..], entry);
            dir.push(ExtractedEntry::Directory(new_dir));
        }
    }
}
