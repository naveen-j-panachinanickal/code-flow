'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ExplanationPanel from '@/components/ExplanationPanel';
import FlowDiagram from '@/components/FlowDiagram';
import HistoryPanel, { HistoryItem } from '@/components/HistoryPanel';
import './page.css';

export default function Home() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [summary, setSummary] = useState('');
  const [diagram, setDiagram] = useState('');
  const [complexity, setComplexity] = useState<{score: number, rating: string} | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'explanation' | 'flowchart'>('explanation');
  const [historyTrigger, setHistoryTrigger] = useState<{code: string; summary: string} | undefined>(undefined);

  const handleExplain = async (code: string) => {
    setIsLoading(true);
    setExplanation('');
    setSummary('');
    setDiagram('');
    setComplexity(undefined);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation || '');
      setSummary(data.summary || '');
      setDiagram(data.diagram || '');
      setComplexity(data.complexity);
      
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
    // Automatically explain it again so we get the fresh breakdown
    handleExplain(item.codeSnippet);
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
                onExplain={() => handleExplain(code)} 
                isLoading={isLoading} 
             />
          </div>

          {/* Right Column - Output */}
          <div className="col-right">
            
            <div className="tabs-container">
              <button 
                className={`tab-item ${activeTab === 'explanation' ? 'active' : ''}`}
                onClick={() => setActiveTab('explanation')}
              >
                Code Breakdown & Metrics
              </button>
              <button 
                className={`tab-item ${activeTab === 'flowchart' ? 'active' : ''}`}
                onClick={() => setActiveTab('flowchart')}
              >
                Logic Flowchart
              </button>
            </div>

            <div className="output-stack tab-content">
               {activeTab === 'explanation' && (
                  <ExplanationPanel explanation={explanation} summary={summary} complexity={complexity} isLoading={isLoading} />
               )}
               {activeTab === 'flowchart' && (
                  <FlowDiagram diagramCode={diagram} isLoading={isLoading} />
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
