/**
 * Core Utilities -- Barrel Export
 *
 * Re-exports all modules in `@/utils/core` for convenience.
 * Individual subpath imports (e.g., `@/utils/core/logger`) are preferred
 * for tree-shaking; this barrel is provided for cases where a single
 * import is more ergonomic.
 *
 * Name collisions between modules:
 * - `log` is exported by both `logger` and `terminal`. The barrel
 *   exposes `terminal`'s version (styled, environment-aware); import
 *   `@/utils/core/logger` directly for the base version.
 * - `truncateLine` is exported by both `string` and `terminal`. The
 *   barrel exposes `terminal`'s version (auto-detects width); import
 *   `@/utils/core/string` directly for the core version.
 *
 * @module
 */

export * from './agent';
export * from './async';
export * from './environment';
export * from './format';
export * from './node-imports';
export * from './object';
export * from './output-context';
export * from './path';
export * from './process';
export * from './provider';
export * from './signal';

// logger — exclude `log` (collides with terminal's `log`)
export {
	setLogLevel,
	getLogLevel,
	shouldLog,
	setContext,
	getContext,
	mergeContext,
	type LogTransport,
	TransportConfigSchema,
	type TransportConfig,
	addTransport,
	removeTransport,
	clearTransports,
	RedactionConfigSchema,
	type RedactionConfig,
	setRedaction,
	SamplingConfigSchema,
	type SamplingConfig,
	setSampling,
	clearSampling,
	BufferConfigSchema,
	type BufferConfig,
	enableBuffer,
	flushBuffer,
	disableBuffer,
	ChildLoggerOptionsSchema,
	type ChildLoggerOptions,
	type ChildLogger,
	createChildLogger,
	startTimer,
	initLogLevelFromEnv,
	withLogLevel,
	initAsyncContext,
	withContext,
	JUnitTestCaseSchema,
	type JUnitTestCase,
	formatJUnit,
	LoggingOptionsSchema,
	type LoggingOptions,
	setupLogging,
	log as baseLog,
} from './logger';

// string — exclude `truncateLine` (collides with terminal's `truncateLine`)
export { padRight, toCamelCase } from './string';

// terminal — its `log` and `truncateLine` take precedence in the barrel
export * from './terminal';
