import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Num, NullableStr, Str } from '@/schemas/common';
import { createDebugStore } from './debug-state-store.svelte';

// Test storage key — products provide their own
const STORAGE_KEY: Str = 'test-app:debug-state';
const URL_PREFIX: Str = 'ta.';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<Str, Str> = {};
  return {
    getItem: vi.fn((key: Str): NullableStr => store[key] ?? null),
    setItem: vi.fn((key: Str, value: Str) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: Str) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length(): Num {
      return Object.keys(store).length;
    },
    key: vi.fn((): NullableStr => null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('createDebugStore', () => {
  it('returns ok result', () => {
    const result = createDebugStore();
    expect(result.ok).toBe(true);
  });

  it('has default state', () => {
    const result = createDebugStore();
    if (!result.ok) throw new Error('should be ok');
    expect(result.data.debug.enabled).toBe(false);
    expect(result.data.debug.logLevel).toBe('info');
  });

  it('has empty urlOverrides without URL', () => {
    const result = createDebugStore();
    if (!result.ok) throw new Error('should be ok');
    expect(result.data.urlOverrides).toEqual({});
  });

  it('parses URL params when URL and prefix provided', () => {
    const url = new URL(`http://localhost?${URL_PREFIX}debug=true&${URL_PREFIX}logLevel=trace`);
    const result = createDebugStore({ url, urlParamPrefix: URL_PREFIX });
    if (!result.ok) throw new Error('should be ok');
    expect(result.data.urlOverrides).toEqual({ debug: 'true', logLevel: 'trace' });
  });

  it('loads persisted state from localStorage', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, logLevel: 'trace' }));
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    expect(result.data.debug.enabled).toBe(true);
    expect(result.data.debug.logLevel).toBe('trace');
  });

  it('falls back to defaults on invalid localStorage', () => {
    localStorageMock.setItem(STORAGE_KEY, 'not json');
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    expect(result.data.debug.enabled).toBe(false);
    expect(result.data.debug.logLevel).toBe('info');
  });

  it('falls back to defaults on invalid schema data', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ enabled: 'yes', logLevel: 'verbose' }));
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    expect(result.data.debug.enabled).toBe(false);
    expect(result.data.debug.logLevel).toBe('info');
  });
});

describe('setEnabled', () => {
  it('sets enabled to true', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    const store = result.data;

    const setResult = store.setEnabled(true);
    expect(setResult.ok).toBe(true);
    expect(store.debug.enabled).toBe(true);
  });

  it('sets enabled to false', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    const store = result.data;

    store.setEnabled(true);
    const setResult = store.setEnabled(false);
    expect(setResult.ok).toBe(true);
    expect(store.debug.enabled).toBe(false);
  });

  it('does not persist enabled to localStorage (session-only)', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    result.data.setEnabled(true);

    const saved: NullableStr = localStorageMock.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.enabled).toBeUndefined();
  });

  it('rejects non-boolean', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    const setResult = result.data.setEnabled('yes' as unknown as boolean);
    expect(setResult.ok).toBe(false);
  });
});

describe('setLogLevel', () => {
  it('sets valid log level', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    const store = result.data;

    const setResult = store.setLogLevel('trace');
    expect(setResult.ok).toBe(true);
    expect(store.debug.logLevel).toBe('trace');
  });

  it('rejects invalid log level', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    const setResult = result.data.setLogLevel('verbose');
    expect(setResult.ok).toBe(false);
  });

  it('persists to localStorage', () => {
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');
    result.data.setLogLevel('error');

    const saved: NullableStr = localStorageMock.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.logLevel).toBe('error');
  });
});

describe('error handling', () => {
  it('handles localStorage write error gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });

    const result = createDebugStore({ storageKey: STORAGE_KEY });
    if (!result.ok) throw new Error('should be ok');

    // setLogLevel triggers save() which should catch the error
    const setResult = result.data.setLogLevel('warn');
    // The function still returns ok because it updates in-memory state
    // even if persistence fails (save error is returned but logLevel IS updated)
    expect(result.data.debug.logLevel).toBe('warn');
  });

  it('handles corrupted JSON in localStorage on load', () => {
    // Write invalid JSON directly
    localStorageMock.setItem(STORAGE_KEY, '{not valid json!!!');
    localStorageMock.getItem.mockReturnValueOnce('{not valid json!!!');

    // createDebugStore calls load() internally — should not throw
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    // Store creation succeeds even if load fails
    expect(result.ok).toBe(true);
  });

  it('skips URL override parsing when urlParamPrefix is missing', () => {
    const result = createDebugStore({
      storageKey: STORAGE_KEY,
      url: new URL('http://localhost?debug=true'),
      // urlParamPrefix NOT provided — should skip parsing
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // urlOverrides should be empty since prefix was not provided
      expect(Object.keys(result.data.urlOverrides)).toHaveLength(0);
    }
  });

  it('handles localStorage.getItem throwing (covers load catch block)', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('SecurityError');
    });
    // createDebugStore calls load() which should catch the error
    const result = createDebugStore({ storageKey: STORAGE_KEY });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Falls back to defaults
      expect(result.data.debug.enabled).toBe(false);
      expect(result.data.debug.logLevel).toBe('info');
    }
  });

  it('save/load return early without storageKey (!_storageKey branch)', () => {
    // No storageKey → !_storageKey is true → save/load skip localStorage
    const result = createDebugStore();
    if (!result.ok) throw new Error('should be ok');
    // setLogLevel triggers save() which should return early
    const setResult = result.data.setLogLevel('trace');
    expect(setResult.ok).toBe(true);
    // localStorage should NOT have been called with any key
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});
