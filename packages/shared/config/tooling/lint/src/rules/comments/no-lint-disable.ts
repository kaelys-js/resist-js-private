/**
 * Rule: comments/no-lint-disable
 *
 * Forbids lint-suppression comments: eslint-disable, oxlint-ignore,
 * ts-ignore, ts-nocheck, ts-expect-error, and global declarations.
 * Exception: max-lines and max-lines-per-function disables are allowed.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Patterns to detect lint-suppression comments. */
const DISABLE_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /eslint-disable(?:-next-line)?/, label: 'eslint-disable' },
  { pattern: /oxlint-ignore/, label: 'oxlint-ignore' },
  { pattern: /oxlint-disable/, label: 'oxlint-disable' },
  { pattern: /@ts-ignore/, label: '@ts-ignore' },
  { pattern: /@ts-nocheck/, label: '@ts-nocheck' },
  { pattern: /@ts-expect-error/, label: '@ts-expect-error' },
  { pattern: /\/\*\s*global\s+/, label: '/* global */' },
];

/** The no-lint-disable lint rule. */
const rule: TypeScriptRule = {
  id: 'comments/no-lint-disable',
  description:
    'Forbids lint-suppression comments (eslint-disable, oxlint-ignore, @ts-ignore, etc.)',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['comments', 'hygiene'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const allowedTargets = (context.ruleOptions?.allowedTargets ?? []) as string[];
      const lines: string[] = context.content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        for (const { pattern, label } of DISABLE_PATTERNS) {
          if (
            pattern.test(line) &&
            !allowedTargets.some((target: string): boolean => line.includes(target))
          ) {
            results.push({
              file: context.file,
              line: i + 1,
              column: 1,
              severity: 'error',
              message: `Lint-suppression comment '${label}' is forbidden — fix the code instead`,
              ruleId: 'comments/no-lint-disable',
              tip: 'Fix the underlying issue. Add missing globals to .oxlintrc.json instead.',
              fix: { range: { start: 0, end: 0 }, text: '' },
            });
            break;
          }
        }
      }

      return results;
    },
  },
};

export default rule;
