/**
 * Rule: valibot/no-ignore-issues
 *
 * When using `v.safeParse()`, the `.issues` property should be checked
 * when the parse fails. Ignoring issues hides validation errors and
 * makes debugging difficult.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-ignore-issues lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'quality'],
  description: 'safeParse results should check .issues when the parse fails',
  id: 'valibot/no-ignore-issues',
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

      if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
        const object = callee.object as AstNode | undefined;
        const property = callee.property as AstNode | undefined;
        const propName: string = (property?.name as string) ?? '';

        if (
          propName === 'safeParse' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Check if .issues is referenced anywhere in the file
          if (context.content.includes('.issues')) {
            return results;
          }

          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: node.loc.start.line,
            message:
              'v.safeParse() result .issues are not checked — validation errors may be silently ignored',
            ruleId: 'valibot/no-ignore-issues',
            severity: 'info',
            tip: 'Check result.issues when result.success is false to surface validation errors',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
