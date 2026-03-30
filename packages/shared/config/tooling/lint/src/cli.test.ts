/**
 * Tests for the CLI entry point.
 *
 * The CLI uses top-level `process.exit()` so it cannot be imported directly.
 * Shared subprocess results are cached per unique arg set to avoid redundant
 * process spawns (e.g. 5 --help tests share 1 subprocess invocation).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';

// =============================================================================
// Constants
// =============================================================================

/** Absolute path to the CLI source file. */
const CLI_PATH: string = resolve(import.meta.dirname, 'cli.ts');

/**
 * Workspace root — six levels up from src/ inside
 * packages/shared/config/tooling/lint/src/.
 */
const WORKSPACE_ROOT: string = resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..');

/** Absolute path to tsx binary — avoids npx resolution overhead (~100-200ms per spawn). */
const TSX_PATH: string = resolve(WORKSPACE_ROOT, 'node_modules', '.bin', 'tsx');

// =============================================================================
// Helper
// =============================================================================

/** Cached subprocess results keyed by serialised args. */
type CliResult = { stdout: string; stderr: string; exitCode: number };
const CLI_CACHE: Map<string, Promise<CliResult>> = new Map();

/**
 * Run the CLI with the given arguments as a subprocess (async).
 * Results are cached per unique arg set so multiple tests can
 * share a single subprocess invocation.
 *
 * @param args - CLI arguments to pass after the script path
 * @returns Promise resolving to stdout, stderr, and the process exit code
 */
function runCli(args: string[]): Promise<CliResult> {
  const key: string = JSON.stringify(args);
  let cached: Promise<CliResult> | undefined = CLI_CACHE.get(key);
  if (cached !== undefined) {
    return cached;
  }

  cached = new Promise<CliResult>((res: (v: CliResult) => void): void => {
    execFile(
      TSX_PATH,
      [CLI_PATH, ...args],
      { cwd: WORKSPACE_ROOT, encoding: 'utf8', timeout: 30_000 },
      (error: Error | null, stdout: string, stderr: string): void => {
        if (error) {
          const execError = error as unknown as { status?: number };
          res({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            exitCode: (execError.status ?? 1) as number,
          });
        } else {
          res({ stdout, stderr: stderr ?? '', exitCode: 0 });
        }
      },
    );
  });

  CLI_CACHE.set(key, cached);
  return cached;
}

// =============================================================================
// --help flag
// =============================================================================

