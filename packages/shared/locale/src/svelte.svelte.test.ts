import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createLocaleRegistry, type LocaleRegistry } from './registry';
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

/**
 * Creates a wrapper around a real registry that delegates all methods but allows overrides.
 * Uses a plain object spread (not Proxy) since the frozen registry's properties are functions.
 *
 * @param base
 * @param overrides
 * @returns
 */
function wrapRegistry(
  base: LocaleRegistry<typeof TestSchema>,
  overrides: Partial<LocaleRegistry<typeof TestSchema>>,
): LocaleRegistry<typeof TestSchema> {
  return {
    active: overrides.active ?? ((...a: Parameters<typeof base.active>) => base.active(...a)),
    t: overrides.t ?? ((...a: Parameters<typeof base.t>) => base.t(...a)),
    setActive:
      overrides.setActive ?? ((...a: Parameters<typeof base.setActive>) => base.setActive(...a)),
    list: overrides.list ?? ((...a: Parameters<typeof base.list>) => base.list(...a)),
    has: overrides.has ?? ((...a: Parameters<typeof base.has>) => base.has(...a)),
    set: overrides.set ?? ((...a: Parameters<typeof base.set>) => base.set(...a)),
    get: overrides.get ?? ((...a: Parameters<typeof base.get>) => base.get(...a)),
    remove: overrides.remove ?? ((...a: Parameters<typeof base.remove>) => base.remove(...a)),
  } as LocaleRegistry<typeof TestSchema>;
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

// =============================================================================
// Error-path coverage — mock registries returning {ok: false}
// =============================================================================

/**
 * Helper: creates an error result matching the Result<never> shape.
 *
 * @param code
 * @param message
 * @returns
 */
function fakeErr(code: string, message: string) {
  return {
    ok: false as const,
    data: null,
    error: { code, message },
  };
}

/**
 * Helper: creates an ok result matching the Result<T> shape.
 *
 * @param data
 * @returns
 */
function fakeOk<T>(data: T) {
  return { ok: true as const, data, error: null };
}

describe('createLocaleStore — error paths', () => {
  it('returns error when registry.active() fails (lines 121-122)', () => {
    const mockRegistry = {
      active: () => fakeErr('LOCALE.ACTIVE_FAILED', 'no active locale'),
      t: () => fakeOk({}),
      setActive: () => fakeOk(undefined),
      list: () => fakeOk([]),
      has: () => fakeOk(false),
      set: () => fakeOk(undefined),
      remove: () => fakeOk(undefined),
    } as unknown as LocaleRegistry<typeof TestSchema>;

    const result = createLocaleStore(mockRegistry);
    expect(result.ok).toBe(false);
  });

  it('returns error when registry.t() fails during init (lines 128-129)', () => {
    const mockRegistry = {
      active: () => fakeOk('en'),
      t: () => fakeErr('LOCALE.T_FAILED', 'cannot build strings'),
      setActive: () => fakeOk(undefined),
      list: () => fakeOk([]),
      has: () => fakeOk(false),
      set: () => fakeOk(undefined),
      remove: () => fakeOk(undefined),
    } as unknown as LocaleRegistry<typeof TestSchema>;

    const result = createLocaleStore(mockRegistry);
    expect(result.ok).toBe(false);
  });
});

describe('store.setLocale — error paths', () => {
  it('returns error when safeParse(StrSchema, code) fails (lines 150-151)', () => {
    const registry = makeRegistry();
    const result = createLocaleStore(registry);
    if (!result.ok) {
      throw new Error('setup failed');
    }

    // Pass non-string to trigger safeParse failure
    const setResult = result.data.setLocale(123 as unknown as string);
    expect(setResult.ok).toBe(false);
    // Locale should remain unchanged
    expect(result.data.locale).toBe('en');
  });

  it('returns error when registry.t() fails after setActive (lines 162-163)', () => {
    const realRegistry = makeRegistry();

    // Wrapper: t() succeeds on first call (init), fails on second (setLocale)
    let tCallCount = 0;
    const wrapped = wrapRegistry(realRegistry, {
      t: () => {
        tCallCount++;
        if (tCallCount === 1) {
          // Init call — delegate to real registry
          return realRegistry.t();
        }
        // setLocale call — fail
        return fakeErr('LOCALE.T_FAILED', 'strings rebuild failed');
      },
    } as Partial<LocaleRegistry<typeof TestSchema>>);

    const storeResult = createLocaleStore(wrapped);
    if (!storeResult.ok) {
      throw new Error('setup failed');
    }

    const setResult = storeResult.data.setLocale('es');
    expect(setResult.ok).toBe(false);
  });
});

describe('store.set — error paths', () => {
  it('returns error when registry.set() fails (lines 183-184)', () => {
    const realRegistry = makeRegistry();

    // Wrapper: set() always fails
    const wrapped = wrapRegistry(realRegistry, {
      set: () => fakeErr('LOCALE.SET_FAILED', 'set failed'),
    } as unknown as Partial<LocaleRegistry<typeof TestSchema>>);

    const storeResult = createLocaleStore(wrapped);
    if (!storeResult.ok) {
      throw new Error('setup failed');
    }

    const setResult = storeResult.data.set('fr', { greeting: 'Bonjour', farewell: 'Au revoir' });
    expect(setResult.ok).toBe(false);
  });

  it('refreshes reactive state when set() updates the active locale (lines 188-194)', () => {
    const registry = makeRegistry();
    const storeResult = createLocaleStore(registry);
    if (!storeResult.ok) {
      throw new Error('setup failed');
    }

    // Active locale is 'en'. Update 'en' with new strings.
    const updatedEn = { greeting: 'Hi there', farewell: 'See ya' };
    const setResult = storeResult.data.set('en', updatedEn);
    expect(setResult.ok).toBe(true);

    // The reactive t should now reflect the updated strings
    expect(storeResult.data.t).toBeDefined();
  });

  it('returns error when registry.t() fails during active locale refresh (lines 188-194 error branch)', () => {
    const realRegistry = makeRegistry();

    // Wrapper: t() succeeds on first call (init), fails on second (set active locale refresh)
    let tCallCount = 0;
    const wrapped = wrapRegistry(realRegistry, {
      t: () => {
        tCallCount++;
        if (tCallCount === 1) {
          // Init call — delegate to real registry
          return realRegistry.t();
        }
        // set() for active locale refresh — fail
        return fakeErr('LOCALE.T_FAILED', 'strings rebuild failed');
      },
    } as Partial<LocaleRegistry<typeof TestSchema>>);

    const storeResult = createLocaleStore(wrapped);
    if (!storeResult.ok) {
      throw new Error('setup failed');
    }

    // set() for the active locale ('en') — registry.set() succeeds but registry.t() fails
    const setResult = storeResult.data.set('en', { greeting: 'Updated', farewell: 'Updated' });
    expect(setResult.ok).toBe(false);
  });
});
