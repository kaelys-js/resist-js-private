/**
 * Rule: directives/no-generic-any-assertion
 *
 * Detects `as any` type assertions that defeat TypeScript's type safety.
 * Encourages using proper types or `unknown` with type guards instead.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-generic-any-assertion lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-generic-any-assertion',
  description: "Disallow 'as any' type assertions",
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const { typeAnnotation } = node;

      if (typeAnnotation === null || typeof typeAnnotation !== 'object') {
        return results;
      }

      const typeNode: AstNode = typeAnnotation as AstNode;

      if (typeNode.type === 'TSAnyKeyword') {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message:
            "'as any' assertion defeats type safety - use proper types or 'unknown' with type guards",
          ruleId: 'directives/no-generic-any-assertion',
          tip: "Replace 'as any' with proper type, or use 'unknown' with runtime type narrowing",
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
