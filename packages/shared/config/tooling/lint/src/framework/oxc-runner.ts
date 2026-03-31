/**
 * Custom Linter — oxc-parser-based TypeScript Rule Runner
 *
 * Parses TypeScript/Svelte files using oxc-parser and walks the AST,
 * invoking visitor functions from registered rules.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
  VisitorFn,
  ImportInfo,
  ImportSpecifier,
} from '@/lint/framework/types.ts';

// =============================================================================
// Parser
// =============================================================================

// Dynamic import — oxc-parser may not be installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- oxc-parser has no @types
let parseSync: ((filename: string, source: string) => { program: unknown }) | null = null;

/**
 * Lazily load oxc-parser on first use.
 *
 * @returns Whether the parser is available
 */
async function ensureOxcParser(): Promise<boolean> {
  if (parseSync) {
    return true;
  }

  try {
    const oxc: Record<string, unknown> = await import('oxc-parser');
    parseSync = oxc.parseSync as unknown as typeof parseSync;
    return true;
  } catch {
    /* oxc-parser not installed — skip AST rules */
    return false;
  }
}

// =============================================================================
// Svelte Script Extraction
// =============================================================================

/** Pattern matching `<script ...>` opening tags (case-insensitive, multiline-safe). */
const SCRIPT_OPEN_RE: RegExp = /^<script(\s[^>]*)?>$/i;

/** Pattern matching `</script>` closing tags. */
const SCRIPT_CLOSE_RE: RegExp = /^<\/script\s*>$/i;

/**
 * Extract TypeScript/JavaScript content from `<script>` blocks in a Svelte file.
 *
 * Preserves line numbers by keeping all lines but blanking out non-script lines.
 * This means line N in the returned string corresponds to line N in the original
 * file, so AST line numbers map correctly without offset adjustment.
 *
 * Supports multiple script blocks (module + instance), all Svelte 4/5 attributes:
 * `<script>`, `<script lang="ts">`, `<script module>`, `<script context="module">`.
 *
 * @param {string} content - Raw `.svelte` file content
 * @returns {string} Extracted script content with non-script lines blanked
 */
export function extractSvelteScript(content: string): string {
  const lines: string[] = content.split('\n');
  const output: string[] = new Array<string>(lines.length).fill('');
  let inScript: boolean = false;
  let foundAny: boolean = false;

  for (let i: number = 0; i < lines.length; i++) {
    const trimmed: string = (lines[i] ?? '').trim();

    if (!inScript) {
      if (SCRIPT_OPEN_RE.test(trimmed)) {
        inScript = true;
        foundAny = true;
        /* The opening <script> tag line itself is blanked — only content lines are kept */
      }
    } else {
      if (SCRIPT_CLOSE_RE.test(trimmed)) {
        inScript = false;
      } else {
        output[i] = lines[i] ?? '';
      }
    }
  }

  if (!foundAny) {
    return '';
  }

  return output.join('\n');
}

// =============================================================================
// Line Map (byte offset → line/column)
// =============================================================================

/**
 * Build an array of byte offsets for each line start in source text.
 * Used to convert oxc-parser byte offsets to 1-based line/column.
 *
 * @param content - Source text
 * @returns Array where index i is the byte offset of line i+1
 */
