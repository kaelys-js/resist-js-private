/**
 * Map data schema tests.
 *
 * Tests for all bootstrap schemas: TilePropertiesSchema, AutotileTypeSchema,
 * TilesetConfigSchema, LayerTypeSchema, TileLayerSchema, MapDataSchema,
 * and ChunkConfigSchema.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import {
	AnimationFrameSchema,
	AnimationPlaybackModeSchema,
	ChunkConfigSchema,
	CollisionShapeSchema,
	DrawOrderSchema,
	GroupLayerSchema,
	LayerSchema,
	MapDataSchema,
	MapObjectSchema,
	MapObjectShapeSchema,
	ObjectLayerSchema,
	TerrainTypeSchema,
	TileLayerSchema,
	TilePropertiesSchema,
	TilesetConfigSchema,
	type AnimationFrame,
	type AnimationPlaybackMode,
	type ChunkConfig,
	type CollisionShape,
	type DrawOrder,
	type GroupLayer,
	type Layer,
	type MapData,
	type MapObject,
	type MapObjectShape,
	type ObjectLayer,
	type TerrainType,
	type TileLayer,
	type TileProperties,
	type TilesetConfig,
} from './map-data';

// =============================================================================
// Helpers
// =============================================================================

/** Minimal valid tileset for reuse in MapData tests. */
const VALID_TILESET: Record<string, unknown> = {
	name: 'ground',
	imagePath: 'ground.png',
	columns: 8,
	rows: 6,
	firstGid: 1,
};

/** Minimal valid layer for reuse in MapData tests (1×1 map). */
const VALID_LAYER_1X1: Record<string, unknown> = {
	name: 'ground',
	type: 'ground',
	data: [1],
};

/**
 * Builds a valid layer with data sized for the given dimensions.
 *
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @param tileId - Tile ID to fill (default 1)
 * @returns A plain object matching TileLayerSchema shape
 */
function validLayer(width: Num, height: Num, tileId: Num = 1): Record<string, unknown> {
	return {
		name: 'ground',
		type: 'ground',
		data: Array.from({ length: width * height }, () => tileId),
	};
}

// =============================================================================
// TilePropertiesSchema
// =============================================================================

