/**
 * Runtime entry point.
 *
 * @module
 */

import * as v from 'valibot';

import { StrSchema, type Str } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result';

/** Runtime configuration schema. */
export const RuntimeConfigSchema = v.strictObject({
	/** Canvas element ID to render into. */
	canvasId: v.string(),
	/** Target frames per second. */
	targetFps: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(240)),
	/** Enable debug overlay. */
	debug: v.boolean(),
});

/** Inferred runtime configuration type. */
export type RuntimeConfig = v.InferOutput<typeof RuntimeConfigSchema>;

/**
 * Creates a new WebForge game runtime instance.
 *
 * @param _config - Runtime configuration.
 * @returns Result with the runtime version string.
 */
export function createRuntime(_config: RuntimeConfig): Result<Str> {
	// Placeholder — Babylon.js initialization will go here
	return ok(StrSchema, '0.0.0' as Str);
}
