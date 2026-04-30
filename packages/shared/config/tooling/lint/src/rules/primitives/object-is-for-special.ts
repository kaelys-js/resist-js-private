/**
 * Rule: primitives/object-is-for-special
 *
 * Detects strict equality checks against NaN or -0, which should use
 * Object.is() instead since === fails for these special values.
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
 * Returns true when `n` is the `NaN` identifier reference.
 *
 * @param n - AST node to test
 * @returns True when node is `Identifier` with name `'NaN'`
 */
function isNaNIdentifier(n: AstNode): boolean {
  return n.type === 'Identifier' && (n.name as string) === 'NaN';
}

/**
 * Returns true when `n` is the unary expression `-0`.
 *
 * @param n - AST node to test
 * @returns True when node is `UnaryExpression` with operator `-` and argument `Literal 0`
 */
function isNegativeZero(n: AstNode): boolean {
  if (n.type !== 'UnaryExpression' || (n.operator as string) !== '-') {
    return false;
  }

  const argRaw: unknown = n.argument;

  if (argRaw === null || typeof argRaw !== 'object') {
    return false;
  }

  const argNode = argRaw as AstNode;

  return argNode.type === 'Literal' && (argNode.value as unknown) === 0;
}

const rule: TypeScriptRule = {
  id: 'primitives/object-is-for-special',
  description: 'Use Object.is() for -0 or NaN comparison, not ===',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;

      if (operator !== '===' && operator !== '!==') {
        return results;
      }

      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;

      if (!leftRaw || !rightRaw || typeof leftRaw !== 'object' || typeof rightRaw !== 'object') {
        return results;
      }

      const left = leftRaw as AstNode;
      const right = rightRaw as AstNode;

      if (
        isNaNIdentifier(left) ||
        isNaNIdentifier(right) ||
        isNegativeZero(left) ||
        isNegativeZero(right)
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Use Object.is() for -0 or NaN comparison, not ===',
          ruleId: 'primitives/object-is-for-special',
          tip: 'Use Object.is(a, b) for comparing special values, or Number.isNaN() for NaN',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
