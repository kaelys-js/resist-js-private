/**
 * Console capture utilities for testing CLI output.
 *
 * Replaces the verbose pattern of manually spying on `console.log`/`console.error`,
 * capturing calls into arrays, and joining them for assertions. Provides a structured
 * `ConsoleSpy` object with pre-joined output properties for direct assertion.
 *
 * Two usage patterns:
 * - **Manual**: `createConsoleSpy()` — caller manages lifecycle (call `restore()` when done)
 * - **Hook-based**: `useConsoleSpy()` — auto setup/teardown per test via beforeEach/afterEach
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 * import { useConsoleSpy } from '@/test-presets/harness/console';
 *
 * describe('logger', () => {
 *   const getConsole = useConsoleSpy({ vi, beforeEach, afterEach });
 *
 *   it('logs info messages', () => {
 *     log.info('server started on port', 3000);
 *     expect(getConsole().logOutput).toContain('server started on port 3000');
 *   });
 *
 *   it('logs errors to stderr', () => {
 *     log.error('connection failed');
 *     expect(getConsole().errors).toContain('connection failed');
 *   });
 * });
 * ```
 *
 * @module
 */

import type { MockInstance } from 'vitest';

/**
 * Minimal subset of vitest's `vi` object needed for console spying.
 * Accepts the real `vi` object or a compatible mock.
 */
export type ViSpyProvider = {
  spyOn: (obj: object, method: string) => MockInstance;
};

/**
 * A structured console spy with captured output and convenience accessors.
 *
 * The `logs`, `errors`, and `warns` arrays contain one string per call,
 * where each call's arguments are joined by a space (matching `console.log` behavior).
 *
 * The `output`, `logOutput`, and `errorOutput` properties are computed on access —
 * they join the respective arrays with newlines for easy assertion with
 * `toContain()`, `toMatch()`, etc.
 */
export type ConsoleSpy = {
  /** All `console.log` calls, each call's args joined by space. */
  readonly logs: string[];

  /** All `console.error` calls, each call's args joined by space. */
  readonly errors: string[];

  /** All `console.warn` calls, each call's args joined by space. */
  readonly warns: string[];

  /**
   * All captured output (log + error + warn) joined by newlines.
   * Computed on each access — always reflects current state.
   *
   * @example
   * ```typescript
   * console.log('hello');
   * console.error('oops');
   * expect(getConsole().output).toBe('hello\noops');
   * ```
   */
  readonly output: string;

  /**
   * Only `console.log` output, joined by newlines.
   *
   * Replaces the common pattern:
   * ```typescript
   * // Before:
   * const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
   * // After:
   * getConsole().logOutput
   * ```
   */
  readonly logOutput: string;

  /** Only `console.error` output, joined by newlines. */
  readonly errorOutput: string;

  /** The underlying `vi.spyOn` instance for `console.log`. */
  readonly logSpy: MockInstance;

  /** The underlying `vi.spyOn` instance for `console.error`. */
  readonly errorSpy: MockInstance;

  /** The underlying `vi.spyOn` instance for `console.warn`. */
  readonly warnSpy: MockInstance;

  /**
   * Clear all captured output arrays but keep spies active.
   * Useful for isolating output within a single test.
   *
   * @example
   * ```typescript
   * console.log('setup noise');
   * getConsole().clear();
   * doActualWork();
   * expect(getConsole().logOutput).not.toContain('setup noise');
   * ```
   */
  clear(): void;

  /**
   * Restore original console methods. Called automatically by `useConsoleSpy`.
   * Safe to call multiple times.
   */
  restore(): void;
};

/**
 * Configuration options for console spying.
 */
export type ConsoleSpyOptions = {
  /**
   * Which console methods to spy on.
   * @default ['log', 'error']
   *
   * @example
   * ```typescript
   * // Spy on all three methods:
   * const spy = createConsoleSpy(vi, { methods: ['log', 'error', 'warn'] });
   * ```
   */
  methods?: Array<'log' | 'error' | 'warn'>;

  /**
   * If `true`, also call the original console method (output appears in terminal).
   * Useful for debugging tests while keeping capture active.
   * @default false
   */
  passthrough?: boolean;
};

/** Supported console method names. */
type ConsoleMethod = 'log' | 'error' | 'warn';

