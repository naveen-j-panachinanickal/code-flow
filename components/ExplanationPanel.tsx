import React from 'react';
import './ExplanationPanel.css';

interface ExplanationPanelProps {
  explanation: string;
  summary: string;
  isLoading: boolean;
}

export default function ExplanationPanel({ explanation, summary, isLoading }: ExplanationPanelProps) {
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
      {summary && (
        <section className="explanation-section">
          <h3 className="section-title gradient-text-accent">Summary</h3>
          <p className="summary-text">{summary}</p>
        </section>
      )}

      {explanation && (
        <section className="explanation-section mt-4">
          <h3 className="section-title gradient-text-accent">Line-by-Line Breakdown</h3>
          <div className="explanation-content pb-4">
            {/* Split explanation by newline for simple formatting, though markdown rendering is better in future */ }
            {explanation.split('\n').map((line, i) => (
              <p key={i} className={line.trim() === '' ? 'empty-line' : 'content-line'}>
                {line}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
