/**
 * Process Utilities
 *
 * Cross-environment wrappers for process management, platform detection,
 * TTY queries, stdio I/O, and exit handling. Gracefully no-ops or returns
 * safe defaults in non-Node environments (browser, Cloudflare Workers).
 *
 * No CLI dependencies — suitable for use in any context.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
	BoolSchema,
	EnvRecordWithUndefinedSchema,
	ExitCodeSchema,
	FatalExitOptionsSchema,
	NonNegativeIntegerSchema,
	OptionalExitCodeSchema,
	OptionalStrSchema,
	PlatformSchema,
	PositiveIntegerSchema,
	StrArraySchema,
	DEFAULT_EXIT_CODE,
	DEFAULT_PLATFORM,
	DEFAULT_TERMINAL_WIDTH,
	FAILURE_EXIT_CODE,
	StrSchema,
	VoidSchema,
	type Bool,
	type EnvRecordWithUndefined,
	type ExitCode,
	type FatalExitOptions,
	type NonNegativeInteger,
	type OptionalExitCode,
	type Platform,
	type PositiveInteger,
	type OptionalStr,
	type Str,
	type StrArray,
	type OptionalNodeProcess,
	type Void,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { getProcess } from '@/utils/core/environment';
import { type OptionalNodeOs, nodeOs } from '@/utils/core/node-imports';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Concurrency
// =============================================================================

/**
 * Default concurrency level, set to the number of CPU cores at import time.
 *
 * Validated against `PositiveIntegerSchema` to guarantee a safe value.
 * Falls back to `1` if `node:os` is unavailable or `os.cpus()` returns
 * an unexpected result.
 */
// Module-init: cannot propagate Result; validated fallback via safeParse
const _fallbackConcurrency: Result<PositiveInteger> = safeParse(PositiveIntegerSchema, 1);
if (!_fallbackConcurrency.ok) throw new Error('Static literal 1 failed PositiveInteger validation');
export const DEFAULT_CONCURRENCY: PositiveInteger = (() => {
	const os: OptionalNodeOs = nodeOs;
	if (!os) return _fallbackConcurrency.data as PositiveInteger;
	const result: Result<PositiveInteger> = safeParse(PositiveIntegerSchema, os.cpus().length);
	return (result.ok ? result.data : _fallbackConcurrency.data) as PositiveInteger;
})();

// =============================================================================
// Platform Detection
// =============================================================================

// Module-init: 'linux' is safe default for cross-platform guards
const platform: Platform = (() => {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) return DEFAULT_PLATFORM;
	const result: Result<Platform> = safeParse(PlatformSchema, proc.platform);
	return result.ok ? result.data : DEFAULT_PLATFORM;
})();

/** True when running on Windows. */
export const isWindows: Bool = platform === 'win32';

/** True when running on macOS. */
export const isMacOS: Bool = platform === 'darwin';

/** True when running on Linux. */
export const isLinux: Bool = platform === 'linux';

// =============================================================================
// TTY & Terminal Queries
// =============================================================================

/**
 * Check if stdout is a TTY (interactive terminal).
 *
 * Returns `false` in non-Node environments (browser, Workers).
 *
 * @returns `Result<Bool>` — `true` if stdout is a TTY, `false` otherwise.
 *
 * @example
 * ```typescript
 * const tty = isTTY();
 * if (!tty.ok) return tty;
 * if (tty.data) { // interactive terminal }
 * ```
 */
export function isTTY(): Result<Bool> {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) return ok(BoolSchema, false);
	return ok(BoolSchema, proc.stdout?.isTTY === true);
}

/**
 * Get terminal column width.
 *
 * Returns `80` in non-Node environments or when stdout is not a TTY.
 *
 * @returns `Result<NonNegativeInteger>` — terminal width in columns.
 *
 * @example
 * ```typescript
 * const cols = getColumns();
 * if (!cols.ok) return cols;
 * cols.data; // terminal width in columns
 * ```
 */
