export interface FlowNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string; originalStyle?: Record<string, any> };
  type?: string;
  parentId?: string;
  extent?: 'parent';
  style?: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  labelStyle?: Record<string, any>;
  labelBgStyle?: Record<string, any>;
}

export interface CodeSmell {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}

export interface CodeQualityMetric {
  label: string;
  value: string | number;
  score: number; // 0-100
}

export interface CodeQuality {
  overallScore: number;
  metrics: CodeQualityMetric[];
  smells: CodeSmell[];
  suggestions: string[];
}

export interface ExplanationResult {
  explanation: string;
  summary: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  complexity: {
    score: number;
    rating: string;
  };
  codeQuality: CodeQuality;
}

// Re-export RepoHealth so components can import from one place
export type { RepoHealth } from './repo-health';
