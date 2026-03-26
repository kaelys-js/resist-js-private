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
});
