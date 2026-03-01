/**
 * Professional test map — 40×30 RPG crossroads village scene.
 *
 * Hand-crafted layout inspired by professional RPG Maker maps: simple ground
 * terrain with rich decoration layers for visual depth. Designed to showcase
 * every engine feature (fog, glow, shadows, height map, day/night, volumetric
 * lighting, post-FX, multiple camera modes).
 *
 * Uses 6 autotile tilesets (grass, darkGrass, dirt, cobble, water, sand) plus
 * 8 decoration tilesets (plants, trees, cliffs, flowers, mushrooms, rocks,
 * cliff-rocks, tilled soil) with season-swappable paths.
 *
 * The autotile system automatically generates edge/corner transitions between
 * different terrain types using RPG Maker A2 sub-tile composition.
 *
 * Layout:
 * - Grass base with organic dark-grass forest patches in all four corners
 * - Pond (NW) — elliptical water body with dirt shoreline and sand edges
 * - Dirt roads — 3-tile-wide E-W and N-S roads forming a crossroads
 * - Cobblestone crossroads (center) — 5×5 stone intersection
 * - Side path from crossroads down to pond shore
 * - Flowers along road edges, mushrooms in forest, lily pads on water
 * - Trees in forest corners and sparse along roads
 *
 * @module
 */

import type { Num } from '@/schemas/common';

// =============================================================================
// Map Constants
// =============================================================================

const W: Num = 40;
const H: Num = 30;
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
const _FLOWER: Num = p(0, 9);
const GRASS_TUFT: Num = p(0, 10);
const LILY_PAD: Num = p(2, 12);
const _WATER_FLOWER: Num = p(2, 14);

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
const _TREE_DEAD: Num = tr(8, 0);
// Row 16-17: tree stump, trunk base
const _TREE_STUMP: Num = tr(14, 0);

// --- Cliffs (cliff_summer.png) — verified by visual tile catalog ---
// Rows 0-4: cliff face autotile (brown cliff, transparent edges)
// Rows 5-8: cliff-grass transitions (green grass meeting cliff)
// Rows 9-13: cave, planks, specialty tiles
const _CLIFF_FACE: Num = cl(2, 1); // solid brown cliff wall (center fill)
const _CLIFF_BASE: Num = cl(3, 1); // cliff base/bottom (solid)
const _CLIFF_GRASS_T: Num = cl(5, 1); // grass on top of cliff face
const _CLIFF_GRASS_L: Num = cl(6, 1); // grass on left of cliff face
const _CLIFF_FACE_DEEP: Num = cl(7, 1); // deeper cliff wall variant

// --- Flowers (flowers.png) ---
const FLOWER_RED: Num = fl(0, 0);
const FLOWER_BLUE: Num = fl(0, 1);
const FLOWER_YELLOW: Num = fl(0, 3);
const FLOWER_PINK: Num = fl(0, 4);
const FLOWER_WHITE: Num = fl(0, 5);
const FLOWER_PURPLE: Num = fl(1, 0);
const FLOWER_ORANGE: Num = fl(1, 3);
const _FLOWER_TALL_1: Num = fl(3, 0);
const _FLOWER_TALL_2: Num = fl(3, 1);

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
const _ROCK_SMALL_2: Num = rk(4, 1);
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
// Layout Constants — crossroads village with pond
// =============================================================================

/** Pond center and radii. */
const POND_CX: Num = 8;
const POND_CY: Num = 7;
const POND_RX: Num = 5.5;
const POND_RY: Num = 3.8;

/** E-W road row range (3 tiles wide). */
const ROAD_EW_Y1: Num = 13;
const ROAD_EW_Y2: Num = 15;

/** N-S road column range (3 tiles wide). */
const ROAD_NS_X1: Num = 19;
const ROAD_NS_X2: Num = 21;

/** Cobblestone crossroads center. */
const CROSS_X1: Num = 18;
const CROSS_X2: Num = 22;
const CROSS_Y1: Num = 12;
const CROSS_Y2: Num = 16;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Index into flat tile array.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate (row)
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
 * Noise-like function using multiple sine waves for organic shapes.
 *
 * @param x - X position
 * @param y - Y position
 * @param s - Seed offset
 * @returns Value roughly in [-1, 1]
 */
