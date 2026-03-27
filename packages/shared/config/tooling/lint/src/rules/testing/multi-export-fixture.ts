/**
 * Rule: testing/multi-export-a, testing/multi-export-b
 *
 * Test fixture that exports multiple rules from a single file
 * to verify the rule loader handles array default exports.
 *
 * These rules are intentionally no-ops used only for loader testing.
 *
 * @module
 */

import type { TypeScriptRule, LintResult } from '@/lint/framework/types.ts';

/** First rule in the multi-export fixture — always produces zero results. */
const ruleA: TypeScriptRule = {
  id: 'testing/multi-export-a',
  description: 'Multi-export fixture rule A (no-op).',
  categories: ['testing'],
  stages: ['lint'],
  patterns: ['**/*.ts'],
  visitor: {
    Program(): LintResult[] {
      return [];
    },
  },
};

/** Second rule in the multi-export fixture — always produces zero results. */
const ruleB: TypeScriptRule = {
  id: 'testing/multi-export-b',
  description: 'Multi-export fixture rule B (no-op).',
  categories: ['testing'],
  stages: ['lint'],
  patterns: ['**/*.ts'],
  visitor: {
    Program(): LintResult[] {
      return [];
    },
  },
};

/** Description. */
const multiExportRules = [ruleA, ruleB];
export default multiExportRules;
