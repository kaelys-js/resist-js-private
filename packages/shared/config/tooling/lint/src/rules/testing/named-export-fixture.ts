/**
 * Rule: testing/named-export-a
 *
 * Test fixture that exports a rule via the named `rules` array export
 * to verify the rule loader handles `export { rules }` format.
 *
 * This rule is intentionally a no-op used only for loader testing.
 *
 * @module
 */

import type { TypeScriptRule, LintResult } from '@/lint/framework/types.ts';

/** Rule exported via named `rules` array — always produces zero results. */
const namedRule: TypeScriptRule = {
  id: 'testing/named-export-a',
  description: 'Named export fixture rule (no-op).',
  categories: ['testing'],
  stages: ['lint'],
  patterns: ['**/*.ts'],
  visitor: {
    Program(): LintResult[] {
      return [];
    },
  },
};

/** Named export array — the loader discovers this via `mod.rules`. */
export const rules: TypeScriptRule[] = [namedRule];