function noise2d(x: Num, y: Num, s: Num): Num {
	return (
		Math.sin(x * 0.3 + s) * 0.4 +
		Math.sin(y * 0.4 + s * 1.7) * 0.3 +
		Math.sin((x + y) * 0.2 + s * 2.3) * 0.2 +
		Math.sin((x - y) * 0.35 + s * 0.9) * 0.1
	);
}

/**
 * Check if position is in the pond.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if position is within the pond ellipse
 */
function isPond(x: Num, z: Num): boolean {
	const dx: Num = (x - POND_CX) / POND_RX;
	const dy: Num = (z - POND_CY) / POND_RY;
	const d: Num = dx * dx + dy * dy + noise2d(x, z, 5) * 0.12;
	return d < 1.0;
}

/**
 * Check if position is on the E-W road.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if on the east-west road
 */
function isRoadEW(x: Num, z: Num): boolean {
	return z >= ROAD_EW_Y1 && z <= ROAD_EW_Y2;
}

/**
 * Check if position is on the N-S road.
 *
 * @param x - Tile X coordinate
 * @param _z - Tile Z coordinate (unused, kept for API symmetry)
 * @returns True if on the north-south road
 */
function isRoadNS(x: Num, _z: Num): boolean {
	return x >= ROAD_NS_X1 && x <= ROAD_NS_X2;
}

/**
 * Check if position is on any road.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if on a road
 */
function isRoad(x: Num, z: Num): boolean {
	return isRoadEW(x, z) || isRoadNS(x, z);
}

/**
 * Check if position is in the cobblestone crossroads center.
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if in the crossroads center
 */
function isCrossroads(x: Num, z: Num): boolean {
	return x >= CROSS_X1 && x <= CROSS_X2 && z >= CROSS_Y1 && z <= CROSS_Y2;
}

/**
 * Check if position is near water (within 2 tiles of pond).
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if within 2 tiles of pond water
 */
function isNearPond(x: Num, z: Num): boolean {
	for (let dz: Num = -2; dz <= 2; dz++) {
		for (let dx: Num = -2; dx <= 2; dx++) {
			if (isPond(x + dx, z + dz)) return true;
		}
	}
	return false;
}

/**
 * Check if position is near a road (within 2 tiles).
 *
 * @param x - Tile X coordinate
 * @param z - Tile Z coordinate
 * @returns True if within 2 tiles of a road
 */
function isNearRoad(x: Num, z: Num): boolean {
	for (let dz: Num = -2; dz <= 2; dz++) {
		for (let dx: Num = -2; dx <= 2; dx++) {
			if (isRoad(x + dx, z + dz) || isCrossroads(x + dx, z + dz)) return true;
		}
	}
	return false;
}

// =============================================================================
// Ground Layer — crossroads village with pond
// =============================================================================

/**
 * Generates the ground layer: light grass base, dirt roads forming a
 * crossroads, cobblestone intersection center, pond with dirt shoreline,
 * sand near water's edge, and dark grass forest patches in corners.
 *
 * @returns Flat array of autotile GIDs
 */
