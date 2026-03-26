/**
 * Rule: package/no-tsc-dependency
 *
 * Packages using tsgo should not have typescript in devDependencies.
 * Exempts SvelteKit packages that need typescript for svelte-check.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** The no-tsc-dependency lint rule. */
const rule: PackageJsonRule = {
  id: 'package/no-tsc-dependency',
  description: 'Packages using tsgo should not depend on typescript',
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) {
      return results;
    }
    const name: string = context.pkg.name ?? '';
    if (name.includes('vscode')) {
      return results;
    }
    const typeCheck: string | undefined = context.pkg.scripts?.['qa:type-check'];
    if (typeCheck?.includes('svelte-check')) {
      return results;
    }
    const hasTsDep: boolean = Boolean(
      context.pkg.devDependencies?.['typescript'] ?? context.pkg.dependencies?.['typescript'],
    );
    if (hasTsDep) {
      results.push({
        file: context.file,
        line: 1,
        column: 1,
        severity: 'error',
        message: `Package '${context.pkg.name ?? ''}' has 'typescript' dependency but uses tsgo — remove it`,
        ruleId: 'package/no-tsc-dependency',
        tip: 'Remove typescript from devDependencies — tsgo does not need it',
        fix: NO_FIX,
      });
    }
    return results;
  },
};
export default rule;
