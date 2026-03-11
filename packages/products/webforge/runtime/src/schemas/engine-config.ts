/**
 * Engine configuration schema.
 *
 * Defines the Babylon.js engine initialization options: renderer backend
 * selection (WebGL2, WebGPU, or auto-detect), canvas target, frame rate cap,
 * antialiasing, HiDPI adaptation, stencil buffer, power preference, WebGL
 * context loss handling, and debug mode.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { EngineConfigSchema, type EngineConfig } from './engine-config';
 *
 * const result = safeParse(EngineConfigSchema, { canvasId: 'game-canvas' });
 * if (result.ok) {
 *   result.data.renderer;  // 'auto'
 *   result.data.targetFps; // 60
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

/**
 * Babylon.js engine configuration schema.
 *
 * Only `canvasId` is required — all other fields have sensible defaults
 * tuned for HD-2D rendering with high visual fidelity.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { EngineConfigSchema } from './engine-config';
 *
 * // Minimal — all defaults applied
 * const minimal = safeParse(EngineConfigSchema, { canvasId: 'game-canvas' });
 *
 * // Explicit — override everything
 * const explicit = safeParse(EngineConfigSchema, {
 *   canvasId: 'game-canvas',
 *   renderer: 'webgpu',
 *   targetFps: 120,
 *   antialias: true,
 *   adaptToDeviceRatio: true,
 *   stencil: true,
 *   preserveDrawingBuffer: false,
 *   powerPreference: 'high-performance',
 *   doNotHandleContextLost: false,
 *   debug: false,
 * });
 * ```
 */
export const EngineConfigSchema = v.strictObject({
  /** DOM id of the `<canvas>` element to render into. Must be non-empty. */
  canvasId: v.pipe(v.string(), v.minLength(1)),

  /**
   * Renderer backend selection.
   *
   * - `'auto'` — uses `EngineFactory.CreateAsync` to pick WebGPU if available, else WebGL2.
   * - `'webgpu'` — forces WebGPU; falls back to WebGL2 if unsupported.
   * - `'webgl2'` — forces WebGL2.
   */
  renderer: v.optional(v.picklist(['webgl2', 'webgpu', 'auto']), 'auto'),

  /** Target frames per second. Engine caps the render loop to this rate. */
  targetFps: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(240)), 60),

  /** Enable MSAA antialiasing on the WebGL/WebGPU context. */
  antialias: v.optional(v.boolean(), true),

  /** Adapt rendering resolution to the device pixel ratio (HiDPI). */
  adaptToDeviceRatio: v.optional(v.boolean(), true),

  /** Enable stencil buffer (required for HighlightLayer in editor). */
  stencil: v.optional(v.boolean(), true),

  /** Preserve the drawing buffer for screenshot capture. */
  preserveDrawingBuffer: v.optional(v.boolean(), false),

  /** GPU power preference hint passed to the WebGL/WebGPU context. */
  powerPreference: v.optional(
    v.picklist(['default', 'high-performance', 'low-power']),
    'high-performance',
  ),

  /** When true, skips automatic WebGL context loss/restore handling. */
  doNotHandleContextLost: v.optional(v.boolean(), false),

  /** Enable debug mode (inspector, performance monitor, verbose logging). */
  debug: v.optional(v.boolean(), false),
});

/** Inferred engine configuration type from {@link EngineConfigSchema}. */
export type EngineConfig = v.InferOutput<typeof EngineConfigSchema>;
