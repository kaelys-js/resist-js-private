/**
 * Rule: package/names-valid
 *
 * Validates package.json `name` fields across the workspace:
 * - Must be present and non-empty
 * - Must follow npm naming convention (lowercase, valid characters)
 * - Must be unique across all workspace packages
 *
 * Implemented as a WorkspaceRule because duplicate detection requires
 * cross-package visibility.
 *
 * @module
 */

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** npm package name pattern: optional @scope/ followed by lowercase name. */
const VALID_NAME_PATTERN: RegExp = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/** Rule ID constant. */
const RULE_ID: string = 'package/names-valid';

/**
 * Find the 1-based line number of a key in file content.
 *
 * @param {string} content - File content
 * @param {string} key - Key to search for
 * @returns {number} 1-based line number, or 1 if not found
 */
function findLineNumber(content: string, key: string): number {
  const idx: number = content.indexOf(key);

  if (idx < 0) {
    return 1;
  }

  let line: number = 1;

  for (let i: number = 0; i < idx; i++) {
    if (content[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Diagnose specific naming issues for a more helpful error message.
 *
 * @param {string} name - The invalid package name
 * @returns {string[]} Array of specific issue descriptions
 */
function diagnoseNameIssues(name: string): string[] {
  const issues: string[] = [];

  if (name !== name.toLowerCase()) {
    issues.push('must be lowercase');
  }
  if (name.startsWith('.') || name.startsWith('_')) {
    issues.push('cannot start with . or _');
  }
  if (/\s/.test(name)) {
    issues.push('cannot contain spaces');
  }
  if (/[~)('!*]/.test(name.replace(/^@[^/]+\//, ''))) {
    issues.push('contains invalid characters');
  }

  return issues;
}

/** Description. */
const rule: WorkspaceRule = {
  categories: ['package', 'naming'],
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;

    try {
      const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

      return packages.map((p: WorkspacePackage): string => p.path);
    } catch {
      return [];
    }
  },
  async check(context: unknown): Promise<LintResult[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: LintResult[] = [];
    const seenNames: Map<string, string> = new Map();

    let packages: WorkspacePackage[];

    try {
      packages = await ctx.getWorkspacePackages();
    } catch {
      return results;
    }

    /* Read all package files in parallel to avoid no-await-in-loop */
    const contentMap: Map<string, string> = new Map();
    await Promise.all(
      packages.map(async (pkg: WorkspacePackage): Promise<void> => {
        try {
          const text: string = await ctx.readFile(pkg.path);
          contentMap.set(pkg.path, text);
        } catch {
          contentMap.set(pkg.path, '');
        }
      }),
    );

    for (const pkg of packages) {
      const { name } = pkg.packageJson;
      const content: string = contentMap.get(pkg.path) ?? '';

      /* Check: name field exists */
      if (name === undefined || name === null) {
        results.push(
          createResult(RULE_ID, pkg.path, 1, 1, 'error', 'Missing "name" field in package.json', {
            example: '{ "name": "@your-org/pkg" }',
            tip: 'Each workspace package.json must define a valid "name"',
          }),
        );
        continue;
      }

      /* Check: name is a string */
      if (typeof name !== 'string') {
        const lineNum: number = findLineNumber(content, '"name"');
        results.push(
          createResult(
            RULE_ID,
            pkg.path,
            lineNum,
            1,
            'error',
            `"name" must be a string, got ${typeof name}`,
          ),
        );
        continue;
      }

      /* Check: name is not empty */
      if (name.trim() === '') {
        const lineNum: number = findLineNumber(content, '"name"');
        results.push(
          createResult(RULE_ID, pkg.path, lineNum, 1, 'error', '"name" cannot be empty'),
        );
        continue;
      }

      /* Check: name follows npm naming convention */
      if (!VALID_NAME_PATTERN.test(name)) {
        const lineNum: number = findLineNumber(content, '"name"');
        const issues: string[] = diagnoseNameIssues(name);
        const suffix: string = issues.length > 0 ? ` (${issues.join(', ')})` : '';
        results.push(
          createResult(
            RULE_ID,
            pkg.path,
            lineNum,
            1,
            'error',
            `Invalid package name: "${name}"${suffix}`,
            {
              example: '"name": "@resist/my-package"',
              tip: 'Package names must be lowercase, may include @scope/, and use valid npm characters',
            },
          ),
        );
        continue;
      }

      /* Check: no duplicate names */
      const existingPath: string | undefined = seenNames.get(name);

      if (existingPath === undefined) {
        seenNames.set(name, pkg.path);
      } else {
        const lineNum: number = findLineNumber(content, '"name"');
        results.push(
          createResult(
            RULE_ID,
            pkg.path,
            lineNum,
            1,
            'error',
            `Duplicate package name: "${name}"`,
            {
              tip: `Package names must be unique across the workspace. Also defined in: ${existingPath}`,
            },
          ),
        );
      }
    }

    return results;
  },
  description: 'Package names must be valid npm names and unique across workspace.',
  id: RULE_ID,
  scope: 'workspace',
  stages: ['lint', 'check', 'build'],
};

export default rule;
