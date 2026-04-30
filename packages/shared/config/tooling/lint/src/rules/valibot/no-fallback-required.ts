/**
 * Rule: valibot/no-fallback-required
 *
 * Bans `v.fallback()` wrapping required schemas. If a field is required,
 * providing a fallback value defeats the purpose of requiring it — the
 * field will silently use the fallback instead of failing validation.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-fallback-required lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans v.fallback() on required schemas — fallback defeats required validation',
  id: 'valibot/no-fallback-required',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

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
          propName === 'fallback' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: node.end, start: node.start }, text: '' },
            line: node.loc.start.line,
            message:
              'Do not use v.fallback() on required schemas — it silently replaces missing values instead of failing validation',
            ruleId: 'valibot/no-fallback-required',
            severity: 'warning',
            tip: 'Remove v.fallback() and let validation fail when the required field is missing',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
