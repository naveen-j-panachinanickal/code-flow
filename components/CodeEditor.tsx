'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
  onExplain: (code: string, language: string) => void;
  isLoading: boolean;
}

export default function CodeEditor({ code, setCode, language, setLanguage, onExplain, isLoading }: CodeEditorProps) {
  const handleExplain = () => {
    if (code.trim()) {
      onExplain(code, language);
    }
  };

  return (
    <div className="code-editor-container glass-panel animate-fade-in">
      <div className="editor-header">
        <div className="mac-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <span className="header-title">Code Input 
          <select 
             value={language} 
             onChange={(e) => setLanguage(e.target.value)}
             className="language-selector"
          >
             <option value="javascript">JavaScript</option>
             <option value="typescript">TypeScript</option>
             <option value="python">Python</option>
             <option value="java">Java</option>
          </select>
        </span>
      </div>
      
      <div className="monaco-wrapper">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            renderLineHighlight: 'all'
          }}
          loading={
             <div className="loading-state h-full">
                <span className="loading-spinner"></span>
             </div>
          }
        />
      </div>
      
      <div className="editor-footer">
        <button 
          className="btn-primary" 
          onClick={handleExplain}
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Explain Code
            </>
          )}
        </button>
      </div>
    </div>
  );
}
