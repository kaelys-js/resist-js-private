/**
 * Tests for the CLI entry point.
 *
 * Most tests call `parseCliArgs` + `runLinter` directly (in-process) to avoid
 * subprocess overhead.  Two subprocess smoke tests verify the actual CLI
 * script exits correctly using native Node TypeScript + alias resolution.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';

import { parseCliArgs, runLinter, type CliArgs, type CliOutput } from './cli-helpers.ts';
import { en } from '@/lint/locale/locales/en.ts';

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

/** Absolute path to the register-aliases bootstrap for `@/` path resolution. */
const REGISTER_ALIASES_PATH: string = resolve(
  WORKSPACE_ROOT,
  'packages',
  'shared',
  'config',
  'tooling',
  'node',
  'src',
  'register-aliases.mjs',
);

// =============================================================================
// Subprocess Helper (used by smoke tests only)
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
      process.execPath,
      ['--import', REGISTER_ALIASES_PATH, CLI_PATH, ...args],
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
// In-process Helpers
// =============================================================================

/**
 * Create a full CliArgs object with defaults for in-process tests.
 *
 * @param overrides - Partial overrides
 * @returns Full CliArgs
 */
function makeCliArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    paths: [],
    json: false,
    listRules: false,
    warnOnly: false,
    fix: false,
    help: false,
    ruleIds: [],
    categories: [],
    quiet: false,
    bail: false,
    ignore: [],
    configPath: undefined,
    severityOverride: undefined,
    diff: undefined,
    debug: false,
    format: undefined,
    jobs: undefined,
    tools: false,
    cache: false,
    ...overrides,
  };
}

/**
 * Capture stdout/stderr from runLinter.
 *
 * @returns Captured lines and the output object
 */
function captureOutput(): { stdoutLines: string[]; stderrLines: string[]; output: CliOutput } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdoutLines,
    stderrLines,
    output: {
      stdout: (msg: string): void => {
        stdoutLines.push(msg);
      },
      stderr: (msg: string): void => {
        stderrLines.push(msg);
      },
    },
  };
}

// =============================================================================
// Subprocess smoke tests (2 tests — verify real CLI script)
// =============================================================================

describe.concurrent('CLI subprocess smoke tests', () => {
  it('--help exits with code 0 via subprocess', async () => {
    const { exitCode } = await runCli(['--help']);
    expect(exitCode).toBe(0);
  }, 30_000);

  it('linting a file exits 0 or 1 (no crash) via subprocess', async () => {
    const { exitCode } = await runCli(['packages/shared/config/tooling/lint/src/constants.ts']);
    expect([0, 1]).toContain(exitCode);
  }, 30_000);
});

// =============================================================================
// --help flag (in-process)
// =============================================================================

describe.concurrent('--help flag', () => {
  it('exits with code 0', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(makeCliArgs({ help: true }), output, en);
    expect(code).toBe(0);
  });

  it('output contains "resist-lint"', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ help: true }), output, en);
    const combined: string = stdoutLines.join('');
    expect(combined).toContain('resist-lint');
  });

  it('output contains USAGE section', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ help: true }), output, en);
    expect(stdoutLines.join('')).toContain('USAGE');
  });

  it('output contains OPTIONS section', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ help: true }), output, en);
    expect(stdoutLines.join('')).toContain('OPTIONS');
  });

  it('output contains CONFIGURATION section', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ help: true }), output, en);
    expect(stdoutLines.join('')).toContain('CONFIGURATION');
  });

  it('parseCliArgs recognises -h as help flag', () => {
    const args: CliArgs = parseCliArgs(['-h']);
    expect(args.help).toBe(true);
  });
});

// =============================================================================
// --list-rules flag (in-process)
// =============================================================================

describe.concurrent('--list-rules flag', () => {
  it('exits with code 0', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(makeCliArgs({ listRules: true }), output, en);
    expect(code).toBe(0);
  });

  it('stdout contains "TypeScript rules:"', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);
    expect(stdoutLines.join('')).toContain('TypeScript rules:');
  });

  it('stdout contains "Package.json rules:"', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);
    expect(stdoutLines.join('')).toContain('Package.json rules:');
  });

  it('stdout contains known TypeScript rule "jsdoc/require-param"', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);
    expect(stdoutLines.join('')).toContain('jsdoc/require-param');
  });

  it('stdout contains known package.json rule "package/require-tsgo"', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);
    expect(stdoutLines.join('')).toContain('package/require-tsgo');
  });

  it('stdout contains known TypeScript rule "typescript/no-throw"', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);
    expect(stdoutLines.join('')).toContain('typescript/no-throw');
  });
});