export function getColumns(): Result<NonNegativeInteger> {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) {
		return ok(NonNegativeIntegerSchema, DEFAULT_TERMINAL_WIDTH);
	}
	return safeParse(NonNegativeIntegerSchema, proc.stdout?.columns ?? DEFAULT_TERMINAL_WIDTH);
}

// =============================================================================
// Arguments & Environment
// =============================================================================

/**
 * Get CLI arguments (`process.argv.slice(2)`).
 *
 * Returns an empty array in non-Node environments.
 *
 * @returns `Result<StrArray>` — CLI arguments after the script path.
 *
 * @example
 * ```typescript
 * const args = getArgv();
 * if (!args.ok) return args;
 * for (const arg of args.data) { ... }
 * ```
 */
export function getArgv(): Result<StrArray> {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) {
		return ok(StrArraySchema, []);
	}
	return safeParse(StrArraySchema, proc.argv.slice(2));
}

/**
 * Get the script path from `process.argv[1]`.
 *
 * Returns `undefined` in non-Node environments or when argv[1] is not set.
 * Used for direct-execution detection (e.g., comparing import.meta.url with the script path).
 *
 * @returns Result containing the script path, or undefined if unavailable
 *
 * @example
 * ```typescript
 * const script = getScriptPath();
 * if (!script.ok) return script;
 * if (script.data && import.meta.url === `file://${script.data}`) {
 *   // running as direct script
 * }
 * ```
 */
export function getScriptPath(): Result<OptionalStr> {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) return safeParse(OptionalStrSchema, undefined);
	return safeParse(OptionalStrSchema, proc.argv[1]);
}

/**
 * Get a single environment variable by name.
 *
 * Returns `undefined` (not an error) when the variable is unset or
 * in a non-Node environment.
 *
 * @param name - Environment variable name.
 * @returns `Result<OptionalStr>` — the variable value, or `undefined` if unset.
 *
 * @example
 * ```typescript
 * const val = getEnvVar('NODE_ENV' as Str);
 * if (!val.ok) return val;
 * if (val.data) { // variable is set }
 * ```
 */
export function getEnvVar(name: Str): Result<OptionalStr> {
	const nameResult: Result<Str> = safeParse(StrSchema, name);
	if (!nameResult.ok) return nameResult;
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) return safeParse(OptionalStrSchema, undefined);
	return safeParse(OptionalStrSchema, proc.env[nameResult.data]);
}

/**
 * Get the full environment variable record.
 *
 * Returns an empty object in non-Node environments.
 *
 * @returns `Result<EnvRecordWithUndefined>` — environment variable record.
 *
 * @example
 * ```typescript
 * const env = getEnvRecord();
 * if (!env.ok) return env;
 * const nodeEnv = env.data.NODE_ENV;
 * ```
 */
export function getEnvRecord(): Result<EnvRecordWithUndefined> {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) {
		return safeParse(EnvRecordWithUndefinedSchema, {});
	}
	return safeParse(EnvRecordWithUndefinedSchema, proc.env);
}

// =============================================================================
// Stdio I/O
// =============================================================================

/**
 * Write a string to stdout.
 *
 * Returns an error in non-Node environments where stdout is unavailable.
 *
 * @param text - Text to write.
 * @returns `Result<Void>` — success, or `IO.WRITE_FAILED` if stdout is unavailable.
 *
 * @example
 * ```typescript
 * const result = writeStdout('Hello\n' as Str);
 * if (!result.ok) return result;
 * ```
 */
export function writeStdout(text: Str): Result<Void> {
	const input: Result<Str> = safeParse(StrSchema, text);
	if (!input.ok) return input;
	const proc: OptionalNodeProcess = getProcess();
	if (!proc || !proc.stdout) {
		return err(ERRORS.IO.WRITE_FAILED, {
			meta: { stream: 'stdout' },
		});
	}
	proc.stdout.write(input.data);
	return ok(VoidSchema, undefined);
}

/**
 * Write a string to stderr.
 *
 * Returns an error in non-Node environments where stderr is unavailable.
 *
 * @param text - Text to write.
 * @returns `Result<Void>` — success, or `IO.WRITE_FAILED` if stderr is unavailable.
 *
 * @example
 * ```typescript
 * const result = writeStderr('Error occurred\n' as Str);
 * if (!result.ok) return result;
 * ```
 */
