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
// =============================================================================

// Grass center fills (row 0, cols 0-1)
const GRASS: Num = t(0, 0);
const GRASS_V: Num = t(0, 1);

// Dirt center fills (row 1, cols 4-5)
const DIRT: Num = t(1, 4);
const DIRT_V: Num = t(1, 5);

// Grass-dirt transition edges (approximate LPC blob positions)
const GD_EDGE_N: Num = t(3, 0); // grass-dirt north edge
const GD_EDGE_S: Num = t(3, 1); // grass-dirt south edge
const GD_EDGE_W: Num = t(4, 0); // grass-dirt west edge
const GD_EDGE_E: Num = t(4, 1); // grass-dirt east edge
const GD_CORNER_NW: Num = t(0, 2); // grass-dirt outer corner NW
const GD_CORNER_NE: Num = t(0, 3); // grass-dirt outer corner NE
const GD_CORNER_SW: Num = t(1, 2); // grass-dirt outer corner SW
const GD_CORNER_SE: Num = t(1, 3); // grass-dirt outer corner SE

// Water tiles (row 11 area — open water surface)
const WATER: Num = t(11, 5);
const WATER_V: Num = t(11, 6);

// Water-grass edge tiles (rows 8-10 area)
const WG_EDGE_N: Num = t(8, 2); // water with grass edge north
const WG_EDGE_S: Num = t(9, 2); // water with grass edge south
const WG_EDGE_W: Num = t(8, 4); // water with grass edge west
const WG_EDGE_E: Num = t(9, 4); // water with grass edge east
const WG_CORNER_NW: Num = t(8, 0); // water outer corner NW
const WG_CORNER_NE: Num = t(8, 1); // water outer corner NE
const WG_CORNER_SW: Num = t(9, 0); // water outer corner SW
const WG_CORNER_SE: Num = t(9, 1); // water outer corner SE

// Plant decorations from plants_summer.png
const PLANT_1: Num = p(0, 0);
const PLANT_2: Num = p(0, 2);
const PLANT_3: Num = p(0, 4);
const PLANT_4: Num = p(1, 0);
const PLANT_5: Num = p(1, 2);
const BUSH_1: Num = p(2, 0);
const BUSH_2: Num = p(2, 2);

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

/** Check if position is inside a rectangle (inclusive start, exclusive end). */
function inRect(x: Num, z: Num, x1: Num, z1: Num, x2: Num, z2: Num): boolean {
	return x >= x1 && x < x2 && z >= z1 && z < z2;
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

	// --- Lake (oval-ish shape with edges) ---
	// Inner water
	const lakeCX: Num = (LAKE_X1 + LAKE_X2) / 2;
	const lakeCZ: Num = (LAKE_Z1 + LAKE_Z2) / 2;
	const lakeRX: Num = (LAKE_X2 - LAKE_X1) / 2 - 1;
	const lakeRZ: Num = (LAKE_Z2 - LAKE_Z1) / 2 - 1;

	for (let z: Num = LAKE_Z1; z < LAKE_Z2; z++) {
		for (let x: Num = LAKE_X1; x < LAKE_X2; x++) {
			// Ellipse test
			const dx: Num = (x - lakeCX) / lakeRX;
			const dz: Num = (z - lakeCZ) / lakeRZ;
			const dist: Num = dx * dx + dz * dz;

			if (dist <= 0.6) {
				// Deep water center
				data[idx(x, z)] = (x + z) % 2 === 0 ? WATER : WATER_V;
			} else if (dist <= 1.0) {
				// Water edge — use edge tiles based on direction from center
				const angle: Num = Math.atan2(dz, dx);
				if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
					data[idx(x, z)] = WG_EDGE_E;
				} else if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) {
					data[idx(x, z)] = WG_EDGE_S;
				} else if (angle > -(3 * Math.PI) / 4 && angle <= -Math.PI / 4) {
					data[idx(x, z)] = WG_EDGE_N;
				} else {
					data[idx(x, z)] = WG_EDGE_W;
				}
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

	const decorTiles: readonly Num[] = [PLANT_1, PLANT_2, PLANT_3, PLANT_4, PLANT_5, BUSH_1, BUSH_2];

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

	// Bushes around the lake
	for (let z: Num = LAKE_Z1 - 1; z <= LAKE_Z2; z++) {
		for (let x: Num = LAKE_X1 - 1; x <= LAKE_X2; x++) {
			if (x < 0 || x >= W || z < 0 || z >= H) continue;
			const dx2: Num = (x - (LAKE_X1 + LAKE_X2) / 2) / ((LAKE_X2 - LAKE_X1) / 2);
			const dz2: Num = (z - (LAKE_Z1 + LAKE_Z2) / 2) / ((LAKE_Z2 - LAKE_Z1) / 2);
			const dist: Num = dx2 * dx2 + dz2 * dz2;
			// Ring around lake edge
			if (dist > 1.0 && dist <= 1.5) {
				const hash3: Num = (x * 41 + z * 13) % 100;
				if (hash3 < 30) {
					data[idx(x, z)] = hash3 < 15 ? BUSH_1 : BUSH_2;
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
	const treeTile: Num = p(3, 0);
	const treeAlt: Num = p(3, 2);

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
