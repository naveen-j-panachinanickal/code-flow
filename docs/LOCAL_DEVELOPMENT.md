# Local Development Guide

This guide covers how to set up, build, and run Quality Code on your local machine.

## Prerequisites
- Node.js (v20+ recommended)
- npm or yarn

## 1. Installation

Clone the repository and install the dependencies:
```bash
git clone https://github.com/your-org/quality-code.git
cd quality-code
npm install
```

## 2. Environment Variables

Create a file named `.env.local` in the root of the project.

### Required Variables
None of these are strictly "required" to run the Paste Code tab or Local Upload tab, but they are required if you want to scan GitHub repositories.

```env
# OAuth App setup for private repo scanning
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# URL configuration for NextAuth (Auth.js) and the OAuth callback
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional fallback token used to avoid GitHub API Rate Limits when scanning public repos anonymously
GITHUB_TOKEN=your_personal_access_token
```

### How to get GitHub OAuth Credentials
1. Go to your GitHub Profile -> Settings -> Developer Settings -> OAuth Apps.
2. Click "New OAuth App".
3. Set the "Homepage URL" to `http://localhost:3000`.
4. Set the "Authorization callback URL" to `http://localhost:3000`.
5. Generate a new client secret and copy the ID and Secret into your `.env.local` file.

## 3. Running the Dev Server

Quality Code uses Next.js 16 and Turbopack for ultra-fast compilation.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 4. Production Build

To test the Progressive Web App (PWA) worker and minimized assets, you should run a production build.

```bash
npm run build
npm run start
```

## 5. Modifying the AST Parsers (WebAssembly)

The `public/wasm` directory contains the compiled `.wasm` binaries for the languages supported by Tree-Sitter.

If you wish to add support for a new language (e.g., Go, Rust, Ruby):
1. Navigate to the tree-sitter directory for that language (e.g., `npm install tree-sitter-go`).
2. Run the `tree-sitter build --wasm` command.
3. Move the generated `.wasm` file into the `public/wasm` folder.
4. Update `lib/tree-sitter-parser.ts` to map the `.go` extension to the new binary.
