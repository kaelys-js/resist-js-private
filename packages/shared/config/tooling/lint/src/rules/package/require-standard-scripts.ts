/**
 * Rule: package/require-standard-scripts
 *
 * Every sub-package must have: clean, qa:test, qa:test:coverage, qa:benchmark.
 * Exempts workspace root.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import {
  NO_FIX,
  readContent,
  buildInsertJsonEntryFix,
  deriveVitestProjectName,
} from '@/lint/rules/package/_json-fix-helpers.ts';

/** Scripts every sub-package must define. */
const REQUIRED_SCRIPTS: readonly string[] = [
  'clean',
  'qa:test',
  'qa:test:coverage',
  'qa:benchmark',
];

/** The require-standard-scripts lint rule. */
const rule: PackageJsonRule = {
  id: 'package/require-standard-scripts',
  description: 'Sub-packages must have all standard scripts',
  categories: ['package', 'scripts'],
  stages: ['lint', 'ci'],
  fixable: true,
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    if (context.isRoot) {
      return results;
    }

    const name: string = context.pkg.name ?? '<unnamed>';

    if (name.startsWith('@{')) {
      return results;
    } // Template packages
    if (name === '@/products') {
      return results;
    } // Directory grouping
    if (name === '@/test-presets') {
      return results;
    } // Test infrastructure
    if (name.includes('vscode')) {
      return results;
    } // VS Code extensions

    const scripts: Record<string, string> = context.pkg.scripts ?? {};
    const projectName: string = deriveVitestProjectName(context.file);
    let content: string | undefined;

    /** Default values for each required script, keyed by script name. */
    const defaults: Record<string, string> = {
      clean: 'rm -rf dist',
      'qa:test': projectName ? `pnpm -w exec vitest run --project ${projectName}` : '',
      'qa:test:coverage': projectName
        ? `pnpm -w exec vitest run --project ${projectName} --coverage`
        : '',
      'qa:benchmark': projectName ? `pnpm -w exec vitest bench --project ${projectName}` : '',
    };

    for (const required of REQUIRED_SCRIPTS) {
      if (!scripts[required]) {
        let fix = NO_FIX;
        const defaultValue: string = defaults[required] ?? '';

        if (defaultValue && context.pkg.scripts !== undefined) {
          if (content === undefined) {
            content = readContent(context.file);
          }

          fix = buildInsertJsonEntryFix(content, required, defaultValue, 'scripts');
        }

        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `Missing required script '${required}' in package '${name}'`,
          ruleId: 'package/require-standard-scripts',
          tip: `Add "${required}" to scripts in package.json`,
          fix,
        });
      }
    }
    return results;
  },
};
export default rule;
