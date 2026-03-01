/**
 * Professional test map — 32×32 RPG village scene.
 *
 * Hand-crafted layout with 7 distinct zones designed to showcase every engine
 * feature (fog, glow, shadows, height map, day/night, volumetric lighting,
 * post-FX, multiple camera modes).
 *
 * Uses 6 autotile tilesets (grass, darkGrass, dirt, cobble, water, sand) plus
 * 8 decoration tilesets (plants, trees, cliffs, flowers, mushrooms, rocks,
 * cliff-rocks, tilled soil) with season-swappable paths.
 *
 * The autotile system automatically generates edge/corner transitions between
 * different terrain types using RPG Maker A2 sub-tile composition.
 *
 * Zones:
 * - Forest (NW) — dense trees, mushrooms, fog/god-ray showcase
 * - Village (CW) — stone paths, houses, torches, shadow/glow showcase
 * - River (center) — water channel with bridge
 * - Lake & Shore (SW) — lake, lily pads, boulders
 * - Cliff Plateau (NE) — multi-level elevation, cliff face tiles
 * - Ruins (on cliff) — dark stone, point-light showcase
 * - Meadow & Farm (SE) — open field, wildflowers, day/night showcase
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

/** Number of tiles per autotile expansion (8×6 grid). */
const AUTOTILE_COUNT: Num = 48;

// =============================================================================
// Tileset GID Layout — 6 autotile + 8 decoration tilesets
// =============================================================================

// --- Autotile tilesets (terrain_48, each 48 tiles) ---
// Source: 2×3 compact (64×96), expanded to 8×6 (256×192) at build time.
// Tile IDs 1–288 are reserved for autotile terrain.

const GRASS_GID: Num = 1; // terrain-00: green grass
const DARK_GRASS_GID: Num = GRASS_GID + AUTOTILE_COUNT; // 49: dark forest grass
const DIRT_GID: Num = DARK_GRASS_GID + AUTOTILE_COUNT; // 97: brown dirt
const COBBLE_GID: Num = DIRT_GID + AUTOTILE_COUNT; // 145: stone cobblestone
const WATER_GID: Num = COBBLE_GID + AUTOTILE_COUNT; // 193: blue water
const SAND_GID: Num = WATER_GID + AUTOTILE_COUNT; // 241: light sand

// --- Decoration tilesets (non-autotile) ---

// 7. Plants: 16 cols × 5 rows = 80 tiles
const P_GID: Num = SAND_GID + AUTOTILE_COUNT; // 289
const P_COLS: Num = 16;
const P_ROWS: Num = 5;
const P_COUNT: Num = P_COLS * P_ROWS; // 80

// 8. Trees: 16 cols × 18 rows = 288 tiles
const TR_GID: Num = P_GID + P_COUNT; // 369
const TR_COLS: Num = 16;
const TR_ROWS: Num = 18;
const TR_COUNT: Num = TR_COLS * TR_ROWS; // 288

// 9. Cliffs: 16 cols × 14 rows = 224 tiles
const CL_GID: Num = TR_GID + TR_COUNT; // 657
const CL_COLS: Num = 16;
const CL_ROWS: Num = 14;
const CL_COUNT: Num = CL_COLS * CL_ROWS; // 224

// 10. Flowers: 11 cols × 5 rows = 55 tiles
const FL_GID: Num = CL_GID + CL_COUNT; // 881
const FL_COLS: Num = 11;
const FL_ROWS: Num = 5;
const FL_COUNT: Num = FL_COLS * FL_ROWS; // 55

// 11. Mushrooms: 6 cols × 5 rows = 30 tiles
const MU_GID: Num = FL_GID + FL_COUNT; // 936
const MU_COLS: Num = 6;
const MU_ROWS: Num = 5;
const MU_COUNT: Num = MU_COLS * MU_ROWS; // 30

// 12. Rocks (Grasslands): 6 cols × 12 rows = 72 tiles
const RK_GID: Num = MU_GID + MU_COUNT; // 966
const RK_COLS: Num = 6;
const RK_ROWS: Num = 12;
const RK_COUNT: Num = RK_COLS * RK_ROWS; // 72

// 13. Cliff Rocks: 6 cols × 4 rows = 24 tiles
const CR_GID: Num = RK_GID + RK_COUNT; // 1038
const CR_COLS: Num = 6;
const CR_ROWS: Num = 4;
const CR_COUNT: Num = CR_COLS * CR_ROWS; // 24

// 14. Tilled Soil: 8 cols × 8 rows = 64 tiles
const SO_GID: Num = CR_GID + CR_COUNT; // 1062
const SO_COLS: Num = 8;
const SO_ROWS: Num = 8;

// =============================================================================
// Tile ID Helpers
// =============================================================================

