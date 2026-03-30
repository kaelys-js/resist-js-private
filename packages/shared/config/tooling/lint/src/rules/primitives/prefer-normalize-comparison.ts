/**
 * Rule: primitives/prefer-normalize-comparison
 *
 * Flags strict equality comparisons between two variables without prior
 * normalize() call. Visually identical Unicode strings can have different
 * internal encodings (NFC vs NFD), causing unexpected inequality.
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
  id: 'primitives/prefer-normalize-comparison',
  description:
    'String comparison without normalize() - visually identical strings may have different encodings',
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
        leftNode &&
        leftNode.type === 'Identifier' &&
        rightNode &&
        rightNode.type === 'Identifier'
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            'String comparison without normalize() - visually identical strings may have different encodings',
          ruleId: 'primitives/prefer-normalize-comparison',
          tip: 'Use str.normalize() before comparison or localeCompare() with options',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
