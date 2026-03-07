'use client';

import React, { useState } from 'react';
import './CodeEditor.css';

interface CodeEditorProps {
  onExplain: (code: string) => void;
  isLoading: boolean;
}

export default function CodeEditor({ onExplain, isLoading }: CodeEditorProps) {
  const [code, setCode] = useState('');

  const handleExplain = () => {
    if (code.trim()) {
      onExplain(code);
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
        <span className="header-title">Code Input</span>
      </div>
      
      <textarea
        className="editor-textarea"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="// Paste your code here to analyze..."
        spellCheck={false}
      />
      
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