describe('TilePropertiesSchema', () => {
	// =========================================================================
	// Valid inputs
	// =========================================================================

	test('accepts empty object with all defaults', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passability).toEqual([true, true, true, true]);
		expect(result.data.terrainTag).toBe(0);
		expect(result.data.height).toBe(0);
		expect(result.data.damageFloor).toBeFalsy();
		expect(result.data.bush).toBeFalsy();
		expect(result.data.counter).toBeFalsy();
		expect(result.data.ladder).toBeFalsy();
		expect(result.data.terrainType).toBe('normal');
		expect(result.data.footstepSound).toBe('');
		expect(result.data.encounterRate).toBe(1);
		expect(result.data.slipperiness).toBe(0);
		expect(result.data.movementSpeed).toBe(1);
		expect(result.data.regionId).toBe(0);
		expect(result.data.slip).toBe(false);
		expect(result.data.shelter).toBe(false);
		expect(result.data.bushDepth).toBe(12);
		expect(result.data.coverHeight).toBe(0);
		expect(result.data.soundAbsorb).toBe(false);
		expect(result.data.damageAmount).toBe(0);
		expect(result.data.damagePercent).toBe(0);
		expect(result.data.damageElement).toBe('');
		expect(result.data.damageInterval).toBe(1);
		expect(result.data.reflection).toBe(false);
		expect(result.data.reflectionOpacity).toBe(0.5);
		expect(result.data.glow).toBe(false);
		expect(result.data.glowColor).toBe('#ffffffff');
		expect(result.data.glowIntensity).toBe(0);
		expect(result.data.collisionShapes).toEqual([]);
		expect(result.data.properties).toEqual({});
		expect(result.data['class']).toBe('');
		expect(result.data.tags).toEqual([]);
		expect(result.data.scriptHook).toBe('');
		expect(result.data.frames).toEqual([]);
		expect(result.data.playbackMode).toBe('loop');
		expect(result.data.globalSync).toBe(true);
		expect(result.data.speedMultiplier).toBe(1);
		expect(result.data.pauseWhenOffscreen).toBe(true);
	});

	test('accepts fully specified properties', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			passability: [false, true, false, true],
			terrainTag: 5,
			height: 10,
			damageFloor: true,
			bush: true,
			counter: true,
			ladder: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passability).toEqual([false, true, false, true]);
		expect(result.data.terrainTag).toBe(5);
		expect(result.data.height).toBe(10);
		expect(result.data.damageFloor).toBeTruthy();
		expect(result.data.bush).toBeTruthy();
		expect(result.data.counter).toBeTruthy();
		expect(result.data.ladder).toBeTruthy();
	});

	test('accepts all-blocked passability', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			passability: [false, false, false, false],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passability).toEqual([false, false, false, false]);
	});

	// =========================================================================
	// Boundary values
	// =========================================================================

	test('accepts terrainTag at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: 0 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainTag).toBe(0);
	});

	test('accepts terrainTag at maximum (15)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: 15 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainTag).toBe(15);
	});

	test('accepts height at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { height: 0 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.height).toBe(0);
	});

	test('accepts height at maximum (15)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { height: 15 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.height).toBe(15);
	});

	// =========================================================================
	// Rejection: invalid ranges
	// =========================================================================

	test('rejects terrainTag above maximum (16)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: 16 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects terrainTag below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: -1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer terrainTag', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: 3.5 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects height above maximum (16)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { height: 16 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects height below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { height: -1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer height', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { height: 2.7 });
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: invalid passability
	// =========================================================================

	test('rejects passability with wrong length (3 elements)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			passability: [true, true, true],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects passability with wrong length (5 elements)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			passability: [true, true, true, true, true],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects passability with non-boolean values', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			passability: [1, 0, 1, 0],
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: wrong types
	// =========================================================================

	test('rejects damageFloor as string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageFloor: 'yes',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects bush as number', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { bush: 1 });
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			unknownProp: 42,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	test('rejects null input', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, null);
		expect(result.ok).toBeFalsy();
	});

	test('rejects undefined input', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, undefined);
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Passability expansion fields
	// =========================================================================

	test('accepts passAbove field', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passAbove: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passAbove).toBe(true);
	});

	test('defaults passAbove to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passAbove).toBe(false);
	});

	test('accepts passBelow field', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passBelow: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passBelow).toBe(true);
	});

	test('defaults passBelow to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passBelow).toBe(false);
	});

	test('accepts passVehicle bitmask 0-31', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passVehicle: 15 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passVehicle).toBe(15);
	});

	test('defaults passVehicle to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passVehicle).toBe(0);
	});

	test('accepts passVehicle at maximum (31)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passVehicle: 31 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passVehicle).toBe(31);
	});

	test('rejects passVehicle above maximum (32)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passVehicle: 32 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects passVehicle below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passVehicle: -1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer passVehicle', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			passVehicle: 2.5,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts passEvent field', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passEvent: false });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passEvent).toBe(false);
	});

	test('defaults passEvent to true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passEvent).toBe(true);
	});

	test('accepts passHeight 0-15', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passHeight: 5 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passHeight).toBe(5);
	});

	test('defaults passHeight to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passHeight).toBe(0);
	});

	test('accepts passHeight at maximum (15)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passHeight: 15 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.passHeight).toBe(15);
	});

	test('rejects passHeight above maximum (16)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passHeight: 16 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects passHeight below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passHeight: -1 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer passHeight', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { passHeight: 3.7 });
		expect(result.ok).toBeFalsy();
	});

	test('accepts starPassage field', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { starPassage: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.starPassage).toBe(true);
	});

	test('defaults starPassage to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.starPassage).toBe(false);
	});

	// =========================================================================
	// Terrain type and terrain fields
	// =========================================================================

	test('accepts terrainType "normal"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'normal',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('normal');
	});

	test('accepts terrainType "water"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'water',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('water');
	});

	test('accepts terrainType "deepWater"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'deepWater',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('deepWater');
	});

	test('accepts terrainType "lava"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'lava',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('lava');
	});

	test('accepts terrainType "ice"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'ice',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('ice');
	});

	test('accepts terrainType "sand"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'sand',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('sand');
	});

	test('accepts terrainType "swamp"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'swamp',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('swamp');
	});

	test('accepts terrainType "snow"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'snow',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('snow');
	});

	test('accepts terrainType "grass"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'grass',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('grass');
	});

	test('accepts terrainType "wood"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'wood',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('wood');
	});

	test('accepts terrainType "stone"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'stone',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('stone');
	});

	test('accepts terrainType "metal"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'metal',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('metal');
	});

	test('accepts terrainType "custom"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'custom',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('custom');
	});

	test('defaults terrainType to "normal"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainType).toBe('normal');
	});

	test('rejects invalid terrainType', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			terrainType: 'dirt',
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// footstepSound
	// =========================================================================

	test('accepts footstepSound string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			footstepSound: 'grass_step',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.footstepSound).toBe('grass_step');
	});

	test('defaults footstepSound to empty string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.footstepSound).toBe('');
	});

	test('accepts empty footstepSound string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			footstepSound: '',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.footstepSound).toBe('');
	});

	// =========================================================================
	// encounterRate
	// =========================================================================

	test('accepts encounterRate at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			encounterRate: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.encounterRate).toBe(0);
	});

	test('accepts encounterRate at maximum (10)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			encounterRate: 10,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.encounterRate).toBe(10);
	});

	test('accepts encounterRate fractional value (5.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			encounterRate: 5.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.encounterRate).toBe(5.5);
	});

	test('defaults encounterRate to 1', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.encounterRate).toBe(1);
	});

	test('rejects encounterRate above maximum (10.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			encounterRate: 10.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects encounterRate below minimum (-0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			encounterRate: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// slipperiness
	// =========================================================================

	test('accepts slipperiness at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			slipperiness: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.slipperiness).toBe(0);
	});

	test('accepts slipperiness at maximum (1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			slipperiness: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.slipperiness).toBe(1);
	});

	test('accepts slipperiness fractional value (0.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			slipperiness: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.slipperiness).toBe(0.5);
	});

	test('defaults slipperiness to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.slipperiness).toBe(0);
	});

	test('rejects slipperiness above maximum (1.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			slipperiness: 1.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects slipperiness below minimum (-0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			slipperiness: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// movementSpeed
	// =========================================================================

	test('accepts movementSpeed at minimum (0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			movementSpeed: 0.1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.movementSpeed).toBe(0.1);
	});

	test('accepts movementSpeed at maximum (5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			movementSpeed: 5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.movementSpeed).toBe(5);
	});

	test('accepts movementSpeed fractional value (2.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			movementSpeed: 2.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.movementSpeed).toBe(2.5);
	});

	test('defaults movementSpeed to 1', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.movementSpeed).toBe(1);
	});

	test('rejects movementSpeed above maximum (5.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			movementSpeed: 5.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects movementSpeed below minimum (0.09)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			movementSpeed: 0.09,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// regionId
	// =========================================================================

	test('accepts regionId at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			regionId: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.regionId).toBe(0);
	});

	test('accepts regionId at maximum (255)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			regionId: 255,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.regionId).toBe(255);
	});

	test('defaults regionId to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.regionId).toBe(0);
	});

	test('rejects regionId above maximum (256)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			regionId: 256,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects regionId below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			regionId: -1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer regionId', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			regionId: 5.5,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Tile flags (Task 3)
	// =========================================================================

	// --- slip ---

	test('accepts slip as true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { slip: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.slip).toBe(true);
	});

	test('defaults slip to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.slip).toBe(false);
	});

	// --- shelter ---

	test('accepts shelter as true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { shelter: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.shelter).toBe(true);
	});

	test('defaults shelter to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.shelter).toBe(false);
	});

	// --- soundAbsorb ---

	test('accepts soundAbsorb as true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			soundAbsorb: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.soundAbsorb).toBe(true);
	});

	test('defaults soundAbsorb to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.soundAbsorb).toBe(false);
	});

	// --- reflection ---

	test('accepts reflection as true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			reflection: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reflection).toBe(true);
	});

	test('defaults reflection to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reflection).toBe(false);
	});

	// --- glow ---

	test('accepts glow as true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { glow: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glow).toBe(true);
	});

	test('defaults glow to false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glow).toBe(false);
	});

	// --- bushDepth ---

	test('accepts bushDepth at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			bushDepth: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.bushDepth).toBe(0);
	});

	test('accepts bushDepth at maximum (48)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			bushDepth: 48,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.bushDepth).toBe(48);
	});

	test('defaults bushDepth to 12', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.bushDepth).toBe(12);
	});

	test('rejects bushDepth above maximum (49)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			bushDepth: 49,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects bushDepth below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			bushDepth: -1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer bushDepth', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			bushDepth: 6.5,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- coverHeight ---

	test('accepts coverHeight at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			coverHeight: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.coverHeight).toBe(0);
	});

	test('accepts coverHeight at maximum (1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			coverHeight: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.coverHeight).toBe(1);
	});

	test('accepts coverHeight fractional (0.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			coverHeight: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.coverHeight).toBe(0.5);
	});

	test('defaults coverHeight to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.coverHeight).toBe(0);
	});

	test('rejects coverHeight above maximum (1.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			coverHeight: 1.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects coverHeight below minimum (-0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			coverHeight: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- damageAmount ---

	test('accepts damageAmount at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageAmount: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageAmount).toBe(0);
	});

	test('accepts damageAmount at maximum (9999)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageAmount: 9999,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageAmount).toBe(9999);
	});

	test('defaults damageAmount to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageAmount).toBe(0);
	});

	test('rejects damageAmount above maximum (10000)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageAmount: 10_000,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects damageAmount below minimum (-1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageAmount: -1,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- damagePercent ---

	test('accepts damagePercent at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damagePercent: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damagePercent).toBe(0);
	});

	test('accepts damagePercent at maximum (100)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damagePercent: 100,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damagePercent).toBe(100);
	});

	test('accepts damagePercent fractional (50.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damagePercent: 50.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damagePercent).toBe(50.5);
	});

	test('defaults damagePercent to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damagePercent).toBe(0);
	});

	test('rejects damagePercent above maximum (100.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damagePercent: 100.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects damagePercent below minimum (-0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damagePercent: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- damageElement ---

	test('accepts damageElement string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageElement: 'fire',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageElement).toBe('fire');
	});

	test('defaults damageElement to empty string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageElement).toBe('');
	});

	test('accepts empty damageElement string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageElement: '',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageElement).toBe('');
	});

	// --- damageInterval ---

	test('accepts damageInterval at minimum (1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageInterval: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageInterval).toBe(1);
	});

	test('accepts damageInterval at maximum (999)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageInterval: 999,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageInterval).toBe(999);
	});

	test('defaults damageInterval to 1', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.damageInterval).toBe(1);
	});

	test('rejects damageInterval above maximum (1000)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageInterval: 1000,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects damageInterval below minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageInterval: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer damageInterval', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			damageInterval: 1.5,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- reflectionOpacity ---

	test('accepts reflectionOpacity at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			reflectionOpacity: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reflectionOpacity).toBe(0);
	});

	test('accepts reflectionOpacity at maximum (1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			reflectionOpacity: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reflectionOpacity).toBe(1);
	});

	test('accepts reflectionOpacity fractional (0.75)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			reflectionOpacity: 0.75,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reflectionOpacity).toBe(0.75);
	});

	test('defaults reflectionOpacity to 0.5', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.reflectionOpacity).toBe(0.5);
	});

	test('rejects reflectionOpacity above maximum (1.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			reflectionOpacity: 1.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects reflectionOpacity below minimum (-0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			reflectionOpacity: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- glowColor ---

	test('accepts glowColor hex string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			glowColor: '#ff0000ff',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowColor).toBe('#ff0000ff');
	});

	test('defaults glowColor to #ffffffff', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowColor).toBe('#ffffffff');
	});

	// --- glowIntensity ---

	test('accepts glowIntensity at minimum (0)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			glowIntensity: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowIntensity).toBe(0);
	});

	test('accepts glowIntensity at maximum (1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			glowIntensity: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowIntensity).toBe(1);
	});

	test('accepts glowIntensity fractional (0.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			glowIntensity: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowIntensity).toBe(0.5);
	});

	test('defaults glowIntensity to 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowIntensity).toBe(0);
	});

	test('rejects glowIntensity above maximum (1.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			glowIntensity: 1.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects glowIntensity below minimum (-0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			glowIntensity: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Collision shapes (Task 4)
	// =========================================================================

	test('accepts empty collisionShapes array', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.collisionShapes).toEqual([]);
	});

	test('accepts single rect collision shape', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [
				{
					type: 'rect',
					points: [
						{ x: 0, y: 0 },
						{ x: 1, y: 0 },
						{ x: 1, y: 1 },
						{ x: 0, y: 1 },
					],
				},
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.collisionShapes).toHaveLength(1);
		const [firstShape] = result.data.collisionShapes;
		expect(firstShape).toBeDefined();
		if (!firstShape) return;
		expect(firstShape.type).toBe('rect');
		expect(firstShape.points).toHaveLength(4);
	});

	test('accepts collision shape with all fields', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [
				{
					type: 'polygon',
					points: [
						{ x: 0.1, y: 0.2 },
						{ x: 0.8, y: 0.2 },
						{ x: 0.5, y: 0.9 },
					],
					isTrigger: true,
					collisionGroup: 'water',
					collisionMask: ['wall', 'barrier'],
					oneWay: true,
					oneWayDirection: 'north',
					height: 5,
					enabled: false,
				},
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const [shape] = result.data.collisionShapes;
		expect(shape).toBeDefined();
		if (!shape) return;
		expect(shape.type).toBe('polygon');
		expect(shape.isTrigger).toBe(true);
		expect(shape.collisionGroup).toBe('water');
		expect(shape.collisionMask).toEqual(['wall', 'barrier']);
		expect(shape.oneWay).toBe(true);
		expect(shape.oneWayDirection).toBe('north');
		expect(shape.height).toBe(5);
		expect(shape.enabled).toBe(false);
	});

	test('accepts multiple collision shapes', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [
				{
					type: 'rect',
					points: [
						{ x: 0, y: 0 },
						{ x: 1, y: 1 },
					],
				},
				{ type: 'circle', points: [{ x: 0.5, y: 0.5 }] },
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.collisionShapes).toHaveLength(2);
		const [first, second] = result.data.collisionShapes;
		expect(first).toBeDefined();
		expect(second).toBeDefined();
		if (!first || !second) return;
		expect(first.type).toBe('rect');
		expect(second.type).toBe('circle');
	});

	test('accepts polygon with multiple points', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [
				{
					type: 'polygon',
					points: [
						{ x: 0, y: 0 },
						{ x: 0.5, y: 0 },
						{ x: 1, y: 0.5 },
						{ x: 0.5, y: 1 },
						{ x: 0, y: 0.5 },
					],
				},
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const [firstShape] = result.data.collisionShapes;
		expect(firstShape).toBeDefined();
		if (!firstShape) return;
		expect(firstShape.points).toHaveLength(5);
	});

	test('accepts all shape types', () => {
		const shapeTypes: readonly string[] = ['rect', 'ellipse', 'polygon', 'polyline', 'circle'];
		for (const shapeType of shapeTypes) {
			const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
				collisionShapes: [{ type: shapeType, points: [{ x: 0.5, y: 0.5 }] }],
			});
			expect(result.ok).toBeTruthy();
			if (!result.ok) return;
			const [firstShape] = result.data.collisionShapes;
			expect(firstShape).toBeDefined();
			if (!firstShape) return;
			expect(firstShape.type).toBe(shapeType);
		}
	});

	test('accepts all oneWayDirection values', () => {
		const directions: readonly string[] = ['north', 'south', 'east', 'west'];
		for (const dir of directions) {
			const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
				collisionShapes: [
					{ type: 'rect', points: [{ x: 0, y: 0 }], oneWay: true, oneWayDirection: dir },
				],
			});
			expect(result.ok).toBeTruthy();
			if (!result.ok) return;
			const [firstShape] = result.data.collisionShapes;
			expect(firstShape).toBeDefined();
			if (!firstShape) return;
			expect(firstShape.oneWayDirection).toBe(dir);
		}
	});

	test('defaults collisionShape optional fields', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ type: 'rect', points: [{ x: 0, y: 0 }] }],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const [shape] = result.data.collisionShapes;
		expect(shape).toBeDefined();
		if (!shape) return;
		expect(shape.isTrigger).toBe(false);
		expect(shape.collisionGroup).toBe('wall');
		expect(shape.collisionMask).toEqual([]);
		expect(shape.oneWay).toBe(false);
		expect(shape.oneWayDirection).toBe('south');
		expect(shape.height).toBe(0);
		expect(shape.enabled).toBe(true);
	});

	test('rejects unknown shape type', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ type: 'triangle', points: [{ x: 0, y: 0 }] }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects point x above 1', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ type: 'rect', points: [{ x: 1.5, y: 0 }] }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects point y below 0', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ type: 'rect', points: [{ x: 0, y: -0.1 }] }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects collision shape height above 15', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ type: 'rect', points: [{ x: 0, y: 0 }], height: 16 }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects collision shape without type', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ points: [{ x: 0, y: 0 }] }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects collision shape without points', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			collisionShapes: [{ type: 'rect' }],
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Custom properties & tags (Task 5)
	// =========================================================================

	// --- properties field ---

	test('accepts properties with string value', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: { name: 'chest' },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual({ name: 'chest' });
	});

	test('accepts properties with number value', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: { weight: 42 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual({ weight: 42 });
	});

	test('accepts properties with boolean value', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: { locked: true },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual({ locked: true });
	});

	test('accepts properties with string array value', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: { items: ['key', 'potion'] },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual({ items: ['key', 'potion'] });
	});

	test('accepts properties with mixed value types', () => {
		const input: Record<string, unknown> = {
			name: 'chest',
			weight: 42,
			locked: true,
			items: ['key', 'potion'],
		};
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: input,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual(input);
	});

	test('accepts empty properties object', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: {},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual({});
	});

	test('defaults properties to empty object', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.properties).toEqual({});
	});

	test('rejects properties with null value', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			properties: { broken: null },
		});
		expect(result.ok).toBeFalsy();
	});

	// --- class field ---

	test('accepts class string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			class: 'treasure_chest',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data['class']).toBe('treasure_chest');
	});

	test('defaults class to empty string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data['class']).toBe('');
	});

	test('accepts empty class string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			class: '',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data['class']).toBe('');
	});

	// --- tags field ---

	test('accepts tags array', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			tags: ['flammable', 'destructible'],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tags).toEqual(['flammable', 'destructible']);
	});

	test('accepts empty tags array', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			tags: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tags).toEqual([]);
	});

	test('defaults tags to empty array', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tags).toEqual([]);
	});

	test('rejects tags with non-string element', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			tags: ['valid', 42],
		});
		expect(result.ok).toBeFalsy();
	});

	// --- scriptHook field ---

	test('accepts scriptHook string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			scriptHook: 'on_step_treasure',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.scriptHook).toBe('on_step_treasure');
	});

	test('defaults scriptHook to empty string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.scriptHook).toBe('');
	});

	test('accepts empty scriptHook string', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			scriptHook: '',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.scriptHook).toBe('');
	});

	// =========================================================================
	// Tile animation definition (Task 6)
	// =========================================================================

	// --- frames field ---

	test('accepts empty frames array', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.frames).toEqual([]);
	});

	test('accepts single animation frame', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [{ tileId: 0, duration: 100 }],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.frames).toHaveLength(1);
		const [frame0] = result.data.frames;
		expect(frame0).toBeDefined();
		if (!frame0) return;
		expect(frame0.tileId).toBe(0);
		expect(frame0.duration).toBe(100);
	});

	test('accepts multiple animation frames', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [
				{ tileId: 0, duration: 100 },
				{ tileId: 1, duration: 200 },
				{ tileId: 2, duration: 150 },
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.frames).toHaveLength(3);
		const [f0, f1, f2] = result.data.frames;
		expect(f0).toBeDefined();
		expect(f1).toBeDefined();
		expect(f2).toBeDefined();
		if (!f0 || !f1 || !f2) return;
		expect(f0.tileId).toBe(0);
		expect(f1.tileId).toBe(1);
		expect(f2.tileId).toBe(2);
	});

	test('defaults frames to empty array', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.frames).toEqual([]);
	});

	test('rejects frame with negative tileId', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [{ tileId: -1, duration: 100 }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects frame with non-integer tileId', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [{ tileId: 1.5, duration: 100 }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects frame with duration below 1', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [{ tileId: 0, duration: 0 }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects frame without tileId', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [{ duration: 100 }],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects frame without duration', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			frames: [{ tileId: 0 }],
		});
		expect(result.ok).toBeFalsy();
	});

	// --- playbackMode field ---

	test('accepts playbackMode "loop"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			playbackMode: 'loop',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.playbackMode).toBe('loop');
	});

	test('accepts playbackMode "pingPong"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			playbackMode: 'pingPong',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.playbackMode).toBe('pingPong');
	});

	test('accepts playbackMode "once"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			playbackMode: 'once',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.playbackMode).toBe('once');
	});

	test('accepts playbackMode "random"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			playbackMode: 'random',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.playbackMode).toBe('random');
	});

	test('defaults playbackMode to "loop"', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.playbackMode).toBe('loop');
	});

	test('rejects invalid playbackMode', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			playbackMode: 'reverse',
		});
		expect(result.ok).toBeFalsy();
	});

	// --- globalSync field ---

	test('accepts globalSync true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			globalSync: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.globalSync).toBe(true);
	});

	test('accepts globalSync false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			globalSync: false,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.globalSync).toBe(false);
	});

	test('defaults globalSync to true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.globalSync).toBe(true);
	});

	// --- speedMultiplier field ---

	test('accepts speedMultiplier at minimum (0.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			speedMultiplier: 0.1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.speedMultiplier).toBe(0.1);
	});

	test('accepts speedMultiplier at maximum (10)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			speedMultiplier: 10,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.speedMultiplier).toBe(10);
	});

	test('accepts speedMultiplier fractional (2.5)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			speedMultiplier: 2.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.speedMultiplier).toBe(2.5);
	});

	test('defaults speedMultiplier to 1', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.speedMultiplier).toBe(1);
	});

	test('rejects speedMultiplier above maximum (10.1)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			speedMultiplier: 10.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects speedMultiplier below minimum (0.09)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			speedMultiplier: 0.09,
		});
		expect(result.ok).toBeFalsy();
	});

	// --- pauseWhenOffscreen field ---

	test('accepts pauseWhenOffscreen true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			pauseWhenOffscreen: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.pauseWhenOffscreen).toBe(true);
	});

	test('accepts pauseWhenOffscreen false', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {
			pauseWhenOffscreen: false,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.pauseWhenOffscreen).toBe(false);
	});

	test('defaults pauseWhenOffscreen to true', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.pauseWhenOffscreen).toBe(true);
	});
});

