/**
 * GPU tile data texture — RGBA32F packing and texture management.
 *
 * Packs tile layer data into GPU-friendly RGBA32F format where:
 * - R channel = tile ID (float, exact for integers up to 2^24)
 * - G channel = visual flags bitfield (float, exact for integers up to 2^24)
 * - B channel = reserved (0)
 * - A channel = reserved (0)
 *
 * Uses float textures instead of integer textures because Babylon.js
 * RawTexture does not reliably create RGBA32UI textures (the WebGL
 * texture handle is never allocated). Float32 can exactly represent
 * all integers up to 2^24, which is sufficient for tile IDs and flags.
 *
 * Provides single-tile GPU updates via `texSubImage2D` (~0.01ms)
 * instead of rebuilding entire chunk vertex buffers (~2ms).
 *
 * @example
 * ```typescript
 * import { packVisualFlags, buildLayerData } from './gpu-tile-data-texture';
 *
 * const flags = packVisualFlags({ flipH: true, opacity: 15, ...defaults });
 * const result = buildLayerData({ tileIds: [1, 2, 3, 0], width: 2, height: 2 });
 * if (result.ok) result.data; // Float32Array with RGBA32F data
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import { fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Constants
// =============================================================================

/** Default visual flags value for non-empty tiles (opacity=15, all else off). */
const DEFAULT_FLAGS_VALUE: Num = 0xf0;

// =============================================================================
// Visual Flags Schema
// =============================================================================

/**
 * Per-tile visual flags packed into a uint32 bitfield.
 *
 * Bit layout:
 * ```
 * Bit(s)  Width  Field
 * 0       1      flipH
 * 1       1      flipV
 * 2–3     2      rotation (0=0°, 1=90°, 2=180°, 3=270°)
 * 4–7     4      opacity (0–15 → 0.0–1.0)
 * 8       1      shadowDisable (1 = don't receive shadows)
 * 9       1      glow
 * 10–15   6      tintIndex (0–63 palette lookup)
 * 16–23   8      animBase (animation start frame offset)
 * 24–27   4      animCount (0–15 frames)
 * 28      1      bush (lower sprite transparency)
 * 29–31   3      reserved
 * ```
 */
export const VisualFlagsSchema = v.pipe(
	v.strictObject({
		/** Flip tile horizontally. */
		flipH: v.boolean(),
		/** Flip tile vertically. */
		flipV: v.boolean(),
		/** Rotation (0=0°, 1=90°, 2=180°, 3=270°). */
		rotation: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3)),
		/** Opacity level (0–15 → 0.0–1.0). */
		opacity: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)),
		/** Disable shadow receiving for this tile. */
		shadowDisable: v.boolean(),
		/** Enable glow for this tile. */
		glow: v.boolean(),
		/** Tint palette index (0–63). */
		tintIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(63)),
		/** Animation start frame offset (0–255). */
		animBase: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
		/** Animation frame count (0–15). */
		animCount: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)),
		/** Bush transparency (lower half of sprite). */
		bush: v.boolean(),
	}),
	v.readonly(),
);

/** Per-tile visual flags. */
export type VisualFlags = v.InferOutput<typeof VisualFlagsSchema>;

/** Default visual flags (full opacity, everything else off). */
export const DEFAULT_VISUAL_FLAGS: VisualFlags = Object.freeze({
	flipH: false,
	flipV: false,
	rotation: 0,
	opacity: 15,
	shadowDisable: false,
	glow: false,
	tintIndex: 0,
	animBase: 0,
	animCount: 0,
	bush: false,
});

// =============================================================================
// Build Layer Data Options
// =============================================================================

/** Options schema for {@link buildLayerData}. */
export const BuildLayerDataOptionsSchema = v.pipe(
	v.strictObject({
		/** Flat array of tile IDs (length must equal width × height). */
		tileIds: v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
		/** Map width in tiles. */
		width: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Map height in tiles. */
		height: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Optional per-tile visual flags (same length as tileIds). */
		visualFlags: v.optional(
			v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
		),
	}),
	v.readonly(),
);

/** Options for {@link buildLayerData}. */
export type BuildLayerDataOptions = v.InferOutput<typeof BuildLayerDataOptionsSchema>;

