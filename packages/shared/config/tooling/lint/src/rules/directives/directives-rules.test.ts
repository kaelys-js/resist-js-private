/**
 * Tests for directives lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noTsIgnore from './no-ts-ignore.ts';
import noTsNocheck from './no-ts-nocheck.ts';
import requireTsExpectErrorReason from './require-ts-expect-error-reason.ts';
import noTsExpectErrorOnAny from './no-ts-expect-error-on-any.ts';
import noEslintDisable from './no-eslint-disable.ts';
import noPrettierIgnore from './no-prettier-ignore.ts';
import noBiomeIgnore from './no-biome-ignore.ts';
import noOxlintIgnore from './no-oxlint-ignore.ts';
import noTypeAssertionChain from './no-type-assertion-chain.ts';
import maxSuppressionsPerFile from './max-suppressions-per-file.ts';
import noSuppressionInNewCode from './no-suppression-in-new-code.ts';
import noGenericAnyAssertion from './no-generic-any-assertion.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} filename - Optional filename override
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
// directives/no-ts-ignore
// =============================================================================

describe('directives/no-ts-ignore', () => {
  it('reports @ts-ignore comment', async () => {
    const code: string = `// @ts-ignore\nconst x = 1;`;
    const results: LintResult[] = await lint(noTsIgnore, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-ts-ignore');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@ts-ignore is banned');
  });

  it('reports @ts-ignore in block comment', async () => {
    const code: string = `/* @ts-ignore */\nconst x = 1;`;
    const results: LintResult[] = await lint(noTsIgnore, code);
    expect(results.length).toBe(1);
  });

  it('passes clean code without @ts-ignore', async () => {
    const code: string = `const x: number = 1;\nconst y: string = 'hello';`;
    const results: LintResult[] = await lint(noTsIgnore, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-ts-nocheck
// =============================================================================

describe('directives/no-ts-nocheck', () => {
  it('reports @ts-nocheck comment', async () => {
    const code: string = `// @ts-nocheck\nexport function doStuff(x) { return x; }`;
    const results: LintResult[] = await lint(noTsNocheck, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-ts-nocheck');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@ts-nocheck is banned');
  });

  it('passes code without @ts-nocheck', async () => {
    const code: string = `export function doStuff(x: number): number { return x; }`;
    const results: LintResult[] = await lint(noTsNocheck, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/require-ts-expect-error-reason
// =============================================================================

describe('directives/require-ts-expect-error-reason', () => {
  it('reports @ts-expect-error without reason', async () => {
    const code: string = `// @ts-expect-error\nconst x = badCode();`;
    const results: LintResult[] = await lint(requireTsExpectErrorReason, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/require-ts-expect-error-reason');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('requires explanation');
  });

  it('reports @ts-expect-error with short reason (< 10 chars)', async () => {
    const code: string = `// @ts-expect-error - TODO\nconst x = badCode();`;
    const results: LintResult[] = await lint(requireTsExpectErrorReason, code);
    expect(results.length).toBe(1);
  });

  it('passes @ts-expect-error with valid reason (>= 10 chars)', async () => {
    const code: string = `// @ts-expect-error - Legacy API returns untyped response, tracked in JIRA-123\nconst x = badCode();`;
    const results: LintResult[] = await lint(requireTsExpectErrorReason, code);
    expect(results.length).toBe(0);
  });

  it('passes code without @ts-expect-error', async () => {
    const code: string = `const x: number = 1;`;
    const results: LintResult[] = await lint(requireTsExpectErrorReason, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-ts-expect-error-on-any
// =============================================================================

describe('directives/no-ts-expect-error-on-any', () => {
  it('reports @ts-expect-error when next line has : any', async () => {
    const code: string = `// @ts-expect-error - reason here is long enough\nconst data: any = fetchData();`;
    const results: LintResult[] = await lint(noTsExpectErrorOnAny, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-ts-expect-error-on-any');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain("'any' typed code");
  });

  it('passes @ts-expect-error when next line has no any', async () => {
    const code: string = `// @ts-expect-error - Legacy API, tracked in JIRA-123\nconst data: unknown = fetchData();`;
    const results: LintResult[] = await lint(noTsExpectErrorOnAny, code);
    expect(results.length).toBe(0);
  });

  it('passes code without @ts-expect-error', async () => {
    const code: string = `const data: string = 'hello';`;
    const results: LintResult[] = await lint(noTsExpectErrorOnAny, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-eslint-disable
// =============================================================================

describe('directives/no-eslint-disable', () => {
  it('reports eslint-disable comment', async () => {
    const code: string = `/* eslint-disable */\nconst x = 1;`;
    const results: LintResult[] = await lint(noEslintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-eslint-disable');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('ESLint directive');
  });

  it('reports eslint-disable-next-line', async () => {
    const code: string = `// eslint-disable-next-line no-unused-vars\nconst x = 1;`;
    const results: LintResult[] = await lint(noEslintDisable, code);
    expect(results.length).toBe(1);
  });

  it('reports eslint-enable', async () => {
    const code: string = `/* eslint-enable */\nconst x = 1;`;
    const results: LintResult[] = await lint(noEslintDisable, code);
    expect(results.length).toBe(1);
  });

  it('passes clean code without eslint directives', async () => {
    const code: string = `const x: number = 1;`;
    const results: LintResult[] = await lint(noEslintDisable, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-prettier-ignore
// =============================================================================

describe('directives/no-prettier-ignore', () => {
  it('reports prettier-ignore comment', async () => {
    const code: string = `// prettier-ignore\nconst x = {a:1};`;
    const results: LintResult[] = await lint(noPrettierIgnore, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-prettier-ignore');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Prettier directives');
  });

  it('reports prettier-ignore-start', async () => {
    const code: string = `/* prettier-ignore-start */\nconst x = 1;\n/* prettier-ignore-end */`;
    const results: LintResult[] = await lint(noPrettierIgnore, code);
    expect(results.length).toBe(2);
  });

  it('passes clean code without prettier directives', async () => {
    const code: string = `const x: number = 1;`;
    const results: LintResult[] = await lint(noPrettierIgnore, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-biome-ignore
// =============================================================================

describe('directives/no-biome-ignore', () => {
  it('reports biome-ignore comment', async () => {
    const code: string = `// biome-ignore lint/complexity/noForEach: I prefer forEach\narray.forEach(item => process(item));`;
    const results: LintResult[] = await lint(noBiomeIgnore, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-biome-ignore');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Biome ignore directives');
  });

  it('passes clean code without biome-ignore', async () => {
    const code: string = `for (const item of array) { process(item); }`;
    const results: LintResult[] = await lint(noBiomeIgnore, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-oxlint-ignore
// =============================================================================

describe('directives/no-oxlint-ignore', () => {
  it('reports oxlint-ignore comment', async () => {
    const code: string = `// oxlint-ignore\nconst unused = 'value';`;
    const results: LintResult[] = await lint(noOxlintIgnore, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-oxlint-ignore');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Oxlint directives');
  });

  it('reports oxlint-disable comment', async () => {
    const code: string = `/* oxlint-disable no-console */\nconsole.log('debug');`;
    const results: LintResult[] = await lint(noOxlintIgnore, code);
    expect(results.length).toBe(1);
  });

  it('reports oxlint-enable comment', async () => {
    const code: string = `/* oxlint-enable no-console */\nconsole.log('debug');`;
    const results: LintResult[] = await lint(noOxlintIgnore, code);
    expect(results.length).toBe(1);
  });

  it('passes clean code without oxlint directives', async () => {
    const code: string = `const x: number = 1;`;
    const results: LintResult[] = await lint(noOxlintIgnore, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-type-assertion-chain
// =============================================================================

describe('directives/no-type-assertion-chain', () => {
  it('reports as unknown as Type chain', async () => {
    const code: string = `const user = data as unknown as User;`;
    const results: LintResult[] = await lint(noTypeAssertionChain, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-type-assertion-chain');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Double type assertion');
  });

  it('reports as any as Type chain', async () => {
    const code: string = `const config = response as any as Config;`;
    const results: LintResult[] = await lint(noTypeAssertionChain, code);
    expect(results.length).toBe(1);
  });

  it('passes single as assertion', async () => {
    const code: string = `const user = data as User;`;
    const results: LintResult[] = await lint(noTypeAssertionChain, code);
    expect(results.length).toBe(0);
  });

  it('passes as const assertion', async () => {
    const code: string = `const values = [1, 2, 3] as const;`;
    const results: LintResult[] = await lint(noTypeAssertionChain, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/max-suppressions-per-file
// =============================================================================

describe('directives/max-suppressions-per-file', () => {
  it('reports when file has more than 3 @ts-expect-error', async () => {
    const code: string = [
      '// @ts-expect-error - reason one is long enough',
      'code1();',
      '// @ts-expect-error - reason two is long enough',
      'code2();',
      '// @ts-expect-error - reason three is long enough',
      'code3();',
      '// @ts-expect-error - reason four is long enough',
      'code4();',
    ].join('\n');
    const results: LintResult[] = await lint(maxSuppressionsPerFile, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/max-suppressions-per-file');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('4');
    expect(results[0]!.message).toContain('max: 3');
  });

  it('passes when file has exactly 3 @ts-expect-error', async () => {
    const code: string = [
      '// @ts-expect-error - reason one is long enough',
      'code1();',
      '// @ts-expect-error - reason two is long enough',
      'code2();',
      '// @ts-expect-error - reason three is long enough',
      'code3();',
    ].join('\n');
    const results: LintResult[] = await lint(maxSuppressionsPerFile, code);
    expect(results.length).toBe(0);
  });

  it('passes when file has no @ts-expect-error', async () => {
    const code: string = `const x: number = 1;`;
    const results: LintResult[] = await lint(maxSuppressionsPerFile, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-suppression-in-new-code
// =============================================================================

describe('directives/no-suppression-in-new-code', () => {
  it('reports @ts-expect-error as advisory warning', async () => {
    const code: string = `// @ts-expect-error - some reason here for the error\nconst x = badCode();`;
    const results: LintResult[] = await lint(noSuppressionInNewCode, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-suppression-in-new-code');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('should not have @ts-expect-error');
  });

  it('passes code without @ts-expect-error', async () => {
    const code: string = `const x: number = 1;`;
    const results: LintResult[] = await lint(noSuppressionInNewCode, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// directives/no-generic-any-assertion
// =============================================================================

describe('directives/no-generic-any-assertion', () => {
  it('reports as any assertion', async () => {
    const code: string = `const value = getData() as any;`;
    const results: LintResult[] = await lint(noGenericAnyAssertion, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('directives/no-generic-any-assertion');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain("'as any' assertion");
  });

  it('passes as unknown assertion', async () => {
    const code: string = `const value = getData() as unknown;`;
    const results: LintResult[] = await lint(noGenericAnyAssertion, code);
    expect(results.length).toBe(0);
  });

  it('passes as specific type assertion', async () => {
    const code: string = `const value = getData() as string;`;
    const results: LintResult[] = await lint(noGenericAnyAssertion, code);
    expect(results.length).toBe(0);
  });
});
