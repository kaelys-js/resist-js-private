/**
 * Scene setup configuration schema tests.
 *
 * Tests the ColorRgba, FogConfig, and SceneSetupConfig schemas
 * for clear color, ambient light, fog, and default hemispheric light settings.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { ColorRgbaSchema, Vector3Schema, type ColorRgba, type Vector3 } from './color-schema';
import { FogConfigSchema, type FogConfig } from './fog-config';
import { SceneSetupConfigSchema, type SceneSetupConfig } from './scene-setup-config';

// =============================================================================
// ColorRgbaSchema
// =============================================================================

describe('ColorRgbaSchema', () => {
	test('accepts full RGBA color', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0.5,
			g: 0.3,
			b: 0.8,
			a: 0.9,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.r).toBeCloseTo(0.5);
		expect(result.data.g).toBeCloseTo(0.3);
		expect(result.data.b).toBeCloseTo(0.8);
		expect(result.data.a).toBeCloseTo(0.9);
	});

	test('alpha defaults to 1 when omitted', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0.1,
			g: 0.2,
			b: 0.3,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.a).toBe(1);
	});

	test('accepts boundary values (0 and 1)', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0,
			g: 0,
			b: 0,
			a: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.r).toBe(0);
		expect(result.data.a).toBe(0);

		const result2: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 1,
			g: 1,
			b: 1,
			a: 1,
		});
		expect(result2.ok).toBeTruthy();
	});

	test('rejects r below 0', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: -0.1,
			g: 0,
			b: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects g above 1', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0,
			g: 1.1,
			b: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects b as string', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0,
			g: 0,
			b: '0.5',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects a above 1', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0,
			g: 0,
			b: 0,
			a: 1.5,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing r', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			g: 0,
			b: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects unknown properties', () => {
		const result: Result<ColorRgba> = safeParse(ColorRgbaSchema, {
			r: 0,
			g: 0,
			b: 0,
			hex: '#000',
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// Vector3Schema
// =============================================================================

describe('Vector3Schema', () => {
	test('applies all defaults for empty object', () => {
		const result: Result<Vector3> = safeParse(Vector3Schema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.x).toBe(0);
		expect(result.data.y).toBe(0);
		expect(result.data.z).toBe(0);
	});

	test('accepts explicit x, y, z values', () => {
		const result: Result<Vector3> = safeParse(Vector3Schema, { x: 1, y: 2, z: 3 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.x).toBe(1);
		expect(result.data.y).toBe(2);
		expect(result.data.z).toBe(3);
	});

	test('accepts negative values (no constraints)', () => {
		const result: Result<Vector3> = safeParse(Vector3Schema, {
			x: -100,
			y: -0.5,
			z: -999,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.x).toBe(-100);
		expect(result.data.y).toBeCloseTo(-0.5);
		expect(result.data.z).toBe(-999);
	});

	test('rejects extra keys (strictObject)', () => {
		const result: Result<Vector3> = safeParse(Vector3Schema, {
			x: 1,
			y: 2,
			z: 3,
			w: 4,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects wrong types (string for x)', () => {
		const result: Result<Vector3> = safeParse(Vector3Schema, {
			x: '1',
			y: 2,
			z: 3,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// FogConfigSchema
// =============================================================================

describe('FogConfigSchema', () => {
	test('accepts minimal fog config (all defaults)', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('none');
		expect(result.data.density).toBeCloseTo(0.01);
		expect(result.data.start).toBe(50);
		expect(result.data.end).toBe(300);
	});

	test('fills default fog color', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.color.r).toBeCloseTo(0.8);
		expect(result.data.color.g).toBeCloseTo(0.8);
		expect(result.data.color.b).toBeCloseTo(0.85);
		expect(result.data.color.a).toBe(1);
	});

	test('accepts all fog modes', () => {
		const modes: string[] = ['none', 'linear', 'exponential', 'exponential2'];
		for (const mode of modes) {
			const result: Result<FogConfig> = safeParse(FogConfigSchema, { mode });
			expect(result.ok).toBeTruthy();
		}
	});

	test('accepts explicit fog config', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			mode: 'linear',
			color: { r: 0.5, g: 0.5, b: 0.6 },
			density: 0.05,
			start: 10,
			end: 200,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('linear');
		expect(result.data.start).toBe(10);
		expect(result.data.end).toBe(200);
		expect(result.data.density).toBeCloseTo(0.05);
	});

	test('rejects invalid fog mode', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			mode: 'volumetric',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative density', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			density: -0.01,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects unknown fog properties', () => {
		const result: Result<FogConfig> = safeParse(FogConfigSchema, {
			mode: 'none',
			intensity: 0.5,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// SceneSetupConfigSchema
// =============================================================================

describe('SceneSetupConfigSchema', () => {
	test('accepts empty config (all defaults)', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {});
		expect(result.ok).toBeTruthy();
	});

	test('fills default clear color (dark blue-gray)', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.clearColor.r).toBeCloseTo(0.15);
		expect(result.data.clearColor.g).toBeCloseTo(0.15);
		expect(result.data.clearColor.b).toBeCloseTo(0.2);
		expect(result.data.clearColor.a).toBe(1);
	});

	test('fills default ambient color', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.ambientColor.r).toBeCloseTo(0.3);
		expect(result.data.ambientColor.g).toBeCloseTo(0.3);
		expect(result.data.ambientColor.b).toBeCloseTo(0.3);
	});

	test('fills default light settings', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.defaultLight).toBeTruthy();
		expect(result.data.defaultLightIntensity).toBeCloseTo(0.7);
		expect(result.data.defaultLightGroundColor.r).toBeCloseTo(0.2);
		expect(result.data.defaultLightGroundColor.g).toBeCloseTo(0.2);
		expect(result.data.defaultLightGroundColor.b).toBeCloseTo(0.2);
	});

	test('fog defaults to undefined when omitted', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.fog).toBeUndefined();
	});

	test('accepts explicit fog config', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			fog: {
				mode: 'exponential',
				density: 0.02,
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.fog).toBeDefined();
		if (!result.data.fog) return;
		expect(result.data.fog.mode).toBe('exponential');
		expect(result.data.fog.density).toBeCloseTo(0.02);
	});

	test('accepts full explicit config', () => {
		const input: Record<string, unknown> = {
			clearColor: { r: 0, g: 0, b: 0, a: 1 },
			ambientColor: { r: 0.5, g: 0.5, b: 0.5 },
			fog: {
				mode: 'linear',
				color: { r: 0.9, g: 0.9, b: 0.9 },
				density: 0.03,
				start: 20,
				end: 150,
			},
			defaultLight: false,
			defaultLightIntensity: 1.0,
			defaultLightGroundColor: { r: 0.1, g: 0.1, b: 0.1 },
		};
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, input);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.clearColor.r).toBe(0);
		expect(result.data.defaultLight).toBeFalsy();
		expect(result.data.defaultLightIntensity).toBeCloseTo(1.0);
	});

	test('accepts defaultLight false to disable hemispheric light', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			defaultLight: false,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.defaultLight).toBeFalsy();
	});

	// =========================================================================
	// Rejection: intensity bounds
	// =========================================================================

	test('rejects defaultLightIntensity below 0', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			defaultLightIntensity: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects defaultLightIntensity above 10', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			defaultLightIntensity: 11,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts defaultLightIntensity at boundaries (0 and 10)', () => {
		const r1: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			defaultLightIntensity: 0,
		});
		expect(r1.ok).toBeTruthy();

		const r2: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			defaultLightIntensity: 10,
		});
		expect(r2.ok).toBeTruthy();
	});

	// =========================================================================
	// Rejection: invalid color in nested object
	// =========================================================================

	test('rejects invalid color in clearColor', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			clearColor: { r: 2, g: 0, b: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects invalid color in defaultLightGroundColor', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			defaultLightGroundColor: { r: -1, g: 0, b: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, {
			skybox: 'sunset.hdr',
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	test('rejects null input', () => {
		const result: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, null);
		expect(result.ok).toBeFalsy();
	});
});
