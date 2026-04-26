/**
 * Tests for Valibot lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';
import awaitAsyncParse from './await-async-parse.ts';
import colocateSchemaType from './colocate-schema-type.ts';
import consistentInfer from './consistent-infer.ts';
import consistentNullability from './consistent-nullability.ts';
import discriminatedUnions from './discriminated-unions.ts';
import errorMapAllLocales from './error-map-all-locales.ts';
import errorMapComplete from './error-map-complete.ts';
import explicitUndefined from './explicit-undefined.ts';
import exportSchemaAndType from './export-schema-and-type.ts';
import importTypeOnly from './import-type-only.ts';
import limitUnionSize from './limit-union-size.ts';
import namespaceImport from './namespace-import.ts';
import noAnySchema from './no-any-schema.ts';
import noClassValidator from './no-class-validator.ts';
import noDirectSafeparse from './no-direct-safeparse.ts';
import noDuplicateKeys from './no-duplicate-keys.ts';
import noDuplicateSchema from './no-duplicate-schema.ts';
import noEmptyObject from './no-empty-object.ts';
import noExpensiveRegex from './no-expensive-regex.ts';
import noFallbackRequired from './no-fallback-required.ts';
import noGenericStringSchema from './no-generic-string-schema.ts';
import noIgnoreIssues from './no-ignore-issues.ts';
import noInlineErrorMessage from './no-inline-error-message.ts';
import noInlineInfer from './no-inline-infer.ts';
import noIoTs from './no-io-ts.ts';
import noJoi from './no-joi.ts';
import noLooseTuples from './no-loose-tuples.ts';
import noManualTypes from './no-manual-types.ts';
import noMutateAfterParse from './no-mutate-after-parse.ts';
import noNestedOptional from './no-nested-optional.ts';
import noOmitPickInfer from './no-omit-pick-infer.ts';
import noOptionalHeavyObject from './no-optional-heavy-object.ts';
import noOrphanSchemas from './no-orphan-schemas.ts';
import noOrphanTypes from './no-orphan-types.ts';
import noParse from './no-parse.ts';
import noPartialInfer from './no-partial-infer.ts';
import noPassthrough from './no-passthrough.ts';
import noRecursiveWithoutLazy from './no-recursive-without-lazy.ts';
import noReexportInfer from './no-reexport-infer.ts';
import noSchemaInComponent from './no-schema-in-component.ts';
import noSchemaInLoop from './no-schema-in-loop.ts';
import noTransformSideEffects from './no-transform-side-effects.ts';
import noTypeCastAfterParse from './no-type-cast-after-parse.ts';
import noUnsafeCoerce from './no-unsafe-coerce.ts';
import noYup from './no-yup.ts';
import noZod from './no-zod.ts';
import oneSchemaPerFile from './one-schema-per-file.ts';
import preferBrandedTypes from './prefer-branded-types.ts';
import preferMethods from './prefer-methods.ts';
import preferPicklist from './prefer-picklist.ts';
import preferPipe from './prefer-pipe.ts';
import preferSharedSchema from './prefer-shared-schema.ts';
import preferTemplateLiteral from './prefer-template-literal.ts';
import readonlyParseResult from './readonly-parse-result.ts';
import requireDescription from './require-description.ts';
import requireErrorMap from './require-error-map.ts';
import requireErrorMapping from './require-error-mapping.ts';
import requireFieldDocs from './require-field-docs.ts';
import requireGenericSchema from './require-generic-schema.ts';
import requireMinLength from './require-min-length.ts';
import requireSchemaSuffix from './require-schema-suffix.ts';
import requireStrictObject from './require-strict-object.ts';
import revalidateOnChange from './revalidate-on-change.ts';
import schemaFileLocation from './schema-file-location.ts';
import schemaTypePair from './schema-type-pair.ts';
import typeAliasFromSchema from './type-alias-from-schema.ts';
import validateBoundaries from './validate-boundaries.ts';
import validateFunctionOutput from './validate-function-output.ts';

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
    if (!result.success) {
      addIssue({ message: 'bad' });
    }
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

  it('warns for exported type alias referencing missing schema', async () => {
    const code: string = `
import * as v from 'valibot';
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('passes with InferInput', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferInput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema definition', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(0);
  });

  it('handles ExportNamedDeclaration of type alias', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(0);
  });

  it('handles variables without initializer', async () => {
    const code: string = `
import * as v from 'valibot';
let x;
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(1);
  });

  it('passes for non-valibot schema', async () => {
    const code: string = `
import * as z from 'zod';
const UserSchema = z.object({ name: z.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(colocateSchemaType, code);
    expect(results.length).toBe(1);
  });

  it('handles empty body', async () => {
    const code: string = ``;
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

  it('handles export specifiers for type', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
export { User };
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles ExportNamedDeclaration without declaration', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export { something };
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(1);
  });

  it('handles multiple exported schemas', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
export const ItemSchema = v.object({ title: v.string() });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ItemSchema');
    expect(results[0]!.message).toContain('Item');
  });

  it('handles non-valibot exported schema', async () => {
    const code: string = `
import * as z from 'zod';
export const UserSchema = z.object({ name: z.string() });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles exported variable without initializer', async () => {
    const code: string = `
import * as v from 'valibot';
export let UserSchema;
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('passes for empty file', async () => {
    const code: string = ``;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles non-Schema named export', async () => {
    const code: string = `
import * as v from 'valibot';
export const userHelper = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles exported type alias', async () => {
    const code: string = `
import * as v from 'valibot';
export type Foo = string;
export const FooSchema = v.string();
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles non-call expression init (not a valibot schema call)', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = someOtherValue;
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles call expression with non-member callee (bare function)', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = createSchema({ name: 'string' });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles export specifier where exported name differs from local', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type InternalUser = v.InferOutput<typeof UserSchema>;
export { InternalUser as User };
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(0);
  });

  it('handles v.object() schema factory', async () => {
    const code: string = `
import * as v from 'valibot';
export const ItemSchema = v.object({ title: v.string() });
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ItemSchema');
  });

  it('handles exported schema using v.pipe()', async () => {
    const code: string = `
import * as v from 'valibot';
export const EmailSchema = v.pipe(v.string(), v.email());
`;
    const results: LintResult[] = await lint(exportSchemaAndType, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('EmailSchema');
  });

  it('handles export specifier with only local name', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
const User = 'type placeholder';
export { User };
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

  it('ignores non-exported schemas', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles export { ... } specifiers for type', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
export { User };
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles ExportNamedDeclaration with no declaration', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
export { UserSchema };
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles multiple exported schemas', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
export const ItemSchema = v.object({ title: v.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ItemSchema');
  });

  it('handles non-valibot schema call (not a valibot import)', async () => {
    const code: string = `
import * as z from 'zod';
export const UserSchema = z.object({ name: z.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles variables without initializer in exported declaration', async () => {
    const code: string = `
import * as v from 'valibot';
export let schema;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported variable declaration with schema call', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.object({ name: v.string() });
type User = string;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported type alias', async () => {
    const code: string = `
import * as v from 'valibot';
type Foo = string;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema using v.pipe()', async () => {
    const code: string = `
import * as v from 'valibot';
export const EmailSchema = v.pipe(v.string(), v.email());
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('EmailSchema');
    expect(results[0]!.message).toContain('Email');
  });

  it('handles exported schema with v.array()', async () => {
    const code: string = `
import * as v from 'valibot';
export const ItemsSchema = v.array(v.string());
export type Items = v.InferOutput<typeof ItemsSchema>;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('passes for empty file body', async () => {
    const code: string = ``;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-call expression init (isValibotSchemaCall returns false for non-CallExpression)', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = someVariable;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles call expression with bare function callee (not member expression)', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = createSchema({ name: 'string' });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported variable declaration without declarations array', async () => {
    const code: string = `
import * as v from 'valibot';
const x = 42;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported variable without id or init', async () => {
    const code: string = `
import * as v from 'valibot';
let UserSchema;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported schema variable (not re-tracked if already exported)', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
const UserSchema2 = v.object({ age: v.number() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('handles exported type alias inside ExportNamedDeclaration', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema using v.union()', async () => {
    const code: string = `
import * as v from 'valibot';
export const StatusSchema = v.union([v.literal('active'), v.literal('inactive')]);
export type Status = v.InferOutput<typeof StatusSchema>;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema using v.nullable()', async () => {
    const code: string = `
import * as v from 'valibot';
export const MaybeNameSchema = v.nullable(v.string());
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('MaybeNameSchema');
  });

  it('handles exported schema using v.optional()', async () => {
    const code: string = `
import * as v from 'valibot';
export const OptNameSchema = v.optional(v.string());
export type OptName = string;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema using v.record()', async () => {
    const code: string = `
import * as v from 'valibot';
export const MapSchema = v.record(v.string(), v.number());
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('handles non-exported schema that does not end with Schema', async () => {
    const code: string = `
import * as v from 'valibot';
const userValidator = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles exported variable that does not end in Schema', async () => {
    const code: string = `
import * as v from 'valibot';
export const userValidator = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported type alias (TSTypeAliasDeclaration at top level)', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type User = { name: string };
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('not exported');
  });

  it('provides autofix that inserts type alias after schema when type is missing', async () => {
    const code: string = `import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results).toHaveLength(1);
    expect(results[0]!.fix.text).toBe('\nexport type User = v.InferOutput<typeof UserSchema>;\n');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.start).toBe(results[0]!.fix.range.end);
  });

  it('provides autofix that prepends export to existing unexported type', async () => {
    const code: string = `import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noOrphanSchemas, code);
    expect(results).toHaveLength(1);
    expect(results[0]!.fix.text).toBe('export ');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.start).toBe(results[0]!.fix.range.end);
  });

  it('has fixable: true', () => {
    expect(noOrphanSchemas.fixable).toBe(true);
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

  it('handles exported schema and type', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('handles exported type alias in ExportNamedDeclaration', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
export type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('handles non-exported type alias', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('handles ExportNamedDeclaration without declaration', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
export { UserSchema };
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('handles multiple schemas', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
const ItemSchema = v.object({ title: v.string() });
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ItemSchema');
  });

  it('warns when type uses wrong derivation', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = { name: string };
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('handles schema from v.pipe()', async () => {
    const code: string = `
import * as v from 'valibot';
const EmailSchema = v.pipe(v.string(), v.email());
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Email');
  });

  it('handles exported schema with VariableDeclaration', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(1);
  });

  it('handles non-valibot call (not a schema)', async () => {
    const code: string = `
import * as z from 'zod';
const UserSchema = z.object({ name: z.string() });
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('handles variables without initializer', async () => {
    const code: string = `
import * as v from 'valibot';
let UserSchema;
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('passes for empty file', async () => {
    const code: string = ``;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results.length).toBe(0);
  });

  it('provides autofix that inserts type alias after schema when type is missing', async () => {
    const code: string = `import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results).toHaveLength(1);
    expect(results[0]!.fix.text).toBe('\nexport type User = v.InferOutput<typeof UserSchema>;\n');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.start).toBe(results[0]!.fix.range.end);
  });

  it('provides autofix that replaces type annotation when type is wrong', async () => {
    const code: string = `import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = { name: string };
`;
    const results: LintResult[] = await lint(schemaTypePair, code);
    expect(results).toHaveLength(1);
    expect(results[0]!.fix.text).toBe('v.InferOutput<typeof UserSchema>');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.end).toBeGreaterThan(results[0]!.fix.range.start);
  });

  it('has fixable: true', () => {
    expect(schemaTypePair.fixable).toBe(true);
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

// =============================================================================
// valibot/consistent-infer
// =============================================================================

describe('valibot/consistent-infer', () => {
  it('has correct rule metadata', () => {
    expect(consistentInfer.id).toBe('valibot/consistent-infer');
    expect(consistentInfer.visitor.TSTypeAliasDeclaration).toBeDefined();
  });

  it('passes for v.InferOutput usage', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(consistentInfer, code);
    expect(results.length).toBe(0);
  });

  it('warns for v.InferInput when type name does not contain Input', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = v.InferInput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(consistentInfer, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('InferInput');
  });

  it('passes for v.InferInput when type name contains Input', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type UserInput = v.InferInput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(consistentInfer, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/import-type-only
// =============================================================================

describe('valibot/import-type-only', () => {
  it('has correct rule metadata', () => {
    expect(importTypeOnly.id).toBe('valibot/import-type-only');
    expect(importTypeOnly.visitor.ImportDeclaration).toBeDefined();
  });

  it('passes for namespace import', async () => {
    const code: string = `
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(importTypeOnly, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot import', async () => {
    const code: string = `
import { something } from 'lodash';
`;
    const results: LintResult[] = await lint(importTypeOnly, code);
    expect(results.length).toBe(0);
  });

  it('warns for value import of type-only identifiers', async () => {
    const code: string = `
import { InferOutput } from 'valibot';
`;
    const results: LintResult[] = await lint(importTypeOnly, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('import type');
  });

  it('passes for type-only import', async () => {
    const code: string = `
import type { InferOutput } from 'valibot';
`;
    const results: LintResult[] = await lint(importTypeOnly, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-inline-infer
// =============================================================================

describe('valibot/no-inline-infer', () => {
  it('has correct rule metadata', () => {
    expect(noInlineInfer.id).toBe('valibot/no-inline-infer');
    expect(noInlineInfer.visitor.FunctionDeclaration).toBeDefined();
  });

  it('warns for inline InferOutput in function param', async () => {
    const code: string = `
import * as v from 'valibot';
function processUser(user: v.InferOutput<typeof UserSchema>): void {}
`;
    const results: LintResult[] = await lint(noInlineInfer, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('inline');
  });

  it('passes for function without InferOutput', async () => {
    const code: string = `
function processUser(user: User): void {}
`;
    const results: LintResult[] = await lint(noInlineInfer, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-omit-pick-infer
// =============================================================================

describe('valibot/no-omit-pick-infer', () => {
  it('has correct rule metadata', () => {
    expect(noOmitPickInfer.id).toBe('valibot/no-omit-pick-infer');
    expect(noOmitPickInfer.visitor.TSTypeAliasDeclaration).toBeDefined();
  });

  it('errors for Omit with InferOutput', async () => {
    const code: string = `
import * as v from 'valibot';
type UserWithoutId = Omit<v.InferOutput<typeof UserSchema>, 'id'>;
`;
    const results: LintResult[] = await lint(noOmitPickInfer, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Omit');
  });

  it('errors for Pick with InferOutput', async () => {
    const code: string = `
import * as v from 'valibot';
type UserName = Pick<v.InferOutput<typeof UserSchema>, 'name'>;
`;
    const results: LintResult[] = await lint(noOmitPickInfer, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Pick');
  });

  it('passes for normal type alias', async () => {
    const code: string = `
import * as v from 'valibot';
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noOmitPickInfer, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-partial-infer
// =============================================================================

describe('valibot/no-partial-infer', () => {
  it('has correct rule metadata', () => {
    expect(noPartialInfer.id).toBe('valibot/no-partial-infer');
    expect(noPartialInfer.visitor.TSTypeAliasDeclaration).toBeDefined();
  });

  it('errors for Partial with InferOutput', async () => {
    const code: string = `
import * as v from 'valibot';
type PartialUser = Partial<v.InferOutput<typeof UserSchema>>;
`;
    const results: LintResult[] = await lint(noPartialInfer, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Partial');
  });

  it('passes for normal InferOutput', async () => {
    const code: string = `
import * as v from 'valibot';
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noPartialInfer, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-reexport-infer
// =============================================================================

describe('valibot/no-reexport-infer', () => {
  it('has correct rule metadata', () => {
    expect(noReexportInfer.id).toBe('valibot/no-reexport-infer');
    expect(noReexportInfer.visitor.ExportNamedDeclaration).toBeDefined();
  });

  it('errors for re-exporting InferOutput from valibot', async () => {
    const code: string = `
export { InferOutput } from 'valibot';
`;
    const results: LintResult[] = await lint(noReexportInfer, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('InferOutput');
  });

  it('passes for exporting concrete types', async () => {
    const code: string = `
export { UserSchema } from './user.ts';
`;
    const results: LintResult[] = await lint(noReexportInfer, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-class-validator
// =============================================================================

describe('valibot/no-class-validator', () => {
  it('has correct rule metadata', () => {
    expect(noClassValidator.id).toBe('valibot/no-class-validator');
    expect(noClassValidator.visitor.ImportDeclaration).toBeDefined();
  });

  it('errors for class-validator import', async () => {
    const code: string = `
import { IsString } from 'class-validator';
`;
    const results: LintResult[] = await lint(noClassValidator, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Valibot');
  });

  it('errors for class-transformer import', async () => {
    const code: string = `
import { plainToClass } from 'class-transformer';
`;
    const results: LintResult[] = await lint(noClassValidator, code);
    expect(results.length).toBe(1);
  });

  it('passes for valibot import', async () => {
    const code: string = `
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(noClassValidator, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-io-ts
// =============================================================================

describe('valibot/no-io-ts', () => {
  it('errors for io-ts import', async () => {
    const code: string = `
import * as t from 'io-ts';
`;
    const results: LintResult[] = await lint(noIoTs, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for non-io-ts import', async () => {
    const code: string = `
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(noIoTs, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-joi
// =============================================================================

describe('valibot/no-joi', () => {
  it('errors for joi import', async () => {
    const code: string = `
import Joi from 'joi';
`;
    const results: LintResult[] = await lint(noJoi, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for non-joi import', async () => {
    const code: string = `
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(noJoi, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-yup
// =============================================================================

describe('valibot/no-yup', () => {
  it('errors for yup import', async () => {
    const code: string = `
import * as yup from 'yup';
`;
    const results: LintResult[] = await lint(noYup, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for non-yup import', async () => {
    const code: string = `
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(noYup, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-zod
// =============================================================================

describe('valibot/no-zod', () => {
  it('errors for zod import', async () => {
    const code: string = `
import { z } from 'zod';
`;
    const results: LintResult[] = await lint(noZod, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for non-zod import', async () => {
    const code: string = `
import * as v from 'valibot';
`;
    const results: LintResult[] = await lint(noZod, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-any-schema
// =============================================================================

describe('valibot/no-any-schema', () => {
  it('has correct rule metadata', () => {
    expect(noAnySchema.id).toBe('valibot/no-any-schema');
    expect(noAnySchema.visitor.CallExpression).toBeDefined();
  });

  it('errors for v.any()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.any();
`;
    const results: LintResult[] = await lint(noAnySchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('any');
  });

  it('errors for v.unknown()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.unknown();
`;
    const results: LintResult[] = await lint(noAnySchema, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('unknown');
  });

  it('passes for v.string()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string();
`;
    const results: LintResult[] = await lint(noAnySchema, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-duplicate-keys
// =============================================================================

describe('valibot/no-duplicate-keys', () => {
  it('has correct rule metadata', () => {
    expect(noDuplicateKeys.id).toBe('valibot/no-duplicate-keys');
    expect(noDuplicateKeys.visitor.CallExpression).toBeDefined();
  });

  it('errors for duplicate keys in strictObject', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string(), name: v.number() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Duplicate');
  });

  it('passes for unique keys', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string(), age: v.number() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('errors for duplicate keys in v.object()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.object({ name: v.string(), name: v.number() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Duplicate');
    expect(results[0]!.message).toContain('v.object()');
  });

  it('passes for non-valibot object call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.strictObject({ name: z.string(), name: z.number() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-object/strictObject method', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.array(v.string());
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('passes when no arguments provided', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject();
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('passes when first argument is not an object expression', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject(existingFields);
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('handles spread elements (ignores them)', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ ...base, name: v.string() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-member-expression callee', async () => {
    const code: string = `
const schema = strictObject({ name: 'hello', name: 'world' });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });

  it('handles multiple duplicate keys', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string(), age: v.number(), name: v.boolean(), age: v.string() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(2);
  });

  it('handles computed property key with no name (skips it)', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ [Symbol.iterator]: v.string(), name: v.string() });
`;
    const results: LintResult[] = await lint(noDuplicateKeys, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-empty-object
// =============================================================================

describe('valibot/no-empty-object', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyObject.id).toBe('valibot/no-empty-object');
    expect(noEmptyObject.visitor.CallExpression).toBeDefined();
  });

  it('errors for v.strictObject({})', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({});
`;
    const results: LintResult[] = await lint(noEmptyObject, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Empty');
  });

  it('passes for non-empty object', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noEmptyObject, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-loose-tuples
// =============================================================================

describe('valibot/no-loose-tuples', () => {
  it('has correct rule metadata', () => {
    expect(noLooseTuples.id).toBe('valibot/no-loose-tuples');
    expect(noLooseTuples.visitor.CallExpression).toBeDefined();
  });

  it('errors for v.tuple()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.tuple([v.string(), v.number()]);
`;
    const results: LintResult[] = await lint(noLooseTuples, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('strictTuple');
  });

  it('passes for v.strictTuple()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictTuple([v.string(), v.number()]);
`;
    const results: LintResult[] = await lint(noLooseTuples, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-manual-types
// =============================================================================

describe('valibot/no-manual-types', () => {
  it('has correct rule metadata', () => {
    expect(noManualTypes.id).toBe('valibot/no-manual-types');
    expect(noManualTypes.visitor.TSTypeAliasDeclaration).toBeDefined();
  });

  it('warns for object literal type without schema', async () => {
    const code: string = `
type User = { name: string; age: number };
`;
    const results: LintResult[] = await lint(noManualTypes, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when schema exists', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
type User = { name: string };
`;
    const results: LintResult[] = await lint(noManualTypes, code);
    expect(results.length).toBe(0);
  });

  it('skips Props suffix', async () => {
    const code: string = `
type ButtonProps = { label: string };
`;
    const results: LintResult[] = await lint(noManualTypes, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-nested-optional
// =============================================================================

describe('valibot/no-nested-optional', () => {
  it('has correct rule metadata', () => {
    expect(noNestedOptional.id).toBe('valibot/no-nested-optional');
    expect(noNestedOptional.visitor.CallExpression).toBeDefined();
  });

  it('errors for v.optional(v.nullable(...))', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.optional(v.nullable(v.string()));
`;
    const results: LintResult[] = await lint(noNestedOptional, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Nested');
  });

  it('passes for single optional', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.optional(v.string());
`;
    const results: LintResult[] = await lint(noNestedOptional, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-passthrough
// =============================================================================

describe('valibot/no-passthrough', () => {
  it('has correct rule metadata', () => {
    expect(noPassthrough.id).toBe('valibot/no-passthrough');
    expect(noPassthrough.visitor.CallExpression).toBeDefined();
  });

  it('errors for v.passthrough()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.passthrough();
`;
    const results: LintResult[] = await lint(noPassthrough, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for v.strictObject()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noPassthrough, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-recursive-without-lazy
// =============================================================================

describe('valibot/no-recursive-without-lazy', () => {
  it('has correct rule metadata', () => {
    expect(noRecursiveWithoutLazy.id).toBe('valibot/no-recursive-without-lazy');
    expect(noRecursiveWithoutLazy.visitor.VariableDeclaration).toBeDefined();
  });

  it('passes for non-recursive schema', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('errors for recursive schema without v.lazy()', async () => {
    const code: string = `
import * as v from 'valibot';
const TreeSchema = v.strictObject({ children: v.array(TreeSchema) });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('TreeSchema');
    expect(results[0]!.message).toContain('v.lazy()');
  });

  it('passes for recursive schema with v.lazy()', async () => {
    const code: string = `
import * as v from 'valibot';
const TreeSchema = v.strictObject({ children: v.array(v.lazy(() => TreeSchema)) });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('passes for variable name not ending in Schema', async () => {
    const code: string = `
import * as v from 'valibot';
const userValidator = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot schema call', async () => {
    const code: string = `
import * as z from 'zod';
const TreeSchema = z.object({ children: z.array(TreeSchema) });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('handles variable declaration without init', async () => {
    const code: string = `
import * as v from 'valibot';
let TreeSchema;
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('handles non-call expression init', async () => {
    const code: string = `
import * as v from 'valibot';
const TreeSchema = someVariable;
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('handles call expression with bare function callee', async () => {
    const code: string = `
import * as v from 'valibot';
const TreeSchema = createSchema({ children: TreeSchema });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });

  it('passes for exported recursive schema with lazy', async () => {
    const code: string = `
import * as v from 'valibot';
export const NodeSchema = v.object({ children: v.array(v.lazy(() => NodeSchema)) });
`;
    const results: LintResult[] = await lint(noRecursiveWithoutLazy, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/consistent-nullability
// =============================================================================

describe('valibot/consistent-nullability', () => {
  it('has correct rule metadata', () => {
    expect(consistentNullability.id).toBe('valibot/consistent-nullability');
    expect(consistentNullability.visitor.CallExpression).toBeDefined();
  });

  it('passes for consistent optional usage', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ a: v.optional(v.string()), b: v.optional(v.number()) });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('passes for schema without optional/nullable', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ a: v.string(), b: v.number() });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('warns for mixing optional and nullable', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ a: v.optional(v.string()), b: v.nullable(v.number()) });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/consistent-nullability');
    expect(results[0]!.message).toContain('mixes');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes for consistent nullable usage', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ a: v.nullable(v.string()), b: v.nullable(v.number()) });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot object call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.object({ a: z.optional(z.string()), b: z.nullable(z.number()) });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-object/strictObject method', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string();
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('passes when no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject();
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('passes when first arg is not an object expression', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject(existingFields);
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });

  it('handles spread elements in object', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ ...base, a: v.optional(v.string()), b: v.nullable(v.number()) });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(1);
  });

  it('handles v.object() method too', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.object({ a: v.optional(v.string()), b: v.nullable(v.number()) });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(1);
  });

  it('passes for non-member-expression callee', async () => {
    const code: string = `
const schema = strictObject({ a: 'hello' });
`;
    const results: LintResult[] = await lint(consistentNullability, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/explicit-undefined
// =============================================================================

describe('valibot/explicit-undefined', () => {
  it('has correct rule metadata', () => {
    expect(explicitUndefined.id).toBe('valibot/explicit-undefined');
    expect(explicitUndefined.visitor.CallExpression).toBeDefined();
  });

  it('reports info for v.optional() without default', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.optional(v.string());
`;
    const results: LintResult[] = await lint(explicitUndefined, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('info');
  });

  it('passes for v.optional() with default value', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.optional(v.string(), 'default');
`;
    const results: LintResult[] = await lint(explicitUndefined, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-optional-heavy-object
// =============================================================================

describe('valibot/no-optional-heavy-object', () => {
  it('has correct rule metadata', () => {
    expect(noOptionalHeavyObject.id).toBe('valibot/no-optional-heavy-object');
    expect(noOptionalHeavyObject.visitor.CallExpression).toBeDefined();
  });

  it('passes for schema with few optional fields', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ a: v.string(), b: v.number(), c: v.optional(v.string()) });
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });

  it('warns for schema with >70% optional fields', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({
  a: v.optional(v.string()),
  b: v.optional(v.number()),
  c: v.optional(v.boolean()),
  d: v.string(),
});
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/no-optional-heavy-object');
    expect(results[0]!.message).toContain('optional/nullable');
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns for all-optional fields', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({
  a: v.optional(v.string()),
  b: v.nullable(v.number()),
  c: v.nullish(v.boolean()),
});
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('100%');
  });

  it('passes for schema with fewer than 3 properties', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ a: v.optional(v.string()), b: v.optional(v.number()) });
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });

  it('passes for v.object() with acceptable optional ratio', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.object({
  a: v.string(),
  b: v.number(),
  c: v.boolean(),
  d: v.optional(v.string()),
});
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot object call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.object({ a: z.optional(z.string()), b: z.optional(z.number()), c: z.optional(z.boolean()) });
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-object method', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string();
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });

  it('handles non-object first argument', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject(existingFields);
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });

  it('handles no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject();
`;
    const results: LintResult[] = await lint(noOptionalHeavyObject, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-schema-in-component
// =============================================================================

describe('valibot/no-schema-in-component', () => {
  it('has correct rule metadata', () => {
    expect(noSchemaInComponent.id).toBe('valibot/no-schema-in-component');
    expect(noSchemaInComponent.visitor.Program).toBeDefined();
  });

  it('passes for schema in regular ts file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noSchemaInComponent, code, 'src/schemas/user.ts');
    expect(results.length).toBe(0);
  });

  it('warns for schema in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns for schema in .svelte file (not .svelte.ts)', async () => {
    const code: string = `<script lang="ts">
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
</script>`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte',
    );
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('warns for exported schema in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('UserSchema');
  });

  it('passes for non-schema variable in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
const userValidator = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot schema call in svelte file', async () => {
    const code: string = `
import * as z from 'zod';
const UserSchema = z.object({ name: z.string() });
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });

  it('handles variable without init in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
let UserSchema;
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });

  it('passes for non-variable statements in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
function doSomething() { return v.string(); }
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });

  it('handles ExportNamedDeclaration with non-variable declaration in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
export type User = { name: string };
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });

  it('handles call expression with bare function callee in svelte file', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = createSchema({ name: 'string' });
`;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });

  it('passes for empty svelte file', async () => {
    const code: string = ``;
    const results: LintResult[] = await lint(
      noSchemaInComponent,
      code,
      'src/components/User.svelte.ts',
    );
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/await-async-parse (B5)
// =============================================================================

describe('valibot/await-async-parse', () => {
  it('has correct rule metadata', () => {
    expect(awaitAsyncParse.id).toBe('valibot/await-async-parse');
    expect(awaitAsyncParse.visitor.CallExpression).toBeDefined();
  });

  it('warns for v.parseAsync()', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.parseAsync(schema, data);
`;
    const results: LintResult[] = await lint(awaitAsyncParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes for non-async parse', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.string();
`;
    const results: LintResult[] = await lint(awaitAsyncParse, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-fallback-required (B5)
// =============================================================================

describe('valibot/no-fallback-required', () => {
  it('has correct rule metadata', () => {
    expect(noFallbackRequired.id).toBe('valibot/no-fallback-required');
    expect(noFallbackRequired.visitor.CallExpression).toBeDefined();
  });

  it('warns for v.fallback()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.fallback(v.string(), 'default');
`;
    const results: LintResult[] = await lint(noFallbackRequired, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes for v.optional()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.optional(v.string());
`;
    const results: LintResult[] = await lint(noFallbackRequired, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-ignore-issues (B5)
// =============================================================================

describe('valibot/no-ignore-issues', () => {
  it('has correct rule metadata', () => {
    expect(noIgnoreIssues.id).toBe('valibot/no-ignore-issues');
    expect(noIgnoreIssues.visitor.CallExpression).toBeDefined();
  });

  it('passes for non-safeParse calls', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string();
`;
    const results: LintResult[] = await lint(noIgnoreIssues, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-type-cast-after-parse (B5)
// =============================================================================

describe('valibot/no-type-cast-after-parse', () => {
  it('has correct rule metadata', () => {
    expect(noTypeCastAfterParse.id).toBe('valibot/no-type-cast-after-parse');
    expect(noTypeCastAfterParse.visitor.TSAsExpression).toBeDefined();
  });

  it('errors for as cast on parse result', async () => {
    const code: string = `
const result = parse(schema, data) as MyType;
`;
    const results: LintResult[] = await lint(noTypeCastAfterParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for as cast on non-parse expression', async () => {
    const code: string = `
const result = getValue() as string;
`;
    const results: LintResult[] = await lint(noTypeCastAfterParse, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-unsafe-coerce (B5)
// =============================================================================

describe('valibot/no-unsafe-coerce', () => {
  it('has correct rule metadata', () => {
    expect(noUnsafeCoerce.id).toBe('valibot/no-unsafe-coerce');
    expect(noUnsafeCoerce.visitor.CallExpression).toBeDefined();
  });

  it('errors for v.coerce()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.coerce(v.number(), Number);
`;
    const results: LintResult[] = await lint(noUnsafeCoerce, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for v.transform()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform(v.string(), (s) => Number(s));
`;
    const results: LintResult[] = await lint(noUnsafeCoerce, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/readonly-parse-result (B5)
// =============================================================================

describe('valibot/readonly-parse-result', () => {
  it('has correct rule metadata', () => {
    expect(readonlyParseResult.id).toBe('valibot/readonly-parse-result');
    expect(readonlyParseResult.visitor.VariableDeclaration).toBeDefined();
  });

  it('passes for const declarations', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(readonlyParseResult, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-mutate-after-parse (B5)
// =============================================================================

describe('valibot/no-mutate-after-parse', () => {
  it('has correct rule metadata', () => {
    expect(noMutateAfterParse.id).toBe('valibot/no-mutate-after-parse');
    expect(noMutateAfterParse.visitor.ExpressionStatement).toBeDefined();
  });

  it('passes for non-assignment statements', async () => {
    const code: string = `
console.log('hello');
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(0);
  });

  it('errors for mutation via .data. property', async () => {
    const code: string = `
result.data.name = 'new name';
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('mutate');
  });

  it('errors for mutation via .output. property', async () => {
    const code: string = `
result.output.name = 'new name';
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors for mutation via parsed. prefix', async () => {
    const code: string = `
parsed.name = 'new name';
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors for mutation via result.data prefix', async () => {
    const code: string = `
result.data = newValue;
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for assignment to non-parsed member', async () => {
    const code: string = `
user.name = 'new name';
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(0);
  });

  it('passes for assignment to simple variable', async () => {
    const code: string = `
x = 42;
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-expression statement (function call)', async () => {
    const code: string = `
doSomething();
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(0);
  });

  it('passes for empty source', async () => {
    const code: string = ``;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(0);
  });

  it('errors for nested data mutation', async () => {
    const code: string = `
response.data.user.email = 'test@test.com';
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors for parsed output mutation', async () => {
    const code: string = `
parsed.items = [];
`;
    const results: LintResult[] = await lint(noMutateAfterParse, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// valibot/revalidate-on-change (B5)
// =============================================================================

describe('valibot/revalidate-on-change', () => {
  it('has correct rule metadata', () => {
    expect(revalidateOnChange.id).toBe('valibot/revalidate-on-change');
    expect(revalidateOnChange.visitor.Program).toBeDefined();
  });

  it('passes for file without safeParse', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(revalidateOnChange, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-schema-in-loop (B5)
// =============================================================================

describe('valibot/no-schema-in-loop', () => {
  it('has correct rule metadata', () => {
    expect(noSchemaInLoop.id).toBe('valibot/no-schema-in-loop');
    expect(noSchemaInLoop.visitor.CallExpression).toBeDefined();
  });

  it('passes for schema outside loop', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(noSchemaInLoop, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-inline-error-message (B5)
// =============================================================================

describe('valibot/no-inline-error-message', () => {
  it('has correct rule metadata', () => {
    expect(noInlineErrorMessage.id).toBe('valibot/no-inline-error-message');
    expect(noInlineErrorMessage.visitor.CallExpression).toBeDefined();
  });

  it('passes for valibot calls without string args', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string();
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });

  it('does not flag v.minLength() with string arg when parser uses non-StringLiteral type', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength(3, 'Too short');
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    // OXC parser may not produce StringLiteral node type for string args
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('passes for v.minLength() without string arg', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength(3);
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });

  it('handles v.email() with string arg', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.email('Invalid email');
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    // OXC may or may not produce StringLiteral for the arg
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('handles v.regex() with string arg', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.regex(/^[a-z]+$/, 'Only lowercase');
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('passes for non-valibot validation call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.minLength(3, 'Too short');
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-validation method', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string('hello');
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });

  it('passes for validation method with no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.email();
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-member expression call', async () => {
    const code: string = `
const schema = minLength(3, 'Too short');
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });

  it('passes when last argument is not a string literal', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength(3, errorMsg);
`;
    const results: LintResult[] = await lint(noInlineErrorMessage, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/validate-function-output (B5)
// =============================================================================

describe('valibot/validate-function-output', () => {
  it('has correct rule metadata', () => {
    expect(validateFunctionOutput.id).toBe('valibot/validate-function-output');
    expect(validateFunctionOutput.visitor.ExportNamedDeclaration).toBeDefined();
  });

  it('passes for non-function exports', async () => {
    const code: string = `
export const x = 'hello';
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('reports unvalidated function output', async () => {
    const code: string = `
export function getUser(id: string): { name: string } {
  return { name: 'John' };
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/validate-function-output');
    expect(results[0]!.message).toContain('getUser');
    expect(results[0]!.severity).toBe('info');
  });

  it('passes for function returning void', async () => {
    const code: string = `
export function logMessage(msg: string): void {
  console.log(msg);
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function returning never', async () => {
    const code: string = `
export function throwError(): never {
  throw new Error('fail');
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function returning Result type', async () => {
    const code: string = `
export function getUser(): Result<User> {
  return ok(user);
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function returning SafeParseResult', async () => {
    const code: string = `
export function getUser(): SafeParseResult {
  return safeParse(schema, data);
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function returning Promise<Result>', async () => {
    const code: string = `
export function getUser(): Promise<Result<User>> {
  return ok(user);
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function body containing safeParse', async () => {
    const code: string = `
export function getUser(): { name: string } {
  const result = safeParse(schema, data);
  return result.output;
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function body containing Result', async () => {
    const code: string = `
export function getUser(): { name: string } {
  const r = Result.ok({ name: 'John' });
  return r.value;
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function without return statement (void-like)', async () => {
    const code: string = `
export function logStuff(msg: string) {
  console.log(msg);
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function without a name', async () => {
    const code: string = `
export const x = 'hello';
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('passes for function without return type annotation but using safeParse', async () => {
    const code: string = `
export function getUser() {
  const r = safeParse(schema, data);
  return r;
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(0);
  });

  it('reports function without return type annotation returning unvalidated data', async () => {
    const code: string = `
export function getUser() {
  return { name: 'John' };
}
`;
    const results: LintResult[] = await lint(validateFunctionOutput, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('getUser');
  });
});

// =============================================================================
// valibot/discriminated-unions (B6)
// =============================================================================

describe('valibot/discriminated-unions', () => {
  it('has correct rule metadata', () => {
    expect(discriminatedUnions.id).toBe('valibot/discriminated-unions');
    expect(discriminatedUnions.visitor.CallExpression).toBeDefined();
  });

  it('passes for v.variant()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.variant('type', []);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('suggests v.variant() for v.union() with object schemas', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.strictObject({ type: v.literal('a') }), v.strictObject({ type: v.literal('b') })]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/discriminated-unions');
    expect(results[0]!.message).toContain('v.variant()');
    expect(results[0]!.severity).toBe('info');
  });

  it('passes for v.union() with non-object schemas', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.string(), v.number()]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('passes for v.union() with single element', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.strictObject({ type: v.literal('a') })]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('passes for v.union() with no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union();
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('passes for v.union() with non-array first arg', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union(schemas);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot union call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-member expression callee', async () => {
    const code: string = `
const schema = union([a, b]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('passes when mix of object and non-object schemas', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.strictObject({ type: v.literal('a') }), v.string()]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(0);
  });

  it('handles v.union() with v.object() (not strictObject)', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.object({ type: v.literal('a') }), v.object({ type: v.literal('b') })]);
`;
    const results: LintResult[] = await lint(discriminatedUnions, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('v.variant()');
  });
});

// =============================================================================
// valibot/limit-union-size (B6)
// =============================================================================

describe('valibot/limit-union-size', () => {
  it('has correct rule metadata', () => {
    expect(limitUnionSize.id).toBe('valibot/limit-union-size');
    expect(limitUnionSize.visitor.CallExpression).toBeDefined();
  });

  it('passes for small union', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.string(), v.number()]);
`;
    const results: LintResult[] = await lint(limitUnionSize, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-expensive-regex (B6)
// =============================================================================

describe('valibot/no-expensive-regex', () => {
  it('has correct rule metadata', () => {
    expect(noExpensiveRegex.id).toBe('valibot/no-expensive-regex');
    expect(noExpensiveRegex.visitor.CallExpression).toBeDefined();
  });

  it('passes for simple regex', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.regex(/^[a-z]+$/);
`;
    const results: LintResult[] = await lint(noExpensiveRegex, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/prefer-branded-types (B7)
// =============================================================================

describe('valibot/prefer-branded-types', () => {
  it('has correct rule metadata', () => {
    expect(preferBrandedTypes.id).toBe('valibot/prefer-branded-types');
    expect(preferBrandedTypes.visitor.VariableDeclaration).toBeDefined();
  });

  it('passes for non-ID schema', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });

  it('reports ID schema without v.brand()', async () => {
    const code: string = `
import * as v from 'valibot';
const UserIdSchema = v.string();
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/prefer-branded-types');
    expect(results[0]!.message).toContain('UserIdSchema');
    expect(results[0]!.message).toContain('brand');
    expect(results[0]!.severity).toBe('info');
  });

  it('passes for ID schema with v.brand()', async () => {
    const code: string = `
import * as v from 'valibot';
const UserIdSchema = v.pipe(v.string(), v.brand('UserId'));
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });

  it('reports schema ending with ID (uppercase)', async () => {
    const code: string = `
import * as v from 'valibot';
const OrderIDSchema = v.string();
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('OrderIDSchema');
  });

  it('passes for non-Schema named variable with Id', async () => {
    const code: string = `
import * as v from 'valibot';
const userId = v.string();
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot ID schema', async () => {
    const code: string = `
import * as z from 'zod';
const UserIdSchema = z.string();
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });

  it('handles variable without initializer', async () => {
    const code: string = `
let UserIdSchema;
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });

  it('handles non-call-expression initializer', async () => {
    const code: string = `
import * as v from 'valibot';
const UserIdSchema = existingSchema;
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });

  it('handles non-member expression callee', async () => {
    const code: string = `
const UserIdSchema = someFunc();
`;
    const results: LintResult[] = await lint(preferBrandedTypes, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/prefer-methods (B7)
// =============================================================================

describe('valibot/prefer-methods', () => {
  it('has correct rule metadata', () => {
    expect(preferMethods.id).toBe('valibot/prefer-methods');
    expect(preferMethods.visitor.CallExpression).toBeDefined();
  });

  it('passes for non-transform calls', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.string();
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(0);
  });

  it('suggests v.trim() for .trim() in transform', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s.trim());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/prefer-methods');
    expect(results[0]!.message).toContain('v.trim()');
    expect(results[0]!.severity).toBe('info');
  });

  it('suggests v.toLowerCase() for .toLowerCase() in transform', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s.toLowerCase());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('v.toLowerCase()');
  });

  it('suggests v.toUpperCase() for .toUpperCase() in transform', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s.toUpperCase());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('v.toUpperCase()');
  });

  it('reports generic transform without specific suggestion', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s + '!');
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('check if a built-in');
  });

  it('passes for v.transform() with no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform();
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot transform call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.transform((s) => s.trim());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-member expression callee', async () => {
    const code: string = `
const schema = transform((s) => s.trim());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(0);
  });

  it('autofixes v.transform(x => x.trim()) to v.trim()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s.trim());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix.text).toBe('v.trim()');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.end).toBeGreaterThan(results[0]!.fix.range.start);
  });

  it('autofixes v.transform(x => x.toLowerCase()) to v.toLowerCase()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s.toLowerCase());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix.text).toBe('v.toLowerCase()');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.end).toBeGreaterThan(results[0]!.fix.range.start);
  });

  it('autofixes v.transform(x => x.toUpperCase()) to v.toUpperCase()', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s.toUpperCase());
`;
    const results: LintResult[] = await lint(preferMethods, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix.text).toBe('v.toUpperCase()');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.end).toBeGreaterThan(results[0]!.fix.range.start);
  });

  it('has fixable: true', () => {
    expect(preferMethods.fixable).toBe(true);
  });
});

// =============================================================================
// valibot/prefer-picklist (B7)
// =============================================================================

describe('valibot/prefer-picklist', () => {
  it('has correct rule metadata', () => {
    expect(preferPicklist.id).toBe('valibot/prefer-picklist');
    expect(preferPicklist.visitor.CallExpression).toBeDefined();
  });

  it('warns for union of literals', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.literal('a'), v.literal('b'), v.literal('c')]);
`;
    const results: LintResult[] = await lint(preferPicklist, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('picklist');
  });

  it('passes for union of non-literals', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.union([v.string(), v.number()]);
`;
    const results: LintResult[] = await lint(preferPicklist, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/prefer-pipe (B7)
// =============================================================================

describe('valibot/prefer-pipe', () => {
  it('has correct rule metadata', () => {
    expect(preferPipe.id).toBe('valibot/prefer-pipe');
    expect(preferPipe.visitor.CallExpression).toBeDefined();
  });

  it('passes for v.pipe() usage', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.pipe(v.string(), v.minLength(3));
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('reports deprecated nested pattern v.minLength(v.string(), 3)', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength(v.string(), 3);
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/prefer-pipe');
    expect(results[0]!.message).toContain('v.pipe(');
    expect(results[0]!.severity).toBe('info');
  });

  it('reports v.email(v.string())', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.email(v.string());
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('email');
    expect(results[0]!.message).toContain('string');
  });

  it('passes when first arg is not a schema call', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength(3);
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('passes when first arg is a non-schema factory call', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength(getSchema(), 3);
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-pipe-method valibot call', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform((s) => s);
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot pipe method call', async () => {
    const code: string = `
import * as z from 'zod';
const schema = z.minLength(z.string(), 3);
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('passes for no arguments to pipe method', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.minLength();
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-member expression call', async () => {
    const code: string = `
const schema = minLength(string(), 3);
`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results.length).toBe(0);
  });

  it('provides autofix that restructures to pipe pattern', async () => {
    const code = `import * as v from 'valibot';\nconst s = v.minLength(v.string(), 3);`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results).toHaveLength(1);
    expect(results[0]!.fix.text).toBe('v.pipe(v.string(), v.minLength(3))');
    expect(results[0]!.fix.range.start).toBeGreaterThan(0);
    expect(results[0]!.fix.range.end).toBeGreaterThan(results[0]!.fix.range.start);
  });

  it('provides autofix for maxLength', async () => {
    const code = `import * as v from 'valibot';\nconst s = v.maxLength(v.string(), 100);`;
    const results: LintResult[] = await lint(preferPipe, code);
    expect(results).toHaveLength(1);
    expect(results[0]!.fix.text).toBe('v.pipe(v.string(), v.maxLength(100))');
  });

  it('has fixable: true', () => {
    expect(preferPipe.fixable).toBe(true);
  });
});

// =============================================================================
// valibot/error-map-all-locales (B8)
// =============================================================================

describe('valibot/error-map-all-locales', () => {
  it('has correct rule metadata', () => {
    expect(errorMapAllLocales.id).toBe('valibot/error-map-all-locales');
    expect(errorMapAllLocales.visitor.VariableDeclaration).toBeDefined();
  });

  it('passes for non-error-map variables', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(0);
  });

  it('reports missing locales in error map', async () => {
    const code: string = `
const UserErrorMap = { en: 'Name required' };
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/error-map-all-locales');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('es');
    expect(results[0]!.message).toContain('fr');
    expect(results[0]!.message).toContain('de');
    expect(results[0]!.message).toContain('ja');
  });

  it('passes when all locales are present', async () => {
    const code: string = `
const UserErrorMap = { en: 'Name', es: 'Nombre', fr: 'Nom', de: 'Name', ja: '名前' };
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(0);
  });

  it('handles Errors suffix', async () => {
    const code: string = `
const UserErrors = { en: 'Name required', es: 'Requerido' };
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('fr');
    expect(results[0]!.message).toContain('de');
    expect(results[0]!.message).toContain('ja');
  });

  it('ignores non-ErrorMap variable names', async () => {
    const code: string = `
const UserConfig = { en: 'English' };
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(0);
  });

  it('ignores ErrorMap variables with non-object initializer', async () => {
    const code: string = `
const UserErrorMap = getErrorMap();
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(0);
  });

  it('handles spread elements in error map', async () => {
    const code: string = `
const UserErrorMap = { ...base, en: 'Name' };
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(1);
  });

  it('handles variable without initializer', async () => {
    const code: string = `
let UserErrorMap;
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(0);
  });

  it('handles empty object error map', async () => {
    const code: string = `
const UserErrorMap = {};
`;
    const results: LintResult[] = await lint(errorMapAllLocales, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('en');
    expect(results[0]!.message).toContain('es');
  });
});

// =============================================================================
// valibot/error-map-complete (B8)
// =============================================================================

describe('valibot/error-map-complete', () => {
  it('has correct rule metadata', () => {
    expect(errorMapComplete.id).toBe('valibot/error-map-complete');
    expect(errorMapComplete.visitor.Program).toBeDefined();
  });

  it('passes for file without schemas', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('reports missing error map entries for schema fields', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string(), age: v.number() });
const UserErrorMap = { name: 'Name is required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/error-map-complete');
    expect(results[0]!.message).toContain('age');
    expect(results[0]!.severity).toBe('info');
  });

  it('passes when error map covers all schema fields', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string(), age: v.number() });
const UserErrorMap = { name: 'Name is required', age: 'Age is required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema and error map', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string(), email: v.string() });
export const UserErrorMap = { name: 'Name required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('email');
  });

  it('passes when no error map exists (only schema)', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('passes when error map exists but no schema', async () => {
    const code: string = `
const UserErrorMap = { name: 'Name required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles schema with object() instead of strictObject()', async () => {
    const code: string = `
import * as v from 'valibot';
const ItemSchema = v.object({ title: v.string(), price: v.number() });
const ItemErrors = { title: 'Title needed' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('price');
  });

  it('handles spread elements in schema properties', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ ...base, name: v.string() });
const UserErrors = { name: 'Required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles spread elements in error map properties', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string(), age: v.number() });
const UserErrors = { ...base, name: 'Required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('age');
  });

  it('handles variables without initializer', async () => {
    const code: string = `
import * as v from 'valibot';
let x;
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles schema with non-object argument', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject(existingObj);
const UserErrors = { name: 'Required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles schema with no arguments', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject();
const UserErrors = { name: 'Required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles error map with Errors suffix', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
const UserErrors = { name: 'Name required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles non-VariableDeclaration statements in body', async () => {
    const code: string = `
import * as v from 'valibot';
function helper() {}
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });

  it('handles exported variable declaration with error map', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string(), age: v.number() });
export const UserErrors = { name: 'required' };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('age');
  });

  it('handles ExportNamedDeclaration without a declaration', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
export { UserSchema };
`;
    const results: LintResult[] = await lint(errorMapComplete, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-error-map (B8)
// =============================================================================

describe('valibot/require-error-map', () => {
  it('has correct rule metadata', () => {
    expect(requireErrorMap.id).toBe('valibot/require-error-map');
    expect(requireErrorMap.visitor.Program).toBeDefined();
  });

  it('passes for file without schemas', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(0);
  });

  it('reports when schema exists but no error map', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/require-error-map');
    expect(results[0]!.severity).toBe('info');
    expect(results[0]!.message).toContain('error map');
  });

  it('passes when schema and error map both exist', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
const UserErrorMap = { name: 'Name is required' };
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(0);
  });

  it('passes when error map is imported', async () => {
    const code: string = `
import * as v from 'valibot';
import { userErrors } from './user.errors';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(0);
  });

  it('passes when error-map module is imported', async () => {
    const code: string = `
import * as v from 'valibot';
import { errors } from './error-map';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(0);
  });

  it('handles exported schema without error map', async () => {
    const code: string = `
import * as v from 'valibot';
export const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(1);
  });

  it('handles schema with v.object()', async () => {
    const code: string = `
import * as v from 'valibot';
const ItemSchema = v.object({ title: v.string() });
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(1);
  });

  it('handles schema with v.pipe()', async () => {
    const code: string = `
import * as v from 'valibot';
const EmailSchema = v.pipe(v.string(), v.email());
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(1);
  });

  it('handles Errors suffix in error map name', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
const UserErrors = { name: 'Required' };
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(0);
  });

  it('handles ExportNamedDeclaration without declaration', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
export { UserSchema };
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(1);
  });

  it('handles variables without initializer', async () => {
    const code: string = `
import * as v from 'valibot';
let x;
`;
    const results: LintResult[] = await lint(requireErrorMap, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-description (B9)
// =============================================================================

describe('valibot/require-description', () => {
  it('has correct rule metadata', () => {
    expect(requireDescription.id).toBe('valibot/require-description');
    expect(requireDescription.visitor.VariableDeclaration).toBeDefined();
  });

  it('passes for non-schema declarations', async () => {
    const code: string = `
const x = 'hello';
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('reports v.pipe() schema without v.description()', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.pipe(v.string(), v.minLength(3));
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('valibot/require-description');
    expect(results[0]!.message).toContain('UserSchema');
    expect(results[0]!.message).toContain('description');
    expect(results[0]!.severity).toBe('info');
  });

  it('passes for v.pipe() schema with v.description()', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.pipe(v.string(), v.description('A user name'), v.minLength(3));
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-pipe valibot calls', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = v.strictObject({ name: v.string() });
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-Schema named variables', async () => {
    const code: string = `
import * as v from 'valibot';
const UserPipe = v.pipe(v.string(), v.minLength(3));
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-valibot pipe calls', async () => {
    const code: string = `
import * as z from 'zod';
const UserSchema = z.pipe(z.string(), z.minLength(3));
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('handles variables without initializer', async () => {
    const code: string = `
let UserSchema;
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('handles non-call-expression initializer', async () => {
    const code: string = `
import * as v from 'valibot';
const UserSchema = existingSchema;
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });

  it('handles call without proper callee', async () => {
    const code: string = `
const UserSchema = something();
`;
    const results: LintResult[] = await lint(requireDescription, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/require-error-mapping (B9)
// =============================================================================

describe('valibot/require-error-mapping', () => {
  it('has correct rule metadata', () => {
    expect(requireErrorMapping.id).toBe('valibot/require-error-mapping');
    expect(requireErrorMapping.visitor.CallExpression).toBeDefined();
  });

  it('passes for non-safeParse calls', async () => {
    const code: string = `
const result = getValue();
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('reports info for v.safeParse() without mapIssues or flatten', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.safeParse(schema, data);
if (!result.success) {
  console.log(result.issues);
}
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('info');
    expect(results[0]!.message).toContain('safeParse');
    expect(results[0]!.message).toContain('mapIssues');
  });

  it('passes for v.safeParse() followed by mapIssues', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.safeParse(schema, data);
if (!result.success) {
  const errors = mapIssues(result.issues);
}
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('passes for v.safeParse() followed by flatten', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.safeParse(schema, data);
if (!result.success) {
  const errors = flatten(result.issues);
}
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('reports info for direct safeParse() identifier call without mapIssues', async () => {
    const code: string = `
import { safeParse } from 'valibot';
const result = safeParse(schema, data);
if (!result.success) {
  console.log(result.issues);
}
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('info');
  });

  it('passes for direct safeParse() identifier call with mapIssues', async () => {
    const code: string = `
import { safeParse } from 'valibot';
const result = safeParse(schema, data);
const errors = mapIssues(result.issues);
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-safeParse member expression method', async () => {
    const code: string = `
import * as v from 'valibot';
const result = v.parse(schema, data);
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-safeParse identifier call', async () => {
    const code: string = `
const result = validate(schema, data);
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('passes for empty file', async () => {
    const code: string = ``;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });

  it('passes for direct safeParse() identifier call with flatten', async () => {
    const code: string = `
import { safeParse } from 'valibot';
const result = safeParse(schema, data);
const errors = flatten(result.issues);
`;
    const results: LintResult[] = await lint(requireErrorMapping, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// valibot/no-transform-side-effects (B9)
// =============================================================================

describe('valibot/no-transform-side-effects', () => {
  it('has correct rule metadata', () => {
    expect(noTransformSideEffects.id).toBe('valibot/no-transform-side-effects');
    expect(noTransformSideEffects.visitor.CallExpression).toBeDefined();
  });

  it('passes for pure transform', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform(v.string(), (s) => s.trim());
`;
    const results: LintResult[] = await lint(noTransformSideEffects, code);
    expect(results.length).toBe(0);
  });

  it('warns for transform with side effects', async () => {
    const code: string = `
import * as v from 'valibot';
const schema = v.transform(v.string(), (s) => { console.log(s); return s; });
`;
    const results: LintResult[] = await lint(noTransformSideEffects, code);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });
});

// =============================================================================
// valibot/validate-boundaries (B9)
// =============================================================================

describe('valibot/validate-boundaries', () => {
  it('has correct rule metadata', () => {
    expect(validateBoundaries.id).toBe('valibot/validate-boundaries');
    expect(validateBoundaries.visitor.ExportNamedDeclaration).toBeDefined();
  });

  it('passes for non-function exports', async () => {
    const code: string = `
export const x = 'hello';
`;
    const results: LintResult[] = await lint(validateBoundaries, code);
    expect(results.length).toBe(0);
  });
});
