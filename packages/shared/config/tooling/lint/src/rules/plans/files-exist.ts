/**
 * Rule: plans/files-exist
 *
 * Files declared as `Create:` in completed tasks must actually exist on disk.
 * Catches the "declared but never created" pattern where a plan says a file
 * was created but it was never actually written.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/files-exist';

/** Extended context with ruleOptions. */
type RuleContext = WorkspaceContext & { ruleOptions?: Record<string, unknown> };

/** The files-exist lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Files declared as Create: in completed plan tasks must exist on disk — catches unwired/unimplemented features.',
  scope: 'workspace',
  categories: ['plans'],
  stages: ['ci'],
  fixable: false,
  optionsSchema: {
    planDir: {
      type: 'string',
      description: 'Directory containing plan files (default: docs/plans/).',
    },
  },

  async inputs(context: unknown): Promise<readonly string[]> {
    return discoverPlanFiles(context as WorkspaceContext);
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as RuleContext;
    const results: LintResult[] = [];

    const planFiles: readonly string[] = await discoverPlanFiles(ctx);

    for (const file of planFiles) {
      const content: string = await ctx.readFile(file);
      const plan = parsePlan(content);

      /* Only check completed tasks */
      for (const task of plan.tasks) {
        if (task.status !== '[x]') {
          continue;
        }

        for (const taskFile of task.files) {
          if (taskFile.action !== 'create') {
            continue;
          }

          /* Resolve path: if plan has a package path, use it as base */
          let resolvedPath: string = taskFile.path;

          if (plan.header.packagePath.length > 0 && !taskFile.path.startsWith('/')) {
            resolvedPath = join(ctx.rootDir, plan.header.packagePath, taskFile.path);
          } else if (!taskFile.path.startsWith('/')) {
            resolvedPath = join(ctx.rootDir, taskFile.path);
          }

          const exists: boolean = await ctx.fileExists(resolvedPath);

          if (!exists) {
            results.push(
              createResult(
                RULE_ID,
                file,
                task.line,
                1,
                'error',
                `TASK ${String(task.number)} (${task.name}) declares Create: "${taskFile.path}" but file does not exist.`,
                {
                  tip: `Either create the file or update the plan to reflect what was actually implemented.`,
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
