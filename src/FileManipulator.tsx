import { type ChangeEvent, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function FileManipulator() {
  const [fileName, setFileName] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = event.target.files![0];
    if (file) {
      setFileName(file.name);

      // Read the file as text (or ArrayBuffer if binary)
      const reader: FileReader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target!.result;

        // Send the content to the Rust backend
        try {
          const manipulatedContent: string = await invoke<string>('manipulate_file', { content });
          setResult(manipulatedContent);
        } catch (error) {
          console.error('Error invoking Rust command:', error);
        }
      };
      reader.readAsText(file); // Or `reader.readAsArrayBuffer(file)` for binary files
    }
  };

  return (
    <div>
      <h1>File Manipulator</h1>
      <input type="file" onChange={handleFileChange} />
      <p>Selected File: {fileName}</p>
      <h2>Manipulated Content</h2>
      <pre>{result}</pre>
    </div>
  );
}
