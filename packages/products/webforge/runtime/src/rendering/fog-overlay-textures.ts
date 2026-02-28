/**
 * Procedural fog overlay texture generators.
 *
 * Generates tileable noise-based texture data for use as fog overlay textures.
 * Five built-in patterns: perlin, worley, clouds, wisps, and smoke.
 *
 * All generators produce grayscale RGBA pixel data with alpha channel set
 * to the luminance value, suitable for use with blend modes in the overlay
 * fog post-process shader.
 *
 * Returns `TextureData` (width, height, data) which can be converted to
 * `BABYLON.RawTexture` or `BABYLON.DynamicTexture` by the fog manager.
 *
 * @example
 * ```typescript
 * import { generateOverlayTexture } from './fog-overlay-textures';
 *
 * const result = generateOverlayTexture('clouds', 512);
 * if (result.ok) {
 *   const { width, height, data } = result.data;
 *   // Create a BABYLON.RawTexture from data
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Texture Data Type
// =============================================================================

/**
 * Procedural texture pixel data.
 *
 * Platform-agnostic representation of generated texture data.
 * Use `data` as a Uint8ClampedArray of RGBA pixel values.
 */
export const TextureDataSchema = v.strictObject({
	/** Texture width in pixels. */
	width: v.number(),

	/** Texture height in pixels. */
	height: v.number(),

	/** RGBA pixel data (4 bytes per pixel). */
	data: v.custom<Uint8ClampedArray>((val) => val instanceof Uint8ClampedArray),
});

/** Inferred texture data type. */
export type TextureData = v.InferOutput<typeof TextureDataSchema>;

// =============================================================================
// Texture Name Type
// =============================================================================

/** Valid overlay texture names matching `FogOverlayTextureSchema`. */
export type OverlayTextureName = 'perlin' | 'worley' | 'clouds' | 'wisps' | 'smoke';

/** Ordered list of all overlay texture names. */
export const OVERLAY_TEXTURE_NAMES: readonly OverlayTextureName[] = [
	'perlin',
	'worley',
	'clouds',
	'wisps',
	'smoke',
];

// =============================================================================
// Noise Primitives
// =============================================================================

/**
 * 2D hash function for noise generation.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @returns Pseudo-random value in [0, 1).
 */
function hash2D(x: Num, y: Num): Num {
	const h: Num = Math.sin(x * 127.1 + y * 311.7) * 43_758.5453;
	return h - Math.floor(h);
}

/**
 * 2D value noise with smooth interpolation.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @returns Noise value in [0, 1].
 */
function valueNoise2D(x: Num, y: Num): Num {
	const ix: Num = Math.floor(x);
	const iy: Num = Math.floor(y);
	const fx: Num = x - ix;
	const fy: Num = y - iy;

	// Smoothstep
	const ux: Num = fx * fx * (3 - 2 * fx);
	const uy: Num = fy * fy * (3 - 2 * fy);

	const n00: Num = hash2D(ix, iy);
	const n10: Num = hash2D(ix + 1, iy);
	const n01: Num = hash2D(ix, iy + 1);
	const n11: Num = hash2D(ix + 1, iy + 1);

	const a: Num = n00 + (n10 - n00) * ux;
	const b: Num = n01 + (n11 - n01) * ux;

	return a + (b - a) * uy;
}

/**
 * 2D FBM (fractal Brownian motion) using value noise.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @param octaves - Number of noise layers.
 * @param lacunarity - Frequency multiplier per octave.
 * @param persistence - Amplitude multiplier per octave.
 * @returns FBM noise value in [0, 1].
 */
function fbm2D(x: Num, y: Num, octaves: Num, lacunarity: Num, persistence: Num): Num {
	let value: Num = 0;
	let amp: Num = 1;
	let freq: Num = 1;
	let total: Num = 0;

	for (let i: Num = 0; i < octaves; i++) {
		value += valueNoise2D(x * freq, y * freq) * amp;
		total += amp;
		freq *= lacunarity;
		amp *= persistence;
	}

	return total > 0 ? value / total : 0;
}

