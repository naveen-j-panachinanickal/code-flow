import { FlowNode, FlowEdge } from './types';
import { RepoFile } from '@/components/GithubInput'; // Using RepoFile to get file definitions

export interface ArchitectureDiagramData {
  nodes: FlowNode[];
  edges: FlowEdge[];
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
    textAlign: 'center',
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

  return { nodes, edges };
}
