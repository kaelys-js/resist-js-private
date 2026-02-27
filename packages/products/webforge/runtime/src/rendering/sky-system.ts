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
import { SkyMaterial } from '@babylonjs/materials/sky';

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
	/** The star field layer (null if no star field is active). */
	readonly starLayer: BABYLON.Layer | null;
	/** The star field render observer (null if no star field is active). */
	readonly starObserver: BABYLON.Observer<BABYLON.Scene> | null;
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
		if (sky.starObserver) {
			sky.scene.onBeforeRenderObservable.remove(sky.starObserver);
		}
		if (sky.starLayer) {
			sky.starLayer.dispose();
		}
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
// regenerateGradientTexture
// =============================================================================

/**
 * Regenerates the gradient texture on a gradient sky instance with new top/bottom colors.
 *
 * Creates new gradient pixel data from the provided colors, builds a new RawTexture,
 * and replaces the existing diffuseTexture on the sky's BackgroundMaterial.
 *
 * @param options - Sky instance and new top/bottom colors.
 * @returns BabylonResult indicating success, or error if the sky has no mesh/material.
 *
 * @example
 * ```typescript
 * const result = regenerateGradientTexture({
 *   sky: skyInstance,
 *   topColor: { r: 1, g: 0, b: 0, a: 1 },
 *   bottomColor: { r: 0, g: 0, b: 1, a: 1 },
 * });
 * ```
 */
