'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { FlowNode, FlowEdge } from '@/lib/types';

interface ReactFlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 50;

const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'top' as any,
      sourcePosition: 'bottom' as any,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      // Save original style for replay resets
      data: { ...node.data, originalStyle: node.style }
    };
  });

  return { nodes: newNodes, edges };
};

function FlowLogic({ nodes, edges }: ReactFlowDiagramProps) {
  const [rfNodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const { fitView } = useReactFlow();

  // Initial Layout
  useEffect(() => {
    if (nodes.length === 0) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setStepIndex(-1);
    
    // Fit view after layout to ensure it scales correctly
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // Replay Animation Orchestrator
  useEffect(() => {
    if (!isPlaying) return;

    if (stepIndex >= rfNodes.length) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setNodes((nds) =>
        nds.map((n, i) => {
          if (i === stepIndex) {
             // Highlight current node
             return {
               ...n,
               style: {
                 ...n.data.originalStyle,
                 background: '#38bdf8', // bright sky blue
                 color: '#0f172a',
                 border: '2px solid #0284c7',
                 boxShadow: '0 0 15px rgba(56, 189, 248, 0.5)',
                 transform: 'scale(1.05)',
                 transition: 'all 0.3s ease'
               }
             };
          } else if (i < stepIndex) {
             // Dim previous nodes slightly but keep their base accent
             return {
               ...n,
               style: {
                 ...n.data.originalStyle,
                 opacity: 0.7,
                 transition: 'all 0.3s ease'
               }
             };
          }
          // Reset future nodes
          return {
            ...n,
            style: { ...n.data.originalStyle }
          };
        })
      );
      
      setEdges((eds) => 
        eds.map((e) => {
          const sourceNodeIndex = rfNodes.findIndex(n => n.id === e.source);
          if (sourceNodeIndex === stepIndex) {
            return {
              ...e,
              animated: true,
              style: { stroke: '#38bdf8', strokeWidth: 3 },
            };
          } else if (sourceNodeIndex < stepIndex) {
            return {
              ...e,
              animated: false,
              style: { stroke: '#475569', strokeWidth: 2 },
            };
          }
          return {
             ...e,
             animated: false,
             style: { stroke: '#334155', strokeWidth: 1 }
          };
        })
      );

      setStepIndex((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, rfNodes, setNodes, setEdges]);

  const handlePlay = () => {
    setStepIndex(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIndex(-1);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    fitView({ padding: 0.2, duration: 800 });
  };

  return (
    <>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ width: '100%', height: '100%' }}
        defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
      >
        <Background gap={12} size={1} color="#333" />
        <Controls className="fill-white [&>button]:bg-gray-800 [&>button]:border-gray-700" />
        <MiniMap 
            nodeColor="#3b82f6" 
            maskColor="rgba(0, 0, 0, 0.4)" 
            className="bg-gray-900 border border-gray-700" 
        />
        <Panel position="top-right" className="bg-gray-900 border border-gray-800 p-2 rounded text-xs text-gray-400 flex flex-col gap-2 shadow-lg">
          <div className="font-semibold text-gray-300 text-center mb-1">Interactive Execution Path</div>
          <button 
            onClick={handlePlay}
            disabled={isPlaying}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors w-full"
          >
            {isPlaying ? 'Playing...' : '▶ Play Execution'}
          </button>
          <button 
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors w-full"
          >
            ↺ Reset Layout
          </button>
        </Panel>
      </ReactFlow>
    </>
  );
}

export default function ReactFlowDiagram({ nodes, edges }: ReactFlowDiagramProps) {
  return (
    <div style={{ width: '100%', height: '500px' }} className="border border-white/10 rounded-lg overflow-hidden relative bg-black/50">
       <ReactFlowProvider>
         <FlowLogic nodes={nodes} edges={edges} />
       </ReactFlowProvider>
    </div>
  );
}
