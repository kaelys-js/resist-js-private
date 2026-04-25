/**
 * Rule: sync/turbo-tasks
 *
 * Ensures every `turbo <task>` call in package.json scripts references
 * a task that actually exists in turbo.json.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Extract turbo task names from a script command string.
 *
 * Matches patterns like `turbo build`, `turbo qa:test qa:test:e2e --`,
 * and `turbo //#qa:format:check qa:checks qa:test`.
 *
 * @param script - The script command string
 * @returns Array of task names referenced
 */
function extractTurboTasks(script: string): string[] {
  const tasks: string[] = [];

  /* Find all turbo invocations in the script */
  const turboPattern: RegExp = /\bturbo\s+(.+?)(?:\s+--|$)/g;
  let match: RegExpExecArray | null = turboPattern.exec(script);

  while (match) {
    const argsStr: string = match[1] ?? '';
    const parts: string[] = argsStr.split(/\s+/);

    for (const part of parts) {
      /* Skip flags like --filter=... */
      if (part.startsWith('-')) {
        continue;
      }
      /* Skip empty strings */
      if (part.length === 0) {
        continue;
      }
      tasks.push(part);
    }

    match = turboPattern.exec(script);
  }

  return tasks;
}

/** Validates turbo task references in package.json scripts. */
const rule: WorkspaceRule = {
  id: 'sync/turbo-tasks',
  description: 'Turbo task references in package.json scripts must exist in turbo.json.',
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
    const turboPath: string = join(ctx.rootDir, 'turbo.json');

    /* Read both files — return empty if either is missing */
    const pkgExists: boolean = await ctx.fileExists(pkgPath);
    const turboExists: boolean = await ctx.fileExists(turboPath);
    if (!pkgExists || !turboExists) {
      return results;
    }

    let pkg: Record<string, unknown>;
    let turbo: Record<string, unknown>;
    try {
      pkg = JSON.parse(await ctx.readFile(pkgPath)) as Record<string, unknown>;
      turbo = JSON.parse(await ctx.readFile(turboPath)) as Record<string, unknown>;
    } catch {
      return results;
    }

    const scripts: Record<string, string> = (pkg.scripts ?? {}) as Record<string, string>;
    const tasks: Record<string, unknown> = (turbo.tasks ?? {}) as Record<string, unknown>;

    /* Build set of valid turbo task names (strip //#  root-task prefix) */
    const validTasks: Set<string> = new Set();
    for (const taskName of Object.keys(tasks)) {
      validTasks.add(taskName);
      /* Root tasks like //#qa:format → also valid as qa:format */
      if (taskName.startsWith('//#')) {
        validTasks.add(taskName.slice(3));
      }
    }

    /* Find the line number of each script in the raw JSON */
    const rawPkg: string = await ctx.readFile(pkgPath);
    const pkgLines: string[] = rawPkg.split('\n');

    for (const [scriptName, scriptValue] of Object.entries(scripts)) {
      if (typeof scriptValue !== 'string') {
        continue;
      }

      const referencedTasks: string[] = extractTurboTasks(scriptValue);
      for (const task of referencedTasks) {
        /* Strip //#  prefix for lookup */
        const lookupTask: string = task.startsWith('//#') ? task.slice(3) : task;
        const fullTask: string = task;

        if (!validTasks.has(fullTask) && !validTasks.has(lookupTask)) {
          /* Find line number */
          let lineNum: number = 1;
          for (let i: number = 0; i < pkgLines.length; i++) {
            if (
              pkgLines[i]?.includes(`"${scriptName}"`) &&
              pkgLines[i]?.includes(scriptValue.slice(0, 20))
            ) {
              lineNum = i + 1;
              break;
            }
          }

          results.push(
            createResult(
              'sync/turbo-tasks',
              pkgPath,
              lineNum,
              1,
              'error',
              `Script '${scriptName}' references turbo task '${task}' which doesn't exist in turbo.json`,
              {
                tip: `Add '${task}' to turbo.json tasks or correct the script`,
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
