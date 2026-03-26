/**
 * Rule: valibot/revalidate-on-change
 *
 * When a file uses `safeParse` and also contains direct property
 * assignment on parsed results, the data should be re-validated.
 * This is a heuristic check — it flags files that parse data and
 * then mutate it without re-validating.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Patterns that indicate mutation of parsed data. */
const MUTATION_PATTERNS: readonly RegExp[] = [
  /\.data\.\w+\s*=/,
  /\.output\.\w+\s*=/,
  /parsed\.\w+\s*=/,
];

/** The revalidate-on-change lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'quality'],
  description: 'Data modified after parsing should be re-validated',
  id: 'valibot/revalidate-on-change',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Only check files that use safeParse
      if (!context.content.includes('safeParse')) {
        return results;
      }

      // Check for mutation patterns
      const hasMutation: boolean = MUTATION_PATTERNS.some((pattern: RegExp): boolean =>
        pattern.test(context.content),
      );

      if (!hasMutation) {
        return results;
      }

      // Count how many times safeParse appears — if only once and there is mutation, warn
      const parseCount: number = (context.content.match(/safeParse/g) ?? []).length;
      if (parseCount >= 2) {
        return results;
      }

      results.push({
        column: 1,
        file: context.file,
        fix: { range: { end: 0, start: 0 }, text: '' },
        line: node.loc.start.line,
        message:
          'Parsed data is modified but not re-validated — re-parse after mutation to maintain schema guarantees',
        ruleId: 'valibot/revalidate-on-change',
        severity: 'info',
        tip: 'Call safeParse again after modifying parsed data to ensure it still conforms to the schema',
      });

      return results;
    },
  },
};

export default rule;
