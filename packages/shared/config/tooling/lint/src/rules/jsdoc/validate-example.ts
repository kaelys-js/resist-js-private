/**
 * Rule: jsdoc/validate-example
 *
 * Validates that TypeScript code inside JSDoc `@example` blocks is
 * syntactically valid by parsing it with oxc-parser.
 *
 * Only checks syntax — does NOT resolve imports or check types.
 * Only parses ` ```typescript ``` ` fences; other languages are ignored.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

// =============================================================================
// Parser
// =============================================================================

/** Lazy-loaded oxc-parser parseSync function. */
let oxcParseSync: ((filename: string, source: string) => { errors: unknown[] }) | null = null;

/**
 * Lazily load oxc-parser and assign to module-level variable.
 *
 * @returns {Promise<boolean>} Whether the parser is available
 */
async function ensureParser(): Promise<boolean> {
  if (oxcParseSync) {
    return true;
  }
  try {
    const oxc: { parseSync: unknown } = await import('oxc-parser');
    oxcParseSync = oxc.parseSync as unknown as typeof oxcParseSync;
    return true;
  } catch {
    return false;
  }
}

// Pre-load parser at module level (async — ready by the time rules run)
await ensureParser();

// =============================================================================
// JSDoc Extraction
// =============================================================================

/**
 * Extract JSDoc text preceding a node.
 *
 * @param {AstNode} node - AST node
 * @param {string} content - Full file source text
 * @returns {string | null} The JSDoc comment text, or null if none
 */
function getJsDoc(node: AstNode, content: string): string | null {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();
  if (!trimmed.endsWith('*/')) {
    return null;
  }

  const closeIdx: number = trimmed.lastIndexOf('*/');
  const openIdx: number = trimmed.lastIndexOf('/**');
  if (openIdx === -1 || openIdx >= closeIdx) {
    return null;
  }

  return trimmed.slice(openIdx, closeIdx + 2);
}

// =============================================================================
// Example Block Extraction
// =============================================================================

/**
 * Extract all typescript code blocks from a JSDoc comment.
 *
 * Finds all ` ```typescript ... ``` ` fences and returns the code inside,
 * with JSDoc `* ` line prefixes stripped.
 *
 * @param {string} docComment - The full JSDoc comment text
 * @returns {string[]} Array of extracted TypeScript code strings
 */
function extractTypescriptBlocks(docComment: string): string[] {
  const blocks: string[] = [];
  const fencePattern: RegExp = /```typescript\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null = fencePattern.exec(docComment);

  while (match !== null) {
    const [, rawBlock]: RegExpExecArray = match;
    if (rawBlock) {
      // Strip JSDoc `* ` prefix from each line
      const cleaned: string = rawBlock
        .split('\n')
        .map((line: string): string => line.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim();

      if (cleaned.length > 0) {
        blocks.push(cleaned);
      }
    }
    match = fencePattern.exec(docComment);
  }

  return blocks;
}

/**
 * Extract unfenced code blocks from at-example sections in a JSDoc comment.
 *
 * Finds at-example tags that are NOT followed by a code fence and collects
 * the JSDoc lines as TypeScript code until the next at-tag, fence,
 * or end of comment.
 *
 * @param {string} docComment - The full JSDoc comment text
 * @returns {string[]} Array of extracted unfenced code strings
 */
function extractUnfencedBlocks(docComment: string): string[] {
  const blocks: string[] = [];
  const lines: string[] = docComment.split('\n');
  let collecting: boolean = false;
  let currentBlock: string[] = [];

  for (const line of lines) {
    const stripped: string = line.replace(/^\s*\*\s?/, '');

    // Start collecting after @example (but not if next non-empty line is a fence)
    if (/@example\b/.test(stripped)) {
      // Flush any previous block
      if (currentBlock.length > 0) {
        const code: string = currentBlock.join('\n').trim();
        if (code.length > 0) {
          blocks.push(code);
        }
        currentBlock = [];
      }
      collecting = true;
      continue;
    }

    if (collecting) {
      // Stop at fenced block — extractTypescriptBlocks handles those
      if (/^\s*```/.test(stripped)) {
        collecting = false;
        if (currentBlock.length > 0) {
          const code: string = currentBlock.join('\n').trim();
          if (code.length > 0) {
            blocks.push(code);
          }
          currentBlock = [];
        }
        continue;
      }

      // Stop at next @tag
      if (/^\s*@\w+/.test(stripped)) {
        collecting = false;
        if (currentBlock.length > 0) {
          const code: string = currentBlock.join('\n').trim();
          if (code.length > 0) {
            blocks.push(code);
          }
          currentBlock = [];
        }
        continue;
      }

      // Stop at end of comment
      if (/\*\/\s*$/.test(line)) {
        collecting = false;
        if (currentBlock.length > 0) {
          const code: string = currentBlock.join('\n').trim();
          if (code.length > 0) {
            blocks.push(code);
          }
          currentBlock = [];
        }
        continue;
      }

      currentBlock.push(stripped);
    }
  }

  // Flush remaining block
  if (currentBlock.length > 0) {
    const code: string = currentBlock.join('\n').trim();
    if (code.length > 0) {
      blocks.push(code);
    }
  }

  return blocks;
}

