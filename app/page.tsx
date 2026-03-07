'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ExplanationPanel from '@/components/ExplanationPanel';
import ReactFlowDiagram from '@/components/ReactFlowDiagram';
import CodeQualityPanel from '@/components/CodeQualityPanel';
import HistoryPanel, { HistoryItem } from '@/components/HistoryPanel';
import './page.css';

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

      if (!response.ok) {
        throw new Error('Failed to fetch explanation');
      }

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

  return (
    <div className="layout-container">
      <header className="page-header animate-fade-in">
        <h1 className="logo-title gradient-text">
          <span className="accent-icon">✦</span> AI Code Explainer
        </h1>
        <p className="subtitle text-tertiary">
          Understand AI-generated code logically and visually before blindly pasting it.
        </p>
      </header>

      <main className="main-content">
        <div className="grid-layout">
          {/* Left Column - Input */}
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

          {/* Right Column - Output (always visible, stacked) */}
          <div className="col-right">

            {/* Section 1: Code Breakdown & Metrics */}
            <ExplanationPanel explanation={explanation} summary={summary} complexity={complexity} isLoading={isLoading} />

            {/* Section 2: Interactive Execution Path */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  🎯 Interactive Execution Path
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Drag nodes • Scroll to zoom • Hit <strong style={{ color: '#38bdf8' }}>▶ Play Execution</strong> to animate step-by-step
                </p>
              </div>
              <div style={{ height: '500px', minHeight: '500px' }}>
                {isLoading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Generating flow diagram...
                  </div>
                ) : (
                  <ReactFlowDiagram nodes={nodes} edges={edges} />
                )}
              </div>
            </div>

            {/* Section 3: Code Quality Review */}
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  🔍 Code Quality Review
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Static analysis • Code smells • Best practice suggestions
                </p>
              </div>
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


