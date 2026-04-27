/**
 * Mocked-fs / mocked-execSync unit tests for `cli-helpers` —
 * exercises `collapseShortJsonArrays`, `getGitChangedFiles`, and
 * other branches that need filesystem and child-process stubs.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { execSync } from 'node:child_process';
import type * as NodeFsModule from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { collapseShortJsonArrays, getGitChangedFiles } from './cli-helpers.ts';
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFile: vi.fn(),
  execFileSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFsModule>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
  };
});

/* ---------- collapseShortJsonArrays ---------- */

describe('collapseShortJsonArrays', () => {
  it('returns empty string for empty input', () => {
    expect(collapseShortJsonArrays('', 100)).toBe('');
  });

  it('collapses single-element arrays to one line', () => {
    const input = '{\n  "tags": [\n    "alpha"\n  ]\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toContain('"tags": ["alpha"]');
    expect(result.split('\n').length).toBeLessThan(input.split('\n').length);
  });

  it('collapses multi-element short arrays to one line', () => {
    const input = '{\n  "items": [\n    "a",\n    "b",\n    "c"\n  ]\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toContain('"items": ["a", "b", "c"]');
  });

  it('keeps long arrays expanded when exceeding maxWidth', () => {
    const elements = Array.from({ length: 20 }, (_, i) => `    "element-${i}"`).join(',\n');
    const input = `{\n  "items": [\n${elements}\n  ]\n}`;
    const result = collapseShortJsonArrays(input, 40);
    expect(result).toContain('element-0');
    expect(result.split('\n').length).toBe(input.split('\n').length);
  });

  it('does not collapse arrays containing nested objects', () => {
    const input = '{\n  "items": [\n    {"a": 1},\n    {"b": 2}\n  ]\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toBe(input);
  });

  it('does not collapse arrays containing nested arrays', () => {
    const input = '{\n  "items": [\n    [1, 2],\n    [3, 4]\n  ]\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toBe(input);
  });

  it('handles trailing comma after closing bracket', () => {
    const input = '{\n  "a": [\n    "x"\n  ],\n  "b": 1\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toContain('"a": ["x"],');
  });

  it('respects custom maxWidth parameter', () => {
    const input = '{\n  "tags": [\n    "alpha",\n    "beta"\n  ]\n}';
    const collapsed = collapseShortJsonArrays(input, 100);
    expect(collapsed).toContain('["alpha", "beta"]');

    const narrow = collapseShortJsonArrays(input, 10);
    expect(narrow.split('\n').length).toBe(input.split('\n').length);
  });

  it('preserves indentation level for non-array lines', () => {
    const input = '{\n  "name": "test",\n  "tags": [\n    "a"\n  ],\n  "value": 42\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toContain('  "name": "test"');
    expect(result).toContain('  "value": 42');
  });

  it('handles empty arrays (no elements between brackets)', () => {
    const input = '{\n  "items": [\n  ]\n}';
    const result = collapseShortJsonArrays(input, 100);
    expect(result).toBeDefined();
  });
});

/* ---------- getGitChangedFiles ---------- */

describe('getGitChangedFiles', () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls git diff --cached --name-only for staged mode', () => {
    vi.mocked(execSync).mockReturnValue('file1.ts\nfile2.ts\n');
    const result = getGitChangedFiles('staged');
    expect(execSync).toHaveBeenCalledWith('git diff --cached --name-only', expect.any(Object));
    expect(result.size).toBe(2);
  });

  it('calls git diff --name-only HEAD for head mode', () => {
    vi.mocked(execSync).mockReturnValue('file1.ts\n');
    const result = getGitChangedFiles('head');
    expect(execSync).toHaveBeenCalledWith('git diff --name-only HEAD', expect.any(Object));
    expect(result.size).toBe(1);
  });

  it('filters empty lines from output', () => {
    vi.mocked(execSync).mockReturnValue('file1.ts\n\n\nfile2.ts\n\n');
    const result = getGitChangedFiles('head');
    expect(result.size).toBe(2);
  });

  it('returns empty set when execSync throws', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const result = getGitChangedFiles('head');
    expect(result.size).toBe(0);
  });

  it('converts relative paths to absolute using cwd', () => {
    vi.mocked(execSync).mockReturnValue('src/index.ts\n');
    const result = getGitChangedFiles('staged');
    const paths = [...result];
    expect(paths[0]).toBe(resolve(process.cwd(), 'src/index.ts'));
  });

  it('trims whitespace from lines', () => {
    vi.mocked(execSync).mockReturnValue('  file1.ts  \n');
    const result = getGitChangedFiles('head');
    expect(result.size).toBe(1);
  });
});

