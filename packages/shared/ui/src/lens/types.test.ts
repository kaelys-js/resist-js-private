/**
 * Tests for types.ts — Valibot schema validation for Lens metadata types.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import {
  TypeFieldSchema,
  PropMetaSchema,
  VariantKeyMetaSchema,
  VariantMetaSchema,
  LensExampleSchema,
  LensCategorySchema,
  LensStatusSchema,
  BreakingChangeSchema,
  LensMetaSchema,
  CategoryGroupSchema,
} from './types.js';

describe('TypeFieldSchema', () => {
  it('validates a complete TypeField', () => {
    const result = v.safeParse(TypeFieldSchema, {
      field: 'category',
      type: 'Str',
      required: true,
      accepts: 'text',
      description: 'The category name.',
    });
    expect(result.success).toBe(true);
  });

  it('validates TypeField with optional mockValues', () => {
    const result = v.safeParse(TypeFieldSchema, {
      field: 'tags',
      type: 'Str[]',
      required: false,
      accepts: 'list of text',
      description: 'Tag list.',
      mockValues: ['a', 'b'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.mockValues).toEqual(['a', 'b']);
    }
  });

  it('validates recursive typeFields', () => {
    const result = v.safeParse(TypeFieldSchema, {
      field: 'items',
      type: 'Item[]',
      required: true,
      accepts: 'list of items',
      description: 'Nested items.',
      typeFields: [
        {
          field: 'id',
          type: 'Str',
          required: true,
          accepts: 'text',
          description: 'Item ID.',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.typeFields).toHaveLength(1);
      expect(result.output.typeFields![0]!.field).toBe('id');
    }
  });

  it('rejects TypeField missing required fields', () => {
    const result = v.safeParse(TypeFieldSchema, {
      field: 'test',
      type: 'Str',
      // missing required, accepts, description
    });
    expect(result.success).toBe(false);
  });
});

describe('PropMetaSchema', () => {
  it('validates minimal PropMeta', () => {
    const result = v.safeParse(PropMetaSchema, {
      name: 'variant',
      type: "'default' | 'secondary'",
      default: "'default'",
      description: 'The visual style.',
      bindable: false,
    });
    expect(result.success).toBe(true);
  });

  it('validates PropMeta with all optional fields', () => {
    const result = v.safeParse(PropMetaSchema, {
      name: 'size',
      type: 'Str',
      default: '',
      description: 'Size variant.',
      bindable: true,
      typeDefinition: "'sm' | 'md' | 'lg'",
      typeFields: [
        { field: 'x', type: 'Num', required: true, accepts: 'number', description: 'X value.' },
      ],
      mockValues: ['sm', 'md', 'lg'],
      requires: [{ prop: 'variant', value: 'bordered' }],
      optional: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects PropMeta missing name', () => {
    const result = v.safeParse(PropMetaSchema, {
      type: 'string',
      default: '',
      description: '',
      bindable: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('VariantKeyMetaSchema', () => {
  it('validates basic variant key', () => {
    const result = v.safeParse(VariantKeyMetaSchema, {
      key: 'variant',
      options: ['default', 'secondary'],
      default: 'default',
    });
    expect(result.success).toBe(true);
  });

  it('validates variant key with coerce', () => {
    const result = v.safeParse(VariantKeyMetaSchema, {
      key: 'tags',
      options: ['a', 'b'],
      default: '',
      coerce: 'array',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.coerce).toBe('array');
    }
  });

  it('validates variant key with record-value coerce', () => {
    const result = v.safeParse(VariantKeyMetaSchema, {
      key: 'config.size',
      options: ['sm', 'md'],
      default: '',
      coerce: 'record-value',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid coerce value', () => {
    const result = v.safeParse(VariantKeyMetaSchema, {
      key: 'x',
      options: ['a'],
      default: '',
      coerce: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('validates variant key with requires', () => {
    const result = v.safeParse(VariantKeyMetaSchema, {
      key: 'radius',
      options: ['none', 'sm', 'md'],
      default: 'md',
      requires: [{ prop: 'variant', value: 'bordered' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.requires).toHaveLength(1);
    }
  });
});

describe('VariantMetaSchema', () => {
  it('validates with variants array', () => {
    const result = v.safeParse(VariantMetaSchema, {
      variants: [{ key: 'size', options: ['sm', 'lg'], default: 'sm' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('LensExampleSchema', () => {
  it('validates example with all fields', () => {
    const result = v.safeParse(LensExampleSchema, {
      name: 'basic',
      title: 'Basic Dialog',
      description: 'A simple dialog.',
    });
    expect(result.success).toBe(true);
  });

  it('uses empty string default for description', () => {
    const result = v.safeParse(LensExampleSchema, {
      name: 'basic',
      title: 'Basic',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.description).toBe('');
    }
  });
});

describe('LensCategorySchema', () => {
  it('accepts all 28 valid categories', () => {
    const validCategories: string[] = [
      'a11y', 'admin', 'animation', 'commerce', 'content', 'data-display',
      'date-time', 'desktop', 'devtools', 'disclosure', 'display', 'education',
      'feedback', 'finance', 'form', 'gaming', 'healthcare', 'iot', 'layout',
      'legal', 'lens', 'maps', 'marketing', 'media', 'mobile', 'navigation',
      'overlay', 'scheduling', 'social', 'typography', 'utility',
    ];
    for (const cat of validCategories) {
      const result = v.safeParse(LensCategorySchema, cat);
      expect(result.success, `Category "${cat}" should be valid`).toBe(true);
    }
  });

  it('rejects invalid category', () => {
    const result = v.safeParse(LensCategorySchema, 'invalid-category');
    expect(result.success).toBe(false);
  });
});

describe('LensStatusSchema', () => {
  it('accepts all 4 valid statuses', () => {
    for (const status of ['new', 'updated', 'deprecated', 'placeholder']) {
      const result = v.safeParse(LensStatusSchema, status);
      expect(result.success, `Status "${status}" should be valid`).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = v.safeParse(LensStatusSchema, 'beta');
    expect(result.success).toBe(false);
  });
});

describe('BreakingChangeSchema', () => {
  it('validates with all fields', () => {
    const result = v.safeParse(BreakingChangeSchema, {
      change: 'Removed size prop',
      migration: 'Use dimensions prop instead',
      since: 'v2.0.0',
    });
    expect(result.success).toBe(true);
  });

  it('validates with only required field', () => {
    const result = v.safeParse(BreakingChangeSchema, {
      change: 'Renamed onClick to onPress',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.migration).toBeUndefined();
      expect(result.output.since).toBeUndefined();
    }
  });
});

describe('LensMetaSchema', () => {
  it('validates complete LensMeta', () => {
    const result = v.safeParse(LensMetaSchema, {
      category: 'form',
      tags: ['shadcn', 'tv-variant'],
      description: 'A button component.',
      status: 'new',
      breakingChanges: [{ change: 'Renamed prop' }],
      defaultLabel: 'Click me',
      childComponent: 'button',
    });
    expect(result.success).toBe(true);
  });

  it('validates minimal LensMeta', () => {
    const result = v.safeParse(LensMetaSchema, {
      category: 'layout',
      tags: ['grid'],
      description: 'A grid layout.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty tags array (minLength 1)', () => {
    const result = v.safeParse(LensMetaSchema, {
      category: 'form',
      tags: [],
      description: 'Test.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = v.safeParse(LensMetaSchema, {
      category: 'nonexistent',
      tags: ['x'],
      description: 'Test.',
    });
    expect(result.success).toBe(false);
  });
});

describe('CategoryGroupSchema', () => {
  it('validates a category group', () => {
    const result = v.safeParse(CategoryGroupSchema, {
      name: 'form',
      label: 'Form',
      components: ['button', 'input', 'select'],
    });
    expect(result.success).toBe(true);
  });

  it('validates with empty components array', () => {
    const result = v.safeParse(CategoryGroupSchema, {
      name: 'empty',
      label: 'Empty',
      components: [],
    });
    expect(result.success).toBe(true);
  });
});
