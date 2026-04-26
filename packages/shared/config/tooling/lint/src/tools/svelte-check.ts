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

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { LintCache } from '@/lint/framework/cache.ts';
import { execFileAsync } from '@/lint/framework/exec.ts';
import { fingerprintFiles } from '@/lint/framework/file-fingerprint.ts';

import {
  type WorkspaceTool,
  TOOL_CONCURRENCY,
  isCommandAvailable,
  mapWithConcurrency,
  missingToolResult,
} from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Directories whose contents never affect svelte-check input fingerprint.
 * Includes svelte-check's own incremental cache dir (`.svelte-check/`)
 * since its contents are derived from inputs and grow as svelte-check runs. */
const FINGERPRINT_SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.svelte-kit',
  '.svelte-check',
  'dist',
  '.turbo',
  '.cache',
  'coverage',
]);

/**
 * Enumerate input files that affect a Svelte package's svelte-check result.
 *
 * Walks the package tree collecting `.svelte`, `.ts`, `.tsx`, `.cts`, `.mts`,
 * `tsconfig*.json`, `svelte.config.{js,ts,mjs,cjs}`, and `package.json`.
 * Results are absolute paths.
 *
 * @param pkgDir - Absolute package directory
 * @returns Absolute paths of all files that affect svelte-check output
 */
function listSvelteCheckInputs(pkgDir: string): string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    let entries: Array<import('node:fs').Dirent>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (FINGERPRINT_SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const full: string = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const { name } = entry;
      if (
        name.endsWith('.svelte') ||
        name.endsWith('.ts') ||
        name.endsWith('.tsx') ||
        name.endsWith('.cts') ||
        name.endsWith('.mts') ||
        name === 'package.json' ||
        (name.startsWith('tsconfig') && name.endsWith('.json')) ||
        (name.startsWith('svelte.config.') &&
          (name.endsWith('.js') ||
            name.endsWith('.ts') ||
            name.endsWith('.mjs') ||
            name.endsWith('.cjs')))
      ) {
        files.push(full);
      }
    }
  }
  walk(pkgDir);
  return files;
}

/**
 * Regex matching svelte-check diagnostic lines.
 *
 * Format: `TIMESTAMP LEVEL "file" line:col "message"`
 */
const DIAGNOSTIC_RE: RegExp = /^\d+\s+(ERROR|WARNING)\s+"([^"]+)"\s+(\d+):(\d+)\s+"(.+)"$/;

/**
 * Svelte ambient declaration files (`*.svelte.d.ts`) use intentional
 * non-standard syntax (`export var [key: string]: unknown`) so that tsgo
 * resolves arbitrary named exports from `<script module>` blocks. The
 * tsgo runner already suppresses the resulting `TS1005` parse error for
 * the same files (`tools/tsgo.ts`'s `SVELTE_AMBIENT_PARSE_SUPPRESSION`).
 * svelte-check's wrapped TS pass also balks at the same line, so we
 * mirror the suppression here.
 */
