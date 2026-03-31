/**
 * Rule: sync/onboarding-steps
 *
 * Ensures every step in `tooling.onboarding.steps` (from resist.config.ts)
 * is a valid package.json script.
 *
 * Part of Phase 48 plan: docs/plans/2026-03-30-linter-phase-48.md TASK 4
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Known resist config file locations to check. */
const CONFIG_PATHS: string[] = ['resist.config.ts', 'resist.config.js', 'resist.config.mjs'];

/**
 * Extract onboarding step names from resist config source.
 *
 * Matches array literals in `onboarding: { steps: [...] }` blocks.
 *
 * @param content - TypeScript/JavaScript source content
 * @returns Array of { step, line } objects
 */
function extractOnboardingSteps(content: string): Array<{ step: string; line: number }> {
  const results: Array<{ step: string; line: number }> = [];
  const lines: string[] = content.split('\n');

  /* Find array contents after steps: or steps = */
  let inSteps: boolean = false;
  let bracketDepth: number = 0;

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /* Detect start of steps array */
    if (!inSteps && /\bsteps\s*[=:]\s*\[/.test(line)) {
      inSteps = true;
      bracketDepth = 0;
    }

    if (inSteps) {
      for (const ch of line) {
        if (ch === '[') {
          bracketDepth++;
        }
        if (ch === ']') {
          bracketDepth--;
          if (bracketDepth <= 0) {
            inSteps = false;
          }
        }
      }

      /* Extract string literals from this line */
      const stringPattern: RegExp = /['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null = stringPattern.exec(line);
      while (match) {
        const step: string = match[1] ?? '';
        if (step.length > 0) {
          results.push({ step, line: i + 1 });
        }
        match = stringPattern.exec(line);
      }
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

/** Validates onboarding steps reference valid package.json scripts. */
const rule: WorkspaceRule = {
  id: 'sync/onboarding-steps',
  description: 'Onboarding steps must be valid package.json scripts.',
  scope: 'workspace',
  categories: ['sync', 'workspace'],
  stages: ['lint', 'ci'],
  fixable: false,
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

    /* Find resist config file */
    const configPath: string | null = await findFirstExisting(ctx, CONFIG_PATHS, ctx.rootDir);

    if (!configPath) {
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

    /* Parse resist config */
    let content: string;
    try {
      content = await ctx.readFile(configPath);
    } catch {
      return results;
    }

    const stepRefs: Array<{ step: string; line: number }> = extractOnboardingSteps(content);

    for (const ref of stepRefs) {
      if (!validScripts.has(ref.step)) {
        results.push(
          createResult(
            'sync/onboarding-steps',
            configPath,
            ref.line,
            1,
            'error',
            `Onboarding step '${ref.step}' doesn't exist in package.json scripts`,
            {
              tip: `Add '${ref.step}' to package.json scripts or remove from onboarding steps`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
