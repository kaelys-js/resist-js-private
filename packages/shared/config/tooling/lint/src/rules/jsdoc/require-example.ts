/**
 * Rule: jsdoc/require-example
 *
 * Exported functions must have an `@example` block in their JSDoc,
 * and the example must use a ```typescript``` code fence.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Extract JSDoc text preceding a node.
 *
 * @param node - AST node
 * @param content - Full file source text
 * @returns The JSDoc comment text, or null if none
 */
function getJsDoc(node: AstNode, content: string): string | null {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();

  if (!trimmed.endsWith('*/')) {
    return null;
  }

  const docEnd: number = trimmed.length;
  const docStart: number = trimmed.lastIndexOf('/**');

  if (docStart === -1) {
    return null;
  }

  return trimmed.slice(docStart, docEnd);
}

/**
 * Find the byte offset of the closing star-slash in a JSDoc comment.
 *
 * @param node - The export node
 * @param content - File source text
 * @returns Byte offset of the closing asterisk-slash, or -1
 */
function getJsDocEndOffset(node: AstNode, content: string): number {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();

  if (!trimmed.endsWith('*/')) {
    return -1;
  }
  return trimmed.length - 2;
}

/** No-op fix sentinel. */
const NO_FIX = NO_OP_FIX;

/**
 * Build a fix that replaces a bare ``` fence with ```typescript after @example.
 *
 * Finds the first ``` fence in the JSDoc that is NOT followed by `typescript`
 * and replaces it with ```typescript.
 *
 * @param {AstNode} exportNode - The export node (for JSDoc location)
 * @param {string} content - Full file source text
 * @returns {{ range: { start: number; end: number }; text: string }} Fix replacing fence
 */
function buildFenceFix(
  exportNode: AstNode,
  content: string,
): { range: { start: number; end: number }; text: string } {
  const before: string = content.slice(0, exportNode.start);
  const trimmed: string = before.trimEnd();

  if (!trimmed.endsWith('*/')) {
    return NO_FIX;
  }

  const docStart: number = trimmed.lastIndexOf('/**');

  if (docStart === -1) {
    return NO_FIX;
  }

  const jsDocText: string = content.slice(docStart, trimmed.length);

  /* Find a ``` that is NOT followed by `typescript` */
  const fencePattern: RegExp = /```(?!typescript)/g;
  const match: RegExpExecArray | null = fencePattern.exec(jsDocText);

  if (!match) {
    return NO_FIX;
  }

  const absStart: number = docStart + match.index;

  return { range: { start: absStart, end: absStart + 3 }, text: '```typescript' };
}

/**
 * Check a function node for a missing @example tag or missing typescript fence.
 *
 * @param funcNode - Function AST node
 * @param exportNode - Export declaration node
 * @param context - Visitor context
 * @returns Array of lint results
 */
function checkFunction(
  funcNode: AstNode,
  exportNode: AstNode,
  context: VisitorContext,
): LintResult[] {
  const results: LintResult[] = [];
  const jsDoc: string | null = getJsDoc(exportNode, context.content);

  if (!jsDoc) {
    return results;
  }

  const funcName: string = ((funcNode.id as AstNode | undefined)?.name as string) ?? '<anonymous>';
  const hasExample: boolean = /@example\b/.test(jsDoc);
  const insertOffset: number = getJsDocEndOffset(exportNode, context.content);

  if (!hasExample) {
    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `Missing @example in JSDoc for exported function '${funcName}'`,
      ruleId: 'jsdoc/require-example',
      tip: 'Add an @example block with a ```typescript``` code fence',
      example: '@example\n * ```typescript\n * const result = myFn(arg);\n * ```',
      fix: {
        range: { start: insertOffset, end: insertOffset },
        text: ' * @example\n * ```typescript\n * // usage\n * ```\n ',
      },
    });
    return results;
  }

  // @example exists — check that it uses ```typescript``` fence
  const hasTypescriptFence: boolean = /```typescript/.test(jsDoc);

  if (!hasTypescriptFence) {
    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `@example in '${funcName}' must use a \`\`\`typescript\`\`\` code fence`,
      ruleId: 'jsdoc/require-example',
      tip: 'Wrap example code in ```typescript``` ... ``` fence',
      fix: buildFenceFix(exportNode, context.content),
    });
  }

  return results;
}
/** The require-example lint rule. */
const rule: TypeScriptRule = {
  id: 'jsdoc/require-example',
  description: 'Exported functions must have an @example block with ```typescript``` fence',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['jsdoc'],
  stages: ['lint'],
  fixable: true,

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const declaration = node.declaration as AstNode | undefined;

      if (!declaration) {
        return results;
      }

      if (declaration.type === 'FunctionDeclaration') {
        results.push(...checkFunction(declaration, node, context));
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined;

        if (!declarations) {
          return results;
        }

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined;

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
