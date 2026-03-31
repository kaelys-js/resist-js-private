/**
 * Workspace Tool: svelte-check
 *
 * Runs `svelte-check` on SvelteKit packages to type-check `.svelte` files
 * and their TypeScript dependencies. Parses the machine-readable output format.
 *
 * Part of Phase 45 plan: docs/plans/2026-03-30-linter-phase-45.md (TASK 4)
 * User approved changelog at step 3 of fix-bug workflow.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type WorkspaceTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex matching svelte-check diagnostic lines.
 *
 * Format: `TIMESTAMP LEVEL "file" line:col "message"`
 */
const DIAGNOSTIC_RE: RegExp = /^\d+\s+(ERROR|WARNING)\s+"([^"]+)"\s+(\d+):(\d+)\s+"(.+)"$/;

/**
 * SvelteKit packages that need svelte-check.
 *
 * Each entry is a relative path from workspace root to the package directory.
 */
const SVELTE_PACKAGES: readonly string[] = [
  'packages/products/storylyne/editor',
  'packages/products-template/app',
  'packages/shared/ui',
];

/**
 * Transform svelte-check output into LintResult[].
 *
 * Each diagnostic line matching the pattern is converted to a LintResult.
 * START lines and other non-diagnostic output are ignored.
 *
 * @param output - Raw stdout from svelte-check
 * @returns Parsed lint results
 */
export function transformSvelteCheckOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpExecArray | null = DIAGNOSTIC_RE.exec(line);
    if (!match) {
      continue;
    }

    const level: string = match[1]!;
    const file: string = match[2]!;
    const lineNum: number = parseInt(match[3]!, 10);
    const col: number = parseInt(match[4]!, 10);
    const message: string = match[5]!;

    const severity: 'error' | 'warning' = level === 'WARNING' ? 'warning' : 'error';
    const ruleId: string = level === 'WARNING' ? 'svelte-check/warning' : 'svelte-check/error';

    results.push(createResult(ruleId, file, lineNum, col, severity, message));
  }

  return results;
}

/**
 * Run svelte-check across all known SvelteKit packages.
 *
 * Unlike per-file tools, this runs `svelte-check` once per SvelteKit package
 * directory and aggregates all results.
 *
 * @param cwd - Workspace root directory
 * @returns Aggregated lint results from all packages
 */
export function runSvelteCheckAllPackages(cwd: string): LintResult[] {
  const results: LintResult[] = [];

  for (const pkgPath of SVELTE_PACKAGES) {
    const pkgDir: string = resolve(cwd, pkgPath);

    if (!existsSync(join(pkgDir, 'package.json'))) {
      continue;
    }

    const args: string[] = [
      '--tsconfig',
      './tsconfig.json',
      '--compiler-warnings',
      'state_referenced_locally:ignore',
    ];

    try {
      const output: string = execFileSync('svelte-check', args, {
        cwd: pkgDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120_000,
      });

      results.push(...transformSvelteCheckOutput(output));
    } catch (error: unknown) {
      const execError = error as { stdout?: string };
      if (execError.stdout && typeof execError.stdout === 'string') {
        results.push(...transformSvelteCheckOutput(execError.stdout));
      }
    }
  }

  return results;
}

/** svelte-check workspace tool definition. */
export const svelteCheckTool: WorkspaceTool = {
  name: 'svelte-check',
  command: 'svelte-check',
  args: ['--tsconfig', './tsconfig.json'],
  outputFormat: 'text',
  transform: transformSvelteCheckOutput,
  isAvailable(): boolean {
    return isCommandAvailable('svelte-check');
  },
};
