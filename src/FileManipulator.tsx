import { type ChangeEvent, type ChangeEventHandler, useState } from 'react';
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
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [dbKeys, setDbKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = event.target.files![0];
    if (file) {
      try {
        const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
        const result: ExtractionResult = await invoke<ExtractionResult>("extract_zip", {
          zipData: Array.from(new Uint8Array(arrayBuffer))
        });

        console.log(result);

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
      <input type="file" onInput={handleFileChange} accept=".mcworld" />
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Files in Archive:</h2>
      <pre>
        <ul>
          {files.map((file, index) => (
            <li key={index}>
              {file.name} ({file.size} bytes)
            </li>
          ))}
        </ul>
      </pre>

      <h2>LevelDB Keys:</h2>
      <pre>
        <ul>
          {dbKeys.map((key, index) => (
            <li key={index}>{key}</li>
          ))}
        </ul>
      </pre>
    </div>
  );
}
