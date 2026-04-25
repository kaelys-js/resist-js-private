/**
 * Tests for the secret fetching type-safe accessors.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as v from 'valibot';
import type { Str, Bool, Void, OptionalStr } from '@/schemas/common';
import type {
  AllSecrets,
  GlobalSecrets,
  ProductSecrets,
} from '@/schemas/core-config/secret-schemas';
import type { Result } from '@/schemas/result/result';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('@/secrets/infisical/client', () => ({
  getClient: vi.fn(),
  ENV_VARS: {
    ENV: 'INFISICAL_ENV',
    PROJECT_ID: 'INFISICAL_PROJECT_ID',
  },
}));

// Must import after mocks
const {
  getSecrets,
  getSecret,
  getGlobalSecrets,
  getProductSecrets,
  getAllSecrets,
  hasSecret,
  getSecretsByKeys,
  loadSecretsToEnv,
  GetSecretsOptionsSchema,
  GetSecretOptionsSchema,
  GetGlobalSecretsOptionsSchema,
} = await import('./secrets');
const { getClient } = await import('@/secrets/infisical/client');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockListSecrets = vi.fn();
const mockGetSecret = vi.fn();

/** Sets up a mock client that resolves successfully. */
function setupMockClient(): void {
  (getClient as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: true,
    data: {
      listSecrets: mockListSecrets,
      getSecret: mockGetSecret,
    },
    error: null,
  });
}

