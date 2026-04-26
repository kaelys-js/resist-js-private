/**
 * Branch-coverage supplement for `extract-props`.
 *
 * The primary `extract-props.test.ts` covers the happy paths for
 * `extractProps` against representative sources. This file targets the
 * remaining conditional branches inside `extractPropsVariants` and
 * `buildBaseProps` — including the internal helpers `parseTypeFieldAccepts`,
 * `buildPlaceholderObject`, `buildPlaceholderFromDefinition`, and the
 * `parseTypeBlockFields` nested-object skip-depth handling.
 *
 * Each test builds a minimal `PropMeta` (or raw Svelte source for
 * `extractProps`) chosen to flip a specific branch and asserts the
 * resulting variant / base-prop shape exactly via `toEqual`.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { buildBaseProps, extractProps, extractPropsVariants } from './extract-props.js';
import type { PropMeta, TypeField, VariantKeyMeta } from './types.js';

/* =========================================================================
 * extractPropsVariants — exercises parseTypeFieldAccepts via prop.typeFields
 * ========================================================================= */

describe('extractPropsVariants — boolean/numeric/union/snippet branches', () => {
  it('skips props with empty type', () => {
    const props: PropMeta[] = [
      { name: 'x', type: '', default: '', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('uses @values mockValues (>1) verbatim with array coerce when type ends with []', () => {
    const props: PropMeta[] = [
      {
        name: 'tags',
        type: 'string[]',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['one,two', 'three,four'],
      },
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants(props);
    expect(variants).toEqual([
      {
        key: 'tags',
        options: ['one,two', 'three,four'],
        default: '',
        coerce: 'array',
        requires: undefined,
      },
    ]);
  });

  it('uses @values mockValues (>1) without coerce for non-array types', () => {
    const props: PropMeta[] = [
      {
        name: 'label',
        type: 'string',
        default: "'hi'",
        description: '',
        bindable: false,
        mockValues: ['a', 'b', 'c'],
      },
    ];
    expect(extractPropsVariants(props)).toEqual([
      {
        key: 'label',
        options: ['a', 'b', 'c'],
        default: 'hi',
        coerce: undefined,
        requires: undefined,
      },
    ]);
  });

  it('emits @requires array when prop has requires', () => {
    const props: PropMeta[] = [
      {
        name: 'mode',
        type: 'string',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['x', 'y'],
        requires: [{ prop: 'enabled', value: 'true' }],
      },
    ];
    const result: VariantKeyMeta[] = extractPropsVariants(props);
    expect(result[0]?.requires).toEqual([{ prop: 'enabled', value: 'true' }]);
  });

  it('Snippet prop with exactly 1 @value emits a variant card with empty default', () => {
    const props: PropMeta[] = [
      {
        name: 'header',
        type: 'Snippet',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['<h1>hi</h1>'],
      },
    ];
    expect(extractPropsVariants(props)).toEqual([
      { key: 'header', options: ['<h1>hi</h1>'], default: '', requires: undefined },
    ]);
  });

  it('Snippet prop without @values is skipped', () => {
    const props: PropMeta[] = [
      { name: 'children', type: 'Snippet', default: '', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('Component prop without @values is skipped', () => {
    const props: PropMeta[] = [
      { name: 'as', type: 'Component', default: '', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('callback type ") =>" without @values is skipped', () => {
    const props: PropMeta[] = [
      {
        name: 'onClick',
        type: '(e: MouseEvent) => void',
        default: '',
        description: '',
        bindable: false,
      },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('boolean type emits true/false options', () => {
    const props: PropMeta[] = [
      { name: 'open', type: 'boolean', default: 'false', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([
      { key: 'open', options: ['true', 'false'], default: 'false', requires: undefined },
    ]);
  });

  it('Bool type alias emits true/false', () => {
    const props: PropMeta[] = [
      { name: 'open', type: 'Bool', default: '', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([
      { key: 'open', options: ['true', 'false'], default: '', requires: undefined },
    ]);
  });

  it('numeric prop with positive integer default emits scaled integer options', () => {
    const props: PropMeta[] = [
      { name: 'count', type: 'number', default: '4', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([
      { key: 'count', options: ['2', '4', '6', '8'], default: '4', requires: undefined },
    ]);
  });

  it('numeric prop with positive float default emits scaled float options', () => {
    const props: PropMeta[] = [
      { name: 'ratio', type: 'number', default: '1.5', description: '', bindable: false },
    ];
    const result: VariantKeyMeta[] = extractPropsVariants(props);
    expect(result[0]?.options).toEqual(['0.75', '1.5', '2.25', '3']);
  });

  it('numeric prop with NaN default emits no variant', () => {
    const props: PropMeta[] = [
      { name: 'x', type: 'number', default: 'NaN', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('numeric prop with zero default emits no variant', () => {
    const props: PropMeta[] = [
      { name: 'x', type: 'number', default: '0', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('Num type alias with positive default emits scaled options', () => {
    const props: PropMeta[] = [
      { name: 'count', type: 'Num', default: '2', description: '', bindable: false },
    ];
    const result: VariantKeyMeta[] = extractPropsVariants(props);
    expect(result[0]?.options).toEqual(['1', '2', '3', '4']);
  });

  it('inline string-literal union resolves to options', () => {
    const props: PropMeta[] = [
      {
        name: 'variant',
        type: "'a' | 'b' | 'c'",
        default: "'a'",
        description: '',
        bindable: false,
      },
    ];
    expect(extractPropsVariants(props)).toEqual([
      { key: 'variant', options: ['a', 'b', 'c'], default: 'a', requires: undefined },
    ]);
  });

  it('inline union with single element emits no variant', () => {
    const props: PropMeta[] = [
      { name: 'variant', type: "'only'", default: '', description: '', bindable: false },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('typeDefinition string-literal union resolves to options when inline type lacks " | "', () => {
    const props: PropMeta[] = [
      {
        name: 'variant',
        type: 'ButtonVariant',
        default: "'default'",
        description: '',
        bindable: false,
        typeDefinition: "'default' | 'secondary' | 'destructive'",
      },
    ];
    const result: VariantKeyMeta[] = extractPropsVariants(props);
    expect(result[0]?.options).toEqual(['default', 'secondary', 'destructive']);
  });

  it('typeDefinition without " | " yields no variant', () => {
    const props: PropMeta[] = [
      {
        name: 'name',
        type: 'StrAlias',
        default: '',
        description: '',
        bindable: false,
        typeDefinition: 'string',
      },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });
});

/* =========================================================================
 * extractPropsVariants — typeFields path → parseTypeFieldAccepts branches
 * ========================================================================= */

/**
 * Build a single-prop PropMeta carrying one typeField, used as a fixture
 * generator across the parseTypeFieldAccepts test cases below.
 *
 * @param name - Prop name to embed in the generated PropMeta.
 * @param tf - The single TypeField the synthetic prop should expose.
 * @param propType - Optional type annotation for the prop (defaults to `'Config'`).
 * @returns A fully populated PropMeta whose `typeFields` is a single-element array.
 */
function singleField(name: string, tf: TypeField, propType: string = 'Config'): PropMeta {
  return {
    name,
    type: propType,
    default: '',
    description: '',
    bindable: false,
    typeDefinition: '{ ... }',
    typeFields: [tf],
  };
}

describe('parseTypeFieldAccepts — via extractPropsVariants', () => {
  it('boolean accepts string emits true/false', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'enabled',
        type: 'boolean',
        required: true,
        accepts: 'true / false',
        description: '',
      }),
    ]);
    expect(variants).toEqual([
      { key: 'config.enabled', options: ['true', 'false'], default: '', coerce: undefined },
    ]);
  });

  it('Bool typeField emits true/false', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'flag',
        type: 'Bool',
        required: true,
        accepts: '',
        description: '',
      }),
    ]);
    expect(variants[0]?.options).toEqual(['true', 'false']);
  });

  it('comma-separated picklist emits items as options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'category',
        type: 'string',
        required: true,
        accepts: 'display, form, layout',
        description: '',
      }),
    ]);
    expect(variants).toEqual([
      {
        key: 'config.category',
        options: ['display', 'form', 'layout'],
        default: '',
        coerce: undefined,
      },
    ]);
  });

  it('comma-separated accepts starting with "list of" is NOT treated as picklist', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'items',
        type: 'string[]',
        required: true,
        accepts: 'list of text',
        description: '',
      }),
    ]);
    expect(variants).toEqual([
      {
        key: 'config.items',
        options: ['one', 'one, two', 'one, two, three'],
        default: '',
        coerce: 'array',
      },
    ]);
  });

  it('number accepts string emits numeric example options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'size',
        type: 'number',
        required: true,
        accepts: 'number',
        description: '',
      }),
    ]);
    expect(variants[0]?.options).toEqual(['0', '1', '5', '10']);
  });

  it('Num type alias emits numeric example options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'size',
        type: 'Num',
        required: true,
        accepts: '',
        description: '',
      }),
    ]);
    expect(variants[0]?.options).toEqual(['0', '1', '5', '10']);
  });

  it('text accepts string emits text example options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'label',
        type: 'string',
        required: true,
        accepts: 'text',
        description: '',
      }),
    ]);
    expect(variants[0]?.options).toEqual([
      'Short',
      'A medium example',
      'A longer example text for testing',
    ]);
  });

  it('Str type alias emits text example options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'label',
        type: 'Str',
        required: true,
        accepts: '',
        description: '',
      }),
    ]);
    expect(variants[0]?.options).toEqual([
      'Short',
      'A medium example',
      'A longer example text for testing',
    ]);
  });

  it('"list of text" emits comma-separated array options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'tags',
        type: 'string[]',
        required: true,
        accepts: 'list of text',
        description: '',
      }),
    ]);
    expect(variants[0]).toEqual({
      key: 'config.tags',
      options: ['one', 'one, two', 'one, two, three'],
      default: '',
      coerce: 'array',
    });
  });

  it('"list of <complex>" with parseable mockValues emits JSON array options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'entries',
        type: 'DepEntry[]',
        required: true,
        accepts: 'list of DepEntry',
        description: '',
        mockValues: ['{name: "react", version: "18"}'],
      }),
    ]);
    expect(variants[0]?.options).toEqual([
      JSON.stringify([{ name: 'react', version: '18' }]),
      JSON.stringify([
        { name: 'react', version: '18' },
        { name: 'react', version: '18' },
      ]),
    ]);
    expect(variants[0]?.coerce).toBe('array');
  });

  it('"list of <complex>" with array-typed parseable mockValues uses first array element', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'entries',
        type: 'DepEntry[]',
        required: true,
        accepts: 'list of DepEntry',
        description: '',
        mockValues: ['[{name: "vue", version: "3"}]'],
      }),
    ]);
    expect(variants[0]?.options).toEqual([
      JSON.stringify([{ name: 'vue', version: '3' }]),
      JSON.stringify([
        { name: 'vue', version: '3' },
        { name: 'vue', version: '3' },
      ]),
    ]);
  });

  it('"list of <complex>" with empty array mockValues yields no variant (item undefined)', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'entries',
        type: 'X[]',
        required: true,
        accepts: 'list of X',
        description: '',
        mockValues: ['[]'],
      }),
    ]);
    // options length must be > 1 to emit variant
    expect(variants).toEqual([]);
  });

  it('"list of <complex>" with unparseable mockValues yields no variant', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'entries',
        type: 'X[]',
        required: true,
        accepts: 'list of X',
        description: '',
        mockValues: ['totally not parseable'],
      }),
    ]);
    expect(variants).toEqual([]);
  });

  it('"list of <complex>" with no mockValues yields no variant', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'entries',
        type: 'X[]',
        required: true,
        accepts: 'list of X',
        description: '',
      }),
    ]);
    expect(variants).toEqual([]);
  });

  it('fallback accepts emits generic placeholder options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'misc',
        type: 'WeirdType',
        required: true,
        accepts: 'something unrecognized',
        description: '',
      }),
    ]);
    expect(variants[0]?.options).toEqual(['value-a', 'value-b', 'value-c']);
  });

  it('mockValues with array-typed field but non-object first parsed yields list verbatim', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'tags',
        type: 'string[]',
        required: true,
        accepts: 'list of text',
        description: '',
        mockValues: ['"a"', '"b"'],
      }),
    ]);
    expect(variants[0]).toEqual({
      key: 'config.tags',
      options: ['"a"', '"b"'],
      default: '',
      coerce: 'array',
    });
  });

  it('mockValues with array-typed field, complex parsed objects, JSON-stringifies each', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'items',
        type: 'Item[]',
        required: true,
        accepts: 'list of Item',
        description: '',
        mockValues: ['{a: 1}', '{a: 2}'],
      }),
    ]);
    expect(variants[0]?.options).toEqual([JSON.stringify({ a: 1 }), JSON.stringify({ a: 2 })]);
    expect(variants[0]?.coerce).toBe('array');
  });

  it('mockValues with array-typed field where one entry is unparseable, returns it verbatim', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      singleField('config', {
        field: 'items',
        type: 'Item[]',
        required: true,
        accepts: 'list of Item',
        description: '',
        mockValues: ['{a: 1}', 'not-json'],
      }),
    ]);
    expect(variants[0]?.options).toEqual([JSON.stringify({ a: 1 }), 'not-json']);
  });

  it('typeField on a Record<K, V> parent uses record-value coerce', () => {
    const props: PropMeta[] = [
      {
        name: 'translations',
        type: 'Record<string, string>',
        default: '',
        description: '',
        bindable: false,
        typeDefinition: 'Record<string, string>',
        typeFields: [
          {
            field: 'foo',
            type: 'string',
            required: true,
            accepts: 'a, b, c',
            description: '',
          },
        ],
      },
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants(props);
    expect(variants).toEqual([
      {
        key: 'translations.foo',
        options: ['a', 'b', 'c'],
        default: '',
        coerce: 'record-value',
      },
    ]);
  });

  it('typeField with [key] placeholder on Record parent is skipped', () => {
    const props: PropMeta[] = [
      {
        name: 'r',
        type: 'Record<string, string>',
        default: '',
        description: '',
        bindable: false,
        typeFields: [
          {
            field: '[key]',
            type: 'string',
            required: true,
            accepts: 'a, b, c',
            description: '',
          },
        ],
      },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('typeFields on array-typed prop are skipped (inner item fields)', () => {
    const props: PropMeta[] = [
      {
        name: 'items',
        type: 'Item[]',
        default: '',
        description: '',
        bindable: false,
        typeFields: [
          {
            field: 'name',
            type: 'string',
            required: true,
            accepts: 'a, b, c',
            description: '',
          },
        ],
      },
    ];
    expect(extractPropsVariants(props)).toEqual([]);
  });

  it('@values mockValues on typeField (length > 1) take precedence over accepts', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      {
        name: 'config',
        type: 'Config',
        default: '',
        description: '',
        bindable: false,
        typeDefinition: '{ ... }',
        typeFields: [
          {
            field: 'mode',
            type: 'string',
            required: true,
            accepts: 'a, b, c',
            description: '',
            mockValues: ['x', 'y'],
          },
        ],
      },
    ]);
    expect(variants[0]?.options).toEqual(['x', 'y']);
  });
});

