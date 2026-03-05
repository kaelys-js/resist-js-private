/**
 * Server-side data schemas and service interface for project/user data.
 *
 * These schemas model data from the database (currently mock, future D1).
 * They are server-only — not part of the editor client store.
 *
 * @module
 */

import * as v from 'valibot';
import type { Result } from '@/schemas/result/result';
import type { Str } from '@/schemas/common';

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

// ── Server Project ───────────────────────────────────────────────────

/**
 * Schema for a project as loaded from the server.
 *
 * @example
 * const result = safeParse(ServerProjectSchema, {
 *     id: 'proj-001',
 *     name: 'Sample Project',
 *     subtitle: 'Sample Project Description',
 *     ownerId: 'user-001',
 * });
 */
export const ServerProjectSchema = v.strictObject({
	/** Unique project identifier. */
	id: v.pipe(v.string(), v.minLength(1)),
	/** Project display name. */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Optional project subtitle or description. */
	subtitle: v.optional(v.string(), ''),
	/** ID of the user who owns this project. */
	ownerId: v.pipe(v.string(), v.minLength(1)),
});

/** A project as loaded from the server. */
export type ServerProject = v.InferOutput<typeof ServerProjectSchema>;

// ── Server Scene ─────────────────────────────────────────────────────

/**
 * Schema for a scene within a project as loaded from the server.
 *
 * @example
 * const result = safeParse(ServerSceneSchema, {
 *     id: 'scene-001',
 *     title: 'Overworld',
 *     url: '#overworld',
 *     isActive: true,
 *     order: 0,
 * });
 */
export const ServerSceneSchema = v.strictObject({
	/** Unique scene identifier. */
	id: v.pipe(v.string(), v.minLength(1)),
	/** Scene display title. */
	title: v.string(),
	/** Scene URL path or hash fragment. */
	url: v.string(),
	/** Whether this scene is the currently active one. */
	isActive: v.optional(v.boolean(), false),
	/** Sort order within the project's scene list. */
	order: v.optional(v.number(), 0),
});

/** A scene within a project as loaded from the server. */
export type ServerScene = v.InferOutput<typeof ServerSceneSchema>;

// ── Data Service Interface ───────────────────────────────────────────

/**
 * Abstract data service interface for project and scene data access.
 *
 * Implementations can be swapped between mock (dev) and D1 (production)
 * via the `createDataService` factory.
 */
export type DataService = {
	/** Project data operations. */
	projects: {
		/**
		 * Gets the project owned by the given user.
		 *
		 * @param ownerId - The user ID to look up
		 * @returns The project, or null if none found
		 */
		getByOwner: (ownerId: Str) => Promise<Result<ServerProject | null>>;
	};
	/** Scene data operations. */
	scenes: {
		/**
		 * Gets all scenes belonging to the given project.
		 *
		 * @param projectId - The project ID to look up
		 * @returns Array of scenes, empty if none found
		 */
		getByProject: (projectId: Str) => Promise<Result<ServerScene[]>>;
	};
};
