/**
 * Rule: valibot/no-partial-infer
 *
 * Don't use `Partial<v.InferOutput<...>>` — use `v.partial()` on the schema
 * instead so the schema and type stay in sync.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern that matches Partial wrapping a valibot inferred type. */
const PARTIAL_PATTERN: RegExp = /Partial\s*<\s*v\.(?:InferOutput|InferInput)/;

/** The no-partial-infer lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Do not use Partial<v.InferOutput<...>> — use v.partial() on the schema instead',
  id: 'valibot/no-partial-infer',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const id = node.id as AstNode | undefined;
      const typeName: string = (id?.name as string) ?? '';

      const nodeText: string = context.getNodeText(node);

      if (PARTIAL_PATTERN.test(nodeText)) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Type '${typeName}' uses Partial on a valibot inferred type — use v.partial() on the schema instead`,
          ruleId: 'valibot/no-partial-infer',
          severity: 'error',
          tip: 'Use v.partial(schema) and derive the type from the partial schema',
        });
      }

      return results;
    },
  },
};

export default rule;
