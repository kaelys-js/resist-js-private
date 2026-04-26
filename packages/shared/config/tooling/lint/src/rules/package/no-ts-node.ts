/**
 * Rule: package/no-ts-node
 *
 * Disallows ts-node usage in dependencies and scripts.
 * Use native Node.js --experimental-strip-types or Bun instead.
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
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

/** The no-ts-node lint rule. */
const rule: PackageJsonRule = {
  id: 'package/no-ts-node',
  description: 'Disallow ts-node usage in dependencies and scripts',
  categories: ['package', 'tooling'],
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
        if (key.includes('ts-node')) {
          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `Disallowed ts-node usage: ${key}: ${value}`,
            ruleId: 'package/no-ts-node',
            tip: 'Remove ts-node; use native Node.js --experimental-strip-types or Bun instead',
            fix: NO_FIX,
          });
        }
      }
    }
    const { scripts } = context.pkg;
    if (scripts) {
      for (const [key, value] of Object.entries(scripts)) {
        if (value.includes('ts-node')) {
          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `Disallowed ts-node usage: ${key}: ${value}`,
            ruleId: 'package/no-ts-node',
            tip: 'Remove ts-node; use native Node.js --experimental-strip-types or Bun instead',
            fix: NO_FIX,
          });
        }
      }
    }
    return results;
  },
};
export default rule;
