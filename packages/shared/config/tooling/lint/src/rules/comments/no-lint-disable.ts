/**
 * Rule: comments/no-lint-disable
 *
 * Forbids lint-suppression comments: eslint-disable, oxlint-ignore,
 * ts-ignore, ts-nocheck, ts-expect-error, and global declarations.
 * Exception: max-lines and max-lines-per-function disables are allowed.
 *
 * @module
 */

import {
  createResult,
  createFixableResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
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
  fixable: true,
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

          /* Compute byte range covering the full line (including trailing newline).
           * lineStarts[lineNumber - 1] is the byte offset of the line's first char.
           * lineStarts[lineNumber] is the byte offset of the NEXT line's first char.
           * If this is the last line, use content.length. */
          const lineIdx: number = lineNumber - 1;
          const lineStart: number = lineStarts[lineIdx] ?? comment.start;
          const lineEnd: number = lineStarts[lineIdx + 1] ?? context.content.length;

          const message: string = `Lint-suppression comment '${label}' is forbidden — fix the code instead`;
          const tip: string =
            'Fix the underlying issue. Add missing globals to .oxlintrc.json instead.';

          /* Partition the line around the comment. `before` is everything on the
           * line preceding the comment; `after` is everything following it (up to
           * and including the trailing newline). `commentSrc` is the comment's own
           * source — a Block comment may span multiple physical lines. */
          const before: string = context.content.slice(lineStart, comment.start);
          const after: string = context.content.slice(comment.end, lineEnd);
          const commentSrc: string = context.content.slice(comment.start, comment.end);
          const isMultiLineComment: boolean = commentSrc.includes('\n');

          if (before.trim() === '' && after.trim() === '' && !isMultiLineComment) {
            /* SAFE FULL-LINE DELETE: the comment occupies the whole line on its own
             * (only whitespace before/after) and is single-line. Removing the line
             * — including its trailing newline — preserves surrounding code. */
            results.push(
              createFixableResult(
                'comments/no-lint-disable',
                context.file,
                lineNumber,
                1,
                'error',
                message,
                {
                  tip,
                  fix: { range: { start: lineStart, end: lineEnd }, text: '' },
                },
              ),
            );
          } else if (comment.type === 'Line' && before.trim() !== '') {
            /* SAFE TRAILING STRIP: a `//` line comment trailing real code. Strip from
             * the end of the code (after trailing whitespace) through the comment's
             * end, leaving the code and the line's newline intact. A Line comment is
             * always single-line, so `comment.end` is on this same line. */
            results.push(
              createFixableResult(
                'comments/no-lint-disable',
                context.file,
                lineNumber,
                1,
                'error',
                message,
                {
                  tip,
                  fix: {
                    range: { start: lineStart + before.trimEnd().length, end: comment.end },
                    text: '',
                  },
                },
              ),
            );
          } else {
            /* NO_OP: an inline Block comment sharing a line with code, or ANY
             * multi-line block comment. No behavior-preserving single-range edit
             * exists, so detect-only (the --fix applier skips NO_OP fixes). */
            results.push(
              createResult(
                'comments/no-lint-disable',
                context.file,
                lineNumber,
                1,
                'error',
                message,
                {
                  tip,
                },
              ),
            );
          }
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
