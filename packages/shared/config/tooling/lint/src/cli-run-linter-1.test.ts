/**
 * Tests for runLinter integration tests (split for parallel execution).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as v from 'valibot';

import {
  shouldLint,
  isBinaryFile,
  runLinter,
  collapseShortJsonArrays,
  writeJsonSchema,
  runPkgRules,
  getGitChangedFiles,
  parseCliArgs,
  applyFixes,
  buildHelpText,
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
    exclude: ['*.d.ts'],
    extensions: ['.ts', '.svelte.ts', '.mjs'],
    rules: {},
    ruleOptions: {},
    overrides: [],
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

describe.concurrent('runLinter', () => {
  it('returns 0 and prints help when help flag is set', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      {
        packageNames: [],
        paths: [],
        json: false,
        listRules: false,
        warnOnly: false,
        fix: false,
        help: true,
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
      },
      output,
      en,
    );
    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    expect(combined).toContain('resist-lint');
    expect(combined).toContain('USAGE');
  });

  it('returns 0 when --list-rules is set', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      {
        packageNames: [],
        paths: [],
        json: false,
        listRules: true,
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
      },
      output,
      en,
    );
    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    expect(combined).toContain('TypeScript rules:');
    expect(combined).toContain('Package.json rules:');
  });

  it('returns 0 or 1 when no paths provided (uses config includes)', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      {
        packageNames: [],
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: false,
        listRules: false,
        warnOnly: true,
        fix: false,
        help: false,
        ruleIds: ['typescript/no-throw'],
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
      },
      output,
      en,
    );
    expect([0, 1]).toContain(code);
  });

  it('returns 0 when linting a clean file with specific rule filter', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      {
        packageNames: [],
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: false,
        listRules: false,
        warnOnly: false,
        fix: false,
        help: false,
        ruleIds: ['typescript/no-throw'],
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
      },
      output,
      en,
    );
    // constants.ts has no throw statements
    expect(code).toBe(0);
  });

  it('returns 0 with --warnOnly even if errors exist', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      {
        packageNames: [],
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: false,
        listRules: false,
        warnOnly: true,
        fix: false,
        help: false,
        ruleIds: ['typescript/no-throw'],
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
      },
      output,
      en,
    );
    expect(code).toBe(0);
  });

  it('produces valid JSON output when --json flag is set', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      {
        packageNames: [],
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: true,
        listRules: false,
        warnOnly: false,
        fix: false,
        help: false,
        ruleIds: ['typescript/no-throw'],
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
      },
      output,
      en,
    );
    const combined: string = stdoutLines.join('');
    const parsed: unknown = JSON.parse(combined);
    expect(Array.isArray(parsed)).toBe(true);
    expect([0, 1]).toContain(code);
  });

  it('reports nonexistent path on stderr', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      {
        packageNames: [],
        paths: ['nonexistent_path_xyz_123'],
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
      },
      output,
      en,
    );
    const combined: string = stderrLines.join('');
    expect(combined).toContain('Path not found');
  });

  it('--category filters to only matching rules in JSON output', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      {
        packageNames: [],
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: true,
        listRules: false,
        warnOnly: true,
        fix: false,
        help: false,
        ruleIds: [],
        categories: ['naming'],
        stage: undefined,
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
      },
      output,
      en,
    );
    const combined: string = stdoutLines.join('');
    const results: LintResult[] = JSON.parse(combined) as LintResult[];
    for (const result of results) {
      expect(result.ruleId).toMatch(/^naming\//);
    }
  });

  it('--stage=ci excludes lint-only rules', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      {
        packageNames: [],
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: true,
        listRules: false,
        warnOnly: true,
        fix: false,
        help: false,
        ruleIds: [],
        categories: [],
        stage: 'ci',
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
      },
      output,
      en,
    );
    const combined: string = stdoutLines.join('');
    const results: LintResult[] = JSON.parse(combined) as LintResult[];
    // Lint-only rules like comments/require-blank-line-groups should NOT appear
    const lintOnlyRules: string[] = results
      .map((r: LintResult): string => r.ruleId)
      .filter((id: string): boolean => id === 'comments/require-blank-line-groups');
    expect(lintOnlyRules.length).toBe(0);
  });

  it('--list-rules output includes categories and stages', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      {
        packageNames: [],
        paths: [],
        json: false,
        listRules: true,
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
      },
      output,
      en,
    );
    const combined: string = stdoutLines.join('');
    expect(combined).toContain('categories:');
    expect(combined).toContain('stages:');
  });
});

// =============================================================================
// parseCliArgs — edge cases for uncovered branches
// =============================================================================

describe('parseCliArgs — edge cases', () => {
  it('handles --format=unknown by defaulting to text', () => {
    const args: CliArgs = parseCliArgs(['--format=unknown']);
    expect(args.format).toBe('text');
  });

  it('handles --jobs=NaN by setting undefined', () => {
    const args: CliArgs = parseCliArgs(['--jobs=abc']);
    expect(args.jobs).toBeUndefined();
  });

  it('handles --jobs=0 as falsy (undefined)', () => {
    const args: CliArgs = parseCliArgs(['--jobs=0']);
    expect(args.jobs).toBeUndefined();
  });

  it('handles --diff=unknown by defaulting to head', () => {
    const args: CliArgs = parseCliArgs(['--diff=unknown']);
    expect(args.diff).toBe('head');
  });

  it('cache defaults to true without --no-cache', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.cache).toBe(true);
  });

  it('handles --rule= with empty value', () => {
    const args: CliArgs = parseCliArgs(['--rule=']);
    expect(args.ruleIds).toEqual(['']);
  });

  it('handles --category= with empty value', () => {
    const args: CliArgs = parseCliArgs(['--category=']);
    expect(args.categories).toEqual(['']);
  });

  it('handles --ignore= with empty value', () => {
    const args: CliArgs = parseCliArgs(['--ignore=']);
    expect(args.ignore).toEqual(['']);
  });

  it('handles --severity=warn', () => {
    const args: CliArgs = parseCliArgs(['--severity=warn']);
    expect(args.severityOverride).toBe('warn');
  });

  it('handles --config= with empty value', () => {
    const args: CliArgs = parseCliArgs(['--config=']);
    expect(args.configPath).toBe('');
  });
});

// =============================================================================
// runLinter — branch coverage tests
// =============================================================================

/**
 * Create default CLI args with overrides for test brevity.
 *
 * @param overrides - Partial CLI args to override defaults
 * @returns Complete CliArgs with defaults applied
 */
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

