import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createLocaleRegistry, createNamespacedRegistry } from './registry';

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

// =============================================================================
// createLocaleRegistry
// =============================================================================

describe('createLocaleRegistry', () => {
  it('returns ok with valid options', () => {
    const result = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es },
    });
    expect(result.ok).toBe(true);
  });

  it('returns error when defaultLocale not in locales', () => {
    const result = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'fr',
      locales: { en },
    });
    expect(result.ok).toBe(false);
  });

  it('returns error when fallback locale not in locales', () => {
    const result = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
      fallbackLocales: ['fr'],
    });
    expect(result.ok).toBe(false);
  });

  it('validates locales against schema in strict mode', () => {
    const result = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en: { greeting: 'Hi' } as never },
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// Registry methods
// =============================================================================

describe('registry.active', () => {
  it('returns the default locale initially', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }
    const result = reg.data.active();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });
});

describe('registry.setActive', () => {
  it('switches to a valid locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const setResult = reg.data.setActive('es');
    expect(setResult.ok).toBe(true);

    const active = reg.data.active();
    if (active.ok) {
      expect(active.data).toBe('es');
    }
  });

  it('rejects unknown locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.setActive('fr');
    expect(result.ok).toBe(false);
  });
});

describe('registry.list', () => {
  it('returns all locale codes', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es, ja },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('en');
      expect(result.data).toContain('es');
      expect(result.data).toContain('ja');
      expect(result.data).toHaveLength(3);
    }
  });
});

describe('registry.get', () => {
  it('returns built locale for existing code', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.get('en');
    expect(result.ok).toBe(true);
  });

  it('returns error for unknown code', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.get('fr');
    expect(result.ok).toBe(false);
  });
});

describe('registry.has', () => {
  it('returns true for existing locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.has('es');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns false for missing locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.has('fr');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });
});

describe('registry.set', () => {
  it('adds a new locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const setResult = reg.data.set('ja', ja);
    expect(setResult.ok).toBe(true);

    const hasResult = reg.data.has('ja');
    if (hasResult.ok) {
      expect(hasResult.data).toBe(true);
    }
  });

  it('rejects invalid locale data', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.set('bad', { greeting: 'Hi' } as never);
    expect(result.ok).toBe(false);
  });
});

describe('registry.t', () => {
  it('returns built strings for active locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.t();
    expect(result.ok).toBe(true);
  });
});

describe('registry.remove', () => {
  it('removes a non-active, non-default locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es, ja },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.remove('ja');
    expect(result.ok).toBe(true);

    const hasResult = reg.data.has('ja');
    if (hasResult.ok) {
      expect(hasResult.data).toBe(false);
    }
  });

  it('rejects removing active locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.remove('en');
    expect(result.ok).toBe(false);
  });

  it('rejects removing default locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en, es },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    reg.data.setActive('es');
    const result = reg.data.remove('en');
    expect(result.ok).toBe(false);
  });

  it('rejects removing non-existent locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: { en },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.remove('fr');
    expect(result.ok).toBe(false);
  });
});

describe('non-strict mode with fallback', () => {
  it('fills missing keys from fallback locale', () => {
    const reg = createLocaleRegistry({
      schema: TestSchema,
      defaultLocale: 'en',
      locales: {
        en,
        partial: { greeting: 'Bonjour' } as never, // missing farewell
      },
      strict: false,
      fallbackLocales: ['en'],
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) {
      return;
    }

    const result = reg.data.get('partial');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // farewell should be filled from en fallback
      expect((result.data as Record<string, unknown>).greeting).toBeDefined();
      expect((result.data as Record<string, unknown>).farewell).toBeDefined();
    }
  });
});

// =============================================================================
// createNamespacedRegistry
// =============================================================================

describe('createNamespacedRegistry', () => {
  const AuthSchema = v.strictObject({
    login: v.string(),
    logout: v.string(),
  });

  const authEn = { login: 'Log in', logout: 'Log out' };
  const authEs = { login: 'Iniciar sesión', logout: 'Cerrar sesión' };

  it('returns ok with valid options', () => {
    const result = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en, es } },
        auth: { schema: AuthSchema, locales: { en: authEn, es: authEs } },
      },
    });
    expect(result.ok).toBe(true);
  });

  it('active returns default locale', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.active();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('setActive propagates to all namespaces', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en, es } },
        auth: { schema: AuthSchema, locales: { en: authEn, es: authEs } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.setActive('es');
    expect(result.ok).toBe(true);

    const active = reg.data.active();
    if (active.ok) {
      expect(active.data).toBe('es');
    }
  });

  it('ns returns namespace strings', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.ns('common');
    expect(result.ok).toBe(true);
  });

  it('ns returns error for unknown namespace', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.ns('unknown');
    expect(result.ok).toBe(false);
  });

  it('list returns intersection of all namespace locales', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en, es, ja } },
        auth: { schema: AuthSchema, locales: { en: authEn, es: authEs } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('en');
      expect(result.data).toContain('es');
      // ja only in common, not in auth — excluded from intersection
      expect(result.data).not.toContain('ja');
    }
  });

  it('addNamespace adds a new namespace', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.addNamespace('auth', {
      schema: AuthSchema,
      locales: { en: authEn },
    });
    expect(result.ok).toBe(true);

    const has = reg.data.hasNamespace('auth');
    if (has.ok) {
      expect(has.data).toBe(true);
    }
  });

  it('removeNamespace removes a namespace', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
        auth: { schema: AuthSchema, locales: { en: authEn } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.removeNamespace('auth');
    expect(result.ok).toBe(true);

    const has = reg.data.hasNamespace('auth');
    if (has.ok) {
      expect(has.data).toBe(false);
    }
  });

  it('removeNamespace returns error for unknown namespace', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.removeNamespace('unknown');
    expect(result.ok).toBe(false);
  });

  it('listNamespaces returns all namespace names', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
        auth: { schema: AuthSchema, locales: { en: authEn } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.listNamespaces();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('common');
      expect(result.data).toContain('auth');
    }
  });

  it('setLocale adds locale to a specific namespace', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.setLocale('common', 'es', es);
    expect(result.ok).toBe(true);
  });

  it('setLocale returns error for unknown namespace', () => {
    const reg = createNamespacedRegistry({
      defaultLocale: 'en',
      namespaces: {
        common: { schema: TestSchema, locales: { en } },
      },
    });
    if (!reg.ok) {
      throw new Error('setup failed');
    }

    const result = reg.data.setLocale('unknown', 'es', es);
    expect(result.ok).toBe(false);
  });
});
