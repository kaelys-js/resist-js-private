/**
 * Rule: directives/no-biome-ignore
 *
 * Forbids biome-ignore directives. Code should be fixed to satisfy Biome,
 * or the biome.json configuration should be updated if the rule is
 * inappropriate for this codebase.
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

/** The no-biome-ignore lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-biome-ignore',
  description: 'Forbids biome-ignore directives — fix the code or adjust biome.json',
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

        if (/biome-ignore/.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: 'Biome ignore directives are not allowed - fix the code or adjust biome.json',
            ruleId: 'directives/no-biome-ignore',
            tip: 'Fix the code to satisfy Biome, or if the rule is wrong for this codebase, update biome.json',
            fix: deleteLineFix(i, lineStarts, context.content),
          });
        }
      }

      return results;
    },
  },
};

export default rule;
