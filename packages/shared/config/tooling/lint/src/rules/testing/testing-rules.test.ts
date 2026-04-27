/**
 * Tests for Testing lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';

import requireColocatedTests from './require-colocated-tests.ts';
import requireTestSuffix from './require-test-suffix.ts';
import requireE2eLocation from './require-e2e-location.ts';
import requireIntegrationLocation from './require-integration-location.ts';

/**
 * Run a single rule against fixture source code with a custom filename.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} [filename] - Optional filename override
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(
  rule: TypeScriptRule,
  code: string,
  filename: string = '/tmp/nonexistent/module.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, [rule]);
}

// =============================================================================
// testing/require-colocated-tests
// =============================================================================

describe('testing/require-colocated-tests', () => {
  it('reports file with exported function but no test file', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    // Use a path that definitely has no .test.ts file
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/math.ts',
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('testing/require-colocated-tests');
    expect(results[0]!.message).toContain('no colocated test file');
  });

  it('passes file that has a colocated test file', async () => {
    const tmpDir: string = join('/tmp', `lint-test-colocated-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const srcPath: string = join(tmpDir, 'math.ts');
    const testPath: string = join(tmpDir, 'math.test.ts');
    writeFileSync(testPath, `describe('add', () => { it('works', () => {}); });`);

    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireColocatedTests, code, srcPath);
    expect(results.length).toBe(0);

    rmSync(tmpDir, { recursive: true });
  });

  it('skips .d.ts files', async () => {
    const code: string = `
export function declaredFunc(): void;
`;
    const results: LintResult[] = await lint(requireColocatedTests, code, '/some/path/module.d.ts');
    expect(results.length).toBe(0);
  });

  it('skips type-only files (no exported functions)', async () => {
    const code: string = `
export type User = { name: string };
export interface Config { port: number };
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/types.ts',
    );
    expect(results.length).toBe(0);
  });

  it('detects exported arrow function variables', async () => {
    const code: string = `
export const multiply = (a: number, b: number): number => a * b;
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/math.ts',
    );
    expect(results.length).toBe(1);
  });

  it('detects export default function', async () => {
    const code: string = `
export default function handler(req: Request): Response {
  return new Response('ok');
}
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/handler.ts',
    );
    expect(results.length).toBe(1);
  });

  it('flags untested exported function when test file exists but misses function', async () => {
    const tmpDir: string = join('/tmp', `lint-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const srcPath: string = join(tmpDir, 'utils.ts');
    const testPath: string = join(tmpDir, 'utils.test.ts');

    // Test file only tests funcA, not funcB
    writeFileSync(testPath, `describe('funcA', () => { it('works', () => {}); });`);

    const code: string = `export function funcA(): Void { return undefined; }\nexport function funcB(): Void { return undefined; }`;
    const results: LintResult[] = await lint(requireColocatedTests, code, srcPath);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('funcB');

    rmSync(tmpDir, { recursive: true });
  });

  it('passes when all exported functions are referenced in test file', async () => {
    const tmpDir: string = join('/tmp', `lint-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const srcPath: string = join(tmpDir, 'utils.ts');
    const testPath: string = join(tmpDir, 'utils.test.ts');

    writeFileSync(testPath, `describe('funcA', () => {}); describe('funcB', () => {});`);

    const code: string = `export function funcA(): Void { return undefined; }\nexport function funcB(): Void { return undefined; }`;
    const results: LintResult[] = await lint(requireColocatedTests, code, srcPath);
    expect(results.length).toBe(0);

    rmSync(tmpDir, { recursive: true });
  });

  it('skips re-export without declaration (export { foo })', async () => {
    const code: string = `export { foo } from './other';`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/reexport.ts',
    );
    expect(results.length).toBe(0);
  });

  it('detects export default arrow function', async () => {
    const code: string = `export default (): void => {};`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/arrow.ts',
    );
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('no colocated test file');
  });

  it('detects export default function expression (anonymous)', async () => {
    const code: string = `export default function(): void {}`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/anon.ts',
    );
    expect(results.length).toBe(1);
  });

  it('skips exported variable that is not a function', async () => {
    const code: string = `export const CONFIG: object = { port: 3000 };`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/config.ts',
    );
    expect(results.length).toBe(0);
  });

  it('skips file with only re-exports and no functions', async () => {
    const code: string = `export { a } from './a';\nexport { b } from './b';`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/index.ts',
    );
    expect(results.length).toBe(0);
  });

  it('detects exported FunctionExpression variable', async () => {
    const code: string = `export const handler = function handle(req: Request): Response { return new Response('ok'); };`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/handler.ts',
    );
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// Helpers for workspace rules
// =============================================================================

/**
 * Create a mock WorkspaceContext for testing workspace rules.
 *
 * @param {object} overrides - Context overrides
 * @param {string} [overrides.rootDir] - Root directory path
 * @param {Map<string, string>} [overrides.files] - Map of file paths to contents
 * @param {WorkspacePackage[]} [overrides.packages] - Workspace packages
 * @returns {WorkspaceContext} Mock WorkspaceContext
 */
