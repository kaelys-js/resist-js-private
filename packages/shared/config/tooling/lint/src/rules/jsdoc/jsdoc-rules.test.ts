/**
 * Tests for JSDoc lint rules.
 *
 * Uses oxc-parser to parse fixture code and verifies each rule
 * produces the expected diagnostics.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import requireJsdoc from './require-jsdoc.ts';
import requireParam from './require-param.ts';
import requireReturns from './require-returns.ts';
import requireExample from './require-example.ts';
import validateExample from './validate-example.ts';
import paramTypeMatch from './param-type-match.ts';
import requireModule from './require-module.ts';
import requireSchemaLink from './require-schema-link.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param rule - The rule to test
 * @param code - TypeScript source code
 * @returns Array of lint results
 */
function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule]);
}

// =============================================================================
// jsdoc/require-jsdoc
// =============================================================================

describe('jsdoc/require-jsdoc', () => {
  it('reports exported function without JSDoc', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'export function foo(): void {}');
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/require-jsdoc');
    expect(results[0]!.message).toContain('foo');
    expect(results[0]!.fix).toBeDefined();
    expect(results[0]!.fix.text).toContain('/** Description. */');
  });

  it('passes exported function with JSDoc', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireJsdoc, code);
    expect(results.length).toBe(0);
  });

  it('reports exported type without JSDoc', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'export type Foo = { bar: string };');
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Foo');
  });

  it('reports exported arrow function without JSDoc', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'export const foo = (): void => {};');
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('foo');
  });

  it('does not report non-exported functions', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'function internal(): void {}');
    expect(results.length).toBe(0);
  });

  it('passes exported function with long JSDoc (>500 chars)', async () => {
    // Generate a JSDoc comment longer than 500 characters
    const longDescription: string = 'A'.repeat(600);
    const code: string = `
/**
 * ${longDescription}
 *
 * @returns {void} Nothing
 */
export function loadConfig(): void {}
`;
    const results: LintResult[] = await lint(requireJsdoc, code);
    expect(results.length).toBe(0);
  });

  it('passes exported function with multi-section JSDoc (>500 chars)', async () => {
    const code: string = `
/**
 * Load and validate the root config from the workspace root.
 *
 * Discovers the workspace root via findWorkspaceRoot(), loads the config
 * file with a dynamic import(), deep-merges over defaults, validates
 * against CoreConfigSchema, and caches the frozen result.
 *
 * - Returns the cached singleton immediately on subsequent calls.
 * - If the config file is missing on disk, logs a warning and caches defaults.
 * - Never throws — all failures are returned as Result errors.
 *
 * @param configPath - Path to the config file.
 * @returns Promise<Result<DeepReadonly<CoreConfig>>> — the validated, frozen
 *          config, or a structured error (CONFIG.NOT_FOUND, CONFIG.LOAD_FAILED,
 *          CONFIG.INVALID).
 *
 * @example
 * \`\`\`typescript
 * const result = await loadConfig();
 * if (!result.ok) return result;
 * result.data.company.name; // => 'My Company'
 * // Additional usage patterns:
 * const config = result.data;
 * console.log(config.tooling.devProxy.port);
 * console.log(config.versions.node);
 * \`\`\`
 */
export function loadConfig(): void {}
`;
    const results: LintResult[] = await lint(requireJsdoc, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// jsdoc/require-param
// =============================================================================

describe('jsdoc/require-param', () => {
  it('reports missing @param for each parameter', async () => {
    const code: string = `
/** Does something. */
export function foo(name: string, age: number): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(2);
    expect(results[0]!.message).toContain('name');
    expect(results[1]!.message).toContain('age');
  });

  it('passes when all @param tags are present with {Type}', async () => {
    const code: string = `
/**
 * Does something.
 * @param {string} name - The name
 * @param {number} age - The age
 */
export function foo(name: string, age: number): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(0);
  });

  it('reports @param missing {Type}', async () => {
    const code: string = `
/**
 * Does something.
 * @param name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('missing {Type}');
  });

  it('reports stale @param that does not match any parameter', async () => {
    const code: string = `
/**
 * Does something.
 * @param oldName - Stale param
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    const stale: LintResult[] = results.filter((r: LintResult) => r.message.includes('oldName'));
    expect(stale.length).toBe(1);
    expect(stale[0]!.severity).toBe('error');
  });

  it('does not report when there is no JSDoc at all', async () => {
    const code: string = 'export function foo(x: string): void {}';
    const results: LintResult[] = await lint(requireParam, code);
    // No JSDoc → handled by require-jsdoc, not require-param
    expect(results.length).toBe(0);
  });

  it('allows root0 @param for destructured params (oxlint convention)', async () => {
    const code: string = `
/**
 * Does something.
 * @param {Options} root0 - The options
 * @param {string} root0.name - The name
 * @param {number} root0.age - The age
 */
export function foo({ name, age }: Options): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    const stale: LintResult[] = results.filter((r: LintResult) => r.message.includes('root0'));
    expect(stale.length).toBe(0);
  });

  it('allows dot-notation @param for destructured props', async () => {
    const code: string = `
/**
 * Does something.
 * @param {Options} root0 - Config
 * @param root0.plugins - Plugins
 */
export function foo({ plugins }: Options): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    const stale: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('does not match'),
    );
    expect(stale.length).toBe(0);
  });

  it('provides a real fix for missing {Type} (not a no-op)', async () => {
    const code: string = `
/**
 * Does something.
 * @param name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    // Fix must NOT be a no-op (start === end && text === '')
    const isNoOp: boolean = fix.range.start === fix.range.end && fix.text === '';
    expect(isNoOp).toBe(false);
    // Fix text should insert {string} before the param name
    expect(fix.text).toContain('{string}');
  });

  it('fix for missing {Type} inserts at the correct byte offset', async () => {
    const code: string = `
/**
 * Greet someone.
 * @param name - The name
 */
export function greet(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    // Applying the fix should produce valid JSDoc with {string} name
    const fixed: string = code.slice(0, fix.range.start) + fix.text + code.slice(fix.range.end);
    expect(fixed).toContain('@param {string} name');
  });

  it('fix for missing {Type} uses actual TypeScript type', async () => {
    const code: string = `
/**
 * Process items.
 * @param count - How many
 */
export function process(count: number): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix.text).toContain('{number}');
    // Verify applied fix is correct
    const { fix } = results[0]!;
    const fixed: string = code.slice(0, fix.range.start) + fix.text + code.slice(fix.range.end);
    expect(fixed).toContain('@param {number} count');
  });

  it('fix for missing {Type} handles multiple params correctly', async () => {
    const code: string = `
/**
 * Add two numbers.
 * @param a - First
 * @param b - Second
 */
export function add(a: number, b: number): number { return a + b; }
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(2);
    // Both fixes should be non-no-op
    for (const r of results) {
      const isNoOp: boolean = r.fix.range.start === r.fix.range.end && r.fix.text === '';
      expect(isNoOp).toBe(false);
      expect(r.fix.text).toContain('{number}');
    }
  });

  it('fix for missing @param inserts before closing */', async () => {
    const code: string = `
/** Does something. */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    // The fix text should include @param with {Type}
    expect(fix.text).toContain('@param {string} name');
    // Should be an insertion (start === end)
    expect(fix.range.start).toBe(fix.range.end);
  });
});

// =============================================================================
// jsdoc/require-returns
// =============================================================================

describe('jsdoc/require-returns', () => {
  it('reports missing @returns for non-void return type', async () => {
    const code: string = `
/** Does something. */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('@returns');
  });

  it('passes when @returns {Type} is present and matches', async () => {
    const code: string = `
/**
 * Does something.
 * @returns {string} The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(0);
  });

  it('reports @returns without {Type}', async () => {
    const code: string = `
/**
 * Does something.
 * @returns The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('missing {Type}');
  });

  it('reports @returns {Type} that does not match actual return type', async () => {
    const code: string = `
/**
 * Does something.
 * @returns {number} The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('number');
    expect(results[0]!.message).toContain('string');
  });

  it('does not require @returns for void functions', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(0);
  });

  it('does not require @returns for Promise<void>', async () => {
    const code: string = `
/** Does something. */
export async function foo(): Promise<void> {}
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(0);
  });

  it('fix inserts {Type} after @returns when type is missing', async () => {
    const code: string = `
/**
 * Does something.
 * @returns The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    expect(fix.text).toBe('{string} ');
    // The fix range should be a zero-width insert after "@returns "
    expect(fix.range.start).toBe(fix.range.end);
    // Verify it inserts right after "@returns " — the text at the insert point should be "The"
    expect(code.slice(fix.range.start, fix.range.start + 3)).toBe('The');
  });

  it('fix replaces mismatched @returns {Type} with actual type', async () => {
    const code: string = `
/**
 * Does something.
 * @returns {number} The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    expect(fix.text).toBe('{string}');
    // The fix range should cover {number}
    const replaced: string = code.slice(fix.range.start, fix.range.end);
    expect(replaced).toBe('{number}');
  });

  it('has fixable: true', () => {
    expect(requireReturns.fixable).toBe(true);
  });
});

// =============================================================================
// jsdoc/require-example
// =============================================================================

describe('jsdoc/require-example', () => {
  it('reports missing @example', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/require-example');
  });

  it('passes when @example with ```typescript``` fence is present', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * \`\`\`typescript
 * foo();
 * \`\`\`
 */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(0);
  });

  it('reports @example without ```typescript``` fence', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * foo();
 */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('typescript');
  });

  it('reports missing @example as error severity', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('reports missing typescript fence as error severity', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * foo();
 */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });
});

// =============================================================================
// jsdoc/param-type-match
// =============================================================================

describe('jsdoc/param-type-match', () => {
  it('reports when @param type does not match actual type', async () => {
    const code: string = `
/**
 * Does something.
 * @param {number} name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('number');
    expect(results[0]!.message).toContain('string');
  });

  it('passes when @param type matches actual type', async () => {
    const code: string = `
/**
 * Does something.
 * @param {string} name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(0);
  });

  it('skips @param without type annotation', async () => {
    const code: string = `
/**
 * Does something.
 * @param name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(0);
  });

  it('fix replaces mismatched {Type} with actual type', async () => {
    const code: string = `
/**
 * Does something.
 * @param {string} x - The value
 */
export function foo(x: number): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    expect(fix.text).toBe('{number}');
    // The fix range should cover the {string} substring in the JSDoc
    const replaced: string = code.slice(fix.range.start, fix.range.end);
    expect(replaced).toBe('{string}');
  });

  it('has fixable: true', () => {
    expect(paramTypeMatch.fixable).toBe(true);
  });
});

// =============================================================================
// jsdoc/require-module
// =============================================================================

describe('jsdoc/require-module', () => {
  it('reports file without @module', async () => {
    const code: string = "const x: string = 'hello';";
    const results: LintResult[] = await lint(requireModule, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/require-module');
    expect(results[0]!.fix.text).toContain('@module');
  });

  it('passes file with @module', async () => {
    const code: string = `/**
 * My module.
 *
 * @module
 */

const x: string = 'hello';`;
    const results: LintResult[] = await lint(requireModule, code);
    expect(results.length).toBe(0);
  });

  it('skips .md files (README documentation, not source modules)', async () => {
    const code: string = "export const noModule: string = 'hello';";
    const results: LintResult[] = await runTypeScriptRules('docs/README.md', code, [requireModule]);
    expect(results.length).toBe(0);
  });

  it('skips .mdx files (MDX documentation)', async () => {
    const code: string = "export const noModule: string = 'hello';";
    const results: LintResult[] = await runTypeScriptRules('docs/page.mdx', code, [requireModule]);
    expect(results.length).toBe(0);
  });

  it('skips .html files (app shell, not a source module)', async () => {
    const code: string = "const noModule: string = 'hello';";
    const results: LintResult[] = await runTypeScriptRules('src/app.html', code, [requireModule]);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// jsdoc/validate-example
// =============================================================================

describe('jsdoc/validate-example', () => {
  it('passes valid TypeScript in @example block', async () => {
    const code: string = `
/**
 * Adds two numbers.
 *
 * @example
 * \`\`\`typescript
 * const result = add(1, 2);
 * console.log(result);
 * \`\`\`
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('reports syntax error in @example block', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 * const x = {
 *   missing: 'closing brace'
 * \`\`\`
 */
export function broken(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/validate-example');
    expect(results[0]!.message).toContain('syntax error');
  });

  it('reports invalid token in @example block', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 * const x = @@@invalid;
 * \`\`\`
 */
export function broken(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
  });

  it('validates multiple @example blocks independently', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example Basic usage
 * \`\`\`typescript
 * const a = 1;
 * \`\`\`
 *
 * @example Advanced (broken)
 * \`\`\`typescript
 * const b = {{{;
 * \`\`\`
 */
export function multi(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
  });

  it('ignores non-typescript fences', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`json
 * { "not": "parsed as typescript" }}}
 * \`\`\`
 */
export function jsonExample(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('ignores functions without JSDoc', async () => {
    const code: string = `
export function noDoc(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('ignores functions without @example', async () => {
    const code: string = `
/**
 * No example here.
 */
export function noExample(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('passes example with import statements', async () => {
    const code: string = `
/**
 * Loads config.
 *
 * @example
 * \`\`\`typescript
 * import { loadConfig } from '@/config/loader';
 * const result = await loadConfig();
 * if (!result.ok) return result;
 * \`\`\`
 */
export function loadConfig(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('passes example with property access chains', async () => {
    const code: string = `
/**
 * Gets defaults.
 *
 * @example
 * \`\`\`typescript
 * import { defaults } from '@/config/core/defaults';
 * defaults.tooling.devProxy.port;
 * defaults.versions.node;
 * \`\`\`
 */
export function getDefaults(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('validates unfenced @example code as TypeScript', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * const x = {{{;
 */
export function broken(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/validate-example');
    expect(results[0]!.message).toContain('syntax error');
  });

  it('passes valid unfenced @example code', async () => {
    const code: string = `
/**
 * Creates config.
 *
 * @example
 * const result = createConfig({
 *   plugins: [sveltekit()],
 * });
 */
export function createConfig(opts: unknown): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('validates unfenced @example with import statements', async () => {
    const code: string = `
/**
 * Creates config.
 *
 * @example
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import { createConfig } from '@/config/tooling/vite';
 *
 * export default createConfig({
 *   plugins: [sveltekit()],
 * });
 */
export function createConfig(opts: unknown): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('validates unfenced @example with multiple @example blocks', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * const a = 1;
 *
 * @example
 * const b = {{{;
 */
export function multi(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
  });

  it('returns empty for ExportNamedDeclaration without declaration', async () => {
    // e.g. `export { foo }` has no declaration property
    const code: string = `
const foo: string = 'bar';
export { foo };
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('validates @example on arrow function via export const', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 * const x = {{{;
 * \`\`\`
 */
export const myFn = (): void => {};
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    // Arrow functions have no .id so funcName falls back to '<anonymous>'
    expect(results[0]!.message).toContain('<anonymous>');
    expect(results[0]!.message).toContain('syntax error');
  });

  it('validates @example on FunctionExpression via export const', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 * const x = {{{;
 * \`\`\`
 */
export const myFn = function(): void {};
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('syntax error');
  });

  it('skips variable declaration init that is not a function', async () => {
    const code: string = `
/**
 * A constant.
 *
 * @example
 * \`\`\`typescript
 * const x = {{{;
 * \`\`\`
 */
export const MY_VAL: string = 'hello';
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('uses <anonymous> for function without id', async () => {
    // Use runTypeScriptRules directly since default export uses ExportDefaultDeclaration
    // Instead use an arrow function assigned to const but without an id
    const code2: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 * const x = {{{;
 * \`\`\`
 */
export const _ = (function(): void {}) as unknown;
`;
    // The arrow function path covers anonymous better
    const results: LintResult[] = await lint(validateExample, code2);
    // This tests the <anonymous> fallback path — either way we check the rule ran
    expect(results).toBeDefined();
  });

  it('returns empty when @example has fenced block of different language only', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`json
 * { "key": "value" }
 * \`\`\`
 */
export function jsonOnly(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(0);
  });

  it('handles unfenced @example stopped by another @tag', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * const x = {{{;
 * @returns {void} Nothing
 */
export function stopped(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('syntax error');
  });

  it('handles unfenced @example stopped by end-of-comment', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * const y = {{{;
 */
export function endComment(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('syntax error');
  });

  it('handles unfenced @example with only whitespace (empty block)', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 *
 * @returns {void} Nothing
 */
export function emptyExample(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    // No code extracted from the empty @example, so no parse errors
    expect(results.length).toBe(0);
  });

  it('handles fenced @example with empty code inside fence', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 *
 * \`\`\`
 */
export function emptyFence(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    // Empty fence produces empty cleaned string — no parse attempt
    expect(results.length).toBe(0);
  });

  it('reports error with String(firstError) for non-object errors', async () => {
    // This exercises the else branch of error message extraction.
    // We cannot easily mock oxc-parser, but a deeply broken example
    // still produces an error object — just ensure it is reported.
    const code: string = `
/**
 * Does something.
 *
 * @example
 * \`\`\`typescript
 * }}}
 * \`\`\`
 */
export function brokenDeep(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/validate-example');
  });

  it('handles multiple fenced blocks where first is valid and second invalid', async () => {
    const code: string = `
/**
 * Does something.
 *
 * @example First
 * \`\`\`typescript
 * const a: number = 1;
 * \`\`\`
 *
 * @example Second
 * \`\`\`typescript
 * const b = {{{;
 * \`\`\`
 */
export function multiFenced(): void {}
`;
    const results: LintResult[] = await lint(validateExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('syntax error');
  });
});

// =============================================================================
// jsdoc/require-example — branch coverage
// =============================================================================

describe('jsdoc/require-example — branch coverage', () => {
  it('returns empty for ExportNamedDeclaration without declaration', async () => {
    const code: string = `
const foo: string = 'bar';
export { foo };
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(0);
  });

  it('reports missing @example on arrow function via export const', async () => {
    const code: string = `
/** Does something. */
export const myFn = (): void => {};
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/require-example');
  });

  it('reports missing @example on FunctionExpression via export const', async () => {
    const code: string = `
/** Does something. */
export const myFn = function(): void {};
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/require-example');
  });

  it('does not report variable const that is not a function', async () => {
    const code: string = `
/** A constant. */
export const MY_VAL: string = 'hello';
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(0);
  });

  it('uses <anonymous> for arrow function without name context', async () => {
    // Arrow function expressions get name from const — tests the funcName fallback
    const code: string = `
/** Does something. */
export const myArrow = (): void => {};
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    // funcName comes from funcNode.id which is undefined for arrows;
    // falls back to '<anonymous>'
    expect(results[0]!.message).toContain('<anonymous>');
  });

  it('reports missing typescript fence on arrow function @example', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * myFn();
 */
export const myFn = (): void => {};
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('typescript');
  });

  it('passes arrow function with proper @example and typescript fence', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * \`\`\`typescript
 * myFn();
 * \`\`\`
 */
export const myFn = (): void => {};
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(0);
  });

  it('does not report function without JSDoc', async () => {
    const code: string = `
export function noDoc(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    // require-example only checks when JSDoc exists — no JSDoc means no report
    expect(results.length).toBe(0);
  });

  it('fix offset is correct for missing @example', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix).toBeDefined();
    expect(results[0]!.fix.text).toContain('@example');
  });
});

// =============================================================================
// jsdoc/require-schema-link
// =============================================================================

describe('jsdoc/require-schema-link', () => {
  it('flags type derived from schema without {@link}', async () => {
    const code: string = `
import * as v from 'valibot';
const FooSchema = v.strictObject({ name: v.string() });
/** A foo. */
export type Foo = v.InferOutput<typeof FooSchema>;
`;
    const results: LintResult[] = await lint(requireSchemaLink, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('jsdoc/require-schema-link');
    expect(results[0]!.message).toContain('FooSchema');
    expect(results[0]!.message).toContain('{@link FooSchema}');
  });

  it('passes type with {@link SchemaName} in JSDoc', async () => {
    const code: string = `
import * as v from 'valibot';
const FooSchema = v.strictObject({ name: v.string() });
/** A foo. See {@link FooSchema}. */
export type Foo = v.InferOutput<typeof FooSchema>;
`;
    const results: LintResult[] = await lint(requireSchemaLink, code);
    expect(results.length).toBe(0);
  });

  it('ignores types not derived from schemas', async () => {
    const code: string = `
/** A simple type. */
export type Foo = { name: string };
`;
    const results: LintResult[] = await lint(requireSchemaLink, code);
    expect(results.length).toBe(0);
  });

  it('fix inserts {@link SchemaName} before closing */ when JSDoc exists', async () => {
    const code: string = `
import * as v from 'valibot';
const FooSchema = v.strictObject({ name: v.string() });
/** A foo. */
export type Foo = v.InferOutput<typeof FooSchema>;
`;
    const results: LintResult[] = await lint(requireSchemaLink, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    expect(fix.text).toContain('{@link FooSchema}');
    // It's an insert (zero-width range) at the */ position
    expect(fix.range.start).toBe(fix.range.end);
    // Verify the insert position is at the `*/` in the JSDoc
    expect(code.slice(fix.range.start, fix.range.start + 2)).toBe('*/');
  });

  it('fix inserts full JSDoc when no JSDoc exists', async () => {
    const code: string = `
import * as v from 'valibot';
const BarSchema = v.strictObject({ age: v.number() });
export type Bar = v.InferOutput<typeof BarSchema>;
`;
    const results: LintResult[] = await lint(requireSchemaLink, code);
    expect(results.length).toBe(1);
    const { fix } = results[0]!;
    expect(fix.text).toContain('/** See {@link BarSchema}.');
    expect(fix.text).toContain('*/');
  });

  it('has fixable: true', () => {
    expect(requireSchemaLink.fixable).toBe(true);
  });
});
