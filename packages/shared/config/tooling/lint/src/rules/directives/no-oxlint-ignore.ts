/**
 * Rule definition: forbid Oxlint directive comments.
 *
 * Code should be fixed to satisfy Oxlint, or the oxlint.json
 * configuration should be updated if the rule is inappropriate for
 * this codebase. Detection is AST-comment-based; the literal token
 * is built at runtime so the rule does not self-flag its own source.
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

/** Build the directive prefix at runtime so this source contains no literal occurrence. */
const OX_PREFIX: string = `${'ox'}lint${'-'}`;

/** Pattern to detect Oxlint directives in comment text (built from runtime prefix). */
const PATTERN: RegExp = new RegExp(
  `${OX_PREFIX}(?:ignore|disable)(?:-next-line)?|${OX_PREFIX}enable`,
);

/** The lint rule definition (banning Oxlint directive comments). */
const rule: TypeScriptRule = {
  id: 'directives/no-oxlint-ignore',
  description: 'Forbids Oxlint directives — fix the code or adjust oxlint.json',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        if (PATTERN.test(comment.value)) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push({
            file: context.file,
            line: lineNumber,
            column: 1,
            severity: 'error',
            message: 'Oxlint directives are not allowed - fix the code or adjust oxlint.json',
            ruleId: 'directives/no-oxlint-ignore',
            tip: 'Fix the code to satisfy Oxlint, or if the rule is wrong for this codebase, update oxlint.json',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
