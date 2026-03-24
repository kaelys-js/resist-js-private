import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createLocaleRegistry } from './registry';
import { createLocaleStore } from './svelte.svelte';

// =============================================================================
// Test schemas and locale strings
// =============================================================================

const TestSchema = v.strictObject({
  greeting: v.string(),
  farewell: v.string(),
});

const en = { greeting: 'Hello', farewell: 'Goodbye' };
const es = { greeting: 'Hola', farewell: 'Adiós' };
const ja = { greeting: 'こんにちは', farewell: 'さようなら' };

function makeRegistry() {
  const result = createLocaleRegistry({
    schema: TestSchema,
    defaultLocale: 'en',
    locales: { en, es, ja },
  });
  if (!result.ok) {
    throw new Error('Registry creation failed');
  }
  return result.data;
}

// =============================================================================
// createLocaleStore
// =============================================================================

describe('createLocaleStore', () => {
  it('returns ok with valid registry', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    expect(result.ok).toBe(true);
  });

  it('store.locale returns active locale code', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }
    expect(result.data.locale).toBe('en');
  });

  it('store.t returns built strings object', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }
    expect(result.data.t).toBeDefined();
    expect(typeof result.data.t).toBe('object');
  });

  it('store.setLocale switches locale', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const setResult = result.data.setLocale('es');
    expect(setResult.ok).toBe(true);
    expect(result.data.locale).toBe('es');
  });

  it('store.setLocale returns error for unknown locale', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const setResult = result.data.setLocale('fr');
    expect(setResult.ok).toBe(false);
    // Locale should remain unchanged
    expect(result.data.locale).toBe('en');
  });

  it('store.list returns available locale codes', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const listResult = result.data.list();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.data).toContain('en');
      expect(listResult.data).toContain('es');
      expect(listResult.data).toContain('ja');
    }
  });

  it('store.has returns true for existing locale', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const hasResult = result.data.has('es');
    expect(hasResult.ok).toBe(true);
    if (hasResult.ok) {
      expect(hasResult.data).toBe(true);
    }
  });

  it('store.has returns false for missing locale', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const hasResult = result.data.has('fr');
    expect(hasResult.ok).toBe(true);
    if (hasResult.ok) {
      expect(hasResult.data).toBe(false);
    }
  });

  it('store.set adds a locale', () => {
    const registry = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!registry.ok) {
      throw new Error('setup failed');
    }

    const storeResult = createLocaleStore(registry.data);
    if (!storeResult.ok) {
      throw new Error('setup failed');
    }

    const setResult = storeResult.data.set('es', es);
    expect(setResult.ok).toBe(true);

    const hasResult = storeResult.data.has('es');
    if (hasResult.ok) {
      expect(hasResult.data).toBe(true);
    }
  });

  it('store.remove removes a non-active locale', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const removeResult = result.data.remove('ja');
    expect(removeResult.ok).toBe(true);

    const hasResult = result.data.has('ja');
    if (hasResult.ok) {
      expect(hasResult.data).toBe(false);
    }
  });

  it('store.remove rejects removing active locale', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    const removeResult = result.data.remove('en');
    expect(removeResult.ok).toBe(false);
  });
});
