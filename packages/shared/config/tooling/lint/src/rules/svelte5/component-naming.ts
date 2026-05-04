/**
 * Rule: svelte5/component-naming
 *
 * Catches component files not in PascalCase. SvelteKit convention files
 * (+page.svelte, +layout.svelte, etc.) are exempt.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 15
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern for valid PascalCase filenames (without extension). */
const PASCAL_CASE_RE: RegExp = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * Convert a non-PascalCase name to a suggested PascalCase name.
 *
 * @param {string} name - Original filename
 * @returns {string} Suggested PascalCase name
 */
function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map((s: string): string => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** The component-naming lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/component-naming',
  description: 'Component file should be PascalCase',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const parts: string[] = context.file.split('/');
      const filename: string = parts.at(-1) ?? '';
      const baseName: string = filename.replace(/\.svelte$/, '');

      // Exempt SvelteKit convention files
      if (baseName.startsWith('+')) {
        return [];
      }

      if (PASCAL_CASE_RE.test(baseName)) {
        return [];
      }

      const suggested: string = toPascalCase(baseName);

      return [
        {
          file: context.file,
          line: 1,
          column: 1,
          severity: 'warning',
          message: `Component file should be PascalCase: '${filename}' -> '${suggested}.svelte'`,
          ruleId: rule.id,
          tip: `Rename to ${suggested}.svelte`,
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
