/**
 * Rule: valibot/no-parse
 *
 * Forbids `v.parse()` calls. Use `safeParse` from `@/utils/result/safe` instead,
 * because `v.parse()` throws on validation failure, bypassing the Result pattern.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-parse lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Forbids v.parse() — use safeParse from @/utils/result/safe instead',
  id: 'valibot/no-parse',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint', 'ci'],

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
            column: node.loc.start.column + 1,
            file: context.file,
            fix: {
              range: { end: callee.end, start: callee.start },
              text: 'safeParse',
            },
            line: node.loc.start.line,
            message: 'Do not use v.parse() — it throws on failure, bypassing Result pattern',
            ruleId: 'valibot/no-parse',
            severity: 'error',
            tip: "Use safeParse from '@/utils/result/safe' instead",
          });
        }
      }

      return results;
    },
  },
};

export default rule;