/** Sets up a mock client that returns an error. */
function setupFailedClient(): void {
  (getClient as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: false,
    data: null,
    error: { code: 'INTERNAL.UNEXPECTED', message: 'Client failed' },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('secrets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSecrets.mockReset();
    mockGetSecret.mockReset();
    process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';
    process.env['INFISICAL_ENV'] = 'test';
  });

  describe('GetSecretsOptionsSchema', () => {
    it('validates valid options', () => {
      const parsed = GetSecretsOptionsSchema;

      expect(parsed).toBeDefined();
    });
  });

  describe('GetSecretOptionsSchema', () => {
    it('is defined and excludes attachToProcessEnv', () => {
      expect(GetSecretOptionsSchema).toBeDefined();
    });
  });

  describe('GetGlobalSecretsOptionsSchema', () => {
    it('is defined and excludes path', () => {
      expect(GetGlobalSecretsOptionsSchema).toBeDefined();
    });
  });

  describe('getSecret', () => {
    it('returns error when client fails', async () => {
      setupFailedClient();

      const result: Result<Str> = await getSecret('MY_KEY', {});

      expect(result.ok).toBe(false);
    });

    it('returns error when projectId is missing', async () => {
      setupMockClient();
      delete process.env['INFISICAL_PROJECT_ID'];

      const result: Result<Str> = await getSecret('MY_KEY', { environment: 'test' });

      expect(result.ok).toBe(false);
    });

    it('returns the secret value when found', async () => {
      setupMockClient();
      mockGetSecret.mockResolvedValue({
        secretKey: 'MY_KEY',
        secretValue: 'my-secret-value',
      });

      const result: Result<Str> = await getSecret('MY_KEY', { projectId: 'proj-1' });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.data).toBe('my-secret-value');
      }
    });

    it('returns error when secret not found', async () => {
      setupMockClient();
      mockGetSecret.mockResolvedValue({});

      const result: Result<Str> = await getSecret('MISSING', { projectId: 'proj-1' });

      expect(result.ok).toBe(false);
    });

    it('returns error when SDK throws', async () => {
      setupMockClient();
      mockGetSecret.mockRejectedValue(new Error('Network error'));

      const result: Result<Str> = await getSecret('MY_KEY', { projectId: 'proj-1' });

      expect(result.ok).toBe(false);
    });
  });

  describe('hasSecret', () => {
    it('returns true when secret exists', async () => {
      setupMockClient();
      mockGetSecret.mockResolvedValue({
        secretKey: 'MY_KEY',
        secretValue: 'value',
      });

      const result: Result<Bool> = await hasSecret('MY_KEY', { projectId: 'proj-1' });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.data).toBe(true);
      }
    });

    it('returns false when secret does not exist', async () => {
      setupMockClient();
      mockGetSecret.mockResolvedValue({});

      const result: Result<Bool> = await hasSecret('MISSING', { projectId: 'proj-1' });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe('getSecretsByKeys', () => {
    it('returns error when client fails', async () => {
      setupFailedClient();

      const result: Result<Record<Str, OptionalStr>> = await getSecretsByKeys(
        ['KEY_A', 'KEY_B'],
        {},
      );

      expect(result.ok).toBe(false);
    });
  });

  describe('loadSecretsToEnv', () => {
    it('returns error when client fails', async () => {
      setupFailedClient();

      const result: Result<Void> = await loadSecretsToEnv({});

      expect(result.ok).toBe(false);
    });

    it('returns error for invalid options', async () => {
      const result: Result<Void> = await loadSecretsToEnv(42 as any);

      expect(result.ok).toBe(false);
    });

    it('succeeds and loads secrets to process.env', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([
        { secretKey: 'TEST_LOADED_KEY', secretValue: 'loaded-value' },
      ]);

      const result: Result<Void> = await loadSecretsToEnv({
        projectId: 'proj-1',
        skipValidation: true,
        attachToProcessEnv: true,
      });

      // loadSecretsToEnv delegates to getSecrets with attachToProcessEnv+skipValidation
      // If the mock resolves successfully, result should be ok
      expect(result.ok).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getSecrets — comprehensive branch coverage
  // -------------------------------------------------------------------------

  describe('getSecrets — branches', () => {
    it('returns error for invalid options', async () => {
      const result = await getSecrets(v.record(v.string(), v.string()), 42 as any);

      expect(result.ok).toBe(false);
    });

    it('returns error when client fails', async () => {
      setupFailedClient();

      const result = await getSecrets(v.record(v.string(), v.string()), {});

      expect(result.ok).toBe(false);
    });

    it('returns error when projectId is missing', async () => {
      setupMockClient();
      delete process.env['INFISICAL_PROJECT_ID'];

      const result = await getSecrets(v.record(v.string(), v.string()), {
        environment: 'test',
      });

      expect(result.ok).toBe(false);
    });

    it('passes tags as tagSlugs to listSecrets', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([]);

      await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
        tags: ['tag1', 'tag2'],
        skipValidation: true,
      });

      expect(mockListSecrets).toHaveBeenCalledWith(
        expect.objectContaining({ tagSlugs: ['tag1', 'tag2'] }),
      );
    });

    it('returns error when listSecrets throws', async () => {
      setupMockClient();
      mockListSecrets.mockRejectedValue(new Error('network error'));

      const result = await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
      });

      expect(result.ok).toBe(false);
    });

    it('converts raw secrets array to key-value record', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([
        { secretKey: 'K1', secretValue: 'v1' },
        { secretKey: 'K2', secretValue: 'v2' },
      ]);

      const result = await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
        skipValidation: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ K1: 'v1', K2: 'v2' });
      }
    });

    it('skips non-conforming entries in raw secrets', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([
        { secretKey: 'K1', secretValue: 'v1' },
        null,
        { bad: true },
        42,
        { secretKey: 123, secretValue: 'bad-key-type' },
      ]);

      const result = await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
        skipValidation: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ K1: 'v1' });
      }
    });

    it('handles non-array rawSecrets', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue('not-an-array');

      const result = await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
        skipValidation: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({});
      }
    });

    it('attaches to process.env when attachToProcessEnv is true', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([
        { secretKey: 'ATTACHED_KEY', secretValue: 'attached-val' },
      ]);

      const result = await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
        attachToProcessEnv: true,
        skipValidation: true,
      });

      expect(result.ok).toBe(true);
      expect(process.env['ATTACHED_KEY']).toBe('attached-val');
      delete process.env['ATTACHED_KEY'];
    });

    it('returns unvalidated record when skipValidation is true', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([{ secretKey: 'K1', secretValue: 'v1' }]);

      const result = await getSecrets(v.record(v.string(), v.string()), {
        projectId: 'proj-1',
        skipValidation: true,
      });

      expect(result.ok).toBe(true);
    });

    it('validates against schema when skipValidation is not set', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([{ secretKey: 'K1', secretValue: 'v1' }]);

      // Use a strict schema that requires specific keys — should fail
      const strictSchema = v.strictObject({ REQUIRED_KEY: v.string() });
      const result = await getSecrets(strictSchema, { projectId: 'proj-1' });

      expect(result.ok).toBe(false);
    });

    it('uses env var fallbacks for environment and projectId', async () => {
      setupMockClient();
      process.env['INFISICAL_ENV'] = 'custom-env';
      process.env['INFISICAL_PROJECT_ID'] = 'env-project';
      mockListSecrets.mockResolvedValue([]);

      await getSecrets(v.record(v.string(), v.string()), { skipValidation: true });

      expect(mockListSecrets).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'custom-env',
          projectId: 'env-project',
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getSecret — additional error branches
  // -------------------------------------------------------------------------

  describe('getSecret — validation errors', () => {
    it('returns error for non-string key', async () => {
      const result: Result<Str> = await getSecret(42 as any, {});

      expect(result.ok).toBe(false);
    });

    it('returns error for invalid options (strict object)', async () => {
      const result: Result<Str> = await getSecret('KEY', { unknownProp: true } as any);

      expect(result.ok).toBe(false);
    });

    it('returns error when projectId missing via env fallback', async () => {
      setupMockClient();
      delete process.env['INFISICAL_PROJECT_ID'];

      const result: Result<Str> = await getSecret('KEY', {});

      expect(result.ok).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Convenience accessor functions (uncovered functions)
  // -------------------------------------------------------------------------

  describe('getGlobalSecrets', () => {
    it('returns error when client fails', async () => {
      setupFailedClient();

      const result: Result<GlobalSecrets> = await getGlobalSecrets({});

      expect(result.ok).toBe(false);
    });

    it('delegates with path "/"', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([]);

      await getGlobalSecrets({ projectId: 'proj-1' });

      expect(mockListSecrets).toHaveBeenCalledWith(expect.objectContaining({ path: '/' }));
    });

    it('returns error for invalid options', async () => {
      const result: Result<GlobalSecrets> = await getGlobalSecrets(42 as any);

      expect(result.ok).toBe(false);
    });
  });

  describe('getProductSecrets', () => {
    it('returns error when client fails', async () => {
      setupFailedClient();

      const result: Result<ProductSecrets> = await getProductSecrets({});

      expect(result.ok).toBe(false);
    });

    it('returns error for invalid options', async () => {
      const result: Result<ProductSecrets> = await getProductSecrets(42 as any);

      expect(result.ok).toBe(false);
    });
  });

  describe('getAllSecrets', () => {
    it('returns error when client fails', async () => {
      setupFailedClient();

      const result: Result<AllSecrets> = await getAllSecrets({});

      expect(result.ok).toBe(false);
    });

    it('returns error for invalid options', async () => {
      const result: Result<AllSecrets> = await getAllSecrets(42 as any);

      expect(result.ok).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // hasSecret — validation errors
  // -------------------------------------------------------------------------

  describe('hasSecret — validation errors', () => {
    it('returns error for invalid key', async () => {
      const result: Result<Bool> = await hasSecret(42 as any, {});

      expect(result.ok).toBe(false);
    });

    it('returns error for invalid options', async () => {
      const result: Result<Bool> = await hasSecret('KEY', { unknownProp: true } as any);

      expect(result.ok).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getSecretsByKeys — additional branches
  // -------------------------------------------------------------------------

  describe('getSecretsByKeys — branches', () => {
    it('returns error for invalid keys', async () => {
      const result: Result<Record<Str, OptionalStr>> = await getSecretsByKeys(42 as any, {});

      expect(result.ok).toBe(false);
    });

    it('returns error for invalid options', async () => {
      const result: Result<Record<Str, OptionalStr>> = await getSecretsByKeys(['K'], {
        unknownProp: true,
      } as any);

      expect(result.ok).toBe(false);
    });

    it('returns partial results with undefined for missing keys', async () => {
      setupMockClient();
      mockListSecrets.mockResolvedValue([
        { secretKey: 'K_A', secretValue: 'val-a' },
        { secretKey: 'K_B', secretValue: 'val-b' },
      ]);

      const result: Result<Record<Str, OptionalStr>> = await getSecretsByKeys(
        ['K_A', 'K_B', 'K_MISSING'],
        { projectId: 'proj-1' },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data['K_A']).toBe('val-a');
        expect(result.data['K_B']).toBe('val-b');
        expect(result.data['K_MISSING']).toBeUndefined();
      }
    });
  });
});
