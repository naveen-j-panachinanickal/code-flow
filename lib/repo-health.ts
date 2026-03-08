export interface HealthCheck {
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'info';
  detail?: string;
}

export interface RepoHealth {
  score: number; // 0-100
  checks: HealthCheck[];
  readmeSummary?: string;
  buildSystem?: string;
  dependencies?: { name: string; count: number }[];
}

// ── README analysis ─────────────────────────────────────────────────────────
function analyzeReadme(content: string): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const lower = content.toLowerCase();
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const headings = (content.match(/^#{1,6}\s/gm) || []).length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;

  checks.push({
    label: 'README length',
    status: wordCount > 300 ? 'pass' : wordCount > 80 ? 'warn' : 'fail',
    detail: `${wordCount} words — ${wordCount > 300 ? 'comprehensive' : wordCount > 80 ? 'basic' : 'too short'}`
  });

  checks.push({
    label: 'README structure',
    status: headings >= 3 ? 'pass' : headings >= 1 ? 'warn' : 'fail',
    detail: `${headings} heading${headings !== 1 ? 's' : ''} found`
  });

  checks.push({
    label: 'Code examples in README',
    status: codeBlocks >= 2 ? 'pass' : codeBlocks >= 1 ? 'warn' : 'fail',
    detail: codeBlocks > 0 ? `${codeBlocks} code block${codeBlocks !== 1 ? 's' : ''}` : 'No code examples'
  });

  checks.push({
    label: 'Installation instructions',
    status: lower.includes('install') || lower.includes('getting started') ? 'pass' : 'warn',
    detail: lower.includes('install') ? 'Found installation guide' : 'No install instructions found'
  });

  return checks;
}

// ── package.json analysis ────────────────────────────────────────────────────
function analyzePackageJson(content: string): HealthCheck[] {
  const checks: HealthCheck[] = [];
  try {
    const pkg = JSON.parse(content);
    const scripts = pkg.scripts || {};
    const deps = Object.keys(pkg.dependencies || {}).length;
    const devDeps = Object.keys(pkg.devDependencies || {}).length;

    checks.push({
      label: 'Test script',
      status: scripts.test && !scripts.test.includes('no test') ? 'pass' : 'fail',
      detail: scripts.test ? `npm test → ${scripts.test.slice(0, 40)}` : 'No test script defined'
    });

    checks.push({
      label: 'Lint script',
      status: scripts.lint ? 'pass' : 'warn',
      detail: scripts.lint ? `npm run lint configured` : 'No lint script defined'
    });

    checks.push({
      label: 'Node engine specified',
      status: pkg.engines?.node ? 'pass' : 'info',
      detail: pkg.engines?.node ? `Node ${pkg.engines.node}` : 'No engines.node field'
    });

    checks.push({
      label: 'Dependencies',
      status: 'info',
      detail: `${deps} runtime, ${devDeps} dev`
    });

    if (pkg.license) {
      checks.push({ label: 'License field', status: 'pass', detail: pkg.license });
    }
  } catch {
    checks.push({ label: 'package.json', status: 'warn', detail: 'Could not parse JSON' });
  }
  return checks;
}

// ── CI/CD detection ──────────────────────────────────────────────────────────
function checkCiCd(paths: string[]): HealthCheck {
  const hasGithubActions = paths.some(p => p.includes('.github/workflows'));
  const hasCircleCi = paths.some(p => p.includes('.circleci'));
  const hasTravis = paths.some(p => p.includes('.travis.yml'));
  const hasGitlab = paths.some(p => p.includes('.gitlab-ci.yml'));

  if (hasGithubActions) return { label: 'CI/CD', status: 'pass', detail: 'GitHub Actions configured' };
  if (hasCircleCi) return { label: 'CI/CD', status: 'pass', detail: 'CircleCI configured' };
  if (hasTravis) return { label: 'CI/CD', status: 'pass', detail: 'Travis CI configured' };
  if (hasGitlab) return { label: 'CI/CD', status: 'pass', detail: 'GitLab CI configured' };
  return { label: 'CI/CD', status: 'warn', detail: 'No CI/CD pipeline detected' };
}

// ── Build system detection ───────────────────────────────────────────────────
function detectBuildSystem(paths: string[]): string | undefined {
  if (paths.some(p => p.endsWith('pom.xml'))) return 'Maven';
  if (paths.some(p => p.endsWith('build.gradle') || p.endsWith('build.gradle.kts'))) return 'Gradle';
  if (paths.some(p => p.endsWith('package.json'))) return 'npm/Node.js';
  if (paths.some(p => p.endsWith('Makefile'))) return 'Make';
  if (paths.some(p => p.endsWith('CMakeLists.txt'))) return 'CMake';
  if (paths.some(p => p.endsWith('Cargo.toml'))) return 'Cargo (Rust)';
  if (paths.some(p => p.endsWith('go.mod'))) return 'Go Modules';
  if (paths.some(p => p.endsWith('requirements.txt') || p.endsWith('setup.py') || p.endsWith('pyproject.toml'))) return 'pip/Python';
  return undefined;
}

// ── Main analyzer ────────────────────────────────────────────────────────────
export function analyzeRepoHealth(
  allPaths: string[],
  fileContents: Record<string, string>
): RepoHealth {
  const checks: HealthCheck[] = [];

  // README
  const readmeKey = Object.keys(fileContents).find(p => p.toLowerCase().endsWith('readme.md'));
  if (readmeKey) {
    checks.push({ label: 'README.md', status: 'pass', detail: 'Present ✅' });
    checks.push(...analyzeReadme(fileContents[readmeKey]));
  } else {
    checks.push({ label: 'README.md', status: 'fail', detail: 'Missing — add a README.md!' });
  }

  // LICENSE
  const hasLicense = allPaths.some(p => /^license(\.\w+)?$/i.test(p.split('/').pop() || ''));
  checks.push({
    label: 'LICENSE file',
    status: hasLicense ? 'pass' : 'warn',
    detail: hasLicense ? 'License file found' : 'No LICENSE file — add one for open source projects'
  });

  // CONTRIBUTING
  const hasContributing = allPaths.some(p => p.toLowerCase().includes('contributing'));
  checks.push({
    label: 'CONTRIBUTING guide',
    status: hasContributing ? 'pass' : 'info',
    detail: hasContributing ? 'Contributing guide found' : 'Optional: add CONTRIBUTING.md for collaborators'
  });

  // CI/CD
  checks.push(checkCiCd(allPaths));

  // .gitignore
  const hasGitignore = allPaths.some(p => p.endsWith('.gitignore'));
  checks.push({
    label: '.gitignore',
    status: hasGitignore ? 'pass' : 'fail',
    detail: hasGitignore ? 'gitignore present' : 'Missing .gitignore'
  });

  // package.json
  const pkgKey = Object.keys(fileContents).find(p => p.endsWith('package.json') && !p.includes('node_modules'));
  if (pkgKey) {
    checks.push(...analyzePackageJson(fileContents[pkgKey]));
  }

  // Build system
  const buildSystem = detectBuildSystem(allPaths);

  // Score: pass=2, warn=1, fail=0, info=0 (out of max)
  const scorable = checks.filter(c => c.status !== 'info');
  const earned = scorable.reduce((sum, c) => sum + (c.status === 'pass' ? 2 : c.status === 'warn' ? 1 : 0), 0);
  const max = scorable.length * 2;
  const score = max > 0 ? Math.round((earned / max) * 100) : 50;

  return { score, checks, buildSystem };
}
