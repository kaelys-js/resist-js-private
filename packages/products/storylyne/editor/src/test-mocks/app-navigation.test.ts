/**
 * Tests for the `$app/navigation` mock module.
 *
 * The mocks are intentional no-ops — these tests exist to:
 * 1. Verify each export is callable with the expected signature
 * 2. Ensure each mock returns `undefined` (or resolves to `undefined`)
 * 3. Cover the structural shape so coverage reflects the test-double's surface
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import {
  afterNavigate,
  beforeNavigate,
  goto,
  invalidate,
  invalidateAll,
  onNavigate,
  pushState,
  replaceState,
} from './app-navigation';

describe('app-navigation mock', () => {
  it('goto resolves to undefined for string URL', async (): Promise<void> => {
    const result = await goto('/some/path');
    expect(result).toBeUndefined();
  });

  it('goto resolves to undefined for URL instance with options', async (): Promise<void> => {
    const result = await goto(new URL('https://example.com/x'), { replaceState: true });
    expect(result).toBeUndefined();
  });

  it('invalidate resolves to undefined for string resource', async (): Promise<void> => {
    const result = await invalidate('app:user');
    expect(result).toBeUndefined();
  });

  it('invalidate resolves to undefined for URL resource', async (): Promise<void> => {
    const result = await invalidate(new URL('https://example.com/api'));
    expect(result).toBeUndefined();
  });

  it('invalidate resolves to undefined for predicate resource', async (): Promise<void> => {
    const result = await invalidate(() => true);
    expect(result).toBeUndefined();
  });

  it('invalidateAll resolves to undefined', async (): Promise<void> => {
    const result = await invalidateAll();
    expect(result).toBeUndefined();
  });

  it('beforeNavigate returns undefined and accepts a callback', () => {
    const result = beforeNavigate(() => undefined);
    expect(result).toBeUndefined();
  });

  it('afterNavigate returns undefined and accepts a callback', () => {
    const result = afterNavigate(() => undefined);
    expect(result).toBeUndefined();
  });

  it('onNavigate returns undefined and accepts a callback', () => {
    const result = onNavigate(() => undefined);
    expect(result).toBeUndefined();
  });

  it('pushState returns undefined for string URL + state', () => {
    const result = pushState('/path', { foo: 'bar' });
    expect(result).toBeUndefined();
  });

  it('replaceState returns undefined for URL + state', () => {
    const result = replaceState(new URL('https://example.com/y'), { baz: 1 });
    expect(result).toBeUndefined();
  });
});
