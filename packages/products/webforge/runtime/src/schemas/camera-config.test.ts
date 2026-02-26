/**
 * Camera configuration schema tests.
 *
 * Tests the camera preset system with 6 presets (hd2d, topdown, sideview,
 * firstperson, cinematic, free), backward compatibility with legacy
 * editor/gameplay modes, and transition/tactics rotation fields.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import {
	CameraConfigSchema,
	CameraPresetSchema,
	type CameraConfig,
	type CameraPreset,
} from './camera-config';

// =============================================================================
// CameraPresetSchema
// =============================================================================

describe('CameraPresetSchema', () => {
	const validPresets: readonly string[] = [
		'hd2d',
		'topdown',
		'sideview',
		'firstperson',
		'cinematic',
		'free',
	];

	test.each(validPresets)('accepts preset "%s"', (preset: string) => {
		const result: Result<CameraPreset> = safeParse(CameraPresetSchema, preset);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(preset);
	});

	test('rejects invalid preset name', () => {
		const result: Result<CameraPreset> = safeParse(CameraPresetSchema, 'orthographic');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// CameraConfigSchema — Preset defaults
// =============================================================================

describe('CameraConfigSchema — preset system', () => {
	test('accepts empty config (preset defaults to hd2d)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('hd2d');
	});

	test('accepts explicit hd2d preset', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 'hd2d' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('hd2d');
	});

	test('accepts topdown preset', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 'topdown' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('topdown');
	});

	test('accepts sideview preset', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 'sideview' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('sideview');
	});

	test('accepts firstperson preset', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			preset: 'firstperson',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('firstperson');
	});

	test('accepts cinematic preset', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 'cinematic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('cinematic');
	});

	test('accepts free preset', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 'free' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('free');
	});

	test('alpha/beta/radius are undefined at schema level (preset defaults applied in controller)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 'hd2d' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// alpha/beta/radius have NO schema default — preset default applied in controller
		expect(result.data.alpha).toBeUndefined();
		expect(result.data.beta).toBeUndefined();
		expect(result.data.radius).toBeUndefined();
		// These still have schema defaults
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
});

// =============================================================================
// CameraConfigSchema — Backward compatibility (legacy mode)
// =============================================================================

describe('CameraConfigSchema — backward compatibility', () => {
	test('accepts legacy mode: editor', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('editor');
	});

	test('accepts legacy mode: gameplay', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { mode: 'gameplay' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('gameplay');
	});

	test('rejects invalid legacy mode value', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { mode: 'cinematic' });
		expect(result.ok).toBeFalsy();
	});

	test('mode and preset can coexist', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			mode: 'editor',
			preset: 'free',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.mode).toBe('editor');
		expect(result.data.preset).toBe('free');
	});
});

// =============================================================================
// CameraConfigSchema — New fields (tactics, transitions)
// =============================================================================

describe('CameraConfigSchema — tactics rotation', () => {
	test('tacticsRotation defaults to false', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tacticsRotation).toBe(false);
	});

	test('accepts tacticsRotation: true', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			tacticsRotation: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tacticsRotation).toBe(true);
	});
});

describe('CameraConfigSchema — transition settings', () => {
	test('transitionDurationMs defaults to 500', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.transitionDurationMs).toBe(500);
	});

	test('accepts custom transitionDurationMs', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			transitionDurationMs: 1000,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.transitionDurationMs).toBe(1000);
	});

	test('accepts transitionDurationMs at 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			transitionDurationMs: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.transitionDurationMs).toBe(0);
	});

	test('accepts transitionDurationMs at max (5000)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			transitionDurationMs: 5000,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.transitionDurationMs).toBe(5000);
	});

	test('rejects transitionDurationMs above 5000', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			transitionDurationMs: 6000,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative transitionDurationMs', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			transitionDurationMs: -100,
		});
		expect(result.ok).toBeFalsy();
	});

	test('transitionEasing defaults to easeInOutCubic', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.transitionEasing).toBe('easeInOutCubic');
	});

	test('accepts all valid easing functions', () => {
		const easings: readonly string[] = ['linear', 'easeInOutCubic', 'easeOutBack', 'easeInOutQuad'];
		for (const easing of easings) {
			const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
				transitionEasing: easing,
			});
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid easing name', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			transitionEasing: 'bounce',
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// CameraConfigSchema — Full explicit config
// =============================================================================

describe('CameraConfigSchema — full explicit config', () => {
	test('accepts full explicit config with preset', () => {
		const input: Record<string, unknown> = {
			preset: 'cinematic',
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
			tacticsRotation: true,
			transitionDurationMs: 750,
			transitionEasing: 'easeOutBack',
		};
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, input);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.preset).toBe('cinematic');
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
		expect(result.data.tacticsRotation).toBe(true);
		expect(result.data.transitionDurationMs).toBe(750);
		expect(result.data.transitionEasing).toBe('easeOutBack');
	});
});

// =============================================================================
// CameraConfigSchema — Mode-dependent optional fields
// =============================================================================

describe('CameraConfigSchema — mode-dependent optional fields', () => {
	test('panningSensibility is optional (mode defaults applied later)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBeUndefined();
	});

	test('inertia is optional (mode defaults applied later)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeUndefined();
	});

	test('explicit panningSensibility overrides undefined', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningSensibility: 75,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(75);
	});

	test('explicit inertia overrides undefined', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			inertia: 0.3,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.3);
	});
});

// =============================================================================
// CameraConfigSchema — Panning axis
// =============================================================================

describe('CameraConfigSchema — panning axis', () => {
	test('panningAxis defaults to {x:1, y:0, z:1} (XZ plane only)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningAxis).toEqual({ x: 1, y: 0, z: 1 });
	});

	test('panningAxis accepts custom values', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningAxis: { x: 0, y: 1, z: 0 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningAxis).toEqual({ x: 0, y: 1, z: 0 });
	});
});

// =============================================================================
// CameraConfigSchema — Boundary values
// =============================================================================

describe('CameraConfigSchema — boundary values', () => {
	test('accepts radius at minimum (1)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { radius: 1 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.radius).toBe(1);
	});

	test('accepts lowerRadiusLimit at minimum (1)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			lowerRadiusLimit: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lowerRadiusLimit).toBe(1);
	});

	test('accepts followSpeed at 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { followSpeed: 0 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.followSpeed).toBe(0);
	});

	test('accepts followSpeed at 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { followSpeed: 1 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.followSpeed).toBe(1);
	});

	test('accepts inertia at 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { inertia: 0 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});

	test('accepts inertia at 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { inertia: 1 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(1);
	});

	test('accepts wheelPrecision at minimum (1)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { wheelPrecision: 1 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.wheelPrecision).toBe(1);
	});

	test('accepts panningSensibility at 0 (disabled)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningSensibility: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(0);
	});
});

// =============================================================================
// CameraConfigSchema — Rejection: invalid values
// =============================================================================

describe('CameraConfigSchema — rejection: invalid values', () => {
	test('rejects invalid preset value', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			preset: 'orthographic',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects radius below minimum (0)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { radius: 0 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative radius', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { radius: -10 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects lowerRadiusLimit below minimum (0)', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			lowerRadiusLimit: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects followSpeed below 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { followSpeed: -0.1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects followSpeed above 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { followSpeed: 1.1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects inertia below 0', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { inertia: -0.1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects inertia above 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { inertia: 1.5 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects wheelPrecision below 1', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { wheelPrecision: 0 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative panningSensibility', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningSensibility: -1,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// CameraConfigSchema — Rejection: wrong types
// =============================================================================

describe('CameraConfigSchema — rejection: wrong types', () => {
	test('rejects preset as number', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { preset: 1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects alpha as string', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { alpha: '0.5' });
		expect(result.ok).toBeFalsy();
	});

	test('rejects tacticsRotation as string', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			tacticsRotation: 'yes',
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// CameraConfigSchema — Rejection: panningAxis validation
// =============================================================================

describe('CameraConfigSchema — rejection: panningAxis', () => {
	test('rejects panningAxis missing z', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningAxis: { x: 1, y: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects panningAxis with extra property', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningAxis: { x: 1, y: 0, z: 1, w: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects panningAxis with non-number', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, {
			panningAxis: { x: '1', y: 0, z: 1 },
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// CameraConfigSchema — Rejection: unknown properties
// =============================================================================

describe('CameraConfigSchema — rejection: unknown properties', () => {
	test('rejects unknown properties', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, { fov: 60 });
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// CameraConfigSchema — Edge cases
// =============================================================================

describe('CameraConfigSchema — edge cases', () => {
	test('rejects null input', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, null);
		expect(result.ok).toBeFalsy();
	});

	test('rejects undefined input', () => {
		const result: Result<CameraConfig> = safeParse(CameraConfigSchema, undefined);
		expect(result.ok).toBeFalsy();
	});
});
