/**
 * Rule: directives/max-suppressions-per-file
 *
 * Warns when a file contains more than 3 TS suppression directives.
 * Too many suppressions indicate deeper type issues that should be
 * addressed through proper refactoring rather than suppression.
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

/** Maximum allowed directives per file before warning. */
const MAX_PER_FILE: number = 3;

/** The max-suppressions-per-file lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/max-suppressions-per-file',
  description: `Warns when a file has more than ${MAX_PER_FILE} TS suppression directives`,
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const lineStarts: number[] = computeLineStarts(context.content);
      let count: number = 0;
      let lastOccurrenceLine: number = 0;

      for (const comment of context.comments) {
        if (comment.value.includes(DIRECTIVE)) {
          count++;
          lastOccurrenceLine = offsetToLineNumber(comment.start, lineStarts);
        }
      }

      if (count > MAX_PER_FILE) {
        return [
          {
            file: context.file,
            line: lastOccurrenceLine,
            column: 1,
            severity: 'warning',
            message: `File has ${count} ${DIRECTIVE} directives (max: ${MAX_PER_FILE}) - refactor to reduce suppressions`,
            ruleId: 'directives/max-suppressions-per-file',
            tip: 'Too many suppressions indicate deeper issues. Fix types, add proper definitions, or refactor.',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
