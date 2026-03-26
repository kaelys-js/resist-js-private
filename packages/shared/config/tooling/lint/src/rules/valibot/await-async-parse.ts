/**
 * Rule: valibot/await-async-parse
 *
 * Bans unwaited `v.parseAsync()` or `v.safeParseAsync()` calls. Async parse
 * calls must be awaited to ensure validation completes before the result
 * is used.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Async parse method names that must be awaited. */
const ASYNC_PARSE_METHODS: ReadonlySet<string> = new Set(['parseAsync', 'safeParseAsync']);

/** The await-async-parse lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Async parse calls (parseAsync, safeParseAsync) must be awaited',
  id: 'valibot/await-async-parse',
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
          ASYNC_PARSE_METHODS.has(propName) &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Check if the call is awaited by examining content before the node
          const beforeCall: string = context.content.slice(
            Math.max(0, node.start - 50),
            node.start,
          );
          const trimmed: string = beforeCall.trimEnd();

          if (trimmed.endsWith('await')) {
            return results;
          }

          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: {
              range: { end: node.start, start: node.start },
              text: 'await ',
            },
            line: node.loc.start.line,
            message: `v.${propName}() must be awaited — unawaited async parse returns a Promise, not the result`,
            ruleId: 'valibot/await-async-parse',
            severity: 'warning',
            tip: `Add 'await' before v.${propName}()`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
