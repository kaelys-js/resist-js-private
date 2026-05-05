/**
 * Rule: primitives/division-by-zero
 *
 * Flags division by a variable (not a literal) which could potentially be zero
 * at runtime, causing Infinity or NaN results.
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

const rule: TypeScriptRule = {
  id: 'primitives/division-by-zero',
  description: 'Potential division by zero - add check for zero divisor',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      const { right } = node;
      const rightNode =
        right !== null && typeof right === 'object' ? (right as AstNode) : undefined;

      if (operator === '/' && rightNode && rightNode.type !== 'Literal') {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Potential division by zero - add check for zero divisor',
          ruleId: 'primitives/division-by-zero',
          tip: 'Check divisor: if (divisor === 0) throw/return before dividing',
          fix: NO_OP_FIX,
        });
      }

      return results;
    },
  },
};

export default rule;
