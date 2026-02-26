/**
 * Test map data — 32x32 RPG overworld area.
 *
 * Generates a realistic-looking map with:
 * - Grass meadow base with subtle variation
 * - North-south dirt road with east-west branch
 * - Small lake in the southwest
 * - Raised central plateau with cliff faces
 *
 * Uses LPC terrain_summer (ground) and plants_summer (decorations).
 *
 * @module
 */

import type { Num } from '@/schemas/common';

// =============================================================================
// Map Constants
// =============================================================================

const W: Num = 32;
const H: Num = 32;
const TILE_SIZE: Num = 32;
const TOTAL: Num = W * H;

// Terrain tileset: 16 cols × 26 rows, firstGid=1
// Tile ID = row * 16 + col + 1
const T_COLS: Num = 16;
const T_ROWS: Num = 26;
const T_GID: Num = 1;
const T_COUNT: Num = T_COLS * T_ROWS;

// Plants tileset: 16 cols × 5 rows, firstGid = 417
const P_COLS: Num = 16;
const P_ROWS: Num = 5;
const P_GID: Num = T_GID + T_COUNT;

// =============================================================================
// Tile ID Helpers
// =============================================================================

/** Convert terrain grid position to tile ID. */
function t(row: Num, col: Num): Num {
	return row * T_COLS + col + T_GID;
}

/** Convert plant grid position to tile ID. */
function p(row: Num, col: Num): Num {
	return row * P_COLS + col + P_GID;
}

// =============================================================================
// Tile Palette — LPC terrain_summer.png layout
// Verified by visual inspection of 4× scaled tile previews.
// NOTE: rows 0-1 cols 0-3 are transparent blob overlay parts — NOT standalone.
// =============================================================================

// Grass solid fills (row 1, cols 4-5 — confirmed solid green)
const GRASS: Num = t(1, 4);
const GRASS_V: Num = t(1, 5);

// Dirt/path solid fills (row 3, cols 3-4 — confirmed solid brown/cobble)
const DIRT: Num = t(3, 3);
const DIRT_V: Num = t(3, 4);

// Water solid fills (row 23 — confirmed solid deep blue)
const WATER: Num = t(23, 0);
const WATER_V: Num = t(23, 4);

// Plant decorations from plants_summer.png
const FLOWER_BUSH: Num = p(0, 0); // round light bush
const SMALL_BUSH: Num = p(0, 2); // dense bush cluster
const TALL_GRASS: Num = p(0, 8); // wheat/tall grass
const FLOWER: Num = p(0, 9); // small flower
const GRASS_TUFT: Num = p(0, 10); // grass tuft
const LILY_PAD: Num = p(2, 12); // lily pad (lake decoration)
const WATER_FLOWER: Num = p(2, 14); // blue water flower

// Tree tiles from plants_summer.png
const TREE_CYPRESS: Num = p(2, 0); // tall cypress
const TREE_MEDIUM: Num = p(2, 1); // medium tree
const TREE_SMALL: Num = p(2, 2); // small tree/shrub

// =============================================================================
// Map Layout Constants
// =============================================================================

// Dirt road: vertical road at x=15, horizontal branch at z=10
const ROAD_X: Num = 15;
const ROAD_BRANCH_Z: Num = 10;
const ROAD_BRANCH_START_X: Num = 4;

// Lake: southwest area
const LAKE_X1: Num = 3;
const LAKE_X2: Num = 10;
const LAKE_Z1: Num = 22;
const LAKE_Z2: Num = 28;

// Plateau: center-east area
const PLAT_X1: Num = 19;
const PLAT_X2: Num = 28;
const PLAT_Z1: Num = 4;
const PLAT_Z2: Num = 14;
const PLAT_HEIGHT: Num = 2;

// =============================================================================
// Helpers
// =============================================================================

/** Index into flat tile array. */
function idx(x: Num, z: Num): Num {
	return z * W + x;
}

/** Subtle grass variation based on position. */
function grassTile(x: Num, z: Num): Num {
	// Use a simple hash for natural-looking variation (~20% alternate tile)
	return (x * 7 + z * 13) % 5 === 0 ? GRASS_V : GRASS;
}

// =============================================================================
// Ground Layer — base terrain
// =============================================================================

