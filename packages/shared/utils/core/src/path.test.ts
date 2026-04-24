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

  it('returns IO.READ_FAILED when process.cwd() throws', () => {
    const orig = process.cwd;
    process.cwd = (): string => {
      throw new Error('cwd inaccessible');
    };
    try {
      const result: Result<Path> = cwd();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('IO.READ_FAILED');
      }
    } finally {
      process.cwd = orig;
    }
  });

  it('returns RUNTIME.UNSUPPORTED when process is unavailable', () => {
    const original = globalThis.process;
    // @ts-expect-error — simulating non-Node environment
    globalThis.process = undefined;
    try {
      const result: Result<Path> = cwd();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toContain('RUNTIME');
      }
    } finally {
      globalThis.process = original;
    }
  });
});

// ── joinPath ────────────────────────────────────────────────────────────

describe('joinPath', () => {
  it('joins path segments', () => {
    const result: Result<Path> = joinPath(['/app', 'src', 'index.ts'] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('/app/src/index.ts');
    }
  });

  it('returns validation error for non-array input', () => {
    const result: Result<Path> = joinPath('not-an-array' as unknown as PathArray);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns empty-string path for empty array', () => {
    // path.join() with no args returns '.'
    const result: Result<Path> = joinPath([] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('.');
    }
  });

  it('joins three segments including empty middle segment', () => {
    const result: Result<Path> = joinPath(['/a', '', 'b'] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('/a/b');
    }
  });
});

// ── pathExists ──────────────────────────────────────────────────────────

describe('pathExists', () => {
  it('returns true for existing path', () => {
    const result: Result<Bool> = pathExists(process.cwd() as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns false for nonexistent path', () => {
    const result: Result<Bool> = pathExists('/nonexistent/path/abc123' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('returns validation error for empty path', () => {
    const result: Result<Bool> = pathExists('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
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

  it('returns validation error for empty url', () => {
    const result: Result<Path> = getDirFromImportMeta('' as UrlString);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns IO.READ_FAILED for non-file URL', () => {
    // http:// URLs are valid URL strings but fileURLToPath rejects them
    const result: Result<Path> = getDirFromImportMeta('http://example.com/a.js' as UrlString);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.READ_FAILED');
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

  it('returns validation error for empty path', () => {
    const result: Result<UrlString> = getFileUrl('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── toRelativePath ──────────────────────────────────────────────────────

describe('toRelativePath', () => {
  it('converts absolute path within cwd to relative', () => {
    const cwdResult = cwd();
    if (!cwdResult.ok) {
      throw new Error('cwd failed');
    }
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

  it('returns validation error for empty path', () => {
    const result: Result<Path> = toRelativePath('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns original path when relative equals empty (cwd itself)', () => {
    const cwdResult = cwd();
    if (!cwdResult.ok) {
      throw new Error('cwd failed');
    }
    const result: Result<Path> = toRelativePath(cwdResult.data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(cwdResult.data);
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

  it('returns validation error for non-array input', () => {
    const result: Result<Path> = resolvePath('not-array' as unknown as PathArray);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('resolves to cwd when empty array', () => {
    const result: Result<Path> = resolvePath([] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(process.cwd());
    }
  });

  it('resolves relative segments against cwd', () => {
    const result: Result<Path> = resolvePath(['foo', 'bar'] as PathArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(`${process.cwd()}/foo/bar`);
    }
  });
});

// ── getFileExtension ────────────────────────────────────────────────────

describe('getFileExtension', () => {
  it('extracts file extension', () => {
    const result: Result<Str> = getFileExtension('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('.ts');
    }
  });

  it('returns empty string for no extension', () => {
    const result: Result<Str> = getFileExtension('/app/Makefile' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('');
    }
  });

  it('returns validation error for empty path', () => {
    const result: Result<Str> = getFileExtension('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns last extension for multi-dot filename', () => {
    const result: Result<Str> = getFileExtension('/a/archive.tar.gz' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('.gz');
    }
  });
});

// ── getBasename ─────────────────────────────────────────────────────────

describe('getBasename', () => {
  it('extracts filename', () => {
    const result: Result<Str> = getBasename('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('index.ts');
    }
  });

  it('strips extension when provided', () => {
    const result: Result<Str> = getBasename('/app/src/index.ts' as Path, '.ts' as Str);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('index');
    }
  });

  it('returns validation error for empty path', () => {
    const result: Result<Str> = getBasename('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for non-string extension', () => {
    const result: Result<Str> = getBasename('/a/b.ts' as Path, 42 as unknown as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns filename unchanged when ext does not match', () => {
    const result: Result<Str> = getBasename('/a/index.ts' as Path, '.js' as Str);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('index.ts');
    }
  });
});

// ── getDirname ──────────────────────────────────────────────────────────

describe('getDirname', () => {
  it('extracts parent directory', () => {
    const result: Result<Path> = getDirname('/app/src/index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('/app/src');
    }
  });

  it('returns validation error for empty path', () => {
    const result: Result<Path> = getDirname('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns "." for plain filename', () => {
    const result: Result<Path> = getDirname('index.ts' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('.');
    }
  });
});

// ── getTempDir ──────────────────────────────────────────────────────────

describe('getTempDir', () => {
  it('returns system temp directory', () => {
    const result: Result<Path> = getTempDir();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
    }
  });
});

// ── getHomedir ──────────────────────────────────────────────────────────

describe('getHomedir', () => {
  it('returns home directory', () => {
    const result: Result<Path> = getHomedir();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
    }
  });
});
