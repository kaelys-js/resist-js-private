/**
 * Rule: package/no-hoisted-dep
 *
 * Certain dependencies are hoisted to the workspace root via .npmrc
 * public-hoist-pattern and should NOT appear in sub-package dependencies.
 * All packages resolve them from the root node_modules.
 *
 * @module
 */

import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';

/** Dummy fix for package.json rules. */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** Dependencies hoisted via public-hoist-pattern in .npmrc. */
const HOISTED_DEPS: ReadonlySet<string> = new Set(['valibot']);

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/no-hoisted-dep',
  description: 'Hoisted dependencies must not appear in sub-package dependencies',
  fixable: false,

  /**
   * Check for hoisted deps in sub-package dependencies or devDependencies.
   *
   * @param {PackageJsonContext} context - Package.json context
   * @returns {LintResult[]} Lint results
   */
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) {
      return results;
    }

    const name: string = context.pkg.name ?? '<unnamed>';
    const allDeps: Record<string, string> = {
      ...context.pkg.dependencies,
      ...context.pkg.devDependencies,
    };

    for (const dep of Object.keys(allDeps)) {
      if (HOISTED_DEPS.has(dep)) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `'${dep}' is hoisted to workspace root — remove from sub-package '${name}'`,
          ruleId: 'package/no-hoisted-dep',
          tip: `Remove '${dep}' — it is hoisted via public-hoist-pattern in .npmrc`,
          fix: NO_FIX,
        });
      }
    }

    return results;
  },
};

export default rule;
