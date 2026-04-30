/**
 * Rule: valibot/no-any-schema
 *
 * Bans `v.any()` and `v.unknown()` schema calls. These defeat the purpose
 * of schema validation by accepting all values without type checking.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Method names that represent untyped schemas. */
const BANNED_METHODS: ReadonlySet<string> = new Set(['any', 'unknown']);

/** The no-any-schema lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans v.any() and v.unknown() — use a specific schema type instead',
  id: 'valibot/no-any-schema',
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
          BANNED_METHODS.has(propName) &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: {
              range: { end: property?.end ?? 0, start: property?.start ?? 0 },
              text: 'string',
            },
            line: node.loc.start.line,
            message: `Do not use v.${propName}() — use a specific schema type instead`,
            ruleId: 'valibot/no-any-schema',
            severity: 'error',
            tip: 'Replace with a specific schema like v.string(), v.number(), v.strictObject(), etc.',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
