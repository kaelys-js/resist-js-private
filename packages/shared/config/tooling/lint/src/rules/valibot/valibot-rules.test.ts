/**
 * Tests for Valibot lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';
import colocateSchemaType from './colocate-schema-type.ts';
import exportSchemaAndType from './export-schema-and-type.ts';
import namespaceImport from './namespace-import.ts';
import noDirectSafeparse from './no-direct-safeparse.ts';
import noDuplicateSchema from './no-duplicate-schema.ts';
import noGenericStringSchema from './no-generic-string-schema.ts';
import noOrphanSchemas from './no-orphan-schemas.ts';
import noOrphanTypes from './no-orphan-types.ts';
import noParse from './no-parse.ts';
import oneSchemaPerFile from './one-schema-per-file.ts';
import preferSharedSchema from './prefer-shared-schema.ts';
import preferTemplateLiteral from './prefer-template-literal.ts';
import requireFieldDocs from './require-field-docs.ts';
import requireGenericSchema from './require-generic-schema.ts';
import requireMinLength from './require-min-length.ts';
import requireSchemaSuffix from './require-schema-suffix.ts';
import requireStrictObject from './require-strict-object.ts';
import schemaFileLocation from './schema-file-location.ts';
import schemaTypePair from './schema-type-pair.ts';
import typeAliasFromSchema from './type-alias-from-schema.ts';

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
    expect(results[0]!.ruleId).toBe('valibot/no-parse');
    expect(results[0]!.fix).toBeDefined();
    expect(results[0]!.fix.text).toBe('safeParse');
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
    expect(results[0]!.ruleId).toBe('valibot/no-direct-safeparse');
  });

  it('passes non-valibot safeParse', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(schema, data);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(0);
  });

  it('exempts v.safeParse() inside v.check() callback', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.pipe(
  v.string(),
  v.check((input) => {
    const result = v.safeParse(otherSchema, input);
    return result.success;
  }),
);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(0);
  });

  it('exempts v.safeParse() inside v.transform() callback', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.pipe(
  v.string(),
  v.transform((input) => {
    const result = v.safeParse(numSchema, input);
    return result.success ? result.output : 0;
  }),
);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(0);
  });

  it('exempts v.safeParse() inside v.rawCheck() callback', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.pipe(
  v.string(),
  v.rawCheck(({ dataset, addIssue }) => {
    const result = v.safeParse(otherSchema, dataset.value);
    if (!result.success) addIssue({ message: 'bad' });
  }),
);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(0);
  });

  it('reports v.safeParse() after a closed v.check() call (not inside callback)', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.pipe(v.string(), v.check((x) => x.length > 0));
const result = v.safeParse(schema, data);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(1);
  });

  it('reports v.safeParse() with no callee object', async () => {
    const code: string = `
import * as v from 'valibot';
const x = v.safeParse(schema, data);
`;
    const results: LintResult[] = await lint(noDirectSafeparse, code);
    expect(results.length).toBe(1);
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
    expect(results[0]!.ruleId).toBe('valibot/require-strict-object');
    expect(results[0]!.fix.text).toBe('strictObject');
  });

  it('passes v.strictObject() calls', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireStrictObject, code);
    expect(results.length).toBe(0);
  });

  it('passes non-valibot object() call', async () => {
    const code: string = `
import * as other from 'other-lib';
const schema = other.object({ name: other.string() });
`;
    const results: LintResult[] = await lint(requireStrictObject, code);
    expect(results.length).toBe(0);
  });

  it('passes non-member call expression', async () => {
    const code: string = `
const result = plainFunction({ a: 1 });
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
    expect(results[0]!.ruleId).toBe('valibot/namespace-import');
    expect(results[0]!.fix.text).toContain('import * as v');
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
    expect(results[0]!.ruleId).toBe('valibot/require-field-docs');
    expect(results[0]!.message).toContain('name');
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
    expect(results[0]!.ruleId).toBe('valibot/require-min-length');
    expect(results[0]!.message).toContain('name');
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
    expect(results[0]!.message).toContain('v.optional(v.string())');
  });

  it('passes v.optional(v.pipe(v.string(), v.minLength(1)))', async () => {
    const code: string = `const Schema = v.strictObject({ prefix: v.optional(v.pipe(v.string(), v.minLength(1))) });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });

  it('skips non-strictObject call', async () => {
    const code: string = `const Schema = v.object({ name: v.string() });`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });

  it('skips strictObject with no arguments', async () => {
    const code: string = `const Schema = v.strictObject();`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });

  it('skips strictObject with non-ObjectExpression argument', async () => {
    const code: string = `const Schema = v.strictObject(existingFields);`;
    const results: LintResult[] = await lint(requireMinLength, code);
    expect(results.length).toBe(0);
  });

  it('skips spread elements in strictObject properties', async () => {
    const code: string = `const Schema = v.strictObject({ ...baseFields, name: v.pipe(v.string(), v.minLength(1)) });`;
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
    expect(results[0]!.ruleId).toBe('valibot/prefer-shared-schema');
    expect(results[0]!.message).toContain('PathSchema');
  });

  it('suggests UrlStringSchema for field named accessUrl', async () => {
    const code: string = `const Schema = v.strictObject({ accessUrl: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UrlStringSchema');
  });

  it('suggests PortSchema for field named devPort', async () => {
    const code: string = `const Schema = v.strictObject({ devPort: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('PortSchema');
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

  it('does not flag hardwareConcurrency as CurrencyCodeSchema', async () => {
    const code: string = `const Schema = v.strictObject({ hardwareConcurrency: v.number() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
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
    expect(finalResults[0]!.ruleId).toBe('valibot/no-duplicate-schema');
    expect(finalResults[0]!.message).toContain('duplicatedField');
    expect(finalResults[0]!.message).toContain('3');
  });

  it('skips SpreadElement in schema properties', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject({
  ...baseFields,
  /** Extra. */
  extra: v.string(),
});
`;
    await runTypeScriptRules('spread1.ts', code, [noDuplicateSchema]);
    const results: LintResult[] = noDuplicateSchema.finalize?.() ?? [];
    const spreadResults: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('baseFields'),
    );
    expect(spreadResults.length).toBe(0);
  });

  it('skips non-ObjectExpression argument to strictObject', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject(existingFields);
`;
    const results: LintResult[] = await runTypeScriptRules('nonobj.ts', code, [noDuplicateSchema]);
    expect(results.length).toBe(0);
    noDuplicateSchema.finalize?.();
  });

  it('skips strictObject call with no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const Schema = v.strictObject();
`;
    const results: LintResult[] = await runTypeScriptRules('noargs.ts', code, [noDuplicateSchema]);
    expect(results.length).toBe(0);
    noDuplicateSchema.finalize?.();
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
    expect(results[0]!.ruleId).toBe('valibot/no-generic-string-schema');
    expect(results[0]!.message).toContain('appName');
    expect(results[0]!.message).toContain('semantic constraints');
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
    expect(results[0]!.message).toContain('prefix');
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
    expect(results[0]!.message).toContain('storagePrefix');
  });

  it('suggests EmailSchema for field named email', async () => {
    const code: string = `const Schema = v.strictObject({ email: v.pipe(v.string(), v.email()) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('EmailSchema');
  });

  it('suggests UuidSchema for field named sessionId', async () => {
    const code: string = `const Schema = v.strictObject({ sessionId: v.pipe(v.string(), v.uuid()) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UuidSchema');
  });

  it('suggests IsoTimestampSchema for field named timestamp', async () => {
    const code: string = `const Schema = v.strictObject({ timestamp: v.pipe(v.string(), v.isoTimestamp()) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('IsoTimestampSchema');
  });

  it('suggests GitCommitShortSchema for field named commit', async () => {
    const code: string = `const Schema = v.strictObject({ commit: v.pipe(v.string(), v.length(7)) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('GitCommitShortSchema');
  });

  it('suggests GitBranchSchema for field named branch', async () => {
    const code: string = `const Schema = v.strictObject({ branch: v.pipe(v.string(), v.minLength(1)) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('GitBranchSchema');
  });

  it('suggests NameSchema for field named service', async () => {
    const code: string = `const Schema = v.strictObject({ service: v.pipe(v.string(), v.minLength(1)) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('NameSchema');
  });

  it('does not flag support as PortSchema', async () => {
    const code: string = `const Schema = v.strictObject({ support: v.pipe(v.string(), v.email()) });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    const portResults: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('PortSchema'),
    );
    expect(portResults.length).toBe(0);
  });

  it('suggests DescriptionSchema for field named description', async () => {
    const code: string = `const Schema = v.strictObject({ description: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('DescriptionSchema');
  });

  it('suggests DurationSchema for field named cacheTtl', async () => {
    const code: string = `const Schema = v.strictObject({ cacheTtl: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('DurationSchema');
  });

  it('suggests SlugSchema for field named projectSlug', async () => {
    const code: string = `const Schema = v.strictObject({ projectSlug: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('SlugSchema');
  });

  it('suggests HexColorSchema for field named backgroundColor', async () => {
    const code: string = `const Schema = v.strictObject({ backgroundColor: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('HexColorSchema');
  });

  it('suggests CountryCodeSchema for field named countryCode', async () => {
    const code: string = `const Schema = v.strictObject({ countryCode: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('CountryCodeSchema');
  });

  it('suggests CronExpressionSchema for field named schedule', async () => {
    const code: string = `const Schema = v.strictObject({ schedule: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('CronExpressionSchema');
  });

  it('suggests TimezoneSchema for field named timezone', async () => {
    const code: string = `const Schema = v.strictObject({ timezone: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('TimezoneSchema');
  });

  it('suggests CurrencyCodeSchema for field named currency', async () => {
    const code: string = `const Schema = v.strictObject({ currency: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('CurrencyCodeSchema');
  });

  it('suggests HttpStatusCodeSchema for field named statusCode', async () => {
    const code: string = `const Schema = v.strictObject({ statusCode: v.number() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('HttpStatusCodeSchema');
  });

  it('suggests MimeTypeSchema for field named contentType', async () => {
    const code: string = `const Schema = v.strictObject({ contentType: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('MimeTypeSchema');
  });

  it('suggests TagSchema for field named keyword', async () => {
    const code: string = `const Schema = v.strictObject({ keyword: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('TagSchema');
  });

  it('suggests PasswordSchema for field named password', async () => {
    const code: string = `const Schema = v.strictObject({ password: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('PasswordSchema');
  });

  it('suggests FeatureFlagSchema for field named featureFlag', async () => {
    const code: string = `const Schema = v.strictObject({ featureFlag: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('FeatureFlagSchema');
  });

  it('suggests MetaTitleSchema for field named metaTitle', async () => {
    const code: string = `const Schema = v.strictObject({ metaTitle: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('MetaTitleSchema');
  });

  it('suggests ErrorCodeSchema for field named errorCode', async () => {
    const code: string = `const Schema = v.strictObject({ errorCode: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ErrorCodeSchema');
  });

  it('suggests TranslationKeySchema for field named translationKey', async () => {
    const code: string = `const Schema = v.strictObject({ translationKey: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('TranslationKeySchema');
  });

  it('suggests YearSchema for field named year', async () => {
    const code: string = `const Schema = v.strictObject({ year: v.number() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('YearSchema');
  });

  it('suggests SearchQuerySchema for field named searchQuery', async () => {
    const code: string = `const Schema = v.strictObject({ searchQuery: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('SearchQuerySchema');
  });

  it('suggests CommentSchema for field named comment', async () => {
    const code: string = `const Schema = v.strictObject({ comment: v.string() });`;
    const results: LintResult[] = await lint(preferSharedSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('CommentSchema');
  });
});

// =============================================================================
// valibot/require-generic-schema
// =============================================================================

describe('valibot/require-generic-schema', () => {
  it('passes intersection type — generic params come from & arm, not schema', async () => {
    const code: string = `
const FooBaseSchema = v.strictObject({ name: v.string() });
type Foo<T> = v.InferOutput<typeof FooBaseSchema> & { data: T };
`;
    const results: LintResult[] = await lint(requireGenericSchema, code);
    expect(results.length).toBe(0);
  });

  it('flags non-generic schema used by non-intersection generic type', async () => {
    const code: string = `
const FooSchema = v.strictObject({ name: v.string() });
type Foo<T> = v.InferOutput<typeof FooSchema>;
`;
    const results: LintResult[] = await lint(requireGenericSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('FooSchema');
    expect(results[0]!.message).toContain('generic()');
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

  it('exempts .test.ts files', async () => {
    const code: string = `
const FooSchema = v.strictObject({ name: v.string() });
type Foo<T> = v.InferOutput<typeof FooSchema>;
`;
    const results: LintResult[] = await lint(requireGenericSchema, code, 'my-module.test.ts');
    expect(results.length).toBe(0);
  });

  it('passes when schema is not declared in the same file (imported)', async () => {
    const code: string = `
type Foo<T> = v.InferOutput<typeof ExternalSchema>;
`;
    const results: LintResult[] = await lint(requireGenericSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes type alias without InferOutput', async () => {
    const code: string = `
type Foo<T> = { data: T };
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
    expect(results[0]!.message).toContain('templateLiteral()');
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

  it('passes regex with character class ranges', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.regex(/^[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}$/));`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(0);
  });

  it('passes regex with feature branch character class', async () => {
    const code: string = `const Schema = v.pipe(v.string(), v.regex(/^feature\\/[a-z0-9-]+$/));`;
    const results: LintResult[] = await lint(preferTemplateLiteral, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-schema-suffix
// =============================================================================

describe('valibot/require-schema-suffix', () => {
  it('flags schema declaration without Schema suffix', async () => {
    const code: string = `import * as v from 'valibot';\nconst Foo = v.strictObject({});`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'Foo'");
    expect(results[0]!.message).toContain("'FooSchema'");
  });

  it('passes schema declaration with Schema suffix', async () => {
    const code: string = `import * as v from 'valibot';\nconst FooSchema = v.strictObject({});`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(0);
  });

  it('flags v.pipe without Schema suffix', async () => {
    const code: string = `import * as v from 'valibot';\nconst MyRegex = v.pipe(v.string(), v.regex(/^a$/));`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(1);
  });

  it('passes v.pipe with Schema suffix', async () => {
    const code: string = `import * as v from 'valibot';\nconst MyRegexSchema = v.pipe(v.string(), v.regex(/^a$/));`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(0);
  });

  it('skips ALL_CAPS constants', async () => {
    const code: string = `import * as v from 'valibot';\nconst DEFAULT_LOCALE = v.picklist(['en', 'ja']);`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(0);
  });

  it('skips declarations inside function bodies (indented)', async () => {
    const code: string = `import * as v from 'valibot';
function buildConfig(): void {
  const Inner = v.strictObject({});
}`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    // Inner is indented → inside function body → skipped
    expect(results.length).toBe(0);
  });

  it('skips non-CallExpression init (plain value)', async () => {
    const code: string = `import * as v from 'valibot';\nconst Foo = someVariable;`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(0);
  });

  it('skips non-valibot factory call (different method)', async () => {
    const code: string = `import * as v from 'valibot';\nconst Foo = v.parse(schema, data);`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(0);
  });

  it('flags v.optional() without Schema suffix', async () => {
    const code: string = `import * as v from 'valibot';\nconst MaybeValue = v.optional(v.string());`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'MaybeValue'");
  });

  it('flags v.array() without Schema suffix', async () => {
    const code: string = `import * as v from 'valibot';\nconst Items = v.array(v.string());`;
    const results: LintResult[] = await lint(requireSchemaSuffix, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// valibot/colocate-schema-type
// =============================================================================

describe('valibot/colocate-schema-type', () => {
  it('has correct rule metadata', () => {
    expect(colocateSchemaType.id).toBe('valibot/colocate-schema-type');
    expect(colocateSchemaType.visitor.Program).toBeDefined();
  });

  it('passes when schema is defined in same file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(0);
  });

  it('warns when schema is not in the same file', async () => {
    const code: string = `
import * as v from 'valibot';
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/colocate-schema-type');
    expect(results[0]!.message).toContain('UserSchema');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when no InferOutput is used', async () => {
    const code: string = `
import * as v from 'valibot';
type Foo = string;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/export-schema-and-type
// =============================================================================

describe('valibot/export-schema-and-type', () => {
  it('has correct rule metadata', () => {
    expect(exportSchemaAndType.id).toBe('valibot/export-schema-and-type');
    expect(exportSchemaAndType.visitor.Program).toBeDefined();
  });

  it('passes when both schema and type are exported', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('reports error when type is not exported', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/export-schema-and-type');
    expect(results[0]!.message).toContain('UserSchema');
    expect(results[0]!.message).toContain('User');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when schema is not exported', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-orphan-schemas
// =============================================================================

describe('valibot/no-orphan-schemas', () => {
  it('has correct rule metadata', () => {
    expect(noOrphanSchemas.id).toBe('valibot/no-orphan-schemas');
    expect(noOrphanSchemas.visitor.Program).toBeDefined();
  });

  it('passes when exported schema has exported type', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('errors when exported schema has no type at all', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no corresponding type');
  });

  it('warns when type exists but is not exported', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('not exported');
  });
});

// =============================================================================
// valibot/no-orphan-types
// =============================================================================

describe('valibot/no-orphan-types', () => {
  it('has correct rule metadata', () => {
    expect(noOrphanTypes.id).toBe('valibot/no-orphan-types');
    expect(noOrphanTypes.visitor.TSTypeAliasDeclaration).toBeDefined();
  });

  it('warns for object literal type without schema', async () => {
    const code: string = `
type User = { name: string; age: number };
`;
    const results: LintResult[] = await lint(noOrphanTypes, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('User');
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('passes for type derived from valibot', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noOrphanTypes, code);
    expect(results.length).toBe(0);
  });

  it('skips allowed suffixes (Props, State, etc.)', async () => {
    const code: string = `
type ButtonProps = { label: string; onClick: () => void };
type AppState = { isLoading: boolean };
`;
    const results: LintResult[] = await lint(noOrphanTypes, code);
    expect(results.length).toBe(0);
  });

  it('skips generic types', async () => {
    const code: string = `
type Result<T> = { ok: boolean; data: T };
`;
    const results: LintResult[] = await lint(noOrphanTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes when schema exists in same file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = { name: string };
`;
    const results: LintResult[] = await lint(noOrphanTypes, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/one-schema-per-file
// =============================================================================

describe('valibot/one-schema-per-file', () => {
  it('has correct rule metadata', () => {
    expect(oneSchemaPerFile.id).toBe('valibot/one-schema-per-file');
    expect(oneSchemaPerFile.visitor.Program).toBeDefined();
  });

  it('passes for file with few schemas', async () => {
    const code: string = `
import * as v from 'valibot';
const ASchema = v.strictObject({ a: v.string() });
const BSchema = v.strictObject({ b: v.string() });
`;
    const results: LintResult[] = await lint(oneSchemaPerFile, code);
    expect(results.length).toBe(0);
  });

  it('reports info for >5 schemas', async () => {
    const schemas: string = Array.from(
      { length: 6 },
      (_: unknown, i: number): string => `const S${i}Schema = v.strictObject({ x: v.string() });`,
    ).join('\n');
    const code: string = `import * as v from 'valibot';\n${schemas}`;
    const results: LintResult[] = await lint(oneSchemaPerFile, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('info');
    expect(results[0]!.message).toContain('6');
  });

  it('reports warning for >10 schemas', async () => {
    const schemas: string = Array.from(
      { length: 11 },
      (_: unknown, i: number): string => `const S${i}Schema = v.strictObject({ x: v.string() });`,
    ).join('\n');
    const code: string = `import * as v from 'valibot';\n${schemas}`;
    const results: LintResult[] = await lint(oneSchemaPerFile, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('11');
  });
});

// =============================================================================
// valibot/schema-file-location
// =============================================================================

describe('valibot/schema-file-location', () => {
  it('has correct rule metadata', () => {
    expect(schemaFileLocation.id).toBe('valibot/schema-file-location');
    expect(schemaFileLocation.visitor.Program).toBeDefined();
  });

  it('passes for schema in schemas/ directory', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaFileLocation, code, 'src/schemas/user.ts');
    expect(results.length).toBe(0);
  });

  it('passes for schema in .schema.ts file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaFileLocation, code, 'src/user.schema.ts');
    expect(results.length).toBe(0);
  });

  it('passes for schema in test file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaFileLocation, code, 'src/user.test.ts');
    expect(results.length).toBe(0);
  });

  it('warns for schema outside allowed locations', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaFileLocation, code, 'src/services/auth.ts');
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('schemas/');
  });

  it('passes for file with no schemas', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(schemaFileLocation, code, 'src/services/auth.ts');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/schema-type-pair
// =============================================================================

describe('valibot/schema-type-pair', () => {
  it('has correct rule metadata', () => {
    expect(schemaTypePair.id).toBe('valibot/schema-type-pair');
    expect(schemaTypePair.visitor.Program).toBeDefined();
  });

  it('passes for proper schema-type pair', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('errors when type is missing', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no corresponding type');
    expect(results[0]!.message).toContain('User');
  });

  it('warns when type does not use InferOutput', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = { name: string };
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('derived from');
  });

  it('passes with InferInput', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferInput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/type-alias-from-schema
// =============================================================================

describe('valibot/type-alias-from-schema', () => {
  it('has correct rule metadata', () => {
    expect(typeAliasFromSchema.id).toBe('valibot/type-alias-from-schema');
    expect(typeAliasFromSchema.visitor.TSTypeAliasDeclaration).toBeDefined();
  });

  it('errors for object literal type', async () => {
    const code: string = `
type User = { name: string; age: number };
`;
    const results: LintResult[] = await lint(typeAliasFromSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('object literal');
  });

  it('warns for union type', async () => {
    const code: string = `
type Status = 'active' | 'inactive';
`;
    const results: LintResult[] = await lint(typeAliasFromSchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('derived from');
  });

  it('passes for valibot-derived type', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(typeAliasFromSchema, code);
    expect(results.length).toBe(0);
  });

  it('skips allowed suffixes', async () => {
    const code: string = `
type ButtonProps = { label: string };
type AppState = { loading: boolean };
type MyHandler = { handle: () => void };
`;
    const results: LintResult[] = await lint(typeAliasFromSchema, code);
    expect(results.length).toBe(0);
  });

  it('skips generic types', async () => {
    const code: string = `
type Result<T> = { ok: boolean; data: T };
`;
    const results: LintResult[] = await lint(typeAliasFromSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes for simple type alias (string, number, etc.)', async () => {
    const code: string = `
type Name = string;
type Count = number;
`;
    const results: LintResult[] = await lint(typeAliasFromSchema, code);
    expect(results.length).toBe(0);
  });
});
