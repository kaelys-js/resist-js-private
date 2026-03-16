import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig, type Plugin } from 'vite';
import { templateAppHtml, templateErrorHtml } from './vite-plugin-template-html.js';

/**
 * Lazy wrapper for the Live View preview WebSocket plugin.
 *
 * Dynamically imports the real plugin implementation inside
 * `configureServer` to avoid `@/` path resolution issues
 * during Vite config loading (esbuild can't resolve workspace aliases).
 *
 * @returns Vite plugin that defers to the real implementation
 */
function previewWsPlugin(): Plugin {
  return {
    name: 'lens-preview-ws',
    apply: 'serve',

    async configureServer(server): Promise<void> {
      /* Use ssrLoadModule to go through Vite's pipeline — handles TS
         compilation and @/ alias resolution at runtime. Raw import()
         fails because Vite bundles the config to .vite-temp/ and
         relative paths resolve from there, not the project root. */
      const mod = await server.ssrLoadModule('./src/lib/server/preview/vite-plugin-preview-ws.ts');
      mod.setupPreviewWs(server);
    },
  };
}

/**
 * Reads git metadata for build-time injection.
 *
 * @returns Git commit (short + full), branch name, and dirty flag
 */
function getGitInfo(): {
  commit: string;
  commitFull: string;
  branch: string;
  dirty: boolean;
} {
  try {
    return {
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      commitFull: execSync('git rev-parse HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      dirty: execSync('git status --porcelain').toString().trim().length > 0,
    };
  } catch {
    return { commit: 'unknown', commitFull: 'unknown', branch: 'unknown', dirty: false };
  }
}

const git = getGitInfo();
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  plugins: [
    templateAppHtml(),
    templateErrorHtml(),
    tailwindcss(),
    previewWsPlugin(),
    sveltekit(),
    devtoolsJson(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(git.commit),
    __GIT_COMMIT_FULL__: JSON.stringify(git.commitFull),
    __GIT_BRANCH__: JSON.stringify(git.branch),
    __GIT_DIRTY__: JSON.stringify(git.dirty),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    watch: {
      /* Reduce file watcher pressure on macOS — avoids EPERM errors
         when SvelteKit scans routes concurrently with other watchers */
      ignored: ['**/.svelte-kit/**', '**/node_modules/**', '**/.vite/**'],
    },
  },
  ssr: {
    noExternal: ['@lucide/svelte'],
  },
});
