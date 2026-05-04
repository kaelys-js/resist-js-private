/**
 * Rule: svelte5/no-reactive-class-properties
 *
 * Catches `$state()` used on class property initializers. Class instances
 * with `$state` are deeply reactive — might be unintended.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 18
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
import { isRuneCall } from './_svelte-helpers.ts';

/** The no-reactive-class-properties lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-reactive-class-properties',
  description:
    '$state in class property makes all instances deeply reactive - ensure this is intentional',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      walkNode(context.ast, (node: AstNode): void => {
        if (node.type !== 'ClassBody') {
          return;
        }

        const body: AstNode[] | undefined = node.body as AstNode[] | undefined;

        if (!body) {
          return;
        }

        for (const member of body) {
          if (member.type !== 'PropertyDefinition') {
            continue;
          }

          const value: AstNode | undefined = member.value as AstNode | undefined;

          if (!value || !isRuneCall(value, '$state')) {
            continue;
          }

          results.push({
            file: context.file,
            line: member.loc.start.line,
            column: member.loc.start.column + 1,
            severity: 'warning',
            message:
              '$state in class property makes all instances deeply reactive - ensure this is intentional',
            ruleId: rule.id,
            tip: 'Consider using plain classes with $state arrays/objects wrapping them instead',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      });

      return results;
    },
  },
};

export default rule;
