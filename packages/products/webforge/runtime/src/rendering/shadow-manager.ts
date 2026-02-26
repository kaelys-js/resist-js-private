/**
 * Shadow manager — creates, configures, and disposes shadow generators.
 *
 * Supports three shadow types:
 * - **PCF** (Percentage Closer Filtering) — standard soft shadows
 * - **PCSS** (Percentage Closer Soft Shadows) — contact-hardening shadows
 * - **Cascade** — multi-cascade shadow maps for large directional light areas
 *
 * Cascade type requires a `DirectionalLight`; falls back to PCF for other light types.
 *
 * Quality scaling adjusts shadow parameters based on the global `QualityPreset`.
 *
 * @example
 * ```typescript
 * import { createShadowGenerator, disposeShadowGenerator } from './shadow-manager';
 *
 * const result = createShadowGenerator({ light, config: shadowConfig, scene });
 * if (!result.ok) return result;
 * // result.data is a ShadowGenerator or CascadedShadowGenerator
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { ShadowConfig } from '../schemas/lighting-config';
import type { QualityPreset } from '../schemas/quality-config';

// =============================================================================
// Types
// =============================================================================

/** A shadow generator instance — either standard or cascaded. */
export type ShadowGeneratorInstance = BABYLON.ShadowGenerator | BABYLON.CascadedShadowGenerator;

// =============================================================================
// Quality Mapping
// =============================================================================

/** Maps filter quality string to Babylon.js constant. */
const SHADOW_QUALITY_MAP: Readonly<Record<string, number>> = {
	low: BABYLON.ShadowGenerator.QUALITY_LOW,
	medium: BABYLON.ShadowGenerator.QUALITY_MEDIUM,
	high: BABYLON.ShadowGenerator.QUALITY_HIGH,
};

// =============================================================================
// Create
// =============================================================================

/** Options for creating a shadow generator. */
type CreateShadowGeneratorOptions = {
	readonly light: BABYLON.IShadowLight;
	readonly config: Partial<ShadowConfig>;
	readonly scene: BABYLON.Scene;
};

/**
 * Creates a shadow generator from a validated shadow config.
 *
 * For `'cascade'` type with a `DirectionalLight`, creates a `CascadedShadowGenerator`.
 * For `'cascade'` with non-directional lights, falls back to PCF `ShadowGenerator`.
 *
 * @param options - Light, shadow config, and scene.
 * @returns BabylonResult containing the shadow generator.
 *
 * @example
 * ```typescript
 * const result = createShadowGenerator({ light, config: { enabled: true, type: 'pcf' }, scene });
 * if (!result.ok) return result;
 * ```
 */
