/**
 * Test map data — 32x32 map with 2 tilesets, 4 layers, heightMap.
 *
 * Generates map data programmatically to avoid hand-writing 1024-element arrays.
 * Uses LPC terrain_summer (ground) and plants_summer (decorations).
 *
 * @module
 */

import type { Num } from '@/schemas/common';

// =============================================================================
// Constants
// =============================================================================

const MAP_WIDTH: Num = 32;
const MAP_HEIGHT: Num = 32;
const TILE_SIZE: Num = 32;
const TILE_COUNT: Num = MAP_WIDTH * MAP_HEIGHT;

// Terrain tileset: 16 cols × 26 rows = 416 tiles, firstGid=1
const TERRAIN_COLS: Num = 16;
const TERRAIN_ROWS: Num = 26;
const TERRAIN_FIRST_GID: Num = 1;
const TERRAIN_TILE_COUNT: Num = TERRAIN_COLS * TERRAIN_ROWS;

// Plants tileset: 16 cols × 5 rows = 80 tiles, firstGid = 417
const PLANTS_COLS: Num = 16;
const PLANTS_ROWS: Num = 5;
const PLANTS_FIRST_GID: Num = TERRAIN_FIRST_GID + TERRAIN_TILE_COUNT;

// Tile IDs from terrain tileset (approximate LPC layout)
const GRASS_TILE: Num = 1;
const GRASS_ALT_1: Num = 2;
const GRASS_ALT_2: Num = 3;
const WATER_TILE: Num = 17; // row 2 area (water tiles)
const PATH_TILE: Num = 33; // row 3 area (path/dirt)

// Plateau dimensions (central area)
const PLATEAU_START_X: Num = 12;
const PLATEAU_END_X: Num = 20;
const PLATEAU_START_Z: Num = 12;
const PLATEAU_END_Z: Num = 20;
const PLATEAU_HEIGHT: Num = 2;

// Water area (bottom-left corner)
const WATER_START_X: Num = 2;
const WATER_END_X: Num = 8;
const WATER_START_Z: Num = 24;
const WATER_END_Z: Num = 30;

// =============================================================================
// Layer Generation
// =============================================================================

/**
 * Generates the ground layer data.
 *
 * Fills with grass tiles, adds a water pond and dirt path.
 *
 * @returns Flat tile data array (length = MAP_WIDTH * MAP_HEIGHT)
 */
function generateGroundLayer(): Num[] {
	const data: Num[] = Array.from({ length: TILE_COUNT }, () => GRASS_TILE);

	// Add variation with alternate grass tiles
	for (let i: Num = 0; i < TILE_COUNT; i++) {
		const x: Num = i % MAP_WIDTH;
		const z: Num = Math.floor(i / MAP_WIDTH);
		// Checkerboard-like variation
		if ((x + z) % 7 === 0) data[i] = GRASS_ALT_1;
		if ((x * 3 + z * 5) % 11 === 0) data[i] = GRASS_ALT_2;
	}

	// Water pond in bottom-left
	for (let z: Num = WATER_START_Z; z < WATER_END_Z; z++) {
		for (let x: Num = WATER_START_X; x < WATER_END_X; x++) {
			data[z * MAP_WIDTH + x] = WATER_TILE;
		}
	}

	// Dirt path from left to plateau
	for (let x: Num = 0; x < PLATEAU_START_X; x++) {
		data[16 * MAP_WIDTH + x] = PATH_TILE;
		data[15 * MAP_WIDTH + x] = PATH_TILE;
	}

	return data;
}

/**
 * Generates the ground decoration layer data.
 *
 * Scatters plant tiles from the plants tileset on grass areas.
 *
 * @returns Flat tile data array (length = MAP_WIDTH * MAP_HEIGHT)
 */
