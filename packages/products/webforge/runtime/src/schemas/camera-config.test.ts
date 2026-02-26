/**
 * Camera configuration schema tests.
 *
 * Tests the dual-mode (editor/gameplay) HD-2D camera configuration schema
 * with mode-dependent defaults for inertia, panning, and orbit constraints.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { CameraConfigSchema, type CameraConfig } from './camera-config';

describe('CameraConfigSchema', () => {
	// =========================================================================
	// Valid configs — defaults
	// =========================================================================

	test('accepts minimal editor config with only mode', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('editor');
	});

	test('accepts minimal gameplay config with only mode', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('gameplay');
	});

	test('fills HD-2D defaults for editor mode', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.alpha).toBeCloseTo(Math.PI / 4);
		expect(result.data.beta).toBeCloseTo(Math.PI / 4);
		expect(result.data.radius).toBe(100);
		expect(result.data.lowerBetaLimit).toBeCloseTo(Math.PI / 6);
		expect(result.data.upperBetaLimit).toBeCloseTo(Math.PI / 2.5);
		expect(result.data.lowerRadiusLimit).toBe(30);
		expect(result.data.upperRadiusLimit).toBe(300);
		expect(result.data.targetX).toBe(0);
		expect(result.data.targetY).toBe(0);
		expect(result.data.targetZ).toBe(0);
		expect(result.data.followSpeed).toBe(0.05);
		expect(result.data.wheelPrecision).toBe(3);
	});

	test('fills HD-2D defaults for gameplay mode', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.alpha).toBeCloseTo(Math.PI / 4);
		expect(result.data.beta).toBeCloseTo(Math.PI / 4);
		expect(result.data.radius).toBe(100);
	});

	// =========================================================================
	// Valid configs — full explicit
	// =========================================================================

	test('accepts full explicit config', () => {
		const input: Record<string, unknown> = {
			mode: 'editor',
			alpha: 1.0,
			beta: 0.8,
			radius: 50,
			lowerBetaLimit: 0.3,
			upperBetaLimit: 1.5,
			lowerRadiusLimit: 10,
			upperRadiusLimit: 500,
			targetX: 10,
			targetY: 5,
			targetZ: -20,
			followSpeed: 0.1,
			panningSensibility: 100,
			wheelPrecision: 20,
			inertia: 0.5,
			panningAxis: { x: 1, y: 0, z: 1 },
		};
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, input);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.alpha).toBeCloseTo(1.0);
		expect(result.data.beta).toBeCloseTo(0.8);
		expect(result.data.radius).toBe(50);
		expect(result.data.lowerBetaLimit).toBeCloseTo(0.3);
		expect(result.data.upperBetaLimit).toBeCloseTo(1.5);
		expect(result.data.lowerRadiusLimit).toBe(10);
		expect(result.data.upperRadiusLimit).toBe(500);
		expect(result.data.targetX).toBe(10);
		expect(result.data.targetY).toBe(5);
		expect(result.data.targetZ).toBe(-20);
		expect(result.data.followSpeed).toBeCloseTo(0.1);
		expect(result.data.panningSensibility).toBe(100);
		expect(result.data.wheelPrecision).toBe(20);
		expect(result.data.inertia).toBeCloseTo(0.5);
		expect(result.data.panningAxis).toEqual({ x: 1, y: 0, z: 1 });
	});

	// =========================================================================
	// Mode-dependent optional fields
	// =========================================================================

	test('panningSensibility is optional (mode defaults applied later)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// panningSensibility has no schema default — mode default applied in createHd2dCamera
		expect(result.data.panningSensibility).toBeUndefined();
	});

	test('inertia is optional (mode defaults applied later)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// inertia has no schema default — mode default applied in createHd2dCamera
		expect(result.data.inertia).toBeUndefined();
	});

	test('explicit panningSensibility overrides undefined', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
			panningSensibility: 75,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(75);
	});

	test('explicit inertia overrides undefined', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			inertia: 0.3,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.3);
	});

	// =========================================================================
	// Panning axis
	// =========================================================================

	test('panningAxis defaults to {x:1, y:0, z:1} (XZ plane only)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningAxis).toEqual({ x: 1, y: 0, z: 1 });
	});

	test('panningAxis accepts custom values', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			panningAxis: { x: 0, y: 1, z: 0 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningAxis).toEqual({ x: 0, y: 1, z: 0 });
	});

	// =========================================================================
	// Boundary values
	// =========================================================================

	test('accepts radius at minimum (1)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			radius: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.radius).toBe(1);
	});

	test('accepts lowerRadiusLimit at minimum (1)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			lowerRadiusLimit: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lowerRadiusLimit).toBe(1);
	});

	test('accepts followSpeed at 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
			followSpeed: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.followSpeed).toBe(0);
	});

	test('accepts followSpeed at 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
			followSpeed: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.followSpeed).toBe(1);
	});

	test('accepts inertia at 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			inertia: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});

	test('accepts inertia at 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			inertia: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(1);
	});

	test('accepts wheelPrecision at minimum (1)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			wheelPrecision: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.wheelPrecision).toBe(1);
	});

	test('accepts panningSensibility at 0 (disabled)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'gameplay',
			panningSensibility: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(0);
	});

	// =========================================================================
	// Rejection: missing required field
	// =========================================================================

	test('rejects missing mode', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: invalid values
	// =========================================================================

	test('rejects invalid mode value', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'cinematic',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects radius below minimum (0)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			radius: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative radius', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			radius: -10,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects lowerRadiusLimit below minimum (0)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			lowerRadiusLimit: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects followSpeed below 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			followSpeed: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects followSpeed above 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			followSpeed: 1.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects inertia below 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			inertia: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects inertia above 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			inertia: 1.5,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects wheelPrecision below 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			wheelPrecision: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative panningSensibility', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			panningSensibility: -1,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: wrong types
	// =========================================================================

	test('rejects mode as number', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects alpha as string', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			alpha: '0.5',
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: panningAxis validation
	// =========================================================================

	test('rejects panningAxis missing z', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			panningAxis: { x: 1, y: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects panningAxis with extra property', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			panningAxis: { x: 1, y: 0, z: 1, w: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects panningAxis with non-number', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			panningAxis: { x: '1', y: 0, z: 1 },
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			fov: 60,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	test('rejects null input', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, null);
		expect(result.ok).toBeFalsy();
	});

	test('rejects undefined input', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, undefined);
		expect(result.ok).toBeFalsy();
	});
});