// =============================================================================
// --json flag (in-process)
// =============================================================================

describe.concurrent('--json flag', () => {
  it('output is valid JSON when linting a known file', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        warnOnly: true,
      }),
      output,
      en,
    );
    expect(() => JSON.parse(stdoutLines.join(''))).not.toThrow();
  });

  it('JSON output is an array', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        warnOnly: true,
      }),
      output,
      en,
    );
    const parsed: unknown = JSON.parse(stdoutLines.join(''));
    expect(Array.isArray(parsed)).toBe(true);
  });
});

// =============================================================================
// Nonexistent path (in-process)
// =============================================================================

describe.concurrent('nonexistent path', () => {
  it('reports path not found and does not crash', async () => {
    const { stdoutLines, stderrLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({ paths: ['nonexistent_directory_abc123xyz'] }),
      output,
      en,
    );
    const combined: string = stdoutLines.join('') + stderrLines.join('');
    const handledGracefully: boolean =
      combined.includes('Path not found') || combined.includes('No lintable files');
    expect(handledGracefully).toBe(true);
    // Should not crash (code 2)
    expect(code).not.toBe(2);
  });
});

// =============================================================================
// --rule= filter (in-process)
// =============================================================================

describe.concurrent('--rule= filter', () => {
  it('exits with code 0 when filtering to a single known rule on a clean file', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        ruleIds: ['jsdoc/require-param'],
        warnOnly: true,
      }),
      output,
      en,
    );
    expect(code).toBe(0);
  });

  it('--json output only contains the filtered rule ID when results are present', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );
    const parsed = JSON.parse(stdoutLines.join('')) as Array<{ ruleId: string }>;
    expect(Array.isArray(parsed)).toBe(true);
    for (const result of parsed) {
      expect(result.ruleId).toBe('typescript/no-throw');
    }
    expect([0, 1]).toContain(code);
  });

  it('--json with an unrecognised rule ID produces an empty array', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        ruleIds: ['nonexistent/fake-rule'],
        warnOnly: true,
      }),
      output,
      en,
    );
    const parsed: unknown = JSON.parse(stdoutLines.join(''));
    expect(parsed).toEqual([]);
  });
});

// =============================================================================
// --warn-only flag (in-process)
// =============================================================================

describe.concurrent('--warn-only flag', () => {
  it('exits with code 0 even when linting a path that may have errors', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        warnOnly: true,
      }),
      output,
      en,
    );
    expect(code).toBe(0);
  });
});

// =============================================================================
// Linting a real file (in-process)
// =============================================================================

describe.concurrent('linting a real file', () => {
  it('exits with code 0 or 1 (not a crash code) when linting constants.ts', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
      }),
      output,
      en,
    );
    expect([0, 1]).toContain(code);
  });

  it('does not crash (exit 2) when given a valid file path', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
      }),
      output,
      en,
    );
    expect(code).not.toBe(2);
  });
});

// =============================================================================
// parseCliArgs
// =============================================================================

describe.concurrent('parseCliArgs', () => {
  it('parses --help flag', () => {
    const args: CliArgs = parseCliArgs(['--help']);
    expect(args.help).toBe(true);
  });

  it('parses --list-rules flag', () => {
    const args: CliArgs = parseCliArgs(['--list-rules']);
    expect(args.listRules).toBe(true);
  });

  it('parses --json flag', () => {
    const args: CliArgs = parseCliArgs(['--json']);
    expect(args.json).toBe(true);
  });

  it('parses --warn-only flag', () => {
    const args: CliArgs = parseCliArgs(['--warn-only']);
    expect(args.warnOnly).toBe(true);
  });

  it('parses positional paths', () => {
    const args: CliArgs = parseCliArgs(['foo.ts', 'bar.ts']);
    expect(args.paths).toEqual(['foo.ts', 'bar.ts']);
  });

  it('parses --rule= filter', () => {
    const args: CliArgs = parseCliArgs(['--rule=typescript/no-throw']);
    expect(args.ruleIds).toContain('typescript/no-throw');
  });
});