/**
 * Plant tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function p(row: Num, col: Num): Num {
	return row * P_COLS + col + P_GID;
}

/**
 * Tree tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function tr(row: Num, col: Num): Num {
	return row * TR_COLS + col + TR_GID;
}

/**
 * Cliff tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function cl(row: Num, col: Num): Num {
	return row * CL_COLS + col + CL_GID;
}

/**
 * Flower tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function fl(row: Num, col: Num): Num {
	return row * FL_COLS + col + FL_GID;
}

/**
 * Mushroom tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function mu(row: Num, col: Num): Num {
	return row * MU_COLS + col + MU_GID;
}

/**
 * Rock tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function rk(row: Num, col: Num): Num {
	return row * RK_COLS + col + RK_GID;
}

/**
 * Cliff rock tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function cr(row: Num, col: Num): Num {
	return row * CR_COLS + col + CR_GID;
}

/**
 * Soil tile ID from grid position.
 *
 * @param row - Tileset row index
 * @param col - Tileset column index
 * @returns Computed tile ID
 */
function so(row: Num, col: Num): Num {
	return row * SO_COLS + col + SO_GID;
}

// =============================================================================
// Tile Palette — verified by visual inspection of tileset images
// =============================================================================

// --- Autotile terrain GIDs ---
// For the ground layer, each cell stores the firstGid of its terrain type.
// The autotile resolver automatically picks the correct edge/corner frame (0-47)
// based on neighbors, so we only need the base GID here.
// Using readable aliases that match the old palette naming.
const GRASS: Num = GRASS_GID;
const DIRT: Num = DIRT_GID;
const SAND: Num = SAND_GID;
const WATER: Num = WATER_GID;
const STONE: Num = COBBLE_GID;

// --- Plants (plants_summer.png) ---
const FLOWER_BUSH: Num = p(0, 0);
const SMALL_BUSH: Num = p(0, 2);
const TALL_GRASS: Num = p(0, 8);
const FLOWER: Num = p(0, 9);
const GRASS_TUFT: Num = p(0, 10);
const LILY_PAD: Num = p(2, 12);
const WATER_FLOWER: Num = p(2, 14);

// --- Trees (trees_summer.png) ---
// Row 0-1: tree shadow sprites (dark/light ovals)
const TREE_SHADOW_DARK: Num = tr(0, 0);
const TREE_SHADOW_LIGHT: Num = tr(1, 0);
// Row 0-1 cols 4-15: deciduous tree canopies (various sizes)
const TREE_LARGE_1: Num = tr(0, 4); // large deciduous
const TREE_LARGE_2: Num = tr(0, 5);
const TREE_LARGE_3: Num = tr(0, 6);
const TREE_MED_1: Num = tr(2, 4); // medium deciduous
const TREE_MED_2: Num = tr(2, 5);
const TREE_MED_3: Num = tr(2, 6);
// Row 10-13: pine/evergreen trees
const PINE_LARGE_1: Num = tr(10, 4);
const PINE_LARGE_2: Num = tr(10, 5);
const PINE_MED_1: Num = tr(12, 4);
const PINE_MED_2: Num = tr(12, 5);
// Row 8: bare tree trunk
const TREE_DEAD: Num = tr(8, 0);
// Row 16-17: tree stump, trunk base
const TREE_STUMP: Num = tr(14, 0);

// --- Cliffs (cliff_summer.png) — verified by visual tile catalog ---
// Rows 0-4: cliff face autotile (brown cliff, transparent edges)
// Rows 5-8: cliff-grass transitions (green grass meeting cliff)
// Rows 9-13: cave, planks, specialty tiles
const CLIFF_FACE: Num = cl(2, 1); // solid brown cliff wall (center fill)
const CLIFF_BASE: Num = cl(3, 1); // cliff base/bottom (solid)
const CLIFF_GRASS_T: Num = cl(5, 1); // grass on top of cliff face
const _CLIFF_GRASS_L: Num = cl(6, 1); // grass on left of cliff face
const CLIFF_FACE_DEEP: Num = cl(7, 1); // deeper cliff wall variant

// --- Flowers (flowers.png) ---
const FLOWER_RED: Num = fl(0, 0);
const FLOWER_BLUE: Num = fl(0, 1);
const FLOWER_YELLOW: Num = fl(0, 3);
const FLOWER_PINK: Num = fl(0, 4);
const FLOWER_WHITE: Num = fl(0, 5);
const FLOWER_PURPLE: Num = fl(1, 0);
const FLOWER_ORANGE: Num = fl(1, 3);
const FLOWER_TALL_1: Num = fl(3, 0);
const FLOWER_TALL_2: Num = fl(3, 1);

// --- Mushrooms (mushrooms.png) ---
const MUSH_BROWN: Num = mu(0, 0);
const MUSH_TAN: Num = mu(0, 1);
const MUSH_GREEN: Num = mu(0, 2);
const MUSH_RED: Num = mu(0, 3);
const MUSH_SMALL_1: Num = mu(2, 0);
const MUSH_SMALL_2: Num = mu(2, 1);
const _MUSH_CLUSTER: Num = mu(4, 0);

