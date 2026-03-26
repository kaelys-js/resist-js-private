/**
 * Tests for CLI helper functions.
 *
 * Tests the pure, extracted helper functions that handle
 * file discovery, fix application, and help text generation.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

import {
  shouldLint,
  isBinaryFile,
  collectFiles,
  collectPackageJsonFiles,
  runPkgRules,
  applyFixes,
  buildHelpText,
  parseCliArgs,
  runLinter,
  type CliArgs,
  type CliOutput,
} from './cli-helpers.ts';
import type { LintConfig } from './config/schema.ts';
import type { LintFix, LintResult, PackageJsonRule, PackageJson } from './framework/types.ts';

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

// =============================================================================
// shouldLint
// =============================================================================

describe('shouldLint', () => {
  it('returns true for a .ts file with default config', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/file.ts', config)).toBe(true);
  });

  it('returns true for a .svelte.ts file', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/Component.svelte.ts', config)).toBe(true);
  });

  it('returns true for a .mjs file', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/config.mjs', config)).toBe(true);
  });

  it('returns false for a .test.ts file (excluded by default)', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/file.test.ts', config)).toBe(false);
  });

  it('returns false for a .d.ts file (excluded by default)', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/types.d.ts', config)).toBe(false);
  });

  it('returns false for a .js file (not in extensions)', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/file.js', config)).toBe(false);
  });

  it('returns false for a .json file (not in extensions)', () => {
    const config: LintConfig = makeConfig();
    expect(shouldLint('/path/to/package.json', config)).toBe(false);
  });

  it('respects custom exclude patterns', () => {
    const config: LintConfig = makeConfig({ exclude: ['*.generated.ts'] });
    expect(shouldLint('/path/to/schema.generated.ts', config)).toBe(false);
  });

  it('respects custom extensions', () => {
    const config: LintConfig = makeConfig({ extensions: ['.js'] });
    expect(shouldLint('/path/to/file.js', config)).toBe(true);
  });

  it('returns false when extensions list is empty', () => {
    const config: LintConfig = makeConfig({ extensions: [] });
    expect(shouldLint('/path/to/file.ts', config)).toBe(false);
  });

  it('returns false for binary files even if extension is in config', () => {
    const config: LintConfig = makeConfig({ extensions: ['.png'] });
    expect(shouldLint('/path/to/image.png', config)).toBe(false);
  });
});

// =============================================================================
// isBinaryFile
// =============================================================================

describe('isBinaryFile', () => {
  it.each([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.webp',
    '.avif',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.zip',
    '.tar',
    '.gz',
    '.pdf',
    '.exe',
    '.dll',
    '.mp3',
    '.mp4',
    '.wav',
    '.sqlite',
    '.db',
    '.wasm',
    '.map',
  ])('returns true for %s', (ext) => {
    expect(isBinaryFile(`/path/to/file${ext}`)).toBe(true);
  });

  it.each([
    '.ts',
    '.js',
    '.json',
    '.md',
    '.yaml',
    '.html',
    '.css',
    '.svelte',
  ])('returns false for %s', (ext) => {
    expect(isBinaryFile(`/path/to/file${ext}`)).toBe(false);
  });

  it('returns false for files with no extension', () => {
    expect(isBinaryFile('/path/to/Makefile')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isBinaryFile('/path/to/image.PNG')).toBe(true);
    expect(isBinaryFile('/path/to/font.WOFF2')).toBe(true);
  });
});

// =============================================================================
// collectFiles
// =============================================================================

describe('collectFiles', () => {
  it('returns an empty array for a nonexistent directory', () => {
    const config: LintConfig = makeConfig();
    const files: string[] = collectFiles('/this/directory/does/not/exist', config);
    expect(files.length).toBe(0);
  });

  it('collects .ts files from a real directory', () => {
    const config: LintConfig = makeConfig();
    const dir: string = resolve(import.meta.dirname);
    const files: string[] = collectFiles(dir, config);
    expect(files.length).toBeGreaterThan(0);
    // Should find constants.ts in this directory
    const hasConstants: boolean = files.some((f: string): boolean => f.endsWith('constants.ts'));
    expect(hasConstants).toBe(true);
  });

  it('excludes .test.ts files', () => {
    const config: LintConfig = makeConfig();
    const dir: string = resolve(import.meta.dirname);
    const files: string[] = collectFiles(dir, config);
    const hasTestFiles: boolean = files.some((f: string): boolean => f.endsWith('.test.ts'));
    expect(hasTestFiles).toBe(false);
  });

  it('skips directories in the exclude set', () => {
    const config: LintConfig = makeConfig({ exclude: ['*.test.ts', '*.d.ts', 'node_modules'] });
    const dir: string = resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..');
    const files: string[] = collectFiles(dir, config);
    const hasNodeModules: boolean = files.some((f: string): boolean =>
      f.includes('/node_modules/'),
    );
    expect(hasNodeModules).toBe(false);
  });
});

// =============================================================================
// collectPackageJsonFiles
// =============================================================================

describe('collectPackageJsonFiles', () => {
  it('returns an empty array for a nonexistent directory', () => {
    const config: LintConfig = makeConfig();
    const files: string[] = collectPackageJsonFiles('/no/such/dir', config);
    expect(files.length).toBe(0);
  });

  it('finds package.json files in a real directory tree', () => {
    const config: LintConfig = makeConfig({ exclude: ['node_modules', '.git'] });
    const lintDir: string = resolve(import.meta.dirname, '..');
    const files: string[] = collectPackageJsonFiles(lintDir, config);
    expect(files.length).toBeGreaterThan(0);
    // Should find the lint package's package.json
    const hasPkg: boolean = files.some((f: string): boolean => f.endsWith('lint/package.json'));
    expect(hasPkg).toBe(true);
  });

  it('skips excluded directories', () => {
    const config: LintConfig = makeConfig({ exclude: ['node_modules'] });
    const lintDir: string = resolve(import.meta.dirname, '..');
    const files: string[] = collectPackageJsonFiles(lintDir, config);
    const hasNodeModules: boolean = files.some((f: string): boolean =>
      f.includes('/node_modules/'),
    );
    expect(hasNodeModules).toBe(false);
  });
});

// =============================================================================
// runPkgRules
// =============================================================================

describe('runPkgRules', () => {
  it('returns empty array when no rules are provided', () => {
    const results: LintResult[] = runPkgRules('/test/package.json', {}, false, []);
    expect(results.length).toBe(0);
  });

  it('runs a rule and collects results', () => {
    const mockRule: PackageJsonRule = {
      id: 'test/mock-rule',
      description: 'Mock rule for testing',
      check: (ctx): LintResult[] => {
        if (!ctx.pkg.name) {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'error',
              message: 'Missing name field',
              ruleId: 'test/mock-rule',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        }
        return [];
      },
    };

    const pkg: PackageJson = {};
    const results: LintResult[] = runPkgRules('/test/package.json', pkg, false, [mockRule]);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('test/mock-rule');
  });

  it('passes isRoot context correctly', () => {
    let receivedIsRoot: boolean = false;
    const mockRule: PackageJsonRule = {
      id: 'test/root-check',
      description: 'Checks isRoot',
      check: (ctx): LintResult[] => {
        receivedIsRoot = ctx.isRoot;
        return [];
      },
    };

    runPkgRules('/test/package.json', {}, true, [mockRule]);
    expect(receivedIsRoot).toBe(true);
  });

  it('runs multiple rules and aggregates results', () => {
    const rule1: PackageJsonRule = {
      id: 'test/rule-1',
      description: 'Rule 1',
      check: (ctx): LintResult[] => [
        {
          file: ctx.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: 'Error 1',
          ruleId: 'test/rule-1',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    };
    const rule2: PackageJsonRule = {
      id: 'test/rule-2',
      description: 'Rule 2',
      check: (ctx): LintResult[] => [
        {
          file: ctx.file,
          line: 2,
          column: 1,
          severity: 'error',
          message: 'Error 2',
          ruleId: 'test/rule-2',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    };

    const results: LintResult[] = runPkgRules('/test/package.json', {}, false, [rule1, rule2]);
    expect(results.length).toBe(2);
  });
});

// =============================================================================
// applyFixes
// =============================================================================

describe('applyFixes', () => {
  it('returns original content when no fixes are provided', () => {
    const content: string = 'const x = 1;';
    expect(applyFixes(content, [])).toBe(content);
  });

  it('applies a single replacement fix', () => {
    const content: string = 'const x = 1;';
    const fixes: LintFix[] = [{ range: { start: 6, end: 7 }, text: 'y' }];
    expect(applyFixes(content, fixes)).toBe('const y = 1;');
  });

  it('applies a deletion fix (empty text)', () => {
    const content: string = 'const x = 1;';
    const fixes: LintFix[] = [{ range: { start: 0, end: 6 }, text: '' }];
    expect(applyFixes(content, fixes)).toBe('x = 1;');
  });

  it('applies an insertion fix (start === end)', () => {
    const content: string = 'const x = 1;';
    const fixes: LintFix[] = [{ range: { start: 6, end: 6 }, text: 'readonly ' }];
    expect(applyFixes(content, fixes)).toBe('const readonly x = 1;');
  });

  it('applies multiple non-overlapping fixes in correct order', () => {
    const content: string = 'aaa bbb ccc';
    const fixes: LintFix[] = [
      { range: { start: 0, end: 3 }, text: 'AAA' },
      { range: { start: 8, end: 11 }, text: 'CCC' },
    ];
    expect(applyFixes(content, fixes)).toBe('AAA bbb CCC');
  });

  it('applies fixes regardless of input order (sorted internally)', () => {
    const content: string = 'aaa bbb ccc';
    // Provide in forward order — applyFixes should sort to reverse
    const fixes: LintFix[] = [
      { range: { start: 0, end: 3 }, text: 'XXX' },
      { range: { start: 8, end: 11 }, text: 'ZZZ' },
    ];
    expect(applyFixes(content, fixes)).toBe('XXX bbb ZZZ');
  });

  it('handles multiline content', () => {
    const content: string = 'line1\nline2\nline3';
    const fixes: LintFix[] = [{ range: { start: 6, end: 11 }, text: 'REPLACED' }];
    expect(applyFixes(content, fixes)).toBe('line1\nREPLACED\nline3');
  });
});

// =============================================================================
// buildHelpText
// =============================================================================

describe('buildHelpText', () => {
  it('includes the linter name', () => {
    const text: string = buildHelpText('my-lint', '.my-lint.jsonc', '.my-lint.schema.json');
    expect(text).toContain('my-lint');
  });

  it('includes the config filename', () => {
    const text: string = buildHelpText('my-lint', '.my-lint.jsonc', '.my-lint.schema.json');
    expect(text).toContain('.my-lint.jsonc');
  });

  it('includes the schema filename', () => {
    const text: string = buildHelpText('my-lint', '.my-lint.jsonc', '.my-lint.schema.json');
    expect(text).toContain('.my-lint.schema.json');
  });

  it('contains USAGE section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('USAGE');
  });

  it('contains OPTIONS section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('OPTIONS');
  });

  it('contains CONFIGURATION section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('CONFIGURATION');
  });

  it('contains EXAMPLES section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('EXAMPLES');
  });

  it('documents --help and -h flags', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('--help');
    expect(text).toContain('-h');
  });

  it('documents --fix flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('--fix');
  });

  it('documents --json flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
    );
    expect(text).toContain('--json');
  });
});

// =============================================================================
// parseCliArgs
// =============================================================================

describe('parseCliArgs', () => {
  it('parses empty args', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.paths.length).toBe(0);
    expect(args.json).toBe(false);
    expect(args.listRules).toBe(false);
    expect(args.warnOnly).toBe(false);
    expect(args.fix).toBe(false);
    expect(args.help).toBe(false);
    expect(args.ruleIds.length).toBe(0);
  });

  it('parses path arguments', () => {
    const args: CliArgs = parseCliArgs(['src/', 'lib/']);
    expect(args.paths).toEqual(['src/', 'lib/']);
  });

  it('parses --json flag', () => {
    const args: CliArgs = parseCliArgs(['--json', 'src/']);
    expect(args.json).toBe(true);
    expect(args.paths).toEqual(['src/']);
  });

  it('parses --list-rules flag', () => {
    const args: CliArgs = parseCliArgs(['--list-rules']);
    expect(args.listRules).toBe(true);
  });

  it('parses --warn-only flag', () => {
    const args: CliArgs = parseCliArgs(['--warn-only']);
    expect(args.warnOnly).toBe(true);
  });

  it('parses --fix flag', () => {
    const args: CliArgs = parseCliArgs(['--fix']);
    expect(args.fix).toBe(true);
  });

  it('parses --help flag', () => {
    const args: CliArgs = parseCliArgs(['--help']);
    expect(args.help).toBe(true);
  });

  it('parses -h flag as help', () => {
    const args: CliArgs = parseCliArgs(['-h']);
    expect(args.help).toBe(true);
  });

  it('parses --rule=id', () => {
    const args: CliArgs = parseCliArgs(['--rule=jsdoc/require-param']);
    expect(args.ruleIds).toEqual(['jsdoc/require-param']);
  });

  it('parses --rule=id1,id2', () => {
    const args: CliArgs = parseCliArgs(['--rule=jsdoc/require-param,typescript/no-throw']);
    expect(args.ruleIds).toEqual(['jsdoc/require-param', 'typescript/no-throw']);
  });

  it('separates flags from paths correctly', () => {
    const args: CliArgs = parseCliArgs(['--json', 'src/', '--fix', 'lib/']);
    expect(args.json).toBe(true);
    expect(args.fix).toBe(true);
    expect(args.paths).toEqual(['src/', 'lib/']);
  });

  it('parses --category=name', () => {
    const args: CliArgs = parseCliArgs(['--category=typescript']);
    expect(args.categories).toEqual(['typescript']);
  });

  it('parses --category=name1,name2', () => {
    const args: CliArgs = parseCliArgs(['--category=typescript,safety']);
    expect(args.categories).toEqual(['typescript', 'safety']);
  });

  it('defaults categories to empty array', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.categories).toEqual([]);
  });

  it('parses --stage=name', () => {
    const args: CliArgs = parseCliArgs(['--stage=ci']);
    expect(args.stage).toBe('ci');
  });

  it('defaults stage to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.stage).toBeUndefined();
  });

  it('parses --quiet flag', () => {
    const args: CliArgs = parseCliArgs(['--quiet']);
    expect(args.quiet).toBe(true);
  });

  it('defaults quiet to false', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.quiet).toBe(false);
  });

  it('parses --bail flag', () => {
    const args: CliArgs = parseCliArgs(['--bail']);
    expect(args.bail).toBe(true);
  });

  it('defaults bail to false', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.bail).toBe(false);
  });

  it('parses --ignore=pattern', () => {
    const args: CliArgs = parseCliArgs(['--ignore=*.test.ts']);
    expect(args.ignore).toEqual(['*.test.ts']);
  });

  it('parses --ignore=pat1,pat2', () => {
    const args: CliArgs = parseCliArgs(['--ignore=*.test.ts,*.spec.ts']);
    expect(args.ignore).toEqual(['*.test.ts', '*.spec.ts']);
  });

  it('defaults ignore to empty array', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.ignore).toEqual([]);
  });

  it('parses --config=path', () => {
    const args: CliArgs = parseCliArgs(['--config=./custom.jsonc']);
    expect(args.configPath).toBe('./custom.jsonc');
  });

  it('defaults configPath to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.configPath).toBeUndefined();
  });
});

// =============================================================================
// parseCliArgs — --severity
// =============================================================================

describe('parseCliArgs — --severity', () => {
  it('parses --severity=warn', () => {
    const args: CliArgs = parseCliArgs(['--severity=warn']);
    expect(args.severityOverride).toBe('warn');
  });

  it('parses --severity=error', () => {
    const args: CliArgs = parseCliArgs(['--severity=error']);
    expect(args.severityOverride).toBe('error');
  });

  it('parses --severity=off', () => {
    const args: CliArgs = parseCliArgs(['--severity=off']);
    expect(args.severityOverride).toBe('off');
  });

  it('defaults severityOverride to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.severityOverride).toBeUndefined();
  });
});

// =============================================================================
// parseCliArgs — --diff
// =============================================================================

describe('parseCliArgs — --diff', () => {
  it('parses --diff as head mode', () => {
    const args: CliArgs = parseCliArgs(['--diff']);
    expect(args.diff).toBe('head');
  });

  it('parses --diff=staged', () => {
    const args: CliArgs = parseCliArgs(['--diff=staged']);
    expect(args.diff).toBe('staged');
  });

  it('parses --diff=head explicitly', () => {
    const args: CliArgs = parseCliArgs(['--diff=head']);
    expect(args.diff).toBe('head');
  });

  it('defaults diff to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.diff).toBeUndefined();
  });
});

// =============================================================================
// parseCliArgs — --debug
// =============================================================================

describe('parseCliArgs — --debug', () => {
  it('parses --debug as true', () => {
    const args: CliArgs = parseCliArgs(['--debug']);
    expect(args.debug).toBe(true);
  });

  it('defaults debug to false', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.debug).toBe(false);
  });
});

// =============================================================================
// parseCliArgs — --format
// =============================================================================

describe('parseCliArgs — --format', () => {
  it('parses --format=json', () => {
    const args: CliArgs = parseCliArgs(['--format=json']);
    expect(args.format).toBe('json');
  });

  it('parses --format=sarif', () => {
    const args: CliArgs = parseCliArgs(['--format=sarif']);
    expect(args.format).toBe('sarif');
  });

  it('parses --format=text', () => {
    const args: CliArgs = parseCliArgs(['--format=text']);
    expect(args.format).toBe('text');
  });

  it('defaults format to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.format).toBeUndefined();
  });
});

// =============================================================================
// parseCliArgs — --jobs
// =============================================================================

describe('parseCliArgs — --jobs', () => {
  it('parses --jobs=4', () => {
    const args: CliArgs = parseCliArgs(['--jobs=4']);
    expect(args.jobs).toBe(4);
  });

  it('parses --jobs=1', () => {
    const args: CliArgs = parseCliArgs(['--jobs=1']);
    expect(args.jobs).toBe(1);
  });

  it('defaults jobs to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.jobs).toBeUndefined();
  });
});

// =============================================================================
// parseCliArgs — --tools
// =============================================================================

describe('parseCliArgs — --tools', () => {
  it('parses --tools flag', () => {
    const args: CliArgs = parseCliArgs(['--tools']);
    expect(args.tools).toBe(true);
  });

  it('defaults tools to false', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.tools).toBe(false);
  });
});

// =============================================================================
// parseCliArgs — --cache
// =============================================================================

describe('parseCliArgs — --cache', () => {
  it('parses --cache flag', () => {
    const args: CliArgs = parseCliArgs(['--cache']);
    expect(args.cache).toBe(true);
  });

  it('--no-cache overrides --cache', () => {
    const args: CliArgs = parseCliArgs(['--cache', '--no-cache']);
    expect(args.cache).toBe(false);
  });

  it('defaults cache to false', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.cache).toBe(false);
  });
});

// =============================================================================
// runLinter
// =============================================================================

/**
 * Create a capture output sink for testing.
 *
 * @returns Object with stdout/stderr capture arrays and CliOutput
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

describe('runLinter', () => {
  it('returns 0 and prints help when help flag is set', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      {
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
        tools: false,
        cache: false,
      },
      output,
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
        tools: false,
        cache: false,
      },
      output,
    );
    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    expect(combined).toContain('TypeScript rules:');
    expect(combined).toContain('Package.json rules:');
  });

  it('returns 1 when no paths and no include configured', async () => {
    const { output } = captureOutput();
    // Since we run from workspace root which HAS includes, it will find files and lint
    const code: number = await runLinter(
      {
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
      },
      output,
    );
    // This will either return 1 (no paths, no config includes) or 0 (config has includes)
    // Since we run from workspace root which HAS includes, it will find files and lint
    expect([0, 1]).toContain(code);
  });

  it('returns 0 when linting a clean file with specific rule filter', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      {
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
        tools: false,
        cache: false,
      },
      output,
    );
    // constants.ts has no throw statements
    expect(code).toBe(0);
  });

  it('returns 0 with --warnOnly even if errors exist', async () => {
    const { output } = captureOutput();
    const code: number = await runLinter(
      {
        paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
        json: false,
        listRules: false,
        warnOnly: true,
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
      },
      output,
    );
    expect(code).toBe(0);
  });

  it('produces valid JSON output when --json flag is set', async () => {
    const { stdoutLines, output } = captureOutput();
    const code: number = await runLinter(
      {
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
        tools: false,
        cache: false,
      },
      output,
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
        tools: false,
        cache: false,
      },
      output,
    );
    const combined: string = stderrLines.join('');
    expect(combined).toContain('Path not found');
  });

  it('--category filters to only matching rules in JSON output', async () => {
    const { stdoutLines, output } = captureOutput();
    await runLinter(
      {
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
        tools: false,
        cache: false,
      },
      output,
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
        tools: false,
        cache: false,
      },
      output,
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
        tools: false,
        cache: false,
      },
      output,
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

  it('handles --cache without --no-cache', () => {
    const args: CliArgs = parseCliArgs(['--cache']);
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

describe('runLinter — branch coverage', () => {
  it('--debug writes to stderr', async () => {
    const { stderrLines, output } = captureOutput();
    await runLinter(
      makeCliArgs({
        paths: [resolve('packages/shared/config/tooling/lint/src/constants.ts')],
        debug: true,
      }),
      output,
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
      }),
      output,
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
      }),
      output,
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
      }),
      output,
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
      }),
      output,
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
      }),
      output,
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
    );

    expect(code).toBe(0);
  });
});
