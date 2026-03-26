/**
 * Rule: package/require-project-test
 *
 * Test scripts must use pnpm -w exec vitest run --project, not bare vitest run.
 * Exempts root package.json and packages with their own vitest.config.ts.
 *
 * @module
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};
/** Known test-related script names. */
const TEST_SCRIPTS: readonly string[] = [
  'qa:test',
  'qa:test:unit',
  'qa:test:coverage',
  'qa:benchmark',
];

/** The require-project-test lint rule. */
const rule: PackageJsonRule = {
  id: 'package/require-project-test',
  description: 'Test scripts must use pnpm -w exec vitest run --project <name>',
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) {
      return results;
    }
    const dir: string = dirname(context.file);
    if (existsSync(join(dir, 'vitest.config.ts'))) {
      return results;
    }
    const scripts: Record<string, string> = context.pkg.scripts ?? {};
    for (const key of TEST_SCRIPTS) {
      const script: string | undefined = scripts[key];
      if (!script) {
        continue;
      }
      if (script === 'vitest run' || script === 'vitest bench' || script.includes('cd ..')) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `'${key}' uses bare vitest — use 'pnpm -w exec vitest run --project <name>'`,
          ruleId: 'package/require-project-test',
          tip: 'Use pnpm -w exec to run from workspace root with the correct project filter',
          fix: NO_FIX,
        });
      }
    }
    return results;
  },
};
export default rule;
