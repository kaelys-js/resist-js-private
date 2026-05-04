/**
 * Rule: directives/no-generic-any-assertion
 *
 * Detects `as any` type assertions that defeat TypeScript's type safety.
 * Encourages using proper types or `unknown` with type guards instead.
 *
 * The auto-fix replaces `as any` with `as unknown`, which is the safe
 * mechanical transform — `unknown` forces the developer to add proper
 * type narrowing before using the value.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Build a fix that replaces `as any` with `as unknown`.
 *
 * Replaces only the type annotation node (the `any` keyword) with `unknown`.
 *
 * @param {AstNode} typeNode - The TSAnyKeyword AST node
 * @returns {LintFix} Fix that replaces `any` with `unknown`
 */
function buildAsUnknownFix(typeNode: AstNode): LintFix {
  const start: number = typeNode.start as number;
  const end: number = typeNode.end as number;

  return { range: { start, end }, text: 'unknown' };
}

/** The no-generic-any-assertion lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-generic-any-assertion',
  description: "Disallow 'as any' type assertions",
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

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
          fix: buildAsUnknownFix(typeNode),
        });
      }

      return results;
    },
  },
};

export default rule;
