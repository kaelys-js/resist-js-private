/**
 * Tests for Cloudflare Workers Integration
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import {
  createSecretsProxy,
  getEnvSecret,
  getEnvSecretOrDefault,
  hasEnvSecret,
  hasRequiredSecrets,
  validateWorkerEnv,
  withValidatedEnv,
} from './cloudflare';

/**
 * Minimum valid ProductSecrets env object for tests.
 *
 * @returns
 */
function makeValidEnv(): Record<string, string> {
  return {
    API_SECRET_KEY: 'a'.repeat(32),
    D1_DATABASE_ID: 'db-id',
    KV_NAMESPACE_ID: 'kv-id',
    LEMON_SQUEEZY_API_KEY: 'ls-key-12345',
    REVENUECAT_API_KEY: 'rc-key-12345',
    POSTHOG_API_KEY: 'ph-key-12345',
    RESEND_API_KEY: 're_testkey123',
    GA_MEASUREMENT_ID: 'G-12345',
    STATUS_PAGE_TOKEN: 'sp-key-12345',
  };
}

describe('validateWorkerEnv', () => {
  it('should return error for non-object env', () => {
    const result = validateWorkerEnv(null);

    expect(result.ok).toBe(false);
  });

  it('should return error for undefined env', () => {
    const result = validateWorkerEnv(undefined);

    expect(result.ok).toBe(false);
  });

  it('should filter non-string values from env', () => {
    const env = {
      API_SECRET_KEY: 'a'.repeat(32),
      D1_DATABASE_ID: 'db-id',
      KV_NAMESPACE_ID: 'kv-id',
      LEMON_SQUEEZY_API_KEY: 'ls-key-12345',
      REVENUECAT_API_KEY: 'rc-key-12345',
      POSTHOG_API_KEY: 'ph-key-12345',
      RESEND_API_KEY: 're_testkey123',
      GA_MEASUREMENT_ID: 'G-12345',
      STATUS_PAGE_TOKEN: 'sp-key-12345',
      nonStringValue: 42,
    };
    const result = validateWorkerEnv(env);

    expect(result.ok).toBe(true);
  });
});

describe('createSecretsProxy', () => {
  it('should throw on invalid env access', () => {
    const proxy = createSecretsProxy(null);

    expect(() => proxy.D1_DATABASE_ID).toThrow();
  });
});

describe('getEnvSecret', () => {
  it('should return error for invalid env', () => {
    const result = getEnvSecret(null, 'D1_DATABASE_ID');

    expect(result.ok).toBe(false);
  });
});

