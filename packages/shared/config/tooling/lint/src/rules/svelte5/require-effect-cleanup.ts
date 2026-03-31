/**
 * Rule: svelte5/require-effect-cleanup
 *
 * Catches `$effect` containing event listeners, subscriptions, or timers
 * without a cleanup return function. Prevents memory leaks.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 4
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import {
  isRuneCall,
  getCallbackBody,
  findSubscriptionPatterns,
  hasCleanupReturn,
} from './_svelte-helpers.ts';

/** The require-effect-cleanup lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/require-effect-cleanup',
  description: '$effect with subscriptions/timers must return a cleanup function',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      if (!isRuneCall(node, '$effect')) {
        return [];
      }

      const body: AstNode | undefined = getCallbackBody(node);
      if (!body || body.type !== 'BlockStatement') {
        return [];
      }

      const subscriptions: string[] = findSubscriptionPatterns(body);
      if (subscriptions.length === 0) {
        return [];
      }

      if (hasCleanupReturn(body, subscriptions)) {
        return [];
      }

      const results: LintResult[] = [];
      for (const pattern of subscriptions) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `$effect contains '${pattern}' but no cleanup function returned`,
          ruleId: rule.id,
          tip: 'Return a cleanup function: $effect(() => { ... return () => cleanup(); });',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