// --- Rocks (Rocks, Grasslands.png) ---
const _ROCK_LARGE_1: Num = rk(0, 0); // 2×2 large boulder top-left
const _ROCK_LARGE_2: Num = rk(0, 1); // top-right
const _ROCK_LARGE_3: Num = rk(1, 0); // bottom-left
const _ROCK_LARGE_4: Num = rk(1, 1); // bottom-right
const ROCK_MED: Num = rk(2, 0); // medium rock
const ROCK_SMALL_1: Num = rk(4, 0); // small rock
const ROCK_SMALL_2: Num = rk(4, 1);
const ROCK_PEBBLE: Num = rk(6, 0); // pebble scatter

// --- Cliff Rocks (Rocks, Cliffs.png) ---
const _CROCK_LARGE: Num = cr(0, 0);
const _CROCK_MED: Num = cr(0, 2);
const _CROCK_SMALL: Num = cr(1, 0);

// --- Soil (tilled_soil.png) ---
const _SOIL_ROW: Num = so(0, 0); // tilled row
const _SOIL_BARE: Num = so(1, 0); // bare plowed soil
const _SOIL_CROSS: Num = so(2, 0); // cross-hatched soil

// =============================================================================
// Zone Boundaries
// =============================================================================

const ZONES = {
	forest: { x1: 0, z1: 0, x2: 13, z2: 8 },
	village: { x1: 0, z1: 9, x2: 14, z2: 21 },
	river: { x1: 15, z1: 0, x2: 17, z2: 31 },
	lake: { x1: 0, z1: 22, x2: 13, z2: 31 },
	plateau: { x1: 20, z1: 0, x2: 31, z2: 16 },
	ruins: { x1: 24, z1: 2, x2: 30, z2: 8 },
	meadow: { x1: 20, z1: 18, x2: 31, z2: 31 },
} as const;

// Bridge location
const BRIDGE_Z: Num = 14;

// Village paths — stone path tiles along these coordinates
const VILLAGE_MAIN_PATH_Z: Num = 14; // E-W main path
const VILLAGE_CROSS_PATH_X: Num = 7; // N-S cross path

// =============================================================================
// Helpers
// =============================================================================

/**
 * Index into flat tile array.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns Flat array index
 */
function idx(x: Num, z: Num): Num {
	return z * W + x;
}

/**
 * Pseudo-random hash for deterministic procedural placement.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @param seed - Hash seed for variation
 * @returns Deterministic value 0-99
 */
function hash(x: Num, z: Num, seed: Num): Num {
	return ((x * 31 + z * 17 + seed * 13) & 0x7f_ff_ff_ff) % 100;
}

/**
 * Check if position is in a rectangular zone.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @param zone - Rectangular zone bounds
 * @returns True if position is within the zone
 */
function inZone(
	x: Num,
	z: Num,
	zone: { readonly x1: Num; readonly z1: Num; readonly x2: Num; readonly z2: Num },
): boolean {
	return x >= zone.x1 && x < zone.x2 && z >= zone.z1 && z < zone.z2;
}

// Note: grassTile() is no longer needed — autotile terrain types
// don't need manual variation. The autotile resolver handles edge/corner
// transitions automatically based on neighbor analysis.

/**
 * Check if position is in the lake body (organic ellipse).
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if position falls within the lake ellipse
 */
function isLake(x: Num, z: Num): boolean {
	const cx: Num = 6;
	const cz: Num = 26;
	const rx: Num = 4.5;
	const rz: Num = 3.5;
	const dx: Num = (x - cx) / rx;
	const dz: Num = (z - cz) / rz;
	// Add slight irregularity via hash
	const noise: Num = (hash(x, z, 99) % 7) / 25;
	return dx * dx + dz * dz <= 1.0 + noise;
}

/**
 * Check if position is on the river.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if position is part of the river
 */
function isRiver(x: Num, z: Num): boolean {
	// River runs N-S at X=15-17, except where bridge crosses
	if (x < 15 || x > 17) return false;
	if (z === BRIDGE_Z || z === BRIDGE_Z - 1) return false; // bridge gap
	return true;
}

/**
 * Check if position is a village stone path.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if position is on a village path
 */
function isVillagePath(x: Num, z: Num): boolean {
	if (!inZone(x, z, ZONES.village)) return false;
	// Main E-W path (1 tile wide)
	if (z === VILLAGE_MAIN_PATH_Z && x >= 1 && x <= 14) return true;
	// N-S cross path (1 tile wide)
	if (x === VILLAGE_CROSS_PATH_X && z >= 10 && z <= 19) return true;
	// Small branch to cottage 1 (at X:4, Z:12)
	if (z === 12 && x >= 4 && x <= 6) return true;
	// Small branch to cottage 3 (at X:10, Z:17)
	if (z === 17 && x >= 8 && x <= 10) return true;
	return false;
}

// =============================================================================
// Ground Layer — base terrain for each zone
// =============================================================================

