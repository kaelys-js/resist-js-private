/**
 * Tests for the CLI entry point.
 *
 * The CLI uses top-level `process.exit()` so it cannot be imported directly.
 * Every test spawns it as a subprocess via `npx tsx`.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
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

// =============================================================================
// Helper
// =============================================================================

/**
 * Run the CLI with the given arguments as a subprocess.
 *
 * @param args - CLI arguments to pass after the script path
 * @returns Object containing stdout, stderr, and the process exit code
 */
function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout: string = execFileSync('npx', ['tsx', CLI_PATH, ...args], {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (execError.stdout ?? '') as string,
      stderr: (execError.stderr ?? '') as string,
      exitCode: (execError.status ?? 1) as number,
    };
  }
}

// =============================================================================
// --help flag
// =============================================================================

describe('--help flag', () => {
  it('exits with code 0', () => {
    const { exitCode } = runCli(['--help']);
    expect(exitCode).toBe(0);
  }, 30_000);

  it('output contains "resist-lint"', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toContain('resist-lint');
  }, 30_000);

  it('output contains USAGE section', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toContain('USAGE');
  }, 30_000);

  it('output contains OPTIONS section', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toContain('OPTIONS');
  }, 30_000);

  it('output contains CONFIGURATION section', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).toContain('CONFIGURATION');
  }, 30_000);

  it('-h flag also shows help and exits 0', () => {
    const { exitCode, stdout } = runCli(['-h']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('USAGE');
  }, 30_000);
});

// =============================================================================
// --list-rules flag
// =============================================================================

describe('--list-rules flag', () => {
  it('exits with code 0', () => {
    const { exitCode } = runCli(['--list-rules']);
    expect(exitCode).toBe(0);
  }, 30_000);

  it('stdout contains "TypeScript rules:"', () => {
    const { stdout } = runCli(['--list-rules']);
    expect(stdout).toContain('TypeScript rules:');
  }, 30_000);

  it('stdout contains "Package.json rules:"', () => {
    const { stdout } = runCli(['--list-rules']);
    expect(stdout).toContain('Package.json rules:');
  }, 30_000);

  it('stdout contains known TypeScript rule "jsdoc/require-param"', () => {
    const { stdout } = runCli(['--list-rules']);
    expect(stdout).toContain('jsdoc/require-param');
  }, 30_000);

  it('stdout contains known package.json rule "package/require-tsgo"', () => {
    const { stdout } = runCli(['--list-rules']);
    expect(stdout).toContain('package/require-tsgo');
  }, 30_000);

  it('stdout contains known TypeScript rule "typescript/no-throw"', () => {
    const { stdout } = runCli(['--list-rules']);
    expect(stdout).toContain('typescript/no-throw');
  }, 30_000);
});

// =============================================================================
// --json flag
// =============================================================================

describe('--json flag', () => {
  it('output is valid JSON when linting a known file', () => {
    const { stdout } = runCli(['--json', 'packages/shared/config/tooling/lint/src/constants.ts']);
    expect(() => JSON.parse(stdout)).not.toThrow();
  }, 30_000);

  it('JSON output is an array', () => {
    const { stdout } = runCli(['--json', 'packages/shared/config/tooling/lint/src/constants.ts']);
    const parsed: unknown = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
  }, 30_000);
});

// =============================================================================
// Nonexistent path
// =============================================================================

describe('nonexistent path', () => {
  it('reports path not found and does not crash', () => {
    const { exitCode, stdout, stderr } = runCli(['nonexistent_directory_abc123xyz']);
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

describe('--rule= filter', () => {
  it('exits with code 0 when filtering to a single known rule on a clean file', () => {
    const { exitCode } = runCli([
      '--rule=jsdoc/require-param',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    // constants.ts has no functions with params, so no jsdoc/require-param errors
    expect(exitCode).toBe(0);
  }, 30_000);

  it('--json output only contains the filtered rule ID when results are present', () => {
    const { stdout, exitCode } = runCli([
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

  it('--json with an unrecognised rule ID produces an empty array', () => {
    const { stdout } = runCli([
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

describe('--warn-only flag', () => {
  it('exits with code 0 even when linting a path that may have errors', () => {
    // Lint a real directory; --warn-only must force exit 0 regardless of findings
    const { exitCode } = runCli([
      '--warn-only',
      'packages/shared/config/tooling/lint/src/constants.ts',
    ]);
    expect(exitCode).toBe(0);
  }, 30_000);
});

// =============================================================================
// Linting a real file
// =============================================================================

describe('linting a real file', () => {
  it('exits with code 0 or 1 (not a crash code) when linting constants.ts', () => {
    const { exitCode } = runCli(['packages/shared/config/tooling/lint/src/constants.ts']);
    expect([0, 1]).toContain(exitCode);
  }, 30_000);

  it('does not crash (exit 2) when given a valid file path', () => {
    const { exitCode } = runCli(['packages/shared/config/tooling/lint/src/constants.ts']);
    expect(exitCode).not.toBe(2);
  }, 30_000);
});

// =============================================================================
// No arguments
// =============================================================================

describe('no arguments', () => {
  it('exits with code 0 or 1 when run from workspace root (uses config include paths)', () => {
    // The workspace .resist-lint.jsonc has "include" entries, so this should run
    // (slowly — hence 30-second timeout). Exit code 0 = clean, 1 = errors found.
    const { exitCode } = runCli([]);
    expect([0, 1]).toContain(exitCode);
  }, 30_000);
});
