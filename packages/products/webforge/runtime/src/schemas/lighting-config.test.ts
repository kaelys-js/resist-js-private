/**
 * Lighting configuration schema tests.
 *
 * Tests all lighting sub-schemas: flicker, shadow, volumetric light,
 * lens flare, light variants (point, spot, directional, hemispheric),
 * day/night cycle, sun path, time keyframes, glow layer, and the
 * top-level LightingConfig.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import {
	DayNightCycleConfigSchema,
	DirectionalLightConfigSchema,
	DistanceFadeConfigSchema,
	FlickerConfigSchema,
	GlowLayerConfigSchema,
	HemisphericLightConfigSchema,
	IndoorModeConfigSchema,
	IndoorModeSchema,
	LensFlareConfigSchema,
	LensFlareEntrySchema,
	LensFlarePresetSchema,
	LightConfigSchema,
	LightingConfigSchema,
	LightmapModeSchema,
	PointLightConfigSchema,
	RealTimeSeasonMapSchema,
	ShadowConfigSchema,
	ShadowFilterTypeSchema,
	SpotLightConfigSchema,
	SunPathConfigSchema,
	TimeKeyframeSchema,
	TimeSourceSchema,
	TransitionEasingSchema,
	VolumetricLightConfigSchema,
	type DayNightCycleConfig,
	type DirectionalLightConfig,
	type DistanceFadeConfig,
	type FlickerConfig,
	type GlowLayerConfig,
	type HemisphericLightConfig,
	type IndoorMode,
	type IndoorModeConfig,
	type LensFlareConfig,
	type LensFlareEntry,
	type LensFlarePreset,
	type LightConfig,
	type LightingConfig,
	type LightmapMode,
	type PointLightConfig,
	type RealTimeSeasonMap,
	type ShadowConfig,
	type ShadowFilterType,
	type SpotLightConfig,
	type SunPathConfig,
	type TimeKeyframe,
	type TimeSource,
	type TransitionEasing,
	type VolumetricLightConfig,
} from './lighting-config';

// =============================================================================
// FlickerConfigSchema
// =============================================================================

describe('FlickerConfigSchema', () => {
	test('applies all defaults for empty object', () => {
		const result: Result<FlickerConfig> = safeParse(FlickerConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeTruthy();
		expect(result.data.type).toBe('candle');
		expect(result.data.intensity).toBeCloseTo(0.3);
		expect(result.data.speed).toBeCloseTo(1.0);
		expect(result.data.colorShift).toBeFalsy();
		expect(result.data.colorShiftRange).toBe(200);
		expect(result.data.positionJitter).toBe(0);
	});

	test('accepts each of 7 flicker types', () => {
		const types: string[] = [
			'candle',
			'torch',
			'campfire',
			'pulse',
			'strobe',
			'breathing',
			'fluorescent',
		];
		for (const type of types) {
			const result: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { type });
			expect(result.ok).toBeTruthy();
		}
	});

	test('validates intensity range [0, 1]', () => {
		const valid: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { intensity: 0.5 });
		expect(valid.ok).toBeTruthy();

		const tooLow: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { intensity: -0.1 });
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { intensity: 1.1 });
		expect(tooHigh.ok).toBeFalsy();
	});

	test('validates speed range [0.1, 10]', () => {
		const valid: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { speed: 5 });
		expect(valid.ok).toBeTruthy();

		const tooLow: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { speed: 0.05 });
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { speed: 11 });
		expect(tooHigh.ok).toBeFalsy();
	});

	test('accepts colorShift with colorShiftRange', () => {
		const result: Result<FlickerConfig> = safeParse(FlickerConfigSchema, {
			colorShift: true,
			colorShiftRange: 300,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.colorShift).toBeTruthy();
		expect(result.data.colorShiftRange).toBe(300);
	});

	test('validates positionJitter range [0, 1]', () => {
		const valid: Result<FlickerConfig> = safeParse(FlickerConfigSchema, {
			positionJitter: 0.5,
		});
		expect(valid.ok).toBeTruthy();

		const tooHigh: Result<FlickerConfig> = safeParse(FlickerConfigSchema, {
			positionJitter: 1.5,
		});
		expect(tooHigh.ok).toBeFalsy();
	});

	test('rejects invalid flicker type', () => {
		const result: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { type: 'bonfire' });
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// ShadowConfigSchema
// =============================================================================

describe('ShadowConfigSchema', () => {
	test('applies all defaults for empty object', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeFalsy();
		expect(result.data.type).toBe('pcf');
		expect(result.data.mapSize).toBe(1024);
		expect(result.data.filteringQuality).toBe('medium');
		expect(result.data.bias).toBeCloseTo(0.000_05);
		expect(result.data.normalBias).toBeCloseTo(0.04);
		expect(result.data.darkness).toBeCloseTo(0.5);
		expect(result.data.transparencyShadow).toBeFalsy();
		expect(result.data.enableSoftTransparentShadow).toBeFalsy();
		expect(result.data.numCascades).toBe(3);
		expect(result.data.stabilizeCascades).toBeTruthy();
		expect(result.data.cascadeBlendPercentage).toBeCloseTo(0.05);
		expect(result.data.autoCalcDepthBounds).toBeTruthy();
	});

	test('validates mapSize picklist values', () => {
		const validSizes: number[] = [256, 512, 1024, 2048, 4096];
		for (const mapSize of validSizes) {
			const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { mapSize });
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid mapSize', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { mapSize: 999 });
		expect(result.ok).toBeFalsy();
	});

	test('validates type picklist', () => {
		const types: string[] = ['pcf', 'pcss', 'cascade'];
		for (const type of types) {
			const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { type });
			expect(result.ok).toBeTruthy();
		}
	});

	test('validates numCascades range [1, 4]', () => {
		const valid: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { numCascades: 2 });
		expect(valid.ok).toBeTruthy();

		const tooLow: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { numCascades: 0 });
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { numCascades: 5 });
		expect(tooHigh.ok).toBeFalsy();
	});

	test('validates bias, normalBias, darkness ranges [0, 1]', () => {
		const valid: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			bias: 0.001,
			normalBias: 0.1,
			darkness: 0.8,
		});
		expect(valid.ok).toBeTruthy();

		const badBias: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { bias: -0.001 });
		expect(badBias.ok).toBeFalsy();

		const badDarkness: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { darkness: 1.5 });
		expect(badDarkness.ok).toBeFalsy();
	});

	test('validates cascadeBlendPercentage range [0, 1]', () => {
		const valid: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			cascadeBlendPercentage: 0.1,
		});
		expect(valid.ok).toBeTruthy();

		const tooHigh: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			cascadeBlendPercentage: 1.5,
		});
		expect(tooHigh.ok).toBeFalsy();
	});

	test('accepts boolean fields', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			enableSoftTransparentShadow: true,
			transparencyShadow: true,
			stabilizeCascades: false,
			autoCalcDepthBounds: false,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enableSoftTransparentShadow).toBeTruthy();
		expect(result.data.transparencyShadow).toBeTruthy();
		expect(result.data.stabilizeCascades).toBeFalsy();
		expect(result.data.autoCalcDepthBounds).toBeFalsy();
	});

	test('rejects out-of-range values', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { normalBias: 2 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects unknown shadow type', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { type: 'vsm' });
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// VolumetricLightConfigSchema
// =============================================================================

describe('VolumetricLightConfigSchema', () => {
	test('applies all defaults for empty object', () => {
		const result: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeFalsy();
		expect(result.data.samples).toBe(100);
		expect(result.data.decay).toBeCloseTo(0.97);
		expect(result.data.weight).toBeCloseTo(0.5);
		expect(result.data.density).toBeCloseTo(0.5);
		expect(result.data.passRatio).toBeCloseTo(0.5);
	});

	test('validates samples integer range [10, 200]', () => {
		const valid: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			samples: 50,
		});
		expect(valid.ok).toBeTruthy();

		const tooLow: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			samples: 5,
		});
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			samples: 300,
		});
		expect(tooHigh.ok).toBeFalsy();
	});

	test('validates decay, weight, density ranges [0, 1]', () => {
		const result: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			decay: 0.95,
			weight: 0.3,
			density: 0.7,
		});
		expect(result.ok).toBeTruthy();

		const badDecay: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			decay: 1.5,
		});
		expect(badDecay.ok).toBeFalsy();
	});

	test('validates passRatio range (0, 1]', () => {
		const valid: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			passRatio: 0.25,
		});
		expect(valid.ok).toBeTruthy();

		const valid1: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			passRatio: 1,
		});
		expect(valid1.ok).toBeTruthy();
	});

	test('rejects non-integer samples', () => {
		const result: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {
			samples: 50.5,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// LensFlareConfigSchema
// =============================================================================

describe('LensFlareConfigSchema', () => {
	test('applies defaults (enabled=false)', () => {
		const result: Result<LensFlareConfig> = safeParse(LensFlareConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeFalsy();
	});

	test('accepts custom flares array', () => {
		const result: Result<LensFlareConfig> = safeParse(LensFlareConfigSchema, {
			enabled: true,
			flares: [
				{ size: 0.5, position: 0, color: { r: 1, g: 1, b: 1 } },
				{ size: 0.2, position: -0.5, color: { r: 0.8, g: 0.6, b: 0.2 } },
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.flares).toHaveLength(2);
	});

	test('validates flare entry ranges', () => {
		const badSize: Result<LensFlareEntry> = safeParse(LensFlareEntrySchema, {
			size: 3,
			position: 0,
			color: { r: 1, g: 1, b: 1 },
		});
		expect(badSize.ok).toBeFalsy();

		const badPos: Result<LensFlareEntry> = safeParse(LensFlareEntrySchema, {
			size: 0.5,
			position: 2,
			color: { r: 1, g: 1, b: 1 },
		});
		expect(badPos.ok).toBeFalsy();
	});
});

// =============================================================================
// LightConfigSchema — Variants
// =============================================================================

describe('LightConfigSchema — PointLight', () => {
	test('accepts valid PointLight config', () => {
		const result: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'torch-1',
			type: 'point',
			position: { x: 10, y: 2, z: 10 },
			range: 15,
			intensity: 1.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('point');
		expect(result.data.id).toBe('torch-1');
	});

	test('accepts meshRadius on PointLight', () => {
		const result: Result<PointLightConfig> = safeParse(PointLightConfigSchema, {
			id: 'torch',
			type: 'point',
			meshRadius: 8,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.meshRadius).toBe(8);
	});

	test('applies common field defaults', () => {
		const result: Result<PointLightConfig> = safeParse(PointLightConfigSchema, {
			id: 'light',
			type: 'point',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeTruthy();
		expect(result.data.intensity).toBeCloseTo(1.0);
		expect(result.data.diffuse.r).toBe(1);
		expect(result.data.specular.r).toBe(1);
		expect(result.data.falloffType).toBe('default');
		expect(result.data.intensityMode).toBe('automatic');
		expect(result.data.range).toBe(100);
	});

	test('rejects missing required id', () => {
		const result: Result<PointLightConfig> = safeParse(PointLightConfigSchema, {
			type: 'point',
		});
		expect(result.ok).toBeFalsy();
	});
});

describe('LightConfigSchema — SpotLight', () => {
	test('accepts valid SpotLight config with projection texture', () => {
		const result: Result<SpotLightConfig> = safeParse(SpotLightConfigSchema, {
			id: 'spot-1',
			type: 'spot',
			position: { x: 5, y: 10, z: 5 },
			direction: { x: 0, y: -1, z: 0 },
			angle: 0.8,
			exponent: 3,
			projectionTexturePath: 'textures/stained-glass.png',
			projectionTextureNear: 0.5,
			projectionTextureFar: 50,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('spot');
		expect(result.data.projectionTexturePath).toBe('textures/stained-glass.png');
	});

	test('validates angle range [0, PI]', () => {
		const valid: Result<SpotLightConfig> = safeParse(SpotLightConfigSchema, {
			id: 's',
			type: 'spot',
			angle: Math.PI,
		});
		expect(valid.ok).toBeTruthy();

		const tooHigh: Result<SpotLightConfig> = safeParse(SpotLightConfigSchema, {
			id: 's',
			type: 'spot',
			angle: 4,
		});
		expect(tooHigh.ok).toBeFalsy();
	});

	test('accepts meshRadius on SpotLight', () => {
		const result: Result<SpotLightConfig> = safeParse(SpotLightConfigSchema, {
			id: 's',
			type: 'spot',
			meshRadius: 10,
		});
		expect(result.ok).toBeTruthy();
	});
});

describe('LightConfigSchema — DirectionalLight', () => {
	test('accepts valid DirectionalLight with volumetric + lens flare', () => {
		const result: Result<DirectionalLightConfig> = safeParse(DirectionalLightConfigSchema, {
			id: 'sun',
			type: 'directional',
			direction: { x: -0.5, y: -1, z: 0.3 },
			shadow: { enabled: true, type: 'cascade', mapSize: 2048 },
			volumetricLight: { enabled: true, samples: 80 },
			lensFlare: { enabled: true },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('directional');
		expect(result.data.volumetricLight?.enabled).toBeTruthy();
		expect(result.data.lensFlare?.enabled).toBeTruthy();
	});

	test('validates autoCalcShadowZBounds default', () => {
		const result: Result<DirectionalLightConfig> = safeParse(DirectionalLightConfigSchema, {
			id: 'sun',
			type: 'directional',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.autoCalcShadowZBounds).toBeTruthy();
	});
});

describe('LightConfigSchema — HemisphericLight', () => {
	test('accepts valid HemisphericLight config', () => {
		const result: Result<HemisphericLightConfig> = safeParse(HemisphericLightConfigSchema, {
			id: 'ambient',
			type: 'hemispheric',
			direction: { x: 0, y: 1, z: 0 },
			groundColor: { r: 0.2, g: 0.2, b: 0.2 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('hemispheric');
		expect(result.data.groundColor.r).toBeCloseTo(0.2);
	});

	test('has no shadow or flicker fields (strictObject)', () => {
		const result: Result<HemisphericLightConfig> = safeParse(HemisphericLightConfigSchema, {
			id: 'ambient',
			type: 'hemispheric',
			shadow: { enabled: true },
		});
		expect(result.ok).toBeFalsy();
	});

	test('applies default direction (upward)', () => {
		const result: Result<HemisphericLightConfig> = safeParse(HemisphericLightConfigSchema, {
			id: 'ambient',
			type: 'hemispheric',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.direction.y).toBe(1);
	});
});

describe('LightConfigSchema — discriminated union', () => {
	test('missing type field rejected', () => {
		const result: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'light',
		});
		expect(result.ok).toBeFalsy();
	});

	test('unknown type value rejected', () => {
		const result: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'light',
			type: 'area',
		});
		expect(result.ok).toBeFalsy();
	});

	test('common fields work across all variants', () => {
		const base: Record<string, unknown> = {
			intensity: 2.5,
			diffuse: { r: 1, g: 0.9, b: 0.8 },
			specular: { r: 0.5, g: 0.5, b: 0.5 },
			falloffType: 'physical',
			intensityMode: 'luminous_power',
		};

		const point: Result<LightConfig> = safeParse(LightConfigSchema, {
			...base,
			id: 'p',
			type: 'point',
		});
		expect(point.ok).toBeTruthy();

		const dir: Result<LightConfig> = safeParse(LightConfigSchema, {
			...base,
			id: 'd',
			type: 'directional',
		});
		expect(dir.ok).toBeTruthy();
	});

	test('validates colorTemperature range [1000, 15000]', () => {
		const valid: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'l',
			type: 'point',
			colorTemperature: 2700,
		});
		expect(valid.ok).toBeTruthy();

		const tooLow: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'l',
			type: 'point',
			colorTemperature: 500,
		});
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'l',
			type: 'point',
			colorTemperature: 20_000,
		});
		expect(tooHigh.ok).toBeFalsy();
	});

	test('validates falloffType picklist', () => {
		const types: string[] = ['default', 'physical', 'gltf', 'standard'];
		for (const falloffType of types) {
			const result: Result<LightConfig> = safeParse(LightConfigSchema, {
				id: 'l',
				type: 'point',
				falloffType,
			});
			expect(result.ok).toBeTruthy();
		}

		const bad: Result<LightConfig> = safeParse(LightConfigSchema, {
			id: 'l',
			type: 'point',
			falloffType: 'inverse',
		});
		expect(bad.ok).toBeFalsy();
	});

	test('validates intensityMode picklist', () => {
		const modes: string[] = [
			'automatic',
			'luminous_power',
			'luminous_intensity',
			'illuminance',
			'luminance',
		];
		for (const intensityMode of modes) {
			const result: Result<LightConfig> = safeParse(LightConfigSchema, {
				id: 'l',
				type: 'point',
				intensityMode,
			});
			expect(result.ok).toBeTruthy();
		}
	});
});

// =============================================================================
// TimeKeyframeSchema
// =============================================================================

describe('TimeKeyframeSchema', () => {
	test('accepts valid keyframe with only time', () => {
		const result: Result<TimeKeyframe> = safeParse(TimeKeyframeSchema, { time: 12 });
		expect(result.ok).toBeTruthy();
	});

	test('accepts all optional fields', () => {
		const result: Result<TimeKeyframe> = safeParse(TimeKeyframeSchema, {
			time: 7,
			ambientColor: { r: 0.4, g: 0.35, b: 0.3 },
			ambientGroundColor: { r: 0.15, g: 0.12, b: 0.1 },
			sunColor: { r: 1, g: 0.85, b: 0.7 },
			sunIntensity: 0.6,
			moonColor: { r: 0.3, g: 0.3, b: 0.4 },
			moonIntensity: 0,
			clearColor: { r: 0.5, g: 0.6, b: 0.75 },
			fogColor: { r: 0.4, g: 0.4, b: 0.5 },
			fogDensity: 0.02,
			environmentIntensity: 0.3,
		});
		expect(result.ok).toBeTruthy();
	});

	test('validates time range [0, 24]', () => {
		const valid: Result<TimeKeyframe> = safeParse(TimeKeyframeSchema, { time: 0 });
		expect(valid.ok).toBeTruthy();

		const valid24: Result<TimeKeyframe> = safeParse(TimeKeyframeSchema, { time: 24 });
		expect(valid24.ok).toBeTruthy();

		const tooLow: Result<TimeKeyframe> = safeParse(TimeKeyframeSchema, { time: -1 });
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<TimeKeyframe> = safeParse(TimeKeyframeSchema, { time: 25 });
		expect(tooHigh.ok).toBeFalsy();
	});
});

// =============================================================================
// SunPathConfigSchema
// =============================================================================

describe('SunPathConfigSchema', () => {
	test('applies all defaults', () => {
		const result: Result<SunPathConfig> = safeParse(SunPathConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.sunrise).toBe(6);
		expect(result.data.sunset).toBe(18);
		expect(result.data.maxElevation).toBe(75);
		expect(result.data.azimuthStart).toBe(90);
	});

	test('validates sunrise/sunset range [0, 24]', () => {
		const bad: Result<SunPathConfig> = safeParse(SunPathConfigSchema, { sunrise: -1 });
		expect(bad.ok).toBeFalsy();

		const bad2: Result<SunPathConfig> = safeParse(SunPathConfigSchema, { sunset: 25 });
		expect(bad2.ok).toBeFalsy();
	});

	test('validates maxElevation range [0, 90]', () => {
		const valid: Result<SunPathConfig> = safeParse(SunPathConfigSchema, { maxElevation: 90 });
		expect(valid.ok).toBeTruthy();

		const bad: Result<SunPathConfig> = safeParse(SunPathConfigSchema, { maxElevation: 91 });
		expect(bad.ok).toBeFalsy();
	});
});

// =============================================================================
// DayNightCycleConfigSchema
// =============================================================================

describe('DayNightCycleConfigSchema', () => {
	test('applies all defaults', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeFalsy();
		expect(result.data.timeOfDay).toBe(12);
		expect(result.data.speed).toBe(0);
	});

	test('validates timeOfDay range [0, 24]', () => {
		const valid: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timeOfDay: 23.5,
		});
		expect(valid.ok).toBeTruthy();

		const bad: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timeOfDay: 25,
		});
		expect(bad.ok).toBeFalsy();
	});

	test('validates speed range [0, 100]', () => {
		const valid: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			speed: 50,
		});
		expect(valid.ok).toBeTruthy();

		const bad: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			speed: -1,
		});
		expect(bad.ok).toBeFalsy();
	});

	test('accepts keyframes with 2+ entries', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			keyframes: [
				{ time: 0, sunIntensity: 0 },
				{ time: 12, sunIntensity: 1 },
			],
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects keyframes with 1 entry (min 2)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			keyframes: [{ time: 12 }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts sunPath nested config', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			sunPath: { sunrise: 5, sunset: 19, maxElevation: 80 },
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts light ID references', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			sunLightId: 'sun',
			ambientLightId: 'ambient',
			moonLightId: 'moon',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.sunLightId).toBe('sun');
		expect(result.data.ambientLightId).toBe('ambient');
		expect(result.data.moonLightId).toBe('moon');
	});

	test('environmentIntensity in keyframe accepted', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			keyframes: [
				{ time: 0, environmentIntensity: 0.02 },
				{ time: 12, environmentIntensity: 0.6 },
			],
		});
		expect(result.ok).toBeTruthy();
	});

	// ---- Time Source & Day Duration (Task 1) ----

	test('defaults timeSource to accelerated', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.timeSource).toBe('accelerated');
	});

	test('accepts timeSource: realtime', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timeSource: 'realtime',
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts timeSource: manual', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timeSource: 'manual',
		});
		expect(result.ok).toBeTruthy();
	});

	test('defaults dayDurationSeconds to 1440', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.dayDurationSeconds).toBe(1440);
	});

	test('accepts dayDurationSeconds: 600', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			dayDurationSeconds: 600,
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects dayDurationSeconds: 0 (min 1)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			dayDurationSeconds: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects dayDurationSeconds: 100000 (max 86400)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			dayDurationSeconds: 100_000,
		});
		expect(result.ok).toBeFalsy();
	});

	test('defaults reverse to false', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reverse).toBe(false);
	});

	test('accepts reverse: true', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			reverse: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reverse).toBe(true);
	});

	test('defaults timezoneOffset to 0', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.timezoneOffset).toBe(0);
	});

	test('accepts timezoneOffset: -5', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timezoneOffset: -5,
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects timezoneOffset: 15 (max 14)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timezoneOffset: 15,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects timezoneOffset: -13 (min -12)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			timezoneOffset: -13,
		});
		expect(result.ok).toBeFalsy();
	});

	// ---- Season Duration & Auto-Cycling (Task 2) ----

	test('defaults seasonDurationDays to 7', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.seasonDurationDays).toBe(7);
	});

	test('rejects seasonDurationDays: 0 (min 1)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			seasonDurationDays: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects seasonDurationDays: 366 (max 365)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			seasonDurationDays: 366,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts seasonOrder with custom order', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			seasonOrder: ['winter', 'spring', 'summer', 'autumn'],
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects seasonOrder with invalid season', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			seasonOrder: ['monsoon'],
		});
		expect(result.ok).toBeFalsy();
	});

	test('defaults seasonTransition to 0', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.seasonTransition).toBe(0);
	});

	test('rejects seasonTransition: 1.5 (max 1)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			seasonTransition: 1.5,
		});
		expect(result.ok).toBeFalsy();
	});

	test('defaults currentDay to 0', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.currentDay).toBe(0);
	});

	test('rejects currentDay: -1 (min 0)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			currentDay: -1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('defaults autoAdvanceMoonPhase to false', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.autoAdvanceMoonPhase).toBe(false);
	});

	test('accepts autoAdvanceMoonPhase: true', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			autoAdvanceMoonPhase: true,
		});
		expect(result.ok).toBeTruthy();
	});

	test('defaults moonCycleDays to 3.69', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.moonCycleDays).toBeCloseTo(3.69);
	});

	test('rejects moonCycleDays: 0 (min 1)', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			moonCycleDays: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	// ---- Real Time Season Map (Task 3) ----

	test('accepts realtimeMoonSync: true', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			realtimeMoonSync: true,
		});
		expect(result.ok).toBeTruthy();
	});

	test('defaults realtimeMoonSync to false', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.realtimeMoonSync).toBe(false);
	});

	test('accepts realTimeSeasonMap', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			realTimeSeasonMap: {
				month3: 'spring',
				month6: 'summer',
				month9: 'autumn',
				month12: 'winter',
			},
		});
		expect(result.ok).toBeTruthy();
	});

	// ---- Indoor Mode Config (Task 3) ----

	test('accepts indoorModeConfig with haltTime', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			indoorModeConfig: { haltTime: true },
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts indoorModeConfig with customTint', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			indoorModeConfig: {
				haltTime: false,
				customTint: { r: 0.5, g: 0.3, b: 0.1, a: 1 },
			},
		});
		expect(result.ok).toBeTruthy();
	});

	test('defaults indoorModeConfig.haltTime to false', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			indoorModeConfig: {},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.indoorModeConfig?.haltTime).toBe(false);
	});

	// ---- Day/Night Controls Post-FX toggle (Task 3) ----

	test('defaults dayNightControlsPostFx to true', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.dayNightControlsPostFx).toBe(true);
	});

	test('accepts dayNightControlsPostFx: false', () => {
		const result: Result<DayNightCycleConfig> = safeParse(DayNightCycleConfigSchema, {
			dayNightControlsPostFx: false,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.dayNightControlsPostFx).toBe(false);
	});
});

// =============================================================================
// TimeSourceSchema
// =============================================================================

describe('TimeSourceSchema', () => {
	test('accepts accelerated', () => {
		const result: Result<TimeSource> = safeParse(TimeSourceSchema, 'accelerated');
		expect(result.ok).toBeTruthy();
	});

	test('accepts realtime', () => {
		const result: Result<TimeSource> = safeParse(TimeSourceSchema, 'realtime');
		expect(result.ok).toBeTruthy();
	});

	test('accepts manual', () => {
		const result: Result<TimeSource> = safeParse(TimeSourceSchema, 'manual');
		expect(result.ok).toBeTruthy();
	});

	test('rejects turbo', () => {
		const result: Result<TimeSource> = safeParse(TimeSourceSchema, 'turbo');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// IndoorModeSchema (expanded)
// =============================================================================

describe('IndoorModeSchema (expanded)', () => {
	const allModes: string[] = [
		'outdoor',
		'indoor',
		'cave',
		'firelit',
		'dungeon',
		'temple',
		'underwater',
		'custom',
	];

	test.each(allModes)('accepts %s', (mode: string) => {
		const result: Result<IndoorMode> = safeParse(IndoorModeSchema, mode);
		expect(result.ok).toBeTruthy();
	});

	test('rejects lava', () => {
		const result: Result<IndoorMode> = safeParse(IndoorModeSchema, 'lava');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TransitionEasingSchema (expanded)
// =============================================================================

describe('TransitionEasingSchema (expanded)', () => {
	const allEasings: string[] = [
		'linear',
		'smooth',
		'easeIn',
		'easeOut',
		'easeInOut',
		'sine',
		'cubic',
		'step',
	];

	test.each(allEasings)('accepts %s', (easing: string) => {
		const result: Result<TransitionEasing> = safeParse(TransitionEasingSchema, easing);
		expect(result.ok).toBeTruthy();
	});

	test('rejects bounce', () => {
		const result: Result<TransitionEasing> = safeParse(TransitionEasingSchema, 'bounce');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// RealTimeSeasonMapSchema
// =============================================================================

describe('RealTimeSeasonMapSchema', () => {
	test('accepts valid month-to-season mapping', () => {
		const result: Result<RealTimeSeasonMap> = safeParse(RealTimeSeasonMapSchema, {
			month3: 'spring',
			month6: 'summer',
			month9: 'autumn',
			month12: 'winter',
		});
		expect(result.ok).toBeTruthy();
	});

	test('applies defaults for northern hemisphere', () => {
		const result: Result<RealTimeSeasonMap> = safeParse(RealTimeSeasonMapSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.month3).toBe('spring');
		expect(result.data.month6).toBe('summer');
		expect(result.data.month9).toBe('autumn');
		expect(result.data.month12).toBe('winter');
	});

	test('rejects invalid season value', () => {
		const result: Result<RealTimeSeasonMap> = safeParse(RealTimeSeasonMapSchema, {
			month3: 'monsoon',
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// IndoorModeConfigSchema
// =============================================================================

describe('IndoorModeConfigSchema', () => {
	test('defaults haltTime to false', () => {
		const result: Result<IndoorModeConfig> = safeParse(IndoorModeConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.haltTime).toBe(false);
	});

	test('accepts haltTime: true', () => {
		const result: Result<IndoorModeConfig> = safeParse(IndoorModeConfigSchema, {
			haltTime: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.haltTime).toBe(true);
	});

	test('accepts customTint', () => {
		const result: Result<IndoorModeConfig> = safeParse(IndoorModeConfigSchema, {
			customTint: { r: 0.5, g: 0.3, b: 0.1, a: 1 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.customTint).toBeDefined();
	});
});

// =============================================================================
// GlowLayerConfigSchema
// =============================================================================

describe('GlowLayerConfigSchema', () => {
	test('applies all defaults', () => {
		const result: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeFalsy();
		expect(result.data.intensity).toBeCloseTo(0.5);
		expect(result.data.blurKernelSize).toBe(32);
		expect(result.data.mainTextureRatio).toBeCloseTo(0.5);
	});

	test('validates intensity range [0, 5]', () => {
		const valid: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, { intensity: 3 });
		expect(valid.ok).toBeTruthy();

		const bad: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, { intensity: 6 });
		expect(bad.ok).toBeFalsy();
	});

	test('validates blurKernelSize integer range [1, 256]', () => {
		const valid: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, {
			blurKernelSize: 64,
		});
		expect(valid.ok).toBeTruthy();

		const bad: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, {
			blurKernelSize: 0,
		});
		expect(bad.ok).toBeFalsy();

		const bad2: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, {
			blurKernelSize: 300,
		});
		expect(bad2.ok).toBeFalsy();

		const nonInt: Result<GlowLayerConfig> = safeParse(GlowLayerConfigSchema, {
			blurKernelSize: 32.5,
		});
		expect(nonInt.ok).toBeFalsy();
	});
});

// =============================================================================
// LightingConfigSchema (top-level)
// =============================================================================

describe('LightingConfigSchema', () => {
	test('accepts empty object (all defaults)', () => {
		const result: Result<LightingConfig> = safeParse(LightingConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights).toHaveLength(0);
	});

	test('accepts full lighting config with multiple lights', () => {
		const result: Result<LightingConfig> = safeParse(LightingConfigSchema, {
			lights: [
				{
					id: 'ambient',
					type: 'hemispheric',
					intensity: 0.6,
					direction: { x: 0, y: 1, z: 0 },
				},
				{
					id: 'sun',
					type: 'directional',
					intensity: 0.8,
					direction: { x: -0.5, y: -1, z: 0.3 },
					shadow: { enabled: true, type: 'cascade', mapSize: 2048 },
				},
				{
					id: 'torch',
					type: 'point',
					intensity: 1.5,
					position: { x: 10, y: 2, z: 10 },
					colorTemperature: 2200,
					flicker: { type: 'torch', intensity: 0.25 },
				},
			],
			dayNight: {
				enabled: true,
				timeOfDay: 10,
				speed: 0.5,
				sunLightId: 'sun',
				ambientLightId: 'ambient',
			},
			glow: { enabled: true, intensity: 0.3 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights).toHaveLength(3);
	});

	test('rejects unknown top-level properties', () => {
		const result: Result<LightingConfig> = safeParse(LightingConfigSchema, {
			shadows: true,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// ShadowFilterTypeSchema (Expansion)
// =============================================================================

describe('ShadowFilterTypeSchema', () => {
	test('accepts all 8 filter types', () => {
		const types: string[] = [
			'none',
			'esm',
			'blurredEsm',
			'closeEsm',
			'blurredCloseEsm',
			'pcf',
			'pcss',
			'poisson',
		];
		for (const t of types) {
			const result: Result<ShadowFilterType> = safeParse(ShadowFilterTypeSchema, t);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid filter type', () => {
		const result: Result<ShadowFilterType> = safeParse(ShadowFilterTypeSchema, 'raytraced');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// ShadowConfigSchema Expansion Fields
// =============================================================================

describe('ShadowConfigSchema expansion', () => {
	test('filterType defaults to undefined', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.filterType).toBeUndefined();
	});

	test('accepts filterType esm', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, { filterType: 'esm' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.filterType).toBe('esm');
	});

	test('forceBackFacesOnly defaults to false', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.forceBackFacesOnly).toBeFalsy();
	});

	test('frustumEdgeFalloff defaults to 0, rejects out of range', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.frustumEdgeFalloff).toBe(0);

		const tooHigh: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			frustumEdgeFalloff: 1.5,
		});
		expect(tooHigh.ok).toBeFalsy();

		const tooLow: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			frustumEdgeFalloff: -0.1,
		});
		expect(tooLow.ok).toBeFalsy();
	});

	test('contactHardeningLightSizeUVRatio defaults to 0.1', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.contactHardeningLightSizeUVRatio).toBeCloseTo(0.1);
	});

	test('useKernelBlur defaults to false', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.useKernelBlur).toBeFalsy();
	});

	test('blurKernel defaults to 1, rejects out of range', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.blurKernel).toBe(1);

		expect(safeParse(ShadowConfigSchema, { blurKernel: 0 }).ok).toBeFalsy();
		expect(safeParse(ShadowConfigSchema, { blurKernel: 65 }).ok).toBeFalsy();
	});

	test('blurScale defaults to 2, rejects out of range', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.blurScale).toBe(2);

		expect(safeParse(ShadowConfigSchema, { blurScale: 0.1 }).ok).toBeFalsy();
		expect(safeParse(ShadowConfigSchema, { blurScale: 5 }).ok).toBeFalsy();
	});

	test('depthScale defaults to 50, rejects out of range', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.depthScale).toBe(50);

		expect(safeParse(ShadowConfigSchema, { depthScale: -1 }).ok).toBeFalsy();
		expect(safeParse(ShadowConfigSchema, { depthScale: 1001 }).ok).toBeFalsy();
	});

	test('useOpacityTextureForTransparentShadow defaults to false', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.useOpacityTextureForTransparentShadow).toBeFalsy();
	});

	test('lambda defaults to 0.5, rejects out of range', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lambda).toBeCloseTo(0.5);

		expect(safeParse(ShadowConfigSchema, { lambda: -0.1 }).ok).toBeFalsy();
		expect(safeParse(ShadowConfigSchema, { lambda: 1.1 }).ok).toBeFalsy();
	});

	test('depthClamp defaults to true', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.depthClamp).toBeTruthy();
	});

	test('penumbraDarkness defaults to 1.0', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.penumbraDarkness).toBeCloseTo(1.0);
	});

	test('shadowMaxZ defaults to 0, rejects negative', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.shadowMaxZ).toBe(0);

		expect(safeParse(ShadowConfigSchema, { shadowMaxZ: -1 }).ok).toBeFalsy();
	});

	test('freezeShadowCastersBoundingInfo defaults to false', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.freezeShadowCastersBoundingInfo).toBeFalsy();
	});

	test('backward compat: existing configs without new fields parse', () => {
		const result: Result<ShadowConfig> = safeParse(ShadowConfigSchema, {
			enabled: true,
			type: 'pcf',
			mapSize: 1024,
			filteringQuality: 'medium',
			bias: 0.000_05,
		});
		expect(result.ok).toBeTruthy();
	});
});

// =============================================================================
// DistanceFadeConfigSchema (Expansion)
// =============================================================================

describe('DistanceFadeConfigSchema', () => {
	test('applies defaults for empty object', () => {
		const result: Result<DistanceFadeConfig> = safeParse(DistanceFadeConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBeFalsy();
		expect(result.data.start).toBe(50);
		expect(result.data.end).toBe(100);
	});

	test('rejects negative start', () => {
		expect(safeParse(DistanceFadeConfigSchema, { start: -1 }).ok).toBeFalsy();
	});

	test('rejects negative end', () => {
		expect(safeParse(DistanceFadeConfigSchema, { end: -1 }).ok).toBeFalsy();
	});
});

// =============================================================================
// LightmapModeSchema (Expansion)
// =============================================================================

describe('LightmapModeSchema', () => {
	test('accepts all 3 modes', () => {
		const modes: string[] = ['default', 'specular', 'shadowsOnly'];
		for (const m of modes) {
			const result: Result<LightmapMode> = safeParse(LightmapModeSchema, m);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid mode', () => {
		expect(safeParse(LightmapModeSchema, 'diffuseOnly').ok).toBeFalsy();
	});
});

// =============================================================================
// Light Type Schema Expansion Fields
// =============================================================================

describe('PointLightConfigSchema expansion', () => {
	test('new fields default correctly', () => {
		const result: Result<PointLightConfig> = safeParse(PointLightConfigSchema, {
			id: 'test',
			type: 'point',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.radius).toBe(0);
		expect(result.data.renderPriority).toBe(0);
		expect(result.data.shadowMinZ).toBe(0);
		expect(result.data.shadowMaxZ).toBe(0);
		expect(result.data.layerMask).toBe(268_435_455);
		expect(result.data.lightmapMode).toBe('default');
		expect(result.data.distanceFade).toBeUndefined();
	});

	test('accepts all new fields', () => {
		const result: Result<PointLightConfig> = safeParse(PointLightConfigSchema, {
			id: 'test',
			type: 'point',
			radius: 0.5,
			renderPriority: 3,
			shadowMinZ: 1,
			shadowMaxZ: 100,
			layerMask: 16_777_215,
			lightmapMode: 'specular',
			distanceFade: { enabled: true, start: 10, end: 50 },
		});
		expect(result.ok).toBeTruthy();
	});
});

describe('SpotLightConfigSchema expansion', () => {
	test('innerAngle defaults to 0', () => {
		const result: Result<SpotLightConfig> = safeParse(SpotLightConfigSchema, {
			id: 'test',
			type: 'spot',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.innerAngle).toBe(0);
	});

	test('rejects innerAngle > PI', () => {
		expect(
			safeParse(SpotLightConfigSchema, {
				id: 'test',
				type: 'spot',
				innerAngle: 4,
			}).ok,
		).toBeFalsy();
	});
});

describe('DirectionalLightConfigSchema expansion', () => {
	test('new fields default correctly', () => {
		const result: Result<DirectionalLightConfig> = safeParse(DirectionalLightConfigSchema, {
			id: 'test',
			type: 'directional',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.shadowFrustumSize).toBe(0);
		expect(result.data.shadowOrthoScale).toBeCloseTo(0.1);
		expect(result.data.autoUpdateExtends).toBeTruthy();
		expect(result.data.shadowMinZ).toBe(0);
		expect(result.data.shadowMaxZ).toBe(0);
		expect(result.data.renderPriority).toBe(0);
		expect(result.data.layerMask).toBe(268_435_455);
		expect(result.data.lightmapMode).toBe('default');
	});
});

describe('HemisphericLightConfigSchema expansion', () => {
	test('new fields default correctly', () => {
		const result: Result<HemisphericLightConfig> = safeParse(HemisphericLightConfigSchema, {
			id: 'test',
			type: 'hemispheric',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.renderPriority).toBe(0);
		expect(result.data.layerMask).toBe(268_435_455);
	});
});

// =============================================================================
// FlickerTypeSchema Expansion (6 new modes)
// =============================================================================

describe('FlickerTypeSchema expansion', () => {
	test('accepts all 13 flicker types', () => {
		const types: string[] = [
			'candle',
			'torch',
			'campfire',
			'pulse',
			'strobe',
			'breathing',
			'fluorescent',
			'storm',
			'heartbeat',
			'random',
			'neon',
			'dying',
			'siren',
		];
		for (const t of types) {
			const result: Result<FlickerConfig> = safeParse(FlickerConfigSchema, { type: t });
			expect(result.ok).toBeTruthy();
		}
	});
});

// =============================================================================
// LensFlarePresetSchema (Expansion)
// =============================================================================

describe('LensFlarePresetSchema', () => {
	test('accepts all 4 presets', () => {
		const presets: string[] = ['sun', 'moonGlow', 'crystalLight', 'torchGlow'];
		for (const p of presets) {
			const result: Result<LensFlarePreset> = safeParse(LensFlarePresetSchema, p);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid preset', () => {
		expect(safeParse(LensFlarePresetSchema, 'strobe').ok).toBeFalsy();
	});
});

// =============================================================================
// LensFlareConfigSchema Expansion
// =============================================================================

describe('LensFlareConfigSchema expansion', () => {
	test('new fields default correctly', () => {
		const result: Result<LensFlareConfig> = safeParse(LensFlareConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBeUndefined();
		expect(result.data.haloWidth).toBeCloseTo(0.4);
		expect(result.data.ghostDispersal).toBeCloseTo(0.3);
		expect(result.data.threshold).toBeCloseTo(0.5);
	});

	test('accepts preset with haloWidth', () => {
		const result: Result<LensFlareConfig> = safeParse(LensFlareConfigSchema, {
			enabled: true,
			preset: 'sun',
			haloWidth: 0.8,
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects haloWidth > 2', () => {
		expect(safeParse(LensFlareConfigSchema, { haloWidth: 3 }).ok).toBeFalsy();
	});

	test('rejects threshold > 1', () => {
		expect(safeParse(LensFlareConfigSchema, { threshold: 1.5 }).ok).toBeFalsy();
	});
});

// =============================================================================
// VolumetricLightConfigSchema Expansion
// =============================================================================

describe('VolumetricLightConfigSchema expansion', () => {
	test('exposure defaults to 1.0', () => {
		const result: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.exposure).toBeCloseTo(1.0);
	});

	test('color defaults to white', () => {
		const result: Result<VolumetricLightConfig> = safeParse(VolumetricLightConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.color.r).toBeCloseTo(1);
		expect(result.data.color.g).toBeCloseTo(1);
		expect(result.data.color.b).toBeCloseTo(1);
	});

	test('rejects exposure > 2', () => {
		expect(safeParse(VolumetricLightConfigSchema, { exposure: 3 }).ok).toBeFalsy();
	});
});
