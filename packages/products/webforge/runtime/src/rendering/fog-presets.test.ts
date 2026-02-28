/**
 * Fog preset tests.
 *
 * Verifies that all 14 fog presets produce valid `FogConfig` when parsed
 * through `FogConfigSchema`, and that each preset has the expected core
 * properties (mode, color, density).
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { FogConfigSchema, type FogConfig } from '../schemas/fog-config';
import { FOG_PRESETS, FOG_PRESET_NAMES, type FogPresetName } from './fog-presets';

// =============================================================================
// All Presets Validate
// =============================================================================

describe('FOG_PRESETS', () => {
	test('exports exactly 14 presets', () => {
		const names: readonly string[] = Object.keys(FOG_PRESETS);
		expect(names).toHaveLength(14);
	});

	test('FOG_PRESET_NAMES matches FOG_PRESETS keys', () => {
		const presetKeys: readonly string[] = Object.keys(FOG_PRESETS).toSorted();
		const namesSorted: readonly string[] = [...FOG_PRESET_NAMES].toSorted();
		expect(namesSorted).toEqual(presetKeys);
	});

	test.each([
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
	] as const)('preset "%s" produces valid FogConfig', (name: FogPresetName) => {
		const preset: FogConfig = FOG_PRESETS[name];
		const result: Result<FogConfig> = safeParse(FogConfigSchema, preset);
		expect(result.ok).toBe(true);
	});
});

// =============================================================================
// Clear Preset
// =============================================================================

describe('clear preset', () => {
	test('has mode "none"', () => {
		expect(FOG_PRESETS.clear.mode).toBe('none');
	});
});

// =============================================================================
// Light Mist Preset
// =============================================================================

describe('lightMist preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.lightMist.mode).toBe('exponential');
	});

	test('has low density', () => {
		expect(FOG_PRESETS.lightMist.density).toBe(0.003);
	});

	test('has light gray-blue color', () => {
		expect(FOG_PRESETS.lightMist.color.r).toBeCloseTo(0.85, 2);
		expect(FOG_PRESETS.lightMist.color.g).toBeCloseTo(0.87, 2);
		expect(FOG_PRESETS.lightMist.color.b).toBeCloseTo(0.9, 2);
	});
});

// =============================================================================
// Morning Fog Preset
// =============================================================================

describe('morningFog preset', () => {
	test('uses exponential2 mode', () => {
		expect(FOG_PRESETS.morningFog.mode).toBe('exponential2');
	});

	test('has density of 0.005', () => {
		expect(FOG_PRESETS.morningFog.density).toBe(0.005);
	});

	test('has warm color', () => {
		expect(FOG_PRESETS.morningFog.color.r).toBeCloseTo(0.9, 2);
		expect(FOG_PRESETS.morningFog.color.g).toBeCloseTo(0.85, 2);
		expect(FOG_PRESETS.morningFog.color.b).toBeCloseTo(0.75, 2);
	});

	test('has height fog enabled', () => {
		expect(FOG_PRESETS.morningFog.heightFog).toBeDefined();
		expect(FOG_PRESETS.morningFog.heightFog?.enabled).toBe(true);
		expect(FOG_PRESETS.morningFog.heightFog?.baseHeight).toBe(0);
		expect(FOG_PRESETS.morningFog.heightFog?.falloff).toBeCloseTo(0.3, 2);
	});

	test('has wind enabled', () => {
		expect(FOG_PRESETS.morningFog.wind).toBeDefined();
		expect(FOG_PRESETS.morningFog.wind?.enabled).toBe(true);
	});

	test('has wisps overlay', () => {
		expect(FOG_PRESETS.morningFog.overlays).toBeDefined();
		expect(FOG_PRESETS.morningFog.overlays).toHaveLength(1);
		expect(FOG_PRESETS.morningFog.overlays?.[0]?.texture).toBe('wisps');
	});
});

// =============================================================================
// Dense Fog Preset
// =============================================================================

describe('denseFog preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.denseFog.mode).toBe('exponential');
	});

	test('has high density', () => {
		expect(FOG_PRESETS.denseFog.density).toBe(0.008);
	});

	test('has clouds overlay', () => {
		expect(FOG_PRESETS.denseFog.overlays).toHaveLength(1);
		expect(FOG_PRESETS.denseFog.overlays?.[0]?.texture).toBe('clouds');
	});
});

// =============================================================================
// Dungeon Preset
// =============================================================================

describe('dungeon preset', () => {
	test('uses exponential2 mode', () => {
		expect(FOG_PRESETS.dungeon.mode).toBe('exponential2');
	});

	test('has dark color', () => {
		expect(FOG_PRESETS.dungeon.color.r).toBeLessThan(0.2);
		expect(FOG_PRESETS.dungeon.color.g).toBeLessThan(0.2);
		expect(FOG_PRESETS.dungeon.color.b).toBeLessThan(0.2);
	});

	test('has smoke overlay', () => {
		expect(FOG_PRESETS.dungeon.overlays).toHaveLength(1);
		expect(FOG_PRESETS.dungeon.overlays?.[0]?.texture).toBe('smoke');
	});
});

// =============================================================================
// Underwater Preset
// =============================================================================

describe('underwater preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.underwater.mode).toBe('exponential');
	});

	test('has high density', () => {
		expect(FOG_PRESETS.underwater.density).toBe(0.01);
	});

	test('has blue-green color', () => {
		expect(FOG_PRESETS.underwater.color.r).toBeLessThan(0.2);
		expect(FOG_PRESETS.underwater.color.b).toBeGreaterThan(0.4);
	});
});

// =============================================================================
// Forest Preset
// =============================================================================

describe('forest preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.forest.mode).toBe('exponential');
	});

	test('has green-tinted color', () => {
		expect(FOG_PRESETS.forest.color.g).toBeGreaterThan(FOG_PRESETS.forest.color.r);
	});

	test('has height fog with ground-level base', () => {
		expect(FOG_PRESETS.forest.heightFog?.enabled).toBe(true);
		expect(FOG_PRESETS.forest.heightFog?.baseHeight).toBe(0);
		expect(FOG_PRESETS.forest.heightFog?.falloff).toBeCloseTo(0.5, 2);
	});
});

// =============================================================================
// Mountain Preset
// =============================================================================

describe('mountain preset', () => {
	test('uses exponential2 mode', () => {
		expect(FOG_PRESETS.mountain.mode).toBe('exponential2');
	});

	test('has low density', () => {
		expect(FOG_PRESETS.mountain.density).toBe(0.005);
	});

	test('has height fog with elevated base', () => {
		expect(FOG_PRESETS.mountain.heightFog?.enabled).toBe(true);
		expect(FOG_PRESETS.mountain.heightFog?.baseHeight).toBe(5);
		expect(FOG_PRESETS.mountain.heightFog?.falloff).toBeCloseTo(0.2, 2);
	});
});

// =============================================================================
// Sandstorm Preset
// =============================================================================

describe('sandstorm preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.sandstorm.mode).toBe('exponential');
	});

	test('has high density', () => {
		expect(FOG_PRESETS.sandstorm.density).toBe(0.008);
	});

	test('has warm sandy color', () => {
		expect(FOG_PRESETS.sandstorm.color.r).toBeGreaterThan(0.6);
		expect(FOG_PRESETS.sandstorm.color.b).toBeLessThan(0.4);
	});

	test('has strong wind', () => {
		expect(FOG_PRESETS.sandstorm.wind?.enabled).toBe(true);
		expect(FOG_PRESETS.sandstorm.wind?.speed).toBeGreaterThanOrEqual(2);
	});

	test('has smoke overlay', () => {
		expect(FOG_PRESETS.sandstorm.overlays).toHaveLength(1);
		expect(FOG_PRESETS.sandstorm.overlays?.[0]?.texture).toBe('smoke');
	});
});

// =============================================================================
// Snowstorm Preset
// =============================================================================

describe('snowstorm preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.snowstorm.mode).toBe('exponential');
	});

	test('has strong wind', () => {
		expect(FOG_PRESETS.snowstorm.wind?.enabled).toBe(true);
		expect(FOG_PRESETS.snowstorm.wind?.speed).toBeGreaterThanOrEqual(2);
	});

	test('has perlin overlay', () => {
		expect(FOG_PRESETS.snowstorm.overlays).toHaveLength(1);
		expect(FOG_PRESETS.snowstorm.overlays?.[0]?.texture).toBe('perlin');
	});
});

// =============================================================================
// Dream Preset
// =============================================================================

describe('dream preset', () => {
	test('uses exponential2 mode', () => {
		expect(FOG_PRESETS.dream.mode).toBe('exponential2');
	});

	test('has purple-ish color', () => {
		expect(FOG_PRESETS.dream.color.b).toBeGreaterThan(FOG_PRESETS.dream.color.g);
	});

	test('has wisps overlay', () => {
		expect(FOG_PRESETS.dream.overlays).toHaveLength(1);
		expect(FOG_PRESETS.dream.overlays?.[0]?.texture).toBe('wisps');
	});
});

// =============================================================================
// Volcanic Preset
// =============================================================================

describe('volcanic preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.volcanic.mode).toBe('exponential');
	});

	test('has red-orange color', () => {
		expect(FOG_PRESETS.volcanic.color.r).toBeGreaterThan(0.3);
		expect(FOG_PRESETS.volcanic.color.b).toBeLessThan(0.1);
	});

	test('has height fog with steep falloff', () => {
		expect(FOG_PRESETS.volcanic.heightFog?.enabled).toBe(true);
		expect(FOG_PRESETS.volcanic.heightFog?.falloff).toBeGreaterThanOrEqual(0.8);
	});
});

// =============================================================================
// Swamp Preset
// =============================================================================

describe('swamp preset', () => {
	test('uses exponential mode', () => {
		expect(FOG_PRESETS.swamp.mode).toBe('exponential');
	});

	test('has murky green color', () => {
		expect(FOG_PRESETS.swamp.color.g).toBeGreaterThan(FOG_PRESETS.swamp.color.r);
		expect(FOG_PRESETS.swamp.color.g).toBeGreaterThan(FOG_PRESETS.swamp.color.b);
	});

	test('has height fog', () => {
		expect(FOG_PRESETS.swamp.heightFog?.enabled).toBe(true);
	});
});

// =============================================================================
// Night Mist Preset
// =============================================================================

describe('nightMist preset', () => {
	test('uses exponential2 mode', () => {
		expect(FOG_PRESETS.nightMist.mode).toBe('exponential2');
	});

	test('has very dark color', () => {
		expect(FOG_PRESETS.nightMist.color.r).toBeLessThan(0.15);
		expect(FOG_PRESETS.nightMist.color.g).toBeLessThan(0.15);
	});

	test('has low density', () => {
		expect(FOG_PRESETS.nightMist.density).toBe(0.006);
	});
});
