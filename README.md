# Quality Code

**Code Made Clear** — Understand your code logically, visually, and qualitatively using 100% local, AI-free Abstract Syntax Tree (AST) scanning.

![App Icon](app/icon.png)

## Overview

Quality Code is a zero-server, browser-first tool that analyzes codebases instantly. Instead of relying on slow, expensive, and hallucination-prone LLMs, this tool uses **Tree-Sitter** (the same technology powering GitHub's syntax highlighting) via WebAssembly to deterministically parse code into structural trees.

It allows developers to:
1. **Explain Code (Code Breakdown)**: Generates human-readable summaries of what a file does by traversing its AST.
2. **Visualize Architecture (Execution Path)**: Maps function calls, class hierarchies, and control flow in an interactive DAG (Directed Acyclic Graph).
3. **Analyze Health (Quality Review)**: Scans for code smells, hardcoded secrets, massive functions, and deeply nested logic.

### Supported Input Methods
- **📝 Paste Code**: Directly paste snippets of JS, TS, Python, or Java.
- **📁 Upload Local**: Drag and drop local folders or files. Files are analyzed securely in the browser.
- **🐙 From GitHub**: Paste a GitHub repository URL or blob link. The tool fetches the raw files via the GitHub API and analyzes them without a backend server.

---

## Tech Stack (The 92/100 Architecture)

This project uses a bleeding-edge, highly optimized stack:
- **Core**: Next.js 16.1 (App Router) + React 19.2
- **Compilation**: Turbopack for lightning-fast local dev
- **Parser Engine**: `web-tree-sitter` (WASM-based AST generation)
- **Visuals**: `@xyflow/react` (React Flow) for interactive graph rendering + `dagre` for auto-layout
- **Editor**: `@monaco-editor/react` (VS Code's editing engine in the browser)
- **Deployment & Mobile**: `@ducanh2912/next-pwa` for seamless standalone desktop/mobile installation (PWA support)

---

## High-Level Architecture

The logic is split between UI rendering (`page.tsx`) and the core WASM parser engine (`tree-sitter-parser.ts`).

### 1. `app/page.tsx`
The primary monolith container. It manages:
- **Source Mode State**: Tracks whether the user is pasting code, uploading locally, or scanning from GitHub.
- **File Browser**: Renders the left-hand `RepoFileList` containing the repo hierarchy, health score, and average code quality across all scanned files.
- **Tabbed Interface**: Manages the display of the three main tools (`Quality Review`, `Code Breakdown`, `Execution Path`).
- **History**: Uses `localStorage` to save previously analyzed snippets in a compact accordion menu.

### 2. `lib/tree-sitter-parser.ts`
The analytical brain of the app. It dynamically loads the appropriate `.wasm` binary based on the file extension (JS, TS, Python, Java). It then performs three crucial operations on the AST:
- `generateExplanation()`: Finds variable declarations, function definitions, and classes to return a mapped object of file context.
- `generateFlowGraph()`: Recursively walks the AST to find `call_expression` nodes. It maps caller functions to callee functions, outputting a list of nodes and edges for React Flow.
- `analyzeCodeQuality()`: Walks the AST looking for code smells (e.g., catching `Error` without logging, `console.log` statements, deep nesting > 4 levels, or functions over 50 lines).

### 3. `lib/repo-health.ts`
When a full repository is scanned (via GitHub or local upload), it looks for specific ecosystem files:
- Checks `package.json` for vital dependencies to infer the framework (e.g., React, Next.js, Express).
- Checks `.github/workflows` to verify if CI/CD pipelines exist.
- Analyzes the `README.md` length to deduce documentation quality.
- Aggregates these metrics into a 0-100 "Repo Health Score".

---

## Advanced Features

* **Zero-Backend Execution**: All parsing occurs *inside the browser*. The Next.js `/api/github` route only acts as an HTTP proxy to avoid CORS issues when fetching raw files, but no analysis occurs on the server.
* **Large Repo Protection**: When analyzing a local folder or a large GitHub repo, the tool caps the analysis at 60 files and enforces a 1MB file size limit to prevent locking up the browser thread.
* **Progressive Web App (PWA)**: Completely installable as a standalone app with custom edge-rendered graphical icons (`app/api/icon/[size]`).

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root. 
If you want to support private GitHub repository scanning, you must create a GitHub OAuth App and provide the credentials:
```env
GITHUB_CLIENT_ID=your_id_here
GITHUB_CLIENT_SECRET=your_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional fallback token for backend rate-limit protection
GITHUB_TOKEN=your_personal_access_token
```

### 3. Run the Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## Future Roadmap / Potential Refactors

1. **Expanded Language Support**: 
   - Add Tree-Sitter WASM binaries for backend languages (Go, Rust, Ruby, PHP) and modern frontend languages (Svelte, Vue).
   - **Language Versioning**: Implement AST fallbacks for specific language versions (e.g., Python 2 vs Python 3, or Java 8 vs Java 21) by loading the appropriate compiled `tree-sitter` WASM binary version dynamically.
2. **State Management**: As `page.tsx` grows, migrating the UI state (active tab, active file, nodes/edges) into a Zustand store would clean up prop-drilling.
3. **Web Workers**: Currently, Tree-Sitter runs on the main browser thread. Moving the AST parsing into a background Web Worker (`worker.ts`) would guarantee the UI never stutters when parsing massive files.
4. **Database Integration**: Connecting to an edge database (like Vercel Postgres/Supabase) to store user search history, Repo Health scores over time, and custom user rules, rather than relying solely on local browser storage.
5. **Custom Rules Engine**: Allow users or teams to define their own custom Code Smells or Architectural rules (e.g., "Flag any direct SQL queries not using an ORM") via a `.quality-code.json` config file inside their repository.
