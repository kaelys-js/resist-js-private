/**
 * Rule: valibot/no-passthrough
 *
 * Bans `v.passthrough()` calls. Passthrough allows unknown keys to pass
 * through validation, defeating schema safety.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-passthrough lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans v.passthrough() — unknown keys should not pass through validation',
  id: 'valibot/no-passthrough',
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
          propName === 'passthrough' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: node.end, start: node.start }, text: '' },
            line: node.loc.start.line,
            message: 'Do not use v.passthrough() — it allows unknown keys to bypass validation',
            ruleId: 'valibot/no-passthrough',
            severity: 'error',
            tip: 'Remove v.passthrough() and use v.strictObject() to enforce known keys only',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
