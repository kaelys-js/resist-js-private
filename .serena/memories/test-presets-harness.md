# `@/test-presets/harness` + `bench` — per-shim detail

> Captured 2026-05-05. Path: `packages/shared/config/test/src/`. Per-file detail for each `harness/*.ts` file + `bench/data.ts`. Companion to `test-presets-overview` (presets summary). Do NOT duplicate the preset content from there.

## `harness/index.ts` — barrel

Re-exports all harness utilities:
```ts
export * from './ansi.ts';
export * from './async.ts';
export * from './clock.ts';
export * from './console.ts';
export * from './http.ts';
export {
  type ExitSpy, type ExitSpyHooks, type ProcessSnapshot, type ProcessSnapshotHooks,
  type ProcessSnapshotOptions, createExitSpy, snapshotProcess, useExitSpy, useProcessSnapshot,
} from './process.ts';
export * from './temp-dir.ts';
```

`process.ts` is selectively exported (typed re-export) — most others use `export *`.

## Per-shim details

### `harness/ansi.ts` — ANSI escape capture/strip

**Constants**: `ANSI_REGEX` — pattern matching ANSI escape sequences (CSI codes for color, cursor movement, screen clearing, etc.).
**Functions**:
- `stripAnsi(text: string): string` — removes all ANSI escapes from a string.

**When to use**: comparing CLI output that contains color codes against expected text. Strip first, then assert.

**Paired test**: `ansi.test.ts` validates the regex against representative escape sequences (8-color, 256-color, RGB, OSC, cursor moves).

### `harness/async.ts` — async test utilities

**Functions**:
- `withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T>` — wraps a promise with a timeout. Rejects with `Error('Timeout: ${label}')` if not resolved in time.
- `withAbort<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T>` — passes an AbortSignal to the worker; aborts after `ms`.
- `waitFor(predicate: () => boolean | Promise<boolean>, options?: WaitForOptions): Promise<void>` — polls a predicate until true. Options: `{ interval, timeout }`.
- `retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>` — retries on failure with backoff. Options: `{ attempts, delayMs, exponential }`.

**Types**: `WaitForOptions`, `RetryOptions`.

**When to use**: tests that need to wait on async state (e.g., "wait for status bar to update"), tests that race against a timeout, tests that retry flaky operations.

### `harness/clock.ts` — fake clock (sinon-style)

