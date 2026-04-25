/**
 * Branch-coverage tests for the public helpers `extractDescription`,
 * `extractPropsVariants`, and `buildBaseProps` that aren't exercised by
 * `extract-props.test.ts` (which focuses on the `extractProps` entry point).
 *
 * Each test hits a specific branch of the helper's decision tree with a
 * crafted minimal input and asserts the result exactly (not "truthy").
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { extractDescription, extractPropsVariants, buildBaseProps } from './extract-props.js';
import type { PropMeta, VariantKeyMeta, TypeField } from './types.js';

/* ------------------------------------------------------------------ */
/*  extractDescription                                                 */
/* ------------------------------------------------------------------ */

describe('extractDescription', () => {
  it('returns empty string for empty source', () => {
    expect(extractDescription('')).toBe('');
  });

  it('returns empty string when no instance <script lang="ts"> is found', () => {
    expect(extractDescription('<div>no script</div>')).toBe('');
  });

  it('returns empty string when the script block has no JSDoc', () => {
    const src: string = `<script lang="ts">
      const x = 1;
    </script>`;
    expect(extractDescription(src)).toBe('');
  });

  it('extracts first paragraph and stops at @tag', () => {
    const src: string = `<script lang="ts">
      /**
       * First sentence.
       * Second sentence.
       * @param x - Ignored
       */
      export const x = 1;
    </script>`;
    expect(extractDescription(src)).toBe('First sentence. Second sentence.');
  });

  it('stops at blank line after the first paragraph', () => {
    const src: string = `<script lang="ts">
      /**
       * Line one.
       *
       * Line two (should be ignored).
       */
    </script>`;
    expect(extractDescription(src)).toBe('Line one.');
  });

  it('ignores leading blank lines before the first non-empty description line', () => {
    const src: string = `<script lang="ts">
      /**
       *
       * Only line.
       */
    </script>`;
    expect(extractDescription(src)).toBe('Only line.');
  });
});

/* ------------------------------------------------------------------ */
/*  extractPropsVariants                                               */
/* ------------------------------------------------------------------ */

/** Build a minimal PropMeta with only the fields a given branch needs. */
function mkProp(over: Partial<PropMeta>): PropMeta {
  return {
    name: 'p',
    type: 'string',
    default: '',
    description: '',
    bindable: false,
    ...over,
  };
}

