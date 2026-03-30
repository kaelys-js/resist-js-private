/**
 * Rule: primitives/no-relational-null-undefined
 *
 * Detects relational comparisons (<, >, <=, >=) with null or undefined,
 * which produce counterintuitive results due to the abstract relational
 * comparison algorithm.
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
  id: 'primitives/no-relational-null-undefined',
  description: 'Relational comparison with null/undefined has counterintuitive results',
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

      if (!leftRaw || !rightRaw || typeof leftRaw !== 'object' || typeof rightRaw !== 'object') {
        return results;
      }

      const left = leftRaw as AstNode;
      const right = rightRaw as AstNode;

      const isNullOrUndefined = (n: AstNode): boolean =>
        (n.type === 'Literal' && (n.value as unknown) === null) ||
        (n.type === 'Identifier' && (n.name as string) === 'undefined');

      if (isNullOrUndefined(left) || isNullOrUndefined(right)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Relational comparison with null/undefined has counterintuitive results',
          ruleId: 'primitives/no-relational-null-undefined',
          tip: 'Check for null/undefined separately before relational comparison',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
