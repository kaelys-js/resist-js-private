/**
 * Tests for iOS safe area inset lookup and measurement.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { getStaticSafeAreaInsets, buildSafeAreaScript } from './ios-safe-area';

describe('ios-safe-area', () => {
  describe('getStaticSafeAreaInsets', () => {
    it('returns known insets for iPhone 16 Pro', () => {
      const insets = getStaticSafeAreaInsets('iPhone 16 Pro' as Str);
      expect(insets).not.toBeNull();
      expect(insets?.top).toBeGreaterThan(0);
      expect(insets?.bottom).toBeGreaterThan(0);
    });

    it('returns known insets for iPhone SE', () => {
      const insets = getStaticSafeAreaInsets('iPhone SE' as Str);
      expect(insets).not.toBeNull();
      expect(insets?.top).toBeGreaterThan(0);
    });

    it('returns null for unknown device', () => {
      const insets = getStaticSafeAreaInsets('Galaxy S99' as Str);
      expect(insets).toBeNull();
    });

    it('matches case-insensitively via substring', () => {
      const insets = getStaticSafeAreaInsets('iphone 16 pro max' as Str);
      expect(insets).not.toBeNull();
    });
  });

  describe('buildSafeAreaScript', () => {
    it('returns valid JavaScript expression', () => {
      const script: Str = buildSafeAreaScript();
      expect(script).toContain('getComputedStyle');
      expect(script).toContain('safe-area-inset-top');
      expect(script).toContain('JSON.stringify');
    });
  });
});
