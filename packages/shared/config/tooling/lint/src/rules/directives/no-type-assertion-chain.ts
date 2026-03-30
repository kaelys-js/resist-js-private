/**
 * Rule: directives/no-type-assertion-chain
 *
 * Detects double type assertion patterns like `as unknown as Type` or
 * `as any as Type` that bypass TypeScript's type safety checks.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-type-assertion-chain lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-type-assertion-chain',
  description: 'Disallow double type assertion chains (as unknown as / as any as)',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Check if the inner expression is also a TSAsExpression (chained assertion)
      const expression: unknown = node.expression;
      if (expression === null || typeof expression !== 'object') {
        return results;
      }

      const innerNode: AstNode = expression as AstNode;
      if (innerNode.type !== 'TSAsExpression') {
        return results;
      }

      // It's a chain — now check if the inner assertion's type is `unknown` or `any`
      const innerTypeAnnotation: unknown = innerNode.typeAnnotation;
      if (innerTypeAnnotation === null || typeof innerTypeAnnotation !== 'object') {
        return results;
      }

      const innerTypeNode: AstNode = innerTypeAnnotation as AstNode;
      if (innerTypeNode.type === 'TSUnknownKeyword' || innerTypeNode.type === 'TSAnyKeyword') {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message:
            "Double type assertion 'as unknown as' bypasses type safety - use type guards or runtime validation",
          ruleId: 'directives/no-type-assertion-chain',
          tip: 'Use Valibot schema validation or type guard function instead of double assertion',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