function generateGround(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, (_, i) => {
		const x: Num = i % W;
		const z: Num = Math.floor(i / W);
		return grassTile(x, z);
	});

	// --- Dirt road (2 tiles wide, north-south) ---
	for (let z: Num = 0; z < H; z++) {
		// Skip where road crosses the lake
		if (z >= LAKE_Z1 && z < LAKE_Z2 && ROAD_X >= LAKE_X1 && ROAD_X < LAKE_X2) continue;

		data[idx(ROAD_X, z)] = z % 3 === 0 ? DIRT_V : DIRT;
		data[idx(ROAD_X + 1, z)] = z % 3 === 0 ? DIRT : DIRT_V;
	}

	// --- Dirt road (east-west branch at z=10, from x=4 to main road) ---
	for (let x: Num = ROAD_BRANCH_START_X; x <= ROAD_X; x++) {
		data[idx(x, ROAD_BRANCH_Z)] = x % 3 === 0 ? DIRT_V : DIRT;
		data[idx(x, ROAD_BRANCH_Z + 1)] = x % 3 === 0 ? DIRT : DIRT_V;
	}

	// --- Lake (oval shape — solid water fills, no edge transitions) ---
	const lakeCX: Num = (LAKE_X1 + LAKE_X2) / 2;
	const lakeCZ: Num = (LAKE_Z1 + LAKE_Z2) / 2;
	const lakeRX: Num = (LAKE_X2 - LAKE_X1) / 2 - 1;
	const lakeRZ: Num = (LAKE_Z2 - LAKE_Z1) / 2 - 1;

	for (let z: Num = LAKE_Z1; z < LAKE_Z2; z++) {
		for (let x: Num = LAKE_X1; x < LAKE_X2; x++) {
			const dx: Num = (x - lakeCX) / lakeRX;
			const dz: Num = (z - lakeCZ) / lakeRZ;
			if (dx * dx + dz * dz <= 1.0) {
				data[idx(x, z)] = (x + z) % 2 === 0 ? WATER : WATER_V;
			}
		}
	}

	// --- Plateau grass (same grass tiles, just at elevated height) ---
	// The plateau tiles are still grass — the height map handles elevation
	for (let z: Num = PLAT_Z1; z < PLAT_Z2; z++) {
		for (let x: Num = PLAT_X1; x < PLAT_X2; x++) {
			data[idx(x, z)] = grassTile(x, z);
		}
	}

	return data;
}

// =============================================================================
// Decoration Layer — plants and details on grass areas
// =============================================================================

function generateDecorations(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	const decorTiles: readonly Num[] = [FLOWER_BUSH, SMALL_BUSH, TALL_GRASS, FLOWER, GRASS_TUFT];

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			// Skip roads
			if (x === ROAD_X || x === ROAD_X + 1) continue;
			if (
				(z === ROAD_BRANCH_Z || z === ROAD_BRANCH_Z + 1) &&
				x >= ROAD_BRANCH_START_X &&
				x <= ROAD_X
			)
				continue;

			// Skip lake area
			const dx: Num = (x - (LAKE_X1 + LAKE_X2) / 2) / ((LAKE_X2 - LAKE_X1) / 2);
			const dz: Num = (z - (LAKE_Z1 + LAKE_Z2) / 2) / ((LAKE_Z2 - LAKE_Z1) / 2);
			if (dx * dx + dz * dz <= 1.2) continue;

			// Sparse placement (~8% of grass tiles)
			const hash: Num = (x * 31 + z * 17 + 7) % 100;
			if (hash < 8) {
				const tileIdx: Num = (x * 3 + z * 7) % decorTiles.length;
				data[idx(x, z)] = decorTiles[tileIdx]!;
			}
		}
	}

	// Dense flowers along the road edges
	for (let z: Num = 2; z < H - 2; z++) {
		const hash1: Num = (z * 23 + 5) % 100;
		const hash2: Num = (z * 29 + 11) % 100;

		// Left side of road
		if (hash1 < 25 && z !== ROAD_BRANCH_Z && z !== ROAD_BRANCH_Z + 1) {
			data[idx(ROAD_X - 1, z)] = decorTiles[(z * 3) % decorTiles.length]!;
		}
		// Right side of road
		if (hash2 < 25) {
			data[idx(ROAD_X + 2, z)] = decorTiles[(z * 5 + 1) % decorTiles.length]!;
		}
	}

	// Bushes around the lake shore
	for (let z: Num = LAKE_Z1 - 1; z <= LAKE_Z2; z++) {
		for (let x: Num = LAKE_X1 - 1; x <= LAKE_X2; x++) {
			if (x < 0 || x >= W || z < 0 || z >= H) continue;
			const lCX: Num = (LAKE_X1 + LAKE_X2) / 2;
			const lCZ: Num = (LAKE_Z1 + LAKE_Z2) / 2;
			const dx2: Num = (x - lCX) / ((LAKE_X2 - LAKE_X1) / 2);
			const dz2: Num = (z - lCZ) / ((LAKE_Z2 - LAKE_Z1) / 2);
			const dist: Num = dx2 * dx2 + dz2 * dz2;
			// Ring around lake edge — bushes on shore
			if (dist > 1.0 && dist <= 1.5) {
				const hash3: Num = (x * 41 + z * 13) % 100;
				if (hash3 < 30) {
					data[idx(x, z)] = hash3 < 15 ? FLOWER_BUSH : SMALL_BUSH;
				}
			}
			// Lily pads and water flowers ON the water
			if (dist > 0.3 && dist <= 0.8) {
				const hash4: Num = (x * 53 + z * 29) % 100;
				if (hash4 < 15) {
					data[idx(x, z)] = hash4 < 10 ? LILY_PAD : WATER_FLOWER;
				}
			}
		}
	}

	return data;
}

