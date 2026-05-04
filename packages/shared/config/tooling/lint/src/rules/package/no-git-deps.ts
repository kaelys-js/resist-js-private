/**
 * Rule: package/no-git-deps
 *
 * Disallows git+https:// dependencies in any dependency field.
 * These should be replaced with pinned tarballs or published versions.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import { buildDeleteJsonEntryFix, readContent } from '@/lint/rules/package/_json-fix-helpers.ts';

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
  fixable: true,
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    let content: string | undefined;

    for (const field of DEP_FIELDS) {
      const deps: Record<string, string> | undefined = context.pkg[field];

      if (!deps) {
        continue;
      }
      for (const [key, value] of Object.entries(deps)) {
        if (value.startsWith('git+https://')) {
          if (content === undefined) {
            content = readContent(context.file);
          }

          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `Disallowed git+https dependency: ${key}: ${value}`,
            ruleId: 'package/no-git-deps',
            tip: 'Replace git+https dependencies with pinned tarballs or published versions',
            fix: buildDeleteJsonEntryFix(content, key, field),
          });
        }
      }
    }
    return results;
  },
};
export default rule;
