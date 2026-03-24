/**
 * Rule: package/require-shared-config
 *
 * Validates that product config files use shared config tooling:
 * - svelte.config.ts must import createSvelteConfig from @/config/tooling/svelte
 * - vite.config.ts must import createViteConfig from @/config/tooling/vite
 * - playwright.config.ts must import from @/test-presets/playwright
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules. */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** Config files to check and their required import patterns. */
const CONFIG_CHECKS: readonly {
  file: string;
  pattern: RegExp;
  required: string;
  description: string;
}[] = [
  {
    file: 'svelte.config.ts',
    pattern: /createSvelteConfig.*from\s+['"]@\/config\/tooling\/svelte['"]/,
    required: "import { createSvelteConfig } from '@/config/tooling/svelte'",
    description: 'svelte.config.ts must use createSvelteConfig from @/config/tooling/svelte',
  },
  {
    file: 'vite.config.ts',
    pattern: /createViteConfig.*from\s+['"]@\/config\/tooling\/vite['"]/,
    required: "import { createViteConfig } from '@/config/tooling/vite'",
    description: 'vite.config.ts must use createViteConfig from @/config/tooling/vite',
  },
  {
    file: 'playwright.config.ts',
    pattern: /from\s+['"]@\/test-presets\/playwright['"]/,
    required: "import from '@/test-presets/playwright'",
    description: 'playwright.config.ts must use @/test-presets/playwright',
  },
];

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/require-shared-config',
  description: 'Config files must use shared config tooling',

  /**
   * Check config files in the package directory.
   *
   * @param {PackageJsonContext} context - Package.json context
   * @returns {LintResult[]} Lint results
   */
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) return results;

    const name: string = context.pkg.name ?? '<unnamed>';
    const dir: string = dirname(context.file);

    for (const configCheck of CONFIG_CHECKS) {
      const configPath: string = join(dir, configCheck.file);
      if (!existsSync(configPath)) continue;

      let content: string;
      try {
        content = readFileSync(configPath, 'utf8');
      } catch {
        continue;
      }

      if (!configCheck.pattern.test(content)) {
        results.push({
          file: configPath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `${configCheck.file} in '${name}' does not use shared config — ${configCheck.description}`,
          ruleId: 'package/require-shared-config',
          tip: `Add: ${configCheck.required}`,
          fix: NO_FIX,
        });
      }
    }

    return results;
  },
};

export default rule;
