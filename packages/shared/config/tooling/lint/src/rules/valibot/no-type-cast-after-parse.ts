/**
 * Rule: valibot/no-type-cast-after-parse
 *
 * Bans `as` type assertions on parse or safeParse results. Casting after
 * parsing defeats the purpose of schema validation — the schema already
 * guarantees the type.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-type-cast-after-parse lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans `as` casts on parse/safeParse results — schema already guarantees the type',
  id: 'valibot/no-type-cast-after-parse',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Skip `as const` — that is a const assertion, not a type cast
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (typeAnnotation?.type === 'TSTypeReference') {
        const typeName = typeAnnotation.typeName as AstNode | undefined;
        if ((typeName?.name as string) === 'const') {
          return results;
        }
      }

      // Check if the expression being cast contains parse or safeParse
      const expression = node.expression as AstNode | undefined;
      if (!expression) {
        return results;
      }

      if (
        context.content.slice(expression.start, expression.end).includes('parse') ||
        context.content.slice(expression.start, expression.end).includes('safeParse')
      ) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.end, start: expression.end }, text: '' },
          line: node.loc.start.line,
          message:
            'Do not cast parse/safeParse results with `as` — the schema already guarantees the type',
          ruleId: 'valibot/no-type-cast-after-parse',
          severity: 'error',
          tip: 'Remove the `as` cast and let the schema type flow through',
        });
      }

      return results;
    },
  },
};

export default rule;
