/**
 * Tests for path utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Bool, Path, PathArray, Str, UrlString } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  cwd,
  joinPath,
  pathExists,
  getDirFromImportMeta,
  getFileUrl,
  toRelativePath,
  resolvePath,
  getFileExtension,
  getBasename,
  getDirname,
  getTempDir,
  getHomedir,
} from './path';

// ── cwd ─────────────────────────────────────────────────────────────────

describe('cwd', () => {
  it('returns current working directory', () => {
    const result: Result<Path> = cwd();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data).toContain('/');
    }
  });
});

// ── joinPath ────────────────────────────────────────────────────────────

describe('joinPath', () => {
  it('joins path segments', () => {
    const result: Result<Path> = joinPath(['/app', 'src', 'index.ts'] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('/app/src/index.ts');
  });

  it('returns validation error for non-array input', () => {
    const result: Result<Path> = joinPath('not-an-array' as unknown as PathArray);
    expect(result.ok).toBe(false);
  });
});

// ── pathExists ──────────────────────────────────────────────────────────

describe('pathExists', () => {
  it('returns true for existing path', () => {
    const result: Result<Bool> = pathExists(process.cwd() as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('returns false for nonexistent path', () => {
    const result: Result<Bool> = pathExists('/nonexistent/path/abc123' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});

// ── getDirFromImportMeta ────────────────────────────────────────────────

describe('getDirFromImportMeta', () => {
  it('converts import.meta.url to directory path', () => {
    const result: Result<Path> = getDirFromImportMeta(import.meta.url as UrlString);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('packages/shared/utils/core/src');
    }
  });
});

// ── getFileUrl ──────────────────────────────────────────────────────────

describe('getFileUrl', () => {
  it('converts path to file:// URL', () => {
    const result: Result<UrlString> = getFileUrl('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('file:///app/src/index.ts');
    }
  });
});

// ── toRelativePath ──────────────────────────────────────────────────────

describe('toRelativePath', () => {
  it('converts absolute path within cwd to relative', () => {
    const cwdResult = cwd();
    if (!cwdResult.ok) throw new Error('cwd failed');
    const abs = `${cwdResult.data}/src/test.ts` as Path;
    const result: Result<Path> = toRelativePath(abs);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('src/test.ts');
      expect(result.data).not.toContain(cwdResult.data);
    }
  });

  it('returns absolute path when outside cwd', () => {
    const result: Result<Path> = toRelativePath('/completely/different/path' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('/completely/different/path');
    }
  });
});

// ── resolvePath ─────────────────────────────────────────────────────────

describe('resolvePath', () => {
  it('resolves segments to absolute path', () => {
    const result: Result<Path> = resolvePath(['/app', 'src', 'index.ts'] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('/app/src/index.ts');
    }
  });
});

// ── getFileExtension ────────────────────────────────────────────────────

describe('getFileExtension', () => {
  it('extracts file extension', () => {
    const result: Result<Str> = getFileExtension('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('.ts');
  });

  it('returns empty string for no extension', () => {
    const result: Result<Str> = getFileExtension('/app/Makefile' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('');
  });
});

// ── getBasename ─────────────────────────────────────────────────────────

describe('getBasename', () => {
  it('extracts filename', () => {
    const result: Result<Str> = getBasename('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('index.ts');
  });

  it('strips extension when provided', () => {
    const result: Result<Str> = getBasename('/app/src/index.ts' as Path, '.ts' as Str);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('index');
  });
});

// ── getDirname ──────────────────────────────────────────────────────────

describe('getDirname', () => {
  it('extracts parent directory', () => {
    const result: Result<Path> = getDirname('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('/app/src');
  });
});

// ── getTempDir ──────────────────────────────────────────────────────────

describe('getTempDir', () => {
  it('returns system temp directory', () => {
    const result: Result<Path> = getTempDir();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
  });
});

// ── getHomedir ──────────────────────────────────────────────────────────

describe('getHomedir', () => {
  it('returns home directory', () => {
    const result: Result<Path> = getHomedir();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
  });
});
