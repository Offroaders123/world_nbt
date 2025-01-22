import { type ChangeEvent, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface ExtractionResult {
  files: ExtractedFile[];
  db_keys: string[];
}

export interface ExtractedFile {
  name: string;
  size: number;
}

export default function FileExtractor() {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [dbKeys, setDbKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = event.target.files![0];
    if (file) {
      try {
        const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
        const result: ExtractionResult = await invoke<ExtractionResult>("extract_zip", {
          zipData: Array.from(new Uint8Array(arrayBuffer))
        });

        setFiles(result.files);
        setDbKeys(result.db_keys);
        setError(null);
      } catch (err) {
        setError("Failed to process the file.");
      }
    }
  };

  return (
    <div>
      <h1>Zip Extractor</h1>
      <input type="file" onChange={handleFileChange} accept=".zip" />
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Files in Archive:</h2>
      <ul>
        {files.map((file, index) => (
          <li key={index}>
            {file.name} ({file.size} bytes)
          </li>
        ))}
      </ul>

      <h2>LevelDB Keys:</h2>
      <ul>
        {dbKeys.map((key, index) => (
          <li key={index}>{key}</li>
        ))}
      </ul>
    </div>
  );
}
