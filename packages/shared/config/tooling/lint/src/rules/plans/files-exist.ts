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

import {
  createResult,
  type LintFix,
  type LintResult,
  type WorkspaceRule,
} from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/files-exist';

/** No-op fix sentinel. */
const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

/**
 * Build a fix that changes `[x]` to `[ ]` on the task's status line,
 * reverting the task to "not started" since its declared file doesn't exist.
 *
 * @param {string} content - Full plan file content
 * @param {number} taskLine - 1-based line number of the task header
 * @returns {LintFix} Fix that reverts status or NO_FIX
 */
function buildRevertStatusFix(content: string, taskLine: number): LintFix {
  const lines: string[] = content.split('\n');

  /* Search the task header and a few lines below for **Status**: [x] */
  for (let i: number = taskLine - 1; i < Math.min(taskLine + 5, lines.length); i++) {
    const line: string = lines[i] ?? '';
    const idx: number = line.indexOf('[x]');

    if (idx !== -1 && /\*\*Status\*\*/.test(line)) {
      /* Compute byte offset */
      let byteOffset: number = 0;

      for (let li: number = 0; li < i; li++) {
        byteOffset += (lines[li] ?? '').length + 1; /* +1 for \n */
      }

      const matchStart: number = byteOffset + idx;

      return { range: { start: matchStart, end: matchStart + 3 }, text: '[ ]' };
    }
  }

  return NO_FIX;
}

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
  fixable: true,
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
                  fix: buildRevertStatusFix(content, task.line),
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
