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
	version: v.pipe(v.string(), v.minLength(1)),
	commit: v.pipe(v.string(), v.minLength(1)),
	commitFull: v.pipe(v.string(), v.minLength(1)),
	branch: v.pipe(v.string(), v.minLength(1)),
	dirty: v.boolean(),
	buildTimestamp: v.pipe(v.string(), v.isoTimestamp()),
});

/** Inferred type for build-time metadata. */
export type BuildInfo = v.InferOutput<typeof BuildInfoSchema>;
