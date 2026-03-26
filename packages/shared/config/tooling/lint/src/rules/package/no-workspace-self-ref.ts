/**
 * Rule: package/no-workspace-self-ref
 *
 * Sub-packages must not have workspace:* dependencies on other @/ packages.
 * All @/ imports resolve via tsconfig paths (type checking) and
 * vite-tsconfig-paths (runtime). pnpm symlinks from workspace:* are redundant.
 *
 * @module
 */

import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';

/** Dummy fix for package.json rules. */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/no-workspace-self-ref',
  description: 'Sub-packages must not have workspace:* dependencies — use tsconfig paths',
  fixable: false,

  /**
   * Check for workspace:* entries in dependencies or devDependencies.
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

    for (const [dep, version] of Object.entries(allDeps)) {
      if (version === 'workspace:*') {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `'${dep}' uses workspace:* in '${name}' — remove it, @/ imports resolve via tsconfig paths`,
          ruleId: 'package/no-workspace-self-ref',
          tip: 'Remove the workspace:* dependency — vite-tsconfig-paths and tsgo resolve @/ imports',
          fix: NO_FIX,
        });
      }
    }

    return results;
  },
};

export default rule;
