/**
 * Tests for runtime guards across fs, path, network modules.
 *
 * Covers `if (!module) return requireRuntime(...)` branches by mocking
 * `@/utils/core/node-imports` to return `undefined` for all Node modules
 * and `@/utils/core/environment`'s `getProcess` to return `undefined`.
 *
 * Isolated from each module's main test file so the happy-path tests
 * there continue to exercise real Node APIs.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type * as Environment from '@/utils/core/environment';

// ── Mock node-imports BEFORE importing target modules ───────────────────
vi.mock('@/utils/core/node-imports', () => ({
  nodeFs: undefined,
  nodePath: undefined,
  nodeNet: undefined,
  nodeOs: undefined,
  nodeUrl: undefined,
  nodeChildProcess: undefined,
}));

// ── Mock environment.getProcess to return undefined ─────────────────────
vi.mock('@/utils/core/environment', async () => {
  const actual = await vi.importActual<typeof Environment>('@/utils/core/environment');

  return {
    ...actual,
    getProcess: () => {
      /* returns undefined to simulate non-Node runtime */
    },
  };
});

// Must import after mocks
const fs = await import('./fs');
const path = await import('./path');
const network = await import('./network');

// ── fs.ts runtime guards ────────────────────────────────────────────────

describe('fs runtime guards', () => {
  it('readFile returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.readFile('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('writeFile returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.writeFile('/tmp/x' as never, 'content' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('deleteFile returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.deleteFile('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('mkdirRecursive returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.mkdirRecursive('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('ensureDir returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.ensureDir('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('copyDir returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.copyDir('/tmp/src' as never, '/tmp/dst' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('readDir returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.readDir('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('isDirectory returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.isDirectory('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getFileMtimeMs returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = fs.getFileMtimeMs('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });
});

// ── path.ts runtime guards ──────────────────────────────────────────────

describe('path runtime guards', () => {
  it('cwd returns RUNTIME.UNSUPPORTED when process undefined', () => {
    const r = path.cwd();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('joinPath returns RUNTIME.UNSUPPORTED when nodePath undefined', () => {
    const r = path.joinPath(['/tmp', 'x'] as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('pathExists returns RUNTIME.UNSUPPORTED when nodeFs undefined', () => {
    const r = path.pathExists('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getDirFromImportMeta returns RUNTIME.UNSUPPORTED when nodeUrl undefined', () => {
    const r = path.getDirFromImportMeta('file:///tmp/x.ts' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('toRelativePath returns RUNTIME.UNSUPPORTED when process undefined', () => {
    const r = path.toRelativePath('/tmp/x' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('resolvePath returns RUNTIME.UNSUPPORTED when nodePath undefined', () => {
    const r = path.resolvePath(['/tmp', 'x'] as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getFileExtension returns RUNTIME.UNSUPPORTED when nodePath undefined', () => {
    const r = path.getFileExtension('/tmp/x.ts' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getBasename returns RUNTIME.UNSUPPORTED when nodePath undefined', () => {
    const r = path.getBasename('/tmp/x.ts' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getDirname returns RUNTIME.UNSUPPORTED when nodePath undefined', () => {
    const r = path.getDirname('/tmp/x.ts' as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getTempDir returns RUNTIME.UNSUPPORTED when nodeOs undefined', () => {
    const r = path.getTempDir();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getHomedir returns RUNTIME.UNSUPPORTED when nodeOs undefined', () => {
    const r = path.getHomedir();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });
});

// ── network.ts runtime guards ───────────────────────────────────────────

describe('network runtime guards', () => {
  it('isPortAvailable returns RUNTIME.UNSUPPORTED when nodeNet undefined', async () => {
    const r = await network.isPortAvailable(3000 as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('findAvailablePort returns RUNTIME.UNSUPPORTED when nodeNet undefined', async () => {
    const r = await network.findAvailablePort(3000 as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('isPortAvailableSync returns RUNTIME.UNSUPPORTED when nodeNet undefined', () => {
    const r = network.isPortAvailableSync(3000 as never);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getLocalIpAddresses returns RUNTIME.UNSUPPORTED when nodeOs undefined', () => {
    const r = network.getLocalIpAddresses();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('getLocalHostname returns RUNTIME.UNSUPPORTED when nodeOs undefined', () => {
    const r = network.getLocalHostname();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });
});
