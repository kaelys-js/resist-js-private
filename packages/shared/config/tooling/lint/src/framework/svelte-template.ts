/**
 * Svelte Template AST Parser
 *
 * Wraps `svelte/compiler` to parse `.svelte` files and produce a template AST
 * for rule visitors. Uses the Svelte 5 modern AST format.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules framework extension.
 *
 * @module
 */

import type { AstNode } from '@/lint/framework/types.ts';

// =============================================================================
// Svelte Compiler (lazy-loaded)
// =============================================================================

/** Svelte compiler parse function signature. */
type SvelteParseFn = (source: string, options: { modern: true }) => { fragment: unknown };

/** Lazily loaded svelte/compiler parse function. */
let svelteParse: SvelteParseFn | null = null;

/**
 * Lazily load svelte/compiler on first use.
 *
 * @returns Whether the parser is available
 */
async function ensureSvelteCompiler(): Promise<boolean> {
  if (svelteParse) {
    return true;
  }

  try {
    const mod: Record<string, unknown> = await import('svelte/compiler');
    svelteParse = mod.parse as unknown as SvelteParseFn;
    return true;
  } catch {
    /* svelte/compiler not installed — skip template parsing */
    return false;
  }
}

// =============================================================================
// Template Parsing
// =============================================================================

/**
 * Parse a `.svelte` file's template into a Svelte 5 AST Fragment.
 *
 * Returns null if parsing fails (syntax errors, missing compiler, etc.).
 * Uses `{ modern: true }` to get the Svelte 5 AST format.
 *
 * @param {string} content - Full `.svelte` file content
 * @returns {Promise<AstNode | null>} The Fragment AST root, or null
 */
export async function parseSvelteTemplate(content: string): Promise<AstNode | null> {
  const hasCompiler: boolean = await ensureSvelteCompiler();
  if (!hasCompiler || !svelteParse) {
    return null;
  }

  try {
    const result: { fragment: unknown } = svelteParse(content, { modern: true });
    return result.fragment as AstNode;
  } catch {
    /* Parse error — skip template analysis for this file */
    return null;
  }
}

// =============================================================================
// Template AST Walker
// =============================================================================

/** Properties to skip when recursing — location metadata, not child nodes. */
const SKIP_KEYS: ReadonlySet<string> = new Set(['loc', 'name_loc']);

/**
 * Walk a Svelte template AST depth-first, invoking callback for each node.
 *
 * Handles the Svelte-specific tree shape where children live in various
 * properties: `fragment.nodes`, `attributes`, `body`, `value`, etc.
 * Skips location metadata properties (`loc`, `name_loc`) to avoid
 * unnecessary recursion.
 *
 * @param {unknown} node - Current AST node or subtree value
 * @param {(node: AstNode) => void} callback - Called for every node with a `type` property
 */
export function walkSvelteNode(node: unknown, callback: (node: AstNode) => void): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const astNode: AstNode = node as AstNode;

  if (astNode.type) {
    callback(astNode);
  }

  for (const key of Object.keys(astNode)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }

    const value: unknown = astNode[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        walkSvelteNode(item, callback);
      }
    } else if (value && typeof value === 'object') {
      walkSvelteNode(value, callback);
    }
  }
}
