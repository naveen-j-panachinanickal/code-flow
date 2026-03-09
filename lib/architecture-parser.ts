import { FlowNode, FlowEdge } from './types';
// Architecture diagram utility — no external dependencies needed

export interface ArchitectureDiagramData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  summary: string[];
}

/**
 * Very basic regex-based parser to build an architecture dependency diagram
 * across a repository's files. It looks for import / require statements.
 */
export function buildArchitectureDiagram(files: { path: string, code: string }[]): ArchitectureDiagramData {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  
  const baseNodeStyle = {
    background: '#1e293b', 
    color: '#f8fafc',
    border: '2px solid #8b5cf6', // Purple border to distinguish from Flow nodes
    borderRadius: '12px',
    padding: '16px 20px',
    fontSize: '14px',
    fontWeight: '700',
    minWidth: '220px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
  };
  
  const edgeStyle = {
    stroke: '#64748b', 
    strokeWidth: 2,
    opacity: 0.6
  };

  // 1. Create a node for every file
  files.forEach((file, index) => {
    // Determine a color based on depth
    const depth = file.path.split('/').length - 1;
    const bgColors = ['#0f172a', '#1e293b', '#334155'];
    const nodeBg = bgColors[Math.min(depth, bgColors.length - 1)];

    nodes.push({
      id: file.path,
      position: { x: 0, y: index * 120 }, // position will be handled by dagre later
      data: { label: file.path },
      style: { ...baseNodeStyle, background: nodeBg }
    });
  });

  // 2. Regex search for imports and map to edges
  files.forEach((file) => {
    const code = file.code;
    const currentDir = file.path.split('/').slice(0, -1).join('/');
    
    // Simplistic regex for ES6 imports and CommonJS requires
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1] || match[2];
      if (!importPath) continue;

      // Ignore external dependencies (doesn't start with . or /)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue;
      }

      // Resolve relative path roughly
      let resolvedPath = importPath;
      if (importPath.startsWith('./')) {
        resolvedPath = currentDir ? `${currentDir}/${importPath.slice(2)}` : importPath.slice(2);
      } else if (importPath.startsWith('../')) {
        const parts = currentDir.split('/');
        const importParts = importPath.split('/');
        for (const part of importParts) {
          if (part === '..') parts.pop();
          else if (part !== '.') parts.push(part);
        }
        resolvedPath = parts.join('/');
      }

      // Try to find the matching file node (ignoring extensions since imports often drop them)
      const targetFile = files.find(f => {
        // match exact path
        if (f.path === resolvedPath) return true;
        // match path without extension
        const fPathNoExt = f.path.replace(/\.[^/.]+$/, "");
        if (fPathNoExt === resolvedPath) return true;
        // match index file resolving
        if (fPathNoExt === `${resolvedPath}/index`) return true;
        return false;
      });

      if (targetFile) {
        // Create an edge if we found a match
        const edgeId = `e_${file.path}_${targetFile.path}`;
        // Ensure no duplicate edges
        if (!edges.some(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: file.path,
            target: targetFile.path,
            animated: true,
            style: edgeStyle,
            type: 'default'
          });
        }
      }
    }
  });

  // 3. Generate textual summary based on graph
  const summary: string[] = [];
  
  // Find Entry Points (nodes with outgoing edges but no incoming ones)
  const incomingCounts: Record<string, number> = {};
  const outgoingCounts: Record<string, number> = {};
  nodes.forEach(n => { incomingCounts[n.id] = 0; outgoingCounts[n.id] = 0; });
  edges.forEach(e => {
    outgoingCounts[e.source] = (outgoingCounts[e.source] || 0) + 1;
    incomingCounts[e.target] = (incomingCounts[e.target] || 0) + 1;
  });

  const entryPoints = nodes.filter(n => incomingCounts[n.id] === 0 && outgoingCounts[n.id] > 0);
  if (entryPoints.length > 0) {
    summary.push(`### Entry Points`);
    summary.push(`- The repository is primarily driven by: \`${entryPoints.map(e => e.id).slice(0, 3).join('`, `')}\`${entryPoints.length > 3 ? ' and others' : ''}.`);
    summary.push(`- These files import dependencies but are not imported by anything else.`);
  }

  const coreUtils = nodes.filter(n => incomingCounts[n.id] >= 2);
  if (coreUtils.length > 0) {
    // Sort by most incoming edges
    coreUtils.sort((a, b) => incomingCounts[b.id] - incomingCounts[a.id]);
    summary.push(`### Shared Dependencies`);
    summary.push(`- The most frequently reused files (Utilities/Core) are: \`${coreUtils.map(e => e.id).slice(0, 3).join('`, `')}\`.`);
    summary.push(`- Abstracting logic into these files is a good architectural pattern.`);
  }

  // Directory analysis
  const dirs = new Set(nodes.map(n => n.id.split('/')[0]).filter(d => d && !d.includes('.')));
  if (dirs.size > 0) {
    summary.push(`### Directory Structure`);
    summary.push(`- The project separates concerns into top-level directories like: \`${Array.from(dirs).slice(0, 4).join('`, `')}\`.`);
  }

  if (summary.length === 0) {
    summary.push(`### Linear Structure`);
    summary.push(`- This repository has a fairly linear or flat structure with minimal cross-file dependencies.`);
  }

  return { nodes, edges, summary };
}
