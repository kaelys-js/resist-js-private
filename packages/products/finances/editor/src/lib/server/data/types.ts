/**
 * Server-side data schemas for user data.
 *
 * These schemas model data from the database (currently mock).
 * They are server-only — not part of the editor client store.
 *
 * @module
 */

import * as v from 'valibot';

// ── Server User ──────────────────────────────────────────────────────

/**
 * Schema for a user profile as loaded from the server.
 *
 * @example
 * const result = safeParse(ServerUserSchema, {
 *     id: 'user-001',
 *     displayName: 'Test User',
 *     email: 'test-user@example.com',
 *     avatarUrl: 'https://example.com/avatar.png',
 * });
 */
export const ServerUserSchema = v.strictObject({
	/** Unique user identifier. */
	id: v.pipe(v.string(), v.minLength(1)),
	/** User's display name. */
	displayName: v.pipe(v.string(), v.minLength(1)),
	/** User's email address. */
	email: v.pipe(v.string(), v.email()),
	/** URL to the user's avatar image. */
	avatarUrl: v.optional(v.string(), ''),
});

/** A user profile as loaded from the server. */
export type ServerUser = v.InferOutput<typeof ServerUserSchema>;