function generateGround(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => GRASS);

	// ── 1. Pond ────────────────────────────────────────────────────────
	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			const dx: Num = (x - POND_CX) / POND_RX;
			const dy: Num = (z - POND_CY) / POND_RY;
			const d: Num = dx * dx + dy * dy + noise2d(x, z, 5) * 0.12;
			if (d < 1.0) {
				data[idx(x, z)] = WATER;
			} else if (d < 1.35 + (hash(x, z, 42) % 10) / 100) {
				data[idx(x, z)] = DIRT;
			}
		}
	}

	// ── 2. E-W road (rows 13-15) ───────────────────────────────────────
	for (let x: Num = 0; x < W; x++) {
		for (let z: Num = ROAD_EW_Y1; z <= ROAD_EW_Y2; z++) {
			if (!isPond(x, z)) data[idx(x, z)] = DIRT;
		}
	}

	// ── 3. N-S road (cols 19-21) ───────────────────────────────────────
	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = ROAD_NS_X1; x <= ROAD_NS_X2; x++) {
			if (!isPond(x, z)) data[idx(x, z)] = DIRT;
		}
	}

	// ── 4. Cobblestone crossroads center ───────────────────────────────
	for (let z: Num = CROSS_Y1; z <= CROSS_Y2; z++) {
		for (let x: Num = CROSS_X1; x <= CROSS_X2; x++) {
			data[idx(x, z)] = STONE;
		}
	}

	// ── 5. Side path from E-W road down to pond shore ─────────────────
	for (let z: Num = 10; z <= ROAD_EW_Y1; z++) {
		const px: Num = POND_CX + Math.round(noise2d(POND_CX, z, 3) * 0.5);
		if (!isPond(px, z)) data[idx(px, z)] = DIRT;
		if (px + 1 < W && !isPond(px + 1, z)) data[idx(px + 1, z)] = DIRT;
	}

	// ── 6. Sand patches near pond shore ────────────────────────────────
	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			if (data[idx(x, z)] !== WATER) continue;
			for (let dz: Num = -1; dz <= 1; dz++) {
				for (let dx: Num = -1; dx <= 1; dx++) {
					const nx: Num = x + dx;
					const ny: Num = z + dz;
					if (
						nx >= 0 &&
						nx < W &&
						ny >= 0 &&
						ny < H &&
						data[idx(nx, ny)] === GRASS &&
						hash(nx, ny, 44) < 30
					) {
						data[idx(nx, ny)] = SAND;
					}
				}
			}
		}
	}

	// ── 7. Dark grass forest patches in corners ────────────────────────
	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			if (data[idx(x, z)] !== GRASS) continue;

			// NW corner
			if (x < 6 && z < 6) {
				data[idx(x, z)] = DARK_GRASS_GID;
				continue;
			}
			// NE corner
			if (x >= W - 8 && z < 4 + noise2d(x, z, 9) * 1.5) {
				data[idx(x, z)] = DARK_GRASS_GID;
				continue;
			}
			// SE corner
			if (Math.hypot(x - (W - 3), z - (H - 3)) < 4 + noise2d(x, z, 11) * 1.2) {
				data[idx(x, z)] = DARK_GRASS_GID;
				continue;
			}
			// SW corner
			if (Math.hypot(x - 1, z - (H - 2)) < 4 + noise2d(x, z, 13)) {
				data[idx(x, z)] = DARK_GRASS_GID;
			}
		}
	}

	generateGroundCache = data;
	return data;
}

// =============================================================================
// Decoration Layer — flowers, bushes, mushrooms, lily pads
// =============================================================================

/**
 * Generates the decoration layer: flowers along roads, mushrooms in forest,
 * lily pads on water, bushes and grass tufts in open areas.
 *
 * @returns Flat array of decoration tile GIDs (0 = empty)
 */
function generateDecorations(): Num[] {
	const data: Num[] = Array.from({ length: TOTAL }, () => 0);

	const flowers: readonly Num[] = [
		FLOWER_RED,
		FLOWER_BLUE,
		FLOWER_YELLOW,
		FLOWER_PINK,
		FLOWER_WHITE,
		FLOWER_PURPLE,
		FLOWER_ORANGE,
	];
	const forestFloor: readonly Num[] = [
		MUSH_BROWN,
		MUSH_TAN,
		MUSH_GREEN,
		MUSH_RED,
		MUSH_SMALL_1,
		MUSH_SMALL_2,
		TALL_GRASS,
		GRASS_TUFT,
	];
	const grassDecor: readonly Num[] = [FLOWER_BUSH, SMALL_BUSH, TALL_GRASS, GRASS_TUFT];

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			const i: Num = idx(x, z);
			const h: Num = hash(x, z, 47);

			// ── Water: lily pads ───────────────────────────────────────
			if (isPond(x, z)) {
				if (h < 10) data[i] = LILY_PAD;
				continue;
			}

			// ── Roads + crossroads: keep clean, sparse edge grass ──────
			if (isRoad(x, z) || isCrossroads(x, z)) {
				if (h < 3 && !isCrossroads(x, z)) {
					let nearGrass = false;
					for (let dz: Num = -1; dz <= 1; dz++) {
						for (let dx: Num = -1; dx <= 1; dx++) {
							const nx: Num = x + dx;
							const ny: Num = z + dz;
							if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
								const gnd: Num = generateGroundCache[idx(nx, ny)] ?? GRASS;
								if (gnd === GRASS || gnd === DARK_GRASS_GID) nearGrass = true;
							}
						}
					}
					if (nearGrass) data[i] = GRASS_TUFT;
				}
				continue;
			}

			// ── Sand: sparse rocks ─────────────────────────────────────
			if (generateGroundCache[i] === SAND) {
				if (h < 8) data[i] = ROCK_PEBBLE;
				continue;
			}

			// ── Dark grass (forest): mushrooms + undergrowth ───────────
			if (generateGroundCache[i] === DARK_GRASS_GID) {
				if (h < 18) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[i] = forestFloor[hash(x, z, 49) % forestFloor.length]!;
				}
				continue;
			}

			// ── Near roads: flower beds (high density) ─────────────────
			if (isNearRoad(x, z) && h < 35) {
				// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
				data[i] = flowers[hash(x, z, 51) % flowers.length]!;
				continue;
			}

			// ── Near pond: bushes + rocks ──────────────────────────────
			if (isNearPond(x, z) && h < 20) {
				data[i] = hash(x, z, 53) < 50 ? SMALL_BUSH : ROCK_SMALL_1;
				continue;
			}

			// ── Open meadow: scattered flowers + grass ─────────────────
			if (h < 12) {
				if (hash(x, z, 55) < 40) {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[i] = flowers[hash(x, z, 57) % flowers.length]!;
				} else {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
					data[i] = grassDecor[hash(x, z, 59) % grassDecor.length]!;
				}
			}
		}
	}

	return data;
}

