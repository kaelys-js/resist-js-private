/**
 * Rule: imports/no-raw-node-imports
 *
 * Forbids direct `node:*` imports when shared utilities at `@/utils/core`
 * provide type-safe, Result-returning alternatives.
 *
 * Exempts:
 * - Type-only imports (`import type { ... }`)
 * - Files in `utils/core/src/` (the utility layer itself)
 * - Files in `config/tooling/lint/` (linter can't depend on utils)
 * - Files in `config/test/` (test infrastructure)
 * - Test files (`*.test.ts`)
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Map of node:* modules to their shared utility alternatives. */
const ALTERNATIVES: Record<string, string> = {
  'node:fs': '@/utils/core/fs',
  'node:child_process': '@/utils/core/shell',
  'node:path': '@/utils/core/path',
  'node:os': '@/utils/core/environment',
  'node:net': '@/utils/core/network',
  'node:url': '@/utils/core/path',
  'node:crypto': '@/utils/core (no direct alternative — consider adding one)',
  'node:async_hooks': '@/utils/core/logger',
};

/** File path patterns that are exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /utils\/core\/src\//,
  /config\/tooling\/lint\//,
  /config\/test\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/**
 * Check whether a file is exempt from this rule.
 *
 * @param {string} filePath - The file path to check
 * @returns {boolean} Whether the file is exempt
 */
function isExempt(filePath: string): boolean {
  return EXEMPT_PATTERNS.some((pattern: RegExp): boolean => pattern.test(filePath));
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'imports/no-raw-node-imports',
  description: 'Use @/utils/core shared utilities instead of raw node:* imports',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['imports', 'safety'],
  stages: ['lint', 'ci'],

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Skip exempt files
      if (isExempt(context.file)) {
        return results;
      }

      // Skip type-only imports
      const importKind = node.importKind as string | undefined;
      if (importKind === 'type') {
        return results;
      }

      const source = node.source as AstNode | undefined;
      const value: string | undefined = (source as { value?: string } | undefined)?.value;
      if (!value) {
        return results;
      }

      // Only flag node:* imports
      if (!value.startsWith('node:')) {
        return results;
      }

      const alternative: string = ALTERNATIVES[value] ?? '@/utils/core';

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Direct '${value}' import — use shared utilities instead`,
        ruleId: 'imports/no-raw-node-imports',
        tip: `Use ${alternative} which provides type-safe, Result-returning alternatives`,
        fix: { range: { start: node.start, end: node.end }, text: '' },
      });

      return results;
    },
  },
};

export default rule;
