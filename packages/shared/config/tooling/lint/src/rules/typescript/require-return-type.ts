/**
 * Rule: typescript/require-return-type
 *
 * Every function declaration and arrow function expression must have
 * an explicit return type annotation.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/**
 * Get the insert position for a return type annotation.
 * For regular functions: after the closing paren of params.
 * For arrow functions: after the closing paren of params (before =>).
 *
 * @param funcNode - Function AST node
 * @param content - File source text
 * @returns Byte offset to insert `: ReturnType`, or -1
 */
function getReturnTypeInsertPos(funcNode: AstNode, content: string): number {
  const params = funcNode.params as AstNode[] | undefined;
  if (!params) return -1;

  // Find the closing paren after the last param
  const lastParam: AstNode | undefined = params[params.length - 1];
  const searchStart: number = lastParam ? lastParam.end : funcNode.start;

  // Search for ')' after the last param
  const parenIdx: number = content.indexOf(')', searchStart);
  if (parenIdx === -1) return -1;

  return parenIdx + 1;
}

const rule: TypeScriptRule = {
  id: 'typescript/require-return-type',
  description: 'Every function must have an explicit return type annotation',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      if (node.returnType) return results;

      const funcName: string = ((node.id as AstNode | undefined)?.name as string) ?? '<anonymous>';
      const insertPos: number = getReturnTypeInsertPos(node, context.content);

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Function '${funcName}' is missing a return type annotation`,
        ruleId: 'typescript/require-return-type',
        tip: 'Add an explicit return type: function name(): ReturnType { ... }',
        fix: {
          range: { start: insertPos, end: insertPos },
          text: ': ReturnType',
        },
      });

      return results;
    },

    ArrowFunctionExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      if (node.returnType) return results;

      const insertPos: number = getReturnTypeInsertPos(node, context.content);

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: 'Arrow function is missing a return type annotation',
        ruleId: 'typescript/require-return-type',
        tip: 'Add an explicit return type: (args): ReturnType => { ... }',
        fix: {
          range: { start: insertPos, end: insertPos },
          text: ': ReturnType',
        },
      });

      return results;
    },
  },
};

export default rule;
