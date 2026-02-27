/**
 * Sky configuration schema tests.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import {
	SkyConfigSchema,
	SkyTypeSchema,
	SkyGradientStopSchema,
	ParallaxLayerSchema,
	BlendModeSchema,
	StarsConfigSchema,
} from './sky-config';

// =============================================================================
// SkyTypeSchema
// =============================================================================

describe('SkyTypeSchema', () => {
	test.each([
		'color',
		'gradient',
		'skybox',
		'procedural',
		'panorama',
		'hdri',
	] as const)('accepts valid type: %s', (skyType) => {
		const result = safeParse(SkyTypeSchema, skyType);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(skyType);
	});

	test('rejects invalid type', () => {
		const result = safeParse(SkyTypeSchema, 'volumetric');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// SkyGradientStopSchema
// =============================================================================

describe('SkyGradientStopSchema', () => {
	test('accepts valid gradient stop', () => {
		const result = safeParse(SkyGradientStopSchema, {
			position: 0.5,
			color: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.position).toBe(0.5);
		expect(result.data.color.r).toBe(0.2);
	});

	test('position 0 (top) is valid', () => {
		const result = safeParse(SkyGradientStopSchema, {
			position: 0,
			color: { r: 0, g: 0, b: 0 },
		});
		expect(result.ok).toBe(true);
	});

	test('position 1 (bottom) is valid', () => {
		const result = safeParse(SkyGradientStopSchema, {
			position: 1,
			color: { r: 1, g: 1, b: 1 },
		});
		expect(result.ok).toBe(true);
	});

	test('rejects position below 0', () => {
		const result = safeParse(SkyGradientStopSchema, {
			position: -0.1,
			color: { r: 0, g: 0, b: 0 },
		});
		expect(result.ok).toBe(false);
	});

	test('rejects position above 1', () => {
		const result = safeParse(SkyGradientStopSchema, {
			position: 1.1,
			color: { r: 0, g: 0, b: 0 },
		});
		expect(result.ok).toBe(false);
	});

	test('color alpha defaults to 1', () => {
		const result = safeParse(SkyGradientStopSchema, {
			position: 0.5,
			color: { r: 0.5, g: 0.5, b: 0.5 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.color.a).toBe(1);
	});
});

// =============================================================================
// ParallaxLayerSchema
// =============================================================================

describe('ParallaxLayerSchema', () => {
	test('accepts minimal parallax layer', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'backgrounds/mountains.png',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.imagePath).toBe('backgrounds/mountains.png');
	});

	test('applies correct defaults', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'bg.png',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.scrollSpeedX).toBe(0.5);
		expect(result.data.scrollSpeedY).toBe(0);
		expect(result.data.offsetY).toBe(0);
		expect(result.data.opacity).toBe(1);
		expect(result.data.tileX).toBe(true);
		expect(result.data.tileY).toBe(false);
		expect(result.data.scale).toBe(1);
	});

	test('accepts full explicit config', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'backgrounds/clouds.png',
			scrollSpeedX: 0.3,
			scrollSpeedY: 0.1,
			offsetY: 5,
			opacity: 0.8,
			tileX: true,
			tileY: true,
			scale: 2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.scrollSpeedX).toBe(0.3);
		expect(result.data.scrollSpeedY).toBe(0.1);
		expect(result.data.offsetY).toBe(5);
		expect(result.data.opacity).toBe(0.8);
		expect(result.data.tileX).toBe(true);
		expect(result.data.tileY).toBe(true);
		expect(result.data.scale).toBe(2);
	});

	test('rejects empty imagePath', () => {
		const result = safeParse(ParallaxLayerSchema, { imagePath: '' });
		expect(result.ok).toBe(false);
	});

	test('rejects opacity below 0', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'bg.png',
			opacity: -0.1,
		});
		expect(result.ok).toBe(false);
	});

	test('rejects opacity above 1', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'bg.png',
			opacity: 1.1,
		});
		expect(result.ok).toBe(false);
	});

	test('rejects scale below 0.1', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'bg.png',
			scale: 0.05,
		});
		expect(result.ok).toBe(false);
	});

	test('rejects scale above 10', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'bg.png',
			scale: 11,
		});
		expect(result.ok).toBe(false);
	});

	test('allows negative scroll speeds (reverse scrolling)', () => {
		const result = safeParse(ParallaxLayerSchema, {
			imagePath: 'bg.png',
			scrollSpeedX: -0.5,
			scrollSpeedY: -0.2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.scrollSpeedX).toBe(-0.5);
	});
});

// =============================================================================
// SkyConfigSchema
// =============================================================================

describe('SkyConfigSchema', () => {
	test('empty object uses all defaults', () => {
		const result = safeParse(SkyConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('color');
		expect(result.data.color).toEqual({ r: 0.35, g: 0.5, b: 0.8, a: 1 });
		expect(result.data.parallaxLayers).toEqual([]);
	});

	test('color type with custom color', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'color',
			color: { r: 0, g: 0, b: 0 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('color');
		expect(result.data.color.r).toBe(0);
		expect(result.data.color.a).toBe(1);
	});

	test('gradient type with stops', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'gradient',
			gradient: [
				{ position: 0, color: { r: 0.1, g: 0.1, b: 0.3 } },
				{ position: 0.5, color: { r: 0.3, g: 0.5, b: 0.8 } },
				{ position: 1, color: { r: 0.8, g: 0.7, b: 0.6 } },
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('gradient');
		expect(result.data.gradient).toHaveLength(3);
		expect(result.data.gradient![0]!.position).toBe(0);
	});

	test('skybox type with path and size', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'skybox',
			skyboxPath: 'skyboxes/sunset',
			skyboxSize: 2000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('skybox');
		expect(result.data.skyboxPath).toBe('skyboxes/sunset');
		expect(result.data.skyboxSize).toBe(2000);
	});

	test('skybox size defaults to 1000', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'skybox',
			skyboxPath: 'skyboxes/day',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.skyboxSize).toBe(1000);
	});

	test('rejects skybox size below 10', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'skybox',
			skyboxPath: 'skyboxes/day',
			skyboxSize: 5,
		});
		expect(result.ok).toBe(false);
	});

	test('procedural type with atmosphere parameters', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'procedural',
			turbidity: 5,
			rayleigh: 1.5,
			luminance: 0.8,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('procedural');
		expect(result.data.turbidity).toBe(5);
		expect(result.data.rayleigh).toBe(1.5);
		expect(result.data.luminance).toBe(0.8);
	});

	test('procedural defaults', () => {
		const result = safeParse(SkyConfigSchema, { type: 'procedural' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.turbidity).toBe(10);
		expect(result.data.rayleigh).toBe(2);
		expect(result.data.luminance).toBe(1);
	});

	test('rejects turbidity above 20', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'procedural',
			turbidity: 25,
		});
		expect(result.ok).toBe(false);
	});

	test('rejects rayleigh above 10', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'procedural',
			rayleigh: 15,
		});
		expect(result.ok).toBe(false);
	});

	test('rejects luminance above 2', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'procedural',
			luminance: 3,
		});
		expect(result.ok).toBe(false);
	});

	test('with parallax layers', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'color',
			parallaxLayers: [
				{ imagePath: 'bg/mountains.png', scrollSpeedX: 0.2 },
				{ imagePath: 'bg/clouds.png', scrollSpeedX: 0.5, opacity: 0.7 },
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.parallaxLayers).toHaveLength(2);
		expect(result.data.parallaxLayers[0]!.imagePath).toBe('bg/mountains.png');
		expect(result.data.parallaxLayers[1]!.opacity).toBe(0.7);
	});

	test('rejects unknown fields (strictObject)', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'color',
			unknown: true,
		});
		expect(result.ok).toBe(false);
	});

	test('accepts panorama sky type', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'panorama',
			panoramaPath: 'sky/sunset_equirect.jpg',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('panorama');
		expect(result.data.panoramaPath).toBe('sky/sunset_equirect.jpg');
	});

	test('accepts hdri sky type', () => {
		const result = safeParse(SkyConfigSchema, {
			type: 'hdri',
			hdriPath: 'sky/environment.hdr',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('hdri');
		expect(result.data.hdriPath).toBe('sky/environment.hdr');
	});

	test('full explicit config roundtrip', () => {
		const input = {
			type: 'gradient' as const,
			color: { r: 0.1, g: 0.2, b: 0.3, a: 0.9 },
			gradient: [
				{ position: 0, color: { r: 0, g: 0, b: 0.5, a: 1 } },
				{ position: 1, color: { r: 0.8, g: 0.6, b: 0.2, a: 1 } },
			],
			skyboxPath: 'skyboxes/night',
			skyboxSize: 500,
			turbidity: 8,
			rayleigh: 3,
			luminance: 1.5,
			parallaxLayers: [
				{
					imagePath: 'bg/stars.png',
					scrollSpeedX: 0.1,
					scrollSpeedY: 0.05,
					offsetY: 10,
					opacity: 0.9,
					tileX: true,
					tileY: true,
					scale: 3,
				},
			],
		};
		const result = safeParse(SkyConfigSchema, input);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('gradient');
		expect(result.data.skyboxPath).toBe('skyboxes/night');
		expect(result.data.parallaxLayers).toHaveLength(1);
		expect(result.data.parallaxLayers[0]!.scale).toBe(3);
	});
});

// =============================================================================
// BlendModeSchema
// =============================================================================

describe('BlendModeSchema', () => {
	test.each([
		'alpha',
		'additive',
		'multiply',
		'subtract',
		'screen',
		'maximized',
		'oneone',
		'premultiplied',
	] as const)('accepts valid blend mode: %s', (mode) => {
		const result = safeParse(BlendModeSchema, mode);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(mode);
	});

	test('rejects invalid blend mode', () => {
		const result = safeParse(BlendModeSchema, 'overlay');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// StarsConfigSchema
// =============================================================================

describe('StarsConfigSchema', () => {
	test('accepts empty config with defaults', () => {
		const result = safeParse(StarsConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.texture).toBe('sky/stars.png');
		expect(result.data.opacity).toBe(0.8);
		expect(result.data.twinkleSpeed).toBe(1);
		expect(result.data.fadeInTime).toBe(18);
		expect(result.data.fadeOutTime).toBe(6);
		expect(result.data.scale).toBe(2);
	});

	test('accepts fully explicit config', () => {
		const result = safeParse(StarsConfigSchema, {
			enabled: true,
			texture: 'sky/custom-stars.png',
			opacity: 0.5,
			twinkleSpeed: 3,
			fadeInTime: 20,
			fadeOutTime: 4,
			scale: 5,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
		expect(result.data.texture).toBe('sky/custom-stars.png');
		expect(result.data.opacity).toBe(0.5);
		expect(result.data.twinkleSpeed).toBe(3);
		expect(result.data.fadeInTime).toBe(20);
		expect(result.data.fadeOutTime).toBe(4);
		expect(result.data.scale).toBe(5);
	});

	test('rejects opacity below 0', () => {
		const result = safeParse(StarsConfigSchema, { opacity: -0.1 });
		expect(result.ok).toBe(false);
	});

	test('rejects opacity above 1', () => {
		const result = safeParse(StarsConfigSchema, { opacity: 1.1 });
		expect(result.ok).toBe(false);
	});

	test('rejects twinkleSpeed below 0', () => {
		const result = safeParse(StarsConfigSchema, { twinkleSpeed: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects twinkleSpeed above 5', () => {
		const result = safeParse(StarsConfigSchema, { twinkleSpeed: 6 });
		expect(result.ok).toBe(false);
	});

	test('rejects fadeInTime below 0', () => {
		const result = safeParse(StarsConfigSchema, { fadeInTime: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects fadeInTime above 24', () => {
		const result = safeParse(StarsConfigSchema, { fadeInTime: 25 });
		expect(result.ok).toBe(false);
	});

	test('rejects fadeOutTime below 0', () => {
		const result = safeParse(StarsConfigSchema, { fadeOutTime: -1 });
		expect(result.ok).toBe(false);
	});

	test('rejects fadeOutTime above 24', () => {
		const result = safeParse(StarsConfigSchema, { fadeOutTime: 25 });
		expect(result.ok).toBe(false);
	});

	test('rejects scale below 0.1', () => {
		const result = safeParse(StarsConfigSchema, { scale: 0.05 });
		expect(result.ok).toBe(false);
	});

	test('rejects scale above 10', () => {
		const result = safeParse(StarsConfigSchema, { scale: 11 });
		expect(result.ok).toBe(false);
	});

	test('rejects empty texture path', () => {
		const result = safeParse(StarsConfigSchema, { texture: '' });
		expect(result.ok).toBe(false);
	});
});
