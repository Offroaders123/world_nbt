import { type ChangeEvent, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function ZipExtractor() {
  const [fileName, setFileName] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = event.target.files![0];
    if (file) {
      setFileName(file.name);

      // Ensure the file is a .mcworld file
      if (!file.name.endsWith('.mcworld')) {
        alert('Please upload a .mcworld file!');
        return;
      }

      // Read the file as a binary buffer
      const reader: FileReader = new FileReader();
      reader.onload = async (e) => {
        const binaryContent: Uint8Array = new Uint8Array(e.target!.result! as ArrayBuffer);

        // Send the binary content to the backend
        try {
          const extractedFiles: File[] = await invoke<File[]>('extract_zip', { zipData: Array.from(binaryContent) });
          setFiles(extractedFiles);
        } catch (error) {
          console.error('Error invoking Rust command:', error);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div>
      <h1>Zip Extractor</h1>
      <input type="file" onChange={handleFileChange} />
      <p>Selected File: {fileName}</p>
      <h2>Extracted Files</h2>
      <ul>
        {files.map((file, index) => (
          <li key={index}>
            <strong>{file.name}</strong> ({file.size} bytes)
          </li>
        ))}
      </ul>
    </div>
  );
}
