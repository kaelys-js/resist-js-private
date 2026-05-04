/**
 * Rule: plans/require-test-files
 *
 * Implementation tasks that create or edit source files must declare
 * at least one test file in the Files section.
 *
 * @module
 */

import {
  createResult,
  type LintFix,
  type LintResult,
  type WorkspaceRule,
} from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan, type PlanTask } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/require-test-files';

/** No-op fix sentinel. */
const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

/** File patterns exempt from requiring tests. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.d\.ts$/,
  /index\.ts$/,
  /\.config\.\w+$/,
  /schema\.\w+$/,
  /\.json$/,
  /\.md$/,
];

/**
 * Check if a file path is exempt from requiring tests.
 *
 * @param {string} path - File path
 * @returns {boolean} True if exempt
 */
function isExempt(path: string): boolean {
  return EXEMPT_PATTERNS.some((re: RegExp): boolean => re.test(path));
}

/**
 * Check if a file path is a test file.
 *
 * @param {string} path - File path
 * @returns {boolean} True if test file
 */
function isTestPath(path: string): boolean {
  return path.includes('.test.') || path.includes('.spec.');
}

/**
 * Build a fix that appends `- Test: <path>.test.ts` entries after the last
 * file entry in the task's Files section.
 *
 * For each non-exempt `.ts` source file, generates a corresponding test path
 * by inserting `.test` before the `.ts` extension.
 *
 * @param {string} content - Full plan file content
 * @param {PlanTask} task - The task missing test files
 * @returns {LintFix} Fix inserting test file entries or NO_FIX
 */
function buildTestEntriesFix(content: string, task: PlanTask): LintFix {
  /* Collect source files that need test entries */
  const sourcePaths: string[] = [];

  for (const f of task.files) {
    if (
      (f.action === 'create' || f.action === 'edit') &&
      f.path.endsWith('.ts') &&
      !isExempt(f.path) &&
      !isTestPath(f.path)
    ) {
      sourcePaths.push(f.path);
    }
  }

  if (sourcePaths.length === 0) {
    return NO_FIX;
  }

  /* Find the last file entry line in the task's section.
   * Search from task.line downward for lines matching `- Edit:`, `- Create:`, or `- Test:`. */
  const lines: string[] = content.split('\n');
  let lastFileLineIdx: number = -1;

  for (let i: number = task.line - 1; i < Math.min(task.line + 40, lines.length); i++) {
    const trimmed: string = (lines[i] ?? '').trim();

    if (/^-\s+(?:Edit|Create|Test):\s/.test(trimmed)) {
      lastFileLineIdx = i;
    }

    /* Stop at the next section header */
    if (i > task.line && /^\*\*(?:Verification|Plan)\*\*/.test(trimmed)) {
      break;
    }
  }

  if (lastFileLineIdx === -1) {
    return NO_FIX;
  }

  /* Compute byte offset of end of the last file line */
  let byteOffset: number = 0;

  for (let i: number = 0; i <= lastFileLineIdx; i++) {
    byteOffset += (lines[i] ?? '').length + 1; /* +1 for \n */
  }

  /* Build the test entries text */
  const testLines: string[] = sourcePaths.map((p: string): string => {
    const testPath: string = p.replace(/\.ts$/, '.test.ts');

    return `- Test: ${testPath}`;
  });

  const insertText: string = testLines.join('\n') + '\n';

  return { range: { start: byteOffset, end: byteOffset }, text: insertText };
}

/** The require-test-files lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Implementation tasks that create/edit source files must declare test files — enforces TDD at the plan level.',
  scope: 'workspace',
  categories: ['plans'],
  stages: ['ci'],
  fixable: true,

  async inputs(context: unknown): Promise<readonly string[]> {
    return discoverPlanFiles(context as WorkspaceContext);
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    const planFiles: readonly string[] = await discoverPlanFiles(ctx);

    for (const file of planFiles) {
      const content: string = await ctx.readFile(file);
      const plan = parsePlan(content);

      for (const task of plan.tasks) {
        if (task.isTail) {
          continue;
        }
        if (task.files.length === 0) {
          continue;
        }

        /* Check if task has any non-exempt source files */
        let hasSourceFiles: boolean = false;

        for (const f of task.files) {
          if (
            (f.action === 'create' || f.action === 'edit') &&
            f.path.endsWith('.ts') &&
            !isExempt(f.path) &&
            !isTestPath(f.path)
          ) {
            hasSourceFiles = true;
            break;
          }
        }

        if (!hasSourceFiles) {
          continue;
        }

        /* Check if task declares any test files */
        let hasTestFiles: boolean = false;

        for (const f of task.files) {
          if (f.action === 'test' || isTestPath(f.path)) {
            hasTestFiles = true;
            break;
          }
        }

        if (!hasTestFiles) {
          /* Build fix: generate Test: entries for each non-exempt source file */
          const fix: LintFix = buildTestEntriesFix(content, task);

          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `TASK ${String(task.number)} (${task.name}) creates/edits source files but declares no test files.`,
              {
                tip: `Add a Test: entry to the Files section (e.g., Test: src/path/to/file.test.ts).`,
                fix,
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
