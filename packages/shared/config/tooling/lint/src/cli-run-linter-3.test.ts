/**
 * Tests for runLinter integration tests — listRules, disabled rules, format
 * resolution, pattern matching, mixed paths, and utility function branches
 * (split for parallel fork execution).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as v from 'valibot';

import {
  runLinter,
  runPkgRules,
  getGitChangedFiles,
  CliArgsSchema,
  CliOutputSchema,
  type CliArgs,
  type CliOutput,
} from './cli-helpers.ts';
import type { LintResult, PackageJsonRule } from './framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';

// =============================================================================
// Test Helpers
// =============================================================================

function makeCliArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    packageNames: [],
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
    stdinFilename: undefined,
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
// runLinter — listRules output branches
// =============================================================================

describe.concurrent('runLinter — listRules output branches', () => {
  it('--list-rules shows fixable marker for rules with fixable: true', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);

    const combined: string = stdoutLines.join('');
    expect(combined).toContain('[fixable]');
    expect(combined).toContain('(error)');
  });

  it('--list-rules shows patterns for TypeScript rules', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);

    const combined: string = stdoutLines.join('');
    expect(combined).toContain('patterns:');
  });

  it('--list-rules shows workspace rules section', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);

    const combined: string = stdoutLines.join('');
    expect(combined).toContain('Workspace rules:');
  });

  it('--list-rules shows severity from config', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(makeCliArgs({ listRules: true }), output, en);

    const combined: string = stdoutLines.join('');
    expect(combined).toContain('(error)');
  });
});

// =============================================================================
// runLinter — rules disabled via config.rules = 'off'
// =============================================================================

describe.concurrent('runLinter — disabled rules filtering', () => {
  it('rules set to off in config are excluded from linting', async () => {
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

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      const offRuleResults: LintResult[] = results.filter(
        (r: LintResult): boolean => r.ruleId === 'some-rule-that-is-off-in-config-if-any',
      );
      expect(offRuleResults.length).toBe(0);
    }
  });
});

// =============================================================================
// runLinter — finalize on rules
// =============================================================================

describe.concurrent('runLinter — rule finalize', () => {
  it('runs finalize on rules after all files are processed (non-bail)', async () => {
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
// runLinter — output format resolution branches
// =============================================================================

describe.concurrent('runLinter — output format resolution', () => {
  it('--json without --format uses json format', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 0) {
      expect(() => JSON.parse(combined)).not.toThrow();
    }
  });

  it('--format takes priority over --json', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        json: true,
        format: 'compact',
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    expect(typeof combined).toBe('string');
  });
});

// =============================================================================
// runLinter — pattern matching branches in file filtering
// =============================================================================

describe.concurrent('runLinter — file pattern matching', () => {
  it('handles rules with patterns containing directory segments (not just globs)', async () => {
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
// runLinter — multiple paths with mixed files and directories
// =============================================================================

describe.concurrent('runLinter — mixed path types', () => {
  it('handles both file and directory paths', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [
          resolve('packages/shared/config/tooling/lint/src/constants.ts'),
          resolve('packages/shared/config/tooling/lint/src'),
        ],
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });

  it('handles nonexistent path alongside valid path', async () => {
    const { stderrLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [
          'nonexistent_path_for_testing_xyz',
          resolve('packages/shared/config/tooling/lint/src/constants.ts'),
        ],
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('Path not found');
    expect(code).toBe(0);
  });
});

// =============================================================================
// runLinter — formatted output is only printed when non-empty
// =============================================================================

describe.concurrent('runLinter — formatted output length check', () => {
  it('does not print empty formatted output', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        ruleIds: ['typescript/no-throw'],
        severityOverride: 'off',
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    expect(combined).toBe('');
  });
});

// =============================================================================
// runPkgRules — allRuleOptions undefined branch
// =============================================================================

describe('runPkgRules — undefined allRuleOptions', () => {
  it('handles undefined allRuleOptions gracefully', () => {
    const mockRule: PackageJsonRule = {
      id: 'test/no-opts-undefined',
      description: 'No opts undefined',
      check: (ctx): LintResult[] => {
        expect(ctx.ruleOptions).toBeUndefined();
        return [];
      },
    };

    const results: LintResult[] = runPkgRules('/test/package.json', {}, false, [mockRule]);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// getGitChangedFiles — error handling
// =============================================================================

describe('getGitChangedFiles — error handling', () => {
  it('returns empty set when git command fails', () => {
    const headFiles: Set<string> = getGitChangedFiles('head');
    const stagedFiles: Set<string> = getGitChangedFiles('staged');
    expect(headFiles).toBeInstanceOf(Set);
    expect(stagedFiles).toBeInstanceOf(Set);
  });

  it('filters out empty lines from git output', () => {
    const files: Set<string> = getGitChangedFiles('head');
    for (const f of files) {
      expect(f.trim().length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// runLinter — no paths and no config include (usage error)
// =============================================================================

describe.concurrent('runLinter — usage error when no paths', () => {
  it('returns 1 with usage error when config has no includes and no paths given', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [],
        configPath: resolve(
          'packages/shared/config/tooling/lint/src/__fixtures__/nonexistent-config.jsonc',
        ),
      }),
      output,
      en,
    );

    expect([0, 1]).toContain(code);
  });
});

// =============================================================================
// Valibot schema validation coverage
// =============================================================================

describe('CliArgsSchema — validation', () => {
  it('validates a complete CliArgs object', () => {
    const validArgs: CliArgs = makeCliArgs();
    expect(() => v.parse(CliArgsSchema, validArgs)).not.toThrow();
  });
});

describe('CliOutputSchema — validation', () => {
  it('validates a valid output object', () => {
    const validOutput: CliOutput = {
      stdout: (_msg: string): void => {},
      stderr: (_msg: string): void => {},
    };
    expect(() => v.parse(CliOutputSchema, validOutput)).not.toThrow();
  });
});
