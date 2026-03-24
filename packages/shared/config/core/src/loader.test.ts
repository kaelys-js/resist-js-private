/**
 * Tests for the core config loader singleton.
 *
 * @module
 */

// oxlint-disable require-await -- async test helpers for loadConfig don't always need await
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Bool, Path, Void } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { Result } from '@/schemas/result/result';
import { defaults } from './defaults';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('@/utils/core/logger', () => ({
  log: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  setupLogging: vi.fn(),
}));

vi.mock('@/utils/core/node-imports', () => ({
  nodePath: { join: (...args: string[]) => args.join('/') },
}));

vi.mock('@/utils/core/workspace', () => ({
  findWorkspaceRoot: vi.fn(),
}));

vi.mock('@/utils/core/path', () => ({
  joinPath: vi.fn(),
  pathExists: vi.fn(),
}));

// Must import after mocks
const {
  loadConfig,
  getConfig,
  resetConfig,
  setConfig,
  configExists,
  defineConfig,
  defineProductConfig,
} = await import('./loader');
const { findWorkspaceRoot } = await import('@/utils/core/workspace');
const { joinPath, pathExists } = await import('@/utils/core/path');
const { log } = await import('@/utils/core/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set up mocks for a successful filesystem-based config load.
 *
 * @param options - Mock configuration options
 */
function setupFilesystemMocks(options: {
  rootPath?: string;
  configPath?: string;
  fileExists?: boolean;
}): void {
  const root = (options.rootPath ?? '/workspace') as Path;
  const config = (options.configPath ?? '/workspace/resist.config.ts') as Path;

  (findWorkspaceRoot as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: true,
    data: root,
  });
  (joinPath as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: true,
    data: config,
  });
  (pathExists as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: true,
    data: (options.fileExists ?? true) as Bool,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetConfig();
  vi.clearAllMocks();
});

describe('loadConfig', () => {
  it('returns cached singleton on subsequent calls', async () => {
    // Use setConfig to populate the singleton, then call loadConfig
    setConfig({ company: { name: 'Cached Corp' } } as Partial<CoreConfig>);
    const result1 = await loadConfig();
    const result2 = await loadConfig();

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.data.company.name).toBe('Cached Corp');
      expect(result2.data.company.name).toBe('Cached Corp');
    }
  });

  it('returns RUNTIME.UNSUPPORTED when nodePath is null', async () => {
    // Temporarily override the nodePath mock to return null
    const nodeImports = await import('@/utils/core/node-imports');
    const original = nodeImports.nodePath;
    // @ts-expect-error — overriding readonly for test
    nodeImports.nodePath = null;

    const result = await loadConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RUNTIME.UNSUPPORTED');
    }

    // Restore
    nodeImports.nodePath = original;
  });

  it('falls back to defaults when config file is missing and logs warning', async () => {
    setupFilesystemMocks({ fileExists: false });

    const result = await loadConfig();

    // Defaults should validate successfully (PortIncrementSchema allows 100)
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.company.name).toBe(defaults.company.name);
    }

    // log.warn should have been called about missing config file
    expect(log.warn).toHaveBeenCalledOnce();
    const warnMessage = (log.warn as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(warnMessage).toContain('not found');
    expect(warnMessage).toContain('resist.config.ts');
  });

  it('propagates findWorkspaceRoot error', async () => {
    (findWorkspaceRoot as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: { code: 'WORKSPACE.ROOT_NOT_FOUND', message: 'No workspace root' },
    });

    const result = await loadConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('WORKSPACE.ROOT_NOT_FOUND');
    }
  });

  it('propagates joinPath error', async () => {
    (findWorkspaceRoot as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: '/workspace',
    });
    (joinPath as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: { code: 'VALIDATION.SCHEMA_FAILED', message: 'Invalid path' },
    });

    const result = await loadConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('propagates pathExists error', async () => {
    (findWorkspaceRoot as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: '/workspace',
    });
    (joinPath as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: '/workspace/resist.config.ts',
    });
    (pathExists as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: { code: 'IO.STAT_FAILED', message: 'Stat failed' },
    });

    const result = await loadConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.STAT_FAILED');
    }
  });

  it('returns CONFIG.LOAD_FAILED when dynamic import throws', async () => {
    setupFilesystemMocks({ fileExists: true });

    // Mock the global import to throw — vi.mock doesn't help here since
    // loadConfig uses `await import(configPath)`. We need to test the error path.
    // Since we can't easily mock dynamic import(), we verify the error handling
    // via setConfig with invalid data instead.
    // This test verifies the error code pattern exists.
    const result = await loadConfig();

    // The dynamic import will fail because the path doesn't exist in test
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG.LOAD_FAILED');
    }
  });
});

