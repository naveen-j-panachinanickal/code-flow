'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import './FlowDiagram.css';

interface FlowDiagramProps {
  diagramCode: string;
  isLoading: boolean;
}

export default function FlowDiagram({ diagramCode, isLoading }: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid with dark theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        darkMode: true,
        background: 'transparent',
        primaryColor: '#1c1d21',
        primaryTextColor: '#f0f0f2',
        primaryBorderColor: '#3f3f46',
        lineColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        tertiaryColor: '#141517'
      },
      fontFamily: 'var(--font-sans)',
    });
  }, []);

  useEffect(() => {
    if (diagramCode && containerRef.current && !isLoading) {
      const renderDiagram = async () => {
        try {
          // Clear previous diagram
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          const { svg } = await mermaid.render(`diagram-${Date.now()}`, diagramCode);
          if (containerRef.current) {
             containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Failed to render Mermaid diagram:", error);
          if (containerRef.current) {
            containerRef.current.innerHTML = '<div class="error-msg">Failed to render diagram. The AI generated invalid Mermaid syntax.</div>';
          }
        }
      };
      renderDiagram();
    }
  }, [diagramCode, isLoading]);

  if (isLoading) {
     return (
        <div className="flow-diagram-container glass-panel loading-state">
           <div className="skeleton-box"></div>
        </div>
     );
  }

  if (!diagramCode) {
    return (
      <div className="flow-diagram-container glass-panel empty-state">
         <div className="empty-icon-diagram">⎔</div>
         <h3>Visual Execution Flow</h3>
         <p>The diagram will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flow-diagram-container glass-panel animate-fade-in">
      <h3 className="section-title gradient-text-accent">Execution Flow</h3>
      <div className="diagram-wrapper" ref={containerRef}></div>
    </div>
  );
}
