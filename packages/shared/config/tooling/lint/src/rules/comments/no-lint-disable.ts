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
import { computeLineStarts, offsetToLineNumber } from '@/lint/framework/comment-helpers.ts';

/** Patterns to detect lint-suppression comments. */
const DISABLE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  label: string;
  blockOnly?: boolean;
}> = [
  { pattern: /eslint-disable(?:-next-line)?/, label: 'eslint-disable' },
  { pattern: /oxlint-ignore/, label: 'oxlint-ignore' },
  { pattern: /oxlint-disable/, label: 'oxlint-disable' },
  { pattern: /@ts-ignore/, label: '@ts-ignore' },
  { pattern: /@ts-nocheck/, label: '@ts-nocheck' },
  { pattern: /@ts-expect-error/, label: '@ts-expect-error' },
  { pattern: /^\s*global\s+/, label: '/* global */', blockOnly: true },
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
  optionsSchema: {
    allowedTargets: {
      type: 'array',
      items: 'string',
      description: 'Rule IDs that are allowed to be suppressed (e.g. "max-lines").',
    },
  },

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const allowedTargets: string[] = (context.ruleOptions?.allowedTargets ??
        DEFAULT_ALLOWED_TARGETS) as string[];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        for (const { pattern, label } of DISABLE_PATTERNS) {
          if (!pattern.test(comment.value)) {
            continue;
          }
          
let isAllowed: boolean = false;

          for (const target of allowedTargets) {
            if (comment.value.includes(target)) {
              isAllowed = true;
              break;
            }
          }

          if (isAllowed) {
            continue;
          }

          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push({
            file: context.file,
            line: lineNumber,
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

      return results;
    },
  },
};

/** Default allowed-target rule IDs (CLAUDE.md exempts `max-lines` family). */
const DEFAULT_ALLOWED_TARGETS: readonly string[] = ['max-lines', 'max-lines-per-function'];

export default rule;
