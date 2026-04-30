/**
 * Rule: valibot/no-unsafe-coerce
 *
 * Bans `v.coerce()` calls. Coercion silently transforms input values
 * before validation, which can mask data issues and produce unexpected
 * results.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-unsafe-coerce lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans v.coerce() — coercion silently transforms input and can mask data issues',
  id: 'valibot/no-unsafe-coerce',
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
          propName === 'coerce' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: node.end, start: node.start }, text: '' },
            line: node.loc.start.line,
            message:
              'Do not use v.coerce() — it silently transforms input values before validation',
            ruleId: 'valibot/no-unsafe-coerce',
            severity: 'error',
            tip: 'Use v.pipe() with v.transform() for explicit, type-safe transformations instead',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