**Functions**:
- `createFakeClock(): FakeClock` — creates a virtual clock; `clock.tick(ms)` advances time, `clock.now()` returns current time, `clock.dispose()` restores real timers.
- `useFakeClock(viFakeTimerProvider: ViFakeTimerProvider): FakeClockHooks` — installs the fake clock for the duration of a test (uses Vitest's `vi.useFakeTimers()`/`vi.useRealTimers()` under the hood). Returns hooks for `beforeEach`/`afterEach` integration.

**Types**: `FakeClock`, `FakeClockHooks`, `ViFakeTimerProvider` — abstracts the Vitest timer API for dependency injection in tests.

**When to use**: tests that exercise time-based code (debouncers, retries, expiration logic).

### `harness/console.ts` — console capture/silence

**Functions**:
- `createConsoleSpy(options?: ConsoleSpyOptions): ConsoleSpy` — captures `console.log/info/warn/error/debug` calls.
- `useConsoleSpy(viSpyProvider: ViSpyProvider, options?: ConsoleSpyOptions): ConsoleSpyHooks` — installs spy for duration of a test.

**Types**:
- `ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'`.
- `ConsoleSpy { calls: Array<{method, args}>, methods: ConsoleMethod[], reset(), restore() }`.
- `ConsoleSpyOptions { methods?, silent? (suppress real output) }`.
- `ConsoleSpyHooks { spy, beforeEach, afterEach }`.
- `ViSpyProvider` — abstracts Vitest's `vi.spyOn(console, ...)`.

**When to use**: tests that need to assert on what was logged (CLI output, beacon errors, structured log entries).

### `harness/http.ts` — fetch/HTTP test fixtures

**Functions**:
- `createRequest(options: CreateRequestOptions): Request` — builds a Web `Request` with sensible defaults.
- `createResponse(options: CreateResponseOptions): Response` — builds a `Response`.
- `parseJson<T>(response: Response): Promise<T>` — async JSON parse with a typed return.

**Types**: `CreateRequestOptions { url?, method?, headers?, body?, ... }`, `CreateResponseOptions { status?, headers?, body?, ... }`.

**When to use**: testing SvelteKit endpoints (`/api/*`) without spinning up a server. Build a request, pass to the handler, assert on response.

### `harness/process.ts` — process.exit + env spies

**Functions**:
- `createExitSpy(viSpyProvider): ExitSpy` — spies on `process.exit` so tests don't actually terminate.
- `useExitSpy(viSpyProvider): ExitSpyHooks` — for-each-test integration.
- `snapshotProcess(options?: ProcessSnapshotOptions): ProcessSnapshot` — captures `process.env` + `process.argv` so they can be restored after a test mutates them.
- `useProcessSnapshot(options): ProcessSnapshotHooks` — for-each-test integration.

**Types**: `ExitSpy`, `ExitSpyHooks`, `ProcessSnapshot`, `ProcessSnapshotHooks`, `ProcessSnapshotOptions { keepEnv?, keepArgv? }`.

**When to use**: tests for CLI tools that mutate `process.env`/`process.argv` and might call `process.exit()`. Snapshot before, restore after; spy on exit instead of letting the test process die.

### `harness/temp-dir.ts` — tempdir lifecycle

**Functions**:
- `createTempDir(): TempDir` — creates a unique temp directory, returns `{ path, cleanup() }`.
- `useTempDir(): TempDirHooks` — for-each-test integration; auto-cleanup in `afterEach`.

**Types**: `TempDir { path, cleanup }`, `TempDirHooks { tempDir, beforeEach, afterEach }`.

**When to use**: tests that touch the filesystem (write a file, run a CLI tool against a sample dir). Each test gets its own isolated tempdir; auto-cleanup prevents leaks.

## Per-shim test coverage

Every shim has a paired `*.test.ts` validating its own behavior:
- `ansi.test.ts` — strip behavior on representative escapes.
- `async.test.ts` — `withTimeout` rejects after timeout; `waitFor` polls correctly; `retry` exponential backoff.
- `clock.test.ts` — `tick` advances time; `dispose` restores; integration with Vitest fake timers.
- `console.test.ts` — captures `log/info/warn/error/debug`; `reset()` clears; `silent` suppresses real output.
- `http.test.ts` — `createRequest`/`createResponse` defaults; `parseJson` types correctly.
- `process.test.ts` — exit spy intercepts `process.exit`; snapshot+restore round-trips env/argv.
- `temp-dir.test.ts` — creates unique dirs; cleanup removes recursively.

These tests run in the `test-presets` vitest project.

## `bench/data.ts` — benchmark fixtures

**Functions**:
- `deterministicString(seed: number, length: number): string` — generates a reproducible string from a seed (uses an internal `CHARS` alphabet).
- `generateStrings(count: number, length: number): string[]` — array of deterministic strings.
- `generateObjects(count: number, fields: number): Record<string, unknown>[]` — array of objects with N fields each.
- `generateNestedObjects(count: number, depth: number, fanout: number): unknown[]` — deeply nested objects (good for testing recursion limits).
- `generateFilePaths(options: GenerateFilePathsOptions): string[]` — synthetic file path tree using `DIR_SEGMENTS` (e.g., `src`, `lib`, `utils`, etc.) and `FILE_NAMES` (e.g., `index`, `main`, `helper`, etc.).
- `generatePayload(size: number): string` — generates a payload of approx N bytes.

**Constants**: `CHARS` (alphabet), `DIR_SEGMENTS` (path components), `FILE_NAMES` (file basenames).

**Type**: `GenerateFilePathsOptions { count, dirDepth, extension }`.

**When to use**: benchmark tests (`*.bench.ts`) that need realistic fixture data without I/O.

**Paired test**: `data.test.ts` validates determinism (same seed → same output) and shape (correct counts/sizes).

## Patterns

- **All harness utilities are pure functions or factory functions** — no module-level state.
- **Vitest dependency injection** via abstract types (`ViSpyProvider`, `ViFakeTimerProvider`) — lets the harness work with any Vitest version without hard-coupling.
- **`use*Hooks` pattern** — every shim provides both a low-level `create*` factory AND a `use*` hooks integration for `beforeEach`/`afterEach`.
- **No global state across tests** — each test that uses a shim creates its own instance.

## Cross-references

- `test-presets-overview` — preset factory functions (`createNodeTestConfig`, `createSvelteTestConfig`, `createPlaywrightConfig`).
- `build-and-test` — vitest project layout.
- `config-files` — root `vitest.config.ts` defining the 24 projects.
