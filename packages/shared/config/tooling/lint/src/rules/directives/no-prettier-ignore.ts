/**
 * Rule: directives/no-prettier-ignore
 *
 * Bans Prettier directives (prettier-ignore, prettier-ignore-start,
 * prettier-ignore-end) since this codebase uses Biome for formatting.
 *
 * Detection is AST-comment-based (iterates `context.comments`), so the
 * directive token inside a string literal or RegExp source does not
 * false-trigger. The auto-fix deletes the whole comment line only when
 * the comment is alone on its line; for an inline comment it deletes only
 * the comment span so the preceding code is preserved. Multi-line block
 * comments whose directive is interleaved with other text emit no fix.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintFix,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import {
  computeLineStarts,
  deleteCommentLineFix,
  offsetToLineNumber,
} from '@/lint/framework/comment-helpers.ts';

/** Pattern to detect Prettier directives in comment text. */
const PRETTIER_DIRECTIVE_PATTERN: RegExp = /prettier-ignore(?:-start|-end)?/;

/** The no-prettier-ignore lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-prettier-ignore',
  description: 'Bans Prettier directives — formatting is handled by Biome',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const { content }: { content: string } = context;
      const lineStarts: number[] = computeLineStarts(content);

      for (const comment of context.comments) {
        if (!PRETTIER_DIRECTIVE_PATTERN.test(comment.value)) {
          continue;
        }

        const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
        /* A multi-line block comment whose directive is interleaved with other
         * comment text cannot be safely whole-line-deleted or span-deleted
         * without corrupting the remaining comment — report without a fix. */
        const isMultiLine: boolean = content.slice(comment.start, comment.end).includes('\n');
        const fix: LintFix = isMultiLine
          ? NO_OP_FIX
          : deleteCommentLineFix(comment.start, comment.end, lineStarts, content);

        results.push({
          file: context.file,
          line: lineNumber,
          column: 1,
          severity: 'error',
          message: 'Prettier directives are not used in this codebase - remove the directive',
          ruleId: 'directives/no-prettier-ignore',
          tip: 'Remove the Prettier directive. Formatting is handled by Biome and should be consistent.',
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
