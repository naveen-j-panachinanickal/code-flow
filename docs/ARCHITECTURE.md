# Quality Code Architecture

This document dives deep into how Quality Code parses, analyzes, and renders codebases entirely within the browser.

## The Core Concept: Why Tree-Sitter over LLMs?
Traditional "AI Code Explainers" send raw strings of code to an LLM (OpenAI, Anthropic). This has three massive drawbacks:
1. **Speed**: Analyzing a 50-file repository takes minutes.
2. **Cost**: Thousands of tokens are required per repository scan.
3. **Accuracy / Hallucinations**: LLMs guess relationships based on probabilistic models, frequently inventing function calls that don't exist in the code.

Quality Code solves this by generating an **Abstract Syntax Tree (AST)** locally in the browser using WebAssembly. It uses **Tree-Sitter**, a parser generator tool built by GitHub.

## Deep Dive: How the AST Work

When a user pastes code or scans a repo, `lib/tree-sitter-parser.ts` handles the heavy lifting:

### 1. WASM Initialization
The browser asynchronously loads `web-tree-sitter` and the specific language parser (e.g., `tree-sitter-javascript.wasm`).
```typescript
import Parser from 'web-tree-sitter';
await Parser.init();
const parser = new Parser();
const Lang = await Parser.Language.load('/wasm/tree-sitter-javascript.wasm');
parser.setLanguage(Lang);
```

### 2. AST Traversal (The "Walk")
Once the Tree-Sitter parser reads the code, it generates a tree-like object. We can then walk the tree to extract semantic meaning without an LLM:
* **Classes**: Search the AST for `class_declaration`.
* **Methods**: Inside classes, search for `method_definition`.
* **Variables**: Search for `variable_declaration` or `lexical_declaration`.

### 3. Rendering The Features

#### The "Code Breakdown" Tab
Instead of sending the code to ChatGPT and asking "What does this do?", our TypeScript logic explicitly reads the AST and formats a localized report:
> "This file contains a class named **DatabaseConfig**. It has **4 methods**."

#### The "Execution Path" Tab
To generate the React Flow Direct Acyclic Graph (DAG), we explicitly track function invocations. If `functionA` contains a `call_expression` targeting `functionB`, we generate an Edge in React Flow connecting Node A to Node B. `dagre` is then used to auto-position these nodes so they look like a clean top-down flowchart.

#### The "Quality Review" Tab
Code smells are identified deterministically via the AST. For example, to find deep nesting:
1. We walk the AST counting `if_statement` and `for_statement` nodes.
2. If we recurse deeper than 4 levels, we flag the parent node as "Deeply Nested."

Because this relies on hard math and tree structures rather than LLM probabilities, it runs in milliseconds and is 100% accurate.

## Component Flow

1. **Input Generation**: User interacts with `SourceSelector.tsx` (Paste, Upload, or GitHub).
2. **Analysis Trigger**: The raw code strings are passed as an array to `handleRepoLoaded` in `page.tsx`.
3. **Execution**: The browser iterates over the files (capped at 60 max to prevent Out of Memory crashes), calling `tree-sitter-parser.ts` for each file.
4. **State Storage**: The results are stored in the React state as an array of `RepoFileResult` objects.
5. **Rendering**: The user clicks a file in `RepoFileList.tsx`, which updates `activeFilePath` and renders the specific data in the corresponding tabs.
