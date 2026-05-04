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
import { dirname, join, relative } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import {
  NO_FIX,
  buildDeleteJsonEntryFix,
  buildSetJsonFieldFix,
} from '@/lint/rules/package/_json-fix-helpers.ts';

/** Compiler options that must NOT be overridden in sub-packages. */
const PROTECTED_OPTIONS: readonly string[] = ['strict', 'target', 'module', 'moduleResolution'];

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/valid-tsconfig',
  description: 'Sub-package tsconfig.json must extend root and include src',
  categories: ['package', 'typescript'],
  stages: ['lint', 'ci'],
  fixable: true,

  /**
   * Check tsconfig.json in the package directory.
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

    // Exempt VS Code extensions and directory groupings
    if (name.includes('vscode')) {
      return results;
    }
    if (name === '@/products') {
      return results;
    }
    if (name.startsWith('@{')) {
      return results;
    }

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
    let tsconfigContent: string;

    try {
      tsconfigContent = readFileSync(tsconfigPath, 'utf8');
      tsconfig = JSON.parse(tsconfigContent) as Record<string, unknown>;
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
    if (extendsStr.includes('.svelte-kit')) {
      return results;
    }

    // Must extend root tsconfig
    if (!extendsStr.endsWith('tsconfig.json') || !extendsStr.includes('..')) {
      const relPath: string = relative(dir, process.cwd()).replace(/\\/g, '/');
      const correctExtends: string = `${relPath}/tsconfig.json`;
      const fix = buildSetJsonFieldFix(tsconfigContent, 'extends', `"${correctExtends}"`);

      results.push({
        file: tsconfigPath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `tsconfig.json in '${name}' does not extend root tsconfig`,
        ruleId: 'package/valid-tsconfig',
        tip: 'Add "extends": "<relative-path>/tsconfig.json" pointing to workspace root',
        fix,
      });
    }

    // Must have include with "src"
    const { include }: Record<string, unknown> = tsconfig;

    if (
      !Array.isArray(include) ||
      !include.some((entry: unknown): boolean => typeof entry === 'string' && entry.includes('src'))
    ) {
      /* Only fix when include is entirely missing — modifying existing arrays is fragile */
      const fix = !Array.isArray(include)
        ? buildSetJsonFieldFix(tsconfigContent, 'include', '["src"]')
        : NO_FIX;

      results.push({
        file: tsconfigPath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `tsconfig.json in '${name}' missing "include" with "src"`,
        ruleId: 'package/valid-tsconfig',
        tip: 'Add "include": ["src"] to scope type-checking to source files',
        fix,
      });
    }

    // Must not override protected compiler options
    const compilerOptions: Record<string, unknown> = (tsconfig.compilerOptions ?? {}) as Record<
      string,
      unknown
    >;

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
          fix: buildDeleteJsonEntryFix(tsconfigContent, opt, 'compilerOptions'),
        });
      }
    }

    return results;
  },
};

export default rule;
