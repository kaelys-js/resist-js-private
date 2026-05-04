/**
 * Rule: primitives/use-number-is-finite
 *
 * Enforces Number.isFinite() over the global isFinite() function. The global
 * version coerces its argument to a number first, which can mask bugs.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The use-number-is-finite lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/use-number-is-finite',
  description: 'Enforce Number.isFinite() over global isFinite()',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;
      const calleeNode =
        calleeRaw !== null && typeof calleeRaw === 'object' ? (calleeRaw as AstNode) : undefined;
      const calleeName = calleeNode?.name as string | undefined;

      if (calleeNode && calleeNode.type === 'Identifier' && calleeName === 'isFinite') {
        /* Fix: isFinite(x) → Number.isFinite(x) */
        const nodeArgs = node.arguments as AstNode[] | undefined;
        const argsText: string =
          nodeArgs && nodeArgs.length > 0
            ? nodeArgs.map((a: AstNode) => context.getNodeText(a)).join(', ')
            : '';
        const fix = {
          range: { start: node.start, end: node.end },
          text: `Number.isFinite(${argsText})`,
        };

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Use Number.isFinite() instead of isFinite() to avoid type coercion',
          ruleId: 'primitives/use-number-is-finite',
          tip: 'Replace isFinite(x) with Number.isFinite(x)',
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
