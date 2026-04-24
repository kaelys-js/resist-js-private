/**
 * Tests for temp-directory utilities.
 *
 * @module
 */

import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTempDir, useTempDir } from './temp-dir';

describe('temp-dir', () => {
  describe('createTempDir', () => {
    it('returns an absolute path inside os.tmpdir()', () => {
      const dir = createTempDir();
      try {
        expect(path.isAbsolute(dir.path)).toBe(true);
        expect(dir.path.startsWith(tmpdir())).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('uses the default "test-" prefix when none is provided', () => {
      const dir = createTempDir();
      try {
        const base: string = path.basename(dir.path);
        expect(base.startsWith('test-')).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('uses a custom prefix when provided', () => {
      const dir = createTempDir('custom-prefix-');
      try {
        const base: string = path.basename(dir.path);
        expect(base.startsWith('custom-prefix-')).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('creates a unique directory on each call', () => {
      const a = createTempDir();
      const b = createTempDir();
      try {
        expect(a.path).not.toBe(b.path);
      } finally {
        a.cleanup();
        b.cleanup();
      }
    });

    it('write returns the absolute path and creates the file', () => {
      const dir = createTempDir();
      try {
        const full: string = dir.write('file.txt', 'hello');
        expect(full).toBe(path.join(dir.path, 'file.txt'));
        expect(existsSync(full)).toBe(true);
        expect(dir.read('file.txt')).toBe('hello');
      } finally {
        dir.cleanup();
      }
    });

    it('write auto-creates parent directories when they do not exist', () => {
      const dir = createTempDir();
      try {
        const full: string = dir.write('a/b/c/nested.txt', 'contents');
        expect(existsSync(full)).toBe(true);
        expect(existsSync(path.join(dir.path, 'a', 'b', 'c'))).toBe(true);
        expect(dir.read('a/b/c/nested.txt')).toBe('contents');
      } finally {
        dir.cleanup();
      }
    });

    it('write skips mkdir when parent directory already exists', () => {
      const dir = createTempDir();
      try {
        /* First write creates the parent; second write should take the else branch. */
        dir.write('shared/first.txt', 'one');
        const full: string = dir.write('shared/second.txt', 'two');
        expect(existsSync(full)).toBe(true);
        expect(dir.read('shared/second.txt')).toBe('two');
        expect(dir.read('shared/first.txt')).toBe('one');
      } finally {
        dir.cleanup();
      }
    });

    it('write skips mkdir for files at the temp-dir root', () => {
      const dir = createTempDir();
      try {
        /* Parent is dir.path which already exists. */
        const full: string = dir.write('top.txt', 'x');
        expect(existsSync(full)).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('mkdir creates a directory recursively and returns the absolute path', () => {
      const dir = createTempDir();
      try {
        const full: string = dir.mkdir('deep/nested/dir');
        expect(full).toBe(path.join(dir.path, 'deep/nested/dir'));
        expect(existsSync(full)).toBe(true);
        expect(statSync(full).isDirectory()).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('mkdir is idempotent for existing directories', () => {
      const dir = createTempDir();
      try {
        dir.mkdir('already');
        expect((): void => {
          dir.mkdir('already');
        }).not.toThrow();
      } finally {
        dir.cleanup();
      }
    });

    it('resolve joins variadic segments onto the temp-dir path', () => {
      const dir = createTempDir();
      try {
        expect(dir.resolve('a', 'b', 'c.txt')).toBe(path.join(dir.path, 'a', 'b', 'c.txt'));
      } finally {
        dir.cleanup();
      }
    });

    it('resolve with no segments returns the temp-dir path itself', () => {
      const dir = createTempDir();
      try {
        expect(dir.resolve()).toBe(dir.path);
      } finally {
        dir.cleanup();
      }
    });

    it('read returns UTF-8 file contents', () => {
      const dir = createTempDir();
      try {
        dir.write('u.txt', 'héllo — unicode');
        expect(dir.read('u.txt')).toBe('héllo — unicode');
      } finally {
        dir.cleanup();
      }
    });

    it('read throws when the file does not exist', () => {
      const dir = createTempDir();
      try {
        expect((): string => dir.read('missing.txt')).toThrow();
      } finally {
        dir.cleanup();
      }
    });

    it('exists returns true for written files', () => {
      const dir = createTempDir();
      try {
        dir.write('present.txt', 'x');
        expect(dir.exists('present.txt')).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('exists returns true for created directories', () => {
      const dir = createTempDir();
      try {
        dir.mkdir('sub');
        expect(dir.exists('sub')).toBe(true);
      } finally {
        dir.cleanup();
      }
    });

    it('exists returns false for missing paths', () => {
      const dir = createTempDir();
      try {
        expect(dir.exists('does-not-exist')).toBe(false);
      } finally {
        dir.cleanup();
      }
    });

    it('cleanup removes the directory and all contents', () => {
      const dir = createTempDir();
      dir.write('nested/file.txt', 'bye');
      expect(existsSync(dir.path)).toBe(true);
      dir.cleanup();
      expect(existsSync(dir.path)).toBe(false);
    });

    it('cleanup is idempotent (second call is a no-op thanks to force: true)', () => {
      const dir = createTempDir();
      dir.cleanup();
      expect((): void => {
        dir.cleanup();
      }).not.toThrow();
      expect(existsSync(dir.path)).toBe(false);
    });
  });

  describe('useTempDir', () => {
    describe('nested — with hooks', () => {
      const getTempDir = useTempDir({ beforeEach, afterEach });

      it('provides a temp dir inside a test', () => {
        const dir = getTempDir();
        expect(existsSync(dir.path)).toBe(true);
        dir.write('x.txt', 'hello');
        expect(dir.read('x.txt')).toBe('hello');
      });

      it('provides a fresh temp dir between tests', () => {
        const dir = getTempDir();
        /* No files from previous test. */
        expect(dir.exists('x.txt')).toBe(false);
      });
    });

    describe('nested — with custom prefix', () => {
      const getTempDir = useTempDir({ beforeEach, afterEach }, 'mycustom-');

      it('honors the custom prefix', () => {
        const dir = getTempDir();
        expect(path.basename(dir.path).startsWith('mycustom-')).toBe(true);
      });
    });

    it('getter throws when called before beforeEach has run', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getTempDir = useTempDir({
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      expect((): void => {
        getTempDir();
      }).toThrow(/no temp dir available/);
    });

    it('afterEach cleans up the dir and resets the getter', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getTempDir = useTempDir({
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      registered.beforeEach?.();
      const dir = getTempDir();
      const p: string = dir.path;
      expect(existsSync(p)).toBe(true);
      registered.afterEach?.();
      expect(existsSync(p)).toBe(false);
      expect((): void => {
        getTempDir();
      }).toThrow(/no temp dir available/);
    });

    it('afterEach is safe when beforeEach never ran', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      useTempDir({
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      /* Do NOT call beforeEach — afterEach must tolerate undefined current. */
      expect((): void => {
        registered.afterEach?.();
      }).not.toThrow();
    });
  });
});