/** Cached ground layer for decoration/upper generators to reference. */
let generateGroundCache: Num[] = [];

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
			const i: Num = idx(x, z);
			const gnd: Num = generateGroundCache[i] ?? GRASS;

			// ── Skip water, roads, crossroads ────────────────────────────
			if (isPond(x, z)) continue;
			if (isRoad(x, z) || isCrossroads(x, z)) continue;

			// ── Dark grass (forest corners): dense tree canopy ───────────
			if (gnd === DARK_GRASS_GID) {
				if (x === 0 || z === 0) continue;
				if (hash(x, z, 81) < 25) {
					if (hash(x, z, 83) < 60) {
						// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
						data[i] = deciduousTrees[hash(x, z, 85) % deciduousTrees.length]!;
					} else {
						// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
						data[i] = pineTrees[hash(x, z, 87) % pineTrees.length]!;
					}
				}
				continue;
			}

			// ── Near pond shore: scattered medium rocks ──────────────────
			if (isNearPond(x, z) && !isPond(x, z) && hash(x, z, 93) < 5) {
				data[i] = ROCK_MED;
				continue;
			}

			// ── Roadside trees: sparse deciduous along roads ─────────────
			if (isNearRoad(x, z) && !isNearPond(x, z) && hash(x, z, 95) < 4) {
				// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
				data[i] = deciduousTrees[hash(x, z, 97) % deciduousTrees.length]!;
				continue;
			}

			// ── Open meadow: very sparse trees ──────────────────────────
			if (gnd === GRASS && hash(x, z, 99) < 2) {
				// oxlint-disable-next-line typescript/no-non-null-assertion -- modulo guarantees valid index
				data[i] = deciduousTrees[hash(x, z, 101) % deciduousTrees.length]!;
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
	const upper: Num[] = generateUpper();

	for (let z: Num = 0; z < H; z++) {
		for (let x: Num = 0; x < W; x++) {
			const i: Num = idx(x, z);
			// Place shadow wherever a tree was placed in the upper layer
			if (upper[i] !== 0) {
				const gnd: Num = generateGroundCache[i] ?? GRASS;
				// Dense forest = darker shadows, open meadow = lighter
				data[i] = gnd === DARK_GRASS_GID ? TREE_SHADOW_DARK : TREE_SHADOW_LIGHT;
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
			// Pond — level 0 (sunken water)
			if (isPond(x, z)) {
				data[idx(x, z)] = 0;
			}
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
		grass: 'tilesets/lpc-terrain/autotile-expanded/terrain-02.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-expanded/terrain-00.png',
		dirt: 'tilesets/lpc-terrain/autotile-expanded/terrain-03.png',
		cobble: 'tilesets/lpc-terrain/autotile-expanded/terrain-11.png',
		water: 'tilesets/lpc-terrain/autotile-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-expanded/terrain-18.png',
		plants: 'tilesets/lpc-terrain/plants_summer.png',
		trees: 'tilesets/lpc-terrain/trees_summer.png',
		cliffs: 'tilesets/lpc-terrain/cliff_summer.png',
	},
	spring: {
		grass: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-02.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-00.png',
		dirt: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-03.png',
		cobble: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-11.png',
		water: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-spring-expanded/terrain-18.png',
		plants: 'tilesets/lpc-terrain/plants_spring.png',
		trees: 'tilesets/lpc-terrain/trees_spring.png',
		cliffs: 'tilesets/lpc-terrain/cliff_spring.png',
	},
	autumn: {
		grass: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-02.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-00.png',
		dirt: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-03.png',
		cobble: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-11.png',
		water: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-autumn-expanded/terrain-18.png',
		plants: 'tilesets/lpc-terrain/plants_autumn.png',
		trees: 'tilesets/lpc-terrain/trees_autumn.png',
		cliffs: 'tilesets/lpc-terrain/cliff_autumn.png',
	},
	winter: {
		grass: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-02.png',
		darkGrass: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-00.png',
		dirt: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-03.png',
		cobble: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-11.png',
		water: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-24.png',
		sand: 'tilesets/lpc-terrain/autotile-winter-expanded/terrain-18.png',
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
		{ x: 24, z: 13, rotation: 0 },
		{ x: 28, z: 14, rotation: Math.PI / 6 },
		{ x: 32, z: 13, rotation: -Math.PI / 8 },
	],
	well: { x: 20, z: 14 },
	bridge: { x: 8, z: 11, width: 2 },
	torches: [
		{ x: 17, z: 14 },
		{ x: 23, z: 14 },
		{ x: 20, z: 11 },
		{ x: 20, z: 17 },
		{ x: 26, z: 14 },
		{ x: 30, z: 14 },
	],
	boulders: [
		{ x: 3, z: 10, scale: 1.2 },
		{ x: 14, z: 7, scale: 0.8 },
		{ x: 35, z: 4, scale: 1.1 },
		{ x: 37, z: 25, scale: 0.9 },
		{ x: 5, z: 22, scale: 1.0 },
		{ x: 33, z: 20, scale: 1.3 },
	],
	barrels: [
		{ x: 23, z: 13 },
		{ x: 25, z: 15 },
		{ x: 29, z: 13 },
		{ x: 31, z: 15 },
	],
	crates: [
		{ x: 24, z: 15 },
		{ x: 28, z: 13 },
		{ x: 32, z: 15 },
	],
	fencePosts: (() => {
		const posts: Array<{ x: Num; z: Num; axis: 'x' | 'z' }> = [];
		// Fence along N side of E-W road (Z=12, X=24-36)
		for (let x: Num = 24; x <= 36; x += 2) {
			posts.push({ x, z: 12, axis: 'x' });
		}
		// Fence along S side of E-W road (Z=16, X=24-36)
		for (let x: Num = 24; x <= 36; x += 2) {
			posts.push({ x, z: 16, axis: 'x' });
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
	autotileTileset('grass', '02', GRASS_GID, 'grass'),
	autotileTileset('darkGrass', '00', DARK_GRASS_GID, 'grass'),
	autotileTileset('dirt', '03', DIRT_GID, 'stone'),
	autotileTileset('cobble', '11', COBBLE_GID, 'stone'),
	autotileTileset('water', '24', WATER_GID, 'water'),
	autotileTileset('sand', '18', SAND_GID, 'sand'),

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
 * 40×30 professional test map — RPG crossroads village scene.
 *
 * Features a crossroads village layout with pond, dirt roads, cobblestone
 * intersection, forest corners, and rich decoration layers. Uses 6 autotile
 * terrain tilesets + 8 decoration tilesets with season-swappable paths.
 * The autotile system generates edge/corner transitions between terrain types.
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
			// Village torches — warm point lights at crossroads
			{
				id: 'torch-1',
				type: 'point',
				intensity: 1.5,
				position: { x: 17, y: 1.5, z: 14 },
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
				position: { x: 23, y: 1.5, z: 14 },
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
				position: { x: 20, y: 1.5, z: 11 },
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
				position: { x: 20, y: 1.5, z: 17 },
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
				position: { x: 26, y: 1.5, z: 14 },
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
				position: { x: 30, y: 1.5, z: 14 },
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
			// Pond-side campfire — atmospheric warm light
			{
				id: 'pond-fire',
				type: 'point',
				intensity: 2.0,
				position: { x: 14, y: 1.5, z: 8 },
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