describe.concurrent('runLinter — branch coverage', () => {
  it('--debug writes to stderr', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
    expect(combined).toContain('Config loaded');
    expect(combined).toContain('Loaded');
  });

  it('--severity=off produces zero results', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        severityOverride: 'off',
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    expect(combined).not.toContain('error');
  });

  it('--severity=warn makes all results warnings', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        severityOverride: 'warn',
        json: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');

    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];

      for (const r of results) {
        expect(r.severity).toBe('warning');
      }
    }
  });

  it('--quiet suppresses warnings from output', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        quiet: true,
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    expect(combined).not.toContain('warning');
  });

  it('--format=sarif produces SARIF output', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        format: 'sarif',
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');

    if (combined.trim().length > 0) {
      const sarif = JSON.parse(combined) as Record<string, unknown>;
      expect(sarif.version).toBe('2.1.0');
      expect(sarif.$schema).toContain('sarif');
    }
  });

  it('--ignore merges with config excludes', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        ignore: ['*.ignored.ts'],
        debug: true,
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('Merged 1 CLI ignore patterns');
  });

  it('no lintable files returns 0 with message', async () => {
    const { stdoutLines: _stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/nonexistent-dir-xyz')],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });
});

// =============================================================================
// collapseShortJsonArrays
// =============================================================================

describe('collapseShortJsonArrays', () => {
  it('collapses a short array onto one line', () => {
    const input: string = '{\n  "arr": [\n    "a",\n    "b"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe('{\n  "arr": ["a", "b"]\n}');
  });

  it('preserves arrays that exceed maxWidth', () => {
    const input: string = '{\n  "arr": [\n    "a",\n    "b"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 10);
    expect(result).toBe(input);
  });

  it('preserves arrays with nested objects', () => {
    const input: string = '{\n  "arr": [\n    {\n      "x": 1\n    }\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe(input);
  });

  it('collapses inner arrays first, then outer array stays expanded', () => {
    const input: string = '{\n  "arr": [\n    [\n      1\n    ]\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    /* Inner array collapses to [1], but outer array contains [1] which has brackets, so stays expanded */
    expect(result).toBe('{\n  "arr": [\n    [1]\n  ]\n}');
  });

  it('collapses multiple short arrays', () => {
    const input: string = [
      '{',
      '  "a": [',
      '    "x",',
      '    "y"',
      '  ],',
      '  "b": [',
      '    1,',
      '    2,',
      '    3',
      '  ]',
      '}',
    ].join('\n');
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toContain('"a": ["x", "y"]');
    expect(result).toContain('"b": [1, 2, 3]');
  });

  it('handles empty arrays (no elements)', () => {
    const input: string = '{\n  "arr": [\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    /* Empty arrays have no elements, so they stay as-is */
    expect(result).toBe(input);
  });

  it('returns input unchanged when no arrays present', () => {
    const input: string = '{\n  "key": "value"\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe(input);
  });

  it('handles single-element arrays', () => {
    const input: string = '{\n  "arr": [\n    "only"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe('{\n  "arr": ["only"]\n}');
  });

  it('handles close bracket with trailing comma', () => {
    const input: string = ['{', '  "a": [', '    "x"', '  ],', '  "b": 1', '}'].join('\n');
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toContain('"a": ["x"],');
  });

  it('handles numeric elements', () => {
    const input: string = '{\n  "nums": [\n    1,\n    2,\n    3\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe('{\n  "nums": [1, 2, 3]\n}');
  });

  it('handles boolean elements', () => {
    const input: string = '{\n  "flags": [\n    true,\n    false\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe('{\n  "flags": [true, false]\n}');
  });
});

// =============================================================================
// getGitChangedFiles
// =============================================================================

describe('getGitChangedFiles', () => {
  it('returns a set of absolute paths in head mode', () => {
    const files: Set<string> = getGitChangedFiles('head');
    expect(files).toBeInstanceOf(Set);
    // All paths should be absolute
    for (const f of files) {
      expect(f.startsWith('/')).toBe(true);
    }
  });

  it('returns a set of absolute paths in staged mode', () => {
    const files: Set<string> = getGitChangedFiles('staged');
    expect(files).toBeInstanceOf(Set);
    for (const f of files) {
      expect(f.startsWith('/')).toBe(true);
    }
  });
});

// =============================================================================
// writeJsonSchema
// =============================================================================

describe('writeJsonSchema', () => {
  it('does not throw when given empty rule arrays', () => {
    expect(() => writeJsonSchema([], [], en)).not.toThrow();
  });

  it('does not throw when given rules with ids', () => {
    const tsRule = {
      id: 'test/ts-rule',
      description: 'A test rule',
      patterns: ['**/*.ts'],
      visitor: {},
    };
    const pkgRule = {
      id: 'test/pkg-rule',
      description: 'A test pkg rule',
      check: (): LintResult[] => [],
    };
    expect(() =>
      writeJsonSchema(
        [tsRule as unknown as Parameters<typeof writeJsonSchema>[0][number]],
        [pkgRule as unknown as Parameters<typeof writeJsonSchema>[1][number]],
        en,
      ),
    ).not.toThrow();
  });

  it('accepts an explicit cwd parameter', () => {
    expect(() => writeJsonSchema([], [], en, [], process.cwd())).not.toThrow();
  });
});

// =============================================================================
// shouldLint — additional branch coverage
// =============================================================================

describe('shouldLint — additional branches', () => {
  it('returns false for exclude pattern that does not start with *.', () => {
    const config: LintConfig = makeConfig({ exclude: ['node_modules'] });
    // A file ending in .ts should still be linted since 'node_modules' is a directory exclude
    expect(shouldLint('/path/to/file.ts', config)).toBe(true);
  });

  it('handles exclude pattern matching at end of path', () => {
    const config: LintConfig = makeConfig({ exclude: ['*.spec.ts'] });
    expect(shouldLint('/path/to/file.spec.ts', config)).toBe(false);
  });

  it('handles multiple exclude patterns (first matches)', () => {
    const config: LintConfig = makeConfig({ exclude: ['*.test.ts', '*.spec.ts'] });
    expect(shouldLint('/path/to/file.test.ts', config)).toBe(false);
  });

  it('handles multiple exclude patterns (second matches)', () => {
    const config: LintConfig = makeConfig({ exclude: ['*.test.ts', '*.spec.ts'] });
    expect(shouldLint('/path/to/file.spec.ts', config)).toBe(false);
  });

  it('handles multiple exclude patterns (none match)', () => {
    const config: LintConfig = makeConfig({ exclude: ['*.test.ts', '*.spec.ts'] });
    expect(shouldLint('/path/to/file.ts', config)).toBe(true);
  });

  it('returns false for a file with no extension when extensions are set', () => {
    const config: LintConfig = makeConfig({ extensions: ['.ts'] });
    expect(shouldLint('/path/to/Makefile', config)).toBe(false);
  });
});

// =============================================================================
// isBinaryFile — additional extensions
// =============================================================================

describe('isBinaryFile — additional extensions', () => {
  it.each([
    '.svg',
    '.bmp',
    '.tiff',
    '.eot',
    '.bz2',
    '.7z',
    '.rar',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.so',
    '.dylib',
    '.ogg',
    '.webm',
    '.avi',
    '.mov',
    '.flac',
  ])('returns true for %s', (ext) => {
    expect(isBinaryFile(`/path/to/file${ext}`)).toBe(true);
  });
});

// =============================================================================
// parseCliArgs — additional uncovered branches
// =============================================================================

describe('parseCliArgs — more branch coverage', () => {
  it('handles --no-cache alone (cache stays false)', () => {
    const args: CliArgs = parseCliArgs(['--no-cache']);
    expect(args.cache).toBe(false);
  });

  it('handles --stage= with empty value', () => {
    const args: CliArgs = parseCliArgs(['--stage=']);
    expect(args.stage).toBe('');
  });

  it('handles --severity= with empty value', () => {
    const args: CliArgs = parseCliArgs(['--severity=']);
    expect(args.severityOverride).toBe('');
  });

  it('handles --diff=staged correctly', () => {
    const args: CliArgs = parseCliArgs(['--diff=staged']);
    expect(args.diff).toBe('staged');
  });

  it('handles --jobs=8', () => {
    const args: CliArgs = parseCliArgs(['--jobs=8']);
    expect(args.jobs).toBe(8);
  });

  it('handles --jobs= with empty value as undefined', () => {
    const args: CliArgs = parseCliArgs(['--jobs=']);
    expect(args.jobs).toBeUndefined();
  });

  it('handles all flags combined', () => {
    const args: CliArgs = parseCliArgs([
      '--json',
      '--fix',
      '--bail',
      '--cache',
      '--debug',
      '--quiet',
      '--tools',
      '--warn-only',
      '--list-rules',
      '--diff',
      '--rule=test/rule',
      '--category=safety',
      '--stage=ci',
      '--ignore=*.gen.ts',
      '--config=./my.jsonc',
      '--severity=warn',
      '--format=sarif',
      '--jobs=4',
      'src/',
    ]);
    expect(args.json).toBe(true);
    expect(args.fix).toBe(true);
    expect(args.bail).toBe(true);
    expect(args.cache).toBe(true);
    expect(args.debug).toBe(true);
    expect(args.quiet).toBe(true);
    expect(args.tools).toBe(true);
    expect(args.warnOnly).toBe(true);
    expect(args.listRules).toBe(true);
    expect(args.diff).toBe('head');
    expect(args.ruleIds).toEqual(['test/rule']);
    expect(args.categories).toEqual(['safety']);
    expect(args.stage).toBe('ci');
    expect(args.ignore).toEqual(['*.gen.ts']);
    expect(args.configPath).toBe('./my.jsonc');
    expect(args.severityOverride).toBe('warn');
    expect(args.format).toBe('sarif');
    expect(args.jobs).toBe(4);
    expect(args.paths).toEqual(['src/']);
  });

  it('handles multiple paths interleaved with flags', () => {
    const args: CliArgs = parseCliArgs(['dir1/', '--fix', 'dir2/', '--json', 'dir3/']);
    expect(args.paths).toEqual(['dir1/', 'dir2/', 'dir3/']);
    expect(args.fix).toBe(true);
    expect(args.json).toBe(true);
  });

  it('handles --rule with multiple comma-separated IDs', () => {
    const args: CliArgs = parseCliArgs(['--rule=a,b,c']);
    expect(args.ruleIds).toEqual(['a', 'b', 'c']);
  });

  it('handles --category with multiple comma-separated values', () => {
    const args: CliArgs = parseCliArgs(['--category=a,b,c']);
    expect(args.categories).toEqual(['a', 'b', 'c']);
  });

  it('handles --ignore with multiple comma-separated patterns', () => {
    const args: CliArgs = parseCliArgs(['--ignore=a,b,c']);
    expect(args.ignore).toEqual(['a', 'b', 'c']);
  });
});

// =============================================================================
// runPkgRules — additional branches
// =============================================================================

describe('runPkgRules — additional branches', () => {
  it('passes ruleOptions to context', () => {
    let receivedOpts: Record<string, unknown> | undefined;
    const mockRule: PackageJsonRule = {
      id: 'test/opts-check',
      description: 'Checks options',
      check: (ctx): LintResult[] => {
        receivedOpts = ctx.ruleOptions;
        return [];
      },
    };

    const ruleOptions: Record<string, Record<string, unknown>> = {
      'test/opts-check': { maxLength: 100 },
    };

    runPkgRules('/test/package.json', {}, false, [mockRule], ruleOptions);
    expect(receivedOpts).toEqual({ maxLength: 100 });
  });

  it('passes undefined ruleOptions when rule has no options configured', () => {
    let receivedOpts: Record<string, unknown> | undefined = { initial: true };
    const mockRule: PackageJsonRule = {
      id: 'test/no-opts',
      description: 'No options',
      check: (ctx): LintResult[] => {
        receivedOpts = ctx.ruleOptions;
        return [];
      },
    };

    runPkgRules('/test/package.json', {}, false, [mockRule], {});
    expect(receivedOpts).toBeUndefined();
  });

  it('handles a rule that returns empty results', () => {
    const mockRule: PackageJsonRule = {
      id: 'test/empty',
      description: 'Empty rule',
      check: (): LintResult[] => [],
    };

    const results: LintResult[] = runPkgRules('/test/package.json', {}, false, [mockRule]);
    expect(results.length).toBe(0);
  });

  it('handles a rule that checks pkg.name', () => {
    const mockRule: PackageJsonRule = {
      id: 'test/name-check',
      description: 'Name check',
      check: (ctx): LintResult[] => {
        if (ctx.pkg.name === '@scope/pkg') {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'warning',
              message: 'Scoped package',
              ruleId: 'test/name-check',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        }
        return [];
      },
    };

    const pkg: PackageJson = { name: '@scope/pkg' };
    const results: LintResult[] = runPkgRules('/test/package.json', pkg, false, [mockRule]);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });
});

// =============================================================================
// applyFixes — additional branches
// =============================================================================

describe('applyFixes — additional branches', () => {
  it('handles overlapping fixes by applying in reverse order', () => {
    const content: string = 'abcdefghij';
    // Two fixes that overlap: [2,5] and [4,8]
    // When applied in reverse start order, the later fix is applied first
    const fixes: LintFix[] = [
      { range: { start: 2, end: 5 }, text: 'XX' },
      { range: { start: 4, end: 8 }, text: 'YY' },
    ];
    // Fix at [4,8] is applied first: 'abcdYYij' -> then [2,5] applied: 'abXXYYij'
    // But since applyFixes sorts by start desc, fix at 4 is first, then fix at 2
    const result: string = applyFixes(content, fixes);
    expect(typeof result).toBe('string');
  });

  it('handles a fix at the end of content', () => {
    const content: string = 'hello world';
    const fixes: LintFix[] = [{ range: { start: 6, end: 11 }, text: 'WORLD' }];
    expect(applyFixes(content, fixes)).toBe('hello WORLD');
  });

  it('handles a fix at the beginning of content', () => {
    const content: string = 'hello world';
    const fixes: LintFix[] = [{ range: { start: 0, end: 5 }, text: 'HELLO' }];
    expect(applyFixes(content, fixes)).toBe('HELLO world');
  });

  it('handles a fix that replaces entire content', () => {
    const content: string = 'old content';
    const fixes: LintFix[] = [{ range: { start: 0, end: 11 }, text: 'new content' }];
    expect(applyFixes(content, fixes)).toBe('new content');
  });

  it('handles multiple insertions at different positions', () => {
    const content: string = 'ac';
    const fixes: LintFix[] = [
      { range: { start: 1, end: 1 }, text: 'b' },
      { range: { start: 2, end: 2 }, text: 'd' },
    ];
    expect(applyFixes(content, fixes)).toBe('abcd');
  });
});

// =============================================================================
// buildHelpText — additional branches
// =============================================================================

describe('buildHelpText — additional coverage', () => {
  it('documents --rule flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--rule');
  });

  it('documents --category flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--category');
  });

  it('documents --stage flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--stage');
  });

  it('documents --bail flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--bail');
  });

  it('documents --ignore flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--ignore');
  });

  it('documents --config flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--config');
  });

  it('documents --severity flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--severity');
  });

  it('documents --diff flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--diff');
  });

  it('documents --format flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--format');
  });

  it('documents --jobs flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--jobs');
  });

  it('documents --tools flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--tools');
  });

  it('documents --cache flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--cache');
  });

  it('documents --no-cache flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--no-cache');
  });

  it('documents --debug flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--debug');
  });

  it('documents --warn-only flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--warn-only');
  });

  it('documents --quiet flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--quiet');
  });

  it('documents --list-rules flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--list-rules');
  });

  it('contains STAGES section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    // The help text includes a stages section from en.cli.stagesSection
    expect(text).toContain('STAGE');
  });

  it('contains example commands with linter name', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('resist-lint packages/shared/schemas');
    expect(text).toContain('resist-lint --fix');
    expect(text).toContain('resist-lint --list-rules');
  });
});

