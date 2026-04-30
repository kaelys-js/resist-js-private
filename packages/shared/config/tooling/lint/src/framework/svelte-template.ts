/**
 * Svelte Template AST Parser
 *
 * Wraps `svelte/compiler` to parse `.svelte` files and produce a template AST
 * for rule visitors. Uses the Svelte 5 modern AST format.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules framework extension.
 * Phase 50 — Structured error reporting (no silent swallowing).
 *
 * @module
 */

import type { AstNode } from '@/lint/framework/types.ts';

// =============================================================================
// Svelte Parse Result
// =============================================================================

/** Successful parse result containing the template AST fragment. */
type SvelteParseOk = {
  /** Whether parsing succeeded. */
  ok: true;
  /** The parsed template AST fragment node. */
  ast: AstNode;
};

/** Failed parse result containing a descriptive error message. */
type SvelteParseErr = {
  /** Whether parsing succeeded. */
  ok: false;
  /** Descriptive error message explaining why parsing failed. */
  error: string;
};

/** Result of parsing a Svelte template — either a parsed AST or a descriptive error. */
export type SvelteParseResult = SvelteParseOk | SvelteParseErr;

// =============================================================================
// Svelte Compiler (lazy-loaded)
// =============================================================================

/** Svelte compiler parse function signature. */
type SvelteParseFn = (source: string, options: { modern: true }) => { fragment: unknown };

/** Lazily loaded svelte/compiler parse function. */
let svelteParse: SvelteParseFn | null = null;

/** Whether we already attempted and failed to load svelte/compiler. */
let compilerLoadFailed: boolean = false;

/** Cached error message from failed compiler load. */
let compilerLoadError: string = '';

/**
 * Lazily load svelte/compiler on first use.
 *
 * Caches the result — only attempts import once. On failure, stores the
 * error message for inclusion in parse results.
 *
 * @returns Whether the parser is available
 */
async function ensureSvelteCompiler(): Promise<boolean> {
  if (svelteParse) {
    return true;
  }

  if (compilerLoadFailed) {
    return false;
  }

  try {
    const mod: Record<string, unknown> = await import('svelte/compiler');
    svelteParse = mod.parse as unknown as SvelteParseFn;
    return true;
  } catch (error: unknown) {
    compilerLoadFailed = true;
    const message: string = error instanceof Error ? error.message : String(error);
    compilerLoadError = `svelte/compiler not available — install svelte to enable template linting (${message})`;
    return false;
  }
}

// =============================================================================
// Template Parsing
// =============================================================================

/**
 * Parse a `.svelte` file's template into a Svelte 5 AST Fragment.
 *
 * Returns a structured result: `{ ok: true, ast }` on success, or
 * `{ ok: false, error }` with a descriptive message on failure.
 * Uses `{ modern: true }` to get the Svelte 5 AST format.
 *
 * @param {string} content - Full `.svelte` file content
 * @returns {Promise<SvelteParseResult>} Structured parse result
 */
export async function parseSvelteTemplate(content: string): Promise<SvelteParseResult> {
  const hasCompiler: boolean = await ensureSvelteCompiler();

  if (!hasCompiler || !svelteParse) {
    return { ok: false, error: compilerLoadError };
  }

  try {
    const result: { fragment: unknown } = svelteParse(content, { modern: true });

    return { ok: true, ast: result.fragment as AstNode };
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      error: `Svelte template parse error: ${message}`,
    };
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
