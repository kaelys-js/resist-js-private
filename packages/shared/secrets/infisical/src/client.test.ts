/**
 * Tests for the Infisical client factory.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Result } from '@/schemas/result/result';
import type { Bool, Str, Void } from '@/schemas/common';
import type { InfisicalAuthMethod } from '@/schemas/core-config/tooling';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

const mockListSecrets = vi.fn();
const mockGetSecret = vi.fn();

const mockInfisicalClient = vi.fn(function MockInfisicalClient() {
  return { listSecrets: mockListSecrets, getSecret: mockGetSecret };
});

vi.mock('@infisical/sdk', () => ({
  InfisicalClient: mockInfisicalClient,
}));

vi.mock('@/config/loader', () => ({
  getConfig: vi.fn(() => ({
    ok: true,
    data: {
      tooling: {
        infisical: {
          siteUrl: 'http://localhost:8080',
          auth: { cacheTtlSeconds: 300 },
        },
      },
    },
    error: null,
  })),
}));

// Must import after mocks
const {
  resolveOptions,
  getClient,
  createClient,
  clearClient,
  getAuthMethod,
  isAuthenticated,
  ClientOptionsSchema,
  ResolvedOptionsSchema,
  ENV_VARS,
} = await import('./client');
const { getConfig } = await import('@/config/loader');

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockListSecrets.mockReset();
  mockGetSecret.mockReset();
  clearClient();
  delete process.env[ENV_VARS.TOKEN];
  delete process.env[ENV_VARS.CLIENT_ID];
  delete process.env[ENV_VARS.CLIENT_SECRET];
  delete process.env[ENV_VARS.PROJECT_ID];
  delete process.env[ENV_VARS.ENV];
  delete process.env[ENV_VARS.CACHE_TTL];
  delete process.env[ENV_VARS.DEBUG];
  delete process.env[ENV_VARS.SITE_URL];
});

// ---------------------------------------------------------------------------
// resolveOptions
// ---------------------------------------------------------------------------

describe('resolveOptions', () => {
  it('resolves with default values from config', () => {
    const result = resolveOptions({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.siteUrl).toBe('http://localhost:8080');
      expect(result.data.cacheTtl).toBe(300000);
      expect(result.data.debug).toBe(false);
    }
  });

  it('uses environment variable overrides', () => {
    process.env[ENV_VARS.SITE_URL] = 'https://custom.example.com';
    process.env[ENV_VARS.TOKEN] = 'test-token';
    process.env[ENV_VARS.DEBUG] = 'true';

    const result = resolveOptions({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.siteUrl).toBe('https://custom.example.com');
      expect(result.data.accessToken).toBe('test-token');
      expect(result.data.debug).toBe(true);
    }
  });

  it('uses options overrides over env vars', () => {
    process.env[ENV_VARS.TOKEN] = 'env-token';

    const result = resolveOptions({ accessToken: 'option-token' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.accessToken).toBe('option-token');
    }
  });
});

// ---------------------------------------------------------------------------
// getAuthMethod
// ---------------------------------------------------------------------------

describe('getAuthMethod', () => {
  it('returns token when INFISICAL_TOKEN is set', () => {
    process.env[ENV_VARS.TOKEN] = 'test-token';
    const result: Result<InfisicalAuthMethod> = getAuthMethod();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('token');
  });

  it('returns machine-identity when client credentials are set', () => {
    process.env[ENV_VARS.CLIENT_ID] = 'id';
    process.env[ENV_VARS.CLIENT_SECRET] = 'secret';
    const result: Result<InfisicalAuthMethod> = getAuthMethod();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('machine-identity');
  });

  it('returns interactive when no credentials are set', () => {
    const result: Result<InfisicalAuthMethod> = getAuthMethod();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('interactive');
  });
});

// ---------------------------------------------------------------------------
// clearClient
// ---------------------------------------------------------------------------

describe('clearClient', () => {
  it('returns a successful Result<Void>', () => {
    const result: Result<Void> = clearClient();

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------

describe('createClient', () => {
  it('creates an InfisicalClient with resolved options', () => {
    const resolvedResult = resolveOptions({});
    if (!resolvedResult.ok) throw new Error('resolveOptions failed');

    const result = createClient(resolvedResult.data);

    expect(result.ok).toBe(true);
    expect(mockInfisicalClient).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getClient
// ---------------------------------------------------------------------------

describe('getClient', () => {
  it('returns a client instance', () => {
    const result = getClient({});

    expect(result.ok).toBe(true);
  });

  it('returns the same client for the same options (singleton)', () => {
    const result1 = getClient({});
    const result2 = getClient({});

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.data).toBe(result2.data);
    }
  });
});

// ---------------------------------------------------------------------------
// isAuthenticated
// ---------------------------------------------------------------------------

describe('isAuthenticated', () => {
  it('returns false when no project ID is set', async () => {
    const result: Result<Bool> = await isAuthenticated({});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });

  it('returns error when listSecrets throws', async () => {
    process.env[ENV_VARS.PROJECT_ID] = 'test-project';
    mockListSecrets.mockRejectedValue(new Error('auth failed'));
    clearClient();

    const result: Result<Bool> = await isAuthenticated({});

    expect(result.ok).toBe(false);
  });

  it('returns error for invalid options', async () => {
    const result: Result<Bool> = await isAuthenticated(42 as any);

    expect(result.ok).toBe(false);
  });

  it('returns true when listSecrets succeeds', async () => {
    process.env[ENV_VARS.PROJECT_ID] = 'test-project';
    mockListSecrets.mockResolvedValue([]);
    clearClient();

    const result: Result<Bool> = await isAuthenticated({});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveOptions — error branches
// ---------------------------------------------------------------------------

describe('resolveOptions — error branches', () => {
  it('returns error for invalid options input', () => {
    const result = resolveOptions(42 as any);

    expect(result.ok).toBe(false);
  });

  it('returns error when getConfig() fails', () => {
    (getConfig as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ok: false,
      data: null,
      error: { code: 'INTERNAL.UNEXPECTED', message: 'load failed' },
    });

    const result = resolveOptions({});

    expect(result.ok).toBe(false);
  });

  it('uses INFISICAL_CACHE_TTL env var when set', () => {
    process.env[ENV_VARS.CACHE_TTL] = '60000';

    const result = resolveOptions({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cacheTtl).toBe(60000);
    }
  });

  it('returns error for non-numeric INFISICAL_CACHE_TTL', () => {
    process.env[ENV_VARS.CACHE_TTL] = 'not-a-number';

    const result = resolveOptions({});

    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getClient — error branches
// ---------------------------------------------------------------------------

describe('getClient — error branches', () => {
  it('returns error for invalid options', () => {
    const result = getClient({ siteUrl: 42 } as any);

    expect(result.ok).toBe(false);
  });

  it('returns error when resolveOptions fails', () => {
    (getConfig as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ok: false,
      data: null,
      error: { code: 'INTERNAL.UNEXPECTED', message: 'load failed' },
    });

    const result = getClient({});

    expect(result.ok).toBe(false);
  });

  it('creates new client when options change', () => {
    clearClient();
    const result1 = getClient({});

    expect(result1.ok).toBe(true);
    const callCount1 = mockInfisicalClient.mock.calls.length;

    // Change options to invalidate singleton
    clearClient();
    process.env[ENV_VARS.DEBUG] = 'true';
    const result2 = getClient({});

    expect(result2.ok).toBe(true);
    expect(mockInfisicalClient.mock.calls.length).toBeGreaterThan(callCount1);
  });
});

// ---------------------------------------------------------------------------
// createClient — branches
// ---------------------------------------------------------------------------

describe('createClient — branches', () => {
  it('returns error for invalid resolved options', () => {
    const result = createClient({ siteUrl: 123 } as any);

    expect(result.ok).toBe(false);
  });

  it('spreads accessToken when non-empty', () => {
    const resolvedResult = resolveOptions({ accessToken: 'test-token' });

    expect(resolvedResult.ok).toBe(true);
    if (!resolvedResult.ok) return;

    clearClient();
    mockInfisicalClient.mockClear();
    const result = createClient(resolvedResult.data);

    expect(result.ok).toBe(true);
    expect(mockInfisicalClient).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'test-token' }),
    );
  });

  it('spreads clientId and clientSecret when both non-empty', () => {
    process.env[ENV_VARS.CLIENT_ID] = 'cid';
    process.env[ENV_VARS.CLIENT_SECRET] = 'csec';

    const resolvedResult = resolveOptions({});

    expect(resolvedResult.ok).toBe(true);
    if (!resolvedResult.ok) return;

    clearClient();
    mockInfisicalClient.mockClear();
    const result = createClient(resolvedResult.data);

    expect(result.ok).toBe(true);
    expect(mockInfisicalClient).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'cid', clientSecret: 'csec' }),
    );
  });

  it('writes to stdout when debug is true', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const resolvedResult = resolveOptions({ debug: true });

    expect(resolvedResult.ok).toBe(true);
    if (!resolvedResult.ok) return;

    clearClient();
    createClient(resolvedResult.data);

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('[infisical]'));
    writeSpy.mockRestore();
  });
});
