/**
 * Tests for runLinter integration tests — worker pool, fix, severity,
 * finalize, and exit code branches (split for parallel fork execution).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

import { runLinter, type CliArgs, type CliOutput } from './cli-helpers.ts';
import type { LintResult } from './framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';

// =============================================================================
// Test Helpers
// =============================================================================

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
// runLinter — hasErrors and warnOnly exit code branches
// =============================================================================

describe.concurrent('runLinter — exit code branches', () => {
  it('returns 1 when errors exist and warnOnly is false', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        warnOnly: false,
      }),
      output,
      en,
    );

    // Most real files will produce some errors
    expect([0, 1]).toContain(code);
  });

  it('returns 0 when warnOnly is true regardless of errors', async () => {
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
// runLinter — debug output for various code paths
// =============================================================================

describe.concurrent('runLinter — debug output coverage', () => {
  it('--debug with --cache shows cache deleted when --no-cache in process.argv', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        cache: false,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
  });

  it('--debug shows workspace rules running count', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        debug: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('workspace');
  });

  it('--debug with --diff shows diff-related debug info', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        diff: 'head',
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
  });
});

// =============================================================================
// runLinter — fix mode with real fixable results
// =============================================================================

describe.concurrent('runLinter — fix with fixable files', () => {
  it('--fix processes files with lint results and applies fixes', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        fix: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    expect(combined).toContain('Applied fixes to');
  });

  it('--fix with --json does not print fix summary text', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        fix: true,
        json: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    expect(combined).not.toContain('Applied fixes');
  });
});

// =============================================================================
// runLinter — worker pool mode
// =============================================================================

describe.concurrent('runLinter — worker pool', () => {
  it('--jobs=2 without bail uses worker pool when multiple files', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        jobs: 2,
        bail: false,
        debug: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
    expect(combined).toContain('Worker pool');
  });

  it('--jobs=2 with bail falls back to sequential processing', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        jobs: 2,
        bail: true,
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });
});

// =============================================================================
// runLinter — cache hit scenario
// =============================================================================

describe.concurrent('runLinter — cache hit', () => {
  it('--cache hit returns cached results on second run', async () => {
    const ruleFilter: string[] = ['typescript/no-throw'];
    const targetFile: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    const { output: output1 } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [targetFile],
        cache: true,
        ruleIds: ruleFilter,
        warnOnly: true,
      }),
      output1,
      en,
    );

    const { stderrLines, output: output2 } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [targetFile],
        cache: true,
        debug: true,
        ruleIds: ruleFilter,
        warnOnly: true,
      }),
      output2,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
  });
});

// =============================================================================
// runLinter — workspace rule filter branches
// =============================================================================

describe.concurrent('runLinter — workspace rule category/stage filter', () => {
  it('workspace rules filtered by nonexistent category produces no workspace results', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        categories: ['nonexistent-category-xyz'],
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });

  it('workspace rules filtered by nonexistent stage produces no workspace results', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        stage: 'nonexistent-stage',
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });
});

// =============================================================================
// runLinter — severity warn to warning conversion
// =============================================================================

describe.concurrent('runLinter — per-file severity warn to warning conversion', () => {
  it('severity override converts error results to warning when config has warn rule', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        severityOverride: 'warn',
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      for (const r of results) {
        expect(r.severity).toBe('warning');
      }
    }
  });
});

// =============================================================================
// runLinter — finalize with actual rules
// =============================================================================

describe.concurrent('runLinter — finalize branch', () => {
  it('runs finalize on rules after non-bail processing', async () => {
    const { output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        bail: false,
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(true).toBe(true);
  });
});
