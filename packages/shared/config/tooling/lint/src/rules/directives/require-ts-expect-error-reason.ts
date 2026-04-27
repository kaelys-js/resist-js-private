/**
 * Rule: directives/require-ts-expect-error-reason
 *
 * Requires TypeScript suppression directives to include a meaningful
 * explanation. The explanation must follow the pattern:
 *   // [DIRECTIVE] - [reason]
 * (single or double dash) where [reason] is at least 10 characters long.
 *
 * The literal directive token is built at runtime to avoid the rule
 * self-flagging its own JSDoc/source.
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

/** Build the directive token at runtime so this source contains no literal occurrence. */
const DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

/** Pattern to detect the directive in comment text. */
const DIRECTIVE_PATTERN: RegExp = new RegExp(DIRECTIVE);

/** Pattern to detect the directive with a valid reason (dash separator + 10+ chars). */
const DIRECTIVE_WITH_REASON: RegExp = new RegExp(`${DIRECTIVE}\\s+-{1,2}\\s+.{10,}`);

/** The require-ts-expect-error-reason lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/require-ts-expect-error-reason',
  description:
    'Requires TS suppression directives to include an explanation of at least 10 characters',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        if (DIRECTIVE_PATTERN.test(comment.value) && !DIRECTIVE_WITH_REASON.test(comment.value)) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push({
            file: context.file,
            line: lineNumber,
            column: 1,
            severity: 'error',
            message: `${DIRECTIVE} requires explanation: // ${DIRECTIVE} - [reason]`,
            ruleId: 'directives/require-ts-expect-error-reason',
            tip: `Add explanation: // ${DIRECTIVE} - [why this suppression is needed]`,
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
