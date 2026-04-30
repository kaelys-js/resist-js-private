/**
 * Rule: valibot/require-strict-object
 *
 * Forbids `v.object()` — must use `v.strictObject()` instead.
 * `v.object()` silently ignores unknown keys, defeating schema safety.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The require-strict-object lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Forbids v.object() — use v.strictObject() instead',
  id: 'valibot/require-strict-object',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint', 'ci'],

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

        // Only flag v.object(), not v.strictObject()
        if (
          propName === 'object' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: {
              range: { end: property?.end ?? 0, start: property?.start ?? 0 },
              text: 'strictObject',
            },
            line: node.loc.start.line,
            message: 'Use v.strictObject() instead of v.object() — v.object() ignores unknown keys',
            ruleId: 'valibot/require-strict-object',
            severity: 'error',
            tip: 'Replace v.object() with v.strictObject()',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
