import { useState } from 'react';

// Define FileNode type
export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
};

function FileTree({ data, onSelect }: { data: FileNode[]; onSelect: (node: FileNode) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const newSet: Set<string> = new Set(prev);
      newSet.has(name) ? newSet.delete(name) : newSet.add(name);
      return newSet;
    });
  };

  const renderNode = (node: FileNode) => {
    if (node.type === 'folder') {
      const isOpen: boolean = expanded.has(node.name);
      return (
        <div key={node.name} style={{ marginLeft: 20 }}>
          <div onClick={() => toggleExpand(node.name)} style={{ cursor: 'pointer' }}>
            {isOpen ? '📂' : '📁'} {node.name}
          </div>
          {isOpen && node.children && node.children.map(renderNode)}
        </div>
      );
    }

    return (
      <div
        key={node.name}
        style={{ marginLeft: 20, cursor: 'pointer' }}
        onClick={() => onSelect(node)}
      >
        📄 {node.name}
      </div>
    );
  };

  return <div>{data.map(renderNode)}</div>;
};

export interface WorldEditorProps {
  files: FileNode[]; // Array of file nodes
  dbKeys: string[]; // List of LevelDB keys
}

export default function WorldEditor({ files, dbKeys }: WorldEditorProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  console.log(dbKeys);

  const dbFolder: FileNode = {
    name: 'db',
    type: 'folder',
    children: dbKeys.map((key) => ({
      name: key,
      type: 'file',
      content: undefined, // Content can be dynamically fetched later
    })),
  };

  const worldData: FileNode[] = [
    ...files,
    dbFolder,
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* File Explorer */}
      <div style={{ width: '300px', borderRight: '1px solid #ccc', padding: '10px' }}>
        <h3>File Explorer</h3>
        <FileTree data={worldData} onSelect={setSelectedFile} />
      </div>

      {/* File Preview */}
      <div style={{ flex: 1, padding: '10px' }}>
        <h3>Preview</h3>
        {selectedFile ? (
          <div>
            <h4>{selectedFile.name}</h4>
            {selectedFile.content ? (
              <pre>{selectedFile.content}</pre>
            ) : (
              <p>This is a folder. Select a file to view its contents.</p>
            )}
          </div>
        ) : (
          <p>Select a file to preview its contents</p>
        )}
      </div>
    </div>
  );
};