describe('extractPropsVariants', () => {
  it('skips props with an empty type', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([mkProp({ type: '' })]);
    expect(variants).toEqual([]);
  });

  it('@values mockValues with length > 1 take highest priority (array-typed gets coerce=array)', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'tags', type: 'string[]', mockValues: ['a', 'b'] }),
    ]);
    expect(variants).toHaveLength(1);
    expect(variants[0]).toEqual({
      key: 'tags',
      options: ['a', 'b'],
      default: '',
      coerce: 'array',
      requires: undefined,
    });
  });

  it('@values length=1 on Snippet type generates a single-option variant', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'slot', type: 'Snippet', mockValues: ['hello'] }),
    ]);
    expect(variants).toEqual([
      { key: 'slot', options: ['hello'], default: '', requires: undefined },
    ]);
  });

  it('Snippet without @values is skipped entirely', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'slot', type: 'Snippet' }),
    ]);
    expect(variants).toEqual([]);
  });

  it('boolean type produces true/false options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'open', type: 'boolean', default: 'true' }),
    ]);
    expect(variants).toEqual([
      { key: 'open', options: ['true', 'false'], default: 'true', requires: undefined },
    ]);
  });

  it('Bool alias produces true/false options', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'active', type: 'Bool' }),
    ]);
    expect(variants[0]?.options).toEqual(['true', 'false']);
  });

  it('number type with integer default generates scaled integer variants', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'size', type: 'number', default: '10' }),
    ]);
    expect(variants[0]?.options).toEqual(['5', '10', '15', '20']);
  });

  it('number type with fractional default generates scaled fractional variants', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'ratio', type: 'number', default: '0.5' }),
    ]);
    expect(variants[0]?.options).toEqual(['0.25', '0.5', '0.75', '1']);
  });

  it('number type with zero default → no variant generated (numDefault > 0 check)', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'z', type: 'number', default: '0' }),
    ]);
    expect(variants).toEqual([]);
  });

  it('number type without default → no variant (NaN check)', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([mkProp({ name: 'z', type: 'Num' })]);
    expect(variants).toEqual([]);
  });

  it('inline union of string literals produces options array', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'variant', type: "'primary' | 'secondary' | 'ghost'", default: "'primary'" }),
    ]);
    expect(variants[0]?.options).toEqual(['primary', 'secondary', 'ghost']);
    expect(variants[0]?.default).toBe('primary');
  });

  it('inline union with only one literal does not produce variants', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'x', type: "'only' | string" }),
    ]);
    /* parseStringLiteralUnion returns null if not all members are string literals. */
    expect(variants).toEqual([]);
  });

  it('typeDefinition fallback union produces variants', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({
        name: 'size',
        type: 'Size',
        typeDefinition: "'sm' | 'md' | 'lg'",
      }),
    ]);
    expect(variants[0]?.options).toEqual(['sm', 'md', 'lg']);
  });

  it('requires entries with length > 0 are forwarded onto the variant', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({
        name: 'x',
        type: 'boolean',
        requires: [{ prop: 'y', value: 'true' }],
      }),
    ]);
    expect(variants[0]?.requires).toEqual([{ prop: 'y', value: 'true' }]);
  });

  it('empty requires array is normalized to undefined on the variant', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'x', type: 'boolean', requires: [] }),
    ]);
    expect(variants[0]?.requires).toBeUndefined();
  });

  it('typeFields: boolean sub-field generates true/false variant', () => {
    const typeFields: TypeField[] = [
      {
        field: 'enabled',
        accepts: 'true / false',
        type: 'boolean' as const,
      } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields }),
    ]);
    const sub = variants.find((v) => v.key === 'opts.enabled');
    expect(sub?.options).toEqual(['true', 'false']);
  });

  it('typeFields: number sub-field generates example number variants', () => {
    const typeFields: TypeField[] = [
      { field: 'count', accepts: 'number', type: 'number' as const } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields }),
    ]);
    const sub = variants.find((v) => v.key === 'opts.count');
    expect(sub?.options).toEqual(['0', '1', '5', '10']);
  });

  it('typeFields: text sub-field generates example text variants', () => {
    const typeFields: TypeField[] = [
      { field: 'label', accepts: 'text', type: 'string' as const } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields }),
    ]);
    const sub = variants.find((v) => v.key === 'opts.label');
    expect(sub?.options).toEqual([
      'Short',
      'A medium example',
      'A longer example text for testing',
    ]);
  });

  it('typeFields: picklist accepts (comma-separated) produces explicit options', () => {
    const typeFields: TypeField[] = [
      {
        field: 'color',
        accepts: 'red, green, blue',
        type: 'string' as const,
      } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields }),
    ]);
    const sub = variants.find((v) => v.key === 'opts.color');
    expect(sub?.options).toEqual(['red', 'green', 'blue']);
  });

  it('typeFields: list of text generates simple array variants with coerce=array', () => {
    const typeFields: TypeField[] = [
      { field: 'tags', accepts: 'list of text', type: 'string[]' as const } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields }),
    ]);
    const sub = variants.find((v) => v.key === 'opts.tags');
    expect(sub?.options).toEqual(['one', 'one, two', 'one, two, three']);
    expect(sub?.coerce).toBe('array');
  });

  it('typeFields: list of complex type with no mockValues produces empty options', () => {
    const typeFields: TypeField[] = [
      {
        field: 'items',
        accepts: 'list of object',
        type: 'Item[]' as const,
      } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields }),
    ]);
    /* Empty options → filtered out (options.length > 1 gate). */
    expect(variants.find((v) => v.key === 'opts.items')).toBeUndefined();
  });

  it('array-typed prop with typeFields does not generate dotted sub-variants', () => {
    const typeFields: TypeField[] = [
      { field: 'inner', accepts: 'text', type: 'string' as const } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'list', type: 'Item[]', typeFields }),
    ]);
    expect(variants.filter((v) => v.key.startsWith('list.'))).toEqual([]);
  });

  it('Record<K,V>-parent typeFields marks sub-variant with coerce=record-value', () => {
    const typeFields: TypeField[] = [
      { field: 'name', accepts: 'text', type: 'string' as const } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'map', type: 'Record<string, Value>', typeFields }),
    ]);
    const sub = variants.find((v) => v.key === 'map.name');
    expect(sub?.coerce).toBe('record-value');
  });

  it('Record<K,V>-parent skips the [key] placeholder typeField', () => {
    const typeFields: TypeField[] = [
      { field: '[key]', accepts: 'text', type: 'string' as const } as unknown as TypeField,
      { field: 'value', accepts: 'text', type: 'string' as const } as unknown as TypeField,
    ];
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'map', type: 'Record<string, Value>', typeFields }),
    ]);
    expect(variants.find((v) => v.key === 'map.[key]')).toBeUndefined();
    expect(variants.find((v) => v.key === 'map.value')).toBeDefined();
  });

  it('typeFields with length 0 is skipped', () => {
    const variants: VariantKeyMeta[] = extractPropsVariants([
      mkProp({ name: 'opts', type: 'Opts', typeFields: [] }),
    ]);
    expect(variants).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  buildBaseProps                                                     */
/* ------------------------------------------------------------------ */

describe('buildBaseProps', () => {
  it('returns an empty object for empty props array', () => {
    expect(buildBaseProps([])).toEqual({});
  });

  it('strips matching single quotes from string defaults', () => {
    expect(buildBaseProps([mkProp({ name: 'v', default: "'hello'", type: 'string' })])).toEqual({
      v: 'hello',
    });
  });

  it('strips matching double quotes from string defaults', () => {
    expect(buildBaseProps([mkProp({ name: 'v', default: '"hi"', type: 'string' })])).toEqual({
      v: 'hi',
    });
  });

  it('parses "true" default into the boolean true', () => {
    const result: Record<string, unknown> = buildBaseProps([
      mkProp({ name: 'open', default: 'true', type: 'boolean' }),
    ]);
    expect(result).toEqual({ open: true });
  });

  it('parses "false" default into the boolean false', () => {
    const result: Record<string, unknown> = buildBaseProps([
      mkProp({ name: 'open', default: 'false', type: 'boolean' }),
    ]);
    expect(result).toEqual({ open: false });
  });
});