// =============================================================================
// CollisionShapeSchema
// =============================================================================

describe('CollisionShapeSchema', () => {
	test('accepts minimal valid shape', () => {
		const result: Result<CollisionShape> = safeParse(CollisionShapeSchema, {
			type: 'rect',
			points: [{ x: 0, y: 0 }],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('rect');
		expect(result.data.points).toHaveLength(1);
	});

	test('defaults optional fields correctly', () => {
		const result: Result<CollisionShape> = safeParse(CollisionShapeSchema, {
			type: 'ellipse',
			points: [{ x: 0.5, y: 0.5 }],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.isTrigger).toBe(false);
		expect(result.data.collisionGroup).toBe('wall');
		expect(result.data.collisionMask).toEqual([]);
		expect(result.data.oneWay).toBe(false);
		expect(result.data.oneWayDirection).toBe('south');
		expect(result.data.height).toBe(0);
		expect(result.data.enabled).toBe(true);
	});

	test('rejects unknown type', () => {
		const result: Result<CollisionShape> = safeParse(CollisionShapeSchema, {
			type: 'hexagon',
			points: [{ x: 0, y: 0 }],
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// AnimationFrameSchema
// =============================================================================

describe('AnimationFrameSchema', () => {
	test('accepts valid animation frame', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 5,
			duration: 200,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tileId).toBe(5);
		expect(result.data.duration).toBe(200);
	});

	test('accepts tileId of 0', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 0,
			duration: 100,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tileId).toBe(0);
	});

	test('accepts duration of 1 (minimum)', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 0,
			duration: 1,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.duration).toBe(1);
	});

	test('rejects missing tileId', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			duration: 100,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing duration', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative tileId', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: -1,
			duration: 100,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer tileId', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 2.5,
			duration: 100,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects duration below 1', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 0,
			duration: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects fractional duration below 1', () => {
		const result: Result<AnimationFrame> = safeParse(AnimationFrameSchema, {
			tileId: 0,
			duration: 0.5,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// AnimationPlaybackModeSchema
// =============================================================================

describe('AnimationPlaybackModeSchema', () => {
	test('accepts "loop"', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(AnimationPlaybackModeSchema, 'loop');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('loop');
	});

	test('accepts "pingPong"', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(
			AnimationPlaybackModeSchema,
			'pingPong',
		);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('pingPong');
	});

	test('accepts "once"', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(AnimationPlaybackModeSchema, 'once');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('once');
	});

	test('accepts "random"', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(AnimationPlaybackModeSchema, 'random');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('random');
	});

	test('rejects invalid mode', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(AnimationPlaybackModeSchema, 'reverse');
		expect(result.ok).toBeFalsy();
	});

	test('rejects number input', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(AnimationPlaybackModeSchema, 0);
		expect(result.ok).toBeFalsy();
	});

	test('rejects null input', () => {
		const result: Result<AnimationPlaybackMode> = safeParse(AnimationPlaybackModeSchema, null);
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TerrainTypeSchema
// =============================================================================

describe('TerrainTypeSchema', () => {
	const TERRAIN_TYPES: readonly TerrainType[] = [
		'normal',
		'water',
		'deepWater',
		'lava',
		'ice',
		'sand',
		'swamp',
		'snow',
		'grass',
		'wood',
		'stone',
		'metal',
		'custom',
	];

	test('accepts all 13 terrain type values', () => {
		for (const terrainType of TERRAIN_TYPES) {
			const result: Result<TerrainType> = safeParse(TerrainTypeSchema, terrainType);
			expect(result.ok).toBeTruthy();
			if (!result.ok) return;
			expect(result.data).toBe(terrainType);
		}
	});

	test('rejects invalid terrain type string', () => {
		const result: Result<TerrainType> = safeParse(TerrainTypeSchema, 'dirt');
		expect(result.ok).toBeFalsy();
	});

	test('rejects number input', () => {
		const result: Result<TerrainType> = safeParse(TerrainTypeSchema, 0);
		expect(result.ok).toBeFalsy();
	});

	test('rejects null input', () => {
		const result: Result<TerrainType> = safeParse(TerrainTypeSchema, null);
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TilesetConfigSchema
// =============================================================================

describe('TilesetConfigSchema', () => {
	// =========================================================================
	// Valid inputs
	// =========================================================================

	test('accepts minimal tileset with required fields only', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, VALID_TILESET);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('ground');
		expect(result.data.imagePath).toBe('ground.png');
		expect(result.data.columns).toBe(8);
		expect(result.data.rows).toBe(6);
		expect(result.data.firstGid).toBe(1);
	});

	test('fills all defaults for optional fields', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, VALID_TILESET);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tileWidth).toBe(48);
		expect(result.data.tileHeight).toBe(48);
		expect(result.data.autotileType).toBe('none');
		expect(result.data.animationFrames).toBe(1);
		expect(result.data.animationSpeed).toBe(4);
		expect(result.data.tileProperties).toEqual({});
	});

	test('accepts full explicit tileset', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			name: 'water',
			imagePath: 'tilesets/water.png',
			tileWidth: 32,
			tileHeight: 32,
			columns: 16,
			rows: 12,
			firstGid: 49,
			autotileType: 'animated_terrain',
			animationFrames: 3,
			animationSpeed: 8,
			tileProperties: {
				'0': { height: 0, damageFloor: true },
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('water');
		expect(result.data.tileWidth).toBe(32);
		expect(result.data.autotileType).toBe('animated_terrain');
		expect(result.data.animationFrames).toBe(3);
		expect(result.data.animationSpeed).toBe(8);
		expect(result.data.tileProperties['0']?.damageFloor).toBeTruthy();
	});

	test('accepts firstGid of 0', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			firstGid: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.firstGid).toBe(0);
	});

	// =========================================================================
	// Autotile type variants
	// =========================================================================

	test('accepts autotileType "terrain_48"', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			autotileType: 'terrain_48',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.autotileType).toBe('terrain_48');
	});

	test('accepts autotileType "wall_16"', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			autotileType: 'wall_16',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.autotileType).toBe('wall_16');
	});

	test('accepts autotileType "animated_terrain"', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			autotileType: 'animated_terrain',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.autotileType).toBe('animated_terrain');
	});

	// =========================================================================
	// Rejection: missing required fields
	// =========================================================================

	test('rejects missing name', () => {
		const { name: _, ...rest } = VALID_TILESET;
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, rest);
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing imagePath', () => {
		const { imagePath: _, ...rest } = VALID_TILESET;
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, rest);
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing columns', () => {
		const { columns: _, ...rest } = VALID_TILESET;
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, rest);
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing rows', () => {
		const { rows: _, ...rest } = VALID_TILESET;
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, rest);
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing firstGid', () => {
		const { firstGid: _, ...rest } = VALID_TILESET;
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, rest);
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: invalid values
	// =========================================================================

	test('rejects empty name', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			name: '',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects empty imagePath', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			imagePath: '',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects columns of 0', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			columns: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects rows of 0', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			rows: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative firstGid', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			firstGid: -1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects tileWidth of 0', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			tileWidth: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects tileHeight of 0', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			tileHeight: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects invalid autotileType', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			autotileType: 'invalid',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects animationFrames of 0', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			animationFrames: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects animationSpeed below 0.1', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			animationSpeed: 0.05,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer columns', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			columns: 8.5,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<TilesetConfig> = safeParse(TilesetConfigSchema, {
			...VALID_TILESET,
			spacing: 2,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// TileLayerSchema
// =============================================================================

describe('TileLayerSchema', () => {
	// =========================================================================
	// Valid inputs
	// =========================================================================

	test('accepts minimal layer with required fields', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('ground');
		expect(result.data.type).toBe('ground');
		expect(result.data.data).toEqual([1]);
	});

	test('fills defaults for optional fields', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.visible).toBeTruthy();
		expect(result.data.opacity).toBe(1);
	});

	test('accepts layer with empty tile (0) data', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			name: 'overlay',
			type: 'upper1',
			data: [0, 0, 0, 0],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.data).toEqual([0, 0, 0, 0]);
	});

	test('accepts layer with explicit visibility and opacity', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			name: 'hidden',
			type: 'shadow',
			data: [1],
			visible: false,
			opacity: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.visible).toBeFalsy();
		expect(result.data.opacity).toBe(0.5);
	});

	// =========================================================================
	// Layer type variants
	// =========================================================================

	test('accepts type "ground"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'ground',
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts type "ground_deco"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'ground_deco',
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts type "upper1"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'upper1',
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts type "upper2"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'upper2',
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts type "shadow"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'shadow',
		});
		expect(result.ok).toBeTruthy();
	});

	// =========================================================================
	// Rejection: missing required fields
	// =========================================================================

	test('rejects missing name', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, { type: 'ground', data: [1] });
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing type', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, { name: 'ground', data: [1] });
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing data', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			name: 'ground',
			type: 'ground',
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: invalid values
	// =========================================================================

	test('rejects empty name', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, { ...VALID_LAYER_1X1, name: '' });
		expect(result.ok).toBeFalsy();
	});

	test('accepts custom layer type (any non-empty string)', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'overlay',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.type).toBe('overlay');
	});

	test('rejects empty layer type', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: '',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative tile ID in data', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			data: [-1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer tile ID in data', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			data: [1.5],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects opacity above 1', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			opacity: 1.1,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects opacity below 0', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			opacity: -0.1,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			unknownField: 42,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// kind field (discriminant)
	// =========================================================================

	test('defaults kind to "tile"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('tile');
	});

	test('accepts explicit kind=tile', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			kind: 'tile',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('tile');
	});

	test('rejects kind other than "tile"', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			kind: 'object',
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Visual properties
	// =========================================================================

	test('defaults visual properties', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tintColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
		expect(result.data.brightness).toBe(0);
		expect(result.data.saturation).toBe(1);
		expect(result.data.contrast).toBe(1);
	});

	test('accepts custom tintColor', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			tintColor: { r: 0.5, g: 0.2, b: 0.8, a: 0.9 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tintColor.r).toBe(0.5);
	});

	test('rejects brightness outside range', () => {
		const over: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			brightness: 2,
		});
		expect(over.ok).toBeFalsy();
		const under: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			brightness: -2,
		});
		expect(under.ok).toBeFalsy();
	});

	// =========================================================================
	// Transform properties
	// =========================================================================

	test('defaults transform properties', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.offsetX).toBe(0);
		expect(result.data.offsetY).toBe(0);
		expect(result.data.parallaxFactorX).toBe(1);
		expect(result.data.parallaxFactorY).toBe(1);
		expect(result.data.parallaxOriginX).toBe(0);
		expect(result.data.parallaxOriginY).toBe(0);
		expect(result.data.scaleX).toBe(1);
		expect(result.data.scaleY).toBe(1);
	});

	test('rejects scaleX below 0.1', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			scaleX: 0.05,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects scaleY above 10', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			scaleY: 11,
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rendering properties
	// =========================================================================

	test('defaults rendering properties', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.renderOrder).toBe(0);
		expect(result.data.castShadows).toBe(false);
		expect(result.data.receiveShadows).toBe(true);
		expect(result.data.depthWrite).toBe(true);
		expect(result.data.maskLayer).toBe('');
		expect(result.data.cullingPadding).toBe(0);
		expect(result.data.ySortEnabled).toBe(false);
		expect(result.data.blendMode).toBe('alpha');
	});

	test('rejects cullingPadding above 16', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			cullingPadding: 17,
		});
		expect(result.ok).toBeFalsy();
	});

	test('accepts valid blendMode', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			blendMode: 'additive',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.blendMode).toBe('additive');
	});

	// =========================================================================
	// Editor properties
	// =========================================================================

	test('defaults editor properties', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, VALID_LAYER_1X1);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.locked).toBe(false);
		expect(result.data.collapsed).toBe(false);
		expect(result.data.color).toBe('');
	});
});

