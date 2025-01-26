import { type ChangeEvent, type ChangeEventHandler, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WorldEditor, { type NodeDirectory, type NodeFile, type NodeEntry } from './WorldEditor';

export interface ExtractionResult {
  root: Omit<ExtractedDirectory, "type">;
  db_keys: ExtractedFile[];
}

export type ExtractedEntry = ExtractedDirectory | ExtractedFile;

export interface ExtractedDirectory {
  name: string;
  type: 'directory';
  children: ExtractedEntry[];
}

export interface ExtractedFile {
  name: string;
  type: 'file';
  size: number;
}

export default function FileExtractor() {
  const [files, setFiles] = useState<ExtractedDirectory | null>(null);
  const [dbKeys, setDbKeys] = useState<ExtractedFile[]>([]);
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
        const result: ExtractionResult = await extract_zip(arrayBuffer);

        console.log(result);

        setFiles({ ...result.root, type: "directory" });
        setDbKeys(result.db_keys);
        setError(null);
      } catch (err) {
        setError(`Failed to process the file: ${err}`);
        console.error(err);
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
    size: file.size, // Directories don't have content
  } satisfies NodeFile
);
  };

  // console.log(files);

  const fileNodes: NodeEntry[] = convertToNodes(files);
  const dbNodes: NodeFile[] = dbKeys.map(({ name, size }): NodeFile => ({
    name,
    type: 'file',
    size
  }));

  return (
    <div>
      <h1>Zip Extractor</h1>
      <input type="file" onInput={handleFileChange} accept=".mcworld" />
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Pass default empty arrays if dbKeys or files aren't ready */}
      <WorldEditor files={fileNodes} dbKeys={dbNodes} />
    </div>
  );
}

/**
 * Only usable in a Tauri context, will reject otherwise.
 */
async function extract_zip(arrayBuffer: ArrayBuffer): Promise<ExtractionResult> {
  return await invoke<ExtractionResult>("extract_zip", {
    zipData: Array.from(new Uint8Array(arrayBuffer))
  })
}
