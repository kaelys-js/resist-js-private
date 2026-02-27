// @vitest-environment node

/**
 * Transition configuration schema tests.
 *
 * Tests the 28-type transition system with mask-based transitions (fade,
 * crossFade, circleIris, etc.) and procedural transitions (pixelate,
 * crtPowerOff, swirl, etc.), along with shared/type-specific parameters,
 * easing functions, and curated presets.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import {
	TransitionTypeSchema,
	TransitionEasingSchema,
	TransitionDirectionSchema,
	TransitionAxisSchema,
	TransitionConfigSchema,
	TRANSITION_PRESETS,
	type TransitionType,
	type TransitionEasing,
	type TransitionDirection,
	type TransitionAxis,
	type TransitionConfig,
} from './transition-config';

// =============================================================================
// TransitionTypeSchema
// =============================================================================

describe('TransitionTypeSchema', () => {
	const maskTypes: readonly string[] = [
		'fade',
		'crossFade',
		'circleIris',
		'diamondIris',
		'wipe',
		'diagonalWipe',
		'doubleDoor',
		'noiseDissove',
		'ditheredFade',
		'venetianBlinds',
		'bars',
		'checkerboard',
		'radialWipe',
		'scanlineReveal',
	];

	const proceduralTypes: readonly string[] = [
		'pixelate',
		'crtPowerOff',
		'swirl',
		'zoomLines',
		'shatter',
		'wavyDistortion',
		'hexagonalize',
		'pinwheel',
		'polkaDots',
		'gridFlip',
		'glitch',
		'ripple',
		'wind',
		'chromaticBurst',
	];

	test.each(maskTypes)('accepts mask-based type "%s"', (type: string) => {
		const result: Result<TransitionType> = safeParse(TransitionTypeSchema, type);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(type);
	});

	test.each(proceduralTypes)('accepts procedural type "%s"', (type: string) => {
		const result: Result<TransitionType> = safeParse(TransitionTypeSchema, type);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(type);
	});

	test('accepts all 28 types total', () => {
		const allTypes: readonly string[] = [...maskTypes, ...proceduralTypes];
		expect(allTypes.length).toBe(28);
		for (const type of allTypes) {
			const result: Result<TransitionType> = safeParse(TransitionTypeSchema, type);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid transition type', () => {
		const result: Result<TransitionType> = safeParse(TransitionTypeSchema, 'slideIn');
		expect(result.ok).toBeFalsy();
	});

	test('rejects empty string', () => {
		const result: Result<TransitionType> = safeParse(TransitionTypeSchema, '');
		expect(result.ok).toBeFalsy();
	});

	test('rejects number', () => {
		const result: Result<TransitionType> = safeParse(TransitionTypeSchema, 42);
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TransitionEasingSchema
// =============================================================================

describe('TransitionEasingSchema', () => {
	const validEasings: readonly string[] = [
		'linear',
		'easeIn',
		'easeOut',
		'easeInOut',
		'easeOutBack',
		'easeInOutCubic',
	];

	test.each(validEasings)('accepts easing "%s"', (easing: string) => {
		const result: Result<TransitionEasing> = safeParse(TransitionEasingSchema, easing);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(easing);
	});

	test('rejects invalid easing', () => {
		const result: Result<TransitionEasing> = safeParse(TransitionEasingSchema, 'bounce');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TransitionDirectionSchema
// =============================================================================

describe('TransitionDirectionSchema', () => {
	const validDirections: readonly string[] = ['left', 'right', 'up', 'down'];

	test.each(validDirections)('accepts direction "%s"', (dir: string) => {
		const result: Result<TransitionDirection> = safeParse(TransitionDirectionSchema, dir);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(dir);
	});

	test('rejects invalid direction', () => {
		const result: Result<TransitionDirection> = safeParse(TransitionDirectionSchema, 'diagonal');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TransitionAxisSchema
// =============================================================================

describe('TransitionAxisSchema', () => {
	const validAxes: readonly string[] = ['horizontal', 'vertical'];

	test.each(validAxes)('accepts axis "%s"', (axis: string) => {
		const result: Result<TransitionAxis> = safeParse(TransitionAxisSchema, axis);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(axis);
	});

	test('rejects invalid axis', () => {
		const result: Result<TransitionAxis> = safeParse(TransitionAxisSchema, 'both');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TransitionConfigSchema — Minimal config
// =============================================================================

describe('TransitionConfigSchema — minimal config', () => {
	test('accepts minimal config with just type, fills defaults', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('fade');
		expect(result.data.durationMs).toBe(1000);
		expect(result.data.easing).toBe('easeInOut');
		expect(result.data.edgeSoftness).toBe(0.02);
		expect(result.data.reverse).toBe(false);
		expect(result.data.color).toEqual({ r: 0, g: 0, b: 0 });
		expect(result.data.edgeColor).toBeUndefined();
		expect(result.data.direction).toBe('left');
		expect(result.data.axis).toBe('horizontal');
		expect(result.data.openFromCenter).toBe(true);
		expect(result.data.centerX).toBe(0.5);
		expect(result.data.centerY).toBe(0.5);
		expect(result.data.count).toBe(10);
		expect(result.data.gridSize).toBe(10);
		expect(result.data.angle).toBe(45);
		expect(result.data.clockwise).toBe(true);
		expect(result.data.bladeCount).toBe(4);
		expect(result.data.noiseScale).toBe(4);
		expect(result.data.noiseSeed).toBe(0);
		expect(result.data.matrixSize).toBe(4);
		expect(result.data.lineWidth).toBe(2);
		expect(result.data.maxBlockSize).toBe(32);
		expect(result.data.scanlines).toBe(true);
		expect(result.data.swirlStrength).toBe(5);
		expect(result.data.swirlRadius).toBe(0.5);
		expect(result.data.zoomLineWidth).toBe(0.02);
		expect(result.data.cellCount).toBe(20);
		expect(result.data.amplitude).toBe(0.05);
		expect(result.data.frequency).toBe(10);
		expect(result.data.waveCount).toBe(8);
		expect(result.data.glitchIntensity).toBe(0.5);
	});
});

// =============================================================================
// TransitionConfigSchema — Full config
// =============================================================================

describe('TransitionConfigSchema — full config', () => {
	test('accepts full config with all shared params', () => {
		const input: Record<string, unknown> = {
			type: 'wipe',
			durationMs: 2000,
			easing: 'easeOut',
			edgeSoftness: 0.1,
			reverse: true,
			color: { r: 1, g: 1, b: 1 },
			edgeColor: { r: 0.5, g: 0.5, b: 0.5 },
			direction: 'right',
			axis: 'vertical',
			openFromCenter: false,
			centerX: 0.3,
			centerY: 0.7,
			count: 20,
			gridSize: 16,
			angle: 90,
			clockwise: false,
			bladeCount: 8,
			noiseScale: 10,
			noiseSeed: 42,
			matrixSize: 8,
			lineWidth: 4,
			maxBlockSize: 64,
			scanlines: false,
			swirlStrength: 10,
			swirlRadius: 0.8,
			zoomLineWidth: 0.05,
			cellCount: 50,
			amplitude: 0.2,
			frequency: 25,
			waveCount: 15,
			glitchIntensity: 0.8,
		};
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, input);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('wipe');
		expect(result.data.durationMs).toBe(2000);
		expect(result.data.easing).toBe('easeOut');
		expect(result.data.edgeSoftness).toBe(0.1);
		expect(result.data.reverse).toBe(true);
		expect(result.data.color).toEqual({ r: 1, g: 1, b: 1 });
		expect(result.data.edgeColor).toEqual({ r: 0.5, g: 0.5, b: 0.5 });
		expect(result.data.direction).toBe('right');
		expect(result.data.axis).toBe('vertical');
		expect(result.data.openFromCenter).toBe(false);
		expect(result.data.centerX).toBe(0.3);
		expect(result.data.centerY).toBe(0.7);
		expect(result.data.count).toBe(20);
		expect(result.data.gridSize).toBe(16);
		expect(result.data.angle).toBe(90);
		expect(result.data.clockwise).toBe(false);
		expect(result.data.bladeCount).toBe(8);
		expect(result.data.noiseScale).toBe(10);
		expect(result.data.noiseSeed).toBe(42);
		expect(result.data.matrixSize).toBe(8);
		expect(result.data.lineWidth).toBe(4);
		expect(result.data.maxBlockSize).toBe(64);
		expect(result.data.scanlines).toBe(false);
		expect(result.data.swirlStrength).toBe(10);
		expect(result.data.swirlRadius).toBe(0.8);
		expect(result.data.zoomLineWidth).toBe(0.05);
		expect(result.data.cellCount).toBe(50);
		expect(result.data.amplitude).toBe(0.2);
		expect(result.data.frequency).toBe(25);
		expect(result.data.waveCount).toBe(15);
		expect(result.data.glitchIntensity).toBe(0.8);
	});
});

// =============================================================================
// TransitionConfigSchema — Validation boundaries
// =============================================================================

describe('TransitionConfigSchema — validation boundaries', () => {
	test('rejects durationMs below 100', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			durationMs: 50,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects durationMs above 10_000', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			durationMs: 15_000,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts durationMs at minimum (100)', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			durationMs: 100,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.durationMs).toBe(100);
	});

	test('accepts durationMs at maximum (10_000)', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			durationMs: 10_000,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.durationMs).toBe(10_000);
	});

	test('rejects edgeSoftness above 0.5', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			edgeSoftness: 0.6,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects edgeSoftness below 0', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			edgeSoftness: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts edgeSoftness at boundaries', () => {
		const atZero: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			edgeSoftness: 0,
		});
		expect(atZero.ok).toBeTruthy();

		const atMax: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			edgeSoftness: 0.5,
		});
		expect(atMax.ok).toBeTruthy();
	});

	test('rejects centerX outside 0-1', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'circleIris',
			centerX: 1.5,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects centerY outside 0-1', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'circleIris',
			centerY: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects count outside 2-100', () => {
		const belowMin: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'venetianBlinds',
			count: 1,
		});
		expect(belowMin.ok).toBeFalsy();

		const aboveMax: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'venetianBlinds',
			count: 101,
		});
		expect(aboveMax.ok).toBeFalsy();
	});

	test('rejects maxBlockSize outside 4-128', () => {
		const belowMin: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'pixelate',
			maxBlockSize: 2,
		});
		expect(belowMin.ok).toBeFalsy();

		const aboveMax: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'pixelate',
			maxBlockSize: 256,
		});
		expect(aboveMax.ok).toBeFalsy();
	});

	test('rejects glitchIntensity outside 0-1', () => {
		const belowMin: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'glitch',
			glitchIntensity: -0.1,
		});
		expect(belowMin.ok).toBeFalsy();

		const aboveMax: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'glitch',
			glitchIntensity: 1.5,
		});
		expect(aboveMax.ok).toBeFalsy();
	});

	test('rejects invalid matrixSize value', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'ditheredFade',
			matrixSize: 3,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts valid matrixSize values (2, 4, 8)', () => {
		for (const size of [2, 4, 8]) {
			const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
				type: 'ditheredFade',
				matrixSize: size,
			});
			expect(result.ok).toBeTruthy();
		}
	});
});

// =============================================================================
// TransitionConfigSchema — Type-specific params
// =============================================================================

describe('TransitionConfigSchema — type-specific params', () => {
	test('parses wipe with direction', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'wipe',
			direction: 'right',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('wipe');
		expect(result.data.direction).toBe('right');
	});

	test('parses circleIris with center', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'circleIris',
			centerX: 0.3,
			centerY: 0.7,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('circleIris');
		expect(result.data.centerX).toBe(0.3);
		expect(result.data.centerY).toBe(0.7);
	});

	test('parses venetianBlinds with count', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'venetianBlinds',
			count: 20,
			axis: 'vertical',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('venetianBlinds');
		expect(result.data.count).toBe(20);
		expect(result.data.axis).toBe('vertical');
	});

	test('parses pixelate with maxBlockSize', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'pixelate',
			maxBlockSize: 64,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('pixelate');
		expect(result.data.maxBlockSize).toBe(64);
	});

	test('parses noiseDissove with scale and seed', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'noiseDissove',
			noiseScale: 8,
			noiseSeed: 42,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('noiseDissove');
		expect(result.data.noiseScale).toBe(8);
		expect(result.data.noiseSeed).toBe(42);
	});

	test('parses swirl with strength and radius', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'swirl',
			swirlStrength: 10,
			swirlRadius: 0.8,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('swirl');
		expect(result.data.swirlStrength).toBe(10);
		expect(result.data.swirlRadius).toBe(0.8);
	});

	test('parses glitch with intensity', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'glitch',
			glitchIntensity: 0.8,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('glitch');
		expect(result.data.glitchIntensity).toBe(0.8);
	});

	test('parses radialWipe with clockwise and bladeCount', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'radialWipe',
			clockwise: false,
			bladeCount: 6,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('radialWipe');
		expect(result.data.clockwise).toBe(false);
		expect(result.data.bladeCount).toBe(6);
	});

	test('parses diagonalWipe with angle', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'diagonalWipe',
			angle: 135,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('diagonalWipe');
		expect(result.data.angle).toBe(135);
	});

	test('parses crtPowerOff with scanlines', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'crtPowerOff',
			scanlines: true,
			lineWidth: 4,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('crtPowerOff');
		expect(result.data.scanlines).toBe(true);
		expect(result.data.lineWidth).toBe(4);
	});

	test('parses wavyDistortion with amplitude, frequency, waveCount', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'wavyDistortion',
			amplitude: 0.1,
			frequency: 20,
			waveCount: 12,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('wavyDistortion');
		expect(result.data.amplitude).toBe(0.1);
		expect(result.data.frequency).toBe(20);
		expect(result.data.waveCount).toBe(12);
	});
});

// =============================================================================
// TransitionConfigSchema — Rejection: wrong types
// =============================================================================

describe('TransitionConfigSchema — rejection', () => {
	test('rejects missing type', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			durationMs: 1000,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects unknown properties', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			unknownProp: true,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects null input', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, null);
		expect(result.ok).toBeFalsy();
	});

	test('rejects undefined input', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, undefined);
		expect(result.ok).toBeFalsy();
	});

	test('rejects color with values outside 0-1', () => {
		const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, {
			type: 'fade',
			color: { r: 2, g: 0, b: 0 },
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TRANSITION_PRESETS
// =============================================================================

describe('TRANSITION_PRESETS', () => {
	test('has entries for common presets', () => {
		const presetNames: readonly string[] = [
			'fadeToBlack',
			'fadeToWhite',
			'circleIris',
			'pixelate',
			'wipeLeft',
			'noiseDissove',
		];
		for (const name of presetNames) {
			expect(TRANSITION_PRESETS).toHaveProperty(name);
		}
	});

	test('fadeToBlack has type fade and color black', () => {
		const preset: TransitionConfig = TRANSITION_PRESETS.fadeToBlack;
		expect(preset.type).toBe('fade');
		expect(preset.color).toEqual({ r: 0, g: 0, b: 0 });
	});

	test('fadeToWhite has type fade and color white', () => {
		const preset: TransitionConfig = TRANSITION_PRESETS.fadeToWhite;
		expect(preset.type).toBe('fade');
		expect(preset.color).toEqual({ r: 1, g: 1, b: 1 });
	});

	test('wipeLeft has type wipe and direction left', () => {
		const preset: TransitionConfig = TRANSITION_PRESETS.wipeLeft;
		expect(preset.type).toBe('wipe');
		expect(preset.direction).toBe('left');
	});

	test('wipeRight has type wipe and direction right', () => {
		const preset: TransitionConfig = TRANSITION_PRESETS.wipeRight;
		expect(preset.type).toBe('wipe');
		expect(preset.direction).toBe('right');
	});

	test('circleIris preset has correct type', () => {
		const preset: TransitionConfig = TRANSITION_PRESETS.circleIris;
		expect(preset.type).toBe('circleIris');
	});

	test('pixelate preset has correct type', () => {
		const preset: TransitionConfig = TRANSITION_PRESETS.pixelate;
		expect(preset.type).toBe('pixelate');
	});

	test('all presets validate against TransitionConfigSchema', () => {
		const presetKeys: readonly string[] = Object.keys(TRANSITION_PRESETS);
		expect(presetKeys.length).toBeGreaterThanOrEqual(32);
		for (const key of presetKeys) {
			const preset: TransitionConfig = TRANSITION_PRESETS[key as keyof typeof TRANSITION_PRESETS];
			const result: Result<TransitionConfig> = safeParse(TransitionConfigSchema, preset);
			expect(result.ok, `Preset "${key}" should validate`).toBeTruthy();
		}
	});
});
