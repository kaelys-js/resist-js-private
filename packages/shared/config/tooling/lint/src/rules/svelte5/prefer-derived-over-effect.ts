/**
 * Rule: svelte5/prefer-derived-over-effect
 *
 * Catches `$effect` that only exists to set a value based on other reactive
 * state. `$derived` is more efficient and declarative.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 6
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
import { collectStateVariables, isRuneCall, getCallbackBody } from './_svelte-helpers.ts';

/** The prefer-derived-over-effect lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/prefer-derived-over-effect',
  description: '$effect that only sets a value should use $derived instead',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const stateVars: Set<string> = collectStateVariables(context.ast);
      if (stateVars.size === 0) {
        return [];
      }

      const results: LintResult[] = [];

      walkNode(context.ast, (node: AstNode): void => {
        if (!isRuneCall(node, '$effect')) {
          return;
        }

        const body: AstNode | undefined = getCallbackBody(node);
        if (!body || body.type !== 'BlockStatement') {
          return;
        }

        // Check if body has exactly one statement
        const bodyStatements: AstNode[] | undefined = body.body as AstNode[] | undefined;
        if (!bodyStatements || bodyStatements.length !== 1) {
          return;
        }

        const stmt: AstNode | undefined = bodyStatements[0];
        if (!stmt || stmt.type !== 'ExpressionStatement') {
          return;
        }

        const expr: AstNode | undefined = stmt.expression as AstNode | undefined;
        if (!expr || expr.type !== 'AssignmentExpression') {
          return;
        }

        const left: AstNode | undefined = expr.left as AstNode | undefined;
        if (!left || left.type !== 'Identifier') {
          return;
        }

        const name: string = (left as unknown as { name: string }).name;
        if (!stateVars.has(name)) {
          return;
        }

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `$effect only sets '${name}' - use $derived instead`,
          ruleId: rule.id,
          tip: `Replace with: let ${name} = $derived(...);`,
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      });

      return results;
    },
  },
};

export default rule;
