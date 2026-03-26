/**
 * Rule: valibot/no-omit-pick-infer
 *
 * Don't use `Omit` or `Pick` on valibot inferred types. Use schema
 * composition (`v.omit()`, `v.pick()`) instead so the schema and type
 * stay in sync.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern that matches Omit or Pick wrapping a valibot inferred type. */
const OMIT_PICK_PATTERN: RegExp = /(?:Omit|Pick)\s*<\s*v\.(?:InferOutput|InferInput)/;

/** The no-omit-pick-infer lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Do not use Omit/Pick on valibot inferred types — use v.omit()/v.pick() instead',
  id: 'valibot/no-omit-pick-infer',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const id = node.id as AstNode | undefined;
      const typeName: string = (id?.name as string) ?? '';

      const nodeText: string = context.getNodeText(node);

      if (OMIT_PICK_PATTERN.test(nodeText)) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Type '${typeName}' uses Omit/Pick on a valibot inferred type — use v.omit()/v.pick() on the schema instead`,
          ruleId: 'valibot/no-omit-pick-infer',
          severity: 'error',
          tip: 'Use v.omit(schema, ["key"]) or v.pick(schema, ["key"]) and derive the type from the new schema',
        });
      }

      return results;
    },
  },
};

export default rule;
