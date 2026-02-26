/**
 * Process state utilities for testing CLI tools and Node.js applications.
 *
 * Provides two concerns:
 * 1. **Exit spying** — mock `process.exit` to prevent test runner termination
 *    while capturing exit codes for assertion.
 * 2. **State snapshots** — capture and restore `process.cwd()`, `process.argv`,
 *    and `process.env` so tests can mutate them freely without leaking to other tests.
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 * import { useExitSpy, useProcessSnapshot } from '@/config/test/harness/process';
 *
 * describe('CLI entry point', () => {
 *   const getExitSpy = useExitSpy({ vi, beforeEach, afterEach });
 *   useProcessSnapshot({ beforeEach, afterEach }, { cwd: true, argv: true, env: true });
 *
 *   it('exits with code 0 on success', () => {
 *     runCli(['--help']);
 *     expect(getExitSpy().code).toBe(0);
 *   });
 *
 *   it('exits with code 1 on error', () => {
 *     runCli(['--invalid']);
 *     expect(getExitSpy().called).toBe(true);
 *     expect(getExitSpy().code).toBe(1);
 *   });
 * });
 * ```
 *
 * @module
 */

import type { MockInstance } from 'vitest';

/**
 * Minimal subset of vitest's `vi` object needed for spying.
 * Accepts the real `vi` object or a compatible mock.
 */
export type ViSpyProvider = {
	spyOn: (obj: object, method: string) => MockInstance;
};

// ---------------------------------------------------------------------------
// Exit spy
// ---------------------------------------------------------------------------

/**
 * A spy on `process.exit` that captures exit codes without terminating.
 *
 * Properties are computed on access — always reflect the latest state of the spy.
 */
export type ExitSpy = {
	/** The underlying `vi.spyOn` instance for direct assertions if needed. */
	readonly spy: MockInstance;

	/**
	 * Whether `process.exit` was called at least once.
	 *
	 * @example
	 * ```typescript
	 * expect(getExitSpy().called).toBe(true);
	 * ```
	 */
	readonly called: boolean;

	/**
	 * The exit code from the most recent `process.exit()` call,
	 * or `undefined` if it was never called.
	 *
	 * @example
	 * ```typescript
	 * exit(1);
	 * expect(getExitSpy().code).toBe(1);
	 * ```
	 */
	readonly code: number | undefined;

	/**
	 * All exit codes from all `process.exit()` calls, in order.
	 * Empty array if never called.
	 *
	 * @example
	 * ```typescript
	 * exit(1);
	 * exit(2);
	 * expect(getExitSpy().codes).toEqual([1, 2]);
	 * ```
	 */
	readonly codes: number[];

	/**
	 * Restore the original `process.exit`.
	 * Called automatically by `useExitSpy` in the afterEach hook.
	 * Safe to call multiple times.
	 */
	restore(): void;
};

/**
 * Spy on `process.exit`, mocking it to not actually exit the process.
 * Captures all exit codes for later assertion.
 *
 * The caller is responsible for calling `restore()` when done. For automatic
 * lifecycle management tied to test hooks, use `useExitSpy()` instead.
 *
 * @param vi - The vitest `vi` object (pass explicitly to support `globals: false`)
 * @returns An `ExitSpy` instance
 *
 * @example
 * ```typescript
 * import { vi } from 'vitest';
 * import { createExitSpy } from '@/config/test/harness/process';
 *
 * const exitSpy = createExitSpy(vi);
 * try {
 *   process.exit(1);
 *   expect(exitSpy.code).toBe(1);
 *   expect(exitSpy.called).toBe(true);
 * } finally {
 *   exitSpy.restore();
 * }
 * ```
 */
export function createExitSpy(vi: ViSpyProvider): ExitSpy {
	const codes: number[] = [];
	// vi.spyOn returns MockInstance but the generic overload for process.exit resolves too broadly
	const spy: MockInstance = vi.spyOn(process, 'exit') as MockInstance;
	spy.mockImplementation(((code?: number) => {
		codes.push(code ?? 0);
	}) as () => never);

	return {
		get spy() {
			return spy;
		},

		get called(): boolean {
			return codes.length > 0;
		},

		get code(): number | undefined {
			return codes.length > 0 ? codes.at(-1) : undefined;
		},

		get codes(): number[] {
			return codes;
		},

		restore(): void {
			spy.mockRestore();
		},
	};
}

/**
 * Register `beforeEach`/`afterEach` hooks that create and restore a `process.exit`
 * spy for each test. Returns a getter function that provides the current test's
 * `ExitSpy`.
 *
 * Must be called at the `describe` block level (not inside `it`).
 *
 * @param hooks - Object containing `vi`, `beforeEach`, and `afterEach`
 *   (pass them explicitly from vitest to support `globals: false`)
 * @returns A getter function `() => ExitSpy` that returns the current test's exit spy
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 * import { useExitSpy } from '@/config/test/harness/process';
 *
 * describe('exit handling', () => {
 *   const getExitSpy = useExitSpy({ vi, beforeEach, afterEach });
 *
 *   it('exits with code 0 by default', () => {
 *     exit();
 *     expect(getExitSpy().code).toBe(0);
 *   });
 *
 *   it('exits with code 2 on fatal error', () => {
 *     fatalExit('fatal');
 *     expect(getExitSpy().code).toBe(2);
 *   });
 * });
 * ```
 */
