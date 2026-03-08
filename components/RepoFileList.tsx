'use client';

import { RepoFileResult } from '@/components/RepoQualityPanel';
import { RepoHealth } from '@/lib/types';

interface Props {
  owner: string;
  repo: string;
  branch: string;
  files: RepoFileResult[];
  repoHealth: RepoHealth | null;
  activeFilePath: string | null;
  onFileSelect: (file: RepoFileResult) => void;
  onHeaderClick?: () => void;
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}40`, color, padding: '1px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
      {score}
    </span>
  );
}

export default function RepoFileList({ owner, repo, branch, files, repoHealth, activeFilePath, onFileSelect, onHeaderClick }: Props) {
  const healthColor = repoHealth
    ? repoHealth.score >= 75 ? '#22c55e' : repoHealth.score >= 50 ? '#f59e0b' : '#ef4444'
    : '#475569';

  const avgQualityScore = files.length > 0
    ? Math.round(files.reduce((acc, f) => acc + f.codeQuality.overallScore, 0) / files.length)
    : null;
    
  const qualityColor = avgQualityScore !== null
    ? avgQualityScore >= 80 ? '#22c55e' : avgQualityScore >= 55 ? '#f59e0b' : '#ef4444'
    : '#475569';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Repo header */}
      <div 
        onClick={onHeaderClick}
        style={{ 
          padding: '10px 14px', background: 'rgba(15,23,42,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
          cursor: onHeaderClick ? 'pointer' : 'default', transition: 'background 0.15s'
        }}
        onMouseEnter={e => { if (onHeaderClick) e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; }}
        onMouseLeave={e => { if (onHeaderClick) e.currentTarget.style.background = 'rgba(15,23,42,0.7)'; }}
      >
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
          Repository Summary
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
              📦 {owner}/{repo}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '1px' }}>
              {branch} · {files.length} file{files.length !== 1 ? 's' : ''} scanned
            </div>
          </div>
            <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
              {avgQualityScore !== null && (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: qualityColor }}>{avgQualityScore}</div>
                  <div style={{ fontSize: '0.6rem', color: qualityColor, fontWeight: 600 }}>quality</div>
                </div>
              )}
              {repoHealth && (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: healthColor }}>{repoHealth.score}</div>
                  <div style={{ fontSize: '0.6rem', color: healthColor, fontWeight: 600 }}>health</div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 6px' }}>
            Click a file to analyze it
          </div>
          {[...files].sort((a, b) => a.codeQuality.overallScore - b.codeQuality.overallScore).map(file => {
            const isActive = file.path === activeFilePath;
            const errs = file.codeQuality.smells.filter(s => s.severity === 'error').length;
            const warns = file.codeQuality.smells.filter(s => s.severity === 'warning').length;
            const filename = file.path.split('/').pop() || file.path;
            const dir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';

            return (
              <button
                key={file.path}
                onClick={() => onFileSelect(file)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '7px', padding: '7px 10px',
                  borderLeft: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  transition: 'all 0.12s',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: isActive ? '#38bdf8' : '#94a3b8', fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {filename}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                    {errs > 0 && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>🔴{errs}</span>}
                    {warns > 0 && <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>🟡{warns}</span>}
                    <ScorePill score={file.codeQuality.overallScore} />
                  </div>
                </div>
                {dir && <div style={{ fontSize: '0.62rem', color: '#334155', fontFamily: 'var(--font-mono)' }}>{dir}/</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', padding: '20px' }}>
          <div style={{ fontSize: '1.5rem' }}>🔍</div>
          <div style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>No analyzable source files found in this repo</div>
        </div>
      )}


    </div>
  );
}
