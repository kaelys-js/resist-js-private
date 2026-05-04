/**
 * Rule: jsdoc/require-jsdoc
 *
 * Exported functions and type aliases must have a JSDoc comment.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check whether a node has a leading JSDoc comment in the source.
 *
 * @param node - The AST node to check
 * @param content - Full file source text
 * @returns Whether a JSDoc comment precedes the node
 */
function hasJsDoc(node: AstNode, content: string): boolean {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();

  if (!trimmed.endsWith('*/')) {
    return false;
  }

  const closeIdx: number = trimmed.lastIndexOf('*/');
  const openIdx: number = trimmed.lastIndexOf('/**');

  return openIdx !== -1 && openIdx < closeIdx;
}

/**
 * Get the function name from a FunctionDeclaration or variable-assigned arrow.
 *
 * @param node - AST node
 * @returns The function name or null
 */
function getFunctionName(node: AstNode): string | null {
  const id = node.id as AstNode | undefined;

  return (id?.name as string) ?? null;
}
/** The require-jsdoc lint rule. */
const rule: TypeScriptRule = {
  id: 'jsdoc/require-jsdoc',
  description: 'Exported functions and types must have a JSDoc comment',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['jsdoc'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const declaration = node.declaration as AstNode | undefined;

      if (!declaration) {
        return results;
      }

      if (declaration.type === 'FunctionDeclaration' && !hasJsDoc(node, context.content)) {
        const name: string = getFunctionName(declaration) ?? '<anonymous>';
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Exported function '${name}' is missing a JSDoc comment`,
          ruleId: 'jsdoc/require-jsdoc',
          tip: 'Add a /** ... */ comment above the export describing what it does',
          example: `/** Description. */\nexport function ${name}(...) { ... }`,
          fix: { range: { start: node.start, end: node.start }, text: '/** Description. */\n' },
        });
      }

      if (declaration.type === 'TSTypeAliasDeclaration' && !hasJsDoc(node, context.content)) {
        const name: string =
          ((declaration.id as AstNode | undefined)?.name as string) ?? '<anonymous>';
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Exported type '${name}' is missing a JSDoc comment`,
          ruleId: 'jsdoc/require-jsdoc',
          tip: 'Add a /** ... */ comment above the export describing the type',
          fix: { range: { start: node.start, end: node.start }, text: '/** Description. */\n' },
        });
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
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') &&
            !hasJsDoc(node, context.content)
          ) {
            const name: string =
              ((decl.id as AstNode | undefined)?.name as string) ?? '<anonymous>';
            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: `Exported function '${name}' is missing a JSDoc comment`,
              ruleId: 'jsdoc/require-jsdoc',
              tip: 'Add a /** ... */ comment above the export',
              fix: {
                range: { start: node.start, end: node.start },
                text: '/** Description. */\n',
              },
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
