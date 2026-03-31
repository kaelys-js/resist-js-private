/**
 * Rule: svelte5/no-effect-mutation
 *
 * Catches unguarded mutation of `$state` variables inside `$effect`, which
 * can cause infinite loops (effect runs -> mutates state -> triggers effect).
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 5
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
import {
  collectStateVariables,
  isRuneCall,
  getCallbackBody,
  findAssignmentTargets,
  isInsideConditional,
} from './_svelte-helpers.ts';

/** The no-effect-mutation lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-effect-mutation',
  description: 'Unguarded $state mutation inside $effect may cause infinite loop',
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
        if (!body) {
          return;
        }

        const targets: Array<{ name: string; node: AstNode }> = findAssignmentTargets(body);

        for (const target of targets) {
          if (!stateVars.has(target.name)) {
            continue;
          }

          if (isInsideConditional(target.node, body)) {
            continue;
          }

          results.push({
            file: context.file,
            line: target.node.loc.start.line,
            column: target.node.loc.start.column + 1,
            severity: 'error',
            message: `Unguarded mutation of '$state' variable '${target.name}' inside $effect may cause infinite loop`,
            ruleId: rule.id,
            tip: `Wrap mutation in a conditional: if (condition) { ${target.name} = newValue; }`,
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      });

      return results;
    },
  },
};

export default rule;
