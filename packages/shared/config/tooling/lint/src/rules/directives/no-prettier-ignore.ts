/**
 * Rule: directives/no-prettier-ignore
 *
 * Bans Prettier directives (prettier-ignore, prettier-ignore-start,
 * prettier-ignore-end) since this codebase uses Biome for formatting.
 *
 * The auto-fix deletes the entire comment line containing the directive.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { computeLineStarts } from '@/lint/framework/comment-helpers.ts';

/** Pattern to detect Prettier directives. */
const PRETTIER_DIRECTIVE_PATTERN: RegExp = /prettier-ignore(?:-start|-end)?/;

/**
 * Compute a fix that deletes an entire line given its 0-based line index.
 *
 * @param {number} lineIndex - 0-based line index
 * @param {number[]} lineStarts - Array of byte offsets for each line start
 * @param {string} content - Full source text
 * @returns {LintFix} Fix that removes the line including its trailing newline
 */
function deleteLineFix(lineIndex: number, lineStarts: number[], content: string): LintFix {
  const start: number = lineStarts[lineIndex] ?? 0;
  const end: number =
    lineIndex + 1 < lineStarts.length
      ? (lineStarts[lineIndex + 1] ?? content.length)
      : content.length;

  return { range: { start, end }, text: '' };
}

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
      const lines: string[] = context.content.split('\n');
      const lineStarts: number[] = computeLineStarts(context.content);

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        if (PRETTIER_DIRECTIVE_PATTERN.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: 'Prettier directives are not used in this codebase - remove the directive',
            ruleId: 'directives/no-prettier-ignore',
            tip: 'Remove the Prettier directive. Formatting is handled by Biome and should be consistent.',
            fix: deleteLineFix(i, lineStarts, context.content),
          });
        }
      }

      return results;
    },
  },
};

export default rule;
