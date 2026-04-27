/**
 * Rule: workspace/validate-mjs-cjs-usage
 *
 * Files using .mjs or .cjs extensions must have a matching "type" field
 * in the nearest package.json.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Parsed package.json with a type field. */
type PackageJsonType = {
  /** Module type field from package.json. */
  type?: string;
};

/**
 * Walk up from a directory to find the nearest package.json.
 *
 * @param {string} startDir - Directory to start searching from
 * @param {string} rootDir - Workspace root (stop boundary)
 * @param {(path: string) => Promise<boolean>} exists - File existence checker
 * @param {(path: string) => Promise<string>} read - File reader
 * @returns {Promise<string | undefined>} The "type" field value, or undefined
 */
async function findNearestPackageType(
  startDir: string,
  rootDir: string,
  exists: (path: string) => Promise<boolean>,
  read: (path: string) => Promise<string>,
): Promise<string | undefined> {
  let currentDir: string = startDir;

  for (;;) {
    const pkgPath: string = join(currentDir, 'package.json');
    const found: boolean = await exists(pkgPath);

    if (found) {
      try {
        const content: string = await read(pkgPath);
        const parsed: PackageJsonType = JSON.parse(content) as PackageJsonType;
        return parsed.type;
      } catch {
        return undefined;
      }
    }

    /* Stop if we've reached or gone above the root */
    if (currentDir === rootDir || currentDir === dirname(currentDir)) {
      break;
    }

    currentDir = dirname(currentDir);
  }

  return undefined;
}

/** Validates that .mjs/.cjs files match their nearest package.json type field. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-mjs-cjs-usage',
  description:
    'Files using .mjs or .cjs extensions must have a matching "type" field in the nearest package.json.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.allFiles();
  },

  async check(context: unknown): Promise<
    Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      fix: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      source?: string;
      url?: string;
      endLine?: number;
      endColumn?: number;
    }>
  > {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: Array<ReturnType<typeof createResult>> = [];

    for (const filePath of await ctx.allFiles()) {
      const isMjs: boolean = filePath.endsWith('.mjs');
      const isCjs: boolean = filePath.endsWith('.cjs');

      if (!isMjs && !isCjs) {
        continue;
      }

      const fileDir: string = dirname(filePath);
      const name: string = basename(filePath);
      const relativePath: string = relative(ctx.rootDir, filePath);
      const pkgType: string | undefined = await findNearestPackageType(
        fileDir,
        ctx.rootDir,
        ctx.fileExists,
        ctx.readFile,
      );

      if (isMjs && pkgType !== 'module') {
        results.push(
          createResult(
            'workspace/validate-mjs-cjs-usage',
            filePath,
            1,
            1,
            'error',
            `File ${name} uses .mjs but nearest package.json does not have "type": "module" (${relativePath})`,
            {
              tip: 'Set "type": "module" in nearest package.json or rename to .js',
            },
          ),
        );
      }

      if (isCjs && pkgType !== 'commonjs') {
        results.push(
          createResult(
            'workspace/validate-mjs-cjs-usage',
            filePath,
            1,
            1,
            'error',
            `File ${name} uses .cjs but nearest package.json does not have "type": "commonjs" (${relativePath})`,
            {
              tip: 'Set "type": "commonjs" in nearest package.json or rename to .js',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
