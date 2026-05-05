/**
 * Tests for import lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import { expectTextFix, type LintResult, type TypeScriptRule } from '../../framework/types.ts';

import noRelativeImports from './no-relative-imports.ts';
import noBarrelFiles from './no-barrel-files.ts';
import noReexport from './no-reexport.ts';
import noRawNodeImports from './no-raw-node-imports.ts';
import noRawJson from './no-raw-json.ts';
import requireImportGroups from './require-import-groups.ts';
import noJsExtension from './no-js-extension.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} filename - The filename to use
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(
  rule: TypeScriptRule,
  code: string,
  filename: string = 'test.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, [rule]);
}

// =============================================================================
// imports/no-relative-imports
// =============================================================================

describe('imports/no-relative-imports', () => {
  it('reports ./ relative imports', async () => {
    const code: string = "import { foo } from './foo.ts';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-relative-imports');
    expect(results[0]!.message).toContain('./foo.ts');
    expect(results[0]!.fix).toBeDefined();
  });

  it('reports ../ relative imports', async () => {
    const code: string = "import { bar } from '../utils/bar.ts';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('../utils/bar.ts');
  });

  it('passes non-relative imports', async () => {
    const code: string = "import { safeParse } from '@/utils/result/safe';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(0);
  });

  it('passes package imports', async () => {
    const code: string = "import * as v from 'valibot';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(0);
  });

  it('reports relative export { x } from syntax', async () => {
    const code: string = `export { foo } from './module.ts';`;
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-relative-imports');
    expect(results[0]!.message).toContain('./module.ts');
  });

  it('reports relative export * from syntax', async () => {
    const code: string = `export * from '../utils/index.ts';`;
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('../utils/index.ts');
  });

  it('passes non-relative export { x } from syntax', async () => {
    const code: string = `export { foo } from '@/utils/core/fs';`;
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// imports/no-barrel-files
// =============================================================================

describe('imports/no-barrel-files', () => {
  it('reports index.ts with export * re-exports', async () => {
    const code: string = `export * from './foo.ts';\nexport * from './bar.ts';`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'index.ts');
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-barrel-files');
    expect(results[0]!.message).toContain('Barrel file');
  });

  it('reports index.ts with named re-exports', async () => {
    const code: string = `export { foo } from './foo.ts';`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'index.ts');
    expect(results.length).toBe(1);
  });

  it('passes index.ts with original declarations only', async () => {
    const code: string = `export const FOO = 'bar';\nexport function baz(): void {}`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'index.ts');
    expect(results.length).toBe(0);
  });

  it('passes non-index.ts files with re-exports', async () => {
    const code: string = `export * from './foo.ts';`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'utils.ts');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// imports/no-reexport
// =============================================================================

describe('imports/no-reexport', () => {
  it('reports export * from syntax', async () => {
    const code: string = `export * from './module.ts';`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-reexport');
    expect(results[0]!.message).toContain('Re-export');
  });

  it('reports export { x } from syntax', async () => {
    const code: string = `export { foo, bar } from './module.ts';`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Re-export');
  });

  it('passes original export declarations', async () => {
    const code: string = `export const foo = 'bar';\nexport function baz(): void {}`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(0);
  });

  it('passes regular export without source', async () => {
    const code: string = `const foo = 1;\nexport { foo };`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(0);
  });

  it('flags re-exports in index.ts (no exemption)', async () => {
    const code: string = `export { foo, bar } from './module.ts';`;
    const results: LintResult[] = await lint(noReexport, code, 'index.ts');
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-reexport');
  });

  it('flags export * in index.ts (no exemption)', async () => {
    const code: string = `export * from './module.ts';`;
    const results: LintResult[] = await lint(noReexport, code, 'index.ts');
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// imports/no-raw-node-imports
// =============================================================================

describe('imports/no-raw-node-imports', () => {
  it('reports value import from node:fs', async () => {
    const code: string = "import { readFileSync } from 'node:fs';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-raw-node-imports');
    expect(results[0]!.message).toContain('node:fs');
    expect(results[0]!.tip).toContain('@/utils/core');
  });

  it('reports value import from node:child_process', async () => {
    const code: string = "import { execSync } from 'node:child_process';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('node:child_process');
  });

  it('reports value import from node:path', async () => {
    const code: string = "import { resolve } from 'node:path';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('node:path');
  });

  it('passes type-only imports from node:*', async () => {
    const code: string = "import type { ChildProcess } from 'node:child_process';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(0);
  });

  it('passes non-node imports', async () => {
    const code: string = "import { readFile } from '@/utils/core/fs';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(0);
  });

  it('passes valibot imports', async () => {
    const code: string = "import * as v from 'valibot';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(0);
  });

  it('exempts files in utils/core/src/', async () => {
    const code: string = "import { readFileSync } from 'node:fs';";
    const results: LintResult[] = await lint(
      noRawNodeImports,
      code,
      'packages/shared/utils/core/src/fs.ts',
    );
    expect(results.length).toBe(0);
  });

  it('exempts files in config/tooling/lint/', async () => {
    const code: string = "import { existsSync } from 'node:fs';";
    const results: LintResult[] = await lint(
      noRawNodeImports,
      code,
      'packages/shared/config/tooling/lint/src/cli.ts',
    );
    expect(results.length).toBe(0);
  });

  it('exempts files in config/test/', async () => {
    const code: string = "import { mkdtempSync } from 'node:fs';";
    const results: LintResult[] = await lint(
      noRawNodeImports,
      code,
      'packages/shared/config/test/src/harness/temp-dir.ts',
    );
    expect(results.length).toBe(0);
  });

  it('exempts .test.ts files', async () => {
    const code: string = "import { writeFileSync } from 'node:fs';";
    const results: LintResult[] = await lint(noRawNodeImports, code, 'my-module.test.ts');
    expect(results.length).toBe(0);
  });

  it('reports multiple node imports in same file', async () => {
    const code: string = [
      "import { readFileSync } from 'node:fs';",
      "import { execSync } from 'node:child_process';",
    ].join('\n');
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results.length).toBe(2);
  });

  it('provides correct alternative suggestion for node:fs', async () => {
    const code: string = "import { readFileSync } from 'node:fs';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results[0]!.tip).toContain('@/utils/core/fs');
  });

  it('provides correct alternative suggestion for node:child_process', async () => {
    const code: string = "import { execSync } from 'node:child_process';";
    const results: LintResult[] = await lint(noRawNodeImports, code);
    expect(results[0]!.tip).toContain('@/utils/core/shell');
  });
});

// =============================================================================
// imports/no-raw-json
// =============================================================================

describe('imports/no-raw-json', () => {
  it('reports JSON.stringify usage', async () => {
    const code: string = `const json: string = JSON.stringify(data);`;
    const results: LintResult[] = await lint(noRawJson, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-raw-json');
    expect(results[0]!.message).toContain('JSON.stringify');
    expect(results[0]!.message).toContain('safeStringify');
  });

  it('reports JSON.parse usage', async () => {
    const code: string = `const data: unknown = JSON.parse(rawJson);`;
    const results: LintResult[] = await lint(noRawJson, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('JSON.parse');
    expect(results[0]!.message).toContain('parseJsonWithComments');
  });

  it('passes non-JSON member access', async () => {
    const code: string = `const x: string = obj.stringify();`;
    const results: LintResult[] = await lint(noRawJson, code);
    expect(results.length).toBe(0);
  });

  it('passes safeStringify usage', async () => {
    const code: string = `const json: Result<Str> = safeStringify(data);`;
    const results: LintResult[] = await lint(noRawJson, code);
    expect(results.length).toBe(0);
  });

  it('reports multiple JSON usages', async () => {
    const code: string = [
      `const a: string = JSON.stringify(x);`,
      `const b: unknown = JSON.parse(y);`,
    ].join('\n');
    const results: LintResult[] = await lint(noRawJson, code);
    expect(results.length).toBe(2);
  });
});

// =============================================================================
// imports/no-js-extension
// =============================================================================

describe('imports/no-js-extension', () => {
  it('reports .js extension in import', async () => {
    const code: string = `import { foo } from './module.js';`;
    const results: LintResult[] = await lint(noJsExtension, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('imports/no-js-extension');
    expect(results[0]!.message).toContain('.js');
    expect(results[0]!.tip).toContain('.ts');
  });

  it('reports .js extension in named export', async () => {
    const code: string = `export { foo } from './module.js';`;
    const results: LintResult[] = await lint(noJsExtension, code);
    expect(results.length).toBe(1);
  });

  it('reports .js extension in export all', async () => {
    const code: string = `export * from './module.js';`;
    const results: LintResult[] = await lint(noJsExtension, code);
    expect(results.length).toBe(1);
  });

  it('passes .ts extension in import', async () => {
    const code: string = `import { foo } from './module.ts';`;
    const results: LintResult[] = await lint(noJsExtension, code);
    expect(results.length).toBe(0);
  });

  it('passes import without extension', async () => {
    const code: string = `import { foo } from '@/utils/core/fs';`;
    const results: LintResult[] = await lint(noJsExtension, code);
    expect(results.length).toBe(0);
  });

  it('allows bare npm package names ending in .js', async () => {
    const code: string = `import { initPerfume } from 'perfume.js';`;
    const results: LintResult[] = await lint(noJsExtension, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// imports/require-import-groups
// =============================================================================

describe('imports/require-import-groups', () => {
  it('flags missing blank line between external and workspace imports', async () => {
    const code: string = `import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
`;
    const results: LintResult[] = await lint(requireImportGroups, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('blank line');
  });

  it('passes with blank line between external and workspace imports', async () => {
    const code: string = `import * as v from 'valibot';

import { StrSchema } from '@/schemas/common';
`;
    const results: LintResult[] = await lint(requireImportGroups, code);
    expect(results.length).toBe(0);
  });

  it('passes with single import group', async () => {
    const code: string = `import { StrSchema } from '@/schemas/common';
import { ERRORS } from '@/schemas/result/result';
`;
    const results: LintResult[] = await lint(requireImportGroups, code);
    expect(results.length).toBe(0);
  });

  it('flags missing blank line between node and external imports', async () => {
    const code: string = `import { readFileSync } from 'node:fs';
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(requireImportGroups, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('node');
  });

  it('provides fix with newline text to insert blank line between groups', async () => {
    const code: string = `import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
`;
    const results: LintResult[] = await lint(requireImportGroups, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix).toBeDefined();
    expect(expectTextFix(results[0]!.fix).text).toBe('\n');
  });

  it('has fixable: true in the rule definition', () => {
    expect(requireImportGroups.fixable).toBe(true);
  });
});
