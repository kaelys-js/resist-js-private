/**
 * Rule: valibot/no-transform-side-effects
 *
 * `v.transform()` callbacks must be pure functions. Side effects like
 * `console.log`, `fetch`, `alert`, or DOM manipulation inside transforms
 * make schemas unpredictable and difficult to test.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Patterns that indicate side effects in transform callbacks. */
const SIDE_EFFECT_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'console', pattern: /console\./ },
  { label: 'fetch', pattern: /fetch\s*\(/ },
  { label: 'alert', pattern: /alert\s*\(/ },
  { label: 'document', pattern: /document\./ },
  { label: 'window', pattern: /window\./ },
  { label: 'localStorage', pattern: /localStorage\./ },
  { label: 'sessionStorage', pattern: /sessionStorage\./ },
  { label: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
  { label: 'setTimeout', pattern: /setTimeout\s*\(/ },
  { label: 'setInterval', pattern: /setInterval\s*\(/ },
];

/** The no-transform-side-effects lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'quality'],
  description: 'v.transform() callbacks must be pure — no console.log, fetch, etc.',
  id: 'valibot/no-transform-side-effects',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;

      if (!callee) {
        return results;
      }

      if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
        const object = callee.object as AstNode | undefined;
        const property = callee.property as AstNode | undefined;
        const propName: string = (property?.name as string) ?? '';

        if (
          propName === 'transform' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Get the callback argument text
          const args = node.arguments as AstNode[] | undefined;

          if (!args || args.length === 0) {
            return results;
          }

          // The callback is the last argument (pipe-style: transform(fn), old-style: transform(schema, fn))
          const callbackArg = args.at(-1) as AstNode | undefined;

          if (!callbackArg) {
            return results;
          }

          const callbackText: string = context.content.slice(callbackArg.start, callbackArg.end);

          // Check for side-effect patterns
          for (const { label, pattern } of SIDE_EFFECT_PATTERNS) {
            if (pattern.test(callbackText)) {
              results.push({
                column: node.loc.start.column + 1,
                file: context.file,
                fix: { range: { end: 0, start: 0 }, text: '' },
                line: node.loc.start.line,
                message: `v.transform() callback contains side effect: ${label}`,
                ruleId: 'valibot/no-transform-side-effects',
                severity: 'warning',
                tip: 'Transform callbacks must be pure functions — move side effects outside the schema pipeline',
              });
              break;
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
