/**
 * Workspace Tool: tsgo
 *
 * Runs `tsgo --noEmit` from the workspace root to type-check all packages.
 * Parses the `file(line,col): error TSxxxx: message` output format.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type WorkspaceTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
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

/**
 * Packages that have their own tsconfig.json.
 *
 * tsgo runs once per package directory so each package's tsconfig
 * (including custom `paths` like SvelteKit's `$lib`) is respected.
 * Each path is relative to the workspace root.
 */
const TSGO_PACKAGES: readonly string[] = [
  'packages/products-template/app',
  'packages/shared/config/core',
  'packages/shared/config/test',
  'packages/shared/config/tooling/lint',
  'packages/shared/config/tooling/node',
  'packages/shared/config/tooling/svelte',
  'packages/shared/config/tooling/vite',
  'packages/shared/config/tooling/vscode',
  'packages/shared/locale',
  'packages/shared/schemas/common',
  'packages/shared/schemas/core-config',
  'packages/shared/schemas/function',
  'packages/shared/schemas/generic',
  'packages/shared/schemas/result',
  'packages/shared/schemas/template-literal',
  'packages/shared/secrets/infisical',
  'packages/shared/ui',
  'packages/shared/utils/beacon',
  'packages/shared/utils/cli',
  'packages/shared/utils/core',
  'packages/shared/utils/devtools',
  'packages/shared/utils/result',
  'packages/shared/utils/web-vitals',
  'packages/products/storylyne/editor',
];

/**
 * Run tsgo across all packages that have a tsconfig.json.
 *
 * Unlike the standard workspace tool runner (which runs once at root),
 * this runs `tsgo --noEmit` once per package directory so each package's
 * own tsconfig.json is used for path resolution.
 *
 * @param cwd - Workspace root directory
 * @returns Aggregated lint results from all packages
 */
export function runTsgoAllPackages(cwd: string): LintResult[] {
  const results: LintResult[] = [];

  for (const pkgPath of TSGO_PACKAGES) {
    const pkgDir: string = resolve(cwd, pkgPath);

    if (!existsSync(join(pkgDir, 'tsconfig.json'))) {
      continue;
    }

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
  transform: transformTsgoOutput,
  isAvailable(): boolean {
    return isCommandAvailable('tsgo');
  },
};
