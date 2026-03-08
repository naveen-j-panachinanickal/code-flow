'use client';

import { useState } from 'react';
import { CodeQuality } from '@/lib/types';

export interface RepoFileResult {
  path: string;
  language: string;
  codeQuality: CodeQuality;
}

interface Props {
  owner: string;
  repo: string;
  results: RepoFileResult[];
}

function severityColor(s: 'error' | 'warning' | 'info') {
  return s === 'error' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#38bdf8';
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}40`, color, padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
      {score}
    </span>
  );
}

export default function RepoQualityPanel({ owner, repo, results }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <div style={{ padding: '24px', color: '#475569', textAlign: 'center', fontSize: '0.875rem' }}>
        No results to display
      </div>
    );
  }

  // Aggregate stats
  const avgScore = Math.round(results.reduce((a, r) => a + r.codeQuality.overallScore, 0) / results.length);
  const totalErrors = results.reduce((a, r) => a + r.codeQuality.smells.filter(s => s.severity === 'error').length, 0);
  const totalWarnings = results.reduce((a, r) => a + r.codeQuality.smells.filter(s => s.severity === 'warning').length, 0);
  const sortedResults = [...results].sort((a, b) => a.codeQuality.overallScore - b.codeQuality.overallScore);

  const scoreColor = avgScore >= 80 ? '#22c55e' : avgScore >= 55 ? '#f59e0b' : '#ef4444';
  const scoreLabel = avgScore >= 80 ? 'Excellent' : avgScore >= 55 ? 'Fair' : 'Needs Work';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Repo header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px' }}>
        <div style={{ fontSize: '1.8rem' }}>📦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>
            {owner}/{repo}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {results.length} files analyzed
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: scoreColor }}>{avgScore}</div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>avg score</div>
          <div style={{ fontSize: '0.72rem', color: scoreColor, fontWeight: 600 }}>{scoreLabel}</div>
        </div>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {totalErrors > 0 && (
          <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
            🔴 {totalErrors} Error{totalErrors > 1 ? 's' : ''} across repo
          </span>
        )}
        {totalWarnings > 0 && (
          <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
            🟡 {totalWarnings} Warning{totalWarnings > 1 ? 's' : ''} across repo
          </span>
        )}
        {totalErrors === 0 && totalWarnings === 0 && (
          <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
            ✅ Clean codebase
          </span>
        )}
      </div>

      {/* File list — worst scored first */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
          Files (worst first)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sortedResults.map((r) => {
            const errs = r.codeQuality.smells.filter(s => s.severity === 'error').length;
            const warns = r.codeQuality.smells.filter(s => s.severity === 'warning').length;
            const isOpen = expanded === r.path;

            return (
              <div key={r.path} style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* File row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : r.path)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.path}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {errs > 0 && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>🔴 {errs}</span>}
                    {warns > 0 && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>🟡 {warns}</span>}
                    <ScorePill score={r.codeQuality.overallScore} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Metrics */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {r.codeQuality.metrics.map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', color: '#94a3b8' }}>
                          <span style={{ color: '#64748b' }}>{m.label}: </span>{m.value}
                        </div>
                      ))}
                    </div>

                    {/* Smells */}
                    {r.codeQuality.smells.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {r.codeQuality.smells.map((s, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: severityColor(s.severity), display: 'flex', gap: '6px' }}>
                            <span>{s.severity === 'error' ? '🔴' : s.severity === 'warning' ? '🟡' : '🔵'}</span>
                            <span style={{ color: '#94a3b8' }}>{s.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.codeQuality.smells.length === 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>✅ No issues detected</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
