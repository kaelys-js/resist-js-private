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
import { buildDeleteJsonEntryFix, readContent } from '@/lint/rules/package/_json-fix-helpers.ts';

/** Dependencies hoisted via public-hoist-pattern in .npmrc. */
const HOISTED_DEPS: ReadonlySet<string> = new Set(['valibot']);

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/no-hoisted-dep',
  description: 'Hoisted dependencies must not appear in sub-package dependencies',
  categories: ['package', 'dependencies'],
  stages: ['lint', 'ci'],
  fixable: true,

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
    const content: string = readContent(context.file);
    const allDeps: Record<string, string> = {
      ...context.pkg.dependencies,
      ...context.pkg.devDependencies,
    };

    for (const dep of Object.keys(allDeps)) {
      if (HOISTED_DEPS.has(dep)) {
        /* Try devDependencies first, then dependencies */
        const parentKey: string = context.pkg.devDependencies?.[dep]
          ? 'devDependencies'
          : 'dependencies';

        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `'${dep}' is hoisted to workspace root — remove from sub-package '${name}'`,
          ruleId: 'package/no-hoisted-dep',
          tip: `Remove '${dep}' — it is hoisted via public-hoist-pattern in .npmrc`,
          fix: buildDeleteJsonEntryFix(content, dep, parentKey),
        });
      }
    }

    return results;
  },
};

export default rule;
