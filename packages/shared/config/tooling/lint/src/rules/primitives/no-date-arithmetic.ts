/**
 * Rule: primitives/no-date-arithmetic
 *
 * Detects subtraction involving Date constructor calls, which returns
 * raw milliseconds and is error-prone for date calculations.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

function isNewDateExpression(node: AstNode): boolean {
  const callee: unknown = node.callee;
  if (callee === null || typeof callee !== 'object') {
    return false;
  }
  const calleeNode = callee as AstNode;
  return (
    node.type === 'NewExpression' &&
    calleeNode.type === 'Identifier' &&
    (calleeNode.name as string) === 'Date'
  );
}

const rule: TypeScriptRule = {
  id: 'primitives/no-date-arithmetic',
  description: 'Date arithmetic returns milliseconds - use date-fns or explicit getTime()',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      if (operator !== '-') {
        return results;
      }

      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;
      const leftNode =
        leftRaw !== null && typeof leftRaw === 'object' ? (leftRaw as AstNode) : undefined;
      const rightNode =
        rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;

      if (
        (!leftNode || !isNewDateExpression(leftNode)) &&
        (!rightNode || !isNewDateExpression(rightNode))
      ) {
        return results;
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message: 'Date arithmetic returns milliseconds - use date-fns or explicit getTime()',
        ruleId: 'primitives/no-date-arithmetic',
        tip: 'Use differenceInDays/Hours/etc from date-fns, or explicitly use getTime()',
        fix: { range: { start: 0, end: 0 }, text: '' },
      });

      return results;
    },
  },
};

export default rule;