// =============================================================================
// MapObjectShapeSchema
// =============================================================================

describe('MapObjectShapeSchema', () => {
	test('accepts all valid shapes', () => {
		const shapes: readonly string[] = ['rect', 'ellipse', 'point', 'polygon', 'polyline'];
		for (const shape of shapes) {
			const result: Result<MapObjectShape> = safeParse(MapObjectShapeSchema, shape);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid shape', () => {
		const result: Result<MapObjectShape> = safeParse(MapObjectShapeSchema, 'triangle');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// DrawOrderSchema
// =============================================================================

describe('DrawOrderSchema', () => {
	test('accepts "topdown"', () => {
		const result: Result<DrawOrder> = safeParse(DrawOrderSchema, 'topdown');
		expect(result.ok).toBeTruthy();
	});

	test('accepts "index"', () => {
		const result: Result<DrawOrder> = safeParse(DrawOrderSchema, 'index');
		expect(result.ok).toBeTruthy();
	});

	test('rejects invalid draw order', () => {
		const result: Result<DrawOrder> = safeParse(DrawOrderSchema, 'manual');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// MapObjectSchema
// =============================================================================

describe('MapObjectSchema', () => {
	test('accepts minimal object', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: 'spawn-1',
			x: 10,
			y: 20,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.id).toBe('spawn-1');
		expect(result.data.x).toBe(10);
		expect(result.data.y).toBe(20);
	});

	test('fills defaults for optional fields', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: 'obj-1',
			x: 0,
			y: 0,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('');
		expect(result.data.class).toBe('');
		expect(result.data.width).toBe(0);
		expect(result.data.height).toBe(0);
		expect(result.data.rotation).toBe(0);
		expect(result.data.shape).toBe('rect');
		expect(result.data.points).toEqual([]);
		expect(result.data.visible).toBe(true);
		expect(result.data.customProperties).toEqual({});
	});

	test('accepts full object with all fields', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: 'npc-1',
			name: 'Merchant',
			class: 'npc',
			x: 128,
			y: 256,
			width: 32,
			height: 48,
			rotation: 90,
			shape: 'ellipse',
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 20 },
			],
			visible: false,
			customProperties: { dialogue: 'hello', level: 5 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('Merchant');
		expect(result.data.shape).toBe('ellipse');
		expect(result.data.rotation).toBe(90);
	});

	test('rejects empty id', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: '',
			x: 0,
			y: 0,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative width', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: 'obj',
			x: 0,
			y: 0,
			width: -5,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects rotation above 360', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: 'obj',
			x: 0,
			y: 0,
			rotation: 361,
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects unknown properties', () => {
		const result: Result<MapObject> = safeParse(MapObjectSchema, {
			id: 'obj',
			x: 0,
			y: 0,
			unknownProp: true,
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// ObjectLayerSchema
// =============================================================================

describe('ObjectLayerSchema', () => {
	test('accepts minimal object layer', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'object',
			name: 'spawns',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('object');
		expect(result.data.name).toBe('spawns');
		expect(result.data.objects).toEqual([]);
	});

	test('accepts object layer with objects', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'object',
			name: 'npcs',
			objects: [
				{ id: 'npc-1', x: 32, y: 64, name: 'Merchant', class: 'npc' },
				{ id: 'npc-2', x: 128, y: 96 },
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.objects).toHaveLength(2);
		expect(result.data.objects[0]?.name).toBe('Merchant');
	});

	test('defaults optional fields', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'object',
			name: 'events',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.drawOrder).toBe('topdown');
		expect(result.data.visible).toBe(true);
		expect(result.data.opacity).toBe(1);
		expect(result.data.tintColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
		expect(result.data.brightness).toBe(0);
		expect(result.data.saturation).toBe(1);
		expect(result.data.contrast).toBe(1);
		expect(result.data.offsetX).toBe(0);
		expect(result.data.offsetY).toBe(0);
		expect(result.data.locked).toBe(false);
	});

	test('rejects missing kind', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			name: 'spawns',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects wrong kind', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'tile',
			name: 'spawns',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing name', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'object',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects empty name', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'object',
			name: '',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects invalid object in objects array', () => {
		const result: Result<ObjectLayer> = safeParse(ObjectLayerSchema, {
			kind: 'object',
			name: 'bad',
			objects: [{ id: '', x: 0, y: 0 }],
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// GroupLayerSchema
// =============================================================================

describe('GroupLayerSchema', () => {
	test('accepts minimal group layer', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
			name: 'Buildings',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('group');
		expect(result.data.name).toBe('Buildings');
		expect(result.data.children).toEqual([]);
	});

	test('accepts group with tile layer children', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
			name: 'terrain',
			children: [
				{ name: 'ground', type: 'ground', data: [1, 2, 3] },
				{ kind: 'tile', name: 'deco', type: 'ground_deco', data: [0, 0, 1] },
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.children).toHaveLength(2);
	});

	test('accepts nested group layers', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
			name: 'outer',
			children: [
				{
					kind: 'group',
					name: 'inner',
					children: [{ name: 'base', type: 'ground', data: [1] }],
				},
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.children).toHaveLength(1);
	});

	test('accepts group with object layer children', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
			name: 'world',
			children: [
				{
					kind: 'object',
					name: 'npcs',
					objects: [{ id: 'npc-1', x: 0, y: 0 }],
				},
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.children).toHaveLength(1);
	});

	test('defaults optional fields', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
			name: 'test',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.visible).toBe(true);
		expect(result.data.opacity).toBe(1);
		expect(result.data.tintColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
		expect(result.data.brightness).toBe(0);
		expect(result.data.saturation).toBe(1);
		expect(result.data.contrast).toBe(1);
		expect(result.data.offsetX).toBe(0);
		expect(result.data.offsetY).toBe(0);
		expect(result.data.locked).toBe(false);
	});

	test('rejects missing kind', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			name: 'Buildings',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing name', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects empty name', () => {
		const result: Result<GroupLayer> = safeParse(GroupLayerSchema, {
			kind: 'group',
			name: '',
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// LayerSchema — discriminated union
// =============================================================================

describe('LayerSchema — discriminated union', () => {
	test('accepts tile layer (backward compat, no kind)', () => {
		const result: Result<Layer> = safeParse(LayerSchema, {
			name: 'ground',
			type: 'ground',
			data: [1],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('tile');
	});

	test('accepts tile layer with explicit kind=tile', () => {
		const result: Result<Layer> = safeParse(LayerSchema, {
			kind: 'tile',
			name: 'ground',
			type: 'ground',
			data: [1],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('tile');
	});

	test('accepts object layer', () => {
		const result: Result<Layer> = safeParse(LayerSchema, {
			kind: 'object',
			name: 'events',
			objects: [{ id: 'ev-1', x: 0, y: 0 }],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('object');
	});

	test('accepts group layer', () => {
		const result: Result<Layer> = safeParse(LayerSchema, {
			kind: 'group',
			name: 'world',
			children: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.kind).toBe('group');
	});

	test('discriminates correctly for MapDataSchema.layers', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [
				{ name: 'ground', type: 'ground', data: [1] },
				{ kind: 'object', name: 'events', objects: [] },
				{ kind: 'group', name: 'overlays', children: [] },
			],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.layers).toHaveLength(3);
		expect(result.data.layers[0]?.kind).toBe('tile');
		expect(result.data.layers[1]?.kind).toBe('object');
		expect(result.data.layers[2]?.kind).toBe('group');
	});
});

// =============================================================================
// MapDataSchema
// =============================================================================

describe('MapDataSchema', () => {
	// =========================================================================
	// Valid inputs
	// =========================================================================

	test('accepts minimal 1×1 map', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.width).toBe(1);
		expect(result.data.height).toBe(1);
	});

	test('fills defaults for optional fields', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.tileWidth).toBe(48);
		expect(result.data.tileHeight).toBe(48);
		expect(result.data.heightMap).toBeUndefined();
	});

	test('accepts full 32×32 map with multiple layers and tilesets', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 32,
			height: 32,
			tileWidth: 32,
			tileHeight: 32,
			tilesets: [
				{ ...VALID_TILESET, name: 'terrain', firstGid: 1 },
				{ ...VALID_TILESET, name: 'objects', firstGid: 49, imagePath: 'objects.png' },
			],
			layers: [
				validLayer(32, 32, 1),
				{ ...validLayer(32, 32, 0), name: 'deco', type: 'ground_deco' },
				{ ...validLayer(32, 32, 0), name: 'upper', type: 'upper1' },
				{ ...validLayer(32, 32, 0), name: 'upper2', type: 'upper2' },
			],
			heightMap: Array.from({ length: 1024 }, () => 0),
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.width).toBe(32);
		expect(result.data.height).toBe(32);
		expect(result.data.tileWidth).toBe(32);
		expect(result.data.tilesets).toHaveLength(2);
		expect(result.data.layers).toHaveLength(4);
		expect(result.data.heightMap).toHaveLength(1024);
	});

	test('accepts map with heightMap', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 2,
			height: 2,
			tilesets: [VALID_TILESET],
			layers: [validLayer(2, 2)],
			heightMap: [0, 1, 2, 3],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.heightMap).toEqual([0, 1, 2, 3]);
	});

	// =========================================================================
	// Boundary values
	// =========================================================================

	test('accepts width at minimum (1)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts width at maximum (500)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 500,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [validLayer(500, 1)],
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts height at maximum (500)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 500,
			tilesets: [VALID_TILESET],
			layers: [validLayer(1, 500)],
		});
		expect(result.ok).toBeTruthy();
	});

	test('accepts heightMap values at maximum (15)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			heightMap: [15],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.heightMap?.[0]).toBe(15);
	});

	// =========================================================================
	// Rejection: missing required fields
	// =========================================================================

	test('rejects missing width', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing height', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing tilesets', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects missing layers', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: invalid values
	// =========================================================================

	test('rejects width of 0', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 0,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative width', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: -1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects width above maximum (501)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 501,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects height of 0', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 0,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer width', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 10.5,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects tileWidth of 0', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tileWidth: 0,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects empty tilesets array', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects empty layers array', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects heightMap value above 15', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			heightMap: [16],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects heightMap with negative value', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			heightMap: [-1],
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects heightMap with non-integer value', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			heightMap: [1.5],
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			author: 'someone',
		});
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Post-processing integration
	// =========================================================================

	test('accepts map without postProcessing field', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.postProcessing).toBeUndefined();
	});

	test('accepts map with empty postProcessing (applies defaults)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			postProcessing: {},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.postProcessing?.enabled).toBe(true);
		expect(result.data.postProcessing?.preset).toBe('hd2d');
	});

	test('accepts map with full postProcessing config', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			postProcessing: {
				preset: 'cinematic',
				bloom: { weight: 0.3 },
				exposure: 0.9,
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.postProcessing?.preset).toBe('cinematic');
		expect(result.data.postProcessing?.bloom?.weight).toBe(0.3);
		expect(result.data.postProcessing?.exposure).toBe(0.9);
	});

	// =========================================================================
	// Lighting integration
	// =========================================================================

	test('accepts map without lighting field', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lighting).toBeUndefined();
	});

	test('accepts map with empty lighting (applies defaults)', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			lighting: {},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lighting).toBeDefined();
		expect(result.data.lighting?.lights).toEqual([]);
	});

	test('accepts map with full lighting config', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, {
			width: 1,
			height: 1,
			tilesets: [VALID_TILESET],
			layers: [VALID_LAYER_1X1],
			lighting: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						intensity: 0.8,
						direction: { x: -0.5, y: -1, z: 0.3 },
						shadow: { enabled: true, type: 'cascade' },
					},
					{
						id: 'ambient',
						type: 'hemispheric',
						intensity: 0.6,
						direction: { x: 0, y: 1, z: 0 },
					},
				],
				dayNight: {
					enabled: true,
					timeOfDay: 12,
					speed: 0.5,
					sunLightId: 'sun',
				},
				glow: { enabled: true, intensity: 0.3 },
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lighting?.lights).toHaveLength(2);
		expect(result.data.lighting?.dayNight?.enabled).toBe(true);
		expect(result.data.lighting?.glow?.enabled).toBe(true);
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	test('rejects null input', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, null);
		expect(result.ok).toBeFalsy();
	});

	test('rejects undefined input', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, undefined);
		expect(result.ok).toBeFalsy();
	});

	test('rejects string input', () => {
		const result: Result<MapData> = safeParse(MapDataSchema, 'not a map');
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// ChunkConfigSchema
// =============================================================================

describe('ChunkConfigSchema', () => {
	// =========================================================================
	// Valid inputs
	// =========================================================================

	test('accepts empty object with default chunkSize', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.chunkSize).toBe(16);
	});

	test('accepts explicit chunkSize', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 32 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.chunkSize).toBe(32);
	});

	// =========================================================================
	// Boundary values
	// =========================================================================

	test('accepts chunkSize at minimum (4)', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 4 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.chunkSize).toBe(4);
	});

	test('accepts chunkSize at maximum (64)', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 64 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.chunkSize).toBe(64);
	});

	// =========================================================================
	// Rejection: invalid values
	// =========================================================================

	test('rejects chunkSize below minimum (3)', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 3 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects chunkSize above maximum (65)', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 65 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects non-integer chunkSize', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 16.5 });
		expect(result.ok).toBeFalsy();
	});

	// =========================================================================
	// Rejection: unknown properties (strictObject)
	// =========================================================================

	test('rejects unknown properties', () => {
		const result: Result<ChunkConfig> = safeParse(ChunkConfigSchema, { chunkSize: 16, overlap: 2 });
		expect(result.ok).toBeFalsy();
	});
});
