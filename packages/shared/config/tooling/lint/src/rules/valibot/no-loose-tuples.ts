/**
 * Rule: valibot/no-loose-tuples
 *
 * Enforces `v.strictTuple()` over `v.tuple()`. Loose tuples silently
 * ignore extra items, defeating schema safety.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-loose-tuples lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Enforces v.strictTuple() over v.tuple()',
  id: 'valibot/no-loose-tuples',
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
          propName === 'tuple' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: {
              range: { end: property?.end ?? 0, start: property?.start ?? 0 },
              text: 'strictTuple',
            },
            line: node.loc.start.line,
            message: 'Use v.strictTuple() instead of v.tuple() — v.tuple() ignores extra items',
            ruleId: 'valibot/no-loose-tuples',
            severity: 'error',
            tip: 'Replace v.tuple() with v.strictTuple()',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
