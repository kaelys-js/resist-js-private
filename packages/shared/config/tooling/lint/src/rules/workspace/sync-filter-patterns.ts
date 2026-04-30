/**
 * Rule: sync/filter-patterns
 *
 * Ensures `--filter=` patterns in package.json scripts reference
 * paths that exist on disk.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Extract filter patterns from a script command string.
 *
 * Matches patterns like `--filter=packages/tools/admin`,
 * `--filter packages/foo`, and `--filter=./packages/bar`.
 *
 * @param {string} script - The script command string
 * @returns {string[]} Array of filter path strings
 */
function extractFilterPatterns(script: string): string[] {
  const patterns: string[] = [];

  /* Match --filter=VALUE or --filter VALUE */
  const filterRegex: RegExp = /--filter[= ]([^\s]+)/g;
  let match: RegExpExecArray | null = filterRegex.exec(script);

  while (match) {
    const raw: string = match[1] ?? '';
    /* Strip quotes */
    const unquoted: string = raw.replace(/^['"]/, '').replace(/['"]$/, '');

    if (unquoted.length > 0) {
      patterns.push(unquoted);
    }
    match = filterRegex.exec(script);
  }

  return patterns;
}

/**
 * Determine if a filter pattern is a filesystem path vs a package name or glob.
 *
 * @param {string} pattern - The filter pattern to check
 * @returns {boolean} Whether this is a filesystem path pattern
 */
function isPathPattern(pattern: string): boolean {
  /* Strip negation prefix */
  const cleaned: string = pattern.startsWith('!') ? pattern.slice(1) : pattern;

  /* Skip package name selectors (start with @ or are bare names without /) */
  if (cleaned.startsWith('@') || cleaned.startsWith('{')) {
    return false;
  }

  /* Skip glob patterns */
  if (cleaned.includes('*') || cleaned.includes('{') || cleaned.includes('?')) {
    return false;
  }

  /* Skip scope selectors like ...^ or [selector] */
  if (cleaned.includes('^') || cleaned.includes('[') || cleaned.includes('...')) {
    return false;
  }

  /* Path patterns contain / (like packages/foo/bar) or start with ./ */
  return cleaned.includes('/') || cleaned.startsWith('.');
}

/** Validates --filter= patterns in scripts reference existing paths. */
const rule: WorkspaceRule = {
  id: 'sync/filter-patterns',
  description: 'Turbo/pnpm filter patterns must match folder structure.',
  scope: 'workspace',
  categories: ['sync', 'workspace'],
  stages: ['lint', 'ci'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

    const pkgPath: string = join(ctx.rootDir, 'package.json');

    if (!(await ctx.fileExists(pkgPath))) {
      return results;
    }

    let pkg: Record<string, unknown>;

    try {
      pkg = JSON.parse(await ctx.readFile(pkgPath)) as Record<string, unknown>;
    } catch {
      return results;
    }

    const scripts: Record<string, string> = (pkg.scripts ?? {}) as Record<string, string>;

    /* Find the line number of each script in the raw JSON */
    const rawPkg: string = await ctx.readFile(pkgPath);
    const pkgLines: string[] = rawPkg.split('\n');

    /* Build flat list of script+pattern pairs to check */
    const checks: Array<{ scriptName: string; scriptValue: string; pattern: string }> = [];

    for (const [scriptName, scriptValue] of Object.entries(scripts)) {
      if (typeof scriptValue !== 'string') {
        continue;
      }

      const filterPatterns: string[] = extractFilterPatterns(scriptValue);

      for (const pattern of filterPatterns) {
        if (!isPathPattern(pattern)) {
          continue;
        }
        checks.push({ scriptName, scriptValue, pattern });
      }
    }

    await Promise.all(
      checks.map(
        async (check: {
          scriptName: string;
          scriptValue: string;
          pattern: string;
        }): Promise<void> => {
          /* Strip negation and leading ./ for resolution */
          let pathToCheck: string = check.pattern.startsWith('!')
            ? check.pattern.slice(1)
            : check.pattern;
          pathToCheck = pathToCheck.replace(/^\.\//, '');

          /* Strip trailing -- or flags */
          pathToCheck = pathToCheck.replace(/\s+--.*$/, '');

          const resolvedPath: string = join(ctx.rootDir, pathToCheck);
          const fileOk: boolean = await ctx.fileExists(resolvedPath);
          const dirOk: boolean = await ctx.dirExists(resolvedPath);

          if (!fileOk && !dirOk) {
            /* Find line number */
            let lineNum: number = 1;

            for (let i: number = 0; i < pkgLines.length; i++) {
              if (
                pkgLines[i]?.includes(`"${check.scriptName}"`) &&
                pkgLines[i]?.includes(check.scriptValue.slice(0, 20))
              ) {
                lineNum = i + 1;
                break;
              }
            }

            results.push(
              createResult(
                'sync/filter-patterns',
                pkgPath,
                lineNum,
                1,
                'error',
                `Script '${check.scriptName}' uses --filter='${check.pattern}' but path doesn't exist`,
                {
                  tip: 'Create the missing package directory or correct the filter pattern',
                },
              ),
            );
          }
        },
      ),
    );

    return results;
  },
};

export default rule;
