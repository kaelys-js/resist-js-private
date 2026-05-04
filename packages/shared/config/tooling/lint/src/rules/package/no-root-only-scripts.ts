/**
 * Rule: package/no-root-only-scripts
 *
 * Scripts qa:format, qa:format:check, qa:lint should only exist in workspace root.
 * Sub-packages must not define them.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import { buildDeleteJsonEntryFix, readContent } from '@/lint/rules/package/_json-fix-helpers.ts';

/** Scripts that belong only in the workspace root. */
const ROOT_ONLY_SCRIPTS: readonly string[] = ['qa:format', 'qa:format:check', 'qa:lint'];

/** The no-root-only-scripts lint rule. */
const rule: PackageJsonRule = {
  id: 'package/no-root-only-scripts',
  description: 'qa:format, qa:format:check, qa:lint belong only in workspace root',
  categories: ['package', 'scripts'],
  stages: ['lint'],
  fixable: true,
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    if (context.isRoot) {
      return results;
    }

    const scripts: Record<string, string> = context.pkg.scripts ?? {};
    let content: string | undefined;

    for (const forbidden of ROOT_ONLY_SCRIPTS) {
      if (scripts[forbidden]) {
        if (content === undefined) {
          content = readContent(context.file);
        }

        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `Script '${forbidden}' should only be in workspace root, not sub-package '${context.pkg.name ?? ''}'`,
          ruleId: 'package/no-root-only-scripts',
          tip: 'Remove this script — formatting and linting run workspace-wide from root',
          fix: buildDeleteJsonEntryFix(content, forbidden, 'scripts'),
        });
      }
    }
    return results;
  },
};
export default rule;