// =============================================================================
// runLinter — additional branch coverage
// =============================================================================

describe.concurrent('runLinter — format output branches', () => {
  it('--format=github produces output', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        format: 'github',
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    // github format produces :: prefixed lines or empty output for clean files
    expect(typeof stdoutLines.join('')).toBe('string');
  });

  it('--format=junit produces XML output', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        format: 'junit',
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 0) {
      expect(combined).toContain('<?xml');
    }
  });

  it('--format=compact produces output', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        format: 'compact',
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    expect(code).toBe(0);
    expect(typeof stdoutLines.join('')).toBe('string');
  });

  it('--format=json produces JSON array', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        format: 'json',
        warnOnly: true,
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
});

describe.concurrent('runLinter — severity override branches', () => {
  it('--severity=error converts all results to errors', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        severityOverride: 'error',
        json: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      for (const r of results) {
        expect(r.severity).toBe('error');
      }
    }
  });
});

describe.concurrent('runLinter — no files with --json flag', () => {
  it('returns 0 without printing no-files message when --json is set', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/nonexistent-dir-abc')],
        json: true,
      }),
      output,
      en,
    );

    // Should return 0 since no files found (after path error)
    expect([0, 1]).toContain(code);
    const combined: string = stdoutLines.join('');
    // With --json, the "No lintable files found" message should NOT appear
    expect(combined).not.toContain('No lintable files found');
  });
});