export function regenerateGradientTexture(options: {
	readonly sky: SkyInstance;
	readonly topColor: {
		readonly r: number;
		readonly g: number;
		readonly b: number;
		readonly a: number;
	};
	readonly bottomColor: {
		readonly r: number;
		readonly g: number;
		readonly b: number;
		readonly a: number;
	};
}): BabylonResult<Bool> {
	const { sky, topColor, bottomColor } = options;

	if (!sky.skyboxMesh || !sky.skyboxMaterial) {
		return err(ERRORS.SCENE.RENDER_FAILED, 'Cannot regenerate gradient: no skybox mesh');
	}

	try {
		const pixels = generateGradientPixels([
			{ position: 0, color: topColor },
			{ position: 1, color: bottomColor },
		]);

		const tex = new BABYLON.RawTexture(
			pixels,
			1,
			256,
			BABYLON.Engine.TEXTUREFORMAT_RGBA,
			sky.scene,
			false,
			false,
			BABYLON.Texture.BILINEAR_SAMPLINGMODE,
		);
		tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
		tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

		const mat = sky.skyboxMaterial;
		if (mat instanceof BABYLON.BackgroundMaterial) {
			if (mat.diffuseTexture) {
				mat.diffuseTexture.dispose();
			}
			mat.diffuseTexture = tex;
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// updateSkyFromDayNight
// =============================================================================

/**
 * Applies interpolated day/night color values to the active sky.
 *
 * Handles all sky types:
 * - `color` / `procedural`: sets `scene.clearColor`
 * - `gradient`: regenerates gradient texture with new top/bottom colors
 *
 * Optionally syncs fog color to the bottom gradient color when `fogSyncSky` is true.
 *
 * @param options - Sky instance, sky type, and optional color values to apply.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * updateSkyFromDayNight({
 *   sky: skyInstance,
 *   skyType: 'color',
 *   skyColor: { r: 0.9, g: 0.1, b: 0.1, a: 1 },
 * });
 * ```
 */
export function updateSkyFromDayNight(options: {
	readonly sky: SkyInstance;
	readonly skyColor?: {
		readonly r: number;
		readonly g: number;
		readonly b: number;
		readonly a: number;
	};
	readonly skyGradientTop?: {
		readonly r: number;
		readonly g: number;
		readonly b: number;
		readonly a: number;
	};
	readonly skyGradientBottom?: {
		readonly r: number;
		readonly g: number;
		readonly b: number;
		readonly a: number;
	};
	readonly fogSyncSky?: boolean;
	readonly skyType: string;
}): BabylonResult<Bool> {
	const { sky, skyColor, skyGradientTop, skyGradientBottom, fogSyncSky, skyType } = options;

	try {
		switch (skyType) {
			case 'color': {
				if (skyColor) {
					sky.scene.clearColor = new BABYLON.Color4(skyColor.r, skyColor.g, skyColor.b, skyColor.a);
				}
				break;
			}
			case 'gradient': {
				if (skyGradientTop && skyGradientBottom) {
					regenerateGradientTexture({
						sky,
						topColor: skyGradientTop,
						bottomColor: skyGradientBottom,
					});
				}
				break;
			}
			case 'procedural': {
				if (skyColor) {
					sky.scene.clearColor = new BABYLON.Color4(skyColor.r, skyColor.g, skyColor.b, skyColor.a);
				}
				break;
			}
		}

		if (fogSyncSky && skyGradientBottom) {
			sky.scene.fogColor = new BABYLON.Color3(
				skyGradientBottom.r,
				skyGradientBottom.g,
				skyGradientBottom.b,
			);
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// computeStarOpacity
// =============================================================================

/**
 * Computes the opacity of a star field based on time of day.
 *
 * Stars fade in after `fadeInTime` (e.g. 18:00), stay visible through midnight,
 * and fade out before `fadeOutTime` (e.g. 06:00). A twinkle effect modulates
 * the base opacity with a sine wave when `twinkleSpeed > 0`.
 *
 * Pure math function with no Babylon.js dependencies.
 *
 * @param options - Time of day (0-24), max opacity, fade times, and twinkle parameters.
 * @returns Computed opacity value between 0 and maxOpacity.
 *
 * @example
 * ```typescript
 * const opacity = computeStarOpacity({
 *   timeOfDay: 22,
 *   maxOpacity: 0.8,
 *   fadeInTime: 18,
 *   fadeOutTime: 6,
 *   twinkleSpeed: 1,
 *   elapsedTime: 0,
 * });
 * ```
 */
export function computeStarOpacity(options: {
	readonly timeOfDay: number;
	readonly maxOpacity: number;
	readonly fadeInTime: number;
	readonly fadeOutTime: number;
	readonly twinkleSpeed: number;
	readonly elapsedTime: number;
}): number {
	const { timeOfDay, maxOpacity, fadeInTime, fadeOutTime, twinkleSpeed, elapsedTime } = options;

	let baseOpacity = 0;

	if (fadeInTime > fadeOutTime) {
		// Night spans across midnight (e.g. fadeIn=18, fadeOut=6)
		if (timeOfDay >= fadeInTime) {
			// After fadeIn (e.g. 18..24): fading in
			const fadeRange = 24 - fadeInTime;
			const progress = (timeOfDay - fadeInTime) / (fadeRange > 0 ? fadeRange : 1);
			baseOpacity = Math.min(1, progress) * maxOpacity;
		} else if (timeOfDay <= fadeOutTime) {
			// Before fadeOut (e.g. 0..6): fading out
			const progress = 1 - timeOfDay / (fadeOutTime > 0 ? fadeOutTime : 1);
			baseOpacity = Math.max(0, progress) * maxOpacity;
		}
		// Between fadeOut and fadeIn (e.g. 6..18): daytime, opacity stays 0
	}

	if (baseOpacity > 0 && twinkleSpeed > 0) {
		const twinkle = Math.sin(elapsedTime * twinkleSpeed * Math.PI * 2) * 0.05 * maxOpacity;
		baseOpacity = Math.max(0, Math.min(maxOpacity, baseOpacity + twinkle));
	}

	return baseOpacity;
}

// =============================================================================
// createStarField
// =============================================================================

/**
 * Creates a star field layer on an existing sky instance.
 *
 * Renders a textured layer with additive blending that fades in/out
 * based on time of day. Uses `computeStarOpacity` each frame to
 * determine the current opacity, producing a time-based star field
 * with optional twinkle effect.
 *
 * @param options - Sky instance, star config, asset path, and time-of-day getter.
 * @returns BabylonResult containing the updated SkyInstance with star layer references.
 *
 * @example
 * ```typescript
 * const result = createStarField({
 *   sky: skyInstance,
 *   config: { texture: 'sky/stars.png', opacity: 0.8, twinkleSpeed: 1, scale: 2 },
 *   assetBasePath: '/assets/',
 *   getTimeOfDay: () => 22,
 * });
 * ```
 */
export function createStarField(options: {
	readonly sky: SkyInstance;
	readonly config: {
		readonly texture: string;
		readonly opacity: number;
		readonly twinkleSpeed: number;
		readonly fadeInTime?: number;
		readonly fadeOutTime?: number;
		readonly scale: number;
	};
	readonly assetBasePath: string;
	readonly getTimeOfDay: () => number;
}): BabylonResult<SkyInstance> {
	const { sky, config, assetBasePath, getTimeOfDay } = options;

	try {
		const texPath = `${assetBasePath}${config.texture}`;
		const starLayer = new BABYLON.Layer('stars', texPath, sky.scene, true);
		starLayer.alphaBlendingMode = 1; // ALPHA_ADD
		starLayer.color = new BABYLON.Color4(1, 1, 1, 0);

		const tex = starLayer.texture;
		if (tex && tex instanceof BABYLON.Texture) {
			tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
			tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
			tex.uScale = 1 / config.scale;
			tex.vScale = 1 / config.scale;
		}

		let elapsed = 0;
		const starObserver = sky.scene.onBeforeRenderObservable.add(() => {
			const dt = sky.scene.getEngine().getDeltaTime() / 1000;
			elapsed += dt;
			const opacity = computeStarOpacity({
				timeOfDay: getTimeOfDay(),
				maxOpacity: config.opacity,
				fadeInTime: config.fadeInTime ?? 18,
				fadeOutTime: config.fadeOutTime ?? 6,
				twinkleSpeed: config.twinkleSpeed,
				elapsedTime: elapsed,
			});
			starLayer.color = new BABYLON.Color4(1, 1, 1, opacity);
		});

		return okShallow({
			skyboxMesh: sky.skyboxMesh,
			skyboxMaterial: sky.skyboxMaterial,
			scene: sky.scene,
			starLayer,
			starObserver,
		});
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
		starLayer: null,
		starObserver: null,
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

	return okShallow({
		skyboxMesh,
		skyboxMaterial: material,
		scene,
		starLayer: null,
		starObserver: null,
	});
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

	return okShallow({
		skyboxMesh,
		skyboxMaterial: material,
		scene,
		starLayer: null,
		starObserver: null,
	});
}

// =============================================================================
// Internal: Procedural sky
// =============================================================================

function createProceduralSky(
	scene: BABYLON.Scene,
	config: SkyConfigInput,
): BabylonResult<SkyInstance> {
	const skyboxMesh = BABYLON.MeshBuilder.CreateBox(
		'sky-procedural',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	// Try real SkyMaterial first; fall back to BackgroundMaterial approximation
	// if SkyMaterial fails (e.g. NullEngine without shader support)
	let material: BABYLON.Material;
	try {
		const skyMat = new SkyMaterial('sky-procedural-mat', scene);
		skyMat.backFaceCulling = false;

		// Apply Rayleigh/Mie scattering parameters from config
		skyMat.turbidity = config.turbidity;
		skyMat.rayleigh = config.rayleigh;
		skyMat.luminance = config.luminance;
		skyMat.mieCoefficient = config.mieCoefficient;
		skyMat.mieDirectionalG = config.mieDirectionalG;
		skyMat.inclination = config.inclination;
		skyMat.azimuth = config.azimuth;

		material = skyMat;
	} catch {
		// Fallback: BackgroundMaterial approximation for test environments
		const bgMat = new BABYLON.BackgroundMaterial('sky-procedural-mat', scene);
		bgMat.backFaceCulling = false;

		const blueIntensity = Math.min(1, config.rayleigh / 4);
		const hazeReduce = Math.max(0, 1 - config.turbidity / 20);
		const lum = config.luminance;
		bgMat.primaryColor = new BABYLON.Color3(
			lum * hazeReduce * 0.5,
			lum * hazeReduce * 0.7,
			lum * blueIntensity,
		);
		material = bgMat;
	}

	skyboxMesh.material = material;

	return okShallow({
		skyboxMesh,
		skyboxMaterial: material,
		scene,
		starLayer: null,
		starObserver: null,
	});
}
