/**
 * Rule: package/no-peer-deps
 *
 * Private workspace packages should not have peerDependencies.
 * peerDependencies are for published packages that need consumers
 * to provide a dependency. Private packages are never published —
 * the workspace root provides everything.
 *
 * @module
 */

import type { PackageJsonRule, PackageJsonContext, LintResult } from '@/lint/framework/types.ts';
import { buildDeleteJsonBlockFix, readContent } from '@/lint/rules/package/_json-fix-helpers.ts';

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/no-peer-deps',
  description: 'Private workspace packages must not have peerDependencies',
  categories: ['package', 'dependencies'],
  stages: ['lint', 'ci'],
  fixable: true,

  /**
   * Check for peerDependencies in private packages.
   *
   * @param {PackageJsonContext} context - Package.json context
   * @returns {LintResult[]} Lint results
   */
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    if (context.isRoot) {
      return results;
    }
    if (context.pkg.private !== true) {
      return results;
    }

    const peers: Record<string, string> = context.pkg.peerDependencies ?? {};
    const peerNames: string[] = Object.keys(peers);

    if (peerNames.length === 0) {
      return results;
    }

    const name: string = context.pkg.name ?? '<unnamed>';
    const content: string = readContent(context.file);
    results.push({
      file: context.file,
      line: 1,
      column: 1,
      severity: 'error',
      message: `Private package '${name}' has peerDependencies (${peerNames.join(', ')}) — remove them`,
      ruleId: 'package/no-peer-deps',
      tip: 'Private workspace packages are never published — peerDependencies are meaningless',
      fix: buildDeleteJsonBlockFix(content, 'peerDependencies'),
    });

    return results;
  },
};

export default rule;
