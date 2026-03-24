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

/** Helper to create a success Result. */
function mockOk<T>(data: T): Result<T> {
  return Object.freeze({ ok: true as const, data, error: null }) as Result<T>;
}

/** Helper to create a failure Result. */
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

const execSyncSafeMock = vi.fn((): Result<Str> => mockOk(''));
const readFileMock = vi.fn((): Result<Str> => mockOk('{}'));
const parseJsonWithCommentsMock = vi.fn((): Result<Record<Str, unknown>> => mockOk({}));
const joinPathMock = vi.fn((): Result<Str> => mockOk(''));

vi.mock('@/utils/core/shell', () => ({
  execSyncSafe: (...args: unknown[]): Result<Str> => execSyncSafeMock(...args),
}));

vi.mock('@/utils/core/fs', () => ({
  readFile: (...args: unknown[]): Result<Str> => readFileMock(...args),
  parseJsonWithComments: (...args: unknown[]): Result<Record<Str, unknown>> =>
    parseJsonWithCommentsMock(...args),
}));

vi.mock('@/utils/core/path', () => ({
  joinPath: (...args: unknown[]): Result<Str> => joinPathMock(...args),
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
    if (result.ok) expect(result.data).toBe('a1b2c3d');
  });

  it('propagates error on failure', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Str> = getGitCommitShort();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });
});

// ── getGitCommitFull ────────────────────────────────────────────────────

describe('getGitCommitFull', () => {
  it('returns trimmed 40-char hash on success', () => {
    execSyncSafeMock.mockReturnValue(mockOk('abc1234def5678901234567890abcdef12345678'));
    const result: Result<Str> = getGitCommitFull();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('abc1234def5678901234567890abcdef12345678');
  });

  it('propagates error on failure', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Str> = getGitCommitFull();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });
});

// ── getGitBranch ────────────────────────────────────────────────────────

describe('getGitBranch', () => {
  it('returns trimmed branch name on success', () => {
    execSyncSafeMock.mockReturnValue(mockOk('main'));
    const result: Result<Str> = getGitBranch();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('main');
  });

  it('propagates error on failure', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Str> = getGitBranch();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });
});

// ── getGitDirty ─────────────────────────────────────────────────────────

describe('getGitDirty', () => {
  it('returns false when git status --porcelain is empty', () => {
    execSyncSafeMock.mockReturnValue(mockOk(''));
    const result: Result<Bool> = getGitDirty();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });

  it('returns true when git status --porcelain has output', () => {
    execSyncSafeMock.mockReturnValue(mockOk(' M src/file.ts\n'));
    const result: Result<Bool> = getGitDirty();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('propagates error when git fails', () => {
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    const result: Result<Bool> = getGitDirty();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });
});

// ── getGitInfo ──────────────────────────────────────────────────────────

describe('getGitInfo', () => {
  it('returns all 4 fields combined', () => {
    let callCount = 0;
    execSyncSafeMock.mockImplementation((): Result<Str> => {
      callCount++;
      switch (callCount) {
        case 1:
          return mockOk('a1b2c3d'); // short
        case 2:
          return mockOk('abc1234def5678901234567890abcdef12345678'); // full
        case 3:
          return mockOk('main'); // branch
        case 4:
          return mockOk(''); // porcelain
        default:
          return mockOk('');
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
    if (result.ok) expect(result.data).toBe('1.2.3');
  });

  it('handles missing version field', () => {
    readFileMock.mockReturnValue(mockOk('{"name":"pkg"}'));
    parseJsonWithCommentsMock.mockReturnValue(mockOk({ name: 'pkg' }));

    const result: Result<Str> = getPackageVersion('./package.json' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFIG.INVALID');
  });

  it('propagates read errors', () => {
    readFileMock.mockReturnValue(mockErr('IO.READ_FAILED'));

    const result: Result<Str> = getPackageVersion('./package.json' as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.READ_FAILED');
  });
});