// =============================================================================
// Rule
// =============================================================================

/**
 * Check a function's @example blocks for syntax errors.
 *
 * @param {AstNode} funcNode - Function AST node
 * @param {AstNode} exportNode - Export declaration node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult[]} Array of lint results
 */
function checkFunction(
  funcNode: AstNode,
  exportNode: AstNode,
  context: VisitorContext,
): LintResult[] {
  const results: LintResult[] = [];
  const docComment: string | null = getJsDoc(exportNode, context.content);
  if (!docComment) {
    return results;
  }

  // Only check if @example exists
  if (!/@example\b/.test(docComment)) {
    return results;
  }

  const fencedBlocks: string[] = extractTypescriptBlocks(docComment);
  const unfencedBlocks: string[] =
    fencedBlocks.length === 0 ? extractUnfencedBlocks(docComment) : [];
  const blocks: string[] = [...fencedBlocks, ...unfencedBlocks];
  if (blocks.length === 0) {
    return results;
  }

  const funcName: string = ((funcNode.id as AstNode | undefined)?.name as string) ?? '<anonymous>';

  for (const block of blocks) {
    if (!oxcParseSync) {
      continue;
    }

    try {
      // Wrap in async function to allow top-level return/await in examples
      const wrappedBlock: string = `async function __example__() {\n${block}\n}`;
      const parseResult: { errors: unknown[] } = oxcParseSync('example.ts', wrappedBlock);
      const { errors }: { errors: unknown[] } = parseResult;

      if (errors.length > 0) {
        // Get first error message
        const [firstError]: unknown[] = errors;
        const errorMsg: string =
          typeof firstError === 'object' && firstError !== null
            ? (((firstError as Record<string, unknown>).message as string) ?? 'parse error') // cast safe: extracting message from error object
            : String(firstError);

        results.push({
          file: context.file,
          line: exportNode.loc.start.line,
          column: exportNode.loc.start.column + 1,
          severity: 'error',
          message: `@example in '${funcName}' has a syntax error: ${errorMsg}`,
          ruleId: 'jsdoc/validate-example',
          tip: 'Fix the TypeScript code in the @example block',
          fix: { range: { start: exportNode.start, end: exportNode.start }, text: '' },
        });
      }
    } catch {
      // Parser threw — treat as syntax error
      results.push({
        file: context.file,
        line: exportNode.loc.start.line,
        column: exportNode.loc.start.column + 1,
        severity: 'error',
        message: `@example in '${funcName}' has a syntax error: failed to parse`,
        ruleId: 'jsdoc/validate-example',
        tip: 'Fix the TypeScript code in the @example block',
        fix: { range: { start: exportNode.start, end: exportNode.start }, text: '' },
      });
    }
  }

  return results;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'jsdoc/validate-example',
  description: 'TypeScript code in @example blocks must be syntactically valid',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['jsdoc'],
  stages: ['lint'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const declaration = node.declaration as AstNode | undefined; // cast safe: AST property extraction
      if (!declaration) {
        return results;
      }

      if (declaration.type === 'FunctionDeclaration') {
        results.push(...checkFunction(declaration, node, context));
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined; // cast safe: AST property extraction
        if (!declarations) {
          return results;
        }

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined; // cast safe: AST property extraction
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            results.push(...checkFunction(init, node, context));
          }
        }
      }

      return results;
    },
  },
};

export default rule;
