/**
 * Tests for the `hygiene/*` lint rules — runs each rule against
 * fixture sources via `runTypeScriptRules` and asserts the
 * expected diagnostics for `no-bare-catch`,
 * `no-dead-locale-keys`, `no-duplicate-function-signatures`, and
 * `no-orphaned-exports`.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult } from '../../framework/types.ts';
import type { WorkspaceContext } from '../../framework/rule-context.ts';
import noBareCatch from './no-bare-catch.ts';
import noDeadLocaleKeys from './no-dead-locale-keys.ts';
import noDuplicateFunctionSignatures from './no-duplicate-function-signatures.ts';
import noOrphanedExports from './no-orphaned-exports.ts';

/**
 * Build a mock WorkspaceContext from a virtual file map.
 *
 * @param files - Virtual file paths -> contents
 * @param ruleOptions - Optional per-rule options bag
 * @returns Mock WorkspaceContext with optional ruleOptions attached
 */
function makeMockContext(
  files: Record<string, string>,
  ruleOptions?: Record<string, unknown>,
): WorkspaceContext & { ruleOptions?: Record<string, unknown> } {
  const filePaths: string[] = Object.keys(files);

  return {
    rootDir: '/mock',
    allFiles: async (): Promise<readonly string[]> => filePaths,
    filesByExtension: async (...exts: string[]): Promise<readonly string[]> =>
      filePaths.filter((f: string): boolean => exts.some((e: string): boolean => f.endsWith(e))),
    readFile: async (path: string): Promise<string> => files[path] ?? '',
    fileExists: async (path: string): Promise<boolean> => path in files,
    dirExists: async (): Promise<boolean> => false,
    getWorkspacePackages: async () => [],
    ruleOptions,
  };
}

describe('hygiene/no-bare-catch', () => {
  it('reports bare catch {}', async () => {
    const code = `try { throw new Error('x'); } catch { console.log('swallowed'); }`;
    const results: LintResult[] = await runTypeScriptRules('test.ts', code, [noBareCatch]);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('hygiene/no-bare-catch');
    expect(results[0]?.severity).toBe('error');
  });

  it('does not report catch (e) {}', async () => {
    const code = `try { throw new Error('x'); } catch (error) { console.log(error); }`;
    const results: LintResult[] = await runTypeScriptRules('test.ts', code, [noBareCatch]);
    expect(results).toHaveLength(0);
  });

  it('does not report catch (error: unknown) {}', async () => {
    const code = `try { throw new Error('x'); } catch (error: unknown) { console.error(error); }`;
    const results: LintResult[] = await runTypeScriptRules('test.ts', code, [noBareCatch]);
    expect(results).toHaveLength(0);
  });
});

describe('hygiene/no-duplicate-function-signatures', () => {
  const createMockContext = makeMockContext;

  it('reports duplicate exported function names across files', async () => {
    const ctx = createMockContext({
      '/mock/src/a.ts': 'export function mapSeverity(): void {}',
      '/mock/src/b.ts': 'export function mapSeverity(): void {}',
    });
    const results: LintResult[] = await noDuplicateFunctionSignatures.check(ctx);
    expect(results).toHaveLength(2);
    expect(results[0]?.ruleId).toBe('hygiene/no-duplicate-function-signatures');
    expect(results[0]?.severity).toBe('warning');
  });

  it('does not report unique function names', async () => {
    const ctx = createMockContext({
      '/mock/src/a.ts': 'export function foo(): void {}',
      '/mock/src/b.ts': 'export function bar(): void {}',
    });
    const results: LintResult[] = await noDuplicateFunctionSignatures.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files', async () => {
    const ctx = createMockContext({
      '/mock/src/a.ts': 'export function dup(): void {}',
      '/mock/src/a.test.ts': 'export function dup(): void {}',
    });
    const results: LintResult[] = await noDuplicateFunctionSignatures.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('respects allowedNames option', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/a.ts': 'export function setup(): void {}',
        '/mock/src/b.ts': 'export function setup(): void {}',
      },
      { allowedNames: ['setup'] },
    );
    const results: LintResult[] = await noDuplicateFunctionSignatures.check(ctx);
    expect(results).toHaveLength(0);
  });
});

