/**
 * Rule: directives/no-biome-ignore
 *
 * Forbids biome-ignore directives. Code should be fixed to satisfy Biome,
 * or the biome.json configuration should be updated if the rule is
 * inappropriate for this codebase.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-biome-ignore lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-biome-ignore',
  description: 'Forbids biome-ignore directives — fix the code or adjust biome.json',
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

        if (/biome-ignore/.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: 'Biome ignore directives are not allowed - fix the code or adjust biome.json',
            ruleId: 'directives/no-biome-ignore',
            tip: 'Fix the code to satisfy Biome, or if the rule is wrong for this codebase, update biome.json',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