/** Options schema for {@link buildHeightData}. */
export const BuildHeightDataOptionsSchema = v.pipe(
	v.strictObject({
		/** Flat array of height values (length must equal width × height). */
		heights: v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
		/** Map width in tiles. */
		width: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Map height in tiles. */
		height: v.pipe(v.number(), v.integer(), v.minValue(1)),
	}),
	v.readonly(),
);

/** Options for {@link buildHeightData}. */
export type BuildHeightDataOptions = v.InferOutput<typeof BuildHeightDataOptionsSchema>;

// =============================================================================
// packVisualFlags
// =============================================================================

/**
 * Encodes visual flag fields into a single uint32 bitfield.
 *
 * @param flags - The visual flag fields to pack
 * @returns Packed uint32 value
 *
 * @example
 * ```typescript
 * const packed = packVisualFlags({ flipH: true, opacity: 15, ...DEFAULT_VISUAL_FLAGS });
 * // packed === 0xF1 (opacity=15 at bits 4-7, flipH=1 at bit 0)
 * ```
 */
export function packVisualFlags(flags: VisualFlags): Num {
	let packed: Num = 0;

	if (flags.flipH) packed |= 1;
	if (flags.flipV) packed |= 1 << 1;
	packed |= (flags.rotation & 0x3) << 2;
	packed |= (flags.opacity & 0xf) << 4;
	if (flags.shadowDisable) packed |= 1 << 8;
	if (flags.glow) packed |= 1 << 9;
	packed |= (flags.tintIndex & 0x3f) << 10;
	packed |= (flags.animBase & 0xff) << 16;
	packed |= (flags.animCount & 0xf) << 24;
	if (flags.bush) packed |= 1 << 28;

	return packed;
}

// =============================================================================
// unpackVisualFlags
// =============================================================================

/**
 * Decodes a uint32 bitfield into visual flag fields.
 *
 * @param packed - The packed uint32 value
 * @returns Decoded visual flag fields
 *
 * @example
 * ```typescript
 * const flags = unpackVisualFlags(0xF0);
 * // flags.opacity === 15, everything else off/zero
 * ```
 */
export function unpackVisualFlags(packed: Num): VisualFlags {
	return {
		flipH: (packed & 0x1) !== 0,
		flipV: ((packed >>> 1) & 0x1) !== 0,
		rotation: (packed >>> 2) & 0x3,
		opacity: (packed >>> 4) & 0xf,
		shadowDisable: ((packed >>> 8) & 0x1) !== 0,
		glow: ((packed >>> 9) & 0x1) !== 0,
		tintIndex: (packed >>> 10) & 0x3f,
		animBase: (packed >>> 16) & 0xff,
		animCount: (packed >>> 24) & 0xf,
		bush: ((packed >>> 28) & 0x1) !== 0,
	};
}

// =============================================================================
// buildLayerData
// =============================================================================

/**
 * Packs a flat tile ID array into RGBA32F format for GPU upload.
 *
 * Each tile occupies 4 float32 values (R, G, B, A):
 * - R = tile ID (float, exact for integers up to 2^24)
 * - G = visual flags bitfield (float, exact for integers up to 2^24)
 * - B = reserved (0)
 * - A = reserved (0)
 *
 * @param options - Tile IDs, map dimensions, optional per-tile flags
 * @returns Result containing the packed Float32Array
 *
 * @example
 * ```typescript
 * const result = buildLayerData({ tileIds: [1, 2, 3, 0], width: 2, height: 2 });
 * if (result.ok) result.data.length; // 16 (4 tiles × 4 channels)
 * ```
 */
export function buildLayerData(
	options: BuildLayerDataOptions,
): BabylonResult<Float32Array<ArrayBufferLike>> {
	const { tileIds, width, height, visualFlags } = options;

	const tileCount: Num = width * height;

	if (tileIds.length !== tileCount) {
		return err(
			ERRORS.VALIDATION.SCHEMA_FAILED,
			`Tile ID array length (${String(tileIds.length)}) does not match dimensions (${String(width)}×${String(height)} = ${String(tileCount)})`,
		);
	}

	if (visualFlags && visualFlags.length !== tileCount) {
		return err(
			ERRORS.VALIDATION.SCHEMA_FAILED,
			`Visual flags array length (${String(visualFlags.length)}) does not match tile count (${String(tileCount)})`,
		);
	}

	const data: Float32Array<ArrayBufferLike> = new Float32Array(tileCount * 4);

	for (let i: Num = 0; i < tileCount; i++) {
		const tileId: Num = tileIds[i] ?? 0;
		const offset: Num = i * 4;

		data[offset] = tileId; // R = tile ID

		if (tileId !== 0) {
			// G = visual flags (custom or default)
			data[offset + 1] = visualFlags
				? (visualFlags[i] ?? DEFAULT_FLAGS_VALUE)
				: DEFAULT_FLAGS_VALUE;
		}
		// else: R=0, G=0, B=0, A=0 (all zero for empty tiles)
	}

	return okShallow(data);
}

