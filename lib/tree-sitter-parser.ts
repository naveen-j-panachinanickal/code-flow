import path from 'path';
import { ExplanationResult, FlowNode, FlowEdge } from './types';

let isParserInitialized = false;
let ParserClass: any = null;
let TreeSitterModule: any = null;

export async function parseAndExplainCode(code: string, language: string): Promise<ExplanationResult> {
  try {
    if (!isParserInitialized) {
      // Turbopack workaround: require at runtime so it isn't statically bound to undefined
      TreeSitterModule = require('web-tree-sitter');
      ParserClass = TreeSitterModule.Parser || TreeSitterModule.default || TreeSitterModule;
      await ParserClass.init();
      isParserInitialized = true;
    }

    const parser = new ParserClass();
    
    // Load the correct language WASM from the public directory
    let wasmFile = 'tree-sitter-javascript.wasm';
    if (language.toLowerCase() === 'python') wasmFile = 'tree-sitter-python.wasm';
    if (language.toLowerCase() === 'java') wasmFile = 'tree-sitter-java.wasm';

    const wasmPath = path.join(process.cwd(), 'public', 'wasm', wasmFile);
    // @ts-ignore
    const LanguageClass = TreeSitterModule.Language || (TreeSitterModule as any).default?.Language || TreeSitterModule.default?.default?.Language;
    const Lang = await LanguageClass.load(wasmPath);
    parser.setLanguage(Lang);

    const tree = parser.parse(code);
    
    const explanationLines: string[] = [];
    const summaryPoints: string[] = [];
    let cyclomaticComplexity = 1;

    // React Flow structure
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    let nodeIdCounter = 0;

    const getNodeId = (prefix: string) => `${prefix}_${nodeIdCounter++}`;

    const baseNodeStyle = {
      background: '#1e293b', 
      color: '#f8fafc',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '600',
      minWidth: '200px',
      textAlign: 'center'
    };

    const edgeStyle = {
      stroke: '#94a3b8', 
      strokeWidth: 2 
    };

    const startNodeId = getNodeId('start');
    nodes.push({
      id: startNodeId,
      position: { x: 0, y: 0 },
      data: { label: 'Program Start' },
      type: 'input',
      style: { ...baseNodeStyle, background: '#059669', border: '2px solid #047857' }
    });

    let currentNodeId = startNodeId;
    let yOffset = 100;

    function addNodeAndEdge(label: string, edgeLabel: string = '') {
      const newNodeId = getNodeId('node');
      nodes.push({
        id: newNodeId,
        position: { x: 0, y: yOffset },
        data: { label },
        style: baseNodeStyle
      });
      edges.push({
        id: `e_${currentNodeId}_${newNodeId}`,
        source: currentNodeId,
        target: newNodeId,
        label: edgeLabel,
        animated: true,
        style: edgeStyle,
        labelStyle: { fill: '#cbd5e1', fontWeight: 600, fontSize: 12 },
        labelBgStyle: { fill: '#0f172a' }
      });
      currentNodeId = newNodeId;
      yOffset += 100;
      return newNodeId;
    }

    // Traverse the Tree-Sitter AST
    function traverse(node: any) {
      const type = node.type;
      
      if (['if_statement', 'for_statement', 'while_statement', 'catch_clause', 'except_clause'].includes(type)) {
        cyclomaticComplexity++;
      }

      if (['function_definition', 'method_declaration', 'function_declaration', 'arrow_function'].includes(type)) {
        const nameNode = node.childForFieldName('name') || node.childForFieldName('declarator');
        const funcName = nameNode ? nameNode.text : 'anonymous';
        summaryPoints.push(`Defines function '${funcName}'.`);
        explanationLines.push(`Line ${node.startPosition.row + 1}: Declares function '${funcName}'`);
        addNodeAndEdge(`Define Function: ${funcName}`);
      }
      else if (type === 'if_statement') {
        summaryPoints.push('Contains conditional logic.');
        explanationLines.push(`Line ${node.startPosition.row + 1}: Checks condition.`);
        const ifId = addNodeAndEdge('If Condition');
        
        // Simplified branch charting for the top level flow
        const yesId = getNodeId('yes');
        nodes.push({ id: yesId, position: { x: 0, y: 0 }, data: { label: 'Execute True Block' }, style: baseNodeStyle });
        edges.push({ id: `e_${ifId}_${yesId}`, source: ifId, target: yesId, label: 'True', animated: true, style: edgeStyle, labelStyle: { fill: '#cbd5e1' }, labelBgStyle: { fill: '#0f172a' } });
        
        const noId = getNodeId('no');
        nodes.push({ id: noId, position: { x: 0, y: 0 }, data: { label: 'Else / Merge' }, style: baseNodeStyle });
        edges.push({ id: `e_${ifId}_${noId}`, source: ifId, target: noId, label: 'False', animated: true, style: edgeStyle, labelStyle: { fill: '#cbd5e1' }, labelBgStyle: { fill: '#0f172a' } });
        
        currentNodeId = noId; 
      }
      else if (['for_statement', 'while_statement'].includes(type)) {
        summaryPoints.push('Contains a loop.');
        explanationLines.push(`Line ${node.startPosition.row + 1}: Begins a loop iteration.`);
        
        const loopId = addNodeAndEdge('Loop Condition');
        const endId = getNodeId('loop_end');
        nodes.push({ id: endId, position: { x: 0, y: 0 }, data: { label: 'Exit Loop' }, style: baseNodeStyle });
        
        // Loop back arrow
        edges.push({ id: `e_${loopId}_${loopId}_repeat`, source: loopId, target: loopId, label: 'Repeat', animated: true, style: edgeStyle, labelStyle: { fill: '#cbd5e1' }, labelBgStyle: { fill: '#0f172a' } });
        edges.push({ id: `e_${loopId}_${endId}`, source: loopId, target: endId, label: 'Exit', animated: true, style: edgeStyle, labelStyle: { fill: '#cbd5e1' }, labelBgStyle: { fill: '#0f172a' } });
        
        currentNodeId = endId;
      }
      else if (['try_statement'].includes(type)) {
        summaryPoints.push('Contains try/catch block.');
        explanationLines.push(`Line ${node.startPosition.row + 1}: Try block for error handling.`);
        addNodeAndEdge('Try Block');
      }
      else if (['return_statement'].includes(type)) {
        explanationLines.push(`Line ${node.startPosition.row + 1}: Returns value.`);
        const retNode = addNodeAndEdge(`Return Statement`);
        nodes.find(n => n.id === retNode)!.type = 'output';
      }
      else if (['call_expression'].includes(type)) {
        const funcNode = node.childForFieldName('function');
        const callName = funcNode ? funcNode.text : 'function';
        explanationLines.push(`Line ${node.startPosition.row + 1}: Function call to '${callName}'.`);
        if (callName.includes('print') || callName.includes('console.log') || callName.includes('System.out')) {
          addNodeAndEdge(`Print: ${callName}()`);
        } else {
          addNodeAndEdge(`Call: ${callName}()`);
        }
      }

      // Continue traversal
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) traverse(child);
      }
    }

    // Traverse root
    traverse(tree.rootNode);

    const endNodeId = addNodeAndEdge('Program End');
    nodes.find(n => n.id === endNodeId)!.type = 'output';
    nodes.find(n => n.id === endNodeId)!.style = { ...baseNodeStyle, background: '#be123c', border: '2px solid #9f1239' };

    const finalSummary = summaryPoints.length > 0 
      ? summaryPoints.join(' ') 
      : "The script runs sequentially with no complex control flow.";
      
    const finalExplanation = explanationLines.length > 0
      ? explanationLines.join('\n')
      : "Basic linear execution code block.";

    let rating = 'Low';
    if (cyclomaticComplexity > 10) rating = 'High';
    else if (cyclomaticComplexity > 5) rating = 'Medium';

    return {
      explanation: finalExplanation,
      summary: finalSummary,
      nodes,
      edges,
      complexity: {
        score: cyclomaticComplexity,
        rating
      }
    };
  } catch (error: any) {
    console.error("Tree-Sitter Parsing Error:", error);
    return {
      explanation: `Could not parse the code structure. Error: ${error.message}`,
      summary: "The code provided appears to contain syntax errors or is not a known language.",
      nodes: [{ id: 'error', position: { x: 0, y: 0 }, data: { label: 'Syntax Error' }, style: { background: '#ef4444', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: '2px solid #b91c1c' } }],
      edges: [],
      complexity: { score: 0, rating: 'Error' }
    };
  }
}