export function writeStderr(text: Str): Result<Void> {
	const input: Result<Str> = safeParse(StrSchema, text);
	if (!input.ok) return input;
	const proc: OptionalNodeProcess = getProcess();
	if (!proc || !proc.stderr) {
		return err(ERRORS.IO.WRITE_FAILED, {
			meta: { stream: 'stderr' },
		});
	}
	proc.stderr.write(input.data);
	return ok(VoidSchema, undefined);
}

/**
 * Clear the current line on stdout (TTY only).
 *
 * No-op in non-Node environments or when stdout is not a TTY.
 *
 * @returns `Result<Void>` — always succeeds (no-op when unavailable).
 *
 * @example
 * ```typescript
 * clearLine();
 * ```
 */
export function clearLine(): Result<Void> {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc || !proc.stdout?.clearLine) {
		return ok(VoidSchema, undefined);
	}
	proc.stdout.clearLine(0);
	return ok(VoidSchema, undefined);
}

/**
 * Move the cursor to a specific column on stdout (TTY only).
 *
 * No-op in non-Node environments or when stdout is not a TTY.
 *
 * @param column - Zero-based column number.
 * @returns `Result<Void>` — success, or validation error if column is invalid.
 *
 * @example
 * ```typescript
 * cursorTo(0 as NonNegativeInteger);
 * ```
 */
export function cursorTo(column: NonNegativeInteger): Result<Void> {
	const col: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, column);
	if (!col.ok) return col;
	const proc: OptionalNodeProcess = getProcess();
	if (!proc || !proc.stdout?.cursorTo) {
		return ok(VoidSchema, undefined);
	}
	proc.stdout.cursorTo(col.data as unknown as number);
	return ok(VoidSchema, undefined);
}

/**
 * Set the process exit code without exiting.
 *
 * No-op in non-Node environments.
 *
 * @param code - Exit code (0–255).
 * @returns `Result<Void>` — success, or validation error if code is invalid.
 *
 * @example
 * ```typescript
 * setExitCode(1 as ExitCode);
 * ```
 */
export function setExitCode(code: ExitCode): Result<Void> {
	const codeResult: Result<ExitCode> = safeParse(ExitCodeSchema, code);
	if (!codeResult.ok) return codeResult;
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) return ok(VoidSchema, undefined);
	proc.exitCode = codeResult.data as unknown as number;
	return ok(VoidSchema, undefined);
}

// =============================================================================
// Stdin
// =============================================================================

/**
 * Read all data from stdin (non-interactive) with a timeout.
 *
 * Returns an empty string if stdin is a TTY (interactive terminal),
 * or if no data arrives within `timeoutMs`. Returns an error in
 * non-Node environments.
 *
 * @param timeoutMs - Maximum time to wait for initial data (in milliseconds).
 * @returns `Promise<Result<Str>>` — stdin content, or `IO.READ_FAILED` if unavailable.
 *
 * @example
 * ```typescript
 * const input = await readStdin(100 as NonNegativeInteger);
 * if (!input.ok) return input;
 * if (input.data) { // got stdin content }
 * ```
 */