describe.concurrent('--help flag', () => {
  it('exits with code 0', async () => {
    const { exitCode } = await runCli(['--help']);
    expect(exitCode).toBe(0);
  }, 30_000);

  it('output contains "resist-lint"', async () => {
    const { stdout } = await runCli(['--help']);
    expect(stdout).toContain('resist-lint');
  }, 30_000);

  it('output contains USAGE section', async () => {
    const { stdout } = await runCli(['--help']);
    expect(stdout).toContain('USAGE');
  }, 30_000);

  it('output contains OPTIONS section', async () => {
    const { stdout } = await runCli(['--help']);
    expect(stdout).toContain('OPTIONS');
  }, 30_000);

  it('output contains CONFIGURATION section', async () => {
    const { stdout } = await runCli(['--help']);
    expect(stdout).toContain('CONFIGURATION');
  }, 30_000);

  it('-h flag also shows help and exits 0', async () => {
    const { exitCode, stdout } = await runCli(['-h']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('USAGE');
  }, 30_000);
});

// =============================================================================
// --list-rules flag
// =============================================================================

describe.concurrent('--list-rules flag', () => {
  it('exits with code 0', async () => {
    const { exitCode } = await runCli(['--list-rules']);
    expect(exitCode).toBe(0);
  }, 30_000);

  it('stdout contains "TypeScript rules:"', async () => {
    const { stdout } = await runCli(['--list-rules']);
    expect(stdout).toContain('TypeScript rules:');
  }, 30_000);

  it('stdout contains "Package.json rules:"', async () => {
    const { stdout } = await runCli(['--list-rules']);
    expect(stdout).toContain('Package.json rules:');
  }, 30_000);

  it('stdout contains known TypeScript rule "jsdoc/require-param"', async () => {
    const { stdout } = await runCli(['--list-rules']);
    expect(stdout).toContain('jsdoc/require-param');
  }, 30_000);

  it('stdout contains known package.json rule "package/require-tsgo"', async () => {
    const { stdout } = await runCli(['--list-rules']);
    expect(stdout).toContain('package/require-tsgo');
  }, 30_000);

  it('stdout contains known TypeScript rule "typescript/no-throw"', async () => {
    const { stdout } = await runCli(['--list-rules']);
    expect(stdout).toContain('typescript/no-throw');
  }, 30_000);
});

// =============================================================================
// --json flag
// =============================================================================

describe.concurrent('--json flag', () => {
  it('output is valid JSON when linting a known file', async () => {
    const { stdout } = await runCli([
      '--json',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    expect(() => JSON.parse(stdout)).not.toThrow();
  }, 30_000);

  it('JSON output is an array', async () => {
    const { stdout } = await runCli([
      '--json',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    const parsed: unknown = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
  }, 30_000);
});

// =============================================================================
// Nonexistent path
// =============================================================================

describe.concurrent('nonexistent path', () => {
  it('reports path not found and does not crash', async () => {
    const { exitCode, stdout, stderr } = await runCli(['nonexistent_directory_abc123xyz']);
    // Should either report "Path not found" on stderr or "No lintable files" on stdout
    const combined: string = stdout + stderr;
    const handledGracefully: boolean =
      combined.includes('Path not found') || combined.includes('No lintable files');
    expect(handledGracefully).toBe(true);
    // Should not crash (exit 2)
    expect(exitCode).not.toBe(2);
  }, 30_000);
});

// =============================================================================
// --rule= filter
// =============================================================================

describe.concurrent('--rule= filter', () => {
  it('exits with code 0 when filtering to a single known rule on a clean file', async () => {
    const { exitCode } = await runCli([
      '--rule=jsdoc/require-param',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    // constants.ts has no functions with params, so no jsdoc/require-param errors
    expect(exitCode).toBe(0);
  }, 30_000);

  it('--json output only contains the filtered rule ID when results are present', async () => {
    const { stdout, exitCode } = await runCli([
      '--json',
      '--rule=typescript/no-throw',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    // If exit code is 0 or 1, the JSON should be parseable and only contain the filtered rule
    const parsed = JSON.parse(stdout) as Array<{ ruleId: string }>;
    expect(Array.isArray(parsed)).toBe(true);
    for (const result of parsed) {
      expect(result.ruleId).toBe('typescript/no-throw');
    }
    // suppress unused variable warning
    expect([0, 1]).toContain(exitCode);
  }, 30_000);

  it('--json with an unrecognised rule ID produces an empty array', async () => {
    const { stdout } = await runCli([
      '--json',
      '--rule=nonexistent/fake-rule',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    const parsed: unknown = JSON.parse(stdout);
    expect(parsed).toEqual([]);
  }, 30_000);
});

// =============================================================================
// --warn-only flag
// =============================================================================

describe.concurrent('--warn-only flag', () => {
  it('exits with code 0 even when linting a path that may have errors', async () => {
    // Lint a real directory; --warn-only must force exit 0 regardless of findings
    const { exitCode } = await runCli([
      '--warn-only',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    expect(exitCode).toBe(0);
  }, 30_000);
});

// =============================================================================
// Linting a real file
// =============================================================================

describe.concurrent('linting a real file', () => {
  it('exits with code 0 or 1 (not a crash code) when linting constants.ts', async () => {
    const { exitCode } = await runCli(['packages/shared/config/tooling/lint/src/constants.ts']);
    expect([0, 1]).toContain(exitCode);
  }, 30_000);

  it('does not crash (exit 2) when given a valid file path', async () => {
    const { exitCode } = await runCli(['packages/shared/config/tooling/lint/src/constants.ts']);
    expect(exitCode).not.toBe(2);
  }, 30_000);
});

// =============================================================================
// No arguments
// =============================================================================

describe.concurrent('no arguments', () => {
  it('exits with code 0 or 1 when run from workspace root (uses config include paths)', async () => {
    // The workspace .resist-lint.jsonc has "include" entries, so this should run
    // (slowly — hence 30-second timeout). Exit code 0 = clean, 1 = errors found.
    const { exitCode } = await runCli([]);
    expect([0, 1]).toContain(exitCode);
  }, 30_000);
});
