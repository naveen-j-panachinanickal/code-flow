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
    const functions: Record<string, { entryNode: string; body: string }> = {};
    const calls: { fromNode: string; toMethod: string }[] = [];
    
    // Global Script Scope is treated as the main executing body
    let currentFunctionName: string | null = '__main__';
    const mainEntryId = getNodeId('main');
    let currentNodeId: string | null = mainEntryId;
    
    functions['__main__'] = {
        entryNode: mainEntryId,
        body: `        ${mainEntryId}["Global Script Context"]\n`
    };

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const tLine = line.trim();

      if (!tLine || tLine.startsWith('#')) return;

      // Identify Function Calls early
      if (currentNodeId) {
        const callMatches = tLine.matchAll(/([a-zA-Z0-9_]+)\s*\(/g);
        for (const match of Array.from(callMatches)) {
            const calledName = match[1];
            // Filter keywords and built-ins
            if (!['if', 'elif', 'for', 'while', 'catch', 'try', 'except', 'print', 'range', 'len', 'int', 'str', 'float', 'list', 'dict', 'set', currentFunctionName].includes(calledName)) {
                calls.push({ fromNode: currentNodeId, toMethod: calledName });
            }
        }
      }

      // Match Function Definition
      const defMatch = tLine.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
      if (defMatch) {
         currentFunctionName = defMatch[1];
         summaryPoints.push(`Defines Python function '${currentFunctionName}'.`);
         explanationLines.push(`Line ${lineNum}: Defines function '${currentFunctionName}'.`);
         
         const funcNodeId = getNodeId('func');
         currentNodeId = funcNodeId;
         
         functions[currentFunctionName] = {
            entryNode: funcNodeId,
            body: `        ${funcNodeId}["Function Entry: ${currentFunctionName}()"]\n`
         };
         return;
      }
      
      // Global entry point pattern `if __name__ == "__main__":`
      if (tLine.startsWith('if __name__')) {
         currentFunctionName = '__main__';
         const ifNodeId = getNodeId('if');
         currentNodeId = ifNodeId;
         functions['__main__'].body += `        ${ifNodeId}["Execution Target: __main__ Check"]\n`;
         return; 
      }

      function appendToCurrentMethod(arrowText: string) {
          if (currentFunctionName && functions[currentFunctionName]) {
              functions[currentFunctionName].body += `        ${arrowText}\n`;
          }
      }

      // Match Control Flow
      if (tLine.startsWith('if ') || tLine.startsWith('elif ')) {
         cyclomaticComplexity++;
         summaryPoints.push(`Contains conditional logic.`);
         explanationLines.push(`Line ${lineNum}: Evaluates a boolean condition.`);
         const ifNodeId = getNodeId('if');
         appendToCurrentMethod(`${currentNodeId} --> ${ifNodeId}{"Condition Check"}`);
         
         const yesNodeId = getNodeId('yes');
         const noNodeId = getNodeId('no');
         appendToCurrentMethod(`${ifNodeId} -- True --> ${yesNodeId}["Execute True Branch"]`);
         appendToCurrentMethod(`${ifNodeId} -- False --> ${noNodeId}["Next Step / False Branch"]`);
         
         const convergeNodeId = getNodeId('continue');
         appendToCurrentMethod(`${yesNodeId} --> ${convergeNodeId}(("Merge Flow Logic"))`);
         appendToCurrentMethod(`${noNodeId} --> ${convergeNodeId}`);
         
         currentNodeId = convergeNodeId;
         return;
      }

      if (tLine.startsWith('for ') || tLine.startsWith('while ')) {
         cyclomaticComplexity++;
         summaryPoints.push(`Contains a loop construct.`);
         explanationLines.push(`Line ${lineNum}: Begins a loop iteration.`);
         const loopNodeId = getNodeId('loop');
         const loopBodyId = getNodeId('loopbody');
         const loopEndId = getNodeId('endloop');
         
         appendToCurrentMethod(`${currentNodeId} --> ${loopNodeId}{"Loop Condition"}`);
         appendToCurrentMethod(`${loopNodeId} -- True --> ${loopBodyId}["Loop Body Start"]`);
         appendToCurrentMethod(`${loopBodyId} --> ${loopNodeId}`); // Return Path
         appendToCurrentMethod(`${loopNodeId} -- False --> ${loopEndId}["Exit Loop"]`);
         
         currentNodeId = loopBodyId;
         return;
      }

      // Match Error Handling
      if (tLine.startsWith('try:')) {
         summaryPoints.push(`Contains error handling (try/except block).`);
         explanationLines.push(`Line ${lineNum}: Starts a try block.`);
         const tryNodeId = getNodeId('try');
         appendToCurrentMethod(`${currentNodeId} --> ${tryNodeId}["Execute Try Block"]`);
         currentNodeId = tryNodeId;
         return;
      }

      if (tLine.startsWith('except') || tLine.startsWith('except:')) {
         cyclomaticComplexity++;
         explanationLines.push(`Line ${lineNum}: Catches errors from 'try' block.`);
         const catchNodeId = getNodeId('except');
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
         explanationLines.push(`Line ${lineNum}: Returns a value.`);
         const returnNodeId = getNodeId('return');
         appendToCurrentMethod(`${currentNodeId} --> ${returnNodeId}(["Return Statement"])`);
         currentNodeId = returnNodeId;
         return;
      }

      const printMatch = tLine.match(/print\s*\(/);
      if (printMatch) {
         explanationLines.push(`Line ${lineNum}: Prints output to the console.`);
         const logNodeId = getNodeId('print');
         appendToCurrentMethod(`${currentNodeId} --> ${logNodeId}["print()"]`);
         currentNodeId = logNodeId;
         return;
      }
      
      // Fallback for Variable Assignments / Calls
      if (tLine.includes('=') && !tLine.includes('==')) {
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

    // Hook up start!
    diagram += `    Start --> ${functions['__main__'].entryNode}\n\n`;

    // Embed all Function Subgraphs
    for (const [funcName, funcData] of Object.entries(functions)) {
        // If script is just functions, main might only be the entry node. That's fine.
        const titleName = funcName === '__main__' ? 'Global Script Context' : `Execution Scope ${funcName}`;
        diagram += `    subgraph method_${funcName} [${titleName}]\n`;
        diagram += `        direction TB\n`;
        diagram += funcData.body;
        diagram += `    end\n\n`;
    }

    // Connect Cross-method Calls (The Call Graph aspect)
    for (const call of calls) {
        if (functions[call.toMethod]) {
            diagram += `    ${call.fromNode} -- "Executes ${call.toMethod}()" --> ${functions[call.toMethod].entryNode}\n`;
        }
    }

    // Deduplicate summaries
    const uniqueSummaries = [...new Set(summaryPoints)];
    const finalSummary = uniqueSummaries.length > 0 
      ? uniqueSummaries.join(' ') 
      : "This Python script executes statements sequentially.";
      
    const finalExplanation = explanationLines.length > 0
      ? explanationLines.join('\n')
      : "The code is parsed successfully, but no major structural landmarks (like functions, loops, or conditionals) were highlighted.";

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
    console.error("Python Regex Parsing Error:", error);
    return {
      explanation: `Could not parse the Python code structure. Error: ${error.message}`,
      summary: "The code provided appears to contain syntax errors or is not valid Python.",
      diagram: "flowchart TD\nError[\"Syntax Error in Python Code\"]\nError --> End",
      complexity: {
        score: 0,
        rating: 'Error'
      }
    };
  }
}
