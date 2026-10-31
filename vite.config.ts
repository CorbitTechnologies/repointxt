import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Injects a deployment-private HTML snippet into <head> at build time.
 *
 * `index.html` is committed to a public repository, so anything placed there
 * is public. Instead, set `HEAD_INJECT_HTML` in your host's environment
 * variables (Netlify → Site configuration → Environment variables) and the
 * markup is added only to production builds. Forks and local builds inject
 * nothing, so no third-party tag loads at all.
 */
function injectHeadSnippet(env: Record<string, string | undefined>): Plugin {
  return {
    name: 'repointxt:inject-head-snippet',
    apply: 'build',
    transformIndexHtml(html) {
      const snippet = env.HEAD_INJECT_HTML?.trim();
      if (!snippet) return html;
      // Function replacer so `$&`, `$1` etc. in the snippet stay literal.
      return html.replace('</head>', () => `${snippet}\n</head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  return {
    plugins: [react(), injectHeadSnippet(env)],
    build: {
      outDir: 'dist',
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
    },
  };
});
