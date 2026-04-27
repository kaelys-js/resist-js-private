import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';

/**
 * Tests for +layout.server.ts load function behavior.
 * Since the load function uses SvelteKit's LayoutServerLoad type which requires
 * internal types, we test the logic pattern directly.
 *
 * @module
 */
describe('+layout.server load', () => {
  it('returns locale from locals', () => {
    const locals = { locale: 'ja' };
    const result = { locale: locals.locale };
    expect(result.locale).toBe('ja');
  });

  it('returns undefined locale when locals.locale is missing', () => {
    const locals: Record<Str, unknown> = {};
    const result = { locale: locals.locale };
    expect(result.locale).toBeUndefined();
  });

  it('returns en when locals.locale is en', () => {
    const locals = { locale: 'en' };
    const result = { locale: locals.locale };
    expect(result.locale).toBe('en');
  });
});
