/**
 * Rule: svelte5/no-legacy-slots
 *
 * Catches `<slot>` elements and `$$slots` usage. Svelte 5 uses
 * snippets and `{@render}` for composition instead.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 10
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

/** The no-legacy-slots lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-legacy-slots',
  description: '<slot> is deprecated in Svelte 5 - use snippets with {@render}',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    SlotElement(node: AstNode, context: VisitorContext): LintResult[] {
      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: '<slot> is deprecated in Svelte 5 - use snippets with {@render}',
          ruleId: rule.id,
          tip: 'Accept snippet props and render with {@render snippetName?.()}',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },

    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      walkNode(context.ast, (node: AstNode): void => {
        if (node.type !== 'Identifier') {
          return;
        }

        const { name } = node as { name?: string };
        if (name !== '$$slots') {
          return;
        }

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: '$$slots is deprecated in Svelte 5 - check snippet props directly',
          ruleId: rule.id,
          tip: 'Accept snippet props and render with {@render snippetName?.()}',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      });

      return results;
    },
  },
};

export default rule;
