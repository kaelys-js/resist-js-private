/**
 * Scene setup configuration schema.
 *
 * Defines the default scene environment: clear color, ambient color,
 * fog settings, and the default hemispheric light for HD-2D rendering.
 *
 * Color values use the Babylon.js convention: floats in the [0, 1] range.
 * `clearColor` is RGBA (Color4), `ambientColor` is RGB with optional alpha,
 * fog color is RGB with optional alpha.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SceneSetupConfigSchema, type SceneSetupConfig } from './scene-setup-config';
 *
 * const result = safeParse(SceneSetupConfigSchema, {});
 * if (result.ok) {
 *   result.data.clearColor;   // { r: 0.15, g: 0.15, b: 0.2, a: 1 }
 *   result.data.defaultLight; // true
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ColorRgbaSchema } from './color-schema';
import { FogConfigSchema } from './fog-config';

// =============================================================================
// Scene Setup Schema
// =============================================================================

/**
 * Scene setup configuration schema.
 *
 * Controls the default visual environment for the HD-2D scene: background
 * color, ambient lighting, fog, and the default hemispheric light.
 *
 * The default light is a `HemisphericLight` pointing upward (sky direction)
 * with a dim ground color for subtle bounce lighting — essential for the
 * HD-2D depth illusion.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SceneSetupConfigSchema } from './scene-setup-config';
 *
 * // All defaults — dark blue-gray background, hemispheric light at 0.7
 * const result = safeParse(SceneSetupConfigSchema, {});
 *
 * // Custom — no default light, linear fog
 * const custom = safeParse(SceneSetupConfigSchema, {
 *   defaultLight: false,
 *   fog: { mode: 'linear', start: 10, end: 100 },
 * });
 * ```
 */
export const SceneSetupConfigSchema = v.strictObject({
	/** Scene clear (background) color. Default: dark blue-gray (0.15, 0.15, 0.2, 1). */
	clearColor: v.optional(ColorRgbaSchema, { r: 0.15, g: 0.15, b: 0.2, a: 1 }),

	/** Scene ambient color. Default: dim gray (0.3, 0.3, 0.3). */
	ambientColor: v.optional(ColorRgbaSchema, { r: 0.3, g: 0.3, b: 0.3, a: 1 }),

	/** Optional fog configuration. Undefined means no fog. */
	fog: v.optional(FogConfigSchema),

	/** Whether to create a default hemispheric light. Default: true. */
	defaultLight: v.optional(v.boolean(), true),

	/** Default light intensity [0, 10]. Default: 0.7. */
	defaultLightIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10)), 0.7),

	/** Default light ground (bounce) color. Default: dim gray (0.2, 0.2, 0.2). */
	defaultLightGroundColor: v.optional(ColorRgbaSchema, { r: 0.2, g: 0.2, b: 0.2, a: 1 }),
});

/** Inferred scene setup configuration type from {@link SceneSetupConfigSchema}. */
export type SceneSetupConfig = v.InferOutput<typeof SceneSetupConfigSchema>;
