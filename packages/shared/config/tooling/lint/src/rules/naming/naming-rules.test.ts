/**
 * Tests for naming convention lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import constantScreamingCase from './constant-screaming-case.ts';
import camelCaseVars from './camel-case-vars.ts';
import pascalCaseTypes from './pascal-case-types.ts';
import svelteFilePascalCase from './svelte-file-pascal-case.ts';
import tsFileKebabCase from './ts-file-kebab-case.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} filename - The filename to use
 * @returns {Promise<LintResult[]>} Array of lint results
 */
async function lint(
  rule: TypeScriptRule,
  code: string,
  filename: string = 'test.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, [rule]);
}

// =============================================================================
// naming/constant-screaming-case
// =============================================================================

describe('naming/constant-screaming-case', () => {
  it('reports top-level const with string literal not in SCREAMING_SNAKE_CASE', async () => {
    const code: string = `const myValue = 'hello';`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('myValue');
    expect(results[0].message).toContain('SCREAMING_SNAKE_CASE');
  });

  it('passes top-level const in SCREAMING_SNAKE_CASE', async () => {
    const code: string = `const MY_VALUE = 'hello';`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(0);
  });

  it('reports exported const with number literal not in SCREAMING_SNAKE_CASE', async () => {
    const code: string = `export const maxRetries = 5;`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('maxRetries');
  });

  it('does not flag const with object initializer', async () => {
    const code: string = `const myConfig = { a: 1 };`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(0);
  });

  it('does not flag const with function initializer', async () => {
    const code: string = `const myFunc = (): void => {};`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(0);
  });

  it('reports const with new Set() not in SCREAMING_SNAKE_CASE', async () => {
    const code: string = `const mySet = new Set(['a', 'b']);`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(1);
  });

  it('passes const with new Set() in SCREAMING_SNAKE_CASE', async () => {
    const code: string = `const MY_SET = new Set(['a', 'b']);`;
    const results: LintResult[] = await lint(constantScreamingCase, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// naming/camel-case-vars
// =============================================================================

describe('naming/camel-case-vars', () => {
  it('reports let variable not in camelCase', async () => {
    const code: string = `let MyVar = 1;`;
    const results: LintResult[] = await lint(camelCaseVars, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('MyVar');
  });

  it('passes let variable in camelCase', async () => {
    const code: string = `let myVar = 1;`;
    const results: LintResult[] = await lint(camelCaseVars, code);
    expect(results.length).toBe(0);
  });

  it('reports function not in camelCase', async () => {
    const code: string = `function MyFunc(): void {}`;
    const results: LintResult[] = await lint(camelCaseVars, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('MyFunc');
  });

  it('passes function in camelCase', async () => {
    const code: string = `function myFunc(): void {}`;
    const results: LintResult[] = await lint(camelCaseVars, code);
    expect(results.length).toBe(0);
  });

  it('allows SCREAMING_SNAKE_CASE const (handled by other rule)', async () => {
    const code: string = `const MAX_VALUE = 100;`;
    const results: LintResult[] = await lint(camelCaseVars, code);
    expect(results.length).toBe(0);
  });

  it('allows underscore-only names', async () => {
    const code: string = `const _ = 'ignored';`;
    const results: LintResult[] = await lint(camelCaseVars, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// naming/pascal-case-types
// =============================================================================

describe('naming/pascal-case-types', () => {
  it('reports type alias not in PascalCase', async () => {
    const code: string = `type myType = string;`;
    const results: LintResult[] = await lint(pascalCaseTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('myType');
  });

  it('passes type alias in PascalCase', async () => {
    const code: string = `type MyType = string;`;
    const results: LintResult[] = await lint(pascalCaseTypes, code);
    expect(results.length).toBe(0);
  });

  it('reports interface not in PascalCase', async () => {
    const code: string = `interface myInterface { x: number; }`;
    const results: LintResult[] = await lint(pascalCaseTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('myInterface');
  });

  it('passes interface in PascalCase', async () => {
    const code: string = `interface MyInterface { x: number; }`;
    const results: LintResult[] = await lint(pascalCaseTypes, code);
    expect(results.length).toBe(0);
  });

  it('reports enum not in PascalCase', async () => {
    const code: string = `enum myEnum { A, B }`;
    const results: LintResult[] = await lint(pascalCaseTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('myEnum');
  });

  it('passes enum in PascalCase', async () => {
    const code: string = `enum MyEnum { A, B }`;
    const results: LintResult[] = await lint(pascalCaseTypes, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// naming/svelte-file-pascal-case
// =============================================================================

describe('naming/svelte-file-pascal-case', () => {
  it('reports non-PascalCase .svelte filename', async () => {
    const code: string = `<script>let x = 1;</script>`;
    const results: LintResult[] = await lint(svelteFilePascalCase, code, 'scene-editor.svelte');
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('scene-editor.svelte');
  });

  it('passes PascalCase .svelte filename', async () => {
    const code: string = `<script>let x = 1;</script>`;
    const results: LintResult[] = await lint(svelteFilePascalCase, code, 'SceneEditor.svelte');
    expect(results.length).toBe(0);
  });

  it('exempts SvelteKit convention files', async () => {
    const code: string = `<script>let x = 1;</script>`;
    const results: LintResult[] = await lint(svelteFilePascalCase, code, '+page.svelte');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// naming/ts-file-kebab-case
// =============================================================================

describe('naming/ts-file-kebab-case', () => {
  it('reports non-kebab-case .ts filename', async () => {
    const code: string = `const x = 1;`;
    const results: LintResult[] = await lint(tsFileKebabCase, code, 'SceneLoader.ts');
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('SceneLoader.ts');
  });

  it('passes kebab-case .ts filename', async () => {
    const code: string = `const x = 1;`;
    const results: LintResult[] = await lint(tsFileKebabCase, code, 'scene-loader.ts');
    expect(results.length).toBe(0);
  });

  it('exempts .svelte.ts files', async () => {
    const code: string = `const x = 1;`;
    const results: LintResult[] = await lint(tsFileKebabCase, code, 'MyComponent.svelte.ts');
    expect(results.length).toBe(0);
  });

  it('exempts .test.ts files', async () => {
    const code: string = `const x = 1;`;
    const results: LintResult[] = await lint(tsFileKebabCase, code, 'myTest.test.ts');
    expect(results.length).toBe(0);
  });

  it('exempts SvelteKit convention files', async () => {
    const code: string = `const x = 1;`;
    const results: LintResult[] = await lint(tsFileKebabCase, code, '+page.ts');
    expect(results.length).toBe(0);
  });

  it('exempts .config.ts files', async () => {
    const code: string = `const x = 1;`;
    const results: LintResult[] = await lint(tsFileKebabCase, code, 'vite.config.ts');
    expect(results.length).toBe(0);
  });
});
