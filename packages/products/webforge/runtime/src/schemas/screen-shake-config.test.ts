import { describe, expect, test } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import {
	DecayModeSchema,
	ShakeChannelSchema,
	ShakeEnvelopeSchema,
	ScreenShakeConfigSchema,
	ShakePresetSchema,
	SHAKE_PRESETS,
} from './screen-shake-config';

describe('DecayModeSchema', () => {
	test('accepts valid decay modes', () => {
		for (const mode of ['linear', 'exponential', 'easeOut']) {
			const result = safeParse(DecayModeSchema, mode);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid decay mode', () => {
		const result = safeParse(DecayModeSchema, 'bounce');
		expect(result.ok).toBeFalsy();
	});
});

describe('ShakeChannelSchema', () => {
	test('accepts valid channel config', () => {
		const result = safeParse(ShakeChannelSchema, {
			enabled: true,
			amplitude: 0.5,
			frequency: 25,
		});
		expect(result.ok).toBeTruthy();
	});

	test('provides defaults when fields omitted', () => {
		const result = safeParse(ShakeChannelSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
	});
});

describe('ShakeEnvelopeSchema', () => {
	test('accepts valid envelope', () => {
		const result = safeParse(ShakeEnvelopeSchema, {
			attackMs: 50,
			sustainMs: 100,
			decayMs: 300,
		});
		expect(result.ok).toBeTruthy();
	});

	test('provides defaults when fields omitted', () => {
		const result = safeParse(ShakeEnvelopeSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.attackMs).toBe(0);
		expect(result.data.sustainMs).toBe(0);
		expect(result.data.decayMs).toBe(300);
	});
});

describe('ScreenShakeConfigSchema', () => {
	test('accepts minimal config with defaults', () => {
		const result = safeParse(ScreenShakeConfigSchema, {
			intensity: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.intensity).toBe(0.5);
		expect(result.data.traumaPower).toBe(2);
		expect(result.data.decayMode).toBe('exponential');
		expect(result.data.freezeMs).toBe(0);
	});

	test('accepts full config', () => {
		const result = safeParse(ScreenShakeConfigSchema, {
			intensity: 1.0,
			traumaPower: 3,
			decayRate: 2.0,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.8, frequency: 30 },
			rotation: { enabled: true, amplitude: 0.05, frequency: 20 },
			fov: { enabled: false, amplitude: 0, frequency: 15 },
			envelope: { attackMs: 50, sustainMs: 100, decayMs: 500 },
			noise: { seed: 42, octaves: 3 },
			direction: { x: 1, z: 0 },
			freezeMs: 100,
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects intensity above 3', () => {
		const result = safeParse(ScreenShakeConfigSchema, { intensity: 5 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative intensity', () => {
		const result = safeParse(ScreenShakeConfigSchema, { intensity: -1 });
		expect(result.ok).toBeFalsy();
	});
});

describe('ShakePresetSchema', () => {
	test('accepts valid preset', () => {
		const result = safeParse(ShakePresetSchema, {
			name: 'Heavy Hit',
			category: 'combat',
			config: { intensity: 0.6 },
		});
		expect(result.ok).toBeTruthy();
	});
});

describe('SHAKE_PRESETS', () => {
	test('has 18 presets', () => {
		expect(SHAKE_PRESETS).toHaveLength(18);
	});

	test('all presets validate against ShakePresetSchema', () => {
		for (const preset of SHAKE_PRESETS) {
			const result = safeParse(ShakePresetSchema, preset);
			expect(result.ok, `Preset "${preset.name}" should validate`).toBeTruthy();
		}
	});

	test('covers all 4 categories', () => {
		const categories = new Set(SHAKE_PRESETS.map((p) => p.category));
		expect(categories.has('combat')).toBeTruthy();
		expect(categories.has('environment')).toBeTruthy();
		expect(categories.has('ui')).toBeTruthy();
		expect(categories.has('cinematic')).toBeTruthy();
	});

	test('combat category has 6 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'combat')).toHaveLength(6);
	});

	test('environment category has 5 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'environment')).toHaveLength(5);
	});

	test('ui category has 3 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'ui')).toHaveLength(3);
	});

	test('cinematic category has 4 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'cinematic')).toHaveLength(4);
	});
});
