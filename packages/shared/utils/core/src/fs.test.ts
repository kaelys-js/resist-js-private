/**
 * Tests for file system utilities.
 *
 * @module
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Bool, NonNegativeNumber, Path, Str, StrArray, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { FileContent } from './fs.schemas';
import {
  readFile,
  writeFile,
  deleteFile,
  mkdirRecursive,
  ensureDir,
  copyDir,
  readDir,
  isDirectory,
  getFileMtimeMs,
  parseJsonWithComments,
} from './fs';

// ── Test directory setup ────────────────────────────────────────────────

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `fs-test-${crypto.randomUUID()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

// ── readFile ────────────────────────────────────────────────────────────

describe('readFile', () => {
  it('reads file contents successfully', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'hello world', 'utf-8');

    const result: Result<FileContent> = readFile(filePath as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('hello world');
  });

  it('returns IO.READ_FAILED for nonexistent path', () => {
    const result: Result<FileContent> = readFile(join(testDir, 'nonexistent.txt') as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.READ_FAILED');
  });

  it('returns validation error for empty path', () => {
    const result: Result<FileContent> = readFile('' as Path);
    expect(result.ok).toBe(false);
  });
});

// ── writeFile ───────────────────────────────────────────────────────────

describe('writeFile', () => {
  it('writes content to file', () => {
    const filePath = join(testDir, 'output.txt');
    const result: Result<Void> = writeFile(filePath as Path, 'written content' as FileContent);
    expect(result.ok).toBe(true);

    // Verify by reading back
    const readResult: Result<FileContent> = readFile(filePath as Path);
    expect(readResult.ok).toBe(true);
    if (readResult.ok) expect(readResult.data).toBe('written content');
  });

  it('returns IO.WRITE_FAILED for invalid directory', () => {
    const result: Result<Void> = writeFile(
      '/nonexistent/dir/file.txt' as Path,
      'content' as FileContent,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.WRITE_FAILED');
  });
});

// ── deleteFile ──────────────────────────────────────────────────────────

describe('deleteFile', () => {
  it('deletes existing file', () => {
    const filePath = join(testDir, 'to-delete.txt');
    writeFileSync(filePath, 'delete me', 'utf-8');

    const result: Result<Void> = deleteFile(filePath as Path);
    expect(result.ok).toBe(true);

    // Verify deleted
    const readResult: Result<FileContent> = readFile(filePath as Path);
    expect(readResult.ok).toBe(false);
  });

  it('returns ok for nonexistent file (idempotent ENOENT)', () => {
    const result: Result<Void> = deleteFile(join(testDir, 'nonexistent.txt') as Path);
    expect(result.ok).toBe(true);
  });

  it('returns IO.DELETE_FAILED for directory (not a file)', () => {
    const dirPath = join(testDir, 'subdir');
    mkdirSync(dirPath);

    const result: Result<Void> = deleteFile(dirPath as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.DELETE_FAILED');
  });
});

// ── mkdirRecursive ──────────────────────────────────────────────────────

describe('mkdirRecursive', () => {
  it('creates nested directories', () => {
    const nestedPath = join(testDir, 'a', 'b', 'c');
    const result: Result<Void> = mkdirRecursive(nestedPath as Path);
    expect(result.ok).toBe(true);

    const checkResult: Result<Bool> = isDirectory(nestedPath as Path);
    expect(checkResult.ok).toBe(true);
    if (checkResult.ok) expect(checkResult.data).toBe(true);
  });
});

// ── ensureDir ───────────────────────────────────────────────────────────

describe('ensureDir', () => {
  it('creates directory for directory path', () => {
    const dirPath = join(testDir, 'ensured');
    const result: Result<Void> = ensureDir(dirPath as Path);
    expect(result.ok).toBe(true);

    const checkResult: Result<Bool> = isDirectory(dirPath as Path);
    expect(checkResult.ok).toBe(true);
    if (checkResult.ok) expect(checkResult.data).toBe(true);
  });

  it('creates parent directory for file-like path', () => {
    const filePath = join(testDir, 'parent', 'output.json');
    const result: Result<Void> = ensureDir(filePath as Path);
    expect(result.ok).toBe(true);

    // Parent should exist, not the file itself
    const parentPath = join(testDir, 'parent');
    const checkResult: Result<Bool> = isDirectory(parentPath as Path);
    expect(checkResult.ok).toBe(true);
    if (checkResult.ok) expect(checkResult.data).toBe(true);
  });
});

// ── copyDir ─────────────────────────────────────────────────────────────

describe('copyDir', () => {
  it('copies directory recursively', () => {
    const srcDir = join(testDir, 'src-copy');
    mkdirSync(srcDir);
    writeFileSync(join(srcDir, 'file.txt'), 'copied content', 'utf-8');

    const destDir = join(testDir, 'dest-copy');
    const result: Result<Void> = copyDir(srcDir as Path, destDir as Path);
    expect(result.ok).toBe(true);

    const readResult: Result<FileContent> = readFile(join(destDir, 'file.txt') as Path);
    expect(readResult.ok).toBe(true);
    if (readResult.ok) expect(readResult.data).toBe('copied content');
  });

  it('returns IO.COPY_FAILED for nonexistent src', () => {
    const result: Result<Void> = copyDir(
      join(testDir, 'nonexistent-src') as Path,
      join(testDir, 'dest') as Path,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.COPY_FAILED');
  });
});

// ── readDir ─────────────────────────────────────────────────────────────

describe('readDir', () => {
  it('reads directory entries', () => {
    writeFileSync(join(testDir, 'a.txt'), 'a', 'utf-8');
    writeFileSync(join(testDir, 'b.txt'), 'b', 'utf-8');

    const result: Result<StrArray> = readDir(testDir as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('a.txt');
      expect(result.data).toContain('b.txt');
    }
  });

  it('returns IO.READDIR_FAILED for nonexistent path', () => {
    const result: Result<StrArray> = readDir(join(testDir, 'nonexistent') as Path);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.READDIR_FAILED');
  });
});

// ── isDirectory ─────────────────────────────────────────────────────────

describe('isDirectory', () => {
  it('returns true for directory', () => {
    const result: Result<Bool> = isDirectory(testDir as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('returns false for nonexistent path', () => {
    const result: Result<Bool> = isDirectory(join(testDir, 'nonexistent') as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});

// ── getFileMtimeMs ──────────────────────────────────────────────────────

describe('getFileMtimeMs', () => {
  it('returns modification time for existing file', () => {
    const filePath = join(testDir, 'mtime.txt');
    writeFileSync(filePath, 'content', 'utf-8');

    const result: Result<NonNegativeNumber> = getFileMtimeMs(filePath as Path);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeGreaterThan(0);
  });
});

// ── parseJsonWithComments ───────────────────────────────────────────────

describe('parseJsonWithComments', () => {
  it('parses JSON with single-line comments stripped', () => {
    const content = `{
  // This is a comment
  "name": "test",
  // Another comment
  "value": 42
}`;
    const result = parseJsonWithComments<{ name: string; value: number }>(content as FileContent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('test');
      expect(result.data.value).toBe(42);
    }
  });

  it('returns INVALID_FORMAT for malformed JSON', () => {
    const result = parseJsonWithComments('not json {{{' as FileContent);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION.INVALID_FORMAT');
  });
});
