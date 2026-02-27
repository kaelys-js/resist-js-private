/**
 * Sky rendering system.
 *
 * Creates background sky visuals behind the tilemap:
 * - `color` — sets `scene.clearColor` to a solid color
 * - `gradient` — renders a vertical gradient on a large box mesh
 * - `skybox` — renders a 6-face cubemap on a box mesh
 * - `procedural` — renders an atmosphere-simulation sky on a box mesh
 *
 * The sky mesh (when created) uses `BackgroundMaterial` with
 * `renderingGroupId = 0` so it renders behind all tilemap geometry.
 *
 * @example
 * ```typescript
 * import { createSky, disposeSky } from './sky-system';
 *
 * const result = createSky({ scene, config: skyConfig });
 * if (result.ok) {
 *   // sky is live in the scene
 *   disposeSky({ sky: result.data });
 * }
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, type DeepReadonly } from '@/schemas/result/result';
import type { Bool } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { SkyConfig } from '../schemas/sky-config';

/** Sky config accepted as readonly (from safeParse) or mutable. */
type SkyConfigInput = SkyConfig | DeepReadonly<SkyConfig>;

// =============================================================================
// SkyInstance
// =============================================================================

/**
 * A live sky instance in the scene.
 *
 * Contains the optional skybox mesh and material for disposal.
 */
export type SkyInstance = {
	/** The skybox mesh (null for solid color type). */
	readonly skyboxMesh: BABYLON.Mesh | null;
	/** The skybox material (null for solid color type). */
	readonly skyboxMaterial: BABYLON.Material | null;
	/** The scene this sky belongs to. */
	readonly scene: BABYLON.Scene;
};

// =============================================================================
// createSky
// =============================================================================

/**
 * Creates sky visuals in the scene based on the sky configuration.
 *
 * @param options - Scene and sky configuration.
 * @returns BabylonResult containing the sky instance handle.
 *
 * @example
 * ```typescript
 * const result = createSky({
 *   scene,
 *   config: { type: 'color', color: { r: 0.1, g: 0.2, b: 0.3, a: 1 } },
 * });
 * ```
 */
