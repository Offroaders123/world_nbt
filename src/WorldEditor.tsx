import { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

// Define FileNode type
export type NodeEntry = NodeDirectory | NodeFile;

export interface NodeDirectory {
  name: string;
  type: 'directory';
  children: NodeEntries; // For directories
};

export type NodeEntries = NodeEntry[];

export type NodeFiles = NodeFile[];

export interface NodeFile {
  name: string;
  type: 'file';
  size: number; // For files only
};

function FileTree({ data, onSelect }: { data: NodeEntries; onSelect: (node: NodeEntry) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => {
      const newSet: Set<string> = new Set(prev);
      newSet.has(name) ? newSet.delete(name) : newSet.add(name);
      return newSet;
    });
  }, []);

  const renderNode = useCallback((node: NodeEntry, parentPath = '') => {
    const fullPath: string = `${parentPath}/${node.name}`; // Full path for unique identification
    if (node.type === 'directory') {
      const isOpen: boolean = expanded.has(fullPath);
      return (
        <div key={fullPath} style={{ marginLeft: 20 }}>
          <div onClick={() => toggleExpand(fullPath)} style={{ cursor: 'pointer' }}>
            {isOpen ? '📂' : '📁'} {node.name}
          </div>
          {isOpen && node.children && node.name === 'db' ? (
            <DbFolder children={node.children} onSelect={onSelect} />
          ) : (
            isOpen && node.children && node.children.map((child) => renderNode(child, fullPath))
          )}
        </div>
      );
    }

    return (
      <div
        key={fullPath}
        style={{ marginLeft: 20, cursor: 'pointer' }}
        onClick={() => onSelect(node)}
      >
        📄 {node.name}
      </div>
    );
  }, [expanded]);

  return <div>{data.map((node) => renderNode(node))}</div>;
};

interface DbFolderProps {
  children: NodeEntries;
  onSelect: (node: NodeEntry) => void;
}

function DbFolder({ children = [], onSelect }: DbFolderProps) {
  // Entry height for the react-window list
  const itemHeight: number = 30;

  return (
    <List
      height={200} // Adjust this based on your UI
      itemCount={children.length}
      itemSize={itemHeight}
      width="100%"
    >
      {({ index, style }) => {
        const node: NodeEntry = children[index]!;
        return (
          <div
            key={node.name}
            style={{
              ...style,
              marginLeft: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => onSelect(node)}
          >
            📄 {node.name}
          </div>
        );
      }}
    </List>
  );
};

export interface WorldEditorProps {
  files: NodeEntries; // Array of file nodes
  dbKeys: NodeFiles; // List of LevelDB keys
}

export default function WorldEditor({ files = [], dbKeys = [] }: WorldEditorProps) {
  const [selectedFile, setSelectedFile] = useState<NodeEntry | null>(null);
  const [worldData, setWorldData] = useState<NodeEntries>([]);

  // console.log(dbKeys);

  // Memoize the dbFolder to ensure it only updates when dbKeys changes
  const dbFolder: NodeEntry = useMemo<NodeEntry>((): NodeEntry => {
    return {
    name: 'db',
    type: 'directory',
    children: dbKeys,
    };
  }, [dbKeys]);

  useEffect(() => {
    // Combine files and dbFolder into worldData, but only if there's a change
    const newWorldData: NodeEntries = [...files.filter(entry => entry.name !== "db"), dbFolder];
    if (JSON.stringify(newWorldData) !== JSON.stringify(worldData)) {
      setWorldData(newWorldData);
    }

    console.log(newWorldData);
  }, [files, dbFolder, worldData]);

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
            {"size" in selectedFile ? (
              <pre>{selectedFile.size} bytes</pre>
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
