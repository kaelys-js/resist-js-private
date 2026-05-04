/**
 * Rule: directives/no-type-assertion-chain
 *
 * Detects double type assertion patterns like `as unknown as Type` or
 * `as any as Type` that bypass TypeScript's type safety checks.
 *
 * The auto-fix removes the intermediate assertion, collapsing
 * `expr as unknown as Type` into `expr as Type`. This preserves the
 * final target type while eliminating the unsafe bypass.
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
 * Extract source text for an AST node.
 *
 * @param {AstNode} astNode - Node with start/end byte offsets
 * @param {string} source - Full source text
 * @returns {string} The node's source text
 */
function nodeText(astNode: AstNode, source: string): string {
  return source.slice(astNode.start as number, astNode.end as number);
}

/**
 * Build a fix that collapses `expr as unknown as Type` into `expr as Type`.
 *
 * @param {AstNode} outerNode - The outer TSAsExpression (the full chain)
 * @param {AstNode} innerNode - The inner TSAsExpression (expr as unknown)
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix
 */
function buildChainFix(outerNode: AstNode, innerNode: AstNode, context: VisitorContext): LintFix {
  const src: string = context.content;

  /* Get the original expression (before the first `as`) */
  const originalExpr: AstNode | undefined = innerNode.expression as AstNode | undefined;

  if (!originalExpr) {
    return { range: { start: 0, end: 0 }, text: '' };
  }

  /* Get the outer (final) type annotation */
  const outerType: AstNode | undefined = outerNode.typeAnnotation as AstNode | undefined;

  if (!outerType) {
    return { range: { start: 0, end: 0 }, text: '' };
  }

  const exprText: string = nodeText(originalExpr, src);
  const typeText: string = nodeText(outerType, src);

  return {
    range: { start: outerNode.start as number, end: outerNode.end as number },
    text: `${exprText} as ${typeText}`,
  };
}

/** The no-type-assertion-chain lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-type-assertion-chain',
  description: 'Disallow double type assertion chains (as unknown as / as any as)',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Check if the inner expression is also a TSAsExpression (chained assertion)
      const { expression } = node;

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
          fix: buildChainFix(node, innerNode, context),
        });
      }

      return results;
    },
  },
};

export default rule;