/* ---------- writeJsonSchema ---------- */

describe('writeJsonSchema', () => {
  beforeEach(() => {
    vi.mocked(writeFileSync).mockReset();
    // Reset the module-level schemaWritten flag by re-importing
    // We need to handle the idempotent guard carefully
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes schema file with correct path', async () => {
    // Use dynamic import to get fresh module state
    vi.resetModules();
    const { writeJsonSchema: freshWrite } = await import('./cli-helpers.ts');
    const { writeFileSync: mockWrite } = await import('node:fs');
    const { en: freshEn } = await import('./locale/locales/en.ts');

    const tsRules = [
      {
        id: 'test/rule-a',
        description: 'Rule A',
        patterns: ['**/*.ts'],
        categories: [],
        stages: ['lint'],
        visitor: {},
      },
    ];
    const pkgRules = [
      {
        id: 'pkg/rule-b',
        description: 'Rule B',
        patterns: ['**/package.json'],
        categories: [],
        stages: ['lint'],
        check: () => [],
      },
    ];
    const cwd = '/tmp/test-project';

    freshWrite(tsRules as any, pkgRules as any, freshEn, [], cwd);

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const [outPath] = vi.mocked(mockWrite).mock.calls[0] ?? [];
    expect(outPath).toBe(resolve(cwd, '.resist-lint.schema.json'));
  });

  it('includes rule descriptions in generated schema', async () => {
    vi.resetModules();
    const { writeJsonSchema: freshWrite } = await import('./cli-helpers.ts');
    const { writeFileSync: mockWrite } = await import('node:fs');
    const { en: freshEn } = await import('./locale/locales/en.ts');

    const tsRules = [
      {
        id: 'test/my-rule',
        description: 'My custom rule',
        patterns: ['**/*.ts'],
        categories: [],
        stages: ['lint'],
        visitor: {},
      },
    ];

    freshWrite(tsRules as any, [] as any, freshEn, [], '/tmp');

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const [, content] = vi.mocked(mockWrite).mock.calls[0] ?? [];
    expect(content).toContain('My custom rule');
  });

  it('catches writeFileSync errors gracefully', async () => {
    vi.resetModules();
    const { writeJsonSchema: freshWrite } = await import('./cli-helpers.ts');
    const { writeFileSync: mockWrite } = await import('node:fs');
    const { en: freshEn } = await import('./locale/locales/en.ts');
    vi.mocked(mockWrite).mockImplementation(() => {
      throw new Error('EACCES permission denied');
    });

    expect(() => {
      freshWrite([] as any, [] as any, freshEn, [], '/tmp');
    }).not.toThrow();
  });

  it('skips write when already written (idempotent guard)', async () => {
    vi.resetModules();
    const { writeJsonSchema: freshWrite } = await import('./cli-helpers.ts');
    const { writeFileSync: mockWrite } = await import('node:fs');
    const { en: freshEn } = await import('./locale/locales/en.ts');

    freshWrite([] as any, [] as any, freshEn, [], '/tmp');
    freshWrite([] as any, [] as any, freshEn, [], '/tmp');

    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it('handles workspace rules with optionsSchema', async () => {
    vi.resetModules();
    const { writeJsonSchema: freshWrite } = await import('./cli-helpers.ts');
    const { writeFileSync: mockWrite } = await import('node:fs');
    const { en: freshEn } = await import('./locale/locales/en.ts');

    const wsRules = [
      {
        id: 'workspace/test-rule',
        description: 'Workspace rule',
        patterns: ['**/*'],
        categories: [],
        stages: ['lint'],
        scope: 'workspace',
        check: async () => {
          await Promise.resolve();
          return [];
        },
        optionsSchema: { type: 'object', properties: { strict: { type: 'boolean' } } },
      },
    ];

    freshWrite([] as any, [] as any, freshEn, wsRules as any, '/tmp');

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const [, content] = vi.mocked(mockWrite).mock.calls[0] ?? [];
    expect(content).toContain('workspace/test-rule');
  });
});
