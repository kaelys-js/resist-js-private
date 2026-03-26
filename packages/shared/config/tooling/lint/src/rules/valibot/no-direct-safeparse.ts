/**
 * Rule: valibot/no-direct-safeparse
 *
 * Forbids `v.safeParse()` calls. Use `safeParse` from `@/utils/result/safe`
 * instead, which returns `Result<T>` rather than Valibot's native format.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-direct-safeparse lint rule. */
const rule: TypeScriptRule = {
  id: 'valibot/no-direct-safeparse',
  description: 'Forbids v.safeParse() — use safeParse from @/utils/result/safe instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

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
          propName === 'safeParse' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Exempt v.safeParse() inside v.check/v.transform/v.rawCheck callbacks
          // These are valibot pipeline stages where v.safeParse is correct (returns boolean-compatible)
          const beforeCall: string = context.content.slice(
            Math.max(0, node.start - 500),
            node.start,
          );
          const lastCallback: number = Math.max(
            beforeCall.lastIndexOf('v.check('),
            beforeCall.lastIndexOf('v.transform('),
            beforeCall.lastIndexOf('v.rawCheck('),
          );

          if (lastCallback !== -1) {
            const afterCallback: string = beforeCall.slice(lastCallback);
            let depth: number = 0;

            for (const ch of afterCallback) {
              if (ch === '(') {
                depth++;
              }
              if (ch === ')') {
                depth--;
              }
            }

            if (depth > 0) {
              return results;
            } // inside callback — exempt
          }

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
