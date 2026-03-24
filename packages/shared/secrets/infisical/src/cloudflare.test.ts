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
    if (result.ok) expect(result.data).toBe(true);
  });

  it('should return false for empty string', () => {
    const env = { DATABASE_URL: '' };
    const result = hasEnvSecret(env, 'DATABASE_URL');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
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
    if (result.ok) expect(result.data).toBe(false);
  });
});
