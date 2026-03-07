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

export interface ExplanationResult {
  explanation: string;
  summary: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  complexity: {
    score: number;
    rating: string;
  };
}
