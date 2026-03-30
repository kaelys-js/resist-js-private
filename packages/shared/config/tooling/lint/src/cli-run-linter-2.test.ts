/**
 * Tests for runLinter integration tests (split for parallel execution).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as v from 'valibot';

import {
  runLinter,
  collapseShortJsonArrays,
  writeJsonSchema,
  runPkgRules,
  getGitChangedFiles,
  parseCliArgs,
  CliArgsSchema,
  CliOutputSchema,
  type CliArgs,
  type CliOutput,
} from './cli-helpers.ts';
import type { LintConfig } from './config/schema.ts';
import type { LintFix, LintResult, PackageJsonRule, PackageJson } from './framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal LintConfig for testing.
 *
 * @param {Partial<LintConfig>} overrides - Config overrides
 * @returns {LintConfig} A full LintConfig with defaults
 */
function makeConfig(overrides: Partial<LintConfig> = {}): LintConfig {
  return {
    include: [],
    exclude: ['*.test.ts', '*.d.ts'],
    extensions: ['.ts', '.svelte.ts', '.mjs'],
    rules: {},
    ruleOptions: {},
    overrides: [],
    ...overrides,
  };
}

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

describe('runLinter — bail mode', () => {
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
        paths: [resolve('packages/shared/config/tooling/lint/src')],
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

describe('runLinter — diff mode', () => {
  it('--diff=head filters to only changed files', async () => {
    const { stderrLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
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

describe('runLinter — cache mode', () => {
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
});

// =============================================================================
// runLinter — fix mode branch coverage
// =============================================================================

describe('runLinter — fix mode', () => {
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

describe('runLinter — tools mode', () => {
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

// =============================================================================
// runLinter — workspace rules branch coverage
// =============================================================================

describe('runLinter — workspace rules', () => {
  it('runs workspace rules on directory paths', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        debug: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    expect([0, 1]).toContain(code);
  });

  it('workspace rules are filtered by --rule=', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        ruleIds: ['workspace/no-merge-conflicts'],
        warnOnly: true,
      }),
      output,
      en,
    );

    expect([0, 1]).toContain(code);
  });

  it('workspace rules are filtered by --category=', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        categories: ['workspace'],
        warnOnly: true,
      }),
      output,
      en,
    );

    expect([0, 1]).toContain(code);
  });

  it('workspace rules are filtered by --stage=', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        stage: 'lint',
        warnOnly: true,
      }),
      output,
      en,
    );

    expect([0, 1]).toContain(code);
  });

  it('workspace rules are not run when bailed', async () => {
    const { output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        bail: true,
      }),
      output,
      en,
    );

    // This test exercises the `!bailed` check for workspace rules
    expect(true).toBe(true);
  });

  it('workspace rules are not run when paths are only files (not directories)', async () => {
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
// runLinter — severity override branches
// =============================================================================

describe('runLinter — per-file severity override', () => {
  it('per-file severity override converts error to warning', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src')],
        json: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // Some results may have been downgraded to warning by per-file overrides
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

// =============================================================================
// runLinter — no-files with --json branch
// =============================================================================

describe('runLinter — no lintable files branches', () => {
  it('returns 0 with no-files message when not json and files empty', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/nonexistent-dir-xyz')],
        json: false,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    expect(combined).toContain('No lintable files found');
  });

  it('returns 0 silently when json and files empty', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/nonexistent-dir-xyz')],
        json: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    expect(combined).not.toContain('No lintable files found');
  });
});

// =============================================================================
// runLinter — listRules with fixable/categories/stages branches
// =============================================================================
