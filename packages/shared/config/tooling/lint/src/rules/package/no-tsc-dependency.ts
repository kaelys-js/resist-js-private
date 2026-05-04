/**
 * Rule: package/no-tsc-dependency
 *
 * Packages using tsgo should not have typescript in devDependencies.
 * Exempts SvelteKit packages that need typescript for svelte-check.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import { buildDeleteJsonEntryFix, readContent } from '@/lint/rules/package/_json-fix-helpers.ts';

/** The no-tsc-dependency lint rule. */
const rule: PackageJsonRule = {
  id: 'package/no-tsc-dependency',
  description: 'Packages using tsgo should not depend on typescript',
  categories: ['package', 'dependencies'],
  stages: ['lint', 'ci'],
  fixable: true,
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    if (context.isRoot) {
      return results;
    }

    const name: string = context.pkg.name ?? '';

    if (name.includes('vscode')) {
      return results;
    }
    /* Exempt SvelteKit packages — they need typescript for svelte-check */

    const deps: Record<string, string> = context.pkg.devDependencies ?? {};

    if (deps['svelte-check']) {
      return results;
    }

    const hasTsDep: boolean = Boolean(
      context.pkg.devDependencies?.['typescript'] ?? context.pkg.dependencies?.['typescript'],
    );

    if (hasTsDep) {
      const content: string = readContent(context.file);
      const parentKey: string = context.pkg.devDependencies?.['typescript']
        ? 'devDependencies'
        : 'dependencies';

      results.push({
        file: context.file,
        line: 1,
        column: 1,
        severity: 'error',
        message: `Package '${context.pkg.name ?? ''}' has 'typescript' dependency but uses tsgo — remove it`,
        ruleId: 'package/no-tsc-dependency',
        tip: 'Remove typescript from devDependencies — tsgo does not need it',
        fix: buildDeleteJsonEntryFix(content, 'typescript', parentKey),
      });
    }
    return results;
  },
};
export default rule;
