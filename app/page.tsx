'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ExplanationPanel from '@/components/ExplanationPanel';
import FlowDiagram from '@/components/FlowDiagram';
import './page.css';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [summary, setSummary] = useState('');
  const [diagram, setDiagram] = useState('');

  const handleExplain = async (code: string) => {
    setIsLoading(true);
    setExplanation('');
    setSummary('');
    setDiagram('');

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
    } catch (error) {
      console.error('Error explaining code:', error);
      setExplanation('An error occurred while generating the explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
             <CodeEditor onExplain={handleExplain} isLoading={isLoading} />
          </div>

          {/* Right Column - Output */}
          <div className="col-right">
            <div className="output-stack">
               <ExplanationPanel explanation={explanation} summary={summary} isLoading={isLoading} />
               <FlowDiagram diagramCode={diagram} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
