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
  shouldExcludeDir,
  runPkgRules,
  applyFixes,
  buildHelpText,
  parseCliArgs,
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
// shouldExcludeDir
// =============================================================================

describe('shouldExcludeDir', () => {
  it('excludes by name when entry matches excludeNames', () => {
    const result: boolean = shouldExcludeDir(
      'node_modules',
      '/root/packages/node_modules',
      '/root',
      new Set(['node_modules']),
      [],
    );
    expect(result).toBe(true);
  });

  it('does not exclude when name is not in excludeNames', () => {
    const result: boolean = shouldExcludeDir(
      'src',
      '/root/packages/src',
      '/root',
      new Set(['node_modules']),
      [],
    );
    expect(result).toBe(false);
  });

  it('excludes by exact path-prefix match', () => {
    const result: boolean = shouldExcludeDir(
      'cli',
      '/root/packages/shared/utils/cli',
      '/root',
      new Set(),
      ['packages/shared/utils/cli'],
    );
    expect(result).toBe(true);
  });

  it('excludes subdirectories of a path-prefix match', () => {
    const result: boolean = shouldExcludeDir(
      'src',
      '/root/packages/shared/utils/cli/src',
      '/root',
      new Set(),
      ['packages/shared/utils/cli'],
    );
    expect(result).toBe(true);
  });

  it('does not exclude a directory that merely shares a prefix string', () => {
    const result: boolean = shouldExcludeDir(
      'cli-tools',
      '/root/packages/shared/utils/cli-tools',
      '/root',
      new Set(),
      ['packages/shared/utils/cli'],
    );
    expect(result).toBe(false);
  });

  it('does not exclude unrelated path', () => {
    const result: boolean = shouldExcludeDir(
      'core',
      '/root/packages/shared/utils/core',
      '/root',
      new Set(),
      ['packages/shared/utils/cli'],
    );
    expect(result).toBe(false);
  });

  it('returns false when both exclude lists are empty', () => {
    const result: boolean = shouldExcludeDir('anything', '/root/anything', '/root', new Set(), []);
    expect(result).toBe(false);
  });

  it('name-based match takes priority over path check', () => {
    const result: boolean = shouldExcludeDir(
      'dist',
      '/root/packages/dist',
      '/root',
      new Set(['dist']),
      ['packages/other'],
    );
    expect(result).toBe(true);
  });

  it('handles multiple path-prefix excludes', () => {
    const excludePaths: string[] = ['packages/shared/utils/cli', 'packages/tools/internal'];
    expect(
      shouldExcludeDir('cli', '/root/packages/shared/utils/cli', '/root', new Set(), excludePaths),
    ).toBe(true);
    expect(
      shouldExcludeDir(
        'internal',
        '/root/packages/tools/internal',
        '/root',
        new Set(),
        excludePaths,
      ),
    ).toBe(true);
    expect(
      shouldExcludeDir('other', '/root/packages/tools/other', '/root', new Set(), excludePaths),
    ).toBe(false);
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

  it('skips directories matching a path-prefix exclude', () => {
    // The workspace root is 6 levels up from src/
    const workspaceRoot: string = resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..');
    const config: LintConfig = makeConfig({
      exclude: [
        '*.test.ts',
        '*.d.ts',
        'node_modules',
        '.git',
        'packages/shared/config/tooling/lint/src/framework',
      ],
    });
    const lintSrcDir: string = resolve(import.meta.dirname);
    const files: string[] = collectFiles(lintSrcDir, config, workspaceRoot);
    const hasFramework: boolean = files.some((f: string): boolean => f.includes('/framework/'));
    expect(hasFramework).toBe(false);
    // Should still find files in the current directory
    expect(files.length).toBeGreaterThan(0);
  });

  it('does not exclude directories that merely share a path prefix string', () => {
    const workspaceRoot: string = resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..');
    const config: LintConfig = makeConfig({
      exclude: [
        '*.test.ts',
        '*.d.ts',
        'node_modules',
        '.git',
        'packages/shared/config/tooling/lint/src/tool',
      ],
    });
    const lintSrcDir: string = resolve(import.meta.dirname);
    const files: string[] = collectFiles(lintSrcDir, config, workspaceRoot);
    // 'tools' directory should NOT be excluded (path is 'src/tools', not 'src/tool')
    const hasTools: boolean = files.some((f: string): boolean => f.includes('/tools/'));
    expect(hasTools).toBe(true);
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
    const text: string = buildHelpText('my-lint', '.my-lint.jsonc', '.my-lint.schema.json', en);
    expect(text).toContain('my-lint');
  });

  it('includes the config filename', () => {
    const text: string = buildHelpText('my-lint', '.my-lint.jsonc', '.my-lint.schema.json', en);
    expect(text).toContain('.my-lint.jsonc');
  });

  it('includes the schema filename', () => {
    const text: string = buildHelpText('my-lint', '.my-lint.jsonc', '.my-lint.schema.json', en);
    expect(text).toContain('.my-lint.schema.json');
  });

  it('contains USAGE section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('USAGE');
  });

  it('contains OPTIONS section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('OPTIONS');
  });

  it('contains CONFIGURATION section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('CONFIGURATION');
  });

  it('contains EXAMPLES section', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('EXAMPLES');
  });

  it('documents --help and -h flags', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--help');
    expect(text).toContain('-h');
  });

  it('documents --fix flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--fix');
  });

  it('documents --json flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--json');
  });

  it('documents --locale flag', () => {
    const text: string = buildHelpText(
      'resist-lint',
      '.resist-lint.jsonc',
      '.resist-lint.schema.json',
      en,
    );
    expect(text).toContain('--locale');
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

  it('parses --format=github', () => {
    const args: CliArgs = parseCliArgs(['--format=github']);
    expect(args.format).toBe('github');
  });

  it('parses --format=junit', () => {
    const args: CliArgs = parseCliArgs(['--format=junit']);
    expect(args.format).toBe('junit');
  });

  it('parses --format=compact', () => {
    const args: CliArgs = parseCliArgs(['--format=compact']);
    expect(args.format).toBe('compact');
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
// parseCliArgs — --locale
// =============================================================================

describe('parseCliArgs — --locale', () => {
  it('parses --locale=en', () => {
    const args: CliArgs = parseCliArgs(['--locale=en']);
    expect(args.locale).toBe('en');
  });

  it('parses --locale=es', () => {
    const args: CliArgs = parseCliArgs(['--locale=es']);
    expect(args.locale).toBe('es');
  });

  it('defaults locale to undefined when not specified', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.locale).toBeUndefined();
  });

  it('parses locale with other flags', () => {
    const args: CliArgs = parseCliArgs(['--locale=en', '--json', '--debug']);
    expect(args.locale).toBe('en');
    expect(args.json).toBe(true);
    expect(args.debug).toBe(true);
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
