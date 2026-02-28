// @vitest-environment node

/**
 * Fog config schema tests.
 *
 * Validates all 12 sub-schemas covering 77+ configurable fog options:
 * enhanced core, height fog, second layer, inscattering, atmospheric,
 * noise, wind, overlays, animation, presets, day/night, and per-mesh.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import {
	HeightFogSchema,
	SecondFogLayerSchema,
	InscatteringSchema,
	AtmosphericSchema,
	FogNoiseSchema,
	FogWindSchema,
	FogOverlaySchema,
	FogAnimationSchema,
	FogDayNightSchema,
	FogPerMeshSchema,
	FogPresetSchema,
	FogOverlayTextureSchema,
	FogOverlayBlendModeSchema,
	FogOverlayVignetteSchema,
	FogAnimationWaveformSchema,
	FogConfigSchema,
	type HeightFog,
	type SecondFogLayer,
	type Inscattering,
	type Atmospheric,
	type FogNoise,
	type FogWind,
	type FogOverlay,
	type FogAnimation,
	type FogDayNight,
	type FogPerMesh,
	type FogConfig,
} from './fog-config';

// =============================================================================
// HeightFogSchema
// =============================================================================

describe('HeightFogSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.baseHeight).toBe(0);
		expect(result.data.falloff).toBeCloseTo(0.5);
		expect(result.data.density).toBeCloseTo(0.1);
		expect(result.data.offset).toBe(0);
	});

	test('accepts explicit values', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, {
			enabled: true,
			baseHeight: 5,
			falloff: 2.0,
			density: 0.5,
			offset: -3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.baseHeight).toBe(5);
		expect(result.data.falloff).toBeCloseTo(2.0);
	});

	test('rejects falloff below 0.01', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, { falloff: 0 });
		expect(result.ok).toBe(false);
	});

	test('rejects falloff above 10', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, { falloff: 11 });
		expect(result.ok).toBe(false);
	});

	test('rejects density below 0', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, { density: -0.1 });
		expect(result.ok).toBe(false);
	});

	test('rejects density above 1', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, { density: 1.5 });
		expect(result.ok).toBe(false);
	});

	test('rejects unknown properties', () => {
		const result: Result<HeightFog> = safeParse(HeightFogSchema, { intensity: 0.5 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// SecondFogLayerSchema
// =============================================================================

describe('SecondFogLayerSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<SecondFogLayer> = safeParse(SecondFogLayerSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.density).toBeCloseTo(0.05);
		expect(result.data.heightFalloff).toBeCloseTo(0.2);
		expect(result.data.heightOffset).toBe(0);
		expect(result.data.color.r).toBeCloseTo(0.7);
		expect(result.data.color.g).toBeCloseTo(0.75);
		expect(result.data.color.b).toBeCloseTo(0.8);
	});

	test('accepts explicit values', () => {
		const result: Result<SecondFogLayer> = safeParse(SecondFogLayerSchema, {
			enabled: true,
			density: 0.1,
			heightFalloff: 1.0,
			heightOffset: 10,
			color: { r: 0.5, g: 0.5, b: 0.6 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.density).toBeCloseTo(0.1);
	});

	test('rejects density below 0', () => {
		const result: Result<SecondFogLayer> = safeParse(SecondFogLayerSchema, { density: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects density above 1', () => {
		const result: Result<SecondFogLayer> = safeParse(SecondFogLayerSchema, { density: 2 });
		expect(result.ok).toBe(false);
	});

	test('rejects unknown properties', () => {
		const result: Result<SecondFogLayer> = safeParse(SecondFogLayerSchema, { mode: 'exp' });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// InscatteringSchema
// =============================================================================

describe('InscatteringSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<Inscattering> = safeParse(InscatteringSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.color.r).toBeCloseTo(1);
		expect(result.data.color.g).toBeCloseTo(0.9);
		expect(result.data.color.b).toBeCloseTo(0.7);
		expect(result.data.exponent).toBeCloseTo(4.0);
		expect(result.data.startDistance).toBe(50);
		expect(result.data.intensity).toBeCloseTo(1.0);
	});

	test('rejects exponent below 1', () => {
		const result: Result<Inscattering> = safeParse(InscatteringSchema, { exponent: 0.5 });
		expect(result.ok).toBe(false);
	});

	test('rejects exponent above 32', () => {
		const result: Result<Inscattering> = safeParse(InscatteringSchema, { exponent: 33 });
		expect(result.ok).toBe(false);
	});

	test('rejects negative startDistance', () => {
		const result: Result<Inscattering> = safeParse(InscatteringSchema, { startDistance: -10 });
		expect(result.ok).toBe(false);
	});

	test('rejects intensity above 5', () => {
		const result: Result<Inscattering> = safeParse(InscatteringSchema, { intensity: 6 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// AtmosphericSchema
// =============================================================================

describe('AtmosphericSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<Atmospheric> = safeParse(AtmosphericSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.extinctionR).toBeCloseTo(0.02);
		expect(result.data.extinctionG).toBeCloseTo(0.03);
		expect(result.data.extinctionB).toBeCloseTo(0.05);
		expect(result.data.inscatteringR).toBeCloseTo(0.04);
		expect(result.data.inscatteringG).toBeCloseTo(0.04);
		expect(result.data.inscatteringB).toBeCloseTo(0.06);
	});

	test('rejects extinction above 0.5', () => {
		const result: Result<Atmospheric> = safeParse(AtmosphericSchema, { extinctionR: 0.6 });
		expect(result.ok).toBe(false);
	});

	test('rejects negative inscattering', () => {
		const result: Result<Atmospheric> = safeParse(AtmosphericSchema, { inscatteringG: -0.1 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogNoiseSchema
// =============================================================================

describe('FogNoiseSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.scale).toBeCloseTo(1.0);
		expect(result.data.amplitude).toBeCloseTo(0.5);
		expect(result.data.speed).toBeCloseTo(0.1);
		expect(result.data.octaves).toBe(3);
		expect(result.data.lacunarity).toBeCloseTo(2.0);
		expect(result.data.persistence).toBeCloseTo(0.5);
	});

	test('rejects scale below 0.001', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, { scale: 0.0005 });
		expect(result.ok).toBe(false);
	});

	test('rejects scale above 10', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, { scale: 11 });
		expect(result.ok).toBe(false);
	});

	test('rejects octaves above 6', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, { octaves: 7 });
		expect(result.ok).toBe(false);
	});

	test('rejects octaves below 1', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, { octaves: 0 });
		expect(result.ok).toBe(false);
	});

	test('rejects lacunarity below 1', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, { lacunarity: 0.5 });
		expect(result.ok).toBe(false);
	});

	test('rejects persistence above 0.9', () => {
		const result: Result<FogNoise> = safeParse(FogNoiseSchema, { persistence: 1.0 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogWindSchema
// =============================================================================

describe('FogWindSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<FogWind> = safeParse(FogWindSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.directionAngle).toBe(0);
		expect(result.data.speed).toBeCloseTo(0.5);
		expect(result.data.turbulence).toBeCloseTo(0.2);
	});

	test('accepts angle at 360', () => {
		const result: Result<FogWind> = safeParse(FogWindSchema, { directionAngle: 360 });
		expect(result.ok).toBe(true);
	});

	test('rejects negative angle', () => {
		const result: Result<FogWind> = safeParse(FogWindSchema, { directionAngle: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects angle above 360', () => {
		const result: Result<FogWind> = safeParse(FogWindSchema, { directionAngle: 361 });
		expect(result.ok).toBe(false);
	});

	test('rejects negative speed', () => {
		const result: Result<FogWind> = safeParse(FogWindSchema, { speed: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects turbulence above 1', () => {
		const result: Result<FogWind> = safeParse(FogWindSchema, { turbulence: 1.5 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogOverlaySchema
// =============================================================================

describe('FogOverlaySchema', () => {
	test('accepts all defaults', () => {
		const result: Result<FogOverlay> = safeParse(FogOverlaySchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.texture).toBe('perlin');
		expect(result.data.opacity).toBeCloseTo(0.3);
		expect(result.data.blendMode).toBe('additive');
		expect(result.data.scrollX).toBeCloseTo(0.5);
		expect(result.data.scrollY).toBe(0);
		expect(result.data.scale).toBeCloseTo(1.0);
		expect(result.data.tint.r).toBe(1);
		expect(result.data.tint.g).toBe(1);
		expect(result.data.tint.b).toBe(1);
		expect(result.data.hue).toBe(0);
		expect(result.data.hueSpeed).toBe(0);
		expect(result.data.mapLocked).toBe(false);
		expect(result.data.vignette).toBe('none');
		expect(result.data.vignetteIntensity).toBeCloseTo(0.5);
	});

	test('accepts all built-in textures', () => {
		const textures: string[] = ['perlin', 'worley', 'clouds', 'wisps', 'smoke'];
		for (const tex of textures) {
			const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { texture: tex });
			expect(result.ok, `texture "${tex}" should be valid`).toBe(true);
		}
	});

	test('accepts all blend modes', () => {
		const modes: string[] = ['normal', 'additive', 'multiply', 'screen'];
		for (const mode of modes) {
			const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { blendMode: mode });
			expect(result.ok, `blend mode "${mode}" should be valid`).toBe(true);
		}
	});

	test('accepts all vignette types', () => {
		const types: string[] = [
			'none',
			'border',
			'horizontal',
			'vertical',
			'upper',
			'lower',
			'left',
			'right',
		];
		for (const t of types) {
			const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { vignette: t });
			expect(result.ok, `vignette "${t}" should be valid`).toBe(true);
		}
	});

	test('rejects invalid blend mode', () => {
		const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { blendMode: 'overlay' });
		expect(result.ok).toBe(false);
	});

	test('rejects invalid vignette', () => {
		const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { vignette: 'circular' });
		expect(result.ok).toBe(false);
	});

	test('rejects opacity above 1', () => {
		const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { opacity: 1.5 });
		expect(result.ok).toBe(false);
	});

	test('rejects hue above 360', () => {
		const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { hue: 361 });
		expect(result.ok).toBe(false);
	});

	test('rejects scale below 0.1', () => {
		const result: Result<FogOverlay> = safeParse(FogOverlaySchema, { scale: 0.05 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogAnimationSchema
// =============================================================================

describe('FogAnimationSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<FogAnimation> = safeParse(FogAnimationSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.speed).toBeCloseTo(0.5);
		expect(result.data.amplitude).toBeCloseTo(0.3);
		expect(result.data.waveform).toBe('sine');
	});

	test('accepts all waveforms', () => {
		const waveforms: string[] = ['sine', 'triangle', 'sawtooth'];
		for (const w of waveforms) {
			const result: Result<FogAnimation> = safeParse(FogAnimationSchema, { waveform: w });
			expect(result.ok, `waveform "${w}" should be valid`).toBe(true);
		}
	});

	test('rejects invalid waveform', () => {
		const result: Result<FogAnimation> = safeParse(FogAnimationSchema, { waveform: 'square' });
		expect(result.ok).toBe(false);
	});

	test('rejects speed below 0.01', () => {
		const result: Result<FogAnimation> = safeParse(FogAnimationSchema, { speed: 0 });
		expect(result.ok).toBe(false);
	});

	test('rejects speed above 5', () => {
		const result: Result<FogAnimation> = safeParse(FogAnimationSchema, { speed: 6 });
		expect(result.ok).toBe(false);
	});

	test('rejects amplitude above 0.5', () => {
		const result: Result<FogAnimation> = safeParse(FogAnimationSchema, { amplitude: 0.6 });
		expect(result.ok).toBe(false);
	});

	test('rejects negative amplitude', () => {
		const result: Result<FogAnimation> = safeParse(FogAnimationSchema, { amplitude: -0.1 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogDayNightSchema
// =============================================================================

describe('FogDayNightSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<FogDayNight> = safeParse(FogDayNightSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.dayColor.r).toBeCloseTo(0.8);
		expect(result.data.nightColor.r).toBeCloseTo(0.1);
		expect(result.data.dawnColor.r).toBeCloseTo(0.9);
		expect(result.data.dayDensity).toBeCloseTo(0.005);
		expect(result.data.nightDensity).toBeCloseTo(0.02);
	});

	test('rejects dayDensity above 0.1', () => {
		const result: Result<FogDayNight> = safeParse(FogDayNightSchema, { dayDensity: 0.2 });
		expect(result.ok).toBe(false);
	});

	test('rejects negative nightDensity', () => {
		const result: Result<FogDayNight> = safeParse(FogDayNightSchema, { nightDensity: -0.01 });
		expect(result.ok).toBe(false);
	});

	test('rejects invalid color in dayColor', () => {
		const result: Result<FogDayNight> = safeParse(FogDayNightSchema, {
			dayColor: { r: 2, g: 0, b: 0 },
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogPerMeshSchema
// =============================================================================

describe('FogPerMeshSchema', () => {
	test('accepts all defaults', () => {
		const result: Result<FogPerMesh> = safeParse(FogPerMeshSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.excludeGround).toBe(false);
		expect(result.data.excludeSprites).toBe(false);
	});

	test('accepts explicit values', () => {
		const result: Result<FogPerMesh> = safeParse(FogPerMeshSchema, {
			excludeGround: true,
			excludeSprites: true,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.excludeGround).toBe(true);
		expect(result.data.excludeSprites).toBe(true);
	});

	test('rejects unknown properties', () => {
		const result: Result<FogPerMesh> = safeParse(FogPerMeshSchema, { excludeUI: true });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FogPresetSchema
// =============================================================================

describe('FogPresetSchema', () => {
	const VALID_PRESETS: readonly string[] = [
		'clear',
		'lightMist',
		'morningFog',
		'denseFog',
		'dungeon',
		'underwater',
		'forest',
		'mountain',
		'sandstorm',
		'snowstorm',
		'dream',
		'volcanic',
		'swamp',
		'nightMist',
	];

	test('accepts all 14 preset names', () => {
		for (const p of VALID_PRESETS) {
			const result = safeParse(FogPresetSchema, p);
			expect(result.ok, `preset "${p}" should be valid`).toBe(true);
		}
	});

	test('has exactly 14 presets', () => {
		expect(VALID_PRESETS.length).toBe(14);
	});

	test('rejects invalid preset name', () => {
		const result = safeParse(FogPresetSchema, 'heavy_rain');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// Enum Schemas
// =============================================================================

describe('FogOverlayTextureSchema', () => {
	test('accepts all built-in textures', () => {
		const textures: string[] = ['perlin', 'worley', 'clouds', 'wisps', 'smoke'];
		for (const t of textures) {
			const result = safeParse(FogOverlayTextureSchema, t);
			expect(result.ok, `texture "${t}" should be valid`).toBe(true);
		}
	});

	test('rejects invalid texture', () => {
		const result = safeParse(FogOverlayTextureSchema, 'fractal');
		expect(result.ok).toBe(false);
	});
});

describe('FogOverlayBlendModeSchema', () => {
	test('accepts all blend modes', () => {
		const modes: string[] = ['normal', 'additive', 'multiply', 'screen'];
		for (const m of modes) {
			const result = safeParse(FogOverlayBlendModeSchema, m);
			expect(result.ok, `blend mode "${m}" should be valid`).toBe(true);
		}
	});
});

describe('FogOverlayVignetteSchema', () => {
	test('accepts all vignette types', () => {
		const types: string[] = [
			'none',
			'radial',
			'border',
			'horizontal',
			'vertical',
			'upper',
			'lower',
			'left',
			'right',
		];
		for (const t of types) {
			const result = safeParse(FogOverlayVignetteSchema, t);
			expect(result.ok, `vignette "${t}" should be valid`).toBe(true);
		}
	});
});

describe('FogAnimationWaveformSchema', () => {
	test('accepts all waveforms', () => {
		const waveforms: string[] = ['sine', 'triangle', 'sawtooth'];
		for (const w of waveforms) {
			const result = safeParse(FogAnimationWaveformSchema, w);
			expect(result.ok, `waveform "${w}" should be valid`).toBe(true);
		}
	});
});

// =============================================================================
// FogConfigSchema (expanded)
// =============================================================================

describe('FogConfigSchema', () => {
	test('accepts empty config (all defaults)', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Original 5 fields
		expect(result.data.mode).toBe('none');
		expect(result.data.density).toBeCloseTo(0.01);
		expect(result.data.start).toBe(50);
		expect(result.data.end).toBe(300);
		expect(result.data.color.r).toBeCloseTo(0.8);
		// Group 1 enhanced core
		expect(result.data.maxOpacity).toBe(1);
		expect(result.data.startDistance).toBe(0);
		expect(result.data.cutoffDistance).toBe(0);
		expect(result.data.excludeSkybox).toBe(true);
		expect(result.data.skyAffect).toBe(0);
	});

	test('accepts all fog modes', () => {
		const modes: string[] = ['none', 'linear', 'exponential', 'exponential2'];
		for (const mode of modes) {
			const result: Result<FogConfig> = safeParse(FogConfigSchema, { mode });
			expect(result.ok, `mode "${mode}" should be valid`).toBe(true);
		}
	});

	test('accepts Group 1 enhanced core params', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			maxOpacity: 0.8,
			startDistance: 10,
			cutoffDistance: 500,
			excludeSkybox: false,
			skyAffect: 0.5,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.maxOpacity).toBeCloseTo(0.8);
		expect(result.data.startDistance).toBe(10);
		expect(result.data.cutoffDistance).toBe(500);
		expect(result.data.excludeSkybox).toBe(false);
		expect(result.data.skyAffect).toBeCloseTo(0.5);
	});

	test('rejects maxOpacity above 1', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, { maxOpacity: 1.5 });
		expect(result.ok).toBe(false);
	});

	test('rejects negative startDistance', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, { startDistance: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects skyAffect above 1', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, { skyAffect: 1.5 });
		expect(result.ok).toBe(false);
	});

	test('accepts all sub-schemas as optional objects', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			mode: 'exponential',
			heightFog: { enabled: true, baseHeight: 0, falloff: 0.5, density: 0.1, offset: 0 },
			secondLayer: { enabled: true },
			inscattering: { enabled: true },
			atmospheric: { enabled: false },
			noise: { enabled: true, octaves: 4 },
			wind: { enabled: true, directionAngle: 45 },
			overlays: [{ enabled: true, texture: 'clouds' }],
			animation: { enabled: true, waveform: 'triangle' },
			dayNight: { enabled: false },
			perMesh: { excludeGround: true },
		});
		expect(result.ok).toBe(true);
	});

	test('accepts preset field', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			preset: 'dungeon',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.preset).toBe('dungeon');
	});

	test('rejects invalid preset', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			preset: 'blizzard',
		});
		expect(result.ok).toBe(false);
	});

	test('accepts overlays as array with up to 4 layers', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			overlays: [
				{ enabled: true, texture: 'perlin' },
				{ enabled: true, texture: 'worley' },
				{ enabled: false, texture: 'clouds' },
				{ enabled: false, texture: 'wisps' },
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.overlays).toHaveLength(4);
	});

	test('overlays defaults to empty array when omitted', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.overlays).toEqual([]);
	});

	test('rejects unknown top-level properties', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			volumetric: true,
		});
		expect(result.ok).toBe(false);
	});

	test('backward compatible with existing 5-field fog config', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			mode: 'linear',
			color: { r: 0.5, g: 0.5, b: 0.6 },
			density: 0.05,
			start: 10,
			end: 200,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.mode).toBe('linear');
		expect(result.data.start).toBe(10);
		expect(result.data.end).toBe(200);
	});
});