function generateGround(): Num[] {
	// Default: grass everywhere. The autotile resolver handles edge transitions.
	const data: Num[] = Array.from({ length: TOTAL }, () => GRASS);

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			const i: Num = idx(x, z);

			// --- Forest zone: dark grass ---
			if (inZone(x, z, ZONES.forest)) {
				data[i] = DARK_GRASS_GID;
				continue;
			}

			// --- Water features (river + lake) ---
			if (isRiver(x, z)) {
				data[i] = WATER;
				continue;
			}
			if (isLake(x, z)) {
				data[i] = WATER;
				continue;
			}

			// --- Bridge over river ---
			if (x >= 15 && x <= 17 && (z === BRIDGE_Z || z === BRIDGE_Z - 1)) {
				data[i] = STONE; // cobblestone bridge surface
				continue;
			}

			// --- Village stone paths ---
			if (isVillagePath(x, z)) {
				data[i] = STONE;
				continue;
			}

			// --- Ruins (stone floor on cliff top) ---
			if (inZone(x, z, ZONES.ruins)) {
				data[i] = STONE;
				continue;
			}

			// --- Meadow with tilled soil patches ---
			if (inZone(x, z, ZONES.meadow)) {
				// Dirt patches in center of meadow (farm area)
				if (x >= 23 && x <= 28 && z >= 22 && z <= 27) {
					data[i] = DIRT;
					continue;
				}
				// Sandy edges near river
				if (x >= 18 && x <= 19) {
					data[i] = SAND;
					continue;
				}
			}

			// --- Hillside transition (sand between river and plateau) ---
			if (x >= 18 && x <= 19 && z <= 16) {
				data[i] = SAND;
				continue;
			}

			// --- Default: grass (already set) ---
		}
	}

	return data;
}

// =============================================================================
// Decoration Layer — zone-specific ground details
// =============================================================================

function generateDecorations(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	const forestMushrooms: readonly Num[] = [
		MUSH_BROWN,
		MUSH_TAN,
		MUSH_GREEN,
		MUSH_RED,
		MUSH_SMALL_1,
		MUSH_SMALL_2,
	];
	const meadowFlowers: readonly Num[] = [
		FLOWER_RED,
		FLOWER_BLUE,
		FLOWER_YELLOW,
		FLOWER_PINK,
		FLOWER_WHITE,
		FLOWER_PURPLE,
		FLOWER_ORANGE,
		FLOWER_TALL_1,
		FLOWER_TALL_2,
	];
	const grassDecor: readonly Num[] = [FLOWER_BUSH, SMALL_BUSH, TALL_GRASS, FLOWER, GRASS_TUFT];

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			// Skip water
			if (isRiver(x, z) || isLake(x, z)) {
				// Lily pads on lake water
				if (isLake(x, z) && hash(x, z, 41) < 12) {
					data[idx(x, z)] = hash(x, z, 43) < 8 ? LILY_PAD : WATER_FLOWER;
				}
				continue;
			}
			// Skip paths and bridge
			if (isVillagePath(x, z)) continue;
			if (x >= 15 && x <= 17 && (z === BRIDGE_Z || z === BRIDGE_Z - 1)) continue;

			// --- Forest zone: mushrooms + grass ---
			if (inZone(x, z, ZONES.forest)) {
				if (hash(x, z, 47) < 10) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = forestMushrooms[hash(x, z, 49) % forestMushrooms.length]!;
				} else if (hash(x, z, 51) < 8) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = grassDecor[hash(x, z, 53) % grassDecor.length]!;
				}
				continue;
			}

			// --- Village zone: flowers near paths, grass tufts ---
			if (inZone(x, z, ZONES.village)) {
				// Flower beds near cottages
				if (
					((x >= 3 && x <= 5 && z >= 11 && z <= 13) ||
						(x >= 7 && x <= 9 && z >= 13 && z <= 15) ||
						(x >= 9 && x <= 11 && z >= 16 && z <= 18)) &&
					hash(x, z, 55) < 40
				) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = meadowFlowers[hash(x, z, 57) % meadowFlowers.length]!;
				}
				// Grass along path edges
				if (hash(x, z, 59) < 6) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = grassDecor[hash(x, z, 61) % grassDecor.length]!;
				}
				continue;
			}

			// --- Lake shore: rocks + bushes ---
			if (inZone(x, z, ZONES.lake) && !isLake(x, z)) {
				if (hash(x, z, 63) < 15) {
					data[idx(x, z)] = hash(x, z, 65) < 8 ? ROCK_SMALL_1 : FLOWER_BUSH;
				}
				continue;
			}

			// --- Meadow: wildflowers + flowers ---
			if (inZone(x, z, ZONES.meadow)) {
				// Skip tilled soil
				if (x >= 23 && x <= 28 && z >= 22 && z <= 27) continue;
				if (hash(x, z, 67) < 18) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = meadowFlowers[hash(x, z, 69) % meadowFlowers.length]!;
				} else if (hash(x, z, 71) < 8) {
					data[idx(x, z)] = TALL_GRASS;
				}
				continue;
			}

			// --- Plateau / ruins: scattered rocks ---
			if (inZone(x, z, ZONES.plateau)) {
				if (hash(x, z, 73) < 5) {
					data[idx(x, z)] = hash(x, z, 75) < 3 ? ROCK_PEBBLE : ROCK_SMALL_2;
				}
				continue;
			}

			// --- Default grass area: sparse decoration ---
			if (hash(x, z, 77) < 5) {
				// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
				data[idx(x, z)] = grassDecor[hash(x, z, 79) % grassDecor.length]!;
			}
		}
	}

	return data;
}

