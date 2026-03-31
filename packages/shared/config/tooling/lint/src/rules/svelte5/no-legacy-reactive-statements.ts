/**
 * Rule: svelte5/no-legacy-reactive-statements
 *
 * Catches `$:` reactive statements (Svelte 4 syntax). Svelte 5 uses
 * `$derived` and `$effect` runes instead.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 2
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-legacy-reactive-statements lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-legacy-reactive-statements',
  description: "Legacy reactive statement '$:' - use $derived or $effect instead",
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    LabeledStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const label: AstNode | undefined = node.label as AstNode | undefined;
      if (!label || (label as { name?: string }).name !== '$') {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: "Legacy reactive statement '$:' - use $derived or $effect instead",
          ruleId: rule.id,
          tip: 'For computed values use $derived(), for side effects use $effect()',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
