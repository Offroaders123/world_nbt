import { type ChangeEvent, type ChangeEventHandler, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WorldEditor, { type FileNode } from './WorldEditor';

export interface ExtractionResult {
  files: ExtractedFile[];
  db_keys: string[];
}

export interface ExtractedFile {
  name: string;
  size: number;
}

export default function FileExtractor() {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [dbKeys, setDbKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure dbKeys and files are always defined
    setFiles([]);
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

        setFiles(result.files || []); // Ensure it's always an array
        setDbKeys(result.db_keys || []); // Ensure it's always an array
        setError(null);
      } catch (err) {
        setError("Failed to process the file.");
        setFiles([]);
        setDbKeys([]);
      }
    }
  };

  const fileNodes: FileNode[] = files.map((file) => ({
    name: file.name,
    type: 'file',
    content: `${file.size} bytes`, // Placeholder content
  }));

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