// =============================================================================
// buildHeightData
// =============================================================================

/**
 * Packs a flat height array into a Float32Array for GPU upload.
 *
 * Each element is a float height value. The resulting texture
 * uses R32F format and is read by the height vertex shader
 * via `texelFetch` to displace vertices vertically.
 *
 * @param options - Height values and map dimensions
 * @returns Result containing the packed Float32Array
 *
 * @example
 * ```typescript
 * const result = buildHeightData({ heights: [0, 1, 0.5, 2], width: 2, height: 2 });
 * if (result.ok) result.data.length; // 4
 * ```
 */
export function buildHeightData(
	options: BuildHeightDataOptions,
): BabylonResult<Float32Array<ArrayBufferLike>> {
	const { heights, width, height } = options;

	const tileCount: Num = width * height;

	if (heights.length !== tileCount) {
		return err(
			ERRORS.VALIDATION.SCHEMA_FAILED,
			`Height array length (${String(heights.length)}) does not match dimensions (${String(width)}×${String(height)} = ${String(tileCount)})`,
		);
	}

	const data: Float32Array<ArrayBufferLike> = new Float32Array(tileCount);

	for (let i: Num = 0; i < tileCount; i++) {
		data[i] = heights[i] ?? 0;
	}

	return okShallow(data);
}

// =============================================================================
// buildHeightDataTexture
// =============================================================================

/** Options schema for {@link buildHeightDataTexture}. */
export const BuildHeightDataTextureOptionsSchema = v.pipe(
	v.strictObject({
		/** The Babylon.js scene. */
		scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
		/** Flat array of height values (length must equal width × height). */
		heights: v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
		/** Map width in tiles. */
		width: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Map height in tiles. */
		height: v.pipe(v.number(), v.integer(), v.minValue(1)),
	}),
	v.readonly(),
);

/** Options for {@link buildHeightDataTexture}. */
export type BuildHeightDataTextureOptions = v.InferOutput<
	typeof BuildHeightDataTextureOptionsSchema
>;

/**
 * Creates an R32F height data texture from height values.
 *
 * Combines {@link buildHeightData} (CPU-side Float32Array packing) with
 * GPU texture creation. Uses NEAREST sampling and CLAMP address mode
 * for exact per-tile height lookup via `texelFetch` in the vertex shader.
 *
 * @param options - Scene, height values, and map dimensions
 * @returns BabylonResult containing the height RawTexture
 *
 * @example
 * ```typescript
 * const result = buildHeightDataTexture({ scene, heights: [0, 1, 0.5, 2], width: 2, height: 2 });
 * if (result.ok) material.setTexture('heightDataTexture', result.data);
 * ```
 */
