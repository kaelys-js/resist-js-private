/**
 * Rule: sync/lefthook-scripts
 *
 * Ensures every `pnpm` command in lefthook config references a script
 * that exists in package.json.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { findClosestMatch, lineStartOffset } from './_sync-helpers.ts';

/** Known lefthook config file locations to check. */
const LEFTHOOK_PATHS: string[] = [
  'lefthook.yml',
  'lefthook.yaml',
  '.lefthook.yml',
  '.lefthook.yaml',
  'packages/shared/config/lefthook/base.yml',
];

/**
 * Extract pnpm script names from lefthook YAML content.
 *
 * Matches `run:` values containing `pnpm run X` or `pnpm X` patterns.
 *
 * @param content - YAML file content
 * @returns Array of { script, line } objects
 */
function extractPnpmScripts(content: string): Array<{ script: string; line: number }> {
  const results: Array<{ script: string; line: number }> = [];
  const lines: string[] = content.split('\n');

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /* Match run: fields */
    const runMatch: RegExpMatchArray | null = line.match(/^\s*run:\s*(.+)$/);

    if (!runMatch) {
      continue;
    }

    const cmd: string = runMatch[1] ?? '';

    /* Extract pnpm commands: pnpm run X, pnpm X, pnpm -w run X */
    const pnpmPattern: RegExp = /\bpnpm\s+(?:-\w+\s+)*(?:run\s+)?(\S+)/g;
    let pnpmMatch: RegExpExecArray | null = pnpmPattern.exec(cmd);

    while (pnpmMatch) {
      const script: string = pnpmMatch[1] ?? '';
      /* Skip flags and known non-script arguments */

      if (script.length > 0 && !script.startsWith('-') && !script.startsWith('--')) {
        results.push({ script, line: i + 1 });
      }
      pnpmMatch = pnpmPattern.exec(cmd);
    }
  }

  return results;
}

/**
 * Find the first existing file from a list of candidates.
 *
 * Checks all candidates in parallel and returns the first match by array order.
 *
 * @param ctx - Workspace context for file operations
 * @param candidates - Candidate file names to check
 * @param rootDir - Root directory to resolve paths against
 * @returns Absolute path of first existing file, or null
 */
async function findFirstExisting(
  ctx: WorkspaceContext,
  candidates: string[],
  rootDir: string,
): Promise<string | null> {
  const fullPaths: string[] = candidates.map((c: string): string => join(rootDir, c));
  const checks: boolean[] = await Promise.all(
    fullPaths.map((p: string): Promise<boolean> => ctx.fileExists(p)),
  );
  const idx: number = checks.indexOf(true);

  return idx >= 0 ? (fullPaths[idx] ?? null) : null;
}

/** Validates pnpm commands in lefthook config reference valid scripts. */
const rule: WorkspaceRule = {
  id: 'sync/lefthook-scripts',
  description: 'Lefthook pnpm commands must reference valid package.json scripts.',
  scope: 'workspace',
  categories: ['sync', 'workspace'],
  stages: ['lint', 'ci'],
  fixable: true,
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

    /* Find lefthook config file */
    const lefthookPath: string | null = await findFirstExisting(ctx, LEFTHOOK_PATHS, ctx.rootDir);

    if (!lefthookPath) {
      return results;
    }

    /* Read package.json scripts */
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
    const validScripts: Set<string> = new Set(Object.keys(scripts));

    /* Parse lefthook config */
    let content: string;

    try {
      content = await ctx.readFile(lefthookPath);
    } catch {
      return results;
    }

    const pnpmRefs: Array<{ script: string; line: number }> = extractPnpmScripts(content);

    for (const ref of pnpmRefs) {
      /* Strip arguments after the script name (e.g. 'lint:commit --edit {1}' → 'lint:commit') */
      const scriptName: string = ref.script.split(/\s/)[0] ?? ref.script;

      if (!validScripts.has(scriptName)) {
        /* Fix: find closest matching script name and replace in the lefthook file */
        const closest: string | undefined = findClosestMatch(scriptName, validScripts);
        let fix: { range: { start: number; end: number }; text: string } | undefined;

        if (closest) {
          /* Find the script name in the specific line and replace it */
          const lineOffset: number = lineStartOffset(content, ref.line);
          const lineText: string = content.slice(lineOffset, content.indexOf('\n', lineOffset));
          const nameIdx: number = lineText.indexOf(scriptName);

          if (nameIdx !== -1) {
            const absStart: number = lineOffset + nameIdx;

            fix = {
              range: { start: absStart, end: absStart + scriptName.length },
              text: closest,
            };
          }
        }

        results.push(
          createResult(
            'sync/lefthook-scripts',
            lefthookPath,
            ref.line,
            1,
            'error',
            `Lefthook references 'pnpm ${scriptName}' but script doesn't exist in package.json`,
            {
              tip: closest
                ? `Did you mean '${closest}'?`
                : `Add '${scriptName}' to package.json scripts or remove from lefthook config`,
              fix,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
