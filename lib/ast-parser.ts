import * as acorn from 'acorn';
import * as estraverse from 'estraverse';

export interface ExplanationResult {
  explanation: string;
  summary: string;
  diagram: string;
}

export function parseAndExplainCode(code: string): ExplanationResult {
  try {
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    
    const explanationLines: string[] = [];
    const summaryPoints: string[] = [];
    
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
        
        switch (node.type) {
          case 'FunctionDeclaration':
            const funcName = node.id ? node.id.name : 'anonymous';
            summaryPoints.push(`Defines a function named '${funcName}'.`);
            explanationLines.push(`Line ${node.loc?.start.line || '?'}: Defines a new function '${funcName}'.`);
            
            const funcNodeId = getNodeId('func');
            diagram += `${currentNodeId} --> ${funcNodeId}["Define Function: ${funcName}"]\n`;
            currentNodeId = funcNodeId;
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

    return {
      explanation: finalExplanation,
      summary: finalSummary,
      diagram: diagram
    };
    
  } catch (error: any) {
    console.error("AST Parsing Error:", error);
    return {
      explanation: `Could not parse the code structure. Error: ${error.message}`,
      summary: "The code provided appears to contain syntax errors or is not valid JavaScript.",
      diagram: "flowchart TD\nError[\"Syntax Error in Code\"]\nError --> End"
    };
  }
}
