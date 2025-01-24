import { type ChangeEvent, type ChangeEventHandler, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WorldEditor, { type FileNode } from './WorldEditor';

export interface ExtractionResult {
  root: ExtractedDirectory;
  db_keys: string[];
}

export type ExtractedEntry = ExtractedDirectory | ExtractedFile;

export interface ExtractedDirectory {
  name: string;
  children: ExtractedEntry[];
}

export interface ExtractedFile {
  name: string;
  size: number;
}

export default function FileExtractor() {
  const [files, setFiles] = useState<ExtractedDirectory | null>(null);
  const [dbKeys, setDbKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure dbKeys and files are always defined
    setFiles(null);
    setDbKeys([]);
  }, []);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = event.target.files![0];
    if (file) {
      try {
        const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
        const result: ExtractionResult = await invoke<ExtractionResult>("extract_zip", {
          zipData: Array.from(new Uint8Array(arrayBuffer))
        });

        console.log(result);

        setFiles(result.root || []); // Ensure it's always an array
        setDbKeys(result.db_keys || []); // Ensure it's always an array
        setError(null);
      } catch (err) {
        setError("Failed to process the file.");
        setFiles(null);
        setDbKeys([]);
      }
    }
  };

  const convertToNodes = (files: ExtractedDirectory | null): FileNode[] => {
    if (!files) return [];
    return files.children.map((file) => ({
    name: file.name,
    type: 'children' in file ? 'directory' : 'file',
    content: 'children' in file ? undefined : `${file.size} bytes`, // Directories don't have content
    children: 'children' in file ? convertToNodes(file) : undefined, // Recursively process directories
  }));
  };

  console.log(files);

  const fileNodes: FileNode[] = convertToNodes(files);

  return (
    <div>
      <h1>Zip Extractor</h1>
      <input type="file" onInput={handleFileChange} accept=".mcworld" />
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Pass default empty arrays if dbKeys or files aren't ready */}
      <WorldEditor files={fileNodes} dbKeys={dbKeys} />
    </div>
  );
}