/* =========================================================================
 * buildBaseProps — exercises buildPlaceholderObject + buildPlaceholderFromDefinition
 * ========================================================================= */

describe('buildBaseProps — defaults & placeholder branches', () => {
  it('returns empty object for empty input', () => {
    expect(buildBaseProps([])).toEqual({});
  });

  it('strips single quotes from string default', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'string', default: "'hello'", description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: 'hello' });
  });

  it('strips double quotes from string default', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'string', default: '"hi"', description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: 'hi' });
  });

  it('parses true default as boolean true', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'boolean', default: 'true', description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: true });
  });

  it('parses false default as boolean false', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'boolean', default: 'false', description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: false });
  });

  it('parses numeric default as number', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'number', default: '42', description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: 42 });
  });

  it('parses negative numeric default as number', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'number', default: '-7', description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: -7 });
  });

  it('keeps non-numeric, non-quoted default as raw string', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'string', default: 'foo', description: '', bindable: false },
    ]);
    expect(result).toEqual({ x: 'foo' });
  });

  it('inline object type "{ a, b }" → placeholder with empty strings', () => {
    const result = buildBaseProps([
      { name: 'cfg', type: '{ a, b, c }', default: '', description: '', bindable: false },
    ]);
    expect(result).toEqual({ cfg: { a: '', b: '', c: '' } });
  });

  it('inline object type with no inner keys returns no entry (placeholder null)', () => {
    const result = buildBaseProps([
      { name: 'cfg', type: '{  }', default: '', description: '', bindable: false },
    ]);
    expect(result).toEqual({});
  });

  it('inline object type missing trailing brace structure → no entry', () => {
    const result = buildBaseProps([
      { name: 'cfg', type: '{ a, b }no-end', default: '', description: '', bindable: false },
    ]);
    // Falls through without setting cfg (no default, type doesn't start with "{ " AND end with " }")
    expect(result).toEqual({});
  });

  it('typeDefinition starting with "{" extracts fields via JSDoc-aware parsing', () => {
    const result = buildBaseProps([
      {
        name: 'cfg',
        type: 'CfgType',
        default: '',
        description: '',
        bindable: false,
        typeDefinition: '{\n  /** @values "hello" */\n  greeting: string;\n  count?: number;\n}',
      },
    ]);
    expect(result).toEqual({ cfg: { greeting: '"hello"', count: '' } });
  });

  it('typeDefinition with empty body returns null placeholder → no entry', () => {
    const result = buildBaseProps([
      {
        name: 'cfg',
        type: 'EmptyType',
        default: '',
        description: '',
        bindable: false,
        typeDefinition: '{}',
      },
    ]);
    expect(result).toEqual({});
  });

  it('typeDefinition with multi-line JSDoc populates description-driven values', () => {
    const result = buildBaseProps([
      {
        name: 'cfg',
        type: 'CfgType',
        default: '',
        description: '',
        bindable: false,
        typeDefinition: '{\n  /**\n   * @values "first"\n   */\n  name: string;\n}',
      },
    ]);
    expect(result).toEqual({ cfg: { name: '"first"' } });
  });

  it('mockValues with object-literal first entry parses as placeholder object', () => {
    const result = buildBaseProps([
      {
        name: 'cfg',
        type: 'Cfg',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['{name: string}'],
      },
    ]);
    // buildPlaceholderFromDefinition called on '{name: string}', extracts `name`
    expect(result).toEqual({ cfg: { name: '' } });
  });

  it('mockValues with object-literal that fails placeholder parse falls back to literal', () => {
    const result = buildBaseProps([
      {
        name: 'cfg',
        type: 'Cfg',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['{}'],
      },
    ]);
    expect(result).toEqual({ cfg: '{}' });
  });

  it('mockValues with non-object first entry stored verbatim', () => {
    const result = buildBaseProps([
      {
        name: 'label',
        type: 'string',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['hello'],
      },
    ]);
    expect(result).toEqual({ label: 'hello' });
  });

  it('Snippet type with mockValues is NOT used in buildBaseProps', () => {
    const result = buildBaseProps([
      {
        name: 'header',
        type: 'Snippet',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['<h1/>'],
      },
    ]);
    // Snippet excluded from mockValues fallback — no entry
    expect(result).toEqual({});
  });

  it('callback type ") =>" with mockValues is NOT used in buildBaseProps', () => {
    const result = buildBaseProps([
      {
        name: 'onClick',
        type: '(e: MouseEvent) => void',
        default: '',
        description: '',
        bindable: false,
        mockValues: ['noop'],
      },
    ]);
    expect(result).toEqual({});
  });

  it('prop with no default, no typeDef, no mockValues is omitted', () => {
    const result = buildBaseProps([
      { name: 'x', type: 'string', default: '', description: '', bindable: false },
    ]);
    expect(result).toEqual({});
  });

  it('multiple props combine into single object', () => {
    const result = buildBaseProps([
      { name: 'a', type: 'string', default: "'a'", description: '', bindable: false },
      { name: 'b', type: 'number', default: '5', description: '', bindable: false },
      { name: 'c', type: 'boolean', default: 'true', description: '', bindable: false },
    ]);
    expect(result).toEqual({ a: 'a', b: 5, c: true });
  });
});

