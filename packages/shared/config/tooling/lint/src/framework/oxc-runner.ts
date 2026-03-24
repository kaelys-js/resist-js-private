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
  ImportInfo,
  ImportSpecifier,
} from './types.ts';

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
    const oxc = await import('oxc-parser');
    parseSync = oxc.parseSync as typeof parseSync;
    return true;
  } catch {
    /* oxc-parser not installed — skip AST rules */
    return false;
  }
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
    if (lineStarts[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return { line: low + 1, column: offset - lineStarts[low] };
}

/**
 * Patch `loc` onto all AST nodes using byte offsets and a line map.
 * oxc-parser only provides `start`/`end` byte offsets, not `loc`.
 *
 * @param node - Root AST node
 * @param lineStarts - Line start offsets
 */
function patchLoc(node: unknown, lineStarts: number[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const astNode: AstNode = node as AstNode; // Cast safe: guarded by type check

  if (astNode.type && typeof astNode.start === 'number' && typeof astNode.end === 'number') {
    astNode.loc = {
      start: offsetToLoc(astNode.start, lineStarts),
      end: offsetToLoc(astNode.end, lineStarts),
    };
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
 * @param node - Current node (or subtree value)
 * @param callback - Called for every node that has a `type` property
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

  walkNode(ast, (node: AstNode) => {
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
 * @returns A VisitorContext
 */
function createVisitorContext(
  file: string,
  content: string,
  ast: AstNode,
  imports: ImportInfo[],
  rule: TypeScriptRule,
): VisitorContext {
  return {
    file,
    content,
    ast,
    imports,
    rule,

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
 * @param filePath - Absolute path to the file
 * @param content - File source text
 * @param rules - Rules to evaluate
 * @returns Array of lint results
 */
export async function runTypeScriptRules(
  filePath: string,
  content: string,
  rules: TypeScriptRule[],
): Promise<LintResult[]> {
  if (rules.length === 0) {
    return [];
  }

  const hasParser: boolean = await ensureOxcParser();
  if (!hasParser || !parseSync) {
    return [];
  }

  let ast: AstNode;
  try {
    const result = parseSync(filePath, content);
    ast = result.program as AstNode;
  } catch {
    /* Parse error — skip file */
    return [];
  }

  // oxc-parser only provides byte offsets — patch loc onto all nodes
  const lineStarts: number[] = buildLineStarts(content);
  patchLoc(ast, lineStarts);

  // Extract imports ONCE per file, create contexts ONCE per rule (not per node)
  const imports: ImportInfo[] = extractImports(ast);
  const contexts: Map<string, VisitorContext> = new Map();
  for (const rule of rules) {
    contexts.set(rule.id, createVisitorContext(filePath, content, ast, imports, rule));
  }

  const results: LintResult[] = [];

  walkNode(ast, (node: AstNode) => {
    for (const rule of rules) {
      const visitorFn = rule.visitor[node.type as keyof typeof rule.visitor];
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

  return results;
}
