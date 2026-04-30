/**
 * Rule: svelte5/no-rest-props-misuse
 *
 * Catches `$$restProps` or `$$props` usage. Svelte 5 uses rest
 * destructuring with `$props()` instead.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 12
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern matching $$restProps or $$props usage. */
const LEGACY_PROPS_RE: RegExp = /\$\$(restP|p)rops/g;

/** The no-rest-props-misuse lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-rest-props-misuse',
  description: '$$restProps is deprecated in Svelte 5 - use rest destructuring with $props()',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lines: string[] = context.content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';
        LEGACY_PROPS_RE.lastIndex = 0;

        let match: RegExpExecArray | null = LEGACY_PROPS_RE.exec(line);

        while (match) {
          const [matched] = match;
          const isRestProps: boolean = matched === '$$restProps';

          results.push({
            file: context.file,
            line: i + 1,
            column: match.index + 1,
            severity: 'error',
            message: isRestProps
              ? '$$restProps is deprecated in Svelte 5 - use rest destructuring with $props()'
              : '$$props is deprecated in Svelte 5 - use $props() destructuring',
            ruleId: rule.id,
            tip: 'Use: let { knownProp, ...rest } = $props(); then {...rest}',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });

          match = LEGACY_PROPS_RE.exec(line);
        }
      }

      return results;
    },
  },
};

export default rule;
