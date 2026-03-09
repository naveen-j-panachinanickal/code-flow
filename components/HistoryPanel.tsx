import React, { useEffect, useState } from 'react';
import './HistoryPanel.css';

export interface HistoryItem {
  id: string;
  timestamp: number;
  codeSnippet: string;
  summary: string;
}

interface HistoryPanelProps {
  onSelectHistory: (item: HistoryItem) => void;
  onNewSnippet: (code: string, summary: string) => void;
  triggerSave?: { code: string; summary: string };
}

export default function HistoryPanel({ onSelectHistory, triggerSave }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vibe_code_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as HistoryItem[];
        // Defer state update to avoid cascading renders
        queueMicrotask(() => setHistory(parsed));
      } catch {
        console.error('Failed to parse history');
      }
    }
  }, []);

  // Save when triggerSave prop changes
  useEffect(() => {
    if (triggerSave && triggerSave.code && triggerSave.summary) {
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        codeSnippet: triggerSave.code,
        summary: triggerSave.summary,
      };

      // Defer state update to avoid cascading renders
      queueMicrotask(() => {
        setHistory(prev => {
          // Prevent duplicates (simple check based on exact code match)
          if (prev.some(item => item.codeSnippet === newItem.codeSnippet)) {
             return prev;
          }
          
          const updated = [newItem, ...prev].slice(0, 10); // Keep last 10
          localStorage.setItem('vibe_code_history', JSON.stringify(updated));
          return updated;
        });
      });
    }
  }, [triggerSave]);

  const togglePanel = () => setIsOpen(!isOpen);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('vibe_code_history');
  }

  return (
    <>
      <button className="history-toggle-btn" onClick={togglePanel} title="View History">
        {isOpen ? '✕' : '🕒 History'}
      </button>

      <div className={`history-panel glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="history-header">
           <h3 className="section-title">Recent Snippets</h3>
           {history.length > 0 && (
             <button className="clear-btn" onClick={clearHistory}>Clear</button>
           )}
        </div>
        
        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-history text-tertiary">No history saved yet. Explain some code to see it here.</p>
          ) : (
            history.map(item => (
              <div 
                key={item.id} 
                className="history-card"
                 onClick={() => {
                   onSelectHistory(item);
                   setIsOpen(false);
                 }}
              >
                <div className="history-time">
                  {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div className="history-summary">{item.summary}</div>
                <div className="history-code-preview">
                   {item.codeSnippet.substring(0, 50)}...
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
