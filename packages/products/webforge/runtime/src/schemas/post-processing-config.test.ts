/**
 * Tests for post-processing-config — Valibot schemas for all post-processing settings.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import {
	BloomConfigSchema,
	ChromaticAberrationConfigSchema,
	ColorGradingConfigSchema,
	DepthOfFieldConfigSchema,
	DitheringConfigSchema,
	FxaaConfigSchema,
	GrainConfigSchema,
	HdrEnvironmentConfigSchema,
	PostProcessingConfigSchema,
	SharpenConfigSchema,
	SsaoConfigSchema,
	ToneMappingConfigSchema,
	VignetteConfigSchema,
	type BloomConfig,
	type ChromaticAberrationConfig,
	type ColorGradingConfig,
	type DepthOfFieldConfig,
	type DitheringConfig,
	type FxaaConfig,
	type GrainConfig,
	type HdrEnvironmentConfig,
	type PostProcessingConfig,
	type SharpenConfig,
	type SsaoConfig,
	type ToneMappingConfig,
	type VignetteConfig,
} from './post-processing-config';

// =============================================================================
// BloomConfigSchema
// =============================================================================

describe('BloomConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<BloomConfig> = safeParse(BloomConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.weight).toBe(0.15);
		expect(result.data.threshold).toBe(0.9);
		expect(result.data.kernel).toBe(64);
		expect(result.data.scale).toBe(0.5);
	});

	it('accepts valid overrides', () => {
		const result: Result<BloomConfig> = safeParse(BloomConfigSchema, {
			enabled: false,
			weight: 0.5,
			threshold: 0.7,
			kernel: 128,
			scale: 0.8,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.weight).toBe(0.5);
	});

	it('rejects weight out of range', () => {
		const result: Result<BloomConfig> = safeParse(BloomConfigSchema, { weight: 1.5 });
		expect(result.ok).toBe(false);
	});

	it('rejects kernel below minimum', () => {
		const result: Result<BloomConfig> = safeParse(BloomConfigSchema, { kernel: 0 });
		expect(result.ok).toBe(false);
	});

	it('rejects scale below minimum', () => {
		const result: Result<BloomConfig> = safeParse(BloomConfigSchema, { scale: 0.05 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// DepthOfFieldConfigSchema
// =============================================================================

describe('DepthOfFieldConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<DepthOfFieldConfig> = safeParse(DepthOfFieldConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.focalLength).toBe(50);
		expect(result.data.fStop).toBe(2.8);
		expect(result.data.focusDistance).toBe(2000);
		expect(result.data.blurLevel).toBe('medium');
	});

	it('accepts valid blur level values', () => {
		for (const level of ['low', 'medium', 'high'] as const) {
			const result: Result<DepthOfFieldConfig> = safeParse(DepthOfFieldConfigSchema, {
				blurLevel: level,
			});
			expect(result.ok).toBe(true);
		}
	});

	it('rejects invalid blur level', () => {
		const result: Result<DepthOfFieldConfig> = safeParse(DepthOfFieldConfigSchema, {
			blurLevel: 'ultra',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects negative fStop', () => {
		const result: Result<DepthOfFieldConfig> = safeParse(DepthOfFieldConfigSchema, {
			fStop: 0,
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// ToneMappingConfigSchema
// =============================================================================

describe('ToneMappingConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<ToneMappingConfig> = safeParse(ToneMappingConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.type).toBe('aces');
	});

	it('accepts all valid tone mapping types', () => {
		for (const type of ['standard', 'aces', 'khr_pbr_neutral'] as const) {
			const result: Result<ToneMappingConfig> = safeParse(ToneMappingConfigSchema, { type });
			expect(result.ok).toBe(true);
		}
	});

	it('rejects invalid type', () => {
		const result: Result<ToneMappingConfig> = safeParse(ToneMappingConfigSchema, {
			type: 'reinhard',
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// ColorGradingConfigSchema
// =============================================================================

describe('ColorGradingConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<ColorGradingConfig> = safeParse(ColorGradingConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.preset).toBe('neutral');
	});

	it('accepts all valid presets', () => {
		for (const preset of ['neutral', 'warm', 'cool', 'cinematic', 'retro'] as const) {
			const result: Result<ColorGradingConfig> = safeParse(ColorGradingConfigSchema, { preset });
			expect(result.ok).toBe(true);
		}
	});

	it('rejects invalid preset', () => {
		const result: Result<ColorGradingConfig> = safeParse(ColorGradingConfigSchema, {
			preset: 'sepia',
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// VignetteConfigSchema
// =============================================================================

describe('VignetteConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<VignetteConfig> = safeParse(VignetteConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.weight).toBe(1.5);
		expect(result.data.stretch).toBe(0);
		expect(result.data.color.r).toBe(0);
		expect(result.data.color.g).toBe(0);
		expect(result.data.color.b).toBe(0);
		expect(result.data.color.a).toBe(1);
		expect(result.data.blendMode).toBe('multiply');
	});

	it('rejects weight out of range', () => {
		const result: Result<VignetteConfig> = safeParse(VignetteConfigSchema, { weight: 15 });
		expect(result.ok).toBe(false);
	});

	it('rejects invalid blend mode', () => {
		const result: Result<VignetteConfig> = safeParse(VignetteConfigSchema, {
			blendMode: 'additive',
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// GrainConfigSchema
// =============================================================================

describe('GrainConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<GrainConfig> = safeParse(GrainConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.intensity).toBe(5);
		expect(result.data.animated).toBe(true);
	});

	it('rejects intensity out of range', () => {
		const result: Result<GrainConfig> = safeParse(GrainConfigSchema, { intensity: 150 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// SsaoConfigSchema
// =============================================================================

describe('SsaoConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<SsaoConfig> = safeParse(SsaoConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.totalStrength).toBe(1.0);
		expect(result.data.radius).toBe(2.0);
		expect(result.data.samples).toBe(16);
		expect(result.data.base).toBe(0.1);
		expect(result.data.expensiveBlur).toBe(true);
	});

	it('rejects samples out of range', () => {
		const result: Result<SsaoConfig> = safeParse(SsaoConfigSchema, { samples: 100 });
		expect(result.ok).toBe(false);
	});

	it('rejects non-integer samples', () => {
		const result: Result<SsaoConfig> = safeParse(SsaoConfigSchema, { samples: 8.5 });
		expect(result.ok).toBe(false);
	});

	it('rejects totalStrength out of range', () => {
		const result: Result<SsaoConfig> = safeParse(SsaoConfigSchema, { totalStrength: 5 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// ChromaticAberrationConfigSchema
// =============================================================================

describe('ChromaticAberrationConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<ChromaticAberrationConfig> = safeParse(
			ChromaticAberrationConfigSchema,
			{},
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.amount).toBe(30);
		expect(result.data.radialIntensity).toBe(0.3);
	});

	it('rejects amount out of range', () => {
		const result: Result<ChromaticAberrationConfig> = safeParse(ChromaticAberrationConfigSchema, {
			amount: 300,
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// SharpenConfigSchema
// =============================================================================

describe('SharpenConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<SharpenConfig> = safeParse(SharpenConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.edgeAmount).toBe(0.3);
		expect(result.data.colorAmount).toBe(1.0);
	});

	it('rejects edgeAmount out of range', () => {
		const result: Result<SharpenConfig> = safeParse(SharpenConfigSchema, { edgeAmount: 5 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// FxaaConfigSchema
// =============================================================================

describe('FxaaConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<FxaaConfig> = safeParse(FxaaConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
	});
});

// =============================================================================
// DitheringConfigSchema
// =============================================================================

describe('DitheringConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<DitheringConfig> = safeParse(DitheringConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.intensity).toBe(0.004);
	});

	it('rejects intensity out of range', () => {
		const result: Result<DitheringConfig> = safeParse(DitheringConfigSchema, { intensity: 2 });
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// HdrEnvironmentConfigSchema
// =============================================================================

describe('HdrEnvironmentConfigSchema', () => {
	it('accepts empty object with defaults', () => {
		const result: Result<HdrEnvironmentConfig> = safeParse(HdrEnvironmentConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.texturePath).toBe('');
		expect(result.data.intensity).toBe(1.0);
		expect(result.data.rotationY).toBe(0);
	});

	it('rejects intensity out of range', () => {
		const result: Result<HdrEnvironmentConfig> = safeParse(HdrEnvironmentConfigSchema, {
			intensity: 10,
		});
		expect(result.ok).toBe(false);
	});

	it('rejects rotationY out of range', () => {
		const result: Result<HdrEnvironmentConfig> = safeParse(HdrEnvironmentConfigSchema, {
			rotationY: 7,
		});
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// PostProcessingConfigSchema (top-level)
// =============================================================================

describe('PostProcessingConfigSchema', () => {
	it('accepts empty object with all defaults', () => {
		const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.preset).toBe('hd2d');
		expect(result.data.exposure).toBe(1.0);
		expect(result.data.contrast).toBe(1.0);
	});

	it('accepts full valid config', () => {
		const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {
			enabled: true,
			preset: 'cinematic',
			bloom: { enabled: true, weight: 0.3 },
			depthOfField: { enabled: true, blurLevel: 'high' },
			toneMapping: { type: 'aces' },
			colorGrading: { enabled: true, preset: 'warm' },
			vignette: { weight: 2.0 },
			grain: { intensity: 10 },
			ssao: { samples: 32 },
			chromaticAberration: { enabled: true, amount: 20 },
			sharpen: { enabled: true },
			fxaa: { enabled: false },
			dithering: { enabled: true },
			hdrEnvironment: { enabled: true, texturePath: 'env.hdr' },
			exposure: 0.9,
			contrast: 1.2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.preset).toBe('cinematic');
		expect(result.data.bloom?.weight).toBe(0.3);
		expect(result.data.exposure).toBe(0.9);
	});

	it('accepts all valid preset names', () => {
		for (const preset of ['neutral', 'hd2d', 'cinematic', 'retro', 'fantasy'] as const) {
			const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {
				preset,
			});
			expect(result.ok).toBe(true);
		}
	});

	it('rejects invalid preset name', () => {
		const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {
			preset: 'neon',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects unknown top-level keys', () => {
		const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {
			unknown: true,
		});
		expect(result.ok).toBe(false);
	});

	it('allows partial sub-schema overrides', () => {
		const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {
			bloom: { weight: 0.5 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.weight).toBe(0.5);
		expect(result.data.bloom?.enabled).toBe(true);
		expect(result.data.bloom?.threshold).toBe(0.9);
	});

	it('allows omitting all optional sub-schemas', () => {
		const result: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, {
			enabled: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom).toBeUndefined();
		expect(result.data.ssao).toBeUndefined();
	});
});
