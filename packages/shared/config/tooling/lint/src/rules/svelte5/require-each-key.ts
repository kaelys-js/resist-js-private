/**
 * Rule: svelte5/require-each-key
 *
 * Catches `{#each}` blocks without a keyed expression. Keys prevent bugs
 * with list reordering, animations, and component state.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 17
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The require-each-key lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/require-each-key',
  description: '{#each} block should have a key expression for stable identity',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    EachBlock(node: AstNode, context: VisitorContext): LintResult[] {
      const { key } = node;

      if (key !== null && key !== undefined) {
        return [];
      }

      /* Fix: insert (iterVar) as key for simple Identifier context */
      let fix = { range: { start: 0, end: 0 }, text: '' };
      const contextNode: AstNode | undefined = node.context as AstNode | undefined;

      if (contextNode?.type === 'Identifier') {
        const iterName: string = (contextNode as unknown as { name: string }).name;

        fix = {
          range: { start: contextNode.end, end: contextNode.end },
          text: ` (${iterName})`,
        };
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: '{#each} block should have a key expression for stable identity',
          ruleId: rule.id,
          tip: 'Add key: {#each items as item (item.id)}',
          fix,
        },
      ];
    },
  },
};

export default rule;
