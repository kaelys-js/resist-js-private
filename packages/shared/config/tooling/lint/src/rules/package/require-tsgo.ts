/**
 * Rule: package/require-tsgo
 *
 * The qa:type-check script must use tsgo, not tsc.
 * Exempts SvelteKit packages that use svelte-check.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX = { range: { start: 0, end: 0 }, text: '' };

const rule: PackageJsonRule = {
  id: 'package/require-tsgo',
  description: 'qa:type-check must use tsgo, not tsc',
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    const script: string | undefined = context.pkg.scripts?.['qa:type-check'];
    if (!script) return results;
    if (script.includes('svelte-check')) return results;
    if (script.includes('tsc') && !script.includes('tsgo')) {
      results.push({
        file: context.file, line: 1, column: 1, severity: 'error',
        message: `qa:type-check uses 'tsc' — use 'tsgo --noEmit' instead`,
        ruleId: 'package/require-tsgo',
        tip: 'Replace tsc with tsgo for faster type checking',
        fix: NO_FIX,
      });
    }
    return results;
  },
};
export default rule;
