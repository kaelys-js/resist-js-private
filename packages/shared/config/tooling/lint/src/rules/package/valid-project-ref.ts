/**
 * Rule: package/valid-project-ref
 *
 * Validates that --project references in qa:test, qa:test:coverage,
 * qa:benchmark scripts match an actual vitest project name defined
 * in the root vitest.config.ts.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules. */
const NO_FIX: { range: { start: number; end: number }; text: string } = {
  range: { start: 0, end: 0 },
  text: '',
};

/** Cached set of valid vitest project names. */
let validProjects: ReadonlySet<string> | null = null;

/**
 * Parse vitest.config.ts and extract all project names.
 *
 * @returns {ReadonlySet<string>} Set of valid project names
 */
function getValidProjects(): ReadonlySet<string> {
  if (validProjects) {
    return validProjects;
  }

  try {
    const configPath: string = resolve('vitest.config.ts');
    const content: string = readFileSync(configPath, 'utf8');
    const names: string[] = [];
    const pattern: RegExp = /name:\s*'([^']+)'/g;
    let match: RegExpExecArray | null = pattern.exec(content);
    while (match) {
      names.push(match[1]);
      match = pattern.exec(content);
    }
    validProjects = new Set(names);
  } catch {
    validProjects = new Set();
  }

  return validProjects;
}

/** Scripts to check for --project references. */
const PROJECT_SCRIPTS: readonly string[] = [
  'qa:test',
  'qa:test:unit',
  'qa:test:coverage',
  'qa:benchmark',
];

/** Rule definition. */
const rule: PackageJsonRule = {
  id: 'package/valid-project-ref',
  description: 'Scripts with --project must reference a valid vitest project name',

  /**
   * Check --project references in test scripts.
   *
   * @param {PackageJsonContext} context - Package.json context
   * @returns {LintResult[]} Lint results
   */
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) {
      return results;
    }

    const scripts: Record<string, string> = context.pkg.scripts ?? {};
    const projects: ReadonlySet<string> = getValidProjects();
    if (projects.size === 0) {
      return results;
    }

    const name: string = context.pkg.name ?? '<unnamed>';

    for (const key of PROJECT_SCRIPTS) {
      const script: string | undefined = scripts[key];
      if (!script) {
        continue;
      }

      const projectMatch: RegExpMatchArray | null = script.match(/--project\s+(\S+)/);
      if (!projectMatch) {
        continue;
      }

      const projectName: string = projectMatch[1];
      if (!projects.has(projectName)) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `'${key}' references unknown vitest project '${projectName}' in package '${name}'`,
          ruleId: 'package/valid-project-ref',
          tip: `Valid projects: ${[...projects].join(', ')}`,
          fix: NO_FIX,
        });
      }
    }

    return results;
  },
};

export default rule;
