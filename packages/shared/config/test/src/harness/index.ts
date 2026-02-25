/**
 * Shared test harness utilities for reducing boilerplate across the monorepo.
 *
 * Each utility is also independently importable via its own export path
 * (e.g., `@/config/test/harness/temp-dir`). This barrel re-exports everything
 * for convenience when multiple utilities are needed in a single test file.
 *
 * @example
 * ```typescript
 * // Import individual utilities (preferred for tree-shaking clarity):
 * import { useTempDir } from '@/config/test/harness/temp-dir';
 * import { useConsoleSpy } from '@/config/test/harness/console';
 *
 * // Or import from the barrel:
 * import { useTempDir, useConsoleSpy, stripAnsi } from '@/config/test/harness';
 * ```
 *
 * @module
 */

// ANSI utilities
export { ANSI_REGEX, stripAnsi } from './ansi.ts';

// Temporary directory lifecycle
export { createTempDir, useTempDir, type TempDir } from './temp-dir.ts';

// Console capture and assertions
export {
	createConsoleSpy,
	useConsoleSpy,
	type ConsoleSpy,
	type ConsoleSpyOptions,
	type ViSpyProvider,
} from './console.ts';

// Process state spying and restoration
export {
	createExitSpy,
	useExitSpy,
	snapshotProcess,
	useProcessSnapshot,
	type ExitSpy,
	type ProcessSnapshot,
	type ProcessSnapshotOptions,
} from './process.ts';

// Async testing utilities
export {
	waitFor,
	retry,
	withTimeout,
	withAbort,
	type WaitForOptions,
	type RetryOptions,
} from './async.ts';

// HTTP Request/Response factories
export {
	createRequest,
	createResponse,
	parseJson,
	type CreateRequestOptions,
	type CreateResponseOptions,
} from './http.ts';

// Fake timer/clock utilities
export {
	createFakeClock,
	useFakeClock,
	type FakeClock,
	type ViFakeTimerProvider,
} from './clock.ts';