// =============================================================================
// Upper Layer — trees, cliff faces, large features
// =============================================================================

function generateUpper(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	const deciduousTrees: readonly Num[] = [
		TREE_LARGE_1,
		TREE_LARGE_2,
		TREE_LARGE_3,
		TREE_MED_1,
		TREE_MED_2,
		TREE_MED_3,
	];
	const pineTrees: readonly Num[] = [PINE_LARGE_1, PINE_LARGE_2, PINE_MED_1, PINE_MED_2];

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			// --- Forest zone: dense tree canopy ---
			if (inZone(x, z, ZONES.forest)) {
				// Skip very edge tiles and path areas
				if (x === 0 || z === 0) continue;
				// Dense deciduous + pine mix (~25% coverage)
				if (hash(x, z, 81) < 25) {
					if (hash(x, z, 83) < 15) {
						// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
						data[idx(x, z)] = deciduousTrees[hash(x, z, 85) % deciduousTrees.length]!;
					} else {
						// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
						data[idx(x, z)] = pineTrees[hash(x, z, 87) % pineTrees.length]!;
					}
				}
				continue;
			}

			// --- Cliff face tiles at plateau edge ---
			if (x === 19 && z >= 0 && z <= 16) {
				// West edge of plateau — cliff face (vertical wall)
				data[idx(x, z)] = hash(x, z, 89) < 40 ? CLIFF_FACE : CLIFF_FACE_DEEP;
				continue;
			}
			if (x === 20 && z >= 0 && z <= 16) {
				// Top of cliff — grass meeting cliff edge
				data[idx(x, z)] = CLIFF_GRASS_T;
				continue;
			}
			if (z === 17 && x >= 20 && x <= 31) {
				// South edge of plateau — cliff base
				data[idx(x, z)] = hash(x, z, 91) < 50 ? CLIFF_BASE : CLIFF_GRASS_T;
				continue;
			}

			// --- Lake shore: large rocks ---
			if (inZone(x, z, ZONES.lake) && !isLake(x, z)) {
				if (hash(x, z, 93) < 6) {
					data[idx(x, z)] = ROCK_MED;
				}
				continue;
			}

			// --- Scattered village trees (sparse) ---
			if (inZone(x, z, ZONES.village)) {
				if (isVillagePath(x, z)) continue;
				if (hash(x, z, 95) < 4) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = deciduousTrees[hash(x, z, 97) % deciduousTrees.length]!;
				}
				continue;
			}

			// --- Plateau edge trees ---
			if (inZone(x, z, ZONES.plateau) && !inZone(x, z, ZONES.ruins)) {
				// Trees along the edge
				if ((x === 20 || x === 21) && z >= 1 && z <= 15 && hash(x, z, 99) < 30) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[idx(x, z)] = pineTrees[hash(x, z, 101) % pineTrees.length]!;
				}
				continue;
			}

			// --- Ruins: dead trees and stumps ---
			if (inZone(x, z, ZONES.ruins) && hash(x, z, 103) < 8) {
				data[idx(x, z)] = hash(x, z, 105) < 5 ? TREE_DEAD : TREE_STUMP;
			}
		}
	}

	return data;
}

// =============================================================================
// Shadow Layer — tree shadows, building ambient occlusion
// =============================================================================

function generateShadow(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			// --- Forest zone: shadow under trees ---
			if (inZone(x, z, ZONES.forest)) {
				if (hash(x, z, 81) < 25) {
					// Same hash as tree placement — shadow aligns with tree
					data[idx(x, z)] = hash(x, z, 107) < 50 ? TREE_SHADOW_DARK : TREE_SHADOW_LIGHT;
				}
				continue;
			}

			// --- Village scattered tree shadows ---
			if (inZone(x, z, ZONES.village) && hash(x, z, 95) < 4) {
				data[idx(x, z)] = TREE_SHADOW_LIGHT;
				continue;
			}

			// --- Plateau edge tree shadows ---
			if (
				inZone(x, z, ZONES.plateau) &&
				(x === 20 || x === 21) &&
				z >= 1 &&
				z <= 15 &&
				hash(x, z, 99) < 30
			) {
				data[idx(x, z)] = TREE_SHADOW_DARK;
			}
		}
	}

	return data;
}

// =============================================================================
// Height Map — multi-level elevation
// =============================================================================

function generateHeightMap(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 1); // default ground level

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			const i: Num = idx(x, z);

			// River channel — level 0
			if (isRiver(x, z)) {
				data[i] = 0;
			}

			// Lake — level 0
			if (isLake(x, z)) {
				data[i] = 0;
			}

			// Hillside transition — level 2
			if (x >= 18 && x <= 19 && z <= 16) {
				data[i] = 2;
			}

			// Cliff plateau — level 3
			if (x >= 20 && z <= 16) {
				data[i] = 3;
			}

			// Meadow stays at level 1 (default)
		}
	}

	return data;
}

