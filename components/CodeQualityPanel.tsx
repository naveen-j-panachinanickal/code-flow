'use client';

import { CodeQuality } from '@/lib/types';

interface Props {
  codeQuality?: CodeQuality;
  isLoading?: boolean;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 55 ? 'Fair' : 'Needs Work';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ position: 'relative', marginTop: '-76px', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{score}</div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/100</div>
      </div>
      <div style={{ marginTop: '48px', fontSize: '0.8rem', fontWeight: 600, color, textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function SmellBadge({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  const map = {
    error: { icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    warning: { icon: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    info: { icon: '🔵', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)' },
  };
  return <span style={{ fontSize: '0.75rem' }}>{map[severity].icon}</span>;
}

export default function CodeQualityPanel({ codeQuality, isLoading }: Props) {
  if (isLoading) {
    return (
      <div style={{ padding: '20px', background: 'rgba(15,23,42,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'center' }}>
        Analysing code quality...
      </div>
    );
  }

  if (!codeQuality || (codeQuality.metrics.length === 0 && codeQuality.smells.length === 0)) {
    return (
      <div style={{ padding: '20px', background: 'rgba(15,23,42,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#334155', textAlign: 'center', fontSize: '0.875rem' }}>
        Submit code to see quality analysis
      </div>
    );
  }

  const errorCount = codeQuality.smells.filter(s => s.severity === 'error').length;
  const warnCount = codeQuality.smells.filter(s => s.severity === 'warning').length;
  const infoCount = codeQuality.smells.filter(s => s.severity === 'info').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header row: score ring + summary badges */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '24px',
        background: 'rgba(15,23,42,0.7)', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px'
      }}>
        <ScoreRing score={codeQuality.overallScore} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>Overall Quality Score</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {errorCount > 0 && (
              <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                🔴 {errorCount} Error{errorCount > 1 ? 's' : ''}
              </span>
            )}
            {warnCount > 0 && (
              <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                🟡 {warnCount} Warning{warnCount > 1 ? 's' : ''}
              </span>
            )}
            {infoCount > 0 && (
              <span style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                🔵 {infoCount} Info
              </span>
            )}
            {codeQuality.smells.length === 0 && (
              <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                ✅ No issues found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Static Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
          {codeQuality.metrics.map((m) => {
            const color = m.score >= 80 ? '#22c55e' : m.score >= 55 ? '#f59e0b' : '#ef4444';
            return (
              <div key={m.label} style={{
                background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px', padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>{m.value}</div>
                <div style={{ marginTop: '6px', height: '3px', background: '#1e293b', borderRadius: '2px' }}>
                  <div style={{ width: `${m.score}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: '0.65rem', color, marginTop: '2px' }}>{m.score}/100</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Smells */}
      {codeQuality.smells.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Code Issues</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {codeQuality.smells.map((s, i) => {
              const styles: Record<'error' | 'warning' | 'info', { bg: string; border: string }> = {
                error: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
                warning: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
                info: { bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)' },
              };
              return (
                <div key={i} style={{
                  background: styles[s.severity].bg,
                  border: `1px solid ${styles[s.severity].border}`,
                  borderRadius: '8px', padding: '8px 12px',
                  display: 'flex', alignItems: 'flex-start', gap: '8px'
                }}>
                  <SmellBadge severity={s.severity} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: '1.4' }}>{s.message}</div>
                    {s.line && <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>Line {s.line}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best Practice Suggestions */}
      {codeQuality.suggestions.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Best Practice Suggestions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {codeQuality.suggestions.map((s, i) => (
              <div key={i} style={{
                background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)',
                borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5'
              }}>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