describe('hygiene/no-orphaned-exports', () => {
  const createMockContext = (files: Record<string, string>): WorkspaceContext =>
    makeMockContext(files);

  it('reports export with no consumer', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/utils.ts': 'export function orphan(): void {}\nexport function used(): void {}',
      '/mock/src/main.ts': "import { used } from './utils.ts';",
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('orphan');
  });

  it('does not report exports used in other files', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/utils.ts': 'export function helper(): void {}',
      '/mock/src/main.ts': "import { helper } from './utils.ts';",
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files as consumers', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/utils.ts': 'export function orphan(): void {}',
      '/mock/src/utils.test.ts': "import { orphan } from './utils.ts';",
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('skips exports with resist-lint-allow comment', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/utils.ts':
        '// resist-lint-allow: hygiene/no-orphaned-exports\nexport function allowed(): void {}',
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files, declaration files, and barrel files as sources', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/utils.test.ts': 'export function testHelper(): void {}',
      '/mock/src/types.d.ts': 'export type Foo = string;',
      '/mock/src/index.ts': 'export function barrel(): void {}',
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips export default', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/rule.ts': 'export default rule;',
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('detects orphaned class, const, interface, type, and enum exports', async () => {
    const ctx: WorkspaceContext = createMockContext({
      '/mock/src/defs.ts': [
        'export class MyClass {}',
        'export const MY_CONST: number = 1;',
        'export interface MyInterface {}',
        'export type MyType = string;',
        'export enum MyEnum { A, B }',
      ].join('\n'),
    });
    const results: LintResult[] = await noOrphanedExports.check(ctx);
    expect(results).toHaveLength(5);
  });
});

describe('hygiene/no-dead-locale-keys', () => {
  const createMockContext = makeMockContext;

  it('reports locale keys with no consumer', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/locale/en.ts': `export const en = {\n  messages: {\n    used: 'Used',\n    dead: 'Dead',\n  },\n};`,
        '/mock/src/main.ts': `import { en } from './locale/en.ts';\nconsole.log(en.messages.used);`,
      },
      { localeFile: 'locale/en.ts', localePrefix: 'en' },
    );
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('dead');
  });

  it('does not report keys that are referenced', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/locale/en.ts': `export const en = {\n  messages: {\n    used: 'Used',\n  },\n};`,
        '/mock/src/main.ts': `import { en } from './locale/en.ts';\nconsole.log(en.messages.used);`,
      },
      { localeFile: 'locale/en.ts', localePrefix: 'en' },
    );
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test file references', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/locale/en.ts': `export const en = {\n  messages: {\n    testOnly: 'Test Only',\n  },\n};`,
        '/mock/src/main.test.ts': `import { en } from './locale/en.ts';\nconsole.log(en.messages.testOnly);`,
      },
      { localeFile: 'locale/en.ts', localePrefix: 'en' },
    );
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('skips schema file references', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/locale/en.ts': `export const en = {\n  messages: {\n    schemaOnly: 'Schema Only',\n  },\n};`,
        '/mock/src/locale/schema.ts': `import { en } from './en.ts';\nconsole.log(en.messages.schemaOnly);`,
      },
      { localeFile: 'locale/en.ts', localePrefix: 'en' },
    );
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('handles multiple nested groups', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/locale/en.ts': [
          'export const en = {',
          '  messages: {',
          "    found: 'Found',",
          '  },',
          '  progress: {',
          "    loading: 'Loading...',",
          '  },',
          '};',
        ].join('\n'),
        '/mock/src/main.ts': 'console.log(en.messages.found);\nconsole.log(en.progress.loading);',
      },
      { localeFile: 'locale/en.ts', localePrefix: 'en' },
    );
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('returns empty when no locale file is found', async () => {
    const ctx = createMockContext(
      {
        '/mock/src/main.ts': 'console.log("hello");',
      },
      { localeFile: 'locale/en.ts', localePrefix: 'en' },
    );
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('uses default options when none provided', async () => {
    const ctx = createMockContext({
      '/mock/src/locale/en.ts': `export const en = {\n  messages: {\n    orphan: 'Orphan',\n  },\n};`,
      '/mock/src/main.ts': 'console.log("no references");',
    });
    const results: LintResult[] = await noDeadLocaleKeys.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('hygiene/no-dead-locale-keys');
    expect(results[0]?.severity).toBe('warning');
  });
});

// =============================================================================
// inputs() lifecycle smoke-coverage
// =============================================================================
describe('hygiene — inputs() lifecycle smoke-coverage', () => {
  for (const { id, rule } of [
    { id: 'no-duplicate-function-signatures', rule: noDuplicateFunctionSignatures },
    { id: 'no-orphaned-exports', rule: noOrphanedExports },
  ] as const) {
    it(`${id}.inputs() runs without throwing`, async () => {
      if (typeof rule.inputs !== 'function') {
        return;
      }

      const ctx = makeMockContext({
        '/mock/src/a.ts': 'export const a = 1;',
        '/mock/src/b.ts': 'export const b = 2;',
      });
      const inputs = await rule.inputs(ctx);
      expect(Array.isArray(inputs)).toBe(true);
    });
  }
});
