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

  visitor: {
    EachBlock(node: AstNode, context: VisitorContext): LintResult[] {
      const key: unknown = node.key;

      if (key !== null && key !== undefined) {
        return [];
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
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