export function useExitSpy(hooks: {
	vi: ViSpyProvider;
	beforeEach: (fn: () => void) => void;
	afterEach: (fn: () => void) => void;
}): () => ExitSpy {
	let current: ExitSpy | undefined;

	hooks.beforeEach(() => {
		current = createExitSpy(hooks.vi);
	});

	hooks.afterEach(() => {
		current?.restore();
		current = undefined;
	});

	return (): ExitSpy => {
		if (!current) {
			throw new Error(
				'useExitSpy: no exit spy available. Ensure this is called inside a test ' +
					'(after beforeEach has run). Did you call useExitSpy() at the describe level?',
			);
		}
		return current;
	};
}

// ---------------------------------------------------------------------------
// Process state snapshot
// ---------------------------------------------------------------------------

/**
 * A snapshot of process state that can be restored later.
 */
export type ProcessSnapshot = {
	/**
	 * Restore all captured process state (cwd, argv, env) to the values
	 * at the time the snapshot was taken. Called automatically by
	 * `useProcessSnapshot` in the afterEach hook.
	 */
	restore(): void;
};

/**
 * Options controlling which parts of process state to snapshot and restore.
 */
export type ProcessSnapshotOptions = {
	/**
	 * Capture and restore `process.cwd()` (via `process.chdir()`).
	 * @default true
	 */
	cwd?: boolean;

	/**
	 * Capture and restore `process.argv`.
	 * @default false
	 */
	argv?: boolean;

	/**
	 * Capture and restore `process.env`.
	 * Creates a shallow copy — individual env vars are restored.
	 * @default false
	 */
	env?: boolean;
};

/**
 * Snapshot the current process state. Call `restore()` to revert to the
 * captured values.
 *
 * Only snapshots the fields you opt into via options. By default, only
 * `cwd` is captured.
 *
 * @param options - Which process fields to snapshot. Default: `{ cwd: true }`
 * @returns A `ProcessSnapshot` with a `restore()` method
 *
 * @example
 * ```typescript
 * import { snapshotProcess } from '@/config/test/harness/process';
 *
 * const snapshot = snapshotProcess({ cwd: true, env: true });
 * try {
 *   process.chdir('/tmp');
 *   process.env.NODE_ENV = 'test';
 *   // ... test logic ...
 * } finally {
 *   snapshot.restore();
 *   // cwd and env are back to original values
 * }
 * ```
 */
export function snapshotProcess(options: ProcessSnapshotOptions = {}): ProcessSnapshot {
	const { cwd = true, argv = false, env = false } = options;

	const savedCwd = cwd ? process.cwd() : undefined;
	const savedArgv = argv ? [...process.argv] : undefined;
	const savedEnv = env ? { ...process.env } : undefined;

	return {
		restore(): void {
			if (savedCwd !== undefined) {
				process.chdir(savedCwd);
			}
			if (savedArgv !== undefined) {
				process.argv = savedArgv;
			}
			if (savedEnv !== undefined) {
				// Restore by replacing the entire env object's contents
				for (const key of Object.keys(process.env)) {
					if (!(key in savedEnv)) {
						delete process.env[key]; // oxlint-disable-line typescript/no-dynamic-delete -- Cleaning env requires dynamic delete
					}
				}
				Object.assign(process.env, savedEnv);
			}
		},
	};
}

/**
 * Register `beforeEach`/`afterEach` hooks that snapshot and restore process state
 * for each test. Tests can freely mutate `process.cwd()`, `process.argv`, and/or
 * `process.env` without affecting other tests.
 *
 * Must be called at the `describe` block level (not inside `it`).
 *
 * @param hooks - Object containing `beforeEach` and `afterEach` functions
 *   (pass them explicitly from vitest to support `globals: false`)
 * @param options - Which process fields to snapshot. Default: `{ cwd: true }`
 *
 * @example
 * ```typescript
 * import { describe, it, expect, beforeEach, afterEach } from 'vitest';
 * import { useProcessSnapshot } from '@/config/test/harness/process';
 *
 * describe('workspace detection', () => {
 *   useProcessSnapshot({ beforeEach, afterEach }, { cwd: true });
 *
 *   it('finds workspace root', () => {
 *     process.chdir('/some/nested/path');
 *     expect(findWorkspaceRoot()).toBe('/some');
 *   });
 *
 *   it('starts from a clean cwd', () => {
 *     // cwd was restored after the previous test
 *     expect(process.cwd()).not.toBe('/some/nested/path');
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Snapshot argv and env for CLI argument parsing tests:
 * useProcessSnapshot({ beforeEach, afterEach }, { cwd: true, argv: true, env: true });
 *
 * it('parses --verbose flag', () => {
 *   process.argv = ['node', 'cli.js', '--verbose'];
 *   expect(parseArgs().verbose).toBe(true);
 * });
 * ```
 */
export function useProcessSnapshot(
	hooks: {
		beforeEach: (fn: () => void) => void;
		afterEach: (fn: () => void) => void;
	},
	options?: ProcessSnapshotOptions,
): void {
	let snapshot: ProcessSnapshot | undefined;

	hooks.beforeEach(() => {
		snapshot = snapshotProcess(options);
	});

	hooks.afterEach(() => {
		snapshot?.restore();
		snapshot = undefined;
	});
}
