/**
 * Workspace Tool: tsgo
 *
 * Runs `tsgo --noEmit` from the workspace root to type-check all packages.
 * Parses the `file(line,col): error TSxxxx: message` output format.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  type WorkspaceTool,
  isCommandAvailable,
  missingToolResult,
} from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex matching tsgo diagnostic lines.
 *
 * Format: `file(line,col): error|warning TSxxxx: message`
 */
const DIAGNOSTIC_RE: RegExp = /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

/**
 * Svelte ambient declaration files that use index-signature export syntax
 * (`export var [key: string]: unknown`) to allow arbitrary named exports.
 * tsgo resolves the named exports correctly but emits a spurious TS1005
 * parse error for the non-standard syntax. These are suppressed here.
 */
const SVELTE_AMBIENT_PARSE_SUPPRESSION: RegExp = /svelte\.d\.ts$/;

/**
 * Transform tsgo output into LintResult[].
 *
 * Each diagnostic line matching the pattern is converted to a LintResult.
 * Continuation lines (indented context) are ignored.
 *
 * @param output - Raw stdout from tsgo --noEmit
 * @returns Parsed lint results
 */
export function transformTsgoOutput(output: string): LintResult[] {
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

    const file: string = match[1]!;
    const lineNum: number = parseInt(match[2]!, 10);
    const col: number = parseInt(match[3]!, 10);
    const level: string = match[4]!;
    const code: string = match[5]!;
    const message: string = match[6]!;

    /* Skip TS1005 from svelte.d.ts — intentional index-signature export syntax. */
    if (code === 'TS1005' && SVELTE_AMBIENT_PARSE_SUPPRESSION.test(file)) {
      continue;
    }

    const severity: 'error' | 'warning' = level === 'warning' ? 'warning' : 'error';

    results.push(createResult(`tsgo/${code}`, file, lineNum, col, severity, message));
  }

  return results;
}

/** Directories to skip during package discovery. */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.svelte-kit',
  'dist',
  '_INTEGRATE',
]);

/**
 * SvelteKit packages extend `.svelte-kit/tsconfig.json` which contains
 * virtual module declarations (`$app/*`, `$env/*`) that tsgo cannot resolve.
 * These packages are type-checked by svelte-check instead.
 */
const SVELTEKIT_EXTENDS_RE: RegExp = /\.svelte-kit[/\\]tsconfig\.json/;

/** Return true if the tsconfig.json in `dir` extends a SvelteKit-generated config. */
function isSvelteKitTsconfig(dir: string): boolean {
  try {
    const content: string = readFileSync(join(dir, 'tsconfig.json'), 'utf8');
    return SVELTEKIT_EXTENDS_RE.test(content);
  } catch {
    return false;
  }
}

/**
 * Discover all directories under `packages/` that contain a `tsconfig.json`.
 *
 * Walks the `packages/` tree recursively, skipping `node_modules`,
 * `.svelte-kit`, `dist`, and `_INTEGRATE`. Also skips SvelteKit packages
 * whose tsconfig extends `.svelte-kit/tsconfig.json` — those are
 * type-checked by svelte-check instead.
 *
 * @param cwd - Workspace root directory
 * @returns Absolute paths of directories with a tsconfig.json
 */
export function discoverTsconfigDirs(cwd: string): string[] {
  const packagesDir: string = join(cwd, 'packages');
  if (!existsSync(packagesDir)) {
    return [];
  }

  const found: string[] = [];

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
      if (existsSync(join(full, 'tsconfig.json')) && !isSvelteKitTsconfig(full)) {
        found.push(full);
      }
      walk(full);
    }
  }

  walk(packagesDir);
  return found;
}

/**
 * Given a set of absolute file paths and the list of discovered tsconfig
 * directories, return the subset of directories that own at least one input
 * file. A directory "owns" a file when it is the deepest tsconfig dir that is
 * a path prefix of the file.
 *
 * When `files` is empty, returns `tsconfigDirs` unchanged (no scoping —
 * workspace-wide run).
 *
 * @param tsconfigDirs - All discovered package dirs with a tsconfig.json
 * @param files - Absolute file paths to scope to
 * @returns Subset of `tsconfigDirs` that own at least one input file
 */
export function scopeTsconfigDirsToFiles(tsconfigDirs: string[], files: string[]): string[] {
  if (files.length === 0) {
    return tsconfigDirs;
  }
  /* Sort dirs by length descending so deepest prefix wins. */
  const sorted: string[] = [...tsconfigDirs].sort(
    (a: string, b: string): number => b.length - a.length,
  );
  const owning: Set<string> = new Set();
  for (const file of files) {
    for (const dir of sorted) {
      if (file === dir || file.startsWith(`${dir}/`)) {
        owning.add(dir);
        break;
      }
    }
  }
  return [...owning];
}

/**
 * Run tsgo across all packages that have a tsconfig.json.
 *
 * Dynamically discovers packages instead of relying on a hardcoded list.
 * Runs `tsgo --noEmit` once per package directory so each package's
 * own tsconfig.json is used for path resolution.
 *
 * When `files` is non-empty, only packages that own at least one file are
 * type-checked. When omitted or empty, every discovered package is checked.
 *
 * @param cwd - Workspace root directory
 * @param files - Optional absolute file paths to scope the run to
 * @returns Aggregated lint results from checked packages
 */
export function runTsgoAllPackages(cwd: string, files: string[] = []): LintResult[] {
  const results: LintResult[] = [];

  /* Availability check up-front: emit one internal/tool-missing for the whole
   * workspace run rather than N per-package copies. Mirrors the required-aware
   * path in tool-orchestrator.runWorkspaceTool. */
  if (!isCommandAvailable('tsgo')) {
    return [missingToolResult('tsgo', cwd)];
  }

  const allDirs: string[] = discoverTsconfigDirs(cwd);
  const pkgDirs: string[] = scopeTsconfigDirsToFiles(allDirs, files);

  for (const pkgDir of pkgDirs) {
    try {
      const output: string = execFileSync('tsgo', ['--noEmit'], {
        cwd: pkgDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120_000,
      });

      const pkgResults: LintResult[] = transformTsgoOutput(output);
      /* Resolve relative file paths to absolute (tsgo outputs paths relative to cwd). */
      for (const r of pkgResults) {
        if (!r.file.startsWith('/')) {
          r.file = resolve(pkgDir, r.file);
        }
      }
      results.push(...pkgResults);
    } catch (error: unknown) {
      const execError = error as { stdout?: string };
      if (execError.stdout && typeof execError.stdout === 'string') {
        const pkgResults: LintResult[] = transformTsgoOutput(execError.stdout);
        for (const r of pkgResults) {
          if (!r.file.startsWith('/')) {
            r.file = resolve(pkgDir, r.file);
          }
        }
        results.push(...pkgResults);
      } else {
        const message: string = error instanceof Error ? error.message : String(error);
        results.push({
          file: pkgDir,
          line: 1,
          column: 1,
          severity: 'error',
          message: `tsgo crashed for ${pkgDir} — type checking was skipped (${message})`,
          ruleId: 'internal/tool-crash',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }
    }
  }

  return results;
}

/** tsgo workspace tool definition. */
export const tsgoTool: WorkspaceTool = {
  name: 'tsgo',
  command: 'tsgo',
  args: ['--noEmit'],
  outputFormat: 'text',
  required: true,
  transform: transformTsgoOutput,
  isAvailable(): boolean {
    return isCommandAvailable('tsgo');
  },
};
