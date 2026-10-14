# Security Policy

## Supported Versions
Only the latest release running on [repointxt.corbit.tech](https://repointxt.corbit.tech) is supported with security patches.

## 100% Client-Side Privacy Guarantee
repointxt is engineered to execute 100% within the user's browser memory.
- **Zero Server Uploads:** Your code is never transmitted to, processed by, or cached on any remote backend server.
- **Direct GitHub API:** Ingestion occurs directly between your client browser and GitHub's REST/Zipball API.
- **Local File System Access:** Local directories and archives are read in-memory via the browser's File System Access API and JSZip.
- **Minimal Telemetry:** repointxt collects minimal, anonymous aggregate event counts (e.g., total bundles packed, token size brackets) to improve stability. No code contents, file paths, or credentials are ever logged. Telemetry silently no-ops when environment keys are unset.

## Reporting a Vulnerability
If you discover a security vulnerability in repointxt or within Corbit Technologies services, please **do not open a public issue**.

Please report vulnerabilities privately to:
**security@corbittechnologies.com**

Please include:
- A clear description of the issue
- Steps to reproduce or proof-of-concept
- Potential impact and affected components

We appreciate responsible disclosure and will respond promptly to investigate and resolve valid reports.
