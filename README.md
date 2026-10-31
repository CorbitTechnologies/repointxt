# repointxt by Corbit Technologies

[![Try repointxt Live](https://img.shields.io/badge/Live_App-Launch_repointxt-1f6feb?style=for-the-badge&logo=googlechrome&logoColor=white)](https://repointxt.corbit.tech)
[![Corbit Technologies](https://img.shields.io/badge/Maintained_by-Corbit_Technologies-238636?style=for-the-badge)](https://www.corbittechnologies.com/?utm_source=repointxt&utm_medium=readme_badge&utm_campaign=open_source)
[![GitHub Stars](https://img.shields.io/github/stars/CorbitTechnologies/repointxt?style=for-the-badge&logo=github&color=e3b341)](https://github.com/CorbitTechnologies/repointxt/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/CorbitTechnologies/repointxt/blob/main/LICENSE)

> **100% In-Browser Codebase-to-Prompt Context Packer** for Claude 5.5, ChatGPT (GPT-6), Gemini 4, and DeepSeek-V4.1. Private, zero-server alternative to `repo2txt` and `gitingest`.

Engineered and maintained by [**Corbit Technologies**](https://www.corbittechnologies.com/?utm_source=repointxt&utm_medium=readme_hero&utm_campaign=open_source). While our primary mission is designing, building, and scaling high-impact **consumer-facing platforms and digital experiences**, we build and open-source specialized utilities like `repointxt` to solve real developer workflow challenges with high engineering standards.

---

### 🛡️ Why repointxt over Server Proxies (repo2txt, gitingest)?

| Feature | repointxt (Corbit Technologies) | Cloud Proxies (repo2txt, gitingest) |
| :--- | :--- | :--- |
| **Privacy & Security** | **100% Client-Side:** Code and GitHub tokens are processed purely in local browser memory. Zero server uploads. | Routes code and GitHub tokens through third-party servers and cloud workers. |
| **Active Token Budgeting** | **Precision Sliders (100K, 200K, 272K, 500K, 1M, Auto):** Multi-part batching calibrated for Claude 5.5, Gemini 4, and GPT-6. | Naive dumping that exceeds token limits or burns expensive LLM context. |
| **AST & Signal Cleaning** | Stubs massive SVG path strings, compacts Tailwind utility runs, strips duplicate legal licenses and lockfiles. | Dumps raw text including boilerplate and build artifacts. |
| **Modern Stack Aware** | Native support for Turborepo, Next.js (App Router), Flutter, and Supabase schemas. | Basic folder dumps with no framework intelligence. |
| **Instant Ingestion** | Prepend `repointxt.corbit.tech/` to any GitHub URL or drop folders directly. | Clunky manual downloads or queue waiting. |

---

## ⚡ 1-Click URL Ingestion

To convert any public GitHub repository into an LLM context bundle, prepend `repointxt.corbit.tech/` to the repository slug in your browser address bar:

```text
repointxt.corbit.tech/facebook/react
repointxt.corbit.tech/vercel/next.js
repointxt.corbit.tech/flutter/flutter
```

**Pre-configured Model Context Windows:**
- Claude 5.5 (1M tokens): `repointxt.corbit.tech/owner/repo?model=claude`
- Gemini 4 (1M tokens): `repointxt.corbit.tech/owner/repo?model=gemini`
- ChatGPT / GPT-6 (1M tokens): `repointxt.corbit.tech/owner/repo?model=gpt6`

---

## 🔒 The Corbit In-Browser Privacy Ecosystem

`repointxt` belongs to our family of browser-native, zero-retention utilities:

- **[repointxt](https://repointxt.corbit.tech):** Transform full codebases and GitHub repos into token-optimized LLM prompts locally.
- **[FileFryer](https://filefryer.com/?utm_source=repointxt&utm_medium=readme_ecosystem&utm_campaign=privacy_ecosystem):** The private file toolkit to compress, convert, and process media, documents, and images directly in your browser without uploading files to remote servers.

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/CorbitTechnologies/repointxt.git
cd repointxt

# Install dependencies
pnpm install

# Start local development server
pnpm dev
```

## 🏗️ Production Build

```bash
pnpm build
```

---

## 🏢 About Corbit Technologies

[**Corbit Technologies**](https://www.corbittechnologies.com/?utm_source=repointxt&utm_medium=readme_about&utm_campaign=open_source) is a software company primarily focused on architecting and scaling consumer-facing platforms, web applications, and digital consumer products.

Our engineering labs design and release specialized developer tools and client-side utilities to advance privacy-first, zero-server architectures across the web.

- 🌐 Official Website: [corbittechnologies.com](https://www.corbittechnologies.com/?utm_source=repointxt&utm_medium=readme_website&utm_campaign=open_source)
- 💼 Follow on Twitter / X: [@CorbitTech](https://twitter.com/CorbitTech)
- 🐙 GitHub Organization: [@CorbitTechnologies](https://github.com/CorbitTechnologies)

---

## 📄 License

Created and maintained by [**Corbit Technologies**](https://www.corbittechnologies.com/). Licensed under the [MIT License](LICENSE).