/**
 * Rule: package/no-git-deps
 *
 * Disallows git+https:// dependencies in any dependency field.
 * These should be replaced with pinned tarballs or published versions.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** Dependency field names to check. */
const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/** The no-git-deps lint rule. */
const rule: PackageJsonRule = {
  id: 'package/no-git-deps',
  description: 'Disallow git+https:// dependencies',
  categories: ['package', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    for (const field of DEP_FIELDS) {
      const deps: Record<string, string> | undefined = context.pkg[field];

      if (!deps) {
        continue;
      }
      for (const [key, value] of Object.entries(deps)) {
        if (value.startsWith('git+https://')) {
          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `Disallowed git+https dependency: ${key}: ${value}`,
            ruleId: 'package/no-git-deps',
            tip: 'Replace git+https dependencies with pinned tarballs or published versions',
            fix: NO_FIX,
          });
        }
      }
    }
    return results;
  },
};
export default rule;
