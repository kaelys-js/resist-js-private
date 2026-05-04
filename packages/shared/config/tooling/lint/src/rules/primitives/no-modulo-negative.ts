/**
 * Rule: primitives/no-modulo-negative
 *
 * Flags usage of the % operator which in JavaScript is a remainder operator,
 * not a true modulo operator. With negative numbers, the result sign matches
 * the dividend, which is often unexpected.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const rule: TypeScriptRule = {
  id: 'primitives/no-modulo-negative',
  description:
    '% operator with potentially negative number - JavaScript % is remainder, not modulo',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;

      if (operator === '%') {
        /* Fix: a % b → ((a % b) + b) % b for true modulo behavior */
        const leftRaw: unknown = node.left;
        const rightRaw: unknown = node.right;
        const leftNode =
          leftRaw !== null && typeof leftRaw === 'object' ? (leftRaw as AstNode) : undefined;
        const rightNode =
          rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;

        let fix = { range: { start: 0, end: 0 }, text: '' };

        if (leftNode && rightNode) {
          const leftText: string = context.getNodeText(leftNode);
          const rightText: string = context.getNodeText(rightNode);
          fix = {
            range: { start: node.start, end: node.end },
            text: `((${leftText} % ${rightText}) + ${rightText}) % ${rightText}`,
          };
        }

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            '% operator with potentially negative number - JavaScript % is remainder, not modulo',
          ruleId: 'primitives/no-modulo-negative',
          tip: 'Use ((n % m) + m) % m for true modulo, or ensure non-negative input',
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
