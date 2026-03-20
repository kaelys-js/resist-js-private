/**
 * Rule: valibot/require-strict-object
 *
 * Forbids `v.object()` — must use `v.strictObject()` instead.
 * `v.object()` silently ignores unknown keys, defeating schema safety.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

const rule: TypeScriptRule = {
  id: 'valibot/require-strict-object',
  description: 'Forbids v.object() — use v.strictObject() instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;
      if (!callee) return results;

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
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'Use v.strictObject() instead of v.object() — v.object() ignores unknown keys',
            ruleId: 'valibot/require-strict-object',
            tip: 'Replace v.object() with v.strictObject()',
            fix: {
              range: { start: property!.start, end: property!.end },
              text: 'strictObject',
            },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
