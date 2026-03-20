/**
 * Rule: valibot/no-direct-safeparse
 *
 * Forbids `v.safeParse()` calls. Use `safeParse` from `@/utils/result/safe`
 * instead, which returns `Result<T>` rather than Valibot's native format.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

const rule: TypeScriptRule = {
  id: 'valibot/no-direct-safeparse',
  description: 'Forbids v.safeParse() — use safeParse from @/utils/result/safe instead',
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

        if (
          propName === 'safeParse' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message:
              "Do not use v.safeParse() directly — it returns Valibot's format, not Result<T>",
            ruleId: 'valibot/no-direct-safeparse',
            tip: "Use safeParse from '@/utils/result/safe' instead",
            fix: {
              range: { start: callee.start, end: callee.end },
              text: 'safeParse',
            },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
