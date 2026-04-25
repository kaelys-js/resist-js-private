/**
 * Tests for git metadata utilities.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Str, Bool, Path } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

// ---------------------------------------------------------------------------
// Helpers — mock Result constructors
// ---------------------------------------------------------------------------

/**
 * Helper to create a success Result.
 *
 * @param data - Value to wrap in a success Result.
 * @returns A frozen Result containing the data.
 */
function mockOk<T>(data: T): Result<T> {
  return Object.freeze({ ok: true as const, data, error: null }) as Result<T>;
}

/**
 * Helper to create a failure Result.
 *
 * @param code - Error code for the failure Result.
 * @returns A frozen Result containing the error.
 */
function mockErr(code: Str): Result<never> {
  return Object.freeze({
    ok: false as const,
    data: null,
    error: Object.freeze({ code, message: code, meta: {} }),
  }) as Result<never>;
}

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

const execSyncSafeMock = vi.fn((_cmd: Str): Result<Str> => mockOk(''));
const readFileMock = vi.fn((_path: Str): Result<Str> => mockOk('{}'));
const parseJsonWithCommentsMock = vi.fn(
  (_content: Str): Result<Record<Str, unknown>> => mockOk({}),
);
const joinPathMock = vi.fn((_a: Str, _b: Str): Result<Str> => mockOk(''));

vi.mock('@/utils/core/shell', () => ({
  execSyncSafe: (...args: unknown[]): Result<Str> => execSyncSafeMock(...(args as [Str])),
}));

vi.mock('@/utils/core/fs', () => ({
  readFile: (...args: unknown[]): Result<Str> => readFileMock(...(args as [Str])),
  parseJsonWithComments: (...args: unknown[]): Result<Record<Str, unknown>> =>
    parseJsonWithCommentsMock(...(args as [Str])),
}));

vi.mock('@/utils/core/path', () => ({
  joinPath: (...args: unknown[]): Result<Str> => joinPathMock(...(args as [Str, Str])),
}));

// Must import after mocks
const {
  getGitCommitShort,
  getGitCommitFull,
  getGitBranch,
  getGitDirty,
  getGitInfo,
  getPackageVersion,
} = await import('./git');

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getGitCommitShort ───────────────────────────────────────────────────

describe('getGitCommitShort', () => {
  it('returns trimmed 7-char hash on success', () => {
    execSyncSafeMock.mockReturnValue(mockOk('a1b2c3d'));
    const result: Result<Str> = getGitCommitShort();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('a1b2c3d');
    }
  });

  it('propagates error on failure', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Str> = getGitCommitShort();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });
});

// ── getGitCommitFull ────────────────────────────────────────────────────

describe('getGitCommitFull', () => {
  it('returns trimmed 40-char hash on success', () => {
    execSyncSafeMock.mockReturnValue(mockOk('abc1234def5678901234567890abcdef12345678'));
    const result: Result<Str> = getGitCommitFull();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('abc1234def5678901234567890abcdef12345678');
    }
  });

  it('propagates error on failure', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Str> = getGitCommitFull();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });
});

// ── getGitBranch ────────────────────────────────────────────────────────

describe('getGitBranch', () => {
  it('returns trimmed branch name on success', () => {
    execSyncSafeMock.mockReturnValue(mockOk('main'));
    const result: Result<Str> = getGitBranch();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('main');
    }
  });

  it('propagates error on failure', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Str> = getGitBranch();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });
});

// ── getGitDirty ─────────────────────────────────────────────────────────

describe('getGitDirty', () => {
  it('returns false when git status --porcelain is empty', () => {
    execSyncSafeMock.mockReturnValue(mockOk(''));
    const result: Result<Bool> = getGitDirty();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('returns true when git status --porcelain has output', () => {
    execSyncSafeMock.mockReturnValue(mockOk(' M src/file.ts\n'));
    const result: Result<Bool> = getGitDirty();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('propagates error when git fails', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Bool> = getGitDirty();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });
});

// ── getGitInfo ──────────────────────────────────────────────────────────

describe('getGitInfo', () => {
  it('returns all 4 fields combined', () => {
    let callCount = 0;
    execSyncSafeMock.mockImplementation((): Result<Str> => {
      callCount++;
      switch (callCount) {
        case 1: {
          return mockOk('a1b2c3d'); // short
        }
        case 2: {
          return mockOk('abc1234def5678901234567890abcdef12345678'); // full
        }
        case 3: {
          return mockOk('main'); // branch
        }
        case 4: {
          return mockOk(''); // porcelain
        }
        default: {
          return mockOk('');
        }
      }
    });

    const result = getGitInfo();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.commit).toBe('a1b2c3d');
      expect(result.data.commitFull).toBe('abc1234def5678901234567890abcdef12345678');
      expect(result.data.branch).toBe('main');
      expect(result.data.dirty).toBe(false);
    }
  });

  it('propagates first error', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result = getGitInfo();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });

  it('propagates getGitCommitFull failure (after short succeeds)', () => {
    let callCount = 0;
    execSyncSafeMock.mockImplementation((): Result<Str> => {
      callCount++;
      if (callCount === 1) return mockOk('a1b2c3d');
      return mockErr('IO.EXEC_FAILED');
    });
    const result = getGitInfo();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });

  it('propagates getGitBranch failure (after short+full succeed)', () => {
    let callCount = 0;
    execSyncSafeMock.mockImplementation((): Result<Str> => {
      callCount++;
      if (callCount === 1) return mockOk('a1b2c3d');
      if (callCount === 2) return mockOk('abc1234def5678901234567890abcdef12345678');
      return mockErr('IO.EXEC_FAILED');
    });
    const result = getGitInfo();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });

  it('propagates getGitDirty failure (after short+full+branch succeed)', () => {
    let callCount = 0;
    execSyncSafeMock.mockImplementation((): Result<Str> => {
      callCount++;
      if (callCount === 1) return mockOk('a1b2c3d');
      if (callCount === 2) return mockOk('abc1234def5678901234567890abcdef12345678');
      if (callCount === 3) return mockOk('main');
      return mockErr('IO.EXEC_FAILED');
    });
    const result = getGitInfo();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });
});

// ── getPackageVersion ───────────────────────────────────────────────────

describe('getPackageVersion', () => {
  it('reads and returns version', () => {
    readFileMock.mockReturnValue(mockOk('{"version":"1.2.3"}'));
    parseJsonWithCommentsMock.mockReturnValue(mockOk({ version: '1.2.3' }));

    const result: Result<Str> = getPackageVersion('./package.json' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1.2.3');
    }
  });

  it('handles missing version field', () => {
    readFileMock.mockReturnValue(mockOk('{"name":"pkg"}'));
    parseJsonWithCommentsMock.mockReturnValue(mockOk({ name: 'pkg' }));

    const result: Result<Str> = getPackageVersion('./package.json' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG.INVALID');
    }
  });

  it('propagates read errors', () => {
    readFileMock.mockReturnValue(mockErr('IO.READ_FAILED'));

    const result: Result<Str> = getPackageVersion('./package.json' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.READ_FAILED');
    }
  });

  it('returns validation error for invalid (empty) path', () => {
    const result: Result<Str> = getPackageVersion('' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('propagates parse errors after a successful read', () => {
    readFileMock.mockReturnValue(mockOk('not-json{'));
    parseJsonWithCommentsMock.mockReturnValue(mockErr('IO.PARSE_FAILED'));

    const result: Result<Str> = getPackageVersion('./package.json' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.PARSE_FAILED');
    }
  });
});
