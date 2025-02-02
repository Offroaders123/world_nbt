import { type ChangeEvent, type ChangeEventHandler, useState, useCallback, type MouseEvent, type MouseEventHandler } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import WorldEditor, { type NodeDirectory, type NodeFile, type NodeEntry, type NodeEntries } from './WorldEditor';

export interface ExtractionResult {
  root: NodeEntries;
  db_keys: NodeFile[];
}

export default function PickerViewer() {
  const [archivePickerEnabled, setArchivePickerEnabled] = useState<boolean>(false);
  const [files, setFiles] = useState<NodeEntries>([]);
  const [dbKeys, setDbKeys] = useState<NodeFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handlePathPicker: MouseEventHandler<HTMLButtonElement> = useCallback(async (_event: MouseEvent<HTMLButtonElement>) => {
    try {
      const selectedPath: string | null = await open({
        directory: true, // Ensures only directories can be selected
        multiple: false, // Single directory selection
      });

      if (selectedPath === null) return;

      console.log("Selected directory:", selectedPath);

      // Send the path to Rust backend for processing
      const result: ExtractionResult = await open_world_path(selectedPath);

      console.log(result);

      setFiles(result.root);
      setDbKeys(result.db_keys);
      setError(null);
    } catch (err) {
      setError(`Failed to process the file: ${err}`);
      console.error(err);
      setFiles([]);
      setDbKeys([]);
    }
  }, []);

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
        setFiles([]);
        setDbKeys([]);
      }
    }
  }, []);

  // console.log(files);

  const fileNodes: NodeEntry[] = files.map(convertToNode);
  const dbNodes: NodeFile[] = dbKeys.map(({ name, size }): NodeFile => ({
    name,
    type: 'file',
    size
  }));

  return (
    <div>
      <label>
        <input
          type='checkbox'
          checked={archivePickerEnabled}
          onChange={event => setArchivePickerEnabled(event.currentTarget.checked)}
        />
        MCWorld picker
      </label>
      {
        archivePickerEnabled ? (
          <>
            <h1>Open MCWorld</h1>
            <input type="file" onInput={handleFileChange} accept=".mcworld" />
          </>
        )
          : (
            <>
              <h1>Open World Path</h1>
              <button onClick={handlePathPicker}>Choose world path</button>
            </>
          )
      }
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Pass default empty arrays if dbKeys or files aren't ready */}
      <WorldEditor files={fileNodes} dbKeys={dbNodes} />
    </div>
  );
}

function convertToNode(file: NodeEntry): NodeEntry {
  return 'children' in file ?
    {
      name: file.name,
      type: 'directory',
      children: file.children.map(convertToNode), // Recursively process directories
    } satisfies NodeDirectory :
    {
      name: file.name,
      type: 'file',
      size: file.size, // Directories don't have content
    } satisfies NodeFile;
}

/**
 * Only usable in a Tauri context, will reject otherwise.
 */
async function open_world_path(path: string): Promise<ExtractionResult> {
  return await invoke<ExtractionResult>("open_world_path", {
    path
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
