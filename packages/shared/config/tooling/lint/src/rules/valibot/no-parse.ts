/**
 * Rule: valibot/no-parse
 *
 * Forbids `v.parse()` calls. Use `safeParse` from `@/utils/result/safe` instead,
 * because `v.parse()` throws on validation failure, bypassing the Result pattern.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';
/** The no-parse lint rule. */
const rule: TypeScriptRule = {
  id: 'valibot/no-parse',
  description: 'Forbids v.parse() — use safeParse from @/utils/result/safe instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return results;
      }

      // Check for v.parse(...) or valibot.parse(...)
      if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
        const object = callee.object as AstNode | undefined;
        const property = callee.property as AstNode | undefined;
        const propName: string = (property?.name as string) ?? '';

        if (
          propName === 'parse' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'Do not use v.parse() — it throws on failure, bypassing Result pattern',
            ruleId: 'valibot/no-parse',
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