describe('hasEnvSecret', () => {
  it('should return error for null env', () => {
    const result = hasEnvSecret(null, 'DATABASE_URL');

    expect(result.ok).toBe(false);
  });

  it('should return true for existing string secret', () => {
    const env = { DATABASE_URL: 'postgres://localhost/db' };
    const result = hasEnvSecret(env, 'DATABASE_URL');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('should return false for empty string', () => {
    const env = { DATABASE_URL: '' };
    const result = hasEnvSecret(env, 'DATABASE_URL');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });
});

describe('getEnvSecretOrDefault', () => {
  it('should return error when env is invalid', () => {
    const result = getEnvSecretOrDefault(null, 'D1_DATABASE_ID', 'fallback');

    expect(result.ok).toBe(false);
  });
});

describe('withValidatedEnv', () => {
  it('should return error for invalid env', () => {
    const result = withValidatedEnv(null);

    expect(result.ok).toBe(false);
  });
});

describe('hasRequiredSecrets', () => {
  it('should return error for null env', () => {
    const result = hasRequiredSecrets(null, ['D1_DATABASE_ID']);

    expect(result.ok).toBe(false);
  });

  it('should return false when keys are missing', () => {
    const env = { D1_DATABASE_ID: 'db-id' };
    const result = hasRequiredSecrets(env, ['D1_DATABASE_ID', 'KV_NAMESPACE_ID']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('should return true when all keys present and non-empty', () => {
    const env = makeValidEnv();
    const result = hasRequiredSecrets(env, ['D1_DATABASE_ID', 'KV_NAMESPACE_ID']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('should return error for invalid key names', () => {
    const result = hasRequiredSecrets(makeValidEnv(), ['INVALID_KEY' as any]);

    expect(result.ok).toBe(false);
  });

  it('should return false for empty string value', () => {
    const env = { ...makeValidEnv(), D1_DATABASE_ID: '' };
    const result = hasRequiredSecrets(env, ['D1_DATABASE_ID']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });
});

// =============================================================================
// createSecretsProxy — success paths and proxy traps
// =============================================================================

describe('createSecretsProxy — success paths', () => {
  it('get trap returns value on valid env', () => {
    const proxy = createSecretsProxy(makeValidEnv());

    expect(proxy.D1_DATABASE_ID).toBe('db-id');
  });

  it('caches validated result on second access', () => {
    const proxy = createSecretsProxy(makeValidEnv());

    expect(proxy.D1_DATABASE_ID).toBe('db-id');
    expect(proxy.KV_NAMESPACE_ID).toBe('kv-id');
  });

  it('throws on invalid env with serialized error', () => {
    const proxy = createSecretsProxy({ partial: 'data' });

    expect(() => proxy.D1_DATABASE_ID).toThrow('Environment validation failed');
  });

  it('caches and re-throws validation error', () => {
    const proxy = createSecretsProxy({ partial: 'data' });

    expect(() => proxy.D1_DATABASE_ID).toThrow('Environment validation failed');
    // Second access should re-throw cached error
    expect(() => proxy.KV_NAMESPACE_ID).toThrow('Environment validation failed');
  });

  it('has() trap returns true for existing key', () => {
    const proxy = createSecretsProxy(makeValidEnv());

    expect('D1_DATABASE_ID' in proxy).toBe(true);
  });

  it('has() trap returns false for non-existing key', () => {
    const proxy = createSecretsProxy(makeValidEnv());

    expect('NONEXISTENT' in proxy).toBe(false);
  });

  it('ownKeys() returns secret keys', () => {
    const proxy = createSecretsProxy(makeValidEnv());
    const keys = Object.keys(proxy);

    expect(keys).toContain('D1_DATABASE_ID');
    expect(keys).toContain('API_SECRET_KEY');
  });

  it('getOwnPropertyDescriptor() returns descriptor for existing key', () => {
    const proxy = createSecretsProxy(makeValidEnv());
    const desc = Object.getOwnPropertyDescriptor(proxy, 'D1_DATABASE_ID');

    expect(desc).toMatchObject({
      configurable: true,
      enumerable: true,
      value: 'db-id',
    });
  });

  it('getOwnPropertyDescriptor() returns undefined for non-existing key', () => {
    const proxy = createSecretsProxy(makeValidEnv());
    const desc = Object.getOwnPropertyDescriptor(proxy, 'NONEXISTENT');

    expect(desc).toBeUndefined();
  });
});

// =============================================================================
// getEnvSecret — success and error paths
// =============================================================================

describe('getEnvSecret — success and error paths', () => {
  it('returns value for valid env and key', () => {
    const result = getEnvSecret(makeValidEnv(), 'D1_DATABASE_ID');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('db-id');
    }
  });

  it('returns error for invalid key name', () => {
    const result = getEnvSecret(makeValidEnv(), 'INVALID_KEY' as any);

    expect(result.ok).toBe(false);
  });

  it('returns error when env fails product secrets validation', () => {
    const result = getEnvSecret({ partial: 'data' }, 'D1_DATABASE_ID');

    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// hasEnvSecret — additional branches
// =============================================================================

describe('hasEnvSecret — additional branches', () => {
  it('returns false for non-string value', () => {
    const env = { DATABASE_URL: 42 };
    const result = hasEnvSecret(env, 'DATABASE_URL');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('returns error for invalid key (non-string)', () => {
    const result = hasEnvSecret({}, 42 as any);

    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// getEnvSecretOrDefault — success and fallback paths
// =============================================================================

describe('getEnvSecretOrDefault — success and fallback paths', () => {
  it('returns actual value when env is valid', () => {
    const result = getEnvSecretOrDefault(makeValidEnv(), 'D1_DATABASE_ID', 'fallback');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('db-id');
    }
  });

  it('returns default when getEnvSecret fails', () => {
    const result = getEnvSecretOrDefault({ partial: 'data' }, 'D1_DATABASE_ID', 'fallback');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('fallback');
    }
  });

  it('returns error for invalid key', () => {
    const result = getEnvSecretOrDefault(makeValidEnv(), 'BAD_KEY' as any, 'fallback');

    expect(result.ok).toBe(false);
  });

  it('returns error for invalid default value (non-string)', () => {
    const result = getEnvSecretOrDefault(makeValidEnv(), 'D1_DATABASE_ID', 42 as any);

    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// withValidatedEnv — success path
// =============================================================================

describe('withValidatedEnv — success path', () => {
  it('returns validated secrets for valid env', () => {
    const result = withValidatedEnv(makeValidEnv());

    expect(result.ok).toBe(true);
  });
});