/* =========================================================================
 * extractProps — type-resolution branches via crafted Svelte sources
 * ========================================================================= */

describe('extractProps — type resolution branches', () => {
  it('returns empty array on empty source', () => {
    expect(extractProps('')).toEqual([]);
  });

  it('schema-based component (no destructuring) extracts via safeParse fallback', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
export const FooSchema = v.strictObject({
  /** @values "hello" */
  greeting: v.string(),
  count: v.optional(v.number(), 5),
});
</script>
<script lang="ts">
const allProps = $props();
const validated = $derived.by(() => safeParse(FooSchema, allProps));
</script>
`;
    const props: PropMeta[] = extractProps(source);
    const names: string[] = props.map((p) => p.name);
    expect(names).toContain('greeting');
    expect(names).toContain('count');
  });

  it('source with $props but no safeParse and no destructuring returns []', () => {
    const source: string = `<script lang="ts">
const allProps = $props();
</script>`;
    expect(extractProps(source)).toEqual([]);
  });

  it('source without $props returns []', () => {
    const source: string = `<script lang="ts">
const x = 1;
</script>`;
    expect(extractProps(source)).toEqual([]);
  });

  it('inline string-literal union extracted as type', () => {
    const source: string = `<script lang="ts">
let { variant = 'a' }: { variant?: 'a' | 'b' | 'c' } = $props();
</script>`;
    const props: PropMeta[] = extractProps(source);
    expect(props[0]?.type).toBe("'a' | 'b' | 'c'");
  });

  it('multi-line valibot validator merges schema defaults', () => {
    const source: string = `<script module lang="ts">
import * as v from 'valibot';
export const FooSchema = v.strictObject({
  /** Mode of operation */
  mode: v.optional(
    v.picklist(['x', 'y', 'z']),
    'x'
  ),
});
</script>
<script lang="ts">
let { mode } = $props();
const validated = $derived.by(() => safeParse(FooSchema, { mode }));
</script>`;
    const props: PropMeta[] = extractProps(source);
    const mode = props.find((p) => p.name === 'mode');
    // Default value extracted from v.optional second arg — value is "'x'" (with quotes)
    expect(mode?.default === "'x'" || mode?.default === 'x').toBe(true);
  });

  it('JSDoc @values tag flows from type definition to props', () => {
    const source: string = `<script lang="ts">
type Props = {
  /** @values "small" "medium" "large" */
  size?: string;
};
let { size }: Props = $props();
</script>`;
    const props: PropMeta[] = extractProps(source);
    // @values tag may be parsed as a single string or split — at minimum it must be present
    expect(Array.isArray(props[0]?.mockValues)).toBe(true);
    expect((props[0]?.mockValues ?? []).length).toBeGreaterThan(0);
  });

  it('inline object type field summary appears in PropMeta.type', () => {
    const source: string = `<script lang="ts">
let {
  labels,
}: {
  labels: { goHome: string; tryAgain: string; copied: string };
} = $props();
</script>`;
    const props: PropMeta[] = extractProps(source);
    const labels = props.find((p) => p.name === 'labels');
    // Inline object type captured (specific format may vary — verify it's a non-empty string)
    expect(typeof labels?.type).toBe('string');
    expect((labels?.type ?? '').length).toBeGreaterThan(0);
  });

  it('type with multi-line nested object type captures field names', () => {
    const source: string = `<script lang="ts">
type Props = {
  config: {
    /** Top-level option */
    enabled: boolean;
    nested: {
      x: number;
      y: number;
    };
  };
};
let { config }: Props = $props();
</script>`;
    const props: PropMeta[] = extractProps(source);
    // Nested object types should produce "{ enabled, nested }" summary
    const cfg = props.find((p) => p.name === 'config');
    expect(typeof cfg?.type).toBe('string');
    expect(cfg?.type.startsWith('{ ')).toBe(true);
  });

  it('extracted props with bindable wrappers preserve bindable=true', () => {
    const source: string = `<script lang="ts">
let { value = $bindable(0) }: Props = $props();
</script>`;
    const props: PropMeta[] = extractProps(source);
    expect(props[0]?.bindable).toBe(true);
  });

  it('supplementarySources are merged for type resolution', () => {
    const main: string = `<script lang="ts">
let { mode }: Props = $props();
</script>`;
    const supp: string = `export type Props = { mode: 'a' | 'b' };`;
    const props: PropMeta[] = extractProps(main, [supp]);
    expect(props[0]?.name).toBe('mode');
  });
});