describe('getConfig', () => {
  it('returns CONFIG.NOT_FOUND before loadConfig', () => {
    const result = getConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG.NOT_FOUND');
    }
  });

  it('returns cached config after setConfig', () => {
    setConfig({});
    const result = getConfig();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.company.name).toBe(defaults.company.name);
    }
  });

  it('returns config with merged values', () => {
    setConfig({ company: { name: 'Test Corp' } } as Partial<CoreConfig>);
    const result = getConfig();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.company.name).toBe('Test Corp');
      // Other defaults preserved
      expect(result.data.defaultLocale).toBe('en');
    }
  });
});

describe('resetConfig', () => {
  it('clears singleton and returns ok', () => {
    setConfig({});
    const resetResult: Result<Void> = resetConfig();
    expect(resetResult.ok).toBe(true);
  });

  it('getConfig returns NOT_FOUND after reset', () => {
    setConfig({});
    expect(getConfig().ok).toBe(true);

    resetConfig();
    const result = getConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG.NOT_FOUND');
    }
  });
});

describe('setConfig', () => {
  it('merges partial config over defaults', () => {
    const result = setConfig({
      company: { name: 'Acme Inc' },
    } as Partial<CoreConfig>);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // User override
      expect(result.data.company.name).toBe('Acme Inc');
      // Defaults preserved
      expect(result.data.company.domain).toBe('example.com');
      expect(result.data.defaultLocale).toBe('en');
    }
  });

  it('returns CONFIG.INVALID for invalid config shape', () => {
    const result = setConfig({
      environment: 12_345 as unknown as string,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG.INVALID');
    }
  });

  it('frozen result is accessible via getConfig', () => {
    setConfig({ company: { name: 'Frozen Corp' } } as Partial<CoreConfig>);
    const result = getConfig();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.company.name).toBe('Frozen Corp');
    }
  });
});

describe('configExists', () => {
  it('returns false when nodePath is null', async () => {
    const nodeImports = await import('@/utils/core/node-imports');
    const original = nodeImports.nodePath;
    // @ts-expect-error — overriding readonly for test
    nodeImports.nodePath = null;

    const result: Result<Bool> = configExists();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }

    nodeImports.nodePath = original;
  });

  it('returns true when config file exists on disk', () => {
    setupFilesystemMocks({ fileExists: true });
    const result: Result<Bool> = configExists();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('propagates joinPath error', () => {
    (findWorkspaceRoot as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: '/workspace',
    });
    (joinPath as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: { code: 'VALIDATION.SCHEMA_FAILED', message: 'Invalid path' },
    });

    const result: Result<Bool> = configExists();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('propagates workspace root error', () => {
    (findWorkspaceRoot as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: { code: 'WORKSPACE.NOT_FOUND', message: 'No root' },
    });

    const result: Result<Bool> = configExists();
    expect(result.ok).toBe(false);
  });
});

describe('defineConfig', () => {
  it('returns validated config for valid input', () => {
    const input: Partial<CoreConfig> = {};
    const output = defineConfig(input);
    expect(output).toEqual(input);
  });

  it('throws for invalid config shape', () => {
    const input = { company: { name: 'Test' } } as Partial<CoreConfig>;
    expect(() => defineConfig(input)).toThrow();
  });
});

describe('defineProductConfig', () => {
  it('returns validated config for valid input', () => {
    const input = {
      id: 'test-product',
      name: 'Test Product',
      layers: { api: true, app: true, marketing: true, status: true, assets: true },
    };
    const output = defineProductConfig(input as never);
    expect(output).toMatchObject(input);
  });

  it('throws for invalid config shape', () => {
    const input = { id: 'x', name: '' };
    expect(() => defineProductConfig(input as never)).toThrow();
  });
});
