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
 *
 * @param node - AST node to test
 * @returns True when node is a Literal node with a defined bigint property
 */
function isBigIntLiteral(node: AstNode): boolean {
  const { bigint } = node;

  return node.type === 'Literal' && bigint !== undefined && bigint !== null;
}

/**
 * Returns true if the node is a number literal.
 *
 * @param node - AST node to test
 * @returns True when node is a Literal node whose value is a number
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
  fixable: true,

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
        /* Fix: convert the number literal to BigInt by appending 'n' (integers only) */
        let fix = { range: { start: 0, end: 0 }, text: '' };
        const numNode: AstNode | undefined = leftIsNumber ? leftNode : rightNode;
        const numVal: unknown = numNode.value;

        if (typeof numVal === 'number' && numVal % 1 === 0) {
          const numText: string = context.getNodeText(numNode);
          fix = { range: { start: numNode.start, end: numNode.end }, text: `${numText}n` };
        }

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Cannot mix bigint and number in operation - explicitly convert types',
          ruleId: 'primitives/no-bigint-number-mix',
          tip: 'Use BigInt(number) or Number(bigint) for explicit conversion',
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
