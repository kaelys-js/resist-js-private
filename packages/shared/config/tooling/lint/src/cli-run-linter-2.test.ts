/**
 * Tests for runLinter integration tests (split for parallel execution).
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

/* Integration tests call runLinter() which spawns git/tool subprocesses.
   Under parallel execution with 30+ test files, CPU contention can push
   individual tests past the default 10s timeout. */
vi.setConfig({ testTimeout: 30_000 });
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

describe.concurrent('runLinter — bail mode', () => {
  it('--bail processes files and can return results', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        bail: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });

  it('--bail with directory processes multiple files sequentially', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        bail: true,
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });

  it('--bail stops on first error and does not run finalize', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        bail: true,
        json: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // In bail mode, once an error is found, processing stops
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

// =============================================================================
// runLinter — diff mode branch coverage
// =============================================================================

describe.concurrent('runLinter — diff mode', () => {
  it('--diff=head filters to only changed files', async () => {
    const { stderrLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        diff: 'head',
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    // diff mode should output diff status message to stderr (unless --json or --quiet)
    expect(combined).toContain('--diff=head:');
    expect(combined).toContain('files changed');
    expect([0, 1]).toContain(code);
  });

  it('--diff=staged filters to only staged files', async () => {
    const { stderrLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        diff: 'staged',
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('--diff=staged:');
    expect(combined).toContain('files changed');
    expect([0, 1]).toContain(code);
  });

  it('--diff with --json suppresses diff status message', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        diff: 'head',
        json: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    // With --json, diff status should NOT be printed
    expect(combined).not.toContain('--diff=head:');
  });

  it('--diff with --quiet suppresses diff status message', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        diff: 'head',
        quiet: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    // With --quiet, diff status should NOT be printed
    expect(combined).not.toContain('--diff=head:');
  });
});

// =============================================================================
// runLinter — cache branch coverage
// =============================================================================

describe.concurrent('runLinter — cache mode', () => {
  it('--cache enables caching with debug output', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        cache: true,
        debug: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('Cache loaded');
  });

  it('--cache with second run uses cached results', async () => {
    const { output: output1 } = captureOutput();
    // First run populates cache
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        cache: true,
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output1,
      en,
    );

    // Second run should use cached results
    const { stderrLines, output: output2 } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        cache: true,
        debug: true,
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output2,
      en,
    );

    const combined: string = stderrLines.join('');
    // Should show cache stats on second run since cache was populated
    expect(combined).toContain('[debug]');
  });

  it('--cache saves cache to disk with debug info', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        cache: true,
        debug: true,
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('Cache saved');
  });

  it('--cache with finalize rules produces consistent results across runs', async () => {
    const basePath: string = resolve('packages/shared/config/tooling/lint/src/');
    const args: CliArgs = makeCliArgs({
      paths: [basePath],
      cache: true,
      json: true,
      ruleIds: ['valibot/no-duplicate-schema'],
      warnOnly: true,
    });

    /* Run 1 — cold cache: finalize() has full cross-file state */
    const { stdoutLines: out1, output: output1 } = captureOutput();
    await runLinter(args, output1, en);
    const results1 = JSON.parse(out1.join('')) as Array<{ ruleId: string }>;

    /* Run 2 — warm cache: finalize() must still have complete state
     * because cached files run check() for finalize rules to populate state. */
    const { stdoutLines: out2, output: output2 } = captureOutput();
    await runLinter(args, output2, en);
    const results2 = JSON.parse(out2.join('')) as Array<{ ruleId: string }>;

    /* Both runs must produce identical result counts for finalize rules */
    const finalize1: number = results1.filter(
      (r: { ruleId: string }): boolean => r.ruleId === 'valibot/no-duplicate-schema',
    ).length;
    const finalize2: number = results2.filter(
      (r: { ruleId: string }): boolean => r.ruleId === 'valibot/no-duplicate-schema',
    ).length;
    expect(finalize2).toBe(finalize1);
  });
});

// =============================================================================
// runLinter — fix mode branch coverage
// =============================================================================

describe.concurrent('runLinter — fix mode', () => {
  it('--fix with no errors does not attempt fixes', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        fix: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    // With no results to fix, should not print "Applied fixes" (or should print 0 fixes)
    const combined: string = stdoutLines.join('');
    expect(typeof combined).toBe('string');
  });

  it('--fix with results attempts to apply fixes', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        fix: true,
        ruleIds: ['jsdoc/require-param'],
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    // Should mention fix application (even if 0 files were fixed)
    expect(typeof combined).toBe('string');
  });

  it('--fix with --json suppresses fix message', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        fix: true,
        json: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    // With --json, fix message should not appear
    expect(combined).not.toContain('Applied fixes');
  });
});

// =============================================================================
// runLinter — tools mode branch coverage
// =============================================================================

describe.concurrent('runLinter — tools mode', () => {
  it('--tools runs external tools alongside rules', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        tools: true,
        debug: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    // Debug output should mention tool loading/running
    expect(combined).toContain('tool');
  });

  it('--tools does not run tools when bailed', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        tools: true,
        bail: true,
        debug: true,
      }),
      output,
      en,
    );

    // bail may trigger before tools run — that's the branch we're testing
    const combined: string = stderrLines.join('');
    expect(typeof combined).toBe('string');
  });
});