// =============================================================================
// Season Tileset Paths — for hot-swapping
// =============================================================================

/**
 * Season-variant image paths for tilesets that have seasonal variants.
 *
 * Each autotile tileset has a seasonal variant in the autotile-expanded directory.
 * The terrain index (e.g., '00', '01') stays the same across seasons — the
 * splitter + expander scripts produce the same file names per season.
 */
export const SEASON_PATHS: Record<string, Record<string, string>> = {
	summer: {
		grass: 'tilesets/lpc-terrain/autotile-expanded/terrain-00.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-expanded/terrain-01.png',
		dirt: 'tilesets/lpc-terrain/autotile-expanded/terrain-02.png',
		cobble: 'tilesets/lpc-terrain/autotile-expanded/terrain-03.png',
		water: 'tilesets/lpc-terrain/autotile-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-expanded/terrain-07.png',
		plants: 'tilesets/lpc-terrain/plants_summer.png',
		trees: 'tilesets/lpc-terrain/trees_summer.png',
		cliffs: 'tilesets/lpc-terrain/cliff_summer.png',
	},
	spring: {
		grass: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-00.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-01.png',
		dirt: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-02.png',
		cobble: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-03.png',
		water: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-07.png',
		plants: 'tilesets/lpc-terrain/plants_spring.png',
		trees: 'tilesets/lpc-terrain/trees_spring.png',
		cliffs: 'tilesets/lpc-terrain/cliff_spring.png',
	},
	autumn: {
		grass: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-00.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-01.png',
		dirt: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-02.png',
		cobble: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-03.png',
		water: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-07.png',
		plants: 'tilesets/lpc-terrain/plants_autumn.png',
		trees: 'tilesets/lpc-terrain/trees_autumn.png',
		cliffs: 'tilesets/lpc-terrain/cliff_autumn.png',
	},
	winter: {
		grass: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-00.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-01.png',
		dirt: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-02.png',
		cobble: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-03.png',
		water: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-07.png',
		plants: 'tilesets/lpc-terrain/plants_winter.png',
		trees: 'tilesets/lpc-terrain/trees_winter.png',
		cliffs: 'tilesets/lpc-terrain/cliff_winter.png',
	},
};

// =============================================================================
// Atmosphere Presets
// =============================================================================

/** Pre-configured scene states for one-click feature testing. */
export const ATMOSPHERE_PRESETS: Record<
	string,
	{ readonly time: Num; readonly fog: string; readonly torches: boolean; readonly label: string }
> = {
	sunnyVillage: {
		time: 10,
		fog: 'clear',
		torches: false,
		label: 'Sunny Village',
	},
	dusk: { time: 18.5, fog: 'lightMist', torches: true, label: 'Dusk' },
	nightMarket: {
		time: 22,
		fog: 'clear',
		torches: true,
		label: 'Night Market',
	},
	foggyForest: {
		time: 6,
		fog: 'denseFog',
		torches: false,
		label: 'Foggy Forest',
	},
	cliffPanorama: {
		time: 12,
		fog: 'clear',
		torches: false,
		label: 'Cliff Panorama',
	},
	stormy: { time: 15, fog: 'morningFog', torches: true, label: 'Stormy' },
};

// =============================================================================
// 3D Prop Placement Data
// =============================================================================

/** Tile positions for 3D prop placement (used by dev.ts). */
export const PROP_POSITIONS = {
	cottages: [
		{ x: 4, z: 12, rotation: 0 },
		{ x: 8, z: 14, rotation: Math.PI / 6 },
		{ x: 10, z: 17, rotation: -Math.PI / 8 },
	],
	well: { x: 7, z: 14 },
	torches: [
		{ x: 3, z: 14 },
		{ x: 6, z: 14 },
		{ x: 9, z: 14 },
		{ x: 12, z: 14 },
		{ x: 7, z: 11 },
		{ x: 7, z: 17 },
	],
	bridge: { x: 15, z: BRIDGE_Z, width: 3 },
	boulders: [
		{ x: 2, z: 24, scale: 1.2 },
		{ x: 9, z: 23, scale: 0.8 },
		{ x: 5, z: 29, scale: 1.0 },
		{ x: 22, z: 5, scale: 1.1 },
		{ x: 25, z: 12, scale: 0.9 },
		{ x: 28, z: 14, scale: 1.3 },
		{ x: 30, z: 3, scale: 0.7 },
		{ x: 21, z: 15, scale: 1.0 },
	],
	barrels: [
		{ x: 5, z: 13 },
		{ x: 9, z: 15 },
		{ x: 11, z: 18 },
		{ x: 3, z: 11 },
	],
	crates: [
		{ x: 4, z: 13 },
		{ x: 8, z: 15 },
		{ x: 11, z: 17 },
	],
	fencePosts: (() => {
		const posts: Array<{ x: Num; z: Num; axis: 'x' | 'z' }> = [];
		// North fence (Z=9, X=0-14)
		for (let x: Num = 0; x <= 14; x += 2) {
			posts.push({ x, z: 9, axis: 'x' });
		}
		// South fence (Z=20, X=0-14)
		for (let x: Num = 0; x <= 14; x += 2) {
			posts.push({ x, z: 20, axis: 'x' });
		}
		return posts;
	})(),
} as const;

