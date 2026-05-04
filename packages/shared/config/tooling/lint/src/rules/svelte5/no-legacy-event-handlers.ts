/**
 * Rule: svelte5/no-legacy-event-handlers
 *
 * Catches `on:event` directive syntax (Svelte 4). Svelte 5 uses
 * `onevent` attribute syntax instead.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 8
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-legacy-event-handlers lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-legacy-event-handlers',
  description: "Legacy event handler 'on:event' - use 'onevent' attribute instead",
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  fixable: true,

  visitor: {
    OnDirective(node: AstNode, context: VisitorContext): LintResult[] {
      const eventName: string = (node as { name?: string }).name ?? 'unknown';

      /* Fix: remove the colon from on:event → onevent (only if no modifiers) */
      const modifiers: string[] | undefined = (node as { modifiers?: string[] }).modifiers;
      const hasModifiers: boolean = Array.isArray(modifiers) && modifiers.length > 0;

      let fix = { range: { start: 0, end: 0 }, text: '' };

      if (!hasModifiers) {
        /* The source text starts with "on:" at node.start — remove the colon at offset +2 */
        fix = { range: { start: node.start + 2, end: node.start + 3 }, text: '' };
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Legacy event handler 'on:${eventName}' - use 'on${eventName}' attribute instead`,
          ruleId: rule.id,
          tip: `Replace on:${eventName} with on${eventName}. For modifiers like |preventDefault, call e.preventDefault() in handler.`,
          fix,
        },
      ];
    },
  },
};

export default rule;