// =============================================================================
// Upper Layer — trees on the plateau edges
// =============================================================================

function generateUpper(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	// Trees along the north and south edges of the plateau
	const treeTile: Num = TREE_CYPRESS;
	const treeAlt: Num = TREE_MEDIUM;

	for (let x: Num = PLAT_X1; x < PLAT_X2; x++) {
		const hash: Num = (x * 37) % 100;
		if (hash < 40) {
			data[idx(x, PLAT_Z1)] = hash < 20 ? treeTile : treeAlt;
		}
		const hash2: Num = (x * 43 + 7) % 100;
		if (hash2 < 40) {
			data[idx(x, PLAT_Z2 - 1)] = hash2 < 20 ? treeTile : treeAlt;
		}
	}

	// Trees along west edge of plateau
	for (let z: Num = PLAT_Z1 + 1; z < PLAT_Z2 - 1; z++) {
		const hash: Num = (z * 53) % 100;
		if (hash < 35) {
			data[idx(PLAT_X1, z)] = hash < 18 ? treeTile : treeAlt;
		}
	}

	// Scattered trees in the northwest meadow
	for (let z: Num = 1; z < 8; z++) {
		for (let x: Num = 1; x < 12; x++) {
			if (x === ROAD_X || x === ROAD_X + 1) continue;
			const hash: Num = (x * 59 + z * 67) % 100;
			if (hash < 5) {
				data[idx(x, z)] = hash < 3 ? treeTile : treeAlt;
			}
		}
	}

	return data;
}

// =============================================================================
// Height Map — plateau elevation
// =============================================================================

function generateHeightMap(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	for (let z: Num = PLAT_Z1; z < PLAT_Z2; z++) {
		for (let x: Num = PLAT_X1; x < PLAT_X2; x++) {
			data[idx(x, z)] = PLAT_HEIGHT;
		}
	}

	return data;
}

// =============================================================================
// Exported Map Data
// =============================================================================

/**
 * 32x32 test map — RPG overworld area.
 *
 * Features:
 * - Grass meadow with subtle texture variation
 * - North-south dirt road (2 tiles wide) with east-west branch
 * - Oval lake in the southwest with water edge tiles
 * - Raised plateau (height 2) in the center-east with cliff faces
 * - Plant decorations scattered on grass, dense along road edges
 * - Bushes ringing the lake, trees on plateau edges and northwest meadow
 */
export const TEST_MAP_DATA: Record<string, unknown> = {
	width: W,
	height: H,
	tileWidth: TILE_SIZE,
	tileHeight: TILE_SIZE,
	tilesets: [
		{
			name: 'terrain',
			imagePath: 'tilesets/lpc-terrain/terrain_summer.png',
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
			columns: T_COLS,
			rows: T_ROWS,
			firstGid: T_GID,
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
			columns: P_COLS,
			rows: P_ROWS,
			firstGid: P_GID,
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
			data: generateGround(),
			visible: true,
			opacity: 1,
		},
		{
			name: 'ground_deco',
			type: 'ground_deco',
			data: generateDecorations(),
			visible: true,
			opacity: 1,
		},
		{
			name: 'upper1',
			type: 'upper1',
			data: generateUpper(),
			visible: true,
			opacity: 1,
		},
		{
			name: 'shadow',
			type: 'shadow',
			data: Array.from({ length: TOTAL }, () => 0),
			visible: true,
			opacity: 0.5,
		},
	],
	heightMap: generateHeightMap(),
};