// =============================================================================
// Tileset Config Array
// =============================================================================

/**
 * Creates an autotile tileset config entry.
 *
 * @param name - Tileset name
 * @param terrainIndex - Terrain index from the A2 splitter (e.g., '00' for grass)
 * @param firstGid - First global tile ID for this tileset
 * @param terrainType - Terrain type for tile properties
 * @returns Tileset config record
 */
function autotileTileset(
	name: string,
	terrainIndex: string,
	firstGid: Num,
	terrainType: string,
): Record<string, unknown> {
	return {
		name,
		imagePath: `tilesets/lpc-terrain/autotile-expanded/terrain-${terrainIndex}.png`,
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: 2,
		rows: 3,
		firstGid,
		autotileType: 'terrain_48',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {
			0: { terrainType },
		},
	};
}

const TILESET_CONFIGS: ReadonlyArray<Record<string, unknown>> = [
	// --- Autotile terrain tilesets (2×3 compact, expanded to 8×6 by loader) ---
	autotileTileset('grass', '00', GRASS_GID, 'grass'),
	autotileTileset('darkGrass', '01', DARK_GRASS_GID, 'grass'),
	autotileTileset('dirt', '02', DIRT_GID, 'stone'),
	autotileTileset('cobble', '03', COBBLE_GID, 'stone'),
	autotileTileset('water', '24', WATER_GID, 'water'),
	autotileTileset('sand', '07', SAND_GID, 'sand'),

	// --- Decoration tilesets (non-autotile) ---
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
	{
		name: 'trees',
		imagePath: 'tilesets/lpc-terrain/trees_summer.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: TR_COLS,
		rows: TR_ROWS,
		firstGid: TR_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
	{
		name: 'cliffs',
		imagePath: 'tilesets/lpc-terrain/cliff_summer.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: CL_COLS,
		rows: CL_ROWS,
		firstGid: CL_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
	{
		name: 'flowers',
		imagePath: 'tilesets/lpc-terrain/flowers.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: FL_COLS,
		rows: FL_ROWS,
		firstGid: FL_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
	{
		name: 'mushrooms',
		imagePath: 'tilesets/lpc-terrain/mushrooms.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: MU_COLS,
		rows: MU_ROWS,
		firstGid: MU_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
	{
		name: 'rocks',
		imagePath: 'tilesets/lpc-terrain/Rocks, Grasslands.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: RK_COLS,
		rows: RK_ROWS,
		firstGid: RK_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
	{
		name: 'cliffRocks',
		imagePath: 'tilesets/lpc-terrain/Rocks, Cliffs.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: CR_COLS,
		rows: CR_ROWS,
		firstGid: CR_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
	{
		name: 'soil',
		imagePath: 'tilesets/lpc-terrain/tilled_soil.png',
		tileWidth: TILE_SIZE,
		tileHeight: TILE_SIZE,
		columns: SO_COLS,
		rows: SO_ROWS,
		firstGid: SO_GID,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	},
];

// =============================================================================
// Exported Map Data
// =============================================================================

/**
 * 32×32 professional test map — RPG village scene.
 *
 * Features 7 distinct zones (forest, village, river, lake, cliff plateau,
 * ruins, meadow/farm), 6 autotile terrain tilesets + 8 decoration tilesets,
 * multi-level height map, and full tile properties. The autotile system
 * automatically generates edge/corner transitions between terrain types.
 */
export const TEST_MAP_DATA: Record<string, unknown> = {
	width: W,
	height: H,
	tileWidth: TILE_SIZE,
	tileHeight: TILE_SIZE,
	tilesets: TILESET_CONFIGS,
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
			data: generateShadow(),
			visible: true,
			opacity: 0.4,
		},
	],
	heightMap: generateHeightMap(),
	postProcessing: { preset: 'hd2d' },
	lighting: {
		lights: [
			{
				id: 'ambient',
				type: 'hemispheric',
				intensity: 0.6,
				direction: { x: 0, y: 1, z: 0 },
				diffuse: { r: 0.5, g: 0.5, b: 0.45, a: 1 },
				groundColor: { r: 0.15, g: 0.15, b: 0.12, a: 1 },
			},
			{
				id: 'sun',
				type: 'directional',
				intensity: 0.8,
				direction: { x: -0.5, y: -1, z: 0.3 },
				diffuse: { r: 1, g: 0.95, b: 0.85, a: 1 },
				shadow: {
					enabled: true,
					type: 'cascade',
					mapSize: 2048,
					filteringQuality: 'medium',
					darkness: 0.4,
					cascadeBlendPercentage: 0.05,
					numCascades: 3,
				},
				volumetricLight: {
					enabled: true,
					samples: 50,
					density: 0.5,
					weight: 0.15,
					decay: 0.98,
					passRatio: 0.5,
				},
				lensFlare: {
					enabled: true,
					flares: [
						{
							size: 0.2,
							position: 0,
							color: { r: 1, g: 1, b: 1, a: 1 },
						},
						{
							size: 0.5,
							position: 0.2,
							color: { r: 0.5, g: 0.5, b: 1, a: 1 },
						},
						{
							size: 0.2,
							position: 1.0,
							color: { r: 1, g: 1, b: 1, a: 1 },
						},
					],
				},
			},
			// Village torches — warm point lights along paths
			{
				id: 'torch-1',
				type: 'point',
				intensity: 1.5,
				position: { x: 3, y: 1.5, z: 14 },
				colorTemperature: 2200,
				range: 12,
				meshRadius: 8,
				flicker: {
					type: 'torch',
					intensity: 0.25,
					speed: 1.2,
					colorShift: true,
					colorShiftRange: 150,
					positionJitter: 0.02,
				},
			},
			{
				id: 'torch-2',
				type: 'point',
				intensity: 1.3,
				position: { x: 6, y: 1.5, z: 14 },
				colorTemperature: 2100,
				range: 10,
				meshRadius: 7,
				flicker: {
					type: 'candle',
					intensity: 0.35,
					speed: 0.8,
					colorShift: true,
					colorShiftRange: 200,
				},
			},
			{
				id: 'torch-3',
				type: 'point',
				intensity: 1.4,
				position: { x: 9, y: 1.5, z: 14 },
				colorTemperature: 2200,
				range: 11,
				meshRadius: 7,
				flicker: {
					type: 'torch',
					intensity: 0.3,
					speed: 1.0,
					colorShift: true,
					colorShiftRange: 180,
					positionJitter: 0.015,
				},
			},
			{
				id: 'torch-4',
				type: 'point',
				intensity: 1.2,
				position: { x: 12, y: 1.5, z: 14 },
				colorTemperature: 1900,
				range: 10,
				meshRadius: 6,
				flicker: {
					type: 'candle',
					intensity: 0.4,
					speed: 0.7,
					colorShift: true,
					colorShiftRange: 250,
				},
			},
			{
				id: 'torch-5',
				type: 'point',
				intensity: 1.3,
				position: { x: 7, y: 1.5, z: 11 },
				colorTemperature: 2100,
				range: 10,
				meshRadius: 7,
				flicker: {
					type: 'torch',
					intensity: 0.25,
					speed: 1.1,
					colorShift: true,
					colorShiftRange: 160,
					positionJitter: 0.02,
				},
			},
			{
				id: 'torch-6',
				type: 'point',
				intensity: 1.4,
				position: { x: 7, y: 1.5, z: 17 },
				colorTemperature: 2200,
				range: 11,
				meshRadius: 7,
				flicker: {
					type: 'torch',
					intensity: 0.3,
					speed: 1.0,
					colorShift: true,
					colorShiftRange: 170,
					positionJitter: 0.018,
				},
			},
			// Ruins torch — atmospheric point light on cliff top
			{
				id: 'ruins-torch-1',
				type: 'point',
				intensity: 2.0,
				position: { x: 26, y: 4.5, z: 4 },
				colorTemperature: 1800,
				range: 15,
				meshRadius: 10,
				flicker: {
					type: 'campfire',
					intensity: 0.5,
					speed: 0.6,
					colorShift: true,
					colorShiftRange: 300,
					positionJitter: 0.03,
				},
			},
			{
				id: 'ruins-torch-2',
				type: 'point',
				intensity: 1.8,
				position: { x: 28, y: 4.5, z: 6 },
				colorTemperature: 1900,
				range: 12,
				meshRadius: 8,
				flicker: {
					type: 'campfire',
					intensity: 0.45,
					speed: 0.7,
					colorShift: true,
					colorShiftRange: 280,
					positionJitter: 0.025,
				},
			},
		],
		dayNight: {
			enabled: true,
			timeOfDay: 10,
			speed: 0,
			sunLightId: 'sun',
			ambientLightId: 'ambient',
			sunPath: { sunrise: 6, sunset: 18, maxElevation: 75 },
		},
		glow: { enabled: true, intensity: 0.3, blurKernelSize: 32 },
	},
	sky: {
		type: 'gradient',
		color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
		gradient: [
			{ position: 0, color: { r: 0.2, g: 0.3, b: 0.6, a: 1 } },
			{ position: 0.4, color: { r: 0.4, g: 0.55, b: 0.85, a: 1 } },
			{ position: 1, color: { r: 0.7, g: 0.8, b: 0.95, a: 1 } },
		],
		skyboxSize: 1000,
		parallaxLayers: [],
		stars: {
			enabled: true,
			texture: 'sky/stars.png',
			opacity: 0.8,
			twinkleSpeed: 1,
			fadeInTime: 18,
			fadeOutTime: 6,
			scale: 2,
		},
	},
};
