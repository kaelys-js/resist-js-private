/**
 * Rule: package/require-scope
 *
 * Non-root packages must have a name starting with the required scope.
 * Defaults to '@/' but can be configured via ruleOptions.scope.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** The require-scope lint rule. */
const rule: PackageJsonRule = {
  id: 'package/require-scope',
  description: 'Non-root packages must have a scoped name',
  categories: ['package', 'naming'],
  stages: ['lint', 'check', 'build'],
  fixable: false,
  optionsSchema: {
    scope: {
      type: 'string',
      description: 'Required scope prefix for package names (default: "@/").',
    },
  },
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    if (context.isRoot) {
      return results;
    }

    const { name } = context.pkg;

    if (!name) {
      results.push({
        file: context.file,
        line: 1,
        column: 1,
        severity: 'error',
        message: 'Missing "name" field — cannot verify scope',
        ruleId: 'package/require-scope',
        fix: NO_FIX,
      });
      return results;
    }
    if (!name.startsWith('@') || !name.includes('/')) {
      results.push({
        file: context.file,
        line: 1,
        column: 1,
        severity: 'error',
        message: `Package name "${name}" must be scoped (start with "@" and contain "/")`,
        ruleId: 'package/require-scope',
        fix: NO_FIX,
      });
    }
    return results;
  },
};
export default rule;
