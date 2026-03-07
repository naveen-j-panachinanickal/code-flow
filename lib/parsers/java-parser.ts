import { ExplanationResult } from '../ast-parser';

export function parseAndExplainCode(code: string): ExplanationResult {
  try {
    const explanationLines: string[] = [];
    const summaryPoints: string[] = [];
    
    let cyclomaticComplexity = 1;
    let nodeIdCounter = 0;
    
    function getNodeId(prefix: string) {
      return `${prefix}_${nodeIdCounter++}`;
    }

    const lines = code.split('\n');

    // Execution Graph State Tracking
    const methods: Record<string, { entryNode: string; body: string }> = {};
    const calls: { fromNode: string; toMethod: string }[] = [];
    
    let currentMethodName: string | null = null;
    let currentNodeId: string | null = null;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const tLine = line.trim();

      if (!tLine || tLine.startsWith('//')) return;

      // Match Method Definitions (simplified regex for public/private/protected returntype name())
      const methodMatch = tLine.match(/(?:public|private|protected)\s+(?:static\s+)?[\w<>[\]]+\s+([a-zA-Z0-9_]+)\s*\(/);
      if (methodMatch && !tLine.endsWith(';')) {
         const methodName = methodMatch[1];
         // Exclude common false positives like 'new' or 'return'
         if (!['new', 'return'].includes(methodName)) {
           currentMethodName = methodName;
           summaryPoints.push(`Declares method '${methodName}'.`);
           explanationLines.push(`Line ${lineNum}: Defines method block '${methodName}'.`);
           
           const funcNodeId = getNodeId('method');
           currentNodeId = funcNodeId;
           
           methods[currentMethodName] = {
              entryNode: funcNodeId,
              body: `        ${funcNodeId}["Method Entry: ${methodName}"]\n`
           };
           return;
         }
      }

      // Identify Method Calls
      if (currentNodeId) {
        const callMatches = tLine.matchAll(/([a-zA-Z0-9_]+)\s*\(/g);
        for (const match of Array.from(callMatches)) {
            const calledName = match[1];
            // Filter keywords that look like function calls in regex
            if (!['if', 'for', 'while', 'catch', 'System', 'out', 'print', 'println', 'try', 'return', 'new', currentMethodName].includes(calledName)) {
                calls.push({ fromNode: currentNodeId, toMethod: calledName });
            }
        }
      }

      // Match Class Definition
      const classMatch = tLine.match(/class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
         const className = classMatch[1];
         summaryPoints.push(`Defines Java class '${className}'.`);
         explanationLines.push(`Line ${lineNum}: Declares a new class structure '${className}'.`);
         return;
      }

      // Ensure we are inside a tracked method before continuing to add blocks
      if (!currentMethodName || !currentNodeId) return;

      function appendToCurrentMethod(arrowText: string) {
          if (currentMethodName) {
              methods[currentMethodName].body += `        ${arrowText}\n`;
          }
      }

      // Match Control Flow
      if (tLine.startsWith('if (') || tLine.startsWith('if(') || tLine.includes(' else if ')) {
         cyclomaticComplexity++;
         summaryPoints.push(`Contains conditional branching logic.`);
         explanationLines.push(`Line ${lineNum}: Evaluates a boolean condition.`);
         const ifNodeId = getNodeId('if');
         appendToCurrentMethod(`${currentNodeId} --> ${ifNodeId}{"Condition Check"}`);
         
         const yesNodeId = getNodeId('yes');
         const noNodeId = getNodeId('no');
         appendToCurrentMethod(`${ifNodeId} -- True --> ${yesNodeId}["Execute If Block"]`);
         appendToCurrentMethod(`${ifNodeId} -- False --> ${noNodeId}["Next Step / Else"]`);
         
         const convergeNodeId = getNodeId('continue');
         appendToCurrentMethod(`${yesNodeId} --> ${convergeNodeId}(("Merge Logic Paths"))`);
         appendToCurrentMethod(`${noNodeId} --> ${convergeNodeId}`);
         
         currentNodeId = convergeNodeId;
         return;
      }

      if (tLine.startsWith('for ') || tLine.startsWith('for(') || tLine.startsWith('while ') || tLine.startsWith('while(')) {
         cyclomaticComplexity++;
         summaryPoints.push(`Contains a loop construct.`);
         explanationLines.push(`Line ${lineNum}: Begins a loop to iterate over code repeatedly.`);
         const loopNodeId = getNodeId('loop');
         const loopBodyId = getNodeId('loopbody');
         const loopEndId = getNodeId('endloop');
         
         appendToCurrentMethod(`${currentNodeId} --> ${loopNodeId}{"Loop Condition"}`);
         appendToCurrentMethod(`${loopNodeId} -- True --> ${loopBodyId}["Loop Iteration Start"]`);
         appendToCurrentMethod(`${loopBodyId} --> ${loopNodeId}`); // Return path
         appendToCurrentMethod(`${loopNodeId} -- False --> ${loopEndId}["Exit Loop Block"]`);
         
         // Set the current node to the loop body so internal statements get linked sequentially out of it!
         currentNodeId = loopBodyId;
         return;
      }

      // Match Error Handling
      if (tLine.startsWith('try {') || tLine === 'try') {
         summaryPoints.push(`Contains error handling blocks (Try).`);
         explanationLines.push(`Line ${lineNum}: Opens a 'try' block to monitor for exceptions.`);
         const tryNodeId = getNodeId('try');
         appendToCurrentMethod(`${currentNodeId} --> ${tryNodeId}["Execute Try Block"]`);
         currentNodeId = tryNodeId;
         if (!tLine.includes('catch')) return;
      }

      if (tLine.includes('catch ') || tLine.includes('catch(')) {
         cyclomaticComplexity++;
         explanationLines.push(`Line ${lineNum}: Implements a 'catch' block to recover from exceptions.`);
         const catchNodeId = getNodeId('catch');
         appendToCurrentMethod(`${currentNodeId} -.-> ${catchNodeId}["Catch Error"]`);
         
         const continueNode = getNodeId('continue_after_catch');
         appendToCurrentMethod(`${currentNodeId} --> ${continueNode}(("Continue Execution"))`);
         appendToCurrentMethod(`${catchNodeId} --> ${continueNode}`);
         
         currentNodeId = continueNode;
         return;
      }

      // Match Returns and Outputs
      const returnMatch = tLine.match(/^return\s*(.*)/);
      if (returnMatch) {
         explanationLines.push(`Line ${lineNum}: Returns a computed value or exits the method.`);
         const returnNodeId = getNodeId('return');
         appendToCurrentMethod(`${currentNodeId} --> ${returnNodeId}(["Return Statement"])`);
         currentNodeId = returnNodeId;
         return;
      }

      const printMatch = tLine.match(/System\.out\.(print|println)\s*\(/);
      if (printMatch) {
         explanationLines.push(`Line ${lineNum}: Output printed to the System console.`);
         const logNodeId = getNodeId('print');
         appendToCurrentMethod(`${currentNodeId} --> ${logNodeId}["System.out.print()"]`);
         currentNodeId = logNodeId;
         return;
      }
      
      // Fallback for Variable Assignments / Calls
      if (tLine.includes('=') && !tLine.includes('==') && tLine.endsWith(';')) {
          explanationLines.push(`Line ${lineNum}: Variable assignment or operation.`);
          const stmtNodeId = getNodeId('stmt');
          
          let displayLine = tLine.substring(0, 30).replace(/["'{}]/g, '').trim();
          if (tLine.length > 30) displayLine += '...';
          
          appendToCurrentMethod(`${currentNodeId} --> ${stmtNodeId}["Assign: ${displayLine}"]`);
          currentNodeId = stmtNodeId;
          return;
      }
    });

    // Assemble the formal Subgraph Diagram
    let diagram = 'flowchart TD\n';
    diagram += '    %% Program Execution Entry Point\n';
    diagram += '    Start((("Program Start")))\n\n';

    // Hook up start! Detect traditional main method, or assume first parsed method.
    if (methods['main']) {
        diagram += `    Start --> ${methods['main'].entryNode}\n\n`;
    } else {
        const firstMethod = Object.keys(methods)[0];
        if (firstMethod) {
            diagram += `    Start --> ${methods[firstMethod].entryNode}\n\n`;
        } else {
             diagram += `    Start --> End((("Program End")))\n\n`;
        }
    }

    // Embed all Method Subgraphs
    for (const [methodName, methodData] of Object.entries(methods)) {
        diagram += `    subgraph method_${methodName} [Method Execution ${methodName}]\n`;
        diagram += `        direction TB\n`;
        diagram += methodData.body;
        diagram += `    end\n\n`;
    }

    // Connect Cross-method Calls (The Call Graph aspect)
    for (const call of calls) {
        if (methods[call.toMethod]) {
            diagram += `    ${call.fromNode} -- "Executes ${call.toMethod}()" --> ${methods[call.toMethod].entryNode}\n`;
        }
    }

    // Deduplicate summaries
    const uniqueSummaries = [...new Set(summaryPoints)];
    const finalSummary = uniqueSummaries.length > 0 
      ? uniqueSummaries.join(' ') 
      : "This Java code executes basic statements natively.";
      
    const finalExplanation = explanationLines.length > 0
      ? explanationLines.join('\n')
      : "The code parses correctly as Java, but no major structural landmarks (classes, loops, methods) were extracted.";

    let rating = 'Low';
    if (cyclomaticComplexity > 10) rating = 'High';
    else if (cyclomaticComplexity > 5) rating = 'Medium';

    return {
      explanation: finalExplanation,
      summary: finalSummary,
      diagram: diagram,
      complexity: {
        score: cyclomaticComplexity,
        rating: rating
      }
    };
    
  } catch (error: any) {
    console.error("Java Regex Parsing Error:", error);
    return {
      explanation: `Could not parse the Java code structure. Error: ${error.message}`,
      summary: "Syntax error encountered during parsing.",
      diagram: "flowchart TD\nError[\"Java Syntax Error\"]\nError --> End",
      complexity: {
        score: 0,
        rating: 'Error'
      }
    };
  }
}
