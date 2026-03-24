/**
 * Tests for Valibot lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noParse from './no-parse.ts';
import noDirectSafeparse from './no-direct-safeparse.ts';
import requireStrictObject from './require-strict-object.ts';
import namespaceImport from './namespace-import.ts';
import requireFieldDocs from './require-field-docs.ts';
import preferSharedSchema from './prefer-shared-schema.ts';
import requireMinLength from './require-min-length.ts';
import noDuplicateSchema from './no-duplicate-schema.ts';
import noGenericStringSchema from './no-generic-string-schema.ts';
import requireGenericSchema from './require-generic-schema.ts';
import preferTemplateLiteral from './prefer-template-literal.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param rule - The rule to test
 * @param code - TypeScript source code
 * @param filename - Optional file name for path-based exemptions
 * @returns Array of lint results
 */
function lint(rule: TypeScriptRule, code: string, filename?: string): Promise<LintResult[]> {
  return runTypeScriptRules(filename ?? 'test.ts', code, [rule]);
}

// =============================================================================
// valibot/no-parse
// =============================================================================

describe('valibot/no-parse', () => {
  it('reports v.parse() calls', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.parse(schema, data);
`;
    const results: LintResult[] = await lint(noParse, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/no-parse');
    expect(results[0].fix).toBeDefined();
    expect(results[0].fix.text).toBe('safeParse');
  });

  it('passes safeParse calls', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(schema, data);
`;
    const results: LintResult[] = await lint(noParse, code);
    expect(results.length).toBe(0);
  });

  it('does not flag non-valibot parse calls', async () => {
    const code: string = `
import * as JSON from 'json';
const result = JSON.parse(data);
`;
    const results: LintResult[] = await lint(noParse, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-direct-safeparse
// =============================================================================

describe('valibot/no-direct-safeparse', () => {
  it('reports v.safeParse() calls', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.safeParse(schema, data);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/no-direct-safeparse');
  });

  it('passes non-valibot safeParse', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(schema, data);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-strict-object
// =============================================================================

describe('valibot/require-strict-object', () => {
  it('reports v.object() calls', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.object({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireStrictObject, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/require-strict-object');
    expect(results[0].fix.text).toBe('strictObject');
  });

  it('passes v.strictObject() calls', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireStrictObject, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/namespace-import
// =============================================================================

describe('valibot/namespace-import', () => {
  it('reports named imports from valibot', async () => {
    const code: string = "import { string, object } from 'valibot';";
    const results: LintResult[] = await lint(namespaceImport, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/namespace-import');
    expect(results[0].fix.text).toContain('import * as v');
  });

  it('passes namespace import', async () => {
    const code: string = "import * as v from 'valibot';";
    const results: LintResult[] = await lint(namespaceImport, code);
    expect(results.length).toBe(0);
  });

  it('passes type-only imports', async () => {
    const code: string = "import type { InferOutput } from 'valibot';";
    const results: LintResult[] = await lint(namespaceImport, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-field-docs
// =============================================================================

describe('valibot/require-field-docs', () => {
  it('reports schema field without comment', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({
  name: v.string(),
});
`;
    const results: LintResult[] = await lint(requireFieldDocs, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/require-field-docs');
    expect(results[0].message).toContain('name');
  });

  it('passes schema field with block comment above', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({
  /** The user name. */
  name: v.string(),
});
`;
    const results: LintResult[] = await lint(requireFieldDocs, code);
    expect(results.length).toBe(0);
  });

  it('passes schema field with inline comment', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({
  // The user name
  name: v.string(),
});
`;
    const results: LintResult[] = await lint(requireFieldDocs, code);
    expect(results.length).toBe(0);
  });

  it('does not flag non-valibot strictObject calls', async () => {
    const code: string = `
import * as other from 'other-lib';
const schema = other.strictObject({
  name: other.string(),
});
`;
    const results: LintResult[] = await lint(requireFieldDocs, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-min-length
// =============================================================================

describe('valibot/require-min-length', () => {
  it('flags bare v.string() in strictObject field', async () => {
    const code: string = `const Schema = v.strictObject({ name: v.string() });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/require-min-length');
    expect(results[0].message).toContain('name');
  });

  it('passes v.pipe(v.string(), v.minLength(1))', async () => {
    const code: string = `const Schema = v.strictObject({ name: v.pipe(v.string(), v.minLength(1)) });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });

  it('passes v.picklist()', async () => {
    const code: string = `const Schema = v.strictObject({ style: v.picklist(['normal', 'italic']) });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });

  it('flags multiple bare v.string() fields', async () => {
    const code: string = `const Schema = v.strictObject({ a: v.string(), b: v.string(), c: v.pipe(v.string(), v.minLength(1)) });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(2);
  });

  it('flags v.optional(v.string()) without minLength', async () => {
    const code: string = `const Schema = v.strictObject({ prefix: v.optional(v.string()) });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('v.optional(v.string())');
  });

  it('passes v.optional(v.pipe(v.string(), v.minLength(1)))', async () => {
    const code: string = `const Schema = v.strictObject({ prefix: v.optional(v.pipe(v.string(), v.minLength(1))) });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/prefer-shared-schema
// =============================================================================

describe('valibot/prefer-shared-schema', () => {
  it('suggests PathSchema for field named templatePath', async () => {
    const code: string = `const Schema = v.strictObject({ templatePath: v.pipe(v.string(), v.minLength(1)) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/prefer-shared-schema');
    expect(results[0].message).toContain('PathSchema');
  });

  it('suggests UrlStringSchema for field named accessUrl', async () => {
    const code: string = `const Schema = v.strictObject({ accessUrl: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('UrlStringSchema');
  });

  it('suggests PortSchema for field named devPort', async () => {
    const code: string = `const Schema = v.strictObject({ devPort: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('PortSchema');
  });

  it('passes when field already uses a shared schema', async () => {
    const code: string = `const Schema = v.strictObject({ templatePath: PathSchema });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes for fields without matching patterns', async () => {
    const code: string = `const Schema = v.strictObject({ enabled: v.boolean() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes v.picklist() even if name matches pattern', async () => {
    const code: string = `const Schema = v.strictObject({ filePath: v.picklist(['/a', '/b']) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(0);
  });

  it('exempts test files', async () => {
    const code: string = `const Schema = v.strictObject({ templatePath: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code, 'my-module.test.ts');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-field-docs (orphaned docs enhancement)
// =============================================================================

describe('valibot/require-field-docs (orphaned docs)', () => {
  it('flags orphaned doc comments in strictObject', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Name field. */
  /** Orphaned doc. */
  name: v.string(),
});
`;
    const results: LintResult[] = await lint(requireFieldDocs, code);
    const orphaned: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('orphaned'),
    );
    expect(orphaned.length).toBe(1);
  });

  it('passes when doc count matches property count', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Name. */
  name: v.string(),
  /** Age. */
  age: v.number(),
});
`;
    const results: LintResult[] = await lint(requireFieldDocs, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-duplicate-schema
// =============================================================================

describe('valibot/no-duplicate-schema', () => {
  it('flags field patterns appearing in 3+ files via finalize', async () => {
    // Simulate 3 files with same field pattern
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Name. */
  duplicatedField: v.pipe(v.string(), v.minLength(1)),
});
`;
    // Run in 3 different "files"
    await runTypeScriptRules('file1.ts', code, [noDuplicateSchema]);
    await runTypeScriptRules('file2.ts', code, [noDuplicateSchema]);
    await runTypeScriptRules('file3.ts', code, [noDuplicateSchema]);

    const finalResults: LintResult[] = noDuplicateSchema.finalize?.() ?? [];
    expect(finalResults.length).toBeGreaterThanOrEqual(1);
    expect(finalResults[0].ruleId).toBe('valibot/no-duplicate-schema');
    expect(finalResults[0].message).toContain('duplicatedField');
    expect(finalResults[0].message).toContain('3');
  });

  it('does not flag unique fields', async () => {
    const code1: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Unique. */
  uniqueField1: v.string(),
});
`;
    const code2: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Unique. */
  uniqueField2: v.string(),
});
`;
    await runTypeScriptRules('unique1.ts', code1, [noDuplicateSchema]);
    await runTypeScriptRules('unique2.ts', code2, [noDuplicateSchema]);

    const finalResults: LintResult[] = noDuplicateSchema.finalize?.() ?? [];
    const uniqueResults: LintResult[] = finalResults.filter((r: LintResult) =>
      r.message.includes('uniqueField'),
    );
    expect(uniqueResults.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-generic-string-schema
// =============================================================================

describe('valibot/no-generic-string-schema', () => {
  it('flags v.pipe(v.string(), v.minLength(1)) as too generic', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** App name. */
  appName: v.pipe(v.string(), v.minLength(1)),
});
`;
    const results: LintResult[] = await lint(noGenericStringSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('valibot/no-generic-string-schema');
    expect(results[0].message).toContain('appName');
    expect(results[0].message).toContain('semantic constraints');
  });

  it('flags v.optional(v.pipe(v.string(), v.minLength(1))) as too generic', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Prefix. */
  prefix: v.optional(v.pipe(v.string(), v.minLength(1))),
});
`;
    const results: LintResult[] = await lint(noGenericStringSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('prefix');
  });

  it('passes v.pipe with additional constraints', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** App name. */
  appName: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
});
`;
    const results: LintResult[] = await lint(noGenericStringSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes shared schema references', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Path. */
  templatePath: PathSchema,
});
`;
    const results: LintResult[] = await lint(noGenericStringSchema, code);
    expect(results.length).toBe(0);
  });

  it('ignores test files', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Name. */
  name: v.pipe(v.string(), v.minLength(1)),
});
`;
    const results: LintResult[] = await lint(noGenericStringSchema, code, 'my.test.ts');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/prefer-shared-schema (expanded patterns)
// =============================================================================

describe('valibot/prefer-shared-schema (expanded patterns)', () => {
  it('flags appName field with string schema', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Name. */
  appName: v.pipe(v.string(), v.minLength(1)),
});
`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    const nameResults: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('NameSchema'),
    );
    expect(nameResults.length).toBe(1);
  });

  it('flags fontFamilies field with string schema', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Families. */
  fontFamilies: v.pipe(v.string(), v.minLength(1)),
});
`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    const familyResults: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('CssFontFamilySchema'),
    );
    expect(familyResults.length).toBe(1);
  });

  it('flags storagePrefix field with string schema', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  /** Prefix. */
  storagePrefix: v.optional(v.pipe(v.string(), v.minLength(1))),
});
`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('storagePrefix');
  });
});

// =============================================================================
// valibot/require-generic-schema
// =============================================================================

describe('valibot/require-generic-schema', () => {
  it('flags non-generic schema used by generic type', async () => {
    const code: string = `
const FooBaseSchema = v.strictObject({ name: v.string() });
type Foo<T> = v.InferOutput<typeof FooBaseSchema> & { data: T };
`;
    const results: LintResult[] = await lint(requireGenericSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('FooBaseSchema');
    expect(results[0].message).toContain('generic()');
  });

  it('passes schema created with generic()', async () => {
    const code: string = `
const FooSchema = generic(<T>(s: v.GenericSchema<T>) => v.strictObject({ data: s }));
type Foo<T> = v.InferOutput<ReturnType<typeof FooSchema<T>>>;
`;
    const results: LintResult[] = await lint(requireGenericSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes non-generic type alias', async () => {
    const code: string = `
const FooSchema = v.strictObject({ name: v.string() });
type Foo = v.InferOutput<typeof FooSchema>;
`;
    const results: LintResult[] = await lint(requireGenericSchema, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/prefer-template-literal
// =============================================================================

describe('valibot/prefer-template-literal', () => {
  it('warns on v.pipe(v.string(), v.regex()) with decomposable pattern', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.regex(/^prefix_\\d+$/));`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('templateLiteral()');
  });

  it('warns on key:value pattern', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.regex(/^.+:.+$/));`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(1);
  });

  it('passes templateLiteral usage', async () => {
    const code: string = `const Schema = templateLiteral(['prefix_', v.number()]);`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(0);
  });

  it('passes v.pipe with v.email (no regex)', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.email());`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(0);
  });

  it('passes complex regex with optional group', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.regex(/^\\d{1,3}(\\s+\\d{1,3})?$/));`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(0);
  });

  it('passes v.pipe with v.minLength only', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.minLength(1));`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(0);
  });
});