export function createSky(options: {
	readonly scene: BABYLON.Scene;
	readonly config: SkyConfigInput;
}): BabylonResult<SkyInstance> {
	const { scene, config } = options;

	try {
		switch (config.type) {
			case 'color': {
				return createColorSky(scene, config);
			}
			case 'gradient': {
				return createGradientSky(scene, config);
			}
			case 'skybox': {
				return createSkyboxSky(scene, config);
			}
			case 'procedural': {
				return createProceduralSky(scene, config);
			}
			default: {
				return createColorSky(scene, config);
			}
		}
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// disposeSky
// =============================================================================

/**
 * Disposes all sky resources (mesh + material).
 *
 * @param options - The sky instance to dispose.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * disposeSky({ sky: skyInstance });
 * ```
 */
export function disposeSky(options: { readonly sky: SkyInstance }): BabylonResult<Bool> {
	const { sky } = options;

	try {
		if (sky.skyboxMaterial) {
			sky.skyboxMaterial.dispose();
		}
		if (sky.skyboxMesh) {
			sky.skyboxMesh.dispose();
		}
		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Internal: Color sky
// =============================================================================

function createColorSky(scene: BABYLON.Scene, config: SkyConfigInput): BabylonResult<SkyInstance> {
	scene.clearColor = new BABYLON.Color4(
		config.color.r,
		config.color.g,
		config.color.b,
		config.color.a,
	);

	return okShallow({
		skyboxMesh: null,
		skyboxMaterial: null,
		scene,
	});
}

// =============================================================================
// generateGradientPixels (pure math — exported for testing)
// =============================================================================

/** A gradient stop for pixel generation. */
type GradientStop = {
	readonly position: number;
	readonly color: {
		readonly r: number;
		readonly g: number;
		readonly b: number;
		readonly a: number;
	};
};

/**
 * Generates a 1×256 pixel RGBA buffer from gradient color stops.
 *
 * Each row is interpolated between the nearest stops. Position 0 = row 0 (top),
 * position 1 = row 255 (bottom). Returns a Uint8Array of 256×4 bytes.
 *
 * @param stops - Gradient stops sorted by position (0 = top, 1 = bottom).
 * @returns Uint8Array with 256 × 4 RGBA bytes, or empty array if no stops.
 *
 * @example
 * ```typescript
 * const pixels = generateGradientPixels([
 *   { position: 0, color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } },
 *   { position: 1, color: { r: 0.8, g: 0.6, b: 0.3, a: 1 } },
 * ]);
 * ```
 */
export function generateGradientPixels(stops: readonly GradientStop[]): Uint8Array {
	if (stops.length === 0) return new Uint8Array(0);

	const height = 256;
	const data = new Uint8Array(height * 4);

	// Single stop: fill with that color
	if (stops.length === 1) {
		const [first] = stops;
		if (!first) return data;
		const c = first.color;
		for (let row = 0; row < height; row++) {
			const idx = row * 4;
			data[idx] = Math.round(c.r * 255);
			data[idx + 1] = Math.round(c.g * 255);
			data[idx + 2] = Math.round(c.b * 255);
			data[idx + 3] = Math.round(c.a * 255);
		}
		return data;
	}

	// Sort stops by position
	const sorted = [...stops].toSorted((a, b) => a.position - b.position);

	// Pre-extract first and last for safe access
	const [firstSorted] = sorted;
	const lastSorted = sorted.at(-1);
	if (!firstSorted || !lastSorted) return data;

	for (let row = 0; row < height; row++) {
		const t = row / (height - 1); // 0..1
		const idx = row * 4;

		// Find the two stops that bracket this position
		let lower: GradientStop = firstSorted;
		let upper: GradientStop = lastSorted;

		for (let s = 0; s < sorted.length - 1; s++) {
			const curr = sorted[s];
			const next = sorted[s + 1];
			if (curr && next && t >= curr.position && t <= next.position) {
				lower = curr;
				upper = next;
				break;
			}
		}

		// Interpolation factor between lower and upper
		const range = upper.position - lower.position;
		const f = range > 0 ? (t - lower.position) / range : 0;

		data[idx] = Math.round((lower.color.r + (upper.color.r - lower.color.r) * f) * 255);
		data[idx + 1] = Math.round((lower.color.g + (upper.color.g - lower.color.g) * f) * 255);
		data[idx + 2] = Math.round((lower.color.b + (upper.color.b - lower.color.b) * f) * 255);
		data[idx + 3] = Math.round((lower.color.a + (upper.color.a - lower.color.a) * f) * 255);
	}

	return data;
}

// =============================================================================
// Internal: Gradient sky
// =============================================================================

function createGradientSky(
	scene: BABYLON.Scene,
	config: SkyConfigInput,
): BabylonResult<SkyInstance> {
	const stops = config.gradient;

	if (!stops || stops.length < 2) {
		// Fallback to solid color if insufficient stops
		return createColorSky(scene, config);
	}

	// Generate 1×256 gradient pixel data
	const pixels: Uint8Array = generateGradientPixels([...stops]);

	// Create RawTexture from pixel data (1 wide × 256 tall, RGBA)
	const tex: BABYLON.RawTexture = new BABYLON.RawTexture(
		pixels,
		1,
		256,
		BABYLON.Engine.TEXTUREFORMAT_RGBA,
		scene,
		false, // generateMipMaps
		false, // invertY
		BABYLON.Texture.BILINEAR_SAMPLINGMODE,
	);
	tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
	tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

	// Create skybox mesh with BackgroundMaterial
	const skyboxMesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateBox(
		'sky-gradient',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	const material: BABYLON.BackgroundMaterial = new BABYLON.BackgroundMaterial(
		'sky-gradient-mat',
		scene,
	);
	material.backFaceCulling = false;
	material.diffuseTexture = tex;
	material.useRGBColor = false;

	skyboxMesh.material = material;

	// Also set clearColor to the first stop for areas not covered by the mesh
	const [firstStop] = stops;
	if (firstStop) {
		scene.clearColor = new BABYLON.Color4(
			firstStop.color.r,
			firstStop.color.g,
			firstStop.color.b,
			firstStop.color.a,
		);
	}

	return okShallow({ skyboxMesh, skyboxMaterial: material, scene });
}

// =============================================================================
// Internal: Skybox sky
// =============================================================================

function createSkyboxSky(scene: BABYLON.Scene, config: SkyConfigInput): BabylonResult<SkyInstance> {
	const skyboxMesh = BABYLON.MeshBuilder.CreateBox(
		'sky-skybox',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	const material = new BABYLON.BackgroundMaterial('sky-skybox-mat', scene);
	material.backFaceCulling = false;

	// Load cubemap texture if path provided
	if (config.skyboxPath) {
		const cubeTexture = new BABYLON.CubeTexture(config.skyboxPath, scene);
		cubeTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
		material.reflectionTexture = cubeTexture;
	}

	skyboxMesh.material = material;

	return okShallow({ skyboxMesh, skyboxMaterial: material, scene });
}

// =============================================================================
// Internal: Procedural sky
// =============================================================================

function createProceduralSky(
	scene: BABYLON.Scene,
	config: SkyConfigInput,
): BabylonResult<SkyInstance> {
	// Create a large box with a BackgroundMaterial configured for
	// procedural atmosphere simulation via primaryColor tinting
	const skyboxMesh = BABYLON.MeshBuilder.CreateBox(
		'sky-procedural',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	const material = new BABYLON.BackgroundMaterial('sky-procedural-mat', scene);
	material.backFaceCulling = false;

	// Approximate atmosphere color from rayleigh/turbidity/luminance
	// Rayleigh scattering produces blue → higher rayleigh = more blue
	const blueIntensity: number = Math.min(1, config.rayleigh / 4);
	const hazeReduce: number = Math.max(0, 1 - config.turbidity / 20);
	const lum: number = config.luminance;

	material.primaryColor = new BABYLON.Color3(
		lum * hazeReduce * 0.5,
		lum * hazeReduce * 0.7,
		lum * blueIntensity,
	);

	skyboxMesh.material = material;

	return okShallow({ skyboxMesh, skyboxMaterial: material, scene });
}
