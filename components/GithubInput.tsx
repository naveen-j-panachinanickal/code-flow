'use client';

import { useState } from 'react';

interface Props {
  onFileLoaded: (code: string, language: string, filename: string) => void;
  onRepoLoaded: (files: RepoFile[], owner: string, repo: string, data: Record<string, unknown>) => void;
  isLoading: boolean;
}

export interface RepoFile {
  path: string;
  language: string;
  code: string;
}

export default function GithubInput({ onFileLoaded, onRepoLoaded, isLoading }: Props) {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  const isFileUrl = url.includes('/blob/');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setError('');
    setFetching(true);

    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), branch: branch.trim() || undefined })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to fetch from GitHub');
        return;
      }

      if (data.mode === 'file') {
        onFileLoaded(data.code, data.language, data.filename);
      } else if (data.mode === 'repo') {
        onRepoLoaded(data.files, data.owner, data.repo, data);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
    } finally {
      setFetching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch();
  };

  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '12px 16px',
      background: 'rgba(15,23,42,0.6)',
      flexShrink: 0
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
        🔗 Analyze from GitHub
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="Paste a GitHub file or repo URL..."
            style={{
              width: '100%',
              background: 'rgba(15,23,42,0.8)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#e2e8f0',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s'
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,0.4)'}
            onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}
          />
        </div>

        <button
          onClick={handleFetch}
          disabled={!url.trim() || fetching || isLoading}
          style={{
            flexShrink: 0,
            background: url.includes('/blob/') ? 'rgba(56,189,248,0.15)' : 'rgba(139,92,246,0.15)',
            border: url.includes('/blob/') ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(139,92,246,0.3)',
            color: url.includes('/blob/') ? '#38bdf8' : '#a78bfa',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            opacity: (!url.trim() || fetching) ? 0.4 : 1
          }}
        >
          {fetching ? '⏳ Fetching...' : isFileUrl ? '📄 Load File' : '📦 Scan Repo'}
        </button>
      </div>

      {/* Branch selector — only for repo URLs */}
      {!isFileUrl && url.trim() && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0 }}>⎇ Branch:</span>
          <input
            type="text"
            value={branch}
            onChange={e => setBranch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="default branch"
            style={{
              flex: 1,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '6px',
              padding: '5px 10px',
              color: '#94a3b8',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,0.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#334155', lineHeight: 1.5 }}>
        {isFileUrl
          ? '📄 Single file — will load into editor & analyze'
          : `📦 Repo scan — analyzes up to 20 code files • branch: ${branch.trim() || 'default'}`
        }
      </div>
    </div>
  );
}
