import React from 'react';
import MetricsBadge from './MetricsBadge';
import './ExplanationPanel.css';

interface ExplanationPanelProps {
  explanation: string;
  summary: string;
  complexity?: {
    score: number;
    rating: string;
  };
  isLoading: boolean;
}

export default function ExplanationPanel({ explanation, summary, complexity, isLoading }: ExplanationPanelProps) {
  if (isLoading) {
    return (
      <div className="explanation-panel glass-panel loading-state">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line w-80"></div>
        <div className="skeleton-line w-90"></div>
        
        <div className="skeleton-line title mt-6"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line w-70"></div>
      </div>
    );
  }

  if (!explanation && !summary) {
    return (
      <div className="explanation-panel glass-panel empty-state">
        <div className="empty-icon">✨</div>
        <h3>No Code Analyzed Yet</h3>
        <p>Paste some code and click Explain to see the AI magic at work.</p>
      </div>
    );
  }

  return (
    <div className="explanation-panel glass-panel animate-fade-in">
      {complexity && <MetricsBadge score={complexity.score} rating={complexity.rating} />}

      {summary && (
        <section className="explanation-section">
          <h3 className="section-title gradient-text-accent">Summary</h3>
          <p className="summary-text">{summary}</p>
        </section>
      )}

        <section className="explanation-section mt-4">
          <h3 className="section-title gradient-text-accent">Detailed Breakdown</h3>
          <div className="explanation-content pb-4">
            {explanation.split('\n').map((line, i) => {
              if (line.trim().startsWith('###')) {
                return <h4 key={i} className="doc-h4">{line.replace('###', '').trim()}</h4>;
              }
              if (line.trim().startsWith('-')) {
                return <li key={i} className="doc-li">{line.replace('-', '').trim()}</li>;
              }
              return (
                <p key={i} className={line.trim() === '' ? 'empty-line' : 'content-line'}>
                  {line}
                </p>
              );
            })}
          </div>
        </section>
    </div>
  );
}
