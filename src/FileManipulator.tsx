import { type ChangeEvent, type ChangeEventHandler, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WorldEditor, { type NodeDirectory, type NodeFile, type NodeEntry } from './WorldEditor';

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

        // These need to be corrected or removed
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

  const convertToNodes = (files: ExtractedDirectory | null): NodeEntry[] => {
    if (!files) return [];
    return files.children.map((file): NodeEntry => 'children' in file ?
  {
    name: file.name,
    type: 'directory',
    children: convertToNodes(file), // Recursively process directories
  } satisfies NodeDirectory :
  {
    name: file.name,
    type: 'file',
    content: `${file.size} bytes`, // Directories don't have content
  } satisfies NodeFile
);
  };

  // console.log(files);

  const fileNodes: NodeEntry[] = convertToNodes(files);

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
