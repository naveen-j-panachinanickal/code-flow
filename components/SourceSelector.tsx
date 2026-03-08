'use client';

import { useState, useEffect } from 'react';
import CodeEditor from '@/components/CodeEditor';
import GithubInput, { RepoFile } from '@/components/GithubInput';
import RepoFileList from '@/components/RepoFileList';
import { RepoFileResult } from '@/components/RepoQualityPanel';
import { RepoHealth } from '@/lib/types';

type SourceMode = 'editor' | 'github';

interface Props {
  // editor
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
  onExplain: (code: string, lang: string) => void;
  isLoading: boolean;
  // github
  onFileLoaded: (code: string, language: string, filename: string) => void;
  onRepoLoaded: (files: RepoFile[], owner: string, repo: string, data: any) => void;
  // repo scan state (passed from page.tsx)
  repoFiles: RepoFileResult[];
  repoOwner: string;
  repoBranch: string;
  repoRepo: string;
  repoHealth: RepoHealth | null;
  activeFilePath: string | null;
  onFileSelect: (file: RepoFileResult) => void;
  onRepoReset: () => void;
  onRepoHeaderClick?: () => void;
  // history
  historyItems: HistoryItem[];
  onHistorySelect: (item: HistoryItem) => void;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  codeSnippet: string;
  summary: string;
}

export default function SourceSelector({
  code, setCode, language, setLanguage, onExplain, isLoading,
  onFileLoaded, onRepoLoaded,
  repoFiles, repoOwner, repoBranch, repoRepo, repoHealth, activeFilePath, onFileSelect, onRepoReset, onRepoHeaderClick,
  historyItems, onHistorySelect,
}: Props) {
  const [mode, setMode] = useState<SourceMode>('editor');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const hasRepoScan = repoFiles.length > 0 || (repoOwner && repoRepo);

  useEffect(() => {
    // If a repo scan just completed while in github mode, stay in github mode
    if (hasRepoScan) setMode('github');
  }, [repoOwner]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setIsLoggedIn(!!d.user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Mode toggle — always visible */}
      <div style={{
        display: 'flex', gap: '2px',
        background: 'rgba(15,23,42,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 16px', flexShrink: 0,
      }}>
        <button onClick={() => setMode('editor')} style={{
          flex: 1, padding: '7px 0', border: 'none', borderRadius: '7px',
          background: mode === 'editor' ? 'rgba(56,189,248,0.12)' : 'transparent',
          color: mode === 'editor' ? '#38bdf8' : '#475569',
          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          📝 Paste Code
        </button>
        <button onClick={() => setMode('github')} style={{
          flex: 1, padding: '7px 0', border: 'none', borderRadius: '7px',
          background: mode === 'github' ? 'rgba(139,92,246,0.12)' : 'transparent',
          color: mode === 'github' ? '#a78bfa' : '#475569',
          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          From GitHub
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Paste Code mode */}
        {mode === 'editor' && (
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
            onExplain={onExplain}
            isLoading={isLoading}
          />
        )}

        {/* GitHub mode */}
        {mode === 'github' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flexShrink: 0 }}>
              {/* Auth hint */}
              {isLoggedIn === false && (
                <a href="/api/auth/login" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '8px', padding: '10px 14px', textDecoration: 'none', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' }}>🔐 Login with GitHub for private repos</div>
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px' }}>Public repos work without login</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>Login →</span>
                </a>
              )}

              {isLoggedIn === true && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.75rem', color: '#22c55e' }}>
                  ✅ Logged in — private repos enabled
                </div>
              )}

              <GithubInput
                onFileLoaded={(c, l, name) => { onFileLoaded(c, l, name); setMode('editor'); }}
                onRepoLoaded={onRepoLoaded}
                isLoading={isLoading}
              />
            </div>

            {hasRepoScan && (
              <RepoFileList
                owner={repoOwner}
                repo={repoRepo}
                branch={repoBranch}
                files={repoFiles}
                repoHealth={repoHealth}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
                onHeaderClick={onRepoHeaderClick}
              />
            )}
          </>
        )}
      </div>

      {/* Inline History accordion */}
      {historyItems.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
              🕒 History ({historyItems.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: '#334155' }}>{historyOpen ? '▾' : '▸'}</span>
          </button>
          {historyOpen && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '0 8px 8px' }}>
              {historyItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onHistorySelect(item); setHistoryOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>{item.summary}</div>
                  <div style={{ fontSize: '0.65rem', color: '#334155', fontFamily: 'var(--font-mono)' }}>
                    {item.codeSnippet.substring(0, 45)}...
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