function generateDecoLayer(): Num[] {
	const data: Num[] = Array.from({ length: TILE_COUNT }, () => 0);

	// Deterministic scatter using modular arithmetic (no Math.random for reproducibility)
	for (let i: Num = 0; i < TILE_COUNT; i++) {
		const x: Num = i % MAP_WIDTH;
		const z: Num = Math.floor(i / MAP_WIDTH);

		// Skip water area, path, and plateau
		if (x >= WATER_START_X && x < WATER_END_X && z >= WATER_START_Z && z < WATER_END_Z) continue;
		if ((z === 15 || z === 16) && x < PLATEAU_START_X) continue;
		if (x >= PLATEAU_START_X && x < PLATEAU_END_X && z >= PLATEAU_START_Z && z < PLATEAU_END_Z)
			continue;

		// Sparse scatter: ~10% of tiles get decorations
		if ((x * 7 + z * 13 + 3) % 10 === 0) {
			// Use plants tileset tiles (firstGid + 0..15 for row 1)
			const plantId: Num = PLANTS_FIRST_GID + ((x * 3 + z * 5) % 16);
			data[i] = plantId;
		}
	}

	return data;
}

/**
 * Generates the upper1 layer data (trees/tall objects).
 *
 * Places some tiles on the plateau area.
 *
 * @returns Flat tile data array (length = MAP_WIDTH * MAP_HEIGHT)
 */
function generateUpper1Layer(): Num[] {
	const data: Num[] = Array.from({ length: TILE_COUNT }, () => 0);

	// Place a few larger plants/trees on the plateau edges
	const treeTile: Num = PLANTS_FIRST_GID + 32; // Row 3 of plants tileset
	const positions: ReadonlyArray<readonly [Num, Num]> = [
		[13, 13],
		[18, 13],
		[13, 18],
		[18, 18],
		[15, 11],
		[16, 11],
		[15, 20],
		[16, 20],
	];

	for (const [x, z] of positions) {
		data[z * MAP_WIDTH + x] = treeTile;
	}

	return data;
}

/**
 * Generates the height map data.
 *
 * Central 8x8 plateau at height 2, rest at 0.
 *
 * @returns Flat height data array (length = MAP_WIDTH * MAP_HEIGHT)
 */
function generateHeightMap(): Num[] {
	const data: Num[] = Array.from({ length: TILE_COUNT }, () => 0);

	for (let z: Num = PLATEAU_START_Z; z < PLATEAU_END_Z; z++) {
		for (let x: Num = PLATEAU_START_X; x < PLATEAU_END_X; x++) {
			data[z * MAP_WIDTH + x] = PLATEAU_HEIGHT;
		}
	}

	return data;
}

// =============================================================================
// Exported Map Data
// =============================================================================

/**
 * 32x32 test map with terrain and decoration tilesets.
 *
 * Features:
 * - Grass ground with variation
 * - Water pond in bottom-left
 * - Dirt path leading to central plateau
 * - Central 8x8 plateau (height 2) with cliff faces
 * - Scattered plant decorations
 * - Tree-like objects on plateau edges
 */
export const TEST_MAP_DATA: Record<string, unknown> = {
	width: MAP_WIDTH,
	height: MAP_HEIGHT,
	tileWidth: TILE_SIZE,
	tileHeight: TILE_SIZE,
	tilesets: [
		{
			name: 'terrain',
			imagePath: 'tilesets/lpc-terrain/terrain_summer.png',
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
			columns: TERRAIN_COLS,
			rows: TERRAIN_ROWS,
			firstGid: TERRAIN_FIRST_GID,
			autotileType: 'none',
			animationFrames: 1,
			animationSpeed: 4,
			tileProperties: {},
		},
		{
			name: 'plants',
			imagePath: 'tilesets/lpc-terrain/plants_summer.png',
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
			columns: PLANTS_COLS,
			rows: PLANTS_ROWS,
			firstGid: PLANTS_FIRST_GID,
			autotileType: 'none',
			animationFrames: 1,
			animationSpeed: 4,
			tileProperties: {},
		},
	],
	layers: [
		{
			name: 'ground',
			type: 'ground',
			data: generateGroundLayer(),
			visible: true,
			opacity: 1,
		},
		{
			name: 'ground_deco',
			type: 'ground_deco',
			data: generateDecoLayer(),
			visible: true,
			opacity: 1,
		},
		{
			name: 'upper1',
			type: 'upper1',
			data: generateUpper1Layer(),
			visible: true,
			opacity: 1,
		},
		{
			name: 'shadow',
			type: 'shadow',
			data: Array.from({ length: TILE_COUNT }, () => 0),
			visible: true,
			opacity: 0.5,
		},
	],
	heightMap: generateHeightMap(),
};