/**
 * Worley (cellular) noise — returns distance to nearest feature point.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @returns Distance to nearest cell center, clamped to [0, 1].
 */
function worleyNoise2D(x: Num, y: Num): Num {
	const ix: Num = Math.floor(x);
	const iy: Num = Math.floor(y);
	let minDist: Num = 1;

	for (let dx: Num = -1; dx <= 1; dx++) {
		for (let dy: Num = -1; dy <= 1; dy++) {
			const cellX: Num = ix + dx;
			const cellY: Num = iy + dy;
			// Feature point within cell
			const fpx: Num = cellX + hash2D(cellX, cellY);
			const fpy: Num = cellY + hash2D(cellY + 0.5, cellX + 0.5);
			const distX: Num = x - fpx;
			const distY: Num = y - fpy;
			const dist: Num = Math.hypot(distX, distY);
			minDist = Math.min(minDist, dist);
		}
	}

	return Math.min(minDist, 1);
}

// =============================================================================
// Generator Functions
// =============================================================================

/**
 * Generate Perlin-like noise pattern.
 * Produces organic, tileable noise suitable for general fog density.
 *
 * @param size - Texture width/height in pixels.
 * @returns Generated texture data.
 */
function generatePerlin(size: Num): TextureData {
	const data = new Uint8ClampedArray(size * size * 4);
	const scale: Num = 4;

	for (let y: Num = 0; y < size; y++) {
		for (let x: Num = 0; x < size; x++) {
			const nx: Num = (x / size) * scale;
			const ny: Num = (y / size) * scale;
			const val: Num = fbm2D(nx, ny, 4, 2, 0.5);
			const byte: Num = Math.round(val * 255);
			const idx: Num = (y * size + x) * 4;
			data[idx] = byte;
			data[idx + 1] = byte;
			data[idx + 2] = byte;
			data[idx + 3] = byte;
		}
	}

	return { width: size, height: size, data };
}

/**
 * Generate Worley (cellular) noise pattern.
 * Produces bubbly, organic shapes suitable for underwater or swamp effects.
 *
 * @param size - Texture width/height in pixels.
 * @returns Generated texture data.
 */
function generateWorley(size: Num): TextureData {
	const data = new Uint8ClampedArray(size * size * 4);
	const scale: Num = 6;

	for (let y: Num = 0; y < size; y++) {
		for (let x: Num = 0; x < size; x++) {
			const nx: Num = (x / size) * scale;
			const ny: Num = (y / size) * scale;
			const val: Num = 1 - worleyNoise2D(nx, ny);
			const byte: Num = Math.round(val * 255);
			const idx: Num = (y * size + x) * 4;
			data[idx] = byte;
			data[idx + 1] = byte;
			data[idx + 2] = byte;
			data[idx + 3] = byte;
		}
	}

	return { width: size, height: size, data };
}

/**
 * Generate cloud-like pattern.
 * Layered FBM with higher octaves for fluffy, billowing shapes.
 *
 * @param size - Texture width/height in pixels.
 * @returns Generated texture data.
 */
function generateClouds(size: Num): TextureData {
	const data = new Uint8ClampedArray(size * size * 4);
	const scale: Num = 3;

	for (let y: Num = 0; y < size; y++) {
		for (let x: Num = 0; x < size; x++) {
			const nx: Num = (x / size) * scale;
			const ny: Num = (y / size) * scale;
			const v1: Num = fbm2D(nx, ny, 6, 2, 0.5);
			const v2: Num = fbm2D(nx + 5.2, ny + 1.3, 6, 2, 0.5);
			// Warped domain for more organic shapes
			const val: Num = fbm2D(nx + v1 * 2, ny + v2 * 2, 4, 2, 0.5);
			const clamped: Num = Math.max(0, Math.min(1, val * 1.2 - 0.1));
			const byte: Num = Math.round(clamped * 255);
			const idx: Num = (y * size + x) * 4;
			data[idx] = byte;
			data[idx + 1] = byte;
			data[idx + 2] = byte;
			data[idx + 3] = byte;
		}
	}

	return { width: size, height: size, data };
}

