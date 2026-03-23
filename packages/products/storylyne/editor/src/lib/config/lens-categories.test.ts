/**
 * Tests for lens category configuration.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';
import {
  CATEGORY_ORDER,
  CATEGORY_COLORS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_BG_HOVER,
  CATEGORY_BG,
  categoryLabel,
  LENS_RULE_NAMES,
} from './lens-categories';

describe('CATEGORY_ORDER', () => {
  it('contains all expected categories', () => {
    expect(CATEGORY_ORDER.length).toBeGreaterThan(20);
    expect(CATEGORY_ORDER).toContain('a11y');
    expect(CATEGORY_ORDER).toContain('form');
    expect(CATEGORY_ORDER).toContain('navigation');
    expect(CATEGORY_ORDER).toContain('utility');
  });
});

describe('category maps', () => {
  it('CATEGORY_COLORS has an entry for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_COLORS[cat], `Missing color for '${cat}'`).toBeDefined();
    }
  });

  it('CATEGORY_DESCRIPTIONS has an entry for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_DESCRIPTIONS[cat], `Missing description for '${cat}'`).toBeDefined();
    }
  });

  it('CATEGORY_BG_HOVER has an entry for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_BG_HOVER[cat], `Missing bg hover for '${cat}'`).toBeDefined();
    }
  });

  it('CATEGORY_BG has an entry for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_BG[cat], `Missing bg for '${cat}'`).toBeDefined();
    }
  });
});

describe('categoryLabel', () => {
  it('converts kebab-case to Title Case', () => {
    expect(categoryLabel('data-display')).toBe('Data Display');
    expect(categoryLabel('a11y')).toBe('A11y');
    expect(categoryLabel('form')).toBe('Form');
    expect(categoryLabel('date-time')).toBe('Date Time');
  });
});

describe('LENS_RULE_NAMES', () => {
  it('has at least 18 entries (R0–R17+)', () => {
    expect(LENS_RULE_NAMES.length).toBeGreaterThanOrEqual(18);
  });

  it('each entry is a non-empty string', () => {
    for (const name of LENS_RULE_NAMES) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
