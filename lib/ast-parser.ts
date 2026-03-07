import * as acorn from 'acorn';
import * as estraverse from 'estraverse';

export interface ExplanationResult {
  explanation: string;
  summary: string;
  diagram: string;
  complexity: {
    score: number;
    rating: string;
  };
}

export function parseAndExplainCode(code: string): ExplanationResult {
  try {
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    
    const explanationLines: string[] = [];
    const summaryPoints: string[] = [];
    
    // Metrics State
    let cyclomaticComplexity = 1; // Base complexity is 1 for a single path
    
    // Mermaid diagram state
    let diagram = 'flowchart TD\n';
    let nodeIdCounter = 0;
    
    function getNodeId(prefix: string) {
      return `${prefix}_${nodeIdCounter++}`;
    }

    let startNode = 'Start';
    diagram += `${startNode}(["Start"])\n`;
    let currentNodeId = startNode;

    // Traverse the AST to gather information
    estraverse.traverse(ast as any, {
      enter: function (node, parent) {
        
        // Cyclomatic Complexity calculation: +1 for every control flow branch
        if ([
          'IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement', 
          'CatchClause', 'ConditionalExpression', 'LogicalExpression'
        ].includes(node.type)) {
          cyclomaticComplexity++;
        }
        
        if (node.type === 'SwitchCase') {
          // Default case does not add to complexity, only actual cases
          if ((node as any).test !== null) {
            cyclomaticComplexity++;
          }
        }

        switch (node.type) {
          case 'FunctionDeclaration':
            const funcName = node.id ? node.id.name : 'anonymous';
            summaryPoints.push(`Defines a function named '${funcName}'.`);
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Defines a new function '${funcName}'.`);
            
            const funcNodeId = getNodeId('func');
            diagram += `${currentNodeId} --> ${funcNodeId}["Define Function: ${funcName}"]\n`;
            currentNodeId = funcNodeId;
            break;

          case 'ArrowFunctionExpression':
             summaryPoints.push(`Defines an arrow function.`);
             explanationLines.push(`Line ${node.loc?.start.line || '?'}: Defines an arrow function.`);
             const arrowNodeId = getNodeId('arrow');
             diagram += `${currentNodeId} --> ${arrowNodeId}["Define Arrow Function"]\n`;
             currentNodeId = arrowNodeId;
             break;
            
          case 'VariableDeclaration':
            const kind = node.kind;
            const declarations = node.declarations.map((d: any) => d.id?.name).join(', ');
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Declares variable(s) '${declarations}' using '${kind}'.`);
            break;

          case 'IfStatement':
            summaryPoints.push(`Contains conditional logic (if-statement).`);
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Starts an 'if' condition to branch logic.`);
            const ifNodeId = getNodeId('if');
            diagram += `${currentNodeId} --> ${ifNodeId}{"Condition Check"}\n`;
            
            // Assume branches for simplicity in diagram
            const yesNodeId = getNodeId('yes');
            const noNodeId = getNodeId('no');
            diagram += `${ifNodeId} -- Yes --> ${yesNodeId}["Execute True Branch"]\n`;
            diagram += `${ifNodeId} -- No --> ${noNodeId}["Execute False/Next Branch"]\n`;
            
            currentNodeId = noNodeId; // simplified pathing
            break;

          case 'SwitchStatement':
            summaryPoints.push(`Contains a switch statement for multi-case logic.`);
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Evaluates a switch statement.`);
            const switchNodeId = getNodeId('switch');
            diagram += `${currentNodeId} --> ${switchNodeId}{"Switch Cases"}\n`;
            currentNodeId = switchNodeId;
            break;
            
          case 'ForStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            summaryPoints.push(`Contains a loop construct.`);
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Starts a loop that will repeat a block of code.`);
            const loopNodeId = getNodeId('loop');
            diagram += `${currentNodeId} --> ${loopNodeId}["Loop Iteration"]\n`;
            diagram += `${loopNodeId} -- Repeat --> ${loopNodeId}\n`;
            diagram += `${loopNodeId} -- End --> ${getNodeId('endloop')}["Exit Loop"]\n`;
            currentNodeId = loopNodeId;
            break;

          case 'TryStatement':
            summaryPoints.push(`Contains error handling (try/catch block).`);
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Starts a try block to catch potential runtime errors.`);
            const tryNodeId = getNodeId('try');
            diagram += `${currentNodeId} --> ${tryNodeId}["Try Block"]\n`;
            currentNodeId = tryNodeId;
            break;

          case 'CatchClause':
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Catches errors thrown in the preceding try block.`);
            const catchNodeId = getNodeId('catch');
            // Assuming the try block flows into the catch block on error
            diagram += `${currentNodeId} -. Error .-> ${catchNodeId}["Catch Error"]\n`;
            currentNodeId = catchNodeId;
            break;
            
          case 'ReturnStatement':
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Returns a value from the function.`);
            const returnNodeId = getNodeId('return');
            diagram += `${currentNodeId} --> ${returnNodeId}(["Return Value"])\n`;
            break;

          case 'CallExpression':
            if (node.callee.type === 'Identifier') {
                const callName = (node.callee as any).name;
                explanationLines.push(`Line ${node.loc?.start.line || '?'}: Calls a function named '${callName}'.`);
            } else if (node.callee.type === 'MemberExpression') {
                const objectName = (node.callee as any).object?.name || 'object';
                const propertyName = (node.callee as any).property?.name || 'method';
                explanationLines.push(`Line ${node.loc?.start.line || '?'}: Calls the method '${propertyName}' on '${objectName}'.`);
                
                if (objectName === 'console' && propertyName === 'log') {
                   const logNodeId = getNodeId('log');
                   diagram += `${currentNodeId} --> ${logNodeId}["Print to Console"]\n`;
                   currentNodeId = logNodeId;
                }
            }
            break;
        }
      }
    });

    diagram += `${currentNodeId} --> End(["End"])\n`;

    const finalSummary = summaryPoints.length > 0 
      ? summaryPoints.join(' ') 
      : "This script executes basic JavaScript statements sequentially.";
      
    const finalExplanation = explanationLines.length > 0
      ? explanationLines.join('\n')
      : "The code is parsed successfully, but no major structural landmarks (like functions, loops, or conditionals) were highlighted.";

    // Determine complexity rating
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
    console.error("AST Parsing Error:", error);
    return {
      explanation: `Could not parse the code structure. Error: ${error.message}`,
      summary: "The code provided appears to contain syntax errors or is not valid JavaScript.",
      diagram: "flowchart TD\nError[\"Syntax Error in Code\"]\nError --> End",
      complexity: {
        score: 0,
        rating: 'Error'
      }
    };
  }
}
