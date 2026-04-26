/**
 * Rule: primitives/no-float-equality
 *
 * Detects direct equality comparisons with floating-point literals. Floating-point
 * arithmetic is inherently imprecise, so equality checks should use epsilon
 * comparison or integer math instead.
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
 * Returns true if the node is a float literal (number with a fractional part).
 */
function isFloatLiteral(node: AstNode): boolean {
  const { value } = node;
  return node.type === 'Literal' && typeof value === 'number' && value % 1 !== 0;
}

/** The no-float-equality lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/no-float-equality',
  description: 'Disallow direct equality comparison of floating-point numbers',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;
      const leftNode =
        leftRaw !== null && typeof leftRaw === 'object' ? (leftRaw as AstNode) : undefined;
      const rightNode =
        rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;

      if (
        (operator === '===' || operator === '!==') &&
        ((leftNode && isFloatLiteral(leftNode)) || (rightNode && isFloatLiteral(rightNode)))
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            'Avoid direct equality comparison of floats - use epsilon comparison or integers',
          ruleId: 'primitives/no-float-equality',
          tip: 'Use Math.abs(a - b) < Number.EPSILON or work with integers',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
