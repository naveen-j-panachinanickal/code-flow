import { NextRequest, NextResponse } from 'next/server';

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
const ANALYZABLE_EXTENSIONS = new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'rb', 'go', 'rs', 'cpp', 'c', 'cs', 'php', 'swift', 'kt', 'mjs', 'cjs']);

export async function POST(req: NextRequest) {
  try {
    const { url, mode } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'GitHub URL is required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
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

    // Filter to analyzable files, skip node_modules / build dirs, cap at 20 files
    const files = (treeData.tree as any[])
      .filter((item: any) => {
        if (item.type !== 'blob') return false;
        const ext = item.path.split('.').pop()?.toLowerCase() || '';
        if (!ANALYZABLE_EXTENSIONS.has(ext)) return false;
        const skipDirs = ['node_modules', '.next', 'dist', 'build', '.git', 'vendor', '__pycache__', 'coverage'];
        if (skipDirs.some(d => item.path.includes(`${d}/`))) return false;
        return true;
      })
      .slice(0, 20); // limit to 20 files

    if (files.length === 0) {
      return NextResponse.json({ error: 'No analyzable code files found in this repository (JS/TS/Python/Java).' }, { status: 400 });
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

    return NextResponse.json({
      mode: 'repo',
      owner,
      repo,
      branch: defaultBranch,
      totalFiles: validFiles.length,
      files: validFiles
    });

  } catch (error: any) {
    console.error('GitHub API route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
