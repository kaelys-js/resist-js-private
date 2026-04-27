/**
 * Rule: primitives/use-number-is-integer
 *
 * Detects manual integer checks using the pattern `x % 1 === 0` and suggests
 * using the built-in Number.isInteger() instead.
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
 * Returns true when `side` is a `x % 1` BinaryExpression.
 *
 * @param side - AST node to test (typically the left/right of an equality op)
 * @returns True for `x % 1` patterns
 */
function isModOneCheck(side: AstNode): boolean {
  const sideOp = side.operator as string | undefined;
  const sideRightRaw: unknown = side.right;
  const sideRightNode =
    sideRightRaw !== null && typeof sideRightRaw === 'object'
      ? (sideRightRaw as AstNode)
      : undefined;
  const sideRightValue: unknown = sideRightNode?.value;
  return (
    side.type === 'BinaryExpression' &&
    sideOp === '%' &&
    sideRightNode !== undefined &&
    sideRightNode.type === 'Literal' &&
    typeof sideRightValue === 'number' &&
    sideRightValue === 1
  );
}

/**
 * Returns true when `side` is a numeric Literal with value 0.
 *
 * @param side - AST node to test
 * @returns True for `0` literal nodes
 */
function isZeroLiteral(side: AstNode): boolean {
  const sideValue: unknown = side.value;
  return side.type === 'Literal' && typeof sideValue === 'number' && sideValue === 0;
}

/** The use-number-is-integer lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/use-number-is-integer',
  description: 'Enforce Number.isInteger() over manual x % 1 === 0 checks',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      if (operator !== '===') {
        return results;
      }

      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;
      const leftNode =
        leftRaw !== null && typeof leftRaw === 'object' ? (leftRaw as AstNode) : undefined;
      const rightNode =
        rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;

      if (
        leftNode &&
        rightNode &&
        ((isModOneCheck(leftNode) && isZeroLiteral(rightNode)) ||
          (isModOneCheck(rightNode) && isZeroLiteral(leftNode)))
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Use Number.isInteger() instead of manual integer check',
          ruleId: 'primitives/use-number-is-integer',
          tip: 'Replace with Number.isInteger(x)',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
