/**
 * Rule: package/no-ts-node
 *
 * Disallows ts-node usage in dependencies and scripts.
 * Use native Node.js --experimental-strip-types or Bun instead.
 *
 * @module
 */
import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import {
  buildDeleteJsonEntryFix,
  buildReplaceInJsonValueFix,
  readContent,
} from '@/lint/rules/package/_json-fix-helpers.ts';

/** Dependency field names to check. */
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

/** The no-ts-node lint rule. */
const rule: PackageJsonRule = {
  id: 'package/no-ts-node',
  description: 'Disallow ts-node usage in dependencies and scripts',
  categories: ['package', 'tooling'],
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
        if (key.includes('ts-node')) {
          if (content === undefined) {
            content = readContent(context.file);
          }

          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `Disallowed ts-node usage: ${key}: ${value}`,
            ruleId: 'package/no-ts-node',
            tip: 'Remove ts-node; use native Node.js --experimental-strip-types or Bun instead',
            fix: buildDeleteJsonEntryFix(content, key, field),
          });
        }
      }
    }

    const { scripts } = context.pkg;

    if (scripts) {
      for (const [key, value] of Object.entries(scripts)) {
        if (value.includes('ts-node')) {
          if (content === undefined) {
            content = readContent(context.file);
          }

          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `Disallowed ts-node usage: ${key}: ${value}`,
            ruleId: 'package/no-ts-node',
            tip: 'Remove ts-node; use native Node.js --experimental-strip-types or Bun instead',
            fix: buildReplaceInJsonValueFix(
              content,
              key,
              'ts-node',
              'node --experimental-strip-types',
              'scripts',
            ),
          });
        }
      }
    }
    return results;
  },
};
export default rule;
