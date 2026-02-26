/**
 * Light manager — orchestrator for the lighting system.
 *
 * Creates, updates, removes, and disposes Babylon.js lights from a
 * `LightingConfig` schema. Coordinates with shadow-manager, light-animation,
 * day-night-cycle, and glow-manager sub-modules.
 *
 * Removes the scene-setup default hemispheric light (`'default-light'`)
 * when managed lighting is created.
 *
 * @example
 * ```typescript
 * import { createLighting, disposeLighting } from './light-manager';
 *
 * const result = createLighting({ scene, config: mapData.lighting });
 * if (!result.ok) return result;
 * // ... use result.data.lights ...
 * disposeLighting({ lighting: result.data });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type DeepReadonly, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import {
	LightingConfigSchema,
	type LightConfig,
	type LightingConfig,
} from '../schemas/lighting-config';
import type { ColorRgba, Vector3 } from '../schemas/scene-setup-config';

// =============================================================================
// Types
// =============================================================================

/** A managed light with its associated sub-resources. */
export type ManagedLight = {
	readonly config: DeepReadonly<LightConfig>;
	readonly light: BABYLON.Light;
};

/** The top-level lighting system instance. */
export type LightingInstance = {
	readonly lights: readonly ManagedLight[];
	readonly glowLayer: BABYLON.GlowLayer | null;
	readonly scene: BABYLON.Scene;
	readonly config: DeepReadonly<LightingConfig>;
};

// =============================================================================
// Falloff & Intensity Mode Mappings
// =============================================================================

/** Maps falloff type string to Babylon.js constant. */
const FALLOFF_TYPE_MAP: Readonly<Record<string, number>> = {
	default: BABYLON.Light.FALLOFF_DEFAULT,
	physical: BABYLON.Light.FALLOFF_PHYSICAL,
	gltf: BABYLON.Light.FALLOFF_GLTF,
	standard: BABYLON.Light.FALLOFF_STANDARD,
};

/** Maps intensity mode string to Babylon.js constant. */
const INTENSITY_MODE_MAP: Readonly<Record<string, number>> = {
	automatic: BABYLON.Light.INTENSITYMODE_AUTOMATIC,
	luminous_power: BABYLON.Light.INTENSITYMODE_LUMINOUSPOWER,
	luminous_intensity: BABYLON.Light.INTENSITYMODE_LUMINOUSINTENSITY,
	illuminance: BABYLON.Light.INTENSITYMODE_ILLUMINANCE,
	luminance: BABYLON.Light.INTENSITYMODE_LUMINANCE,
};

// =============================================================================
// Color Temperature (Tanner Helland Approximation)
// =============================================================================

/**
 * Clamps a value from [0, 255] to [0, 1].
 *
 * @param v - The raw value in [0, 255].
 * @returns Clamped value in [0, 1].
 */
const clampNormalize = (v: number): number => Math.min(1, Math.max(0, v / 255));

/**
 * Converts color temperature (Kelvin) to RGB using the Tanner Helland
 * approximation of the Planckian locus.
 *
 * Pure math — no Babylon.js dependency. Valid range: [1000, 15000].
 *
 * @param kelvin - Color temperature in Kelvin.
 * @returns Result containing the RGBA color (alpha always 1).
 *
 * @example
 * ```typescript
 * const result = colorTemperatureToRgb(2700);
 * if (result.ok) {
 *   result.data; // { r: ~1.0, g: ~0.72, b: ~0.42, a: 1 }
 * }
 * ```
 */
export function colorTemperatureToRgb(kelvin: Num): Result<ColorRgba> {
	if (kelvin < 1000 || kelvin > 15_000) {
		return err(
			ERRORS.VALIDATION.INVALID_FORMAT,
			`Color temperature must be between 1000 and 15000 Kelvin, got ${String(kelvin)}`,
		);
	}

	const temp: number = kelvin / 100;
	let r: number;
	let g: number;
	let b: number;

	// Red
	if (temp <= 66) {
		r = 255;
	} else {
		r = 329.698_727_446 * (temp - 60) ** -0.133_204_759_2;
	}

	// Green
	if (temp <= 66) {
		g = 99.470_802_586_1 * Math.log(temp) - 161.119_568_166_1;
	} else {
		g = 288.122_169_528_3 * (temp - 60) ** -0.075_514_849_2;
	}

	// Blue
	if (temp >= 66) {
		b = 255;
	} else if (temp <= 19) {
		b = 0;
	} else {
		b = 138.517_731_223_1 * Math.log(temp - 10) - 305.044_792_730_7;
	}

	return okUnchecked({
		r: clampNormalize(r),
		g: clampNormalize(g),
		b: clampNormalize(b),
		a: 1,
	});
}

// =============================================================================
// Light Creation (Private)
// =============================================================================