/**
 * Generate wispy fog pattern.
 * Thin, streaky tendrils of fog — elongated noise with directional bias.
 *
 * @param size - Texture width/height in pixels.
 * @returns Generated texture data.
 */
function generateWisps(size: Num): TextureData {
	const data = new Uint8ClampedArray(size * size * 4);
	const scaleX: Num = 8;
	const scaleY: Num = 3;

	for (let y: Num = 0; y < size; y++) {
		for (let x: Num = 0; x < size; x++) {
			const nx: Num = (x / size) * scaleX;
			const ny: Num = (y / size) * scaleY;
			// Stretched noise for wispy appearance
			const v1: Num = fbm2D(nx, ny, 4, 2.5, 0.4);
			// Warp with secondary noise for organic tendrils
			const warp: Num = fbm2D(nx + 3.7, ny + 8.1, 3, 2, 0.5) * 0.8;
			const val: Num = fbm2D(nx + warp, ny, 3, 2, 0.5);
			// Sharper falloff for wispy edges
			const shaped: Num = Math.max(0, Math.min(1, val * v1 * 2)) ** 0.7;
			const byte: Num = Math.round(shaped * 255);
			const idx: Num = (y * size + x) * 4;
			data[idx] = byte;
			data[idx + 1] = byte;
			data[idx + 2] = byte;
			data[idx + 3] = byte;
		}
	}

	return { width: size, height: size, data };
}

/**
 * Generate smoke pattern.
 * Dense, billowing smoke with strong turbulence and domain warping.
 *
 * @param size - Texture width/height in pixels.
 * @returns Generated texture data.
 */
function generateSmoke(size: Num): TextureData {
	const data = new Uint8ClampedArray(size * size * 4);
	const scale: Num = 4;

	for (let y: Num = 0; y < size; y++) {
		for (let x: Num = 0; x < size; x++) {
			const nx: Num = (x / size) * scale;
			const ny: Num = (y / size) * scale;
			// Strong domain warping for turbulent smoke
			const w1: Num = fbm2D(nx, ny, 4, 2, 0.5);
			const w2: Num = fbm2D(nx + 1.7, ny + 9.2, 4, 2, 0.5);
			const w3: Num = fbm2D(nx + w1 * 3, ny + w2 * 3, 5, 2, 0.5);
			const val: Num = fbm2D(nx + w3 * 2.5, ny + w1 * 2.5, 4, 2, 0.5);
			// Boost contrast
			const contrasted: Num = Math.max(0, Math.min(1, (val - 0.3) * 1.8));
			const byte: Num = Math.round(contrasted * 255);
			const idx: Num = (y * size + x) * 4;
			data[idx] = byte;
			data[idx + 1] = byte;
			data[idx + 2] = byte;
			data[idx + 3] = byte;
		}
	}

	return { width: size, height: size, data };
}

// =============================================================================
// Generator Registry
// =============================================================================

/** Map of texture names to their generator functions. */
const GENERATORS: Readonly<Record<OverlayTextureName, (size: Num) => TextureData>> = {
	perlin: generatePerlin,
	worley: generateWorley,
	clouds: generateClouds,
	wisps: generateWisps,
	smoke: generateSmoke,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate an overlay texture by name.
 *
 * Returns grayscale RGBA pixel data of the specified size with the chosen noise
 * pattern. The alpha channel is set to the luminance value for use with the
 * overlay fog shader's blend modes.
 *
 * @param name - Texture pattern name.
 * @param size - Width and height in pixels. Default: 512.
 * @returns `BabylonResult<TextureData>` — generated texture data.
 *
 * @example
 * ```typescript
 * const result = generateOverlayTexture('clouds', 512);
 * if (result.ok) {
 *   const { width, height, data } = result.data;
 *   // Create a BABYLON.RawTexture from data
 * }
 * ```
 */
export function generateOverlayTexture(
	name: OverlayTextureName,
	size: Num = 512,
): BabylonResult<TextureData> {
	const generator = GENERATORS[name];
	if (!generator) {
		return err(ERRORS.VALIDATION.SCHEMA_FAILED, `Unknown overlay texture name: "${name}"`);
	}
	const textureData: TextureData = generator(size);
	return okShallow(textureData);
}