function buildLineStarts(content: string): number[] {
  const starts: number[] = [0];
  for (let i: number = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

/**
 * Convert a byte offset to a 1-based line and 0-based column.
 *
 * @param offset - Byte offset in source
 * @param lineStarts - Line start offsets from buildLineStarts
 * @returns Object with 1-based line and 0-based column
 */
function offsetToLoc(offset: number, lineStarts: number[]): { line: number; column: number } {
  let low: number = 0;
  let high: number = lineStarts.length - 1;

  while (low < high) {
    const mid: number = Math.ceil((low + high) / 2);
    if ((lineStarts[mid] ?? 0) <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return { line: low + 1, column: offset - (lineStarts[low] ?? 0) };
}

/**
 * Install lazy `loc` getters on all AST nodes using byte offsets and a line map.
 * oxc-parser only provides `start`/`end` byte offsets, not `loc`.
 *
 * Each node gets a getter that computes line/column on first access via binary
 * search, then replaces itself with the computed value (self-caching). Nodes
 * whose `loc` is never accessed pay zero computation cost.
 *
 * @param node - Root AST node
 * @param lineStarts - Line start offsets
 */
function patchLoc(node: unknown, lineStarts: number[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const astNode: Record<string, unknown> = node as Record<string, unknown>;

  if (astNode.type && typeof astNode.start === 'number' && typeof astNode.end === 'number') {
    const startOffset: number = astNode.start as number;
    const endOffset: number = astNode.end as number;

    Object.defineProperty(astNode, 'loc', {
      configurable: true,
      enumerable: true,
      get(): { start: { line: number; column: number }; end: { line: number; column: number } } {
        const computed: {
          start: { line: number; column: number };
          end: { line: number; column: number };
        } = {
          start: offsetToLoc(startOffset, lineStarts),
          end: offsetToLoc(endOffset, lineStarts),
        };
        /* Replace getter with computed value — subsequent accesses are free */
        Object.defineProperty(astNode, 'loc', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: computed,
        });
        return computed;
      },
    });
  }

  for (const key of Object.keys(astNode)) {
    if (key === 'loc') {
      continue;
    }
    const value: unknown = astNode[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        patchLoc(item, lineStarts);
      }
    } else if (value && typeof value === 'object') {
      patchLoc(value, lineStarts);
    }
  }
}

// =============================================================================
// AST Traversal
// =============================================================================

/**
 * Recursively walk an AST node tree, invoking callback for each node.
 *
 * @param {unknown} node - Current node (or subtree value)
 * @param {(node: AstNode) => void} callback - Called for every node that has a `type` property
 */
export function walkNode(node: unknown, callback: (node: AstNode) => void): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const astNode: AstNode = node as AstNode; // Cast safe: guarded by type check below

  if (astNode.type) {
    callback(astNode);
  }

  for (const key of Object.keys(astNode)) {
    /* Skip loc — it's a leaf (no child AST nodes) and may be a lazy getter */
    if (key === 'loc') {
      continue;
    }
    const value: unknown = astNode[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        walkNode(item, callback);
      }
    } else if (value && typeof value === 'object') {
      walkNode(value, callback);
    }
  }
}

// =============================================================================
// Import Extraction
// =============================================================================

/**
 * Extract all import declarations from an AST.
 *
 * @param ast - Root AST node
 * @returns Array of parsed import info
 */
function extractImports(ast: AstNode): ImportInfo[] {
  const imports: ImportInfo[] = [];

  walkNode(ast, (node: AstNode): void => {
    if (node.type !== 'ImportDeclaration') {
      return;
    }

    const source: string | undefined = (node.source as { value?: string })?.value;
    if (!source) {
      return;
    }

    const specifiers: ImportSpecifier[] = [];
    const nodeSpecifiers: AstNode[] | undefined = node.specifiers as AstNode[] | undefined;
    const isTypeOnly: boolean = Boolean(node.importKind === 'type' || node.isTypeOnly);

    if (nodeSpecifiers) {
      for (const spec of nodeSpecifiers) {
        if (spec.type === 'ImportDefaultSpecifier') {
          const local: string = (spec.local as { name?: string })?.name || 'default';
          specifiers.push({ imported: 'default', local, isDefault: true, isNamespace: false });
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          const local: string = (spec.local as { name?: string })?.name || '*';
          specifiers.push({ imported: '*', local, isDefault: false, isNamespace: true });
        } else if (spec.type === 'ImportSpecifier') {
          const imported: string =
            (spec.imported as { name?: string })?.name ||
            (spec.imported as { value?: string })?.value ||
            '';
          const local: string = (spec.local as { name?: string })?.name || imported;
          specifiers.push({ imported, local, isDefault: false, isNamespace: false });
        }
      }
    }

    imports.push({ source, specifiers, isTypeOnly });
  });

  return imports;
}

// =============================================================================
// Visitor Context
// =============================================================================

/**
 * Build a VisitorContext for a file being linted.
 * Imports are extracted once and shared across all rules for the same file.
 *
 * @param file - Absolute file path
 * @param content - File source text
 * @param ast - Parsed AST root
 * @param imports - Pre-extracted imports (shared across rules)
 * @param rule - The rule being evaluated
 * @param ruleOptions - Per-rule config options from the config file
 * @returns A VisitorContext
 */
function createVisitorContext(
  file: string,
  content: string,
  ast: AstNode,
  imports: ImportInfo[],
  rule: TypeScriptRule,
  ruleOptions?: Record<string, unknown>,
): VisitorContext {
  return {
    file,
    content,
    ast,
    imports,
    rule,
    ruleOptions,

    getNodeText(node: AstNode): string {
      return content.slice(node.start, node.end);
    },

    isImportedFrom(identifier: string, moduleName: string): boolean {
      for (const imp of imports) {
        if (imp.source !== moduleName) {
          continue;
        }
        for (const spec of imp.specifiers) {
          if (spec.local === identifier) {
            return true;
          }
          if (spec.isNamespace && identifier.startsWith(`${spec.local}.`)) {
            return true;
          }
        }
      }
      return false;
    },
  };
}

// =============================================================================
// Rule Execution
// =============================================================================

/**
 * Run a set of TypeScript AST rules on a single file.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} content - File source text
 * @param {TypeScriptRule[]} rules - Rules to evaluate
 * @param {Record<string, Record<string, unknown>>} allRuleOptions - Per-rule config options
 * @returns {Promise<LintResult[]>} Array of lint results
 */
export async function runTypeScriptRules(
  filePath: string,
  content: string,
  rules: TypeScriptRule[],
  allRuleOptions?: Record<string, Record<string, unknown>>,
): Promise<LintResult[]> {
  if (rules.length === 0) {
    return [];
  }

  const hasParser: boolean = await ensureOxcParser();
  if (!hasParser || !parseSync) {
    return [];
  }

  // For .svelte files, extract script blocks and parse as TypeScript
  const isSvelte: boolean = filePath.endsWith('.svelte');
  let parseContent: string = content;
  let parseFilePath: string = filePath;

  if (isSvelte) {
    const extracted: string = extractSvelteScript(content);
    if (extracted.trim() === '') {
      return []; // No script block — nothing to lint
    }
    parseContent = extracted;
    parseFilePath = filePath + '.ts'; // Tell oxc-parser to treat as TypeScript
  }

  let ast: AstNode;
  try {
    const result: { program: unknown } = parseSync(parseFilePath, parseContent) as {
      program: unknown;
    };
    ast = result.program as AstNode; // Safe: oxc-parser returns AST program node
  } catch {
    /* Parse error — skip file */
    return [];
  }

  // oxc-parser only provides byte offsets — patch loc using the PARSED content's line map
  // For .svelte files, parseContent has blanked non-script lines so byte offsets
  // map to the correct line numbers in the original file
  const lineStarts: number[] = buildLineStarts(parseContent);
  patchLoc(ast, lineStarts);

  // Extract imports ONCE per file, create contexts ONCE per rule (not per node)
  const imports: ImportInfo[] = extractImports(ast);
  const contexts: Map<string, VisitorContext> = new Map();
  for (const rule of rules) {
    const ruleOpts: Record<string, unknown> | undefined = allRuleOptions?.[rule.id];
    contexts.set(
      rule.id,
      createVisitorContext(filePath, parseContent, ast, imports, rule, ruleOpts),
    );
  }

  const results: LintResult[] = [];

  walkNode(ast, (node: AstNode): void => {
    for (const rule of rules) {
      const visitorFn: VisitorFn | undefined = rule.visitor[node.type as keyof typeof rule.visitor];
      if (!visitorFn) {
        continue;
      }

      const context: VisitorContext | undefined = contexts.get(rule.id);
      if (!context) {
        continue;
      }

      try {
        const ruleResults: LintResult[] = visitorFn(node, context);
        results.push(...ruleResults);
      } catch {
        /* Rule threw — skip this node for this rule */
      }
    }
  });

  /* Backfill `source` on results that don't already have it — use original content for source lines */
  const lines: string[] = content.split('\n');
  for (const result of results) {
    if (!result.source && result.line >= 1 && result.line <= lines.length) {
      result.source = lines[result.line - 1];
    }
  }

  return results;
}
