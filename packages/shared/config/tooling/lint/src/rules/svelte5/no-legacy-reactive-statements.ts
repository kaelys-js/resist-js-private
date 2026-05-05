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

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-legacy-reactive-statements lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-legacy-reactive-statements',
  description: "Legacy reactive statement '$:' - use $derived or $effect instead",
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    LabeledStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const label: AstNode | undefined = node.label as AstNode | undefined;

      if (!label || (label as { name?: string }).name !== '$') {
        return [];
      }

      /* Fix: convert $: to $derived or $effect based on body structure */
      const body: AstNode | undefined = node.body as AstNode | undefined;
      let fix = NO_OP_FIX;

      if (body?.type === 'ExpressionStatement') {
        const expr: AstNode | undefined = (body as { expression?: AstNode }).expression;

        if (expr?.type === 'AssignmentExpression') {
          /* $: x = expr → let x = $derived(expr) */
          const left: AstNode | undefined = expr.left as AstNode | undefined;
          const right: AstNode | undefined = expr.right as AstNode | undefined;

          if (left && right) {
            const varName: string = context.content.slice(left.start, left.end);
            const exprText: string = context.content.slice(right.start, right.end);

            fix = {
              range: { start: node.start, end: node.end },
              text: `let ${varName} = $derived(${exprText})`,
            };
          }
        } else if (expr) {
          /* $: sideEffect → $effect(() => { sideEffect; }) */
          const exprText: string = context.content.slice(expr.start, expr.end);

          fix = {
            range: { start: node.start, end: node.end },
            text: `$effect(() => { ${exprText}; })`,
          };
        }
      } else if (body?.type === 'BlockStatement') {
        /* $: { ... } → $effect(() => { ... }) */
        const blockText: string = context.content.slice(body.start, body.end);

        fix = {
          range: { start: node.start, end: node.end },
          text: `$effect(() => ${blockText})`,
        };
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
          fix,
        },
      ];
    },
  },
};

export default rule;