export async function readStdin(timeoutMs: NonNegativeInteger): Promise<Result<Str>> {
	const timeoutResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, timeoutMs);
	if (!timeoutResult.ok) return timeoutResult;

	const proc: OptionalNodeProcess = getProcess();
	if (!proc || !proc.stdin) {
		return err(ERRORS.IO.READ_FAILED, {
			meta: { stream: 'stdin' },
		});
	}

	const { stdin } = proc;

	try {
		const content: Str = (await new Promise<string>((resolve: (value: string) => void): void => {
			let data = '';
			let hasData: Bool = false;
			let resolved: Bool = false;

			const settleWith = (value: string): void => {
				if (resolved) return;
				resolved = true;
				resolve(value);
			};

			if (stdin.isTTY) {
				settleWith('');
				return;
			}

			const timeout: ReturnType<typeof setTimeout> = setTimeout(
				(): void => {
					if (!hasData) {
						stdin.removeAllListeners('data');
						stdin.removeAllListeners('end');
						stdin.removeAllListeners('error');
						settleWith('');
					}
				},
				timeoutResult.data as unknown as number,
			);

			stdin.setEncoding('utf8');

			stdin.on('data', (chunk: string): void => {
				hasData = true;
				clearTimeout(timeout);
				data += chunk;
			});

			stdin.on('end', (): void => {
				clearTimeout(timeout);
				settleWith(data);
			});

			stdin.on('error', (): void => {
				clearTimeout(timeout);
				settleWith('');
			});

			stdin.resume();
		})) as Str;
		return ok(StrSchema, content);
	} catch (error: unknown) {
		return err(ERRORS.IO.READ_FAILED, {
			meta: { stream: 'stdin' },
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Exit
// =============================================================================

/**
 * Exit the process with a specific exit code.
 *
 * Validates the exit code via `safeParse`. If validation fails,
 * exits with code `1` as a safe fallback.
 *
 * @param code - Exit code (0–255). Defaults to `0`.
 * @returns `Never` — process exits, control never returns.
 *
 * @example
 * ```typescript
 * exit(0); // success
 * exit(1); // failure
 * ```
 */
export function exit(code: OptionalExitCode = DEFAULT_EXIT_CODE): never {
	const proc: OptionalNodeProcess = getProcess();
	if (!proc) {
		throw new Error('exit() requires Node.js');
	}
	const codeResult: Result<OptionalExitCode> = safeParse(OptionalExitCodeSchema, code);
	// This is the wrapper itself — direct process.exit is intentional
	const exitCode: number = codeResult.ok
		? ((codeResult.data as unknown as number | undefined) ?? (DEFAULT_EXIT_CODE as number))
		: (FAILURE_EXIT_CODE as number);
	proc.exit(exitCode);
	// Unreachable — process.exit terminates, but TypeScript needs this for `never`
	throw new Error('process.exit() did not terminate');
}

/**
 * Print a formatted error message to stderr and exit the process.
 *
 * Validates the full options object with `FatalExitOptionsSchema`.
 * On validation failure, exits immediately with code `1`.
 *
 * @remarks Only for fire-and-forget event handlers where returning `Result` is
 *   impossible (e.g. `caddy.on('error', ...)`). All normal control flow MUST use
 *   the Result system and let `dispatchTool` handle error display.
 *
 * @param options - Error display options (message, exitCode, error, details).
 * @returns `Never` — process exits, control never returns.
 *
 * @example
 * ```typescript
 * fatalExit({ message: 'Config file not found', exitCode: 1 });
 * ```
 */
export function fatalExit(options: FatalExitOptions): never {
	if (!getProcess()) {
		throw new Error('fatalExit() requires Node.js');
	}
	const optionsResult: Result<FatalExitOptions> = safeParse(FatalExitOptionsSchema, options);
	if (!optionsResult.ok) exit(FAILURE_EXIT_CODE);

	const { message, exitCode, error, details } = optionsResult.data;

	writeStderr('\n');

	/*
	 * Inline ANSI codes instead of importing `style` from terminal.ts.
	 * This breaks the circular dependency: process ↔ terminal.
	 * fatalExit() is Node-only (guarded by getProcess()), so ANSI is safe.
	 */
	const BOLD = '\u001B[1m';
	const RED = '\u001B[31m';
	const DIM = '\u001B[2m';
	const RESET = '\u001B[0m';

	writeStderr(`${RED}${BOLD}Error:${RESET} ${message}\n`);

	if (details) {
		writeStderr(`${DIM}  ${details}${RESET}\n`);
	}

	if (error) {
		writeStderr('\n');
		writeStderr(`${DIM}Stack trace:${RESET}\n`);
		writeStderr(`${error instanceof Error ? error.stack : String(error)}\n`);
	}

	writeStderr('\n');
	exit(exitCode as ExitCode);
}
