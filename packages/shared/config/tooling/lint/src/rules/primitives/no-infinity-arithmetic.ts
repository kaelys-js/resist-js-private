/**
 * Rule: primitives/no-infinity-arithmetic
 *
 * Detects arithmetic operations that may produce Infinity: exponentiation with
 * exponents > 100, or division by literal zero.
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

/** The no-infinity-arithmetic lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/no-infinity-arithmetic',
  description: 'Disallow operations that may produce Infinity',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      const rightRaw: unknown = node.right;
      const rightNode =
        rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;
      const rightValue: unknown = rightNode?.value;

      const isLargeExponent =
        operator === '**' &&
        rightNode !== undefined &&
        rightNode.type === 'Literal' &&
        typeof rightValue === 'number' &&
        rightValue > 100;

      const isDivisionByZero =
        operator === '/' &&
        rightNode !== undefined &&
        rightNode.type === 'Literal' &&
        typeof rightValue === 'number' &&
        rightValue === 0;

      if (isLargeExponent || isDivisionByZero) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Operation may result in Infinity - add bounds checking or handle edge case',
          ruleId: 'primitives/no-infinity-arithmetic',
          tip: 'Check for zero divisor or use Number.isFinite() on result',
          fix: NO_OP_FIX,
        });
      }

      return results;
    },
  },
};

export default rule;