export function buildHeightDataTexture(
	options: BuildHeightDataTextureOptions,
): BabylonResult<BABYLON.RawTexture> {
	const { scene, heights, width, height } = options;

	const dataResult = buildHeightData({ heights, width, height });
	if (!dataResult.ok) return dataResult;

	try {
		const texture: BABYLON.RawTexture = new BABYLON.RawTexture(
			dataResult.data,
			width,
			height,
			BABYLON.Constants.TEXTUREFORMAT_R,
			scene,
			false, // generateMipMaps
			false, // invertY
			BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
			BABYLON.Constants.TEXTURETYPE_FLOAT,
		);
		texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
		texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

		return okShallow(texture);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// createGpuDataTexture
// =============================================================================

/** Options schema for {@link createGpuDataTexture}. */
export const CreateGpuDataTextureOptionsSchema = v.pipe(
	v.strictObject({
		/** The Babylon.js scene. */
		scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
		/** Pre-built RGBA32F layer data (from {@link buildLayerData}). */
		data: v.custom<Float32Array<ArrayBufferLike>>(
			(val): val is Float32Array<ArrayBufferLike> => val instanceof Float32Array,
		),
		/** Map width in tiles. */
		width: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Map height in tiles. */
		height: v.pipe(v.number(), v.integer(), v.minValue(1)),
	}),
	v.readonly(),
);

/** Options for {@link createGpuDataTexture}. */
export type CreateGpuDataTextureOptions = v.InferOutput<typeof CreateGpuDataTextureOptionsSchema>;

/**
 * Creates an RGBA32F data texture from pre-built layer data.
 *
 * Wraps `BABYLON.RawTexture` creation with NEAREST sampling and
 * CLAMP address mode — the standard configuration for tile data textures.
 * Uses float format because Babylon.js RawTexture does not reliably
 * create RGBA32UI integer textures.
 *
 * @param options - Scene, pre-built Float32Array data, and map dimensions
 * @returns BabylonResult containing the RawTexture
 *
 * @example
 * ```typescript
 * const layerResult = buildLayerData({ tileIds, width: 32, height: 32 });
 * if (!layerResult.ok) return layerResult;
 * const texResult = createGpuDataTexture({ scene, data: layerResult.data, width: 32, height: 32 });
 * ```
 */
export function createGpuDataTexture(
	options: CreateGpuDataTextureOptions,
): BabylonResult<BABYLON.RawTexture> {
	const { scene, data, width, height } = options;

	try {
		const texture: BABYLON.RawTexture = new BABYLON.RawTexture(
			data,
			width,
			height,
			BABYLON.Constants.TEXTUREFORMAT_RGBA,
			scene,
			false, // generateMipMaps
			false, // invertY
			BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
			BABYLON.Constants.TEXTURETYPE_FLOAT,
		);
		texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
		texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

		return okShallow(texture);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// updateDataTextureTile
// =============================================================================

/** Options schema for {@link updateDataTextureTile}. */
export const UpdateDataTextureTileOptionsSchema = v.pipe(
	v.strictObject({
		/** CPU-side layer data (RGBA32F Float32Array). */
		data: v.custom<Float32Array<ArrayBufferLike>>(
			(val): val is Float32Array<ArrayBufferLike> => val instanceof Float32Array,
		),
		/** Map width in tiles. */
		mapWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Map height in tiles. */
		mapHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
		/** Tile X coordinate (column). */
		x: v.number(),
		/** Tile Y coordinate (row). */
		y: v.number(),
		/** New tile ID (0 = empty). */
		tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
		/** Optional visual flags (packed uint32). Defaults to 0xF0 for non-empty tiles. */
		visualFlags: v.optional(v.number()),
	}),
	v.readonly(),
);

/** Options for {@link updateDataTextureTile}. */
export type UpdateDataTextureTileOptions = v.InferOutput<typeof UpdateDataTextureTileOptionsSchema>;

/**
 * Updates a single tile in a CPU-side RGBA32F data array.
 *
 * Modifies the R (tile ID) and G (visual flags) channels at the
 * specified coordinates. Out-of-bounds coordinates are silently ignored.
 *
 * This is the data-texture-level primitive. For GPU layer updates that
 * also manage the mesh and material, use `updateGpuTile` from
 * `gpu-tile-renderer.ts`.
 *
 * @param options - Data array, dimensions, position, tile ID, optional flags
 *
 * @example
 * ```typescript
 * updateDataTextureTile({ data: layerData, mapWidth: 32, mapHeight: 32, x: 5, y: 3, tileId: 42 });
 * dataTexture.update(layerData); // Upload to GPU
 * ```
 */
export function updateDataTextureTile(options: UpdateDataTextureTileOptions): void {
	const { data, mapWidth, mapHeight, x, y, tileId, visualFlags } = options;

	// Bounds check
	if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return;

	const index: Num = y * mapWidth + x;
	const offset: Num = index * 4;

	data[offset] = tileId; // R = tile ID

	if (tileId === 0) {
		data[offset + 1] = 0; // G = 0 for empty
	} else {
		data[offset + 1] = visualFlags ?? DEFAULT_FLAGS_VALUE; // G = flags
	}

	data[offset + 2] = 0; // B = reserved
	data[offset + 3] = 0; // A = reserved
}
