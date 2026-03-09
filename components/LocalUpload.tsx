'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import { RepoFile } from './GithubInput';

interface Props {
  onRepoLoaded: (files: RepoFile[], owner: string, repo: string, data: Record<string, unknown>) => void;
  isLoading: boolean;
}

const EXTENSION_TO_LANG: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
};

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', '.idea', '.vscode']);
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB max per file to avoid locking up browser

const getLanguageFromPath = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext ? EXTENSION_TO_LANG[ext] || 'text' : 'text';
};

const isAnalyzable = (path: string) => {
  // Only allow code files in our supported list
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return Object.keys(EXTENSION_TO_LANG).includes(ext);
};

export default function LocalUpload({ onRepoLoaded, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    if (fileList.length === 0) return;
    setError('');
    setLoading(true);

    try {
      const validFiles: File[] = [];
      const skippedCount = { dirs: 0, size: 0, unsupported: 0 };

      // Convert to array and filter
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // Skip ignored directories
        const pathParts = (file.webkitRelativePath || file.name).split('/');
        if (pathParts.some(part => IGNORED_DIRS.has(part))) {
          skippedCount.dirs++;
          continue;
        }

        // Skip massive files
        if (file.size > MAX_FILE_SIZE) {
          skippedCount.size++;
          continue;
        }

        // Keep analyzable files
        if (isAnalyzable(file.name)) {
          validFiles.push(file);
        } else {
          skippedCount.unsupported++;
        }
      }

      if (validFiles.length === 0) {
        setError(`No readable code files found. (Skipped ${skippedCount.dirs} ignored dirs, ${skippedCount.size} oversized, ${skippedCount.unsupported} unsupported)`);
        setLoading(false);
        return;
      }

      // We only analyze up to 60 files to save tokens/memory in browser
      const filesToProcess = validFiles.slice(0, 60);
      const repoFiles: RepoFile[] = [];

      for (const file of filesToProcess) {
        try {
          const content = await file.text();
          repoFiles.push({
            path: file.webkitRelativePath || file.name,
            language: getLanguageFromPath(file.name),
            code: content
          });
        } catch (e) {
          console.warn('Failed to read file', file.name, e);
        }
      }

      if (repoFiles.length === 0) {
        setError("Failed to read the content of the selected files.");
        setLoading(false);
        return;
      }

      // Pass success up to page.tsx, mapping to empty health since it is local
      onRepoLoaded(repoFiles, 'Local', 'Upload', {
        branch: 'local',
        noAnalyzableFiles: false,
        skippedSummary: {
          oversized: skippedCount.size,
          unsupported: skippedCount.unsupported,
          overLimit: validFiles.length > 60 ? validFiles.length - 60 : 0
        },
        repoHealth: null
      });

    } catch (e) {
      console.error(e);
      setError('An error occurred while processing the files.');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, onRepoLoaded]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Reset input
      e.target.value = '';
    }
  };

  const isWorking = isLoading || loading;

  return (
    <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed #38bdf8' : '2px dashed rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '40px 24px',
          textAlign: 'center',
          background: isDragging ? 'rgba(56,189,248,0.05)' : 'rgba(15,23,42,0.4)',
          transition: 'all 0.2s ease',
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📁</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
          Drag & Drop Files or Folders
        </h3>
        <p style={{ margin: '0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Drop your local codebase here to scan it instantly.<br/>
          Files are processed entirely in your browser.
        </p>

        {isWorking && (
          <div style={{ marginTop: '20px', color: '#38bdf8', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span> Reading local files...
          </div>
        )}

        {error && (
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => folderInputRef.current?.click()}
          disabled={isWorking}
          style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: isWorking ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isWorking ? 0.7 : 1 }}
        >
          Select Folder
        </button>
        <button 
          onClick={() => filesInputRef.current?.click()}
          disabled={isWorking}
          style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: isWorking ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isWorking ? 0.7 : 1 }}
        >
          Select Files
        </button>
      </div>

      {/* Hidden file inputs */}
      <input 
        type="file" 
        multiple 
        ref={filesInputRef} 
        onChange={handleFileInput} 
        style={{ display: 'none' }} 
        accept=".js,.jsx,.ts,.tsx,.py,.java"
      />
      <input 
        type="file" 
        // @ts-expect-error -- webkitdirectory is a non-standard but widely supported attribute needed for folder selection
        webkitdirectory="true" 
        directory="true" 
        multiple 
        ref={folderInputRef} 
        onChange={handleFileInput} 
        style={{ display: 'none' }} 
      />
      
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Supported Languages</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['JavaScript', 'TypeScript', 'Python', 'Java'].map(lang => (
            <span key={lang} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '999px', fontSize: '0.75rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
              {lang}
            </span>
          ))}
        </div>
      </div>
      
    </div>
  );
}
