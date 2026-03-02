/**
 * ObjectInstance schema — placement data for thin-instance rendered objects.
 *
 * Each object instance represents a placed prop, NPC, event trigger, or
 * other interactable in the game world. Instances sharing a meshType are
 * rendered as Babylon.js thin instances (1 draw call per type).
 *
 * @example
 * ```typescript
 * import { ObjectInstanceSchema, type ObjectInstance } from './object-instance';
 *
 * const result = safeParse(ObjectInstanceSchema, {
 *   id: 'torch-1', meshType: 'torch', position: [10, 0, 20],
 * });
 * if (result.ok) result.data.position; // [10, 0, 20]
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// ObjectInstance Schema
// =============================================================================

/**
 * Schema for a placed object instance in the game world.
 *
 * Instances sharing a `meshType` are batched into a single draw call
 * via Babylon.js thin instances. The quadtree spatial index provides
 * fast frustum culling for per-frame visibility updates.
 */
export const ObjectInstanceSchema = v.pipe(
	v.strictObject({
		/** Unique instance ID. */
		id: v.pipe(v.string(), v.nonEmpty()),
		/** Base mesh type identifier (e.g., 'torch', 'tree-oak'). */
		meshType: v.pipe(v.string(), v.nonEmpty()),
		/** World position [x, y, z]. */
		position: v.strictTuple([v.number(), v.number(), v.number()]),
		/** Euler rotation [x, y, z] in radians. */
		rotation: v.optional(
			v.strictTuple([v.number(), v.number(), v.number()]),
			(): [number, number, number] => [0, 0, 0],
		),
		/** Scale [x, y, z]. */
		scale: v.optional(
			v.strictTuple([v.number(), v.number(), v.number()]),
			(): [number, number, number] => [1, 1, 1],
		),
		/** Per-instance tint color [r, g, b, a]. */
		tintColor: v.optional(
			v.strictTuple([v.number(), v.number(), v.number(), v.number()]),
			(): [number, number, number, number] => [1, 1, 1, 1],
		),
		/** Whether this instance is visible. */
		visible: v.optional(v.boolean(), true),
		/** Event script ID. */
		eventId: v.optional(v.string(), ''),
		/** Script hook identifier. */
		scriptHook: v.optional(v.string(), ''),
		/** Custom game logic properties. */
		properties: v.optional(
			v.record(v.string(), v.union([v.string(), v.number(), v.boolean()])),
			() => ({}),
		),
	}),
	v.readonly(),
);

/** A placed object instance in the game world. */
export type ObjectInstance = v.InferOutput<typeof ObjectInstanceSchema>;
