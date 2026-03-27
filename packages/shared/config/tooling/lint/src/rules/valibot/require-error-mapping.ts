/**
 * Rule: valibot/require-error-mapping
 *
 * Suggests using `mapIssues()` after `safeParse` failures. When safeParse
 * results are used, the issues should be mapped to user-friendly error
 * messages rather than exposing raw Valibot issue objects.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The require-error-mapping lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'documentation'],
  description: 'Use mapIssues() after safeParse failures for user-friendly errors',
  id: 'valibot/require-error-mapping',
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

      // Check for safeParse calls (both v.safeParse and imported safeParse)
      let isSafeParse: boolean = false;

      if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
        const property = callee.property as AstNode | undefined;
        const propName: string = (property?.name as string) ?? '';
        if (propName === 'safeParse') {
          isSafeParse = true;
        }
      }
      if (callee.type === 'Identifier') {
        const calleeName: string = (callee.name as string) ?? '';
        if (calleeName === 'safeParse') {
          isSafeParse = true;
        }
      }

      if (!isSafeParse) {
        return results;
      }

      // Check surrounding context for mapIssues usage
      if (
        !context.content
          .slice(node.end, Math.min(node.end + 500, context.content.length))
          .includes('mapIssues') &&
        !context.content
          .slice(node.end, Math.min(node.end + 500, context.content.length))
          .includes('flatten')
      ) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: node.loc.start.line,
          message: 'safeParse result should use mapIssues() or flatten() for user-friendly errors',
          ruleId: 'valibot/require-error-mapping',
          severity: 'info',
          tip: 'Map validation issues to user-friendly messages instead of exposing raw Valibot issues',
        });
      }

      return results;
    },
  },
};

export default rule;
