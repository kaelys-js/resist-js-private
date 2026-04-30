/**
 * Rule: svelte5/no-state-in-module-context
 *
 * Catches `$state()` used in `<script context="module">` or `<script module>`.
 * Module-level state is shared across ALL component instances — usually a bug.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 14
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkNode } from '@/lint/framework/oxc-runner.ts';
import { getModuleScriptRange, isRuneCall } from './_svelte-helpers.ts';

/** The no-state-in-module-context lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-state-in-module-context',
  description: '$state in module context creates shared state across all component instances',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const fileContent: string = context.originalContent ?? context.content;
      const moduleRange: { startLine: number; endLine: number } | null =
        getModuleScriptRange(fileContent);

      if (!moduleRange) {
        return [];
      }

      const results: LintResult[] = [];

      walkNode(context.ast, (node: AstNode): void => {
        if (!isRuneCall(node, '$state')) {
          return;
        }

        const { line } = node.loc.start;

        if (line >= moduleRange.startLine && line <= moduleRange.endLine) {
          results.push({
            file: context.file,
            line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: '$state in module context creates shared state across all component instances',
            ruleId: rule.id,
            tip: 'Move $state to instance script, or use regular variable if shared state is intentional',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      });

      return results;
    },
  },
};

export default rule;
