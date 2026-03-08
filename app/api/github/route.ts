import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// Detect language from file extension
function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python',
    java: 'java',
    rb: 'ruby', go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin'
  };
  return map[ext] || 'javascript';
}

// Convert GitHub blob URL to raw URL
function toRawUrl(githubUrl: string): { rawUrl: string; filename: string; language: string } | null {
  try {
    // Handle: https://github.com/user/repo/blob/branch/path/to/file.ext
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
    if (!match) return null;
    const [, user, repo, branch, filePath] = match;
    const filename = filePath.split('/').pop() || filePath;
    const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
    return { rawUrl, filename, language: detectLanguage(filename) };
  } catch {
    return null;
  }
}

// Parse GitHub repo URL to get owner + repo
function parseRepoUrl(githubUrl: string): { owner: string; repo: string } | null {
  try {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

// Analyzable code extensions
const ANALYZABLE_EXTENSIONS = new Set([
  'js', 'jsx', 'mjs', 'cjs',
  'ts', 'tsx',
  'py', 'pyw',
  'java',
  'kt', 'kts',
  'rb',
  'go',
  'rs',
  'cpp', 'cc', 'cxx', 'c', 'h', 'hpp',
  'cs',
  'php',
  'swift',
  'scala',
  'dart',
  'vue', 'svelte',
]);

// Directories to always skip
const SKIP_DIRS = [
  'node_modules/', '.next/', '.nuxt/', 'dist/', '.git/',
  'vendor/', '__pycache__/', 'coverage/', '.gradle/',
  'target/', // Java Maven output
  '.idea/', '.vscode/',
  'Pods/', // iOS CocoaPods
];

export async function POST(req: NextRequest) {
  try {
    const { url, mode } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'GitHub URL is required' }, { status: 400 });
    }

    // Prefer the logged-in user's session token; fall back to server env token
    const session = await getSession();
    const token = session?.accessToken || process.env.GITHUB_TOKEN;
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    // === SINGLE FILE MODE ===
    if (mode === 'file' || url.includes('/blob/')) {
      const parsed = toRawUrl(url);
      if (!parsed) {
        return NextResponse.json({ error: 'Invalid GitHub file URL. Expected format: github.com/user/repo/blob/branch/path/to/file.ext' }, { status: 400 });
      }

      const res = await fetch(parsed.rawUrl, { headers: authHeaders });
      if (!res.ok) {
        return NextResponse.json({ error: `Could not fetch file. Status: ${res.status}. Make sure the repo is public or your GITHUB_TOKEN has access.` }, { status: 400 });
      }

      const code = await res.text();
      return NextResponse.json({
        mode: 'file',
        filename: parsed.filename,
        language: parsed.language,
        code
      });
    }

    // === REPO MODE ===
    const repoInfo = parseRepoUrl(url);
    if (!repoInfo) {
      return NextResponse.json({ error: 'Invalid GitHub URL. Use a file URL (contains /blob/) or a repo URL (github.com/user/repo)' }, { status: 400 });
    }

    const { owner, repo } = repoInfo;

    // Get the default branch
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { ...authHeaders, Accept: 'application/vnd.github+json' } });
    if (!repoRes.ok) {
      return NextResponse.json({ error: `Cannot access repo '${owner}/${repo}'. Make sure it's public or your GITHUB_TOKEN has access. Status: ${repoRes.status}` }, { status: 400 });
    }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Get the file tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: { ...authHeaders, Accept: 'application/vnd.github+json' } }
    );
    if (!treeRes.ok) {
      return NextResponse.json({ error: `Could not fetch repo tree. Status: ${treeRes.status}` }, { status: 400 });
    }
    const treeData = await treeRes.json();

    const allItems: any[] = treeData.tree || [];
    const isTruncated: boolean = treeData.truncated === true;

    // Count what's in the repo for better error messages
    const allExtensions = new Set<string>();

    // Filter to analyzable files
    const files = allItems
      .filter((item: any) => {
        if (item.type !== 'blob') return false;
        const ext = (item.path.split('.').pop() || '').toLowerCase();
        allExtensions.add(ext);
        if (!ANALYZABLE_EXTENSIONS.has(ext)) return false;
        if (SKIP_DIRS.some(d => item.path.includes(d))) return false;
        return true;
      })
      .slice(0, 20);

    if (files.length === 0) {
      // Count files by extension for a helpful summary
      const extCounts: Record<string, number> = {};
      for (const item of allItems) {
        if (item.type !== 'blob') continue;
        const ext = (item.path.split('.').pop() || 'no-ext').toLowerCase();
        if (SKIP_DIRS.some(d => item.path.includes(d))) continue;
        extCounts[ext] = (extCounts[ext] || 0) + 1;
      }
      const skippedSummary = Object.entries(extCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ext, count]) => `${count} .${ext}`)
        .join(', ');

      return NextResponse.json({
        mode: 'repo',
        owner,
        repo,
        branch: defaultBranch,
        totalFiles: 0,
        files: [],
        noAnalyzableFiles: true,
        skippedSummary: skippedSummary || 'No files found',
        isTruncated
      });
    }


    // Fetch content for each file
    const fileResults = await Promise.all(
      files.map(async (file: any) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
        try {
          const res = await fetch(rawUrl, { headers: authHeaders });
          if (!res.ok) return null;
          const code = await res.text();
          // skip very large or empty files
          if (!code.trim() || code.length > 50000) return null;
          return { path: file.path, language: detectLanguage(file.path), code };
        } catch {
          return null;
        }
      })
    );

    const validFiles = fileResults.filter(Boolean);

    // Count skipped (non-analyzable) files for the panel footer
    const skippedExtCounts: Record<string, number> = {};
    for (const item of allItems) {
      if (item.type !== 'blob') continue;
      const ext = (item.path.split('.').pop() || 'no-ext').toLowerCase();
      if (SKIP_DIRS.some(d => item.path.includes(d))) continue;
      if (ANALYZABLE_EXTENSIONS.has(ext)) continue; // already analyzed
      skippedExtCounts[ext] = (skippedExtCounts[ext] || 0) + 1;
    }
    const skippedSummary = Object.entries(skippedExtCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([ext, count]) => `${count} .${ext}`)
      .join(', ');

    return NextResponse.json({
      mode: 'repo',
      owner,
      repo,
      branch: defaultBranch,
      totalFiles: validFiles.length,
      files: validFiles,
      skippedSummary: skippedSummary || null,
      isTruncated
    });


  } catch (error: any) {
    console.error('GitHub API route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
