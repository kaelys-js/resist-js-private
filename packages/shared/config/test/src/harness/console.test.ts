/**
 * Tests for console-capture utilities.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi as rawVi } from 'vitest';
import { createConsoleSpy, useConsoleSpy, type ViSpyProvider } from './console';

const vi = rawVi as unknown as ViSpyProvider & typeof rawVi;

describe('console', () => {
  describe('createConsoleSpy', () => {
    it('captures console.log output with default methods', () => {
      const spy = createConsoleSpy(vi);

      try {
        console.log('hello', 'world');
        expect(spy.logs).toEqual(['hello world']);
        expect(spy.logOutput).toBe('hello world');
      } finally {
        spy.restore();
      }
    });

    it('captures console.error output with default methods', () => {
      const spy = createConsoleSpy(vi);

      try {
        console.error('oops');
        expect(spy.errors).toEqual(['oops']);
        expect(spy.errorOutput).toBe('oops');
      } finally {
        spy.restore();
      }
    });

    it('does not capture console.warn when not in methods', () => {
      const spy = createConsoleSpy(vi);

      try {
        console.warn('ignored');
        expect(spy.warns).toEqual([]);
      } finally {
        spy.restore();
      }
    });

    it('captures warn when explicitly enabled', () => {
      const spy = createConsoleSpy(vi, { methods: ['warn'] });

      try {
        console.warn('danger');
        expect(spy.warns).toEqual(['danger']);
      } finally {
        spy.restore();
      }
    });

    it('joins args with space and coerces non-strings to string', () => {
      const spy = createConsoleSpy(vi);

      try {
        console.log('count', 42, true);
        expect(spy.logs).toEqual(['count 42 true']);
      } finally {
        spy.restore();
      }
    });

    it('output property joins all captured methods with newlines', () => {
      const spy = createConsoleSpy(vi);

      try {
        console.log('A');
        console.error('B');
        expect(spy.output).toBe('A\nB');
      } finally {
        spy.restore();
      }
    });

    it('clear empties all buckets while keeping spies active', () => {
      const spy = createConsoleSpy(vi);

      try {
        console.log('before');
        spy.clear();
        expect(spy.logs).toEqual([]);
        console.log('after');
        expect(spy.logs).toEqual(['after']);
      } finally {
        spy.restore();
      }
    });

    it('clear also empties warns even when not captured', () => {
      const spy = createConsoleSpy(vi, { methods: ['log', 'error', 'warn'] });

      try {
        console.log('x');
        console.error('y');
        console.warn('z');
        spy.clear();
        expect(spy.logs).toEqual([]);
        expect(spy.errors).toEqual([]);
        expect(spy.warns).toEqual([]);
      } finally {
        spy.restore();
      }
    });

    it('restore reverts console.log to original behavior', () => {
      const spy = createConsoleSpy(vi);
      spy.restore();
      /* After restore, calling console.log should not populate spy.logs. */
      console.log('real');
      expect(spy.logs).toEqual([]);
    });

    it('restore is idempotent (safe to call twice)', () => {
      const spy = createConsoleSpy(vi);
      spy.restore();
      expect((): void => {
        spy.restore();
      }).not.toThrow();
    });

    it('passthrough invokes the original method in addition to capture', () => {
      const original: typeof console.log = console.log;
      let passthroughCalls: number = 0;
      /* Wrap console.log temporarily to count passthrough invocations. */
      console.log = ((...args: unknown[]): void => {
        passthroughCalls += 1;
        original.call(console, ...args);
      }) as typeof console.log;
      try {
        const spy = createConsoleSpy(vi, { passthrough: true });

        try {
          console.log('pt');
          /* With passthrough, original is called from inside mockImplementation,
           * which in our wrapped scenario routes back through our counter once. */
          expect(passthroughCalls).toBeGreaterThanOrEqual(1);
          expect(spy.logs).toEqual(['pt']);
        } finally {
          spy.restore();
        }
      } finally {
        console.log = original;
      }
    });

    it('logSpy getter returns a MockInstance for captured log', () => {
      const spy = createConsoleSpy(vi);

      try {
        expect(spy.logSpy).toBeDefined();
        expect(typeof spy.logSpy.mockRestore).toBe('function');
      } finally {
        spy.restore();
      }
    });

    it('errorSpy getter returns a MockInstance for captured error', () => {
      const spy = createConsoleSpy(vi);

      try {
        expect(spy.errorSpy).toBeDefined();
        expect(typeof spy.errorSpy.mockRestore).toBe('function');
      } finally {
        spy.restore();
      }
    });

    it('warnSpy getter returns a no-op spy when warn is not captured', () => {
      const spy = createConsoleSpy(vi);

      try {
        /* Not captured by default — returns noopSpy with safe mockRestore. */
        expect(spy.warnSpy).toBeDefined();
        expect((): void => {
          spy.warnSpy.mockRestore();
        }).not.toThrow();
      } finally {
        spy.restore();
      }
    });

    it('warnSpy getter returns the real spy when warn is captured', () => {
      const spy = createConsoleSpy(vi, { methods: ['warn'] });

      try {
        console.warn('w');
        expect(spy.warnSpy.mock.calls.length).toBeGreaterThan(0);
      } finally {
        spy.restore();
      }
    });

    it('logSpy returns noop when log is not in methods', () => {
      const spy = createConsoleSpy(vi, { methods: ['error'] });

      try {
        expect((): void => {
          spy.logSpy.mockRestore();
        }).not.toThrow();
      } finally {
        spy.restore();
      }
    });

    it('errorSpy returns noop when error is not in methods', () => {
      const spy = createConsoleSpy(vi, { methods: ['log'] });

      try {
        expect((): void => {
          spy.errorSpy.mockRestore();
        }).not.toThrow();
      } finally {
        spy.restore();
      }
    });
  });

  describe('useConsoleSpy', () => {
    describe('nested — with hooks', () => {
      const getConsole = useConsoleSpy({ vi, beforeEach, afterEach });

      it('captures log inside a test', () => {
        console.log('inside');
        expect(getConsole().logOutput).toBe('inside');
      });

      it('resets spy between tests', () => {
        expect(getConsole().logs).toEqual([]);
        console.log('fresh');
        expect(getConsole().logs).toEqual(['fresh']);
      });
    });

    it('getter throws when called outside a test', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getConsole = useConsoleSpy({
        vi,
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      expect((): void => {
        getConsole();
      }).toThrow(/no spy available/);
    });

    it('afterEach restores and clears the current spy', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getConsole = useConsoleSpy({
        vi,
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      });
      registered.beforeEach?.();
      expect(getConsole()).toBeDefined();
      registered.afterEach?.();
      expect((): void => {
        getConsole();
      }).toThrow(/no spy available/);
    });

    it('forwards options to createConsoleSpy', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const getConsole = useConsoleSpy(
        {
          vi,
          beforeEach: (fn: () => void): void => {
            registered.beforeEach = fn;
          },
          afterEach: (fn: () => void): void => {
            registered.afterEach = fn;
          },
        },
        { methods: ['warn'] },
      );
      registered.beforeEach?.();
      try {
        console.warn('w');
        expect(getConsole().warns).toEqual(['w']);
      } finally {
        registered.afterEach?.();
      }
    });
  });
});