/**
 * Creates a Babylon.js light from a validated config.
 *
 * @param scene - The scene to add the light to.
 * @param config - The validated light configuration.
 * @returns BabylonResult containing the created light.
 */
function createBabylonLight(
	scene: BABYLON.Scene,
	config: DeepReadonly<LightConfig>,
): BabylonResult<BABYLON.Light> {
	try {
		let light: BABYLON.Light;

		switch (config.type) {
			case 'point': {
				const pos: BABYLON.Vector3 = new BABYLON.Vector3(
					config.position.x,
					config.position.y,
					config.position.z,
				);
				const pointLight: BABYLON.PointLight = new BABYLON.PointLight(config.id, pos, scene);
				pointLight.range = config.range;
				light = pointLight;
				break;
			}

			case 'spot': {
				const pos: BABYLON.Vector3 = new BABYLON.Vector3(
					config.position.x,
					config.position.y,
					config.position.z,
				);
				const dir: BABYLON.Vector3 = new BABYLON.Vector3(
					config.direction.x,
					config.direction.y,
					config.direction.z,
				);
				const spotLight: BABYLON.SpotLight = new BABYLON.SpotLight(
					config.id,
					pos,
					dir,
					config.angle,
					config.exponent,
					scene,
				);
				spotLight.range = config.range;
				light = spotLight;
				break;
			}

			case 'directional': {
				const dir: BABYLON.Vector3 = new BABYLON.Vector3(
					config.direction.x,
					config.direction.y,
					config.direction.z,
				);
				const dirLight: BABYLON.DirectionalLight = new BABYLON.DirectionalLight(
					config.id,
					dir,
					scene,
				);
				dirLight.position = new BABYLON.Vector3(
					config.position.x,
					config.position.y,
					config.position.z,
				);
				dirLight.autoCalcShadowZBounds = config.autoCalcShadowZBounds;
				light = dirLight;
				break;
			}

			case 'hemispheric': {
				const dir: BABYLON.Vector3 = new BABYLON.Vector3(
					config.direction.x,
					config.direction.y,
					config.direction.z,
				);
				const hemiLight: BABYLON.HemisphericLight = new BABYLON.HemisphericLight(
					config.id,
					dir,
					scene,
				);
				hemiLight.groundColor = new BABYLON.Color3(
					config.groundColor.r,
					config.groundColor.g,
					config.groundColor.b,
				);
				light = hemiLight;
				break;
			}
		}

		// Apply common properties
		light.intensity = config.intensity;
		light.setEnabled(config.enabled);

		// Apply diffuse — may be overridden by colorTemperature below
		light.diffuse = new BABYLON.Color3(config.diffuse.r, config.diffuse.g, config.diffuse.b);
		light.specular = new BABYLON.Color3(config.specular.r, config.specular.g, config.specular.b);

		// Color temperature overrides diffuse
		if (config.colorTemperature !== undefined) {
			const cctResult: Result<ColorRgba> = colorTemperatureToRgb(config.colorTemperature);
			if (cctResult.ok) {
				light.diffuse = new BABYLON.Color3(cctResult.data.r, cctResult.data.g, cctResult.data.b);
			}
		}

		// Apply falloff type
		const falloff: number | undefined = FALLOFF_TYPE_MAP[config.falloffType];
		if (falloff !== undefined) {
			light.falloffType = falloff;
		}

		// Apply intensity mode
		const intensityMode: number | undefined = INTENSITY_MODE_MAP[config.intensityMode];
		if (intensityMode !== undefined) {
			light.intensityMode = intensityMode;
		}

		return okShallow(light);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Public API
// =============================================================================

/** Options for creating the lighting system. */
type CreateLightingOptions = {
	readonly scene: BABYLON.Scene;
	readonly config: unknown;
};

/**
 * Creates the lighting system from a config object.
 *
 * Validates the config, removes the default scene light, creates all
 * Babylon.js lights, and returns the `LightingInstance`.
 *
 * @param options - Scene and raw lighting config.
 * @returns BabylonResult containing the lighting instance.
 *
 * @example
 * ```typescript
 * const result = createLighting({ scene, config: mapData.lighting });
 * if (!result.ok) return result;
 * ```
 */
export function createLighting(options: CreateLightingOptions): BabylonResult<LightingInstance> {
	const parsed: Result<LightingConfig> = safeParse(LightingConfigSchema, options.config);
	if (!parsed.ok) return parsed;
	const config: DeepReadonly<LightingConfig> = parsed.data;

	// Check for duplicate light IDs
	const ids: Set<string> = new Set<string>();
	for (const lightCfg of config.lights) {
		if (ids.has(lightCfg.id)) {
			return err(ERRORS.VALIDATION.INVALID_FORMAT, `Duplicate light ID: '${lightCfg.id}'`);
		}
		ids.add(lightCfg.id);
	}

	try {
		// Remove existing default-light
		const defaultLight: BABYLON.Nullable<BABYLON.Light> =
			options.scene.getLightByName('default-light');
		if (defaultLight) {
			defaultLight.dispose();
		}

		// Create lights
		const managedLights: ManagedLight[] = [];
		for (const lightCfg of config.lights) {
			const lightResult: BabylonResult<BABYLON.Light> = createBabylonLight(options.scene, lightCfg);
			if (!lightResult.ok) return lightResult;

			managedLights.push({
				config: lightCfg,
				light: lightResult.data,
			});
		}

		const instance: LightingInstance = {
			lights: managedLights,
			glowLayer: null,
			scene: options.scene,
			config,
		};

		return okShallow(instance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Update Operations
// =============================================================================

/** Options for updating light position. */
type UpdatePositionOptions = {
	readonly lighting: LightingInstance;
	readonly lightId: string;
	readonly position: Vector3;
};

/**
 * Updates a light's position by ID.
 *
 * Only applies to lights with a position property (Point, Spot, Directional).
 *
 * @param options - Lighting instance, light ID, and new position.
 * @returns BabylonResult indicating success.
 */
export function updateLightPosition(options: UpdatePositionOptions): BabylonResult<Bool> {
	const managed: ManagedLight | undefined = options.lighting.lights.find(
		(m: ManagedLight) => m.config.id === options.lightId,
	);
	if (!managed) {
		return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
	}

	try {
		const light: BABYLON.Light = managed.light;
		if ('position' in light && light.position instanceof BABYLON.Vector3) {
			light.position = new BABYLON.Vector3(
				options.position.x,
				options.position.y,
				options.position.z,
			);
		}
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/** Options for updating light intensity. */
type UpdateIntensityOptions = {
	readonly lighting: LightingInstance;
	readonly lightId: string;
	readonly intensity: Num;
};

/**
 * Updates a light's intensity by ID.
 *
 * @param options - Lighting instance, light ID, and new intensity.
 * @returns BabylonResult indicating success.
 */
export function updateLightIntensity(options: UpdateIntensityOptions): BabylonResult<Bool> {
	const managed: ManagedLight | undefined = options.lighting.lights.find(
		(m: ManagedLight) => m.config.id === options.lightId,
	);
	if (!managed) {
		return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
	}

	try {
		managed.light.intensity = options.intensity;
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/** Options for updating light color. */
type UpdateColorOptions = {
	readonly lighting: LightingInstance;
	readonly lightId: string;
	readonly diffuse: ColorRgba;
};

/**
 * Updates a light's diffuse color by ID.
 *
 * @param options - Lighting instance, light ID, and new diffuse color.
 * @returns BabylonResult indicating success.
 */
export function updateLightColor(options: UpdateColorOptions): BabylonResult<Bool> {
	const managed: ManagedLight | undefined = options.lighting.lights.find(
		(m: ManagedLight) => m.config.id === options.lightId,
	);
	if (!managed) {
		return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
	}

	try {
		managed.light.diffuse = new BABYLON.Color3(
			options.diffuse.r,
			options.diffuse.g,
			options.diffuse.b,
		);
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Remove & Dispose
// =============================================================================

/** Options for removing a light by ID. */
type RemoveLightOptions = {
	readonly lighting: LightingInstance;
	readonly lightId: string;
};

/**
 * Removes a light by ID and returns an updated LightingInstance.
 *
 * Disposes the Babylon.js light and all sub-resources.
 *
 * @param options - Lighting instance and light ID to remove.
 * @returns BabylonResult containing the updated lighting instance.
 */
export function removeLightById(options: RemoveLightOptions): BabylonResult<LightingInstance> {
	const idx: number = options.lighting.lights.findIndex(
		(m: ManagedLight) => m.config.id === options.lightId,
	);
	if (idx === -1) {
		return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
	}

	try {
		const managed: ManagedLight = options.lighting.lights[idx]!;
		managed.light.dispose();

		const remaining: ManagedLight[] = [
			...options.lighting.lights.slice(0, idx),
			...options.lighting.lights.slice(idx + 1),
		];

		const updated: LightingInstance = {
			...options.lighting,
			lights: remaining,
		};

		return okShallow(updated);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/** Options for disposing the entire lighting system. */
type DisposeLightingOptions = {
	readonly lighting: LightingInstance;
};

/**
 * Disposes the entire lighting system.
 *
 * Disposes glow layer, then all managed lights and their sub-resources.
 *
 * @param options - The lighting instance to dispose.
 * @returns BabylonResult indicating success.
 */
export function disposeLighting(options: DisposeLightingOptions): BabylonResult<Bool> {
	try {
		// Dispose glow layer
		if (options.lighting.glowLayer) {
			options.lighting.glowLayer.dispose();
		}

		// Dispose all lights
		for (const managed of options.lighting.lights) {
			managed.light.dispose();
		}

		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}
