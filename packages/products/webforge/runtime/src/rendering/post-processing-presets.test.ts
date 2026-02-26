/**
 * Tests for post-processing presets, quality scaling, and color grading curves.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { describe, expect, it } from 'vitest';

import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

import {
	PostProcessingConfigSchema,
	type PostProcessingConfig,
} from '../schemas/post-processing-config';

import {
	POST_PROCESSING_PRESETS,
	applyQualityScaling,
	buildColorCurves,
	getPostProcessingPreset,
	resolvePostProcessingConfig,
} from './post-processing-presets';

// =============================================================================
// getPostProcessingPreset
// =============================================================================

describe('getPostProcessingPreset', () => {
	it('returns valid config for "neutral"', () => {
		const result = getPostProcessingPreset('neutral');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const parsed: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, result.data);
		expect(parsed.ok).toBe(true);
	});

	it('returns valid config for "hd2d"', () => {
		const result = getPostProcessingPreset('hd2d');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const parsed: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, result.data);
		expect(parsed.ok).toBe(true);
	});

	it('returns valid config for "cinematic"', () => {
		const result = getPostProcessingPreset('cinematic');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const parsed: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, result.data);
		expect(parsed.ok).toBe(true);
	});

	it('returns valid config for "retro"', () => {
		const result = getPostProcessingPreset('retro');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const parsed: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, result.data);
		expect(parsed.ok).toBe(true);
	});

	it('returns valid config for "fantasy"', () => {
		const result = getPostProcessingPreset('fantasy');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const parsed: Result<PostProcessingConfig> = safeParse(PostProcessingConfigSchema, result.data);
		expect(parsed.ok).toBe(true);
	});

	it('neutral preset has all effects disabled', () => {
		const result = getPostProcessingPreset('neutral');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.enabled).toBe(false);
		expect(result.data.depthOfField?.enabled).toBe(false);
		expect(result.data.toneMapping?.enabled).toBe(false);
		expect(result.data.vignette?.enabled).toBe(false);
		expect(result.data.grain?.enabled).toBe(false);
		expect(result.data.ssao?.enabled).toBe(false);
		expect(result.data.fxaa?.enabled).toBe(false);
	});

	it('hd2d preset has expected bloom values', () => {
		const result = getPostProcessingPreset('hd2d');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.weight).toBe(0.15);
		expect(result.data.bloom?.threshold).toBe(0.85);
		expect(result.data.bloom?.kernel).toBe(64);
	});

	it('returns error for unknown preset', () => {
		// @ts-expect-error — testing invalid input
		const result = getPostProcessingPreset('unknown');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// POST_PROCESSING_PRESETS
// =============================================================================

describe('POST_PROCESSING_PRESETS', () => {
	it('is a frozen record with 5 presets', () => {
		expect(Object.isFrozen(POST_PROCESSING_PRESETS)).toBe(true);
		expect(Object.keys(POST_PROCESSING_PRESETS)).toHaveLength(5);
	});
});

// =============================================================================
// resolvePostProcessingConfig
// =============================================================================

describe('resolvePostProcessingConfig', () => {
	it('returns preset as-is when no overrides', () => {
		const result = resolvePostProcessingConfig({ preset: 'hd2d' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.weight).toBe(0.15);
		expect(result.data.bloom?.enabled).toBe(true);
	});

	it('merges bloom weight override onto hd2d preset', () => {
		const result = resolvePostProcessingConfig({
			preset: 'hd2d',
			bloom: { weight: 0.5 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.weight).toBe(0.5);
		expect(result.data.bloom?.threshold).toBe(0.85);
	});

	it('merges multiple sub-schema overrides', () => {
		const result = resolvePostProcessingConfig({
			preset: 'cinematic',
			bloom: { weight: 0.1 },
			ssao: { samples: 8 },
			exposure: 1.5,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.weight).toBe(0.1);
		expect(result.data.ssao?.samples).toBe(8);
		expect(result.data.exposure).toBe(1.5);
	});

	it('uses hd2d preset as default when no preset specified', () => {
		const result = resolvePostProcessingConfig({});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.preset).toBe('hd2d');
		expect(result.data.bloom?.weight).toBe(0.15);
	});

	it('preserves enabled=false override', () => {
		const result = resolvePostProcessingConfig({
			preset: 'hd2d',
			enabled: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
	});
});

// =============================================================================
// applyQualityScaling
// =============================================================================

describe('applyQualityScaling', () => {
	it('low quality disables SSAO, DoF, and grain', () => {
		const base = resolvePostProcessingConfig({ preset: 'hd2d' });
		expect(base.ok).toBe(true);
		if (!base.ok) return;

		const result = applyQualityScaling(base.data, 'low');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssao?.enabled).toBe(false);
		expect(result.data.depthOfField?.enabled).toBe(false);
		expect(result.data.grain?.enabled).toBe(false);
		expect(result.data.chromaticAberration?.enabled).toBe(false);
	});

	it('low quality reduces bloom kernel', () => {
		const base = resolvePostProcessingConfig({ preset: 'hd2d' });
		expect(base.ok).toBe(true);
		if (!base.ok) return;

		const result = applyQualityScaling(base.data, 'low');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bloom?.kernel).toBe(32);
	});

	it('medium quality reduces SSAO samples and DoF blur level', () => {
		const base = resolvePostProcessingConfig({ preset: 'hd2d' });
		expect(base.ok).toBe(true);
		if (!base.ok) return;

		const result = applyQualityScaling(base.data, 'medium');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssao?.samples).toBe(8);
		expect(result.data.depthOfField?.blurLevel).toBe('low');
		expect(result.data.bloom?.kernel).toBe(48);
		expect(result.data.chromaticAberration?.enabled).toBe(false);
	});

	it('high quality leaves config unchanged', () => {
		const base = resolvePostProcessingConfig({ preset: 'hd2d' });
		expect(base.ok).toBe(true);
		if (!base.ok) return;

		const result = applyQualityScaling(base.data, 'high');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssao?.samples).toBe(16);
		expect(result.data.bloom?.kernel).toBe(64);
	});

	it('ultra quality increases SSAO samples and bloom kernel', () => {
		const base = resolvePostProcessingConfig({ preset: 'hd2d' });
		expect(base.ok).toBe(true);
		if (!base.ok) return;

		const result = applyQualityScaling(base.data, 'ultra');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssao?.samples).toBe(32);
		expect(result.data.bloom?.kernel).toBe(128);
		expect(result.data.depthOfField?.blurLevel).toBe('high');
	});

	it('quality scaling on neutral preset is no-op', () => {
		const base = resolvePostProcessingConfig({ preset: 'neutral' });
		expect(base.ok).toBe(true);
		if (!base.ok) return;

		const result = applyQualityScaling(base.data, 'low');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Neutral has everything disabled already, so low quality should keep them disabled
		expect(result.data.ssao?.enabled).toBe(false);
		expect(result.data.bloom?.enabled).toBe(false);
	});
});

// =============================================================================
// buildColorCurves
// =============================================================================

describe('buildColorCurves', () => {
	it('returns ColorCurves for neutral preset', () => {
		const result = buildColorCurves('neutral');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ColorCurves);
	});

	it('returns ColorCurves for warm preset', () => {
		const result = buildColorCurves('warm');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ColorCurves);
		expect(result.data.globalHue).toBe(30);
		expect(result.data.globalSaturation).toBe(20);
	});

	it('returns ColorCurves for cool preset', () => {
		const result = buildColorCurves('cool');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ColorCurves);
		expect(result.data.globalHue).toBe(210);
	});

	it('returns ColorCurves for cinematic preset', () => {
		const result = buildColorCurves('cinematic');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ColorCurves);
	});

	it('returns ColorCurves for retro preset', () => {
		const result = buildColorCurves('retro');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ColorCurves);
		expect(result.data.globalSaturation).toBe(-30);
	});

	it('returns error for unknown preset', () => {
		// @ts-expect-error — testing invalid input
		const result = buildColorCurves('unknown');
		expect(result.ok).toBe(false);
	});
});
