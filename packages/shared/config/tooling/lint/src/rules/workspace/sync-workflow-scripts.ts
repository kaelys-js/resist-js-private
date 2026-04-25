/**
 * Rule: sync/workflow-scripts
 *
 * Ensures every `pnpm` command in GitHub workflow files references
 * a script that exists in package.json.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Known pnpm built-in commands that are NOT package.json scripts. */
const PNPM_BUILTINS: ReadonlySet<string> = new Set([
  'install',
  'i',
  'add',
  'remove',
  'rm',
  'update',
  'up',
  'dlx',
  'exec',
  'create',
  'publish',
  'pack',
  'link',
  'unlink',
  'rebuild',
  'store',
  'prune',
  'why',
  'list',
  'ls',
  'outdated',
  'audit',
  'licenses',
  'patch',
  'patch-commit',
  'setup',
  'init',
  'deploy',
  'fetch',
  'dedupe',
  'config',
  'approve-builds',
]);

/**
 * Extract pnpm script names from workflow YAML content.
 *
 * Matches `run:` steps containing `pnpm run X` or `pnpm X` patterns.
 *
 * @param content - YAML file content
 * @returns Array of { script, line } objects
 */
function extractWorkflowPnpmScripts(content: string): Array<{ script: string; line: number }> {
  const results: Array<{ script: string; line: number }> = [];
  const lines: string[] = content.split('\n');

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /* Match run: fields in YAML */
    const runMatch: RegExpMatchArray | null = line.match(/^\s*-?\s*run:\s*(.+)$/);
    if (!runMatch) {
      continue;
    }

    const cmd: string = runMatch[1] ?? '';

    /* Extract pnpm commands: pnpm run X, pnpm X, pnpm -w run X, pnpm --filter X run Y */
    const pnpmPattern: RegExp =
      /\bpnpm\s+(?:-[\w-]+\s+)*(?:--[\w-]+=?\S*\s+)*(?:run\s+)?([\w:.-]+)/g;
    let pnpmMatch: RegExpExecArray | null = pnpmPattern.exec(cmd);

    while (pnpmMatch) {
      const script: string = pnpmMatch[1] ?? '';
      /* Skip flags, built-in commands, and empty strings */
      if (script.length > 0 && !script.startsWith('-') && !PNPM_BUILTINS.has(script)) {
        results.push({ script, line: i + 1 });
      }
      pnpmMatch = pnpmPattern.exec(cmd);
    }
  }

  return results;
}

/** Validates pnpm commands in GitHub workflows reference valid scripts. */
const rule: WorkspaceRule = {
  id: 'sync/workflow-scripts',
  description: 'GitHub workflow pnpm commands must reference valid package.json scripts.',
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

    /* Find workflow files */
    const allFiles: readonly string[] = await ctx.allFiles();
    const workflowFiles: string[] = allFiles.filter(
      (f: string): boolean =>
        f.includes('.github/workflows/') && (f.endsWith('.yml') || f.endsWith('.yaml')),
    );

    if (workflowFiles.length === 0) {
      return results;
    }

    await Promise.all(
      workflowFiles.map(async (workflowFile: string): Promise<void> => {
        let content: string;
        try {
          content = await ctx.readFile(workflowFile);
        } catch {
          return;
        }

        const pnpmRefs: Array<{ script: string; line: number }> =
          extractWorkflowPnpmScripts(content);

        for (const ref of pnpmRefs) {
          if (!validScripts.has(ref.script)) {
            results.push(
              createResult(
                'sync/workflow-scripts',
                workflowFile,
                ref.line,
                1,
                'error',
                `Workflow references 'pnpm ${ref.script}' but script doesn't exist in package.json`,
                {
                  tip: `Add '${ref.script}' to package.json scripts or update the workflow command`,
                },
              ),
            );
          }
        }
      }),
    );

    return results;
  },
};

export default rule;
