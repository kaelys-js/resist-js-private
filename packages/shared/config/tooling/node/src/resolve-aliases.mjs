/**
 * Node.js custom module resolver for @/ tsconfig path aliases.
 *
 * Runs in Node's loader worker thread. Receives alias map from register-aliases.mjs
 * via initialize(). Intercepts @/ specifiers and resolves them to filesystem paths
 * using the same tsconfig.json paths that Vite/TypeScript use.
 *
 * Also resolves extensionless relative imports (.ts extension appending) since
 * the codebase uses Vite/bundler conventions but Node ESM requires explicit extensions.
 *
 * @module
 */

import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// Constants
// =============================================================================

/** @type {Record<string, string>} */
let aliasMap = {};

/** @type {string} */
let root = '';

/** Known file extensions that don't need .ts appending. */
const KNOWN_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs', '.json', '.svelte'];

// =============================================================================
// API
// =============================================================================

/**
 * Called by Node's loader framework with data from module.register().
 *
 * @param {{ aliasMap: Record<string, string>, root: string }} data - Alias map and workspace root
 */
export function initialize(data) {
  aliasMap = data.aliasMap ?? {};
  root = data.root ?? '';
}

/**
 * Resolve @/ specifiers and extensionless relative imports.
 *
 * @param {string} specifier - The import specifier (e.g. '@/config/tooling/svelte')
 * @param {object} context - Node resolver context
 * @param {function} nextResolve - Next resolver in the chain
 * @returns {object} Resolution result with url and shortCircuit
 */
export function resolve(specifier, context, nextResolve) {
  // Handle extensionless relative imports (Vite convention, Node ESM requires extensions)
  const hasKnownExt = KNOWN_EXTENSIONS.some((ext) => specifier.endsWith(ext));

  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !hasKnownExt) {
    const parentUrl = context.parentURL;

    if (parentUrl) {
      const parentPath = parentUrl.startsWith('file://') ? parentUrl.slice(7) : parentUrl;
      const parentDir = parentPath.slice(0, parentPath.lastIndexOf('/'));

      const candidates = [
        join(parentDir, `${specifier}.ts`),
        join(parentDir, `${specifier}.js`),
        join(parentDir, specifier, 'index.ts'),
        join(parentDir, specifier, 'index.js'),
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
  }

  if (!specifier.startsWith('@/')) {
    return nextResolve(specifier, context);
  }

  // Exact match (e.g. '@/config/tooling/svelte' → specific file)
  if (aliasMap[specifier]) {
    const resolved = join(root, aliasMap[specifier]);

    if (existsSync(resolved)) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  // Wildcard match: find longest matching prefix
  let bestAlias = '';
  let bestTarget = '';

  for (const [alias, target] of Object.entries(aliasMap)) {
    if (!alias.endsWith('/*')) {
      continue;
    }

    const prefix = alias.slice(0, -1); // '@/utils/core/' (remove *)

    if (specifier.startsWith(prefix) && alias.length > bestAlias.length) {
      bestAlias = alias;
      bestTarget = target;
    }
  }

  if (bestAlias) {
    const prefix = bestAlias.slice(0, -1); // '@/utils/core/' (strip *)
    const suffix = specifier.slice(prefix.length); // 'shell'

    // Replace * in target with suffix: './src/*.ts' → './src/shell.ts'
    const resolvedTarget = bestTarget.replace('*', suffix).replace(/^\.\//, '');
    const directPath = join(root, resolvedTarget);

    if (existsSync(directPath)) {
      return { url: pathToFileURL(directPath).href, shortCircuit: true };
    }

    // Fallback: try without .ts extension or as directory
    const targetDir = bestTarget.replace(/\/?\*.*$/, '/').replace(/^\.\//, '');
    const candidates = [
      join(root, targetDir, `${suffix}.ts`),
      join(root, targetDir, suffix),
      join(root, targetDir, suffix, 'index.ts'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  // Fall through to Node's default resolution
  return nextResolve(specifier, context);
}
