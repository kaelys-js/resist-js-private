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
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;

      if (operator === '%') {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            '% operator with potentially negative number - JavaScript % is remainder, not modulo',
          ruleId: 'primitives/no-modulo-negative',
          tip: 'Use ((n % m) + m) % m for true modulo, or ensure non-negative input',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
