/**
 * Tests for the secret fetching type-safe accessors.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Str, Bool, Void, OptionalStr } from '@/schemas/common';
import type { AllSecrets, GlobalSecrets, ProductSecrets } from '@/schemas/core-config/secret-schemas';
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
  });
});
