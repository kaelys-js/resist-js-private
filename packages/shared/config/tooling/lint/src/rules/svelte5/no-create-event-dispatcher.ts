/**
 * Rule: svelte5/no-create-event-dispatcher
 *
 * Catches `createEventDispatcher` import and usage. Svelte 5 uses
 * callback props instead of custom events.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 9
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-create-event-dispatcher lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-create-event-dispatcher',
  description: 'createEventDispatcher is deprecated in Svelte 5 - use callback props instead',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const source: { value?: string } | undefined = node.source as { value?: string } | undefined;

      if (!source || source.value !== 'svelte') {
        return [];
      }

      const specifiers: AstNode[] | undefined = node.specifiers as AstNode[] | undefined;

      if (!specifiers) {
        return [];
      }

      const results: LintResult[] = [];

      for (const spec of specifiers) {
        if (spec.type !== 'ImportSpecifier') {
          continue;
        }

        const imported: { name?: string } | undefined = spec.imported as
          | { name?: string }
          | undefined;

        if (imported?.name === 'createEventDispatcher') {
          /* Fix: remove specifier or entire import if it's the only one */
          let fix = { range: { start: 0, end: 0 }, text: '' };

          if (specifiers.length === 1) {
            /* Only specifier — delete entire import statement */
            const afterNode: string = context.content.slice(node.end, node.end + 2);
            const endOffset: number = afterNode.startsWith('\n') ? node.end + 1 : node.end;

            fix = { range: { start: node.start, end: endOffset }, text: '' };
          } else {
            /* Multiple specifiers — delete just this one (+ comma) */
            const afterSpec: string = context.content.slice(spec.end, spec.end + 20);
            const commaAfter: RegExpExecArray | null = /^\s*,\s*/.exec(afterSpec);

            if (commaAfter) {
              fix = {
                range: { start: spec.start, end: spec.end + commaAfter[0].length },
                text: '',
              };
            } else {
              /* Comma before the specifier */
              const beforeSpec: string = context.content.slice(
                Math.max(0, spec.start - 20),
                spec.start,
              );
              const commaBefore: RegExpExecArray | null = /,\s*$/.exec(beforeSpec);

              if (commaBefore) {
                fix = {
                  range: { start: spec.start - commaBefore[0].length, end: spec.end },
                  text: '',
                };
              }
            }
          }

          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'createEventDispatcher is deprecated in Svelte 5 - use callback props instead',
            ruleId: rule.id,
            tip: 'Accept callback props: let { oneventName } = $props(); then call oneventName?.(data);',
            fix,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
