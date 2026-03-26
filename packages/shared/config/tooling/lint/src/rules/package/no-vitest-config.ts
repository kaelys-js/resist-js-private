/**
 * Rule: package/no-vitest-config
 *
 * Sub-packages must not have their own vitest.config.ts.
 * Tests run from the workspace root vitest.config.ts via --project.
 *
 * Exempts @/cli (has its own vitest config for standalone usage).
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules. */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** Packages exempt from this rule (have legitimate standalone vitest configs). */
const EXEMPT_PACKAGES: ReadonlySet<string> = new Set(['@/cli']);

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/no-vitest-config',
  description: 'Sub-packages must not have vitest.config.ts — use root config with --project',
  fixable: false,

  /**
   * Check for vitest.config.ts in the package directory.
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
    if (EXEMPT_PACKAGES.has(name)) {
      return results;
    }

    const dir: string = dirname(context.file);
    const vitestConfigPath: string = join(dir, 'vitest.config.ts');

    if (existsSync(vitestConfigPath)) {
      results.push({
        file: vitestConfigPath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `Package '${name}' has a vitest.config.ts — use root vitest.config.ts with --project instead`,
        ruleId: 'package/no-vitest-config',
        tip: 'Remove vitest.config.ts and add a project entry in the root vitest.config.ts',
        fix: NO_FIX,
      });
    }

    return results;
  },
};

export default rule;
