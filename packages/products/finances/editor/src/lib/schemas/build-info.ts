/**
 * Build-time metadata schema — git commit info, version, and build timestamp.
 *
 * All fields are populated at compile time via Vite `define` and are
 * never persisted or user-editable.
 *
 * @module
 */

import * as v from 'valibot';

/**
 * Schema for build-time metadata injected by Vite `define`.
 *
 * Contains git commit info, version, branch, dirty flag, and build timestamp.
 * All fields are populated at compile time — never persisted or user-editable.
 *
 * @example
 * ```typescript
 * const result = safeParse(BuildInfoSchema, {
 *   version: '0.0.0',
 *   commit: 'abc1234',
 *   commitFull: 'abc1234def5678901234567890abcdef12345678',
 *   branch: 'main',
 *   dirty: false,
 *   buildTimestamp: '2026-01-01T00:00:00.000Z',
 * });
 * ```
 */
export const BuildInfoSchema = v.strictObject({
	/** Semantic version string (e.g., `'0.1.0'`). */
	version: v.pipe(v.string(), v.minLength(1)),
	/** Short git commit hash (e.g., `'abc1234'`). */
	commit: v.pipe(v.string(), v.minLength(1)),
	/** Full 40-character git commit hash. */
	commitFull: v.pipe(v.string(), v.minLength(1)),
	/** Git branch name at build time. */
	branch: v.pipe(v.string(), v.minLength(1)),
	/** Whether the working tree had uncommitted changes at build time. */
	dirty: v.boolean(),
	/** ISO 8601 timestamp of when the build was created. */
	buildTimestamp: v.pipe(v.string(), v.isoTimestamp()),
});

/** Inferred type for build-time metadata. */
export type BuildInfo = v.InferOutput<typeof BuildInfoSchema>;
