'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ExplanationPanel from '@/components/ExplanationPanel';
import ReactFlowDiagram from '@/components/ReactFlowDiagram';
import CodeQualityPanel from '@/components/CodeQualityPanel';
import GithubInput, { RepoFile } from '@/components/GithubInput';
import RepoQualityPanel, { RepoFileResult } from '@/components/RepoQualityPanel';
import AuthButton from '@/components/AuthButton';
import HistoryPanel, { HistoryItem } from '@/components/HistoryPanel';
import './page.css';

type Tab = 'breakdown' | 'flow' | 'quality';

export default function Home() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [summary, setSummary] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [complexity, setComplexity] = useState<{score: number, rating: string} | undefined>(undefined);
  const [codeQuality, setCodeQuality] = useState<any>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>('breakdown');
  const [historyTrigger, setHistoryTrigger] = useState<{code: string; summary: string} | undefined>(undefined);

  // Repo scan state
  const [repoResults, setRepoResults] = useState<RepoFileResult[]>([]);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; noAnalyzableFiles?: boolean; skippedSummary?: string; isTruncated?: boolean } | null>(null);
  const [repoHealth, setRepoHealth] = useState<any>(null);
  const [isRepoMode, setIsRepoMode] = useState(false);

  const handleExplain = async (codeStr: string, selectedLanguage: string) => {
    setIsLoading(true);
    setExplanation('');
    setSummary('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setCodeQuality(undefined);
    setRepoResults([]);
    setRepoInfo(null);
    setRepoHealth(null);
    setIsRepoMode(false);

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

      if (data.summary) {
        setHistoryTrigger({ code: codeStr, summary: data.summary });
      }
    } catch (error) {
      console.error('Error explaining code:', error);
      setExplanation('An error occurred while generating the explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // GitHub single-file handler: load into editor and auto-analyze
  const handleFileLoaded = (fileCode: string, fileLang: string, filename: string) => {
    setCode(fileCode);
    setLanguage(fileLang);
    setIsRepoMode(false);
    handleExplain(fileCode, fileLang);
    setActiveTab('breakdown');
  };

  // GitHub repo handler: run quality analysis on each file, then show results
  const handleRepoLoaded = async (files: RepoFile[], owner: string, repo: string, repoData: any) => {
    setIsLoading(true);
    setIsRepoMode(true);
    setRepoResults([]);
    setRepoInfo({ owner, repo, noAnalyzableFiles: repoData.noAnalyzableFiles, skippedSummary: repoData.skippedSummary, isTruncated: repoData.isTruncated });
    setRepoHealth(repoData.repoHealth || null);
    setExplanation('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setCodeQuality(undefined);
    setActiveTab('quality');

    try {
      // Analyze each file using the /api/explain endpoint
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const res = await fetch('/api/explain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: file.code, language: file.language })
            });
            const data = await res.json();
            return { path: file.path, language: file.language, code: file.code, codeQuality: data.codeQuality };
          } catch {
            return null;
          }
        })
      );

      const validResults = results.filter((r): r is RepoFileResult => r !== null && !!r.codeQuality);
      setRepoResults(validResults);
    } catch (e) {
      console.error('Repo analysis error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setCode(item.codeSnippet);
    setLanguage('javascript');
    handleExplain(item.codeSnippet, 'javascript');
  };

  // Load a repo file into the editor and trigger full code breakdown
  const handleFileSelect = (file: RepoFileResult) => {
    if (!file.code) {
      alert('File source not available — please re-scan the repo to enable breakdown.');
      return;
    }
    setCode(file.code);
    setLanguage(file.language);
    setIsRepoMode(false);
    handleExplain(file.code, file.language);
    setActiveTab('breakdown');
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

  const tabs: { id: Tab; icon: string; label: string; badge?: string; badgeClass?: string }[] = [
    {
      id: 'breakdown',
      icon: '📄',
      label: 'Code Breakdown',
      badge: complexity ? complexity.rating : undefined,
      badgeClass: complexity?.rating === 'High' ? 'tab-badge-error' : complexity?.rating === 'Medium' ? 'tab-badge-warn' : 'tab-badge-ok'
    },
    {
      id: 'flow',
      icon: '🎯',
      label: 'Execution Path',
      badge: nodes.length > 0 ? `${nodes.length} nodes` : undefined,
      badgeClass: 'tab-badge-neutral'
    },
    {
      id: 'quality',
      icon: '🔍',
      label: 'Quality Review',
      badge: qualityBadgeLabel || undefined,
      badgeClass: qualityBadgeClass
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

          {/* Left — sticky code editor + GitHub input */}
          <div className="col-left">
            <CodeEditor
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              onExplain={(c, l) => handleExplain(c, l)}
              isLoading={isLoading}
            />
            <GithubInput
              onFileLoaded={handleFileLoaded}
              onRepoLoaded={handleRepoLoaded}
              isLoading={isLoading}
            />
          </div>

          {/* Right — tabbed output */}
          <div className="col-right">

            {/* Premium Tab Bar */}
            <div className="tabs-container">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`tab-badge ${tab.badgeClass}`}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Code Breakdown tab */}
            <div className="tab-content" style={{ display: activeTab === 'breakdown' ? 'flex' : 'none' }}>
              <ExplanationPanel
                explanation={explanation}
                summary={summary}
                complexity={complexity}
                isLoading={isLoading}
              />
            </div>

            {/* Execution Path tab */}
            <div className="tab-content" style={{ display: activeTab === 'flow' ? 'flex' : 'none', padding: '16px' }}>
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
            </div>

            {/* Quality Review tab — single file OR repo mode */}
            <div className="tab-content" style={{ display: activeTab === 'quality' ? 'flex' : 'none' }}>
              {isLoading ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                  {isRepoMode ? `Analyzing repo files...` : 'Analyzing code quality...'}
                </div>
              ) : isRepoMode && repoInfo ? (
                <RepoQualityPanel
                  owner={repoInfo.owner}
                  repo={repoInfo.repo}
                  results={repoResults}
                  noAnalyzableFiles={repoInfo.noAnalyzableFiles}
                  skippedSummary={repoInfo.skippedSummary}
                  isTruncated={repoInfo.isTruncated}
                  repoHealth={repoHealth}
                  onFileSelect={handleFileSelect}
                />
              ) : (
                <>
                  <div className="section-heading" style={{ marginBottom: '8px' }}>Code Quality Review</div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 16px' }}>
                    Static analysis • Code smell detection • Best practice suggestions
                  </p>
                  <CodeQualityPanel codeQuality={codeQuality} isLoading={isLoading} />
                </>
              )}
            </div>

          </div>
        </div>
      </main>

      <HistoryPanel
        onSelectHistory={handleSelectHistory}
        onNewSnippet={() => {}}
        triggerSave={historyTrigger}
      />
    </div>
  );
}
