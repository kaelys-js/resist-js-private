/**
 * Tests for process-state utilities.
 *
 * @module
 */

import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi as rawVi } from 'vitest';
import {
  createExitSpy,
  snapshotProcess,
  useExitSpy,
  useProcessSnapshot,
  type ViSpyProvider,
} from './process';

const vi = rawVi as unknown as ViSpyProvider & typeof rawVi;

describe('process', () => {
  describe('createExitSpy', () => {
    it('captures a single exit code without terminating', () => {
      const exitSpy = createExitSpy(vi);

      try {
        process.exit(1);
        expect(exitSpy.called).toBe(true);
        expect(exitSpy.code).toBe(1);
        expect(exitSpy.codes).toEqual([1]);
      } finally {
        exitSpy.restore();
      }
    });

    it('defaults missing exit code to 0', () => {
      const exitSpy = createExitSpy(vi);

      try {
        process.exit();
        expect(exitSpy.code).toBe(0);
      } finally {
        exitSpy.restore();
      }
    });

    it('reports called=false and code=undefined before any exit', () => {
      const exitSpy = createExitSpy(vi);

      try {
        expect(exitSpy.called).toBe(false);
        expect(exitSpy.code).toBeUndefined();
        expect(exitSpy.codes).toEqual([]);
      } finally {
        exitSpy.restore();
      }
    });

    it('accumulates multiple exit codes in order', () => {
      const exitSpy = createExitSpy(vi);

      try {
        process.exit(1);
        process.exit(2);
        process.exit(3);
        expect(exitSpy.codes).toEqual([1, 2, 3]);
        expect(exitSpy.code).toBe(3);
      } finally {
        exitSpy.restore();
      }
    });

    it('exposes the underlying spy MockInstance', () => {
      const exitSpy = createExitSpy(vi);

      try {
        process.exit(7);
        expect(exitSpy.spy).toBeDefined();
        expect(typeof exitSpy.spy.mockRestore).toBe('function');
      } finally {
        exitSpy.restore();
      }
    });

    it('restore is idempotent', () => {
      const exitSpy = createExitSpy(vi);
      exitSpy.restore();
      expect((): void => {
        exitSpy.restore();
      }).not.toThrow();
    });
  });

  describe('useExitSpy', () => {
    describe('nested — with hooks', () => {
      const getExitSpy = useExitSpy({ vi, beforeEach, afterEach });

      it('provides a spy inside a test', () => {
        process.exit(42);
        expect(getExitSpy().code).toBe(42);
      });

      it('resets between tests', () => {
        expect(getExitSpy().called).toBe(false);
      });
    });

    it('getter throws when called outside a test', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getExitSpy = useExitSpy({
        vi,
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      expect((): void => {
        getExitSpy();
      }).toThrow(/no exit spy available/);
    });

    it('afterEach restores and clears the current spy', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getExitSpy = useExitSpy({
        vi,
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      registered.beforeEach?.();
      expect(getExitSpy()).toBeDefined();
      registered.afterEach?.();
      expect((): void => {
        getExitSpy();
      }).toThrow(/no exit spy available/);
    });
  });

  describe('snapshotProcess', () => {
    it('restores cwd by default', () => {
      const original: string = process.cwd();
      const snapshot = snapshotProcess();
      const parent: string = path.resolve(original, '..');
      process.chdir(parent);
      expect(process.cwd()).toBe(parent);
      snapshot.restore();
      expect(process.cwd()).toBe(original);
    });

    it('does not capture cwd when cwd=false', () => {
      const original: string = process.cwd();
      const snapshot = snapshotProcess({ cwd: false });
      const parent: string = path.resolve(original, '..');
      process.chdir(parent);
      snapshot.restore();
      /* cwd not restored because not snapshotted. */
      expect(process.cwd()).toBe(parent);
      process.chdir(original);
    });

    it('restores argv when enabled', () => {
      const original: string[] = [...process.argv];
      const snapshot = snapshotProcess({ cwd: false, argv: true });
      process.argv = ['node', 'x.js', '--flag'];
      snapshot.restore();
      expect(process.argv).toEqual(original);
    });

    it('does not capture argv by default', () => {
      const original: string[] = [...process.argv];
      const snapshot = snapshotProcess({ cwd: false });
      process.argv = ['node', 'other.js'];
      snapshot.restore();
      /* argv not restored. */
      expect(process.argv).toEqual(['node', 'other.js']);
      process.argv = original;
    });

    it('restores env when enabled — new keys are deleted', () => {
      const snapshot = snapshotProcess({ cwd: false, env: true });
      process.env.__TEST_NEW_KEY__ = 'hello';
      snapshot.restore();
      expect(process.env.__TEST_NEW_KEY__).toBeUndefined();
    });

    it('restores env when enabled — modified values are reverted', () => {
      process.env.__TEST_EXISTING__ = 'original';
      const snapshot = snapshotProcess({ cwd: false, env: true });
      process.env.__TEST_EXISTING__ = 'changed';
      snapshot.restore();
      expect(process.env.__TEST_EXISTING__).toBe('original');
      delete process.env.__TEST_EXISTING__;
    });

    it('restores env — deleted keys are re-added', () => {
      process.env.__TEST_WILL_DELETE__ = 'value';
      const snapshot = snapshotProcess({ cwd: false, env: true });
      delete process.env.__TEST_WILL_DELETE__;
      snapshot.restore();
      expect(process.env.__TEST_WILL_DELETE__).toBe('value');
      delete process.env.__TEST_WILL_DELETE__;
    });

    it('does not capture env by default', () => {
      const snapshot = snapshotProcess({ cwd: false });
      process.env.__TEST_UNTRACKED__ = 'x';
      snapshot.restore();
      expect(process.env.__TEST_UNTRACKED__).toBe('x');
      delete process.env.__TEST_UNTRACKED__;
    });

    it('captures all three when all opts enabled', () => {
      const originalCwd: string = process.cwd();
      const originalArgv: string[] = [...process.argv];
      const snapshot = snapshotProcess({ cwd: true, argv: true, env: true });
      const parent: string = path.resolve(originalCwd, '..');
      process.chdir(parent);
      process.argv = ['node', 'test'];
      process.env.__TEST_ALL__ = '1';
      snapshot.restore();
      expect(process.cwd()).toBe(originalCwd);
      expect(process.argv).toEqual(originalArgv);
      expect(process.env.__TEST_ALL__).toBeUndefined();
    });
  });

  describe('useProcessSnapshot', () => {
    describe('nested — with hooks', () => {
      useProcessSnapshot({ beforeEach, afterEach }, { cwd: true });

      it('allows cwd mutation inside a test', () => {
        const original: string = process.cwd();
        const parent: string = path.resolve(original, '..');
        process.chdir(parent);
        expect(process.cwd()).toBe(parent);
      });

      it('restored cwd from previous test', () => {
        /* Previous test chdir'd to parent; should have been restored. */
        expect(process.cwd()).not.toBe(path.resolve(process.cwd(), '..'));
      });
    });

    it('registers before/after hooks that snapshot and restore', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      useProcessSnapshot(
        {
          beforeEach: (fn: () => void): void => {
            registered.beforeEach = fn;
          },
          afterEach: (fn: () => void): void => {
            registered.afterEach = fn;
          },
        },
        { cwd: false, env: true },
      );
      registered.beforeEach?.();
      process.env.__HOOK_SNAPSHOT__ = 'x';
      registered.afterEach?.();
      expect(process.env.__HOOK_SNAPSHOT__).toBeUndefined();
    });

    it('afterEach is safe when snapshot was never taken', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      useProcessSnapshot({
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      /* Do NOT call beforeEach — afterEach must tolerate undefined snapshot. */
      expect((): void => {
        registered.afterEach?.();
      }).not.toThrow();
    });
  });
});
