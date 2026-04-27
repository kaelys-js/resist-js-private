/**
 * Rule: primitives/no-bigint-number-mix
 *
 * Detects arithmetic operations that mix BigInt and number literals. JavaScript
 * throws a TypeError when mixing these types, so explicit conversion is required.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const ARITHMETIC_OPERATORS = new Set(['+', '-', '*', '/', '%']);

/**
 * Returns true if the node is a BigInt literal (has a `bigint` property).
 * @returns Description
 */
function isBigIntLiteral(node: AstNode): boolean {
  const { bigint } = node;
  return node.type === 'Literal' && bigint !== undefined && bigint !== null;
}

/**
 * Returns true if the node is a number literal.
 * @returns Description
 */
function isNumberLiteral(node: AstNode): boolean {
  const { value } = node;
  return node.type === 'Literal' && typeof value === 'number';
}

/** The no-bigint-number-mix lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/no-bigint-number-mix',
  description: 'Disallow mixing BigInt and number in arithmetic operations',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      if (!ARITHMETIC_OPERATORS.has(operator)) {
        return results;
      }

      const { left } = node;
      const { right } = node;
      const leftNode = left !== null && typeof left === 'object' ? (left as AstNode) : undefined;
      const rightNode =
        right !== null && typeof right === 'object' ? (right as AstNode) : undefined;

      if (!leftNode || !rightNode) {
        return results;
      }

      const leftIsBigInt = isBigIntLiteral(leftNode);
      const rightIsBigInt = isBigIntLiteral(rightNode);
      const leftIsNumber = isNumberLiteral(leftNode);
      const rightIsNumber = isNumberLiteral(rightNode);

      if ((leftIsBigInt && rightIsNumber) || (leftIsNumber && rightIsBigInt)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Cannot mix bigint and number in operation - explicitly convert types',
          ruleId: 'primitives/no-bigint-number-mix',
          tip: 'Use BigInt(number) or Number(bigint) for explicit conversion',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
