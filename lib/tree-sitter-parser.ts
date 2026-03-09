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
        explanationLines.push(`### ${explanationLines.filter(l => l.startsWith('###')).length + 1}. Function: \`${funcName}\``);
        explanationLines.push(`- Declared on line ${node.startPosition.row + 1}`);
        addNodeAndEdge(`Define Function: ${funcName}`);
      }
      else if (type === 'if_statement') {
        summaryPoints.push('Contains conditional logic.');
        explanationLines.push(`### ${explanationLines.filter(l => l.startsWith('###')).length + 1}. Conditional Logic`);
        explanationLines.push(`- Starts on line ${node.startPosition.row + 1}`);
        explanationLines.push(`- Contains branching behavior based on a given condition.`);
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
        explanationLines.push(`### ${explanationLines.filter(l => l.startsWith('###')).length + 1}. Iteration Block`);
        explanationLines.push(`- Starts on line ${node.startPosition.row + 1}`);
        explanationLines.push(`- Used to repeatedly execute code block.`);
        
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
        explanationLines.push(`### ${explanationLines.filter(l => l.startsWith('###')).length + 1}. Error Handling`);
        explanationLines.push(`- Starts on line ${node.startPosition.row + 1} with a \`try/catch\` block.`);
        addNodeAndEdge('Try Block');
      }
      else if (['return_statement'].includes(type)) {
        explanationLines.push(`### ${explanationLines.filter(l => l.startsWith('###')).length + 1}. Return Statement`);
        explanationLines.push(`- Returns execution value on line ${node.startPosition.row + 1}.`);
        const retNode = addNodeAndEdge(`Return Statement`);
        nodes.find(n => n.id === retNode)!.type = 'output';
      }
      else if (['call_expression'].includes(type)) {
        const funcNode = node.childForFieldName('function');
        const callName = funcNode ? funcNode.text : 'function';
        if (explanationLines.length === 0 || !explanationLines[explanationLines.length-1].includes('Function Call:')) {
            explanationLines.push(`### ${explanationLines.filter(l => l.startsWith('###')).length + 1}. Operations`);
        }
        explanationLines.push(`- Invokes function \`${callName}()\` on line ${node.startPosition.row + 1}.`);
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

    // ===== CODE QUALITY ANALYSIS =====
    const codeLines = code.split('\n');
    const totalLines = codeLines.length;
    const blankLines = codeLines.filter(l => l.trim() === '').length;
    const commentLines = codeLines.filter(l => {
      const t = l.trim();
      return t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/') || t.startsWith('"""') || t.startsWith("'''");
    }).length;
    const codeOnlyLines = totalLines - blankLines - commentLines;

    // Count functions and their lengths
    const funcNodes: any[] = [];
    function collectFunctions(node: any) {
      if (['function_definition', 'method_declaration', 'function_declaration', 'arrow_function'].includes(node.type)) {
        funcNodes.push(node);
      }
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) collectFunctions(child);
      }
    }
    collectFunctions(tree.rootNode);

    const functionCount = funcNodes.length;
    const functionLengths = funcNodes.map(f => f.endPosition.row - f.startPosition.row + 1);
    const avgFunctionLength = functionCount > 0 
      ? Math.round(functionLengths.reduce((a, b) => a + b, 0) / functionCount)
      : 0;
    const maxFunctionLength = functionCount > 0 ? Math.max(...functionLengths) : 0;

    // Max nesting depth
    function getMaxDepth(node: any, depth = 0): number {
      const nestyTypes = ['if_statement', 'for_statement', 'while_statement', 'try_statement', 'switch_statement', 'with_statement'];
      const currentDepth = nestyTypes.includes(node.type) ? depth + 1 : depth;
      let max = currentDepth;
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) max = Math.max(max, getMaxDepth(child, currentDepth));
      }
      return max;
    }
    const maxNestingDepth = getMaxDepth(tree.rootNode);

    // Count parameters per function
    const paramCounts = funcNodes.map(f => {
      const params = f.childForFieldName('parameters') || f.childForFieldName('formal_parameters');
      return params ? params.namedChildCount : 0;
    });
    const maxParams = paramCounts.length > 0 ? Math.max(...paramCounts) : 0;

    // Maintainability Index (simplified Microsoft formula variant: 0-100)
    const halsteadVolume = codeOnlyLines * Math.log2(Math.max(codeOnlyLines, 2));
    const mi = Math.max(0, Math.min(100, Math.round(
      171 - 5.2 * Math.log(Math.max(halsteadVolume, 1)) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(Math.max(codeOnlyLines, 1))
    )));

    // Code Smells
    const smells: import('./types').CodeSmell[] = [];

    funcNodes.forEach((f, i) => {
      const len = functionLengths[i];
      const params = paramCounts[i];
      const nameNode = f.childForFieldName('name');
      const name = nameNode ? nameNode.text : 'anonymous';
      if (len > 30) smells.push({ severity: 'warning', message: `Function '${name}' is ${len} lines long (recommended < 30)`, line: f.startPosition.row + 1 });
      if (len > 50) smells.push({ severity: 'error', message: `Function '${name}' is too long at ${len} lines — consider breaking it up`, line: f.startPosition.row + 1 });
      if (params > 5) smells.push({ severity: 'warning', message: `Function '${name}' has ${params} parameters (recommended ≤ 5)`, line: f.startPosition.row + 1 });
    });

    if (maxNestingDepth > 4) smells.push({ severity: 'error', message: `Max nesting depth is ${maxNestingDepth} (recommended ≤ 4) — flatten with early returns` });
    else if (maxNestingDepth > 3) smells.push({ severity: 'warning', message: `Nesting depth of ${maxNestingDepth} makes code harder to read` });

    // Language-specific smells
    if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
      const varMatches = code.match(/\bvar\b/g);
      if (varMatches) smells.push({ severity: 'info', message: `Found ${varMatches.length} use(s) of 'var' — prefer 'const' or 'let'` });
      if (code.includes('== ') && !code.includes('=== ')) smells.push({ severity: 'warning', message: "Use '===' instead of '==' for strict equality comparisons" });
    }
    if (language.toLowerCase() === 'python') {
      if (code.includes('except:') || code.match(/except\s*:\s*(\n|$)/)) smells.push({ severity: 'error', message: "Bare 'except:' clause detected — always specify the exception type" });
    }
    if (language.toLowerCase() === 'java') {
      if (code.includes('catch (Exception e) {}') || code.match(/catch\s*\([^)]+\)\s*\{\s*\}/)) smells.push({ severity: 'error', message: 'Empty catch block detected — handle or log the exception' });
    }

    // Magic numbers
    const magicNumbers = code.match(/(?<![.\w])\b(?!0|1|2\b)\d+\b(?!\s*[;,])(?!\w)/g);
    if (magicNumbers && magicNumbers.length > 3) {
      smells.push({ severity: 'info', message: `${magicNumbers.length} magic numbers detected — consider extracting them into named constants` });
    }

    // Suggestions
    const suggestions: string[] = [];
    if (language.toLowerCase() === 'javascript') {
      suggestions.push('✅ Use arrow functions for callbacks and short expressions');
      suggestions.push('✅ Prefer destructuring for cleaner variable assignments');
      if (cyclomaticComplexity > 5) suggestions.push('✅ Consider extracting complex conditionals into named boolean variables');
    }
    if (language.toLowerCase() === 'python') {
      suggestions.push('✅ Add type hints (e.g. def foo(x: int) -> str:) for better readability');
      suggestions.push('✅ Use list comprehensions instead of map/filter where possible');
      if (functionCount > 3) suggestions.push('✅ Consider grouping related functions into a class');
    }
    if (language.toLowerCase() === 'java') {
      suggestions.push('✅ Use the final keyword on variables that are never reassigned');
      suggestions.push('✅ Prefer interfaces over abstract classes for flexibility');
      suggestions.push('✅ Use try-with-resources for streams and connections');
    }
    if (commentLines < Math.floor(totalLines * 0.1)) suggestions.push('✅ Add more comments — aim for at least 10% comment density');
    if (avgFunctionLength > 20) suggestions.push('✅ Keep functions under 20 lines — smaller functions are easier to test');

    // Scores
    const locScore = Math.max(0, Math.min(100, 100 - Math.max(0, totalLines - 200)));
    const nestScore = maxNestingDepth <= 2 ? 100 : maxNestingDepth === 3 ? 80 : maxNestingDepth === 4 ? 60 : 30;
    const fnLenScore = avgFunctionLength <= 15 ? 100 : avgFunctionLength <= 25 ? 80 : avgFunctionLength <= 40 ? 60 : 30;
    const smellPenalty = smells.filter(s => s.severity === 'error').length * 15 + smells.filter(s => s.severity === 'warning').length * 7;
    const overallScore = Math.max(0, Math.min(100, Math.round((mi + nestScore + fnLenScore) / 3 - smellPenalty)));

    const codeQuality: import('./types').CodeQuality = {
      overallScore,
      metrics: [
        { label: 'Lines of Code', value: totalLines, score: locScore },
        { label: 'Functions', value: functionCount, score: functionCount === 0 ? 100 : Math.max(0, 100 - functionCount * 2) },
        { label: 'Avg Function Length', value: avgFunctionLength > 0 ? `${avgFunctionLength} lines` : 'N/A', score: fnLenScore },
        { label: 'Max Nesting Depth', value: maxNestingDepth, score: nestScore },
        { label: 'Maintainability', value: mi >= 80 ? 'High' : mi >= 50 ? 'Medium' : 'Low', score: mi },
        { label: 'Comment Density', value: `${Math.round((commentLines / Math.max(totalLines, 1)) * 100)}%`, score: Math.min(100, Math.round((commentLines / Math.max(totalLines, 1)) * 500)) },
      ],
      smells,
      suggestions
    };

    return {
      explanation: finalExplanation,
      summary: finalSummary,
      nodes,
      edges,
      complexity: { score: cyclomaticComplexity, rating },
      codeQuality
    };
  } catch (error: any) {
    console.error("Tree-Sitter Parsing Error:", error);
    return {
      explanation: `Could not parse the code structure. Error: ${error.message}`,
      summary: "The code provided appears to contain syntax errors or is not a known language.",
      nodes: [{ id: 'error', position: { x: 0, y: 0 }, data: { label: 'Syntax Error' }, style: { background: '#ef4444', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: '2px solid #b91c1c' } }],
      edges: [],
      complexity: { score: 0, rating: 'Error' },
      codeQuality: { overallScore: 0, metrics: [], smells: [], suggestions: [] }
    };
  }
}
