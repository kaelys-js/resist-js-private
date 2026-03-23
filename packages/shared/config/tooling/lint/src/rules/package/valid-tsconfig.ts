/**
 * Rule: package/valid-tsconfig
 *
 * Validates that sub-package tsconfig.json files extend the root tsconfig,
 * include src, and do not override critical compiler options.
 *
 * Exempts SvelteKit packages and VS Code extensions.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules. */
const NO_FIX: { range: { start: number; end: number }; text: string } = { range: { start: 0, end: 0 }, text: '' };

/** Compiler options that must NOT be overridden in sub-packages. */
const PROTECTED_OPTIONS: readonly string[] = ['strict', 'target', 'module', 'moduleResolution'];

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/valid-tsconfig',
  description: 'Sub-package tsconfig.json must extend root and include src',

  /**
   * Check tsconfig.json in the package directory.
   *
   * @param {PackageJsonContext} context - Package.json context
   * @returns {LintResult[]} Lint results
   */
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) return results;

    const name: string = context.pkg.name ?? '<unnamed>';

    // Exempt VS Code extensions and directory groupings
    if (name.includes('vscode')) return results;
    if (name === '@/products') return results;
    if (name.startsWith('@{')) return results;

    const dir: string = dirname(context.file);
    const tsconfigPath: string = join(dir, 'tsconfig.json');

    if (!existsSync(tsconfigPath)) {
      results.push({
        file: context.file,
        line: 1,
        column: 1,
        severity: 'error',
        message: `Package '${name}' is missing tsconfig.json`,
        ruleId: 'package/valid-tsconfig',
        tip: 'Add tsconfig.json with: { "extends": "<path>/tsconfig.json", "include": ["src"] }',
        fix: NO_FIX,
      });
      return results;
    }

    let tsconfig: Record<string, unknown>;
    try {
      tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as Record<string, unknown>;
    } catch {
      results.push({
        file: tsconfigPath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `tsconfig.json in '${name}' is invalid JSON`,
        ruleId: 'package/valid-tsconfig',
        tip: 'Fix the JSON syntax in tsconfig.json',
        fix: NO_FIX,
      });
      return results;
    }

    const extendsValue: unknown = tsconfig.extends;
    const extendsStr: string = typeof extendsValue === 'string' ? extendsValue : '';

    // SvelteKit packages extend .svelte-kit/tsconfig.json — exempt from root-extends check
    if (extendsStr.includes('.svelte-kit')) return results;

    // Must extend root tsconfig
    if (!extendsStr.endsWith('tsconfig.json') || !extendsStr.includes('..')) {
      results.push({
        file: tsconfigPath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `tsconfig.json in '${name}' does not extend root tsconfig`,
        ruleId: 'package/valid-tsconfig',
        tip: 'Add "extends": "<relative-path>/tsconfig.json" pointing to workspace root',
        fix: NO_FIX,
      });
    }

    // Must have include with "src"
    const include: unknown = tsconfig.include;
    if (!Array.isArray(include) || !include.some((entry: unknown): boolean => typeof entry === 'string' && entry.includes('src'))) {
      results.push({
        file: tsconfigPath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `tsconfig.json in '${name}' missing "include" with "src"`,
        ruleId: 'package/valid-tsconfig',
        tip: 'Add "include": ["src"] to scope type-checking to source files',
        fix: NO_FIX,
      });
    }

    // Must not override protected compiler options
    const compilerOptions: Record<string, unknown> = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>;
    for (const opt of PROTECTED_OPTIONS) {
      if (opt in compilerOptions) {
        results.push({
          file: tsconfigPath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `tsconfig.json in '${name}' overrides protected option '${opt}' — remove it, use root value`,
          ruleId: 'package/valid-tsconfig',
          tip: `Remove '${opt}' from compilerOptions — it is set in the root tsconfig`,
          fix: NO_FIX,
        });
      }
    }

    return results;
  },
};

export default rule;
