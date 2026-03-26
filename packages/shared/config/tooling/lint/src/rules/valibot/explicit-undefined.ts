/**
 * Rule: valibot/explicit-undefined
 *
 * Optional fields should provide a default value or be explicit about
 * undefined. `v.optional(schema)` without a default means the field
 * can be `undefined`, which may cause runtime issues downstream.
 * Prefer `v.optional(schema, defaultValue)`.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The explicit-undefined lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description:
    'Optional fields should provide a default value — prefer v.optional(schema, default)',
  id: 'valibot/explicit-undefined',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return results;
      }

      if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
        return results;
      }

      const object = callee.object as AstNode | undefined;
      const property = callee.property as AstNode | undefined;
      const propName: string = (property?.name as string) ?? '';

      // Only flag v.optional(), not v.nullable() or v.nullish()
      if (propName !== 'optional') {
        return results;
      }
      if (!context.isImportedFrom((object?.name as string) ?? '', 'valibot')) {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args) {
        return results;
      }

      // v.optional(schema) with only 1 argument — no default value
      if (args.length === 1) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.end - 1, start: node.end - 1 }, text: ', undefined' },
          line: node.loc.start.line,
          message: 'v.optional() without a default value — consider providing a default',
          ruleId: 'valibot/explicit-undefined',
          severity: 'info',
          tip: 'Use v.optional(schema, defaultValue) to provide a default, or v.optional(schema, undefined) to be explicit about undefined',
        });
      }

      return results;
    },
  },
};

export default rule;
