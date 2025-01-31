import { type ChangeEvent, type ChangeEventHandler, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WorldEditor, { type NodeDirectory, type NodeFile, type NodeEntry } from './WorldEditor';

export interface ExtractionResult {
  root: DirChildren;
  db_keys: ExtractedFile[];
}

export type ExtractedEntry = ExtractedDirectory | ExtractedFile;

export interface ExtractedDirectory {
  name: string;
  type: 'directory';
  children: DirChildren;
}

export type DirChildren = ExtractedEntry[];

export interface ExtractedFile {
  name: string;
  type: 'file';
  size: number;
}

export function WorldPathViewer() {
  const [files, setFiles] = useState<DirChildren | null>(null);
  const [dbKeys, setDbKeys] = useState<ExtractedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // console.log(files);

  const fileNodes: NodeEntry[] = convertToNodes(files);
  const dbNodes: NodeFile[] = dbKeys.map(({ name, size }): NodeFile => ({
    name,
    type: 'file',
    size
  }));

  return (
    <div>
      <h1>Open World Path</h1>
      {/* <input type="file" onInput={handleFileChange} accept=".mcworld" /> */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Pass default empty arrays if dbKeys or files aren't ready */}
      <WorldEditor files={fileNodes} dbKeys={dbNodes} />
    </div>
  );
}

export default function MCWorldViewer() {
  const [files, setFiles] = useState<DirChildren | null>(null);
  const [dbKeys, setDbKeys] = useState<ExtractedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = event.target.files![0];
    if (file) {
      try {
        const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
        const result: ExtractionResult = await open_mcworld(arrayBuffer);

        console.log(result);

        setFiles(result.root);
        setDbKeys(result.db_keys);
        setError(null);
      } catch (err) {
        setError(`Failed to process the file: ${err}`);
        console.error(err);
        setFiles(null);
        setDbKeys([]);
      }
    }
  }, []);

  // console.log(files);

  const fileNodes: NodeEntry[] = convertToNodes(files);
  const dbNodes: NodeFile[] = dbKeys.map(({ name, size }): NodeFile => ({
    name,
    type: 'file',
    size
  }));

  return (
    <div>
      <h1>Open MCWorld</h1>
      <input type="file" onInput={handleFileChange} accept=".mcworld" />
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Pass default empty arrays if dbKeys or files aren't ready */}
      <WorldEditor files={fileNodes} dbKeys={dbNodes} />
    </div>
  );
}

function convertToNodes(files: DirChildren | null): NodeEntry[] {
  if (!files) return [];
  return files.map((file): NodeEntry => 'children' in file ?
    {
      name: file.name,
      type: 'directory',
      children: convertToNodes(file.children), // Recursively process directories
    } satisfies NodeDirectory :
    {
      name: file.name,
      type: 'file',
      size: file.size, // Directories don't have content
    } satisfies NodeFile
  );
}

/**
 * Only usable in a Tauri context, will reject otherwise.
 */
async function open_world_path(path: string): Promise<ExtractionResult> {
  return await invoke<ExtractionResult>("open_world_path", {
    worldPath: path
  })
}

/**
 * Only usable in a Tauri context, will reject otherwise.
 */
async function open_mcworld(arrayBuffer: ArrayBuffer): Promise<ExtractionResult> {
  return await invoke<ExtractionResult>("open_mcworld", {
    zipData: Array.from(new Uint8Array(arrayBuffer))
  })
}
