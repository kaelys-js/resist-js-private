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
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type WorkspaceTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex matching svelte-check diagnostic lines.
 *
 * Format: `TIMESTAMP LEVEL "file" line:col "message"`
 */
const DIAGNOSTIC_RE: RegExp = /^\d+\s+(ERROR|WARNING)\s+"([^"]+)"\s+(\d+):(\d+)\s+"(.+)"$/;

/** Directories to skip during package discovery. */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.svelte-kit',
  'dist',
  '_INTEGRATE',
]);

/**
 * Discover all package directories under `packages/` that contain `.svelte` files.
 *
 * A directory qualifies when it has a `package.json` and at least one `.svelte`
 * file anywhere in its tree (skipping `node_modules`, `.svelte-kit`, etc.).
 *
 * @param cwd - Workspace root directory
 * @returns Absolute paths of Svelte package directories
 */
export function discoverSveltePackageDirs(cwd: string): string[] {
  const packagesDir: string = join(cwd, 'packages');
  if (!existsSync(packagesDir)) {
    return [];
  }

  const found: string[] = [];

  /** Return true if dir (or any descendant) contains a `.svelte` file. */
  function hasSvelteFile(dir: string): boolean {
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.svelte')) {
        return true;
      }
      if (entry.isDirectory() && hasSvelteFile(join(dir, entry.name))) {
        return true;
      }
    }
    return false;
  }

  function walk(dir: string): void {
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const full: string = join(dir, entry.name);
      if (existsSync(join(full, 'package.json')) && hasSvelteFile(full)) {
        found.push(full);
      }
      walk(full);
    }
  }

  walk(packagesDir);
  return found;
}

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

  for (const pkgDir of discoverSveltePackageDirs(cwd)) {
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
      } else {
        const message: string = error instanceof Error ? error.message : String(error);
        results.push({
          file: pkgDir,
          line: 1,
          column: 1,
          severity: 'error',
          message: `svelte-check crashed for ${pkgDir} — type checking was skipped (${message})`,
          ruleId: 'internal/tool-crash',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
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
