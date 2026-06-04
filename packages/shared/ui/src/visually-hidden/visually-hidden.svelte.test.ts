/**
 * @module
 *
 * Unit tests for the VisuallyHidden component schema, variants, and exports.
 *
 * Tests schema validation, tv() variant output, focusable behavior,
 * polymorphic element support, and Lens compliance.
 */
import { describe, expect, it } from 'vitest';
import type { Bool, Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';

import {
  VisuallyHiddenPropsSchema,
  type VisuallyHiddenInputProps,
  type VisuallyHiddenProps,
  visuallyHiddenVariants,
} from './VisuallyHidden.svelte';
import { meta } from './lens.js';

// =============================================================================
// Schema validation
// =============================================================================
describe('VisuallyHiddenPropsSchema', () => {
  it('accepts empty props and fills defaults', () => {
    const result = safeParse(VisuallyHiddenPropsSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.as).toBe('span' as Str);
    expect(result.data.focusable).toBe(false as Bool);
  });

  it('accepts valid "as" values', () => {
    const validElements: Str[] = [
      'span' as Str,
      'div' as Str,
      'h1' as Str,
      'h2' as Str,
      'h3' as Str,
      'h4' as Str,
      'h5' as Str,
      'h6' as Str,
      'p' as Str,
      'label' as Str,
      'a' as Str,
    ];

    for (const el of validElements) {
      const result = safeParse(VisuallyHiddenPropsSchema, { as: el });
      expect(result.ok, `as="${el}" should be valid`).toBe(true);
    }
  });

  it('rejects invalid "as" values', () => {
    const result = safeParse(VisuallyHiddenPropsSchema, {
      as: 'table' as Str,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts focusable=true', () => {
    const result = safeParse(VisuallyHiddenPropsSchema, {
      focusable: true as Bool,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.focusable).toBe(true as Bool);
  });

  it('accepts custom class', () => {
    const result = safeParse(VisuallyHiddenPropsSchema, {
      class: 'my-custom-class' as Str,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.class).toBe('my-custom-class' as Str);
  });

  it('rejects unknown keys via strictObject', () => {
    const result = safeParse(VisuallyHiddenPropsSchema, {
      unknownProp: 'value',
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// tv() variants
// =============================================================================
describe('visuallyHiddenVariants', () => {
  it('returns base hidden classes when focusable is false', () => {
    const classes: Str = visuallyHiddenVariants({ focusable: false }) as Str;
    expect(classes).toContain('absolute');
    expect(classes).toContain('overflow-hidden');
    expect(classes).toContain('whitespace-nowrap');
  });

  it('returns focusable classes when focusable is true', () => {
    const classes: Str = visuallyHiddenVariants({ focusable: true }) as Str;
    expect(classes).toContain('absolute');
    expect(classes).toContain('focus:static');
    expect(classes).toContain('focus:overflow-visible');
  });

  it('default variant is not focusable', () => {
    const classes: Str = visuallyHiddenVariants({}) as Str;
    expect(classes).not.toContain('focus:static');
  });
});

// =============================================================================
// Type exports
// =============================================================================
describe('type exports', () => {
  it('InputProps allows all fields to be optional', () => {
    const empty: VisuallyHiddenInputProps = {};
    expect(empty).toEqual({});
  });

  it('Props has defaults filled in', () => {
    const result = safeParse(VisuallyHiddenPropsSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const props: VisuallyHiddenProps = result.data;
    expect(props.as).toBeDefined();
    expect(props.focusable).toBeDefined();
  });
});

// =============================================================================
// lens.ts metadata
// =============================================================================
describe('lens.ts meta', () => {
  it('has required LensMeta fields', () => {
    expect(meta.category).toBe('a11y');
    expect(meta.tags).toContain('tv-variant');
    expect(meta.tags).toContain('accessibility');
    expect(meta.description).toBeTruthy();
  });
});
