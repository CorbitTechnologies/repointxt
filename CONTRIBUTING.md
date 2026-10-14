# Contributing to repointxt

Thank you for your interest in contributing to **repointxt** by [Corbit Technologies](https://www.corbittechnologies.com/)! We are building a high-performance, 100% in-browser, privacy-first codebase prompt packer for AI developers and engineers.

---

## 🧭 Core Principles to Follow

1. **100% Client-Side Architecture:** Code and user credentials must **never** be transmitted to or processed by a remote backend server. All parsing, ZIP decompression, and AST minification must run locally in browser memory.
2. **Performance & Bundle Size:** Keep dependencies minimal. Avoid heavy WASM binaries (e.g., full Rust tokenizers) when fast heuristic approximations suffice.
3. **Privacy First:** Never log file paths, filenames, code snippets, or user tokens in telemetry.

---

## 🛠️ Local Development Workflow

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/CorbitTechnologies/repointxt.git
cd repointxt

# 2. Install dependencies
pnpm install

# 3. Start local development server
pnpm dev
```
Open `http://localhost:5174` in your browser.

---

## 🧪 Testing & Verification

Before submitting a Pull Request, make sure your code builds cleanly with zero TypeScript errors or lint issues:

```bash
# Type check and build production bundle
pnpm build
```

---

## 📝 Pull Request Guidelines

1. **Branch Naming:**
   - Feature: `feat/feature-name`
   - Bugfix: `fix/bug-description`
   - Documentation: `docs/improvement`

2. **Commit Messages:**
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add Google AI Studio 2M context window support`
   - `fix: preserve dotfiles in zip path sanitization`
   - `docs: update community standards checklist`

3. **Submitting PRs:**
   - Fill out the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
   - Reference any related open issue (`Fixes #12`).
   - Include before/after screenshots or recordings if making UI changes.

---

## 💬 Community & Code of Conduct

All contributors are expected to uphold the [Code of Conduct](CODE_OF_CONDUCT.md).

For security reports, please refer to our [Security Policy](SECURITY.md) and report privately to **security@corbittechnologies.com**.
