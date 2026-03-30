/**
 * Rule: primitives/no-compare-different-types
 *
 * Detects relational comparisons between string and number literals,
 * which rely on implicit coercion and produce surprising results.
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
  id: 'primitives/no-compare-different-types',
  description: 'Comparison between different types uses implicit coercion - convert explicitly',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      if (operator !== '<' && operator !== '>' && operator !== '<=' && operator !== '>=') {
        return results;
      }

      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;

      if (!leftRaw || typeof leftRaw !== 'object' || !rightRaw || typeof rightRaw !== 'object') {
        return results;
      }

      const left = leftRaw as AstNode;
      const right = rightRaw as AstNode;

      const isStringLiteral = (n: AstNode): boolean => {
        const val: unknown = n.value;
        return n.type === 'Literal' && typeof val === 'string';
      };
      const isNumberLiteral = (n: AstNode): boolean => {
        const val: unknown = n.value;
        return n.type === 'Literal' && typeof val === 'number';
      };

      const leftIsString = isStringLiteral(left);
      const leftIsNumber = isNumberLiteral(left);
      const rightIsString = isStringLiteral(right);
      const rightIsNumber = isNumberLiteral(right);

      if ((leftIsString && rightIsNumber) || (leftIsNumber && rightIsString)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Comparison between different types uses implicit coercion - convert explicitly',
          ruleId: 'primitives/no-compare-different-types',
          tip: 'Ensure both operands are the same type, or convert explicitly',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
