/**
 * Rule: package/no-workspace-dep
 *
 * Certain dependencies are workspace-root-level toolchain packages and
 * should NOT appear in sub-package devDependencies. They are resolved
 * from the workspace root where tests, linting, and builds run.
 *
 * @module
 */

import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import { buildDeleteJsonEntryFix, readContent } from '@/lint/rules/package/_json-fix-helpers.ts';

/** Dependencies that belong in workspace root only, not in sub-packages. */
const WORKSPACE_ROOT_DEPS: ReadonlySet<string> = new Set([
  '@types/node',
  'vite',
  'oxlint',
  'prettier',
  'tsx',
  'turbo',
  'jsdom',
  '@sveltejs/vite-plugin-svelte',
  '@testing-library/svelte',
  'vite-tsconfig-paths',
  '@biomejs/biome',
]);

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/no-workspace-dep',
  description: 'Workspace-root-level deps must not appear in sub-package devDependencies',
  categories: ['package', 'dependencies'],
  stages: ['lint', 'ci'],
  fixable: true,

  /**
   * Check for workspace-root deps in sub-package devDependencies.
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

    // Exempt template and vscode packages — they may build independently
    if (name.startsWith('@{')) {
      return results;
    }
    if (name.includes('vscode')) {
      return results;
    }

    const content: string = readContent(context.file);
    const devDeps: Record<string, string> = context.pkg.devDependencies ?? {};

    for (const dep of Object.keys(devDeps)) {
      if (WORKSPACE_ROOT_DEPS.has(dep)) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `'${dep}' is a workspace-root dependency — remove from sub-package '${name}'`,
          ruleId: 'package/no-workspace-dep',
          tip: `Remove '${dep}' from devDependencies — it is resolved from the workspace root`,
          fix: buildDeleteJsonEntryFix(content, dep, 'devDependencies'),
        });
      }
    }

    return results;
  },
};

export default rule;
