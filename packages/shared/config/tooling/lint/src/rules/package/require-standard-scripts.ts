/**
 * Rule: package/require-standard-scripts
 *
 * Every sub-package must have: clean, qa:test, qa:test:coverage, qa:benchmark, qa:type-check.
 * Exempts workspace root.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};
/** Scripts every sub-package must define. */
const REQUIRED_SCRIPTS: readonly string[] = [
  'clean',
  'qa:test',
  'qa:test:coverage',
  'qa:benchmark',
  'qa:type-check',
];

/** The require-standard-scripts lint rule. */
const rule: PackageJsonRule = {
  id: 'package/require-standard-scripts',
  description: 'Sub-packages must have all standard scripts',
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
    for (const required of REQUIRED_SCRIPTS) {
      if (!scripts[required]) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `Missing required script '${required}' in package '${name}'`,
          ruleId: 'package/require-standard-scripts',
          tip: `Add "${required}" to scripts in package.json`,
          fix: NO_FIX,
        });
      }
    }
    return results;
  },
};
export default rule;
