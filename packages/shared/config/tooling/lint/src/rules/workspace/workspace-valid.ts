/**
 * Rule: workspace/workspace-valid
 *
 * Validates pnpm-workspace.yaml structure and contents:
 * - File must exist at workspace root
 * - Must contain a `packages` field that is a non-empty array
 * - Each glob entry must be a string
 *
 * @module
 */

import { join } from 'node:path';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'workspace/workspace-valid';

/**
 * Find the 1-based line number of a substring in content.
 *
 * @param {string} content - File content
 * @param {string} needle - Substring to search for
 * @returns {number} 1-based line number, or 1 if not found
 */
function findLineNumber(content: string, needle: string): number {
  const idx: number = content.indexOf(needle);
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
 * Parse pnpm-workspace.yaml to extract the `packages` field.
 *
 * Simple line-based parser for the common format:
 * ```yaml
 * packages:
 *   - 'packages/*'
 *   - 'apps/*'
 * ```
 *
 * @param {string} content - YAML file content
 * @returns {{ packages: unknown } | null} Parsed workspace structure, or null if invalid
 */
function parseWorkspaceYaml(content: string): { packages: unknown } | null {
  const lines: string[] = content.split('\n');
  let inPackages: boolean = false;
  const packages: string[] = [];
  let foundPackagesKey: boolean = false;

  for (const line of lines) {
    const trimmed: string = line.trim();

    if (trimmed === 'packages:') {
      inPackages = true;
      foundPackagesKey = true;
      continue;
    }

    if (inPackages) {
      /* Stop at next top-level key */
      if (trimmed.length > 0 && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
        break;
      }

      if (trimmed.startsWith('- ')) {
        const pattern: string = trimmed.slice(2).trim().replace(/^['"]/, '').replace(/['"]$/, '');
        if (pattern.length > 0) {
          packages.push(pattern);
        }
      }
    }
  }

  if (!foundPackagesKey) {
    return null;
  }

  return { packages };
}

/** Description. */
const rule: WorkspaceRule = {
  categories: ['workspace', 'pnpm'],
  async check(context: unknown): Promise<LintResult[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: LintResult[] = [];
    const workspaceFile: string = join(ctx.rootDir, 'pnpm-workspace.yaml');

    /* Check: File exists */
    const exists: boolean = await ctx.fileExists(workspaceFile);
    if (!exists) {
      results.push(
        createResult(RULE_ID, workspaceFile, 1, 1, 'error', 'Missing pnpm-workspace.yaml', {
          example: 'packages:\n  - "packages/*"\n  - "apps/*"',
          tip: 'Create pnpm-workspace.yaml with a packages array',
        }),
      );
      return results;
    }

    /* Read and parse */
    let content: string;
    try {
      content = await ctx.readFile(workspaceFile);
    } catch {
      results.push(
        createResult(RULE_ID, workspaceFile, 1, 1, 'error', 'Cannot read pnpm-workspace.yaml'),
      );
      return results;
    }

    const workspace: { packages: unknown } | null = parseWorkspaceYaml(content);

    if (workspace === null) {
      results.push(
        createResult(
          RULE_ID,
          workspaceFile,
          1,
          1,
          'error',
          'Missing "packages" field in pnpm-workspace.yaml',
          {
            example: 'packages:\n  - "packages/*"',
            tip: 'Add a packages array with workspace globs',
          },
        ),
      );
      return results;
    }

    const { packages } = workspace;

    /* Check: packages is an array */
    if (!Array.isArray(packages)) {
      const lineNum: number = findLineNumber(content, 'packages');
      results.push(
        createResult(RULE_ID, workspaceFile, lineNum, 1, 'error', '"packages" must be an array', {
          example: 'packages:\n  - "packages/*"\n  - "apps/*"',
          tip: 'Use YAML list format with dashes',
        }),
      );
      return results;
    }

    /* Check: packages array is not empty */
    if (packages.length === 0) {
      const lineNum: number = findLineNumber(content, 'packages');
      results.push(
        createResult(
          RULE_ID,
          workspaceFile,
          lineNum,
          1,
          'error',
          '"packages" array is empty — no workspace globs defined',
          {
            example: 'packages:\n  - "packages/*"',
            tip: 'Add at least one valid glob entry',
          },
        ),
      );
      return results;
    }

    /* Check: Each entry is a string */
    for (const entry of packages) {
      if (typeof entry !== 'string') {
        const lineNum: number = findLineNumber(content, String(entry));
        results.push(
          createResult(
            RULE_ID,
            workspaceFile,
            lineNum,
            1,
            'error',
            `Invalid glob entry: ${JSON.stringify(entry)} — must be a string`,
          ),
        );
      }
    }

    return results;
  },
  description: 'pnpm-workspace.yaml must be valid and contain workspace globs.',
  id: RULE_ID,
  scope: 'workspace',
  stages: ['lint', 'check', 'build'],
};

export default rule;
