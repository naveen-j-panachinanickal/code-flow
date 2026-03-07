import React from 'react';
import './MetricsBadge.css';

interface MetricsBadgeProps {
  score: number;
  rating: string;
}

export default function MetricsBadge({ score, rating }: MetricsBadgeProps) {
  let colorClass = 'rating-low';
  if (rating === 'High') colorClass = 'rating-high';
  else if (rating === 'Medium') colorClass = 'rating-medium';
  else if (rating === 'Error') colorClass = 'rating-error';

  return (
    <div className={`metrics-badge ${colorClass}`}>
      <span className="metrics-label">Cyclomatic Complexity:</span>
      <span className="metrics-value">{score}</span>
      <span className="metrics-rating">({rating})</span>
    </div>
  );
}