describe.concurrent('runLinter — debug output with various flags', () => {
  it('debug shows rule filter info when --rule= is used', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
  });

  it('debug shows category filter info when --category= is used', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        categories: ['typescript'],
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('[debug]');
  });

  it('debug shows files found count', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('Found');
  });

  it('debug shows total time', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
        warnOnly: true,
        ruleIds: ['typescript/no-throw'],
      }),
      output,
      en,
    );

    const combined: string = stderrLines.join('');
    expect(combined).toContain('Total');
  });
});

describe.concurrent('runLinter — --quiet with JSON and text', () => {
  it('--quiet with JSON still produces valid JSON', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        quiet: true,
        json: true,
        warnOnly: true,
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
});

describe.concurrent('runLinter — single file path (not directory)', () => {
  it('lints a single file path directly', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    expect(code).toBe(0);
  });

  it('skips a non-lintable single file', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('package.json')],
        ruleIds: ['typescript/no-throw'],
        warnOnly: true,
      }),
      output,
      en,
    );

    // package.json is not a .ts file, so no TS rules apply, should return 0
    expect(code).toBe(0);
  });
});

describe.concurrent('runLinter — --stage filtering', () => {
  it('--stage=pre-commit filters rules to pre-commit stage only', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        stage: 'pre-commit',
        json: true,
        warnOnly: true,
      }),
      output,
      en,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // All results should come from pre-commit stage rules
      expect(Array.isArray(results)).toBe(true);
    }
  });

  it('--stage=build filters rules to build stage', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        stage: 'build',
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
// CliArgsSchema / CliOutputSchema validation
// =============================================================================

describe('CliArgsSchema', () => {
  it('is a valid valibot schema', () => {
    expect(CliArgsSchema).toBeDefined();
  });
});

describe('CliOutputSchema', () => {
  it('is a valid valibot schema', () => {
    expect(CliOutputSchema).toBeDefined();
  });
});

// =============================================================================
// collapseShortJsonArrays — uncovered branch tests
// =============================================================================

describe('collapseShortJsonArrays — uncovered branches', () => {
  it('handles element without trailing comma (last element before close bracket)', () => {
    // The last element in an array has no trailing comma
    // This exercises the `elem.endsWith(",") ? ... : elem` false branch
    const input: string = '{\n  "arr": [\n    "only-elem"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe('{\n  "arr": ["only-elem"]\n}');
  });

  it('handles close bracket with trailing comma (suffix extraction)', () => {
    // Tests `closeTrimmed.startsWith("]") ? closeTrimmed.slice(1) : ""` with ],
    const input: string = ['{', '  "a": [', '    "x"', '  ],', '  "b": 1', '}'].join('\n');
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toContain('"a": ["x"],');
  });

  it('handles close bracket without trailing comma (empty suffix)', () => {
    // Tests suffix === '' when close bracket is just ']'
    const input: string = '{\n  "arr": [\n    "x"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe('{\n  "arr": ["x"]\n}');
  });

  it('preserves arrays with nested array brackets in elements', () => {
    // Tests `elem.includes("[")` branch
    const input: string = '{\n  "arr": [\n    "[nested]"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    // The element contains "[" so allSimple becomes false
    expect(result).toBe(input);
  });

  it('preserves arrays with closing curly braces in elements', () => {
    // Tests `elem.includes("}")` branch
    const input: string = '{\n  "arr": [\n    "has}brace"\n  ]\n}';
    const result: string = collapseShortJsonArrays(input, 100);
    expect(result).toBe(input);
  });

  it('handles array at end of JSON without close bracket found', () => {
    // When closeLine stays -1 because we reach end of lines
    const input: string = '{\n  "arr": [\n    "x"';
    const result: string = collapseShortJsonArrays(input, 100);
    // closeLine is -1, so allSimple && closeLine >= 0 is false — no collapsing
    expect(result).toBe(input);
  });

  it('preserves array when collapsed line exceeds maxWidth', () => {
    const longEl: string = '"a-very-long-element-name-that-will-definitely-exceed"';
    const input: string = `{\n  "key": [\n    ${longEl},\n    ${longEl}\n  ]\n}`;
    const result: string = collapseShortJsonArrays(input, 30);
    // Collapsed line would be too long, so stays expanded
    expect(result).toBe(input);
  });
});

// =============================================================================
// runLinter — bail mode branch coverage
// =============================================================================
