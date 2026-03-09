'use client';

import { useState, useEffect } from 'react';
import ExplanationPanel from '@/components/ExplanationPanel';
import ReactFlowDiagram from '@/components/ReactFlowDiagram';
import CodeQualityPanel from '@/components/CodeQualityPanel';
import { RepoFileResult } from '@/components/RepoQualityPanel';
import { RepoFile } from '@/components/GithubInput';
import RepoHealthSection from '@/components/RepoHealthSection';
import AuthButton from '@/components/AuthButton';
import SourceSelector, { HistoryItem } from '@/components/SourceSelector';
import './page.css';

type Tab = 'breakdown' | 'flow' | 'quality' | 'architecture';

export default function Home() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [summary, setSummary] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [architectureNodes, setArchitectureNodes] = useState<any[]>([]);
  const [architectureEdges, setArchitectureEdges] = useState<any[]>([]);
  const [complexity, setComplexity] = useState<{score: number, rating: string} | undefined>(undefined);
  const [codeQuality, setCodeQuality] = useState<any>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>('quality');
  // historyTrigger used to save analysis to history
  const [historyTrigger, setHistoryTrigger] = useState<{code: string; summary: string} | undefined>(undefined);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Repo scan state
  const [repoResults, setRepoResults] = useState<RepoFileResult[]>([]);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string; noAnalyzableFiles?: boolean; skippedSummary?: string } | null>(null);
  const [repoHealth, setRepoHealth] = useState<any>(null);
  const [isRepoMode, setIsRepoMode] = useState(false);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);


  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vibe_code_history');
    if (saved) { try { setHistoryItems(JSON.parse(saved)); } catch {} }
  }, []);

  // Save history when a new explain completes
  useEffect(() => {
    if (!historyTrigger) return;
    const newItem: HistoryItem = { id: Math.random().toString(36).substring(7), timestamp: Date.now(), codeSnippet: historyTrigger.code, summary: historyTrigger.summary };
    setHistoryItems(prev => {
      if (prev.some(i => i.codeSnippet === newItem.codeSnippet)) return prev;
      const updated = [newItem, ...prev].slice(0, 10);
      localStorage.setItem('vibe_code_history', JSON.stringify(updated));
      return updated;
    });
  }, [historyTrigger]);

  // handleExplain: called from Paste Code Explain button — clears repo state
  const handleExplain = async (codeStr: string, selectedLanguage: string) => {
    setIsLoading(true);
    setActiveTab('quality');
    setExplanation('');
    setSummary('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setCodeQuality(undefined);
    // Entering single-file mode — clear repo state
    setIsRepoMode(false);
    setRepoResults([]);
    setRepoInfo(null);
    setRepoHealth(null);
    setActiveFilePath(null);
    setArchitectureNodes([]);
    setArchitectureEdges([]);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeStr, language: selectedLanguage })
      });
      if (!response.ok) throw new Error('Failed to fetch explanation');
      const data = await response.json();
      setExplanation(data.explanation || '');
      setSummary(data.summary || '');
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setComplexity(data.complexity);
      setCodeQuality(data.codeQuality);
      if (data.summary) setHistoryTrigger({ code: codeStr, summary: data.summary });
    } catch (error) {
      console.error('Error explaining code:', error);
      setExplanation('An error occurred while generating the explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // GitHub single-file handler: load into editor and auto-analyze
  const handleFileLoaded = (fileCode: string, fileLang: string) => {
    setCode(fileCode);
    setLanguage(fileLang);
    handleExplain(fileCode, fileLang);
    setActiveTab('quality');
  };

  // GitHub repo handler: scan files, show file browser on left
  const handleRepoLoaded = async (files: RepoFile[], owner: string, repo: string, repoData: any) => {
    setIsLoading(true);
    setIsRepoMode(true);
    setActiveFilePath(null);
    setRepoResults([]);
    setRepoInfo({ owner, repo, branch: repoData.branch || 'default', noAnalyzableFiles: repoData.noAnalyzableFiles, skippedSummary: repoData.skippedSummary });
    setRepoHealth(repoData.repoHealth || null);
    setScanProgress(0);
    setScanTotal(files.length);
    // Clear right-panel data until a file is selected
    setExplanation('');
    setSummary('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setCodeQuality(undefined);

    try {
      // Analyze each file using the /api/explain endpoint with progress tracking
      let done = 0;
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const res = await fetch('/api/explain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: file.code, language: file.language })
            });
            const data = await res.json();
            done++;
            setScanProgress(done);
            return { path: file.path, language: file.language, code: file.code, codeQuality: data.codeQuality };
          } catch {
            done++;
            setScanProgress(done);
            return null;
          }
        })
      );

      const validResults = results.filter((r): r is RepoFileResult => r !== null && !!r.codeQuality);
      setRepoResults(validResults);

      // Build architecture diagram
      import('@/lib/architecture-parser').then(({ buildArchitectureDiagram }) => {
        const archData = buildArchitectureDiagram(
          validResults.map(r => ({ path: r.path, code: r.code || '' }))
        );
        setArchitectureNodes(archData.nodes);
        setArchitectureEdges(archData.edges);
      }).catch(e => console.error('Failed to build architecture map', e));

    } catch (e) {
      console.error('Repo analysis error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // File browser click: fetch explanation for this file KEEPING repo state visible on left
  const handleFileSelectFromBrowser = async (file: RepoFileResult) => {
    if (!file.code) { alert('File source not available — please re-scan the repo.'); return; }
    setActiveFilePath(file.path);
    setCode(file.code);
    setLanguage(file.language);
    // Show existing quality immediately, clear explanation until re-fetched
    setCodeQuality(file.codeQuality);
    setExplanation('');
    setSummary('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setIsLoading(true);
    setActiveTab('quality');

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: file.code, language: file.language })
      });
      const data = await res.json();
      setExplanation(data.explanation || '');
      setSummary(data.summary || '');
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setComplexity(data.complexity);
      setCodeQuality(data.codeQuality);
      // repo state (repoResults, repoInfo, repoHealth, isRepoMode) stays intact
    } catch {
      setExplanation('An error occurred while generating the explanation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setCode(item.codeSnippet);
    setLanguage('javascript');
    handleExplain(item.codeSnippet, 'javascript');
    setActiveTab('quality');
  };

  // File browser header click: return to repo overview
  const handleRepoOverviewClick = () => {
    setActiveFilePath(null);
    setCodeQuality(undefined);
    setExplanation('');
    setSummary('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setActiveTab('quality');
  };

  // Reset repo state (scan new repo)
  const handleRepoReset = () => {
    setIsRepoMode(false);
    setRepoResults([]);
    setRepoInfo(null);
    setRepoHealth(null);
    setActiveFilePath(null);
  };

  // Derive badge values
  const errorCount = isRepoMode
    ? repoResults.reduce((a, r) => a + r.codeQuality.smells.filter((s: any) => s.severity === 'error').length, 0)
    : (codeQuality?.smells?.filter((s: any) => s.severity === 'error').length ?? 0);
  const warnCount = isRepoMode
    ? repoResults.reduce((a, r) => a + r.codeQuality.smells.filter((s: any) => s.severity === 'warning').length, 0)
    : (codeQuality?.smells?.filter((s: any) => s.severity === 'warning').length ?? 0);
  const hasQualityData = isRepoMode ? repoResults.length > 0 : !!codeQuality;

  const qualityBadgeClass = !hasQualityData ? 'tab-badge-neutral' : errorCount > 0 ? 'tab-badge-error' : warnCount > 0 ? 'tab-badge-warn' : 'tab-badge-ok';
  const qualityBadgeLabel = !hasQualityData ? '' : isRepoMode ? `${repoResults.length} files` : errorCount > 0 ? `${errorCount}` : warnCount > 0 ? `${warnCount}` : '✓';

  const avgQualityScore = isRepoMode && repoResults.length > 0
    ? Math.round(repoResults.reduce((acc, r) => acc + r.codeQuality.overallScore, 0) / repoResults.length)
    : null;

  const tabs: { id: Tab; icon: string; label: string; badge?: string; badgeClass?: string; disabled?: boolean }[] = [
    {
      id: 'quality',
      icon: '🔍',
      label: 'Quality Review',
      badge: qualityBadgeLabel || undefined,
      badgeClass: qualityBadgeClass
    },
    {
      id: 'breakdown',
      icon: '📄',
      label: 'Code Breakdown',
      badge: complexity ? complexity.rating : undefined,
      badgeClass: complexity?.rating === 'High' ? 'tab-badge-error' : complexity?.rating === 'Medium' ? 'tab-badge-warn' : 'tab-badge-ok',
      disabled: isRepoMode && !activeFilePath
    },
    {
      id: 'flow',
      icon: '🎯',
      label: 'Execution Path',
      badge: nodes.length > 0 ? `${nodes.length} nodes` : undefined,
      badgeClass: 'tab-badge-neutral',
      disabled: isRepoMode && !activeFilePath
    },
    {
      id: 'architecture',
      icon: '🗺️',
      label: 'Architecture Map',
      badge: isRepoMode && architectureNodes.length > 0 ? `${architectureNodes.length} files` : undefined,
      badgeClass: 'tab-badge-neutral',
      disabled: !isRepoMode || architectureNodes.length === 0
    },
  ];

  return (
    <div className="layout-container">
      {/* IDE Header */}
      <header className="page-header">
        <div>
          <h1 className="logo-title gradient-text">
            <span className="accent-icon">✦</span> Quality Code
          </h1>
          <p style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#38bdf8', letterSpacing: '0.12em', margin: '2px 0 0', opacity: 0.85 }}>
            Code Made Clear
          </p>
        </div>
        <AuthButton />
      </header>

      <main className="main-content">
        <div className="grid-layout">

          {/* Left — source selector (Paste Code | From GitHub file browser) */}
          <div className="col-left" style={{ display: 'flex', flexDirection: 'column' }}>
            <SourceSelector
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              onExplain={handleExplain}
              isLoading={isLoading}
              onFileLoaded={handleFileLoaded}
              onRepoLoaded={handleRepoLoaded}
              repoFiles={repoResults}
              repoOwner={repoInfo?.owner || ''}
              repoBranch={repoInfo?.branch || ''}
              repoRepo={repoInfo?.repo || ''}
              repoHealth={repoHealth}
              activeFilePath={activeFilePath}
              onFileSelect={handleFileSelectFromBrowser}
              onRepoReset={handleRepoReset}
              onRepoHeaderClick={handleRepoOverviewClick}
              historyItems={historyItems}
              onHistorySelect={handleHistorySelect}
            />
            {/* Scan progress bar */}
            {isRepoMode && scanTotal > 0 && scanProgress < scanTotal && (
              <div style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.06)', borderTop: '1px solid rgba(139,92,246,0.15)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 600 }}>🔄 Scanning repo files...</span>
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>{scanProgress} / {scanTotal}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, #a78bfa, #38bdf8)', borderRadius: '2px', transition: 'width 0.3s ease', width: `${(scanProgress / scanTotal) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Right — tabbed output */}
          <div className="col-right">

            {/* Tab Bar */}
            <div className="tabs-container">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                  style={tab.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  title={tab.disabled ? 'Select a file to view this tab' : ''}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && !tab.disabled && (
                    <span className={`tab-badge ${tab.badgeClass}`}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Code Breakdown tab */}
            <div className="tab-content" style={{ display: activeTab === 'breakdown' ? 'flex' : 'none', flexDirection: 'column' }}>
              {isRepoMode && !activeFilePath ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                  Click a file in the panel on the left to see its code breakdown
                </div>
              ) : (
                <ExplanationPanel
                  explanation={explanation}
                  summary={summary}
                  complexity={complexity}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Execution Path tab */}
            <div className="tab-content" style={{ display: activeTab === 'flow' ? 'flex' : 'none', padding: '16px', flexDirection: 'column' }}>
              {isRepoMode && !activeFilePath ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                  Click a file in the panel on the left to see its execution path
                </div>
              ) : (
                <>
                  <div className="section-heading" style={{ marginBottom: '8px' }}>Interactive Execution Path</div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 12px' }}>
                    Drag nodes • Scroll to zoom • Hit <strong style={{ color: '#38bdf8' }}>▶ Play Execution</strong> in the canvas panel to animate
                  </p>
                  <div style={{ flex: 1, minHeight: '460px' }}>
                    {isLoading ? (
                      <div style={{ height: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        Generating flow diagram...
                      </div>
                    ) : (
                      <ReactFlowDiagram nodes={nodes} edges={edges} />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Architecture Map tab */}
            <div className="tab-content" style={{ display: activeTab === 'architecture' ? 'flex' : 'none', padding: '16px', flexDirection: 'column' }}>
                <>
                  <div className="section-heading" style={{ marginBottom: '8px' }}>Repository Architecture Map</div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 12px' }}>
                    Visualizes <strong style={{color: '#8b5cf6'}}>import / require</strong> dependencies between files in the repository.
                  </p>
                  <div style={{ flex: 1, minHeight: '460px' }}>
                    {architectureNodes.length > 0 ? (
                      <ReactFlowDiagram nodes={architectureNodes} edges={architectureEdges} />
                    ) : (
                      <div style={{ height: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {isLoading ? 'Scanning architecture...' : 'No internal file dependencies detected in this repository.'}
                      </div>
                    )}
                  </div>
                </>
            </div>

            <div className="tab-content" style={{ display: activeTab === 'quality' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto' }}>
              {/* Repo health section only shown when no file is selected */}
              {isRepoMode && repoHealth && !activeFilePath && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {avgQualityScore !== null && (
                    <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>Average Code Quality</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Across all {repoResults.length} scanned files</div>
                      </div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: avgQualityScore >= 80 ? '#22c55e' : avgQualityScore >= 55 ? '#f59e0b' : '#ef4444' }}>
                        {avgQualityScore}
                      </div>
                    </div>
                  )}

                  <RepoHealthSection health={repoHealth} />
                </div>
              )}
              {/* Repo info banner when no file selected yet */}
              {isRepoMode && !activeFilePath && !repoHealth && (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                  {isLoading ? 'Scanning repo files...' : 'Click a file in the panel on the left to see its quality review'}
                </div>
              )}
              {/* Single-file quality — shown after a file is selected (paste or repo browser) */}
              {codeQuality && (
                <div>
                  {isRepoMode && activeFilePath && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                      📄 {activeFilePath}
                    </div>
                  )}
                  {!isRepoMode && (
                    <>
                      <div className="section-heading" style={{ marginBottom: '8px' }}>Code Quality Review</div>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 16px' }}>
                        Static analysis • Code smell detection • Best practice suggestions
                      </p>
                    </>
                  )}
                  <CodeQualityPanel codeQuality={codeQuality} isLoading={isLoading} />
                </div>
              )}
              {/* Empty state — no paste code and no repo file selected */}
              {!codeQuality && !isLoading && !repoHealth && (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                  Paste some code and click Explain, or scan a GitHub repo to see quality review.
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

