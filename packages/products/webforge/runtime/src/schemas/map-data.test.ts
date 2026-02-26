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
	ChunkConfigSchema,
	MapDataSchema,
	TileLayerSchema,
	TilePropertiesSchema,
	TilesetConfigSchema,
	type ChunkConfig,
	type MapData,
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

	test('accepts terrainTag at maximum (7)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: 7 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.terrainTag).toBe(7);
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

	test('rejects terrainTag above maximum (8)', () => {
		const result: Result<TileProperties> = safeParse(TilePropertiesSchema, { terrainTag: 8 });
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

	test('rejects invalid layer type', () => {
		const result: Result<TileLayer> = safeParse(TileLayerSchema, {
			...VALID_LAYER_1X1,
			type: 'overlay',
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
			tint: '#ff0000',
		});
		expect(result.ok).toBeFalsy();
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