function mockContext(
  overrides: { rootDir?: string; files?: Map<string, string>; packages?: WorkspacePackage[] } = {},
): WorkspaceContext {
  const files: Map<string, string> = overrides.files ?? new Map();
  const packages: WorkspacePackage[] = overrides.packages ?? [];

  return {
    allFiles: async (): Promise<readonly string[]> => [...files.keys()],
    filesByExtension: async (...exts: string[]): Promise<readonly string[]> =>
      [...files.keys()].filter((f: string): boolean =>
        exts.some((ext: string): boolean => f.endsWith(ext)),
      ),
    dirExists: (_path: string): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(true);
      }),
    fileExists: (path: string): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(files.has(path));
      }),
    getWorkspacePackages: (): Promise<WorkspacePackage[]> =>
      new Promise<WorkspacePackage[]>((resolve: (v: WorkspacePackage[]) => void): void => {
        resolve(packages);
      }),
    readFile: (path: string): Promise<string> =>
      new Promise<string>((resolve: (v: string) => void, reject: (e: Error) => void): void => {
        const content: string | undefined = files.get(path);
        if (content === undefined) {
          reject(new Error(`File not found: ${path}`));
          return;
        }
        resolve(content);
      }),
    rootDir: overrides.rootDir ?? '/workspace',
  };
}

// =============================================================================
// testing/require-test-suffix
// =============================================================================

describe('testing/require-test-suffix', () => {
  it('has correct rule metadata', () => {
    expect(requireTestSuffix.id).toBe('testing/require-test-suffix');
    expect(requireTestSuffix.scope).toBe('workspace');
    expect(typeof requireTestSuffix.check).toBe('function');
  });

  it('flags *.spec.ts files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/utils.spec.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTestSuffix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('testing/require-test-suffix');
    expect(results[0]!.message).toContain('utils.spec.ts');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags *-test.ts files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/utils-test.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTestSuffix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('utils-test.ts');
  });

  it('flags *_test.ts files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/utils_test.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTestSuffix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('utils_test.ts');
  });

  it('allows *.test.ts files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/utils.test.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTestSuffix.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/utils.ts', ''],
      ['/workspace/src/index.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTestSuffix.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags *.spec.tsx files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/Button.spec.tsx', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTestSuffix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Button.spec.tsx');
  });
});

// =============================================================================
// testing/require-e2e-location
// =============================================================================

describe('testing/require-e2e-location', () => {
  it('has correct rule metadata', () => {
    expect(requireE2eLocation.id).toBe('testing/require-e2e-location');
    expect(requireE2eLocation.scope).toBe('workspace');
    expect(typeof requireE2eLocation.check).toBe('function');
  });

  it('flags *.e2e.ts outside e2e/ directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/login.e2e.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireE2eLocation.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('testing/require-e2e-location');
    expect(results[0]!.message).toContain('login.e2e.ts');
    expect(results[0]!.severity).toBe('error');
  });

  it('allows *.e2e.ts in e2e/ directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/e2e/login.e2e.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireE2eLocation.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows *.e2e.ts in tests/e2e/ directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/tests/e2e/login.e2e.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireE2eLocation.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows *.e2e.ts in nested e2e/ directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/e2e/login.e2e.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireE2eLocation.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-e2e files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/utils.ts', ''],
      ['/workspace/src/utils.test.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireE2eLocation.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// testing/require-integration-location
// =============================================================================

describe('testing/require-integration-location', () => {
  it('has correct rule metadata', () => {
    expect(requireIntegrationLocation.id).toBe('testing/require-integration-location');
    expect(requireIntegrationLocation.scope).toBe('workspace');
    expect(typeof requireIntegrationLocation.check).toBe('function');
  });

  it('flags *.integration.ts in random directory with no source files', async () => {
    const files: Map<string, string> = new Map([['/workspace/random/api.integration.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireIntegrationLocation.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('testing/require-integration-location');
    expect(results[0]!.message).toContain('api.integration.ts');
    expect(results[0]!.severity).toBe('warning');
  });

  it('allows *.integration.ts in tests/integration/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tests/integration/api.integration.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireIntegrationLocation.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows colocated *.integration.ts (source file in same dir)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/api.ts', ''],
      ['/workspace/src/api.integration.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireIntegrationLocation.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-integration files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/utils.ts', ''],
      ['/workspace/src/utils.test.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireIntegrationLocation.check(ctx);
    expect(results.length).toBe(0);
  });
});
