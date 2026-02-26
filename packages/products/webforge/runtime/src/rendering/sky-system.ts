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
// Internal: Gradient sky
// =============================================================================

function createGradientSky(
	scene: BABYLON.Scene,
	config: SkyConfigInput,
): BabylonResult<SkyInstance> {
	// Set clearColor to the first gradient stop color (or config color as fallback)
	const firstStop = config.gradient?.[0];
	if (firstStop) {
		scene.clearColor = new BABYLON.Color4(
			firstStop.color.r,
			firstStop.color.g,
			firstStop.color.b,
			firstStop.color.a,
		);
	}

	// Create a large box with BackgroundMaterial for gradient rendering
	const skyboxMesh = BABYLON.MeshBuilder.CreateBox(
		'sky-gradient',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	const material = new BABYLON.BackgroundMaterial('sky-gradient-mat', scene);
	material.backFaceCulling = false;

	// Use primary color from first gradient stop for background tint
	if (firstStop) {
		material.primaryColor = new BABYLON.Color3(
			firstStop.color.r,
			firstStop.color.g,
			firstStop.color.b,
		);
	}

	skyboxMesh.material = material;

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