const SVELTE_AMBIENT_PARSE_SUPPRESSION: RegExp = /svelte\.d\.ts$/;
const SVELTE_AMBIENT_PARSE_MESSAGE: RegExp = /',' expected\.|Expected .* but found/;

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
    let entries: Array<import('node:fs').Dirent>;
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
    let entries: Array<import('node:fs').Dirent>;
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
      /* svelte-check requires a tsconfig.json — skip parent dirs that
       * only contain Svelte descendants (e.g. `packages/products` which
       * holds child packages). Without this filter, svelte-check is
       * spawned against a dir that has no resolvable tsconfig and
       * produces redundant work over the descendant package's run. */
      if (
        existsSync(join(full, 'package.json')) &&
        existsSync(join(full, 'tsconfig.json')) &&
        hasSvelteFile(full)
      ) {
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
    const lineNum: number = Number.parseInt(match[3]!, 10);
    const col: number = Number.parseInt(match[4]!, 10);
    const message: string = match[5]!;

    const severity: 'error' | 'warning' = level === 'WARNING' ? 'warning' : 'error';
    const ruleId: string = level === 'WARNING' ? 'svelte-check/warning' : 'svelte-check/error';

    // Skip parse errors from svelte.d.ts — intentional ambient syntax.
    if (SVELTE_AMBIENT_PARSE_SUPPRESSION.test(file) && SVELTE_AMBIENT_PARSE_MESSAGE.test(message)) {
      continue;
    }

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
export async function runSvelteCheckAllPackages(
  cwd: string,
  files: string[] = [],
  lintCache: LintCache | null = null,
): Promise<LintResult[]> {
  /* Availability check up-front: emit one internal/tool-missing for the whole
   * workspace run rather than N per-package copies. Mirrors the required-aware
   * path in tool-orchestrator.runWorkspaceTool. */
  if (!isCommandAvailable('svelte-check')) {
    return [missingToolResult('svelte-check', cwd)];
  }

  const allDirs: string[] = discoverSveltePackageDirs(cwd);
  const pkgDirs: string[] =
    files.length === 0
      ? allDirs
      : allDirs.filter((dir: string): boolean =>
          files.some((f: string): boolean => f === dir || f.startsWith(`${dir}/`)),
        );

  /* --incremental: persist svelte2tsx outputs to disk so subsequent runs
   *   only re-transpile changed .svelte files. Cache lives under
   *   .svelte-kit/.svelte-check (SvelteKit) or .svelte-check (other).
   * --tsgo: use tsgo (Microsoft's Go port of TypeScript) for the TS pass
   *   instead of native tsc. Big win on packages with many .svelte files.
   * Combined: shared/ui 26.77s -> 2.24s warm (12x). */
  const args: string[] = [
    '--tsconfig',
    './tsconfig.json',
    '--compiler-warnings',
    'state_referenced_locally:ignore',
    '--incremental',
    '--tsgo',
  ];

  /* Run svelte-check per package in parallel (bounded by TOOL_CONCURRENCY).
   * Per-package result cache: fingerprint inputs (path+mtime+size) and skip
   * the execFile entirely on hash match. Cache miss runs the tool and
   * persists results keyed by the fingerprint. */
  const perPackage: LintResult[][] = await mapWithConcurrency(
    pkgDirs,
    TOOL_CONCURRENCY,
    async (pkgDir: string): Promise<LintResult[]> => {
      const inputs: string[] = listSvelteCheckInputs(pkgDir);
      const inputHash: string = fingerprintFiles(inputs);

      const cached: LintResult[] | null =
        lintCache?.getTool('svelte-check', pkgDir, inputHash) ?? null;
      if (cached !== null) {
        return cached;
      }

      let pkgResults: LintResult[];
      try {
        const { stdout } = await execFileAsync('svelte-check', args, {
          cwd: pkgDir,
          encoding: 'utf8',
          timeout: 120_000,
          maxBuffer: 16 * 1024 * 1024,
        });
        pkgResults = transformSvelteCheckOutput(stdout);
      } catch (error: unknown) {
        const execError = error as { stdout?: string };
        if (execError.stdout && typeof execError.stdout === 'string') {
          pkgResults = transformSvelteCheckOutput(execError.stdout);
        } else {
          const message: string = error instanceof Error ? error.message : String(error);
          /* Don't cache crash results — they're transient and a re-run might succeed. */
          return [
            {
              file: pkgDir,
              line: 1,
              column: 1,
              severity: 'error',
              message: `svelte-check crashed for ${pkgDir} — type checking was skipped (${message})`,
              ruleId: 'internal/tool-crash',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        }
      }

      lintCache?.setTool('svelte-check', pkgDir, inputHash, pkgResults);
      return pkgResults;
    },
  );

  return perPackage.flat();
}

/** svelte-check workspace tool definition. */
export const svelteCheckTool: WorkspaceTool = {
  name: 'svelte-check',
  command: 'svelte-check',
  args: ['--tsconfig', './tsconfig.json'],
  outputFormat: 'text',
  required: true,
  transform: transformSvelteCheckOutput,
  isAvailable(): boolean {
    return isCommandAvailable('svelte-check');
  },
};