export function createShadowGenerator(
	options: CreateShadowGeneratorOptions,
): BabylonResult<ShadowGeneratorInstance> {
	try {
		const { light, config, scene: _scene } = options;
		const mapSize: number = config.mapSize ?? 1024;
		let generator: ShadowGeneratorInstance;

		if (config.type === 'cascade' && light instanceof BABYLON.DirectionalLight) {
			// CascadedShadowGenerator for DirectionalLight
			const csm: BABYLON.CascadedShadowGenerator = new BABYLON.CascadedShadowGenerator(
				mapSize,
				light,
			);
			csm.numCascades = config.numCascades ?? 3;
			csm.stabilizeCascades = config.stabilizeCascades ?? true;
			csm.cascadeBlendPercentage = config.cascadeBlendPercentage ?? 0.05;
			csm.autoCalcDepthBounds = config.autoCalcDepthBounds ?? true;
			generator = csm;
		} else {
			// Standard ShadowGenerator
			const gen: BABYLON.ShadowGenerator = new BABYLON.ShadowGenerator(mapSize, light);

			if (config.type === 'pcss') {
				gen.useContactHardeningShadow = true;
			} else {
				// PCF (default, or cascade fallback for non-directional lights)
				gen.usePercentageCloserFiltering = true;
			}

			generator = gen;
		}

		// Apply filtering quality
		const qualityValue: number | undefined =
			SHADOW_QUALITY_MAP[config.filteringQuality ?? 'medium'];
		if (qualityValue !== undefined) {
			generator.filteringQuality = qualityValue;
		}

		// Apply common properties
		generator.bias = config.bias ?? 0.000_05;
		generator.normalBias = config.normalBias ?? 0.04;
		generator.darkness = config.darkness ?? 0.5;
		generator.transparencyShadow = config.transparencyShadow ?? false;
		generator.enableSoftTransparentShadow = config.enableSoftTransparentShadow ?? false;

		return okShallow(generator);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Shadow Casters
// =============================================================================

/** Options for adding shadow casters. */
type AddShadowCastersOptions = {
	readonly generator: ShadowGeneratorInstance;
	readonly meshes: readonly BABYLON.AbstractMesh[];
};

/**
 * Adds meshes as shadow casters and receivers.
 *
 * @param options - Shadow generator and meshes to register.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * addShadowCasters({ generator, meshes: scene.meshes });
 * ```
 */
export function addShadowCasters(options: AddShadowCastersOptions): BabylonResult<Bool> {
	try {
		for (const mesh of options.meshes) {
			options.generator.addShadowCaster(mesh);
			mesh.receiveShadows = true;
		}
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Quality Scaling
// =============================================================================

/** Options for quality scaling. */
type QualityScalingOptions = {
	readonly config: Partial<ShadowConfig>;
	readonly quality: QualityPreset;
};

/** Scaled shadow config result. */
type ScaledShadowConfig = {
	readonly enabled: boolean;
	readonly type: string;
	readonly mapSize: number;
	readonly filteringQuality: string;
	readonly numCascades: number;
	readonly enableSoftTransparentShadow: boolean;
};

/**
 * Adjusts shadow config based on quality preset.
 *
 * | Setting | Low | Medium | High | Ultra |
 * |---------|-----|--------|------|-------|
 * | enabled | false | unchanged | unchanged | unchanged |
 * | mapSize | — | cap 1024 | unchanged | min 2048 |
 * | filteringQuality | — | 'low' | unchanged | 'high' |
 * | numCascades | — | cap 2 | unchanged | min 3 |
 * | softTransparent | — | false | unchanged | unchanged |
 *
 * @param options - Shadow config and quality preset.
 * @returns Result containing the scaled shadow config.
 *
 * @example
 * ```typescript
 * const result = applyShadowQualityScaling({ config: shadowConfig, quality: 'medium' });
 * ```
 */
export function applyShadowQualityScaling(
	options: QualityScalingOptions,
): Result<ScaledShadowConfig> {
	const { config, quality } = options;
	const mapSize: number = config.mapSize ?? 1024;
	const filteringQuality: string = config.filteringQuality ?? 'medium';
	const numCascades: number = config.numCascades ?? 3;
	const enabled: boolean = config.enabled ?? false;
	const softTransparent: boolean = config.enableSoftTransparentShadow ?? false;

	// Disabled shadows stay disabled regardless of quality
	if (!enabled) {
		return okUnchecked({
			enabled: false,
			type: config.type ?? 'pcf',
			mapSize,
			filteringQuality,
			numCascades,
			enableSoftTransparentShadow: softTransparent,
		});
	}

	switch (quality) {
		case 'low': {
			return okUnchecked({
				enabled: false,
				type: config.type ?? 'pcf',
				mapSize,
				filteringQuality,
				numCascades,
				enableSoftTransparentShadow: softTransparent,
			});
		}

		case 'medium': {
			return okUnchecked({
				enabled: true,
				type: config.type ?? 'pcf',
				mapSize: Math.min(1024, mapSize),
				filteringQuality: 'low',
				numCascades: Math.min(numCascades, 2),
				enableSoftTransparentShadow: false,
			});
		}

		case 'high': {
			return okUnchecked({
				enabled: true,
				type: config.type ?? 'pcf',
				mapSize,
				filteringQuality,
				numCascades,
				enableSoftTransparentShadow: softTransparent,
			});
		}

		case 'ultra': {
			return okUnchecked({
				enabled: true,
				type: config.type ?? 'pcf',
				mapSize: Math.max(2048, mapSize),
				filteringQuality: 'high',
				numCascades: Math.max(numCascades, 3),
				enableSoftTransparentShadow: softTransparent,
			});
		}
	}
}

// =============================================================================
// Dispose
// =============================================================================

/** Options for disposing a shadow generator. */
type DisposeShadowGeneratorOptions = {
	readonly generator: ShadowGeneratorInstance;
};

/**
 * Disposes a shadow generator and its resources.
 *
 * @param options - The shadow generator to dispose.
 * @returns BabylonResult indicating success.
 */
export function disposeShadowGenerator(
	options: DisposeShadowGeneratorOptions,
): BabylonResult<Bool> {
	try {
		options.generator.dispose();
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}
