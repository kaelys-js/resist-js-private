/**
 * Rule: directives/no-oxlint-ignore
 *
 * Forbids oxlint directives (oxlint-ignore, oxlint-disable,
 * oxlint-disable-next-line, oxlint-enable). Code should be fixed to
 * satisfy Oxlint, or the oxlint.json configuration should be updated
 * if the rule is inappropriate for this codebase.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-oxlint-ignore lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-oxlint-ignore',
  description: 'Forbids oxlint directives — fix the code or adjust oxlint.json',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lines: string[] = context.content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        if (/oxlint-(?:ignore|disable)(?:-next-line)?|oxlint-enable/.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
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
