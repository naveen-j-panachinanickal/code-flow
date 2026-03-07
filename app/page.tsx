'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ExplanationPanel from '@/components/ExplanationPanel';
import ReactFlowDiagram from '@/components/ReactFlowDiagram';
import CodeQualityPanel from '@/components/CodeQualityPanel';
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

  const handleExplain = async (code: string, selectedLanguage: string) => {
    setIsLoading(true);
    setExplanation('');
    setSummary('');
    setNodes([]);
    setEdges([]);
    setComplexity(undefined);
    setCodeQuality(undefined);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: selectedLanguage })
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
        setHistoryTrigger({ code, summary: data.summary });
      }
    } catch (error) {
      console.error('Error explaining code:', error);
      setExplanation('An error occurred while generating the explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setCode(item.codeSnippet);
    setLanguage('javascript');
    handleExplain(item.codeSnippet, 'javascript');
  };

  // Derive badge values
  const errorCount = codeQuality?.smells?.filter((s: any) => s.severity === 'error').length ?? 0;
  const warnCount  = codeQuality?.smells?.filter((s: any) => s.severity === 'warning').length ?? 0;
  const qualityBadgeClass =
    !codeQuality ? 'tab-badge-neutral' :
    errorCount > 0 ? 'tab-badge-error' :
    warnCount  > 0 ? 'tab-badge-warn'  : 'tab-badge-ok';
  const qualityBadgeLabel =
    !codeQuality ? '' :
    errorCount > 0 ? `${errorCount}` :
    warnCount  > 0 ? `${warnCount}`  : '✓';

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
      </header>

      <main className="main-content">
        <div className="grid-layout">

          {/* Left — sticky code editor */}
          <div className="col-left">
            <CodeEditor
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              onExplain={(c, l) => handleExplain(c, l)}
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

            {/* Tab content — only the active tab is visible, others are CSS-hidden so React Flow stays mounted */}
            <div className="tab-content" style={{ display: activeTab === 'breakdown' ? 'flex' : 'none' }}>
              <ExplanationPanel
                explanation={explanation}
                summary={summary}
                complexity={complexity}
                isLoading={isLoading}
              />
            </div>

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

            <div className="tab-content" style={{ display: activeTab === 'quality' ? 'flex' : 'none' }}>
              <div className="section-heading" style={{ marginBottom: '8px' }}>Code Quality Review</div>
              <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 16px' }}>
                Static analysis • Code smell detection • Best practice suggestions
              </p>
              <CodeQualityPanel codeQuality={codeQuality} isLoading={isLoading} />
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
