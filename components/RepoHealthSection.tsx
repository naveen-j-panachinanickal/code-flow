'use client';

import { RepoHealth } from '@/lib/repo-health';

interface Props {
  health: RepoHealth;
}

function statusIcon(status: string) {
  return status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : status === 'fail' ? '❌' : 'ℹ️';
}

function statusColor(status: string) {
  return status === 'pass' ? '#22c55e' : status === 'warn' ? '#f59e0b' : status === 'fail' ? '#ef4444' : '#38bdf8';
}

export default function RepoHealthSection({ health }: Props) {
  const scoreColor = health.score >= 75 ? '#22c55e' : health.score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = health.score >= 75 ? 'Healthy' : health.score >= 50 ? 'Needs Attention' : 'Poor';

  /* group checks by category */
  const docChecks = health.checks.filter(c =>
    ['README.md', 'README length', 'README structure', 'Code examples in README', 'Installation instructions', 'LICENSE file', 'CONTRIBUTING guide'].includes(c.label)
  );
  const devChecks = health.checks.filter(c =>
    ['CI/CD', '.gitignore', 'Test script', 'Lint script', 'Node engine specified', 'Dependencies', 'License field'].includes(c.label)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.3rem' }}>🏥</span>
          <div>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.88rem' }}>Repo Health</div>
            {health.buildSystem && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>Build system: {health.buildSystem}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{health.score}</div>
          <div style={{ fontSize: '0.65rem', color: scoreColor, fontWeight: 600, marginTop: '2px' }}>{scoreLabel}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* Documentation checks */}
        <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Documentation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {docChecks.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', flexShrink: 0, lineHeight: '1.4' }}>{statusIcon(c.status)}</span>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor(c.status) }}>{c.label}</div>
                  {c.detail && <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '1px', lineHeight: 1.4 }}>{c.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dev hygiene checks */}
        <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Project Hygiene
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {devChecks.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', flexShrink: 0, lineHeight: '1.4' }}>{statusIcon(c.status)}</span>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor(c.status) }}>{c.label}</div>
                  {c.detail && <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '1px', lineHeight: 1.4 }}>{c.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
