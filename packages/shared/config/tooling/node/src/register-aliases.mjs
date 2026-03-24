/**
 * Bootstrap script for @/ tsconfig path alias resolution in bare Node.js.
 *
 * Loaded via NODE_OPTIONS="--import ./packages/shared/config/tooling/node/src/register-aliases.mjs"
 * in .npmrc. Finds the workspace root, reads tsconfig.json paths, and registers
 * the custom resolver so @/ imports work in any Node process (svelte.config.ts,
 * CLI scripts, etc.) — not just inside Vite.
 *
 * @module
 */

import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve as pathResolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Derive workspace root from this file's location:
// This file is at <root>/packages/shared/config/tooling/node/src/register-aliases.mjs
const thisDir = dirname(fileURLToPath(import.meta.url));
const ROOT = pathResolve(thisDir, '..', '..', '..', '..', '..', '..');

// Read tsconfig.json paths
const aliasMap = {};
try {
  const tsconfigPath = join(ROOT, 'tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
  const paths = tsconfig.compilerOptions?.paths ?? {};

  for (const [alias, targets] of Object.entries(paths)) {
    const [first] = Array.isArray(targets) ? targets : [];
    if (first) {
      aliasMap[alias] = first;
    }
  }
} catch {
  // If tsconfig.json can't be read, aliases won't resolve — silent fallback
}

// Register the resolver hook with the alias data
const resolverUrl = new URL('./resolve-aliases.mjs', import.meta.url);
register(resolverUrl.href, {
  parentURL: import.meta.url,
  data: { aliasMap, root: ROOT },
});