/**
 * Create a console spy that captures output from `console.log`, `console.error`,
 * and/or `console.warn`.
 *
 * The caller is responsible for calling `restore()` when done. For automatic
 * lifecycle management tied to test hooks, use `useConsoleSpy()` instead.
 *
 * @param vi - The vitest `vi` object (pass explicitly to support `globals: false`)
 * @param options - Configuration for which methods to spy on and passthrough behavior
 * @returns A `ConsoleSpy` instance
 *
 * @example
 * ```typescript
 * import { vi } from 'vitest';
 * import { createConsoleSpy } from '@/test-presets/harness/console';
 *
 * const spy = createConsoleSpy(vi);
 * try {
 *   console.log('hello', 'world');
 *   console.error('oops');
 *   expect(spy.logOutput).toBe('hello world');
 *   expect(spy.errors).toEqual(['oops']);
 * } finally {
 *   spy.restore();
 * }
 * ```
 */
export function createConsoleSpy(vi: ViSpyProvider, options: ConsoleSpyOptions = {}): ConsoleSpy {
  const { methods = ['log', 'error'], passthrough = false } = options;

  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  const buckets: Record<ConsoleMethod, string[]> = {
    log: logs,
    error: errors,
    warn: warns,
  };

  const spies: Partial<Record<ConsoleMethod, MockInstance>> = {};

  for (const method of methods) {
    const original = console[method].bind(console);
    // vi.spyOn returns MockInstance but the generic overload resolves too broadly
    const spy: MockInstance = vi.spyOn(console, method) as MockInstance;
    spy.mockImplementation((...args: unknown[]) => {
      buckets[method].push(args.map(String).join(' '));
      if (passthrough) {
        original(...args);
      }
    });
    spies[method] = spy;
  }

  // Create a no-op spy placeholder for methods not being spied on
  const noopSpy = {
    mockRestore() {},
    mock: { calls: [] },
  } as unknown as MockInstance;

  return {
    logs,
    errors,
    warns,

    get output(): string {
      const all: string[] = [];
      for (const method of methods) {
        all.push(...buckets[method]);
      }
      return all.join('\n');
    },

    get logOutput(): string {
      return logs.join('\n');
    },

    get errorOutput(): string {
      return errors.join('\n');
    },

    get logSpy(): MockInstance {
      return spies.log ?? noopSpy;
    },

    get errorSpy(): MockInstance {
      return spies.error ?? noopSpy;
    },

    get warnSpy(): MockInstance {
      return spies.warn ?? noopSpy;
    },

    clear(): void {
      logs.length = 0;
      errors.length = 0;
      warns.length = 0;
    },

    restore(): void {
      for (const spy of Object.values(spies)) {
        spy?.mockRestore();
      }
    },
  };
}

/**
 * Register `beforeEach`/`afterEach` hooks that create and restore a console spy
 * for each test. Returns a getter function that provides the current test's
 * `ConsoleSpy`.
 *
 * Must be called at the `describe` block level (not inside `it`).
 *
 * @param hooks - Object containing `vi`, `beforeEach`, and `afterEach`
 *   (pass them explicitly from vitest to support `globals: false`)
 * @param options - Configuration for which methods to spy on and passthrough behavior
 * @returns A getter function `() => ConsoleSpy` that returns the current test's spy
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 * import { useConsoleSpy } from '@/test-presets/harness/console';
 *
 * describe('CLI output', () => {
 *   const getConsole = useConsoleSpy({ vi, beforeEach, afterEach });
 *
 *   it('prints header', () => {
 *     printHeader('My CLI', '1.0.0');
 *     expect(getConsole().logOutput).toContain('My CLI');
 *     expect(getConsole().logOutput).toContain('1.0.0');
 *   });
 *
 *   it('prints errors to stderr', () => {
 *     printError('something broke');
 *     expect(getConsole().errorOutput).toContain('something broke');
 *     expect(getConsole().logs).toHaveLength(0);
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Spy on warn too, with passthrough for debugging:
 * const getConsole = useConsoleSpy(
 *   { vi, beforeEach, afterEach },
 *   { methods: ['log', 'error', 'warn'], passthrough: true },
 * );
 * ```
 */
export function useConsoleSpy(
  hooks: {
    vi: ViSpyProvider;
    beforeEach: (fn: () => void) => void;
    afterEach: (fn: () => void) => void;
  },
  options?: ConsoleSpyOptions,
): () => ConsoleSpy {
  let current: ConsoleSpy | undefined;

  hooks.beforeEach(() => {
    current = createConsoleSpy(hooks.vi, options);
  });

  hooks.afterEach(() => {
    current?.restore();
    current = undefined;
  });

  return (): ConsoleSpy => {
    if (!current) {
      throw new Error(
        'useConsoleSpy: no spy available. Ensure this is called inside a test ' +
          '(after beforeEach has run). Did you call useConsoleSpy() at the describe level?',
      );
    }
    return current;
  };
}
