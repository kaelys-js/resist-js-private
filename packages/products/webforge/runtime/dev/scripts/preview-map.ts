#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script */
/**
 * Generates a PNG preview of the test map using actual terrain + decoration PNGs.
 *
 * Renders ground (autotile), decoration, and upper (trees) layers with proper
 * alpha compositing — a pixel-perfect preview without needing Babylon.js.
 *
 * Usage:
 *   npx tsx preview-map.ts [output.png]
 *
 * @module
 */

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

import { PNG } from 'pngjs';

// =============================================================================
// Constants
// =============================================================================

const TILE = 32;
const W = 40;
const H = 30;
const AT = 48; // tiles per autotile tileset

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_ROOT = path.resolve(__dirname, '../../../../../..', 'assets/tilesets/lpc-terrain');

// --- Autotile terrain indices ---
const TERRAINS = {
	grass: '02', // light green grass — base
	darkGrass: '00', // dense forest grass
	dirt: '03', // dirt clearing
	water: '24', // water body
	sand: '18', // sandy ground
	cobble: '11', // brown earth / cobblestone
} as const;

// GID assignments
const GRASS = 1;
const DARK = GRASS + AT; // 49
const DIRT = DARK + AT; // 97
const WATER = DIRT + AT; // 145
const SAND = WATER + AT; // 193
const COBBLE = SAND + AT; // 241

const GID_TO_TERRAIN: Record<number, string> = {
	[GRASS]: TERRAINS.grass,
	[DARK]: TERRAINS.darkGrass,
	[DIRT]: TERRAINS.dirt,
	[WATER]: TERRAINS.water,
	[SAND]: TERRAINS.sand,
	[COBBLE]: TERRAINS.cobble,
};

// --- Decoration tileset configs ---
const DECO = {
	plants: { file: 'plants_summer.png', cols: 16, rows: 5 },
	trees: { file: 'trees_summer.png', cols: 16, rows: 18 },
	flowers: { file: 'flowers.png', cols: 11, rows: 5 },
	mushrooms: { file: 'mushrooms.png', cols: 6, rows: 5 },
	rocks: { file: 'Rocks, Grasslands.png', cols: 6, rows: 12 },
	wildflowers: { file: 'wildflowers_summer.png', cols: 10, rows: 10 },
} as const;

// =============================================================================
// Autotile Resolver
// =============================================================================

// prettier-ignore
const BITMASK_TO_FRAME: readonly number[] = [
	46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40, 42, 32, 42, 32, 35, 19, 35, 18,
	42, 32, 42, 32, 34, 17, 34, 16, 46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40,
	42, 32, 42, 32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16, 45, 39, 45, 39, 33, 31, 33, 29,
	45, 39, 45, 39, 33, 31, 33, 29, 37, 27, 37, 27, 23, 15, 23, 13, 37, 27, 37, 27, 22, 11, 22, 9, 45,
	39, 45, 39, 33, 31, 33, 29, 45, 39, 45, 39, 33, 31, 33, 29, 36, 26, 36, 26, 21, 7, 21, 5, 36, 26,
	36, 26, 20, 3, 20, 1, 46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40, 42, 32, 42,
	32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16, 46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46,
	44, 43, 41, 43, 40, 42, 32, 42, 32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16, 45, 38, 45,
	38, 33, 30, 33, 28, 45, 38, 45, 38, 33, 30, 33, 28, 37, 25, 37, 25, 23, 14, 23, 12, 37, 25, 37,
	25, 22, 10, 22, 8, 45, 38, 45, 38, 33, 30, 33, 28, 45, 38, 45, 38, 33, 30, 33, 28, 36, 24, 36, 24,
	21, 6, 21, 4, 36, 24, 36, 24, 20, 2, 20, 0,
];

const BIT_N = 0,
	BIT_NE = 1,
	BIT_E = 2,
	BIT_SE = 3;
const BIT_S = 4,
	BIT_SW = 5,
	BIT_W = 6,
	BIT_NW = 7;

function getBaseGid(id: number): number {
	if (id <= 0) return 0;
	const bases = [GRASS, DARK, DIRT, WATER, SAND, COBBLE];
	let m = 0;
	for (const b of bases) if (b <= id && b > m) m = b;
	return m;
}

function isSame(a: number, b: number): boolean {
	if (b <= 0) return false;
	return getBaseGid(a) === getBaseGid(b);
}

function buildBitmask(x: number, y: number, layer: number[]): number {
	const id = layer[y * W + x] ?? 0;
	if (id <= 0) return 0;
	let mask = 0;
	const ck = (dx: number, dy: number, bit: number): void => {
		const nx = x + dx,
			ny = y + dy;
		if (nx < 0 || nx >= W || ny < 0 || ny >= H) {
			mask |= 1 << bit;
			return;
		}
		if (isSame(id, layer[ny * W + nx] ?? 0)) mask |= 1 << bit;
	};
	ck(0, -1, BIT_N);
	ck(1, -1, BIT_NE);
	ck(1, 0, BIT_E);
	ck(1, 1, BIT_SE);
	ck(0, 1, BIT_S);
	ck(-1, 1, BIT_SW);
	ck(-1, 0, BIT_W);
	ck(-1, -1, BIT_NW);
	if (!(mask & (1 << BIT_N)) || !(mask & (1 << BIT_E))) mask &= ~(1 << BIT_NE);
	if (!(mask & (1 << BIT_E)) || !(mask & (1 << BIT_S))) mask &= ~(1 << BIT_SE);
	if (!(mask & (1 << BIT_S)) || !(mask & (1 << BIT_W))) mask &= ~(1 << BIT_SW);
	if (!(mask & (1 << BIT_W)) || !(mask & (1 << BIT_N))) mask &= ~(1 << BIT_NW);
	return mask;
}

// =============================================================================
// Seeded Random
// =============================================================================

function seeded(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		return (s >>> 0) / 0xffffffff;
	};
}

function hash(x: number, y: number, seed: number): number {
	return ((x * 31 + y * 17 + seed * 13) & 0x7fffffff) % 100;
}

// =============================================================================
// Map Layout — Ground Layer
// =============================================================================

function noise(x: number, y: number, s: number): number {
	return (
		Math.sin(x * 0.3 + s) * 0.4 +
		Math.sin(y * 0.4 + s * 1.7) * 0.3 +
		Math.sin((x + y) * 0.2 + s * 2.3) * 0.2 +
		Math.sin((x - y) * 0.35 + s * 0.9) * 0.1
	);
}

function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
	const dx = bx - ax,
		dy = by - ay,
		l = dx * dx + dy * dy;
	if (l === 0) return Math.hypot(px - ax, py - ay);
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Generates the ground layer.
 *
 * Design inspired by professional RPG Maker maps:
 * - Light grass base everywhere (no empty cells)
 * - Wide dirt roads forming a crossroads (3 tiles wide)
 * - Small pond in the upper-left quadrant
 * - Dirt border around pond
 * - Sand patches near water's edge
 */
function generateGround(): number[] {
	const data = new Array(W * H).fill(GRASS);
	const rand = seeded(42);

	// ─── Pond (upper-left area) ────────────────────────────────────────
	const pondCx = 8,
		pondCy = 7,
		pondRx = 5.5,
		pondRy = 3.8;
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const dx = (x - pondCx) / pondRx,
				dy = (y - pondCy) / pondRy;
			const d = dx * dx + dy * dy + noise(x, y, 5) * 0.12;
			if (d < 1.0) data[y * W + x] = WATER;
			// Dirt shore around pond
			else if (d < 1.35 + rand() * 0.1) data[y * W + x] = DIRT;
		}
	}

	// ─── Main E-W road (row 14-16, 3 tiles wide) ──────────────────────
	for (let x = 0; x < W; x++) {
		for (let y = 13; y <= 15; y++) {
			if (data[y * W + x] !== WATER) data[y * W + x] = DIRT;
		}
	}

	// ─── N-S road (col 20-22, 3 tiles wide) ───────────────────────────
	for (let y = 0; y < H; y++) {
		for (let x = 19; x <= 21; x++) {
			if (data[y * W + x] !== WATER) data[y * W + x] = DIRT;
		}
	}

	// ─── Cobblestone crossroads center (where roads meet) ──────────────
	for (let y = 12; y <= 16; y++) {
		for (let x = 18; x <= 22; x++) {
			data[y * W + x] = COBBLE;
		}
	}

	// ─── Small side path from E-W road down to pond shore ──────────────
	for (let y = 10; y <= 13; y++) {
		const px = 8 + Math.round(noise(8, y, 3) * 0.5);
		if (data[y * W + px] !== WATER) data[y * W + px] = DIRT;
		if (px + 1 < W && data[y * W + px + 1] !== WATER) data[y * W + px + 1] = DIRT;
	}

	// ─── Sand patches near pond shore ──────────────────────────────────
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			if (data[y * W + x] !== WATER) continue;
			// Check neighbors for sand placement
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx,
						ny = y + dy;
					if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
						if (data[ny * W + nx] === GRASS && rand() < 0.3) {
							data[ny * W + nx] = SAND;
						}
					}
				}
			}
		}
	}

	// ─── Dark grass patches (forest floor, near edges) ─────────────────
	// Northwest forest area
	for (let y = 0; y < 6; y++) {
		for (let x = 0; x < 6; x++) {
			if (data[y * W + x] === GRASS) data[y * W + x] = DARK;
		}
	}
	// Northeast forest corner
	for (let y = 0; y < 5; y++) {
		for (let x = W - 8; x < W; x++) {
			const edge = 4 + noise(x, y, 9) * 1.5;
			if (y < edge && data[y * W + x] === GRASS) data[y * W + x] = DARK;
		}
	}
	// Southeast forest pocket
	for (let y = H - 6; y < H; y++) {
		for (let x = W - 7; x < W; x++) {
			const d = Math.hypot(x - (W - 3), y - (H - 3));
			if (d < 4 + noise(x, y, 11) * 1.2 && data[y * W + x] === GRASS) data[y * W + x] = DARK;
		}
	}
	// Southwest forest edge
	for (let y = H - 5; y < H; y++) {
		for (let x = 0; x < 5; x++) {
			const d = Math.hypot(x - 1, y - (H - 2));
			if (d < 4 + noise(x, y, 13) * 1.0 && data[y * W + x] === GRASS) data[y * W + x] = DARK;
		}
	}

	return data;
}

// =============================================================================
// Decoration Layer — flowers, bushes, grass tufts, lily pads, mushrooms
// =============================================================================

// Decoration tile IDs (tileset-local row,col)
// We'll store them as { tileset, row, col } and resolve at render time.
interface DecoTile {
	tileset: keyof typeof DECO;
	row: number;
	col: number;
}

const DECO_FLOWER_BUSH: DecoTile = { tileset: 'plants', row: 0, col: 0 };
const DECO_SMALL_BUSH: DecoTile = { tileset: 'plants', row: 0, col: 2 };
const DECO_TALL_GRASS: DecoTile = { tileset: 'plants', row: 0, col: 8 };
const DECO_GRASS_TUFT: DecoTile = { tileset: 'plants', row: 0, col: 10 };
const DECO_LILY_PAD: DecoTile = { tileset: 'plants', row: 2, col: 12 };

const DECO_FLOWER_RED: DecoTile = { tileset: 'flowers', row: 0, col: 0 };
const DECO_FLOWER_BLUE: DecoTile = { tileset: 'flowers', row: 0, col: 1 };
const DECO_FLOWER_YELLOW: DecoTile = { tileset: 'flowers', row: 0, col: 3 };
const DECO_FLOWER_PINK: DecoTile = { tileset: 'flowers', row: 0, col: 4 };
const DECO_FLOWER_WHITE: DecoTile = { tileset: 'flowers', row: 0, col: 5 };
const DECO_FLOWER_PURPLE: DecoTile = { tileset: 'flowers', row: 1, col: 0 };
const DECO_FLOWER_ORANGE: DecoTile = { tileset: 'flowers', row: 1, col: 3 };

const DECO_MUSH_BROWN: DecoTile = { tileset: 'mushrooms', row: 0, col: 0 };
const DECO_MUSH_RED: DecoTile = { tileset: 'mushrooms', row: 0, col: 3 };
const DECO_MUSH_SMALL: DecoTile = { tileset: 'mushrooms', row: 2, col: 0 };

const DECO_ROCK_MED: DecoTile = { tileset: 'rocks', row: 2, col: 0 };
const DECO_ROCK_SMALL: DecoTile = { tileset: 'rocks', row: 4, col: 0 };
const DECO_ROCK_PEBBLE: DecoTile = { tileset: 'rocks', row: 6, col: 0 };

const FLOWERS: DecoTile[] = [
	DECO_FLOWER_RED,
	DECO_FLOWER_BLUE,
	DECO_FLOWER_YELLOW,
	DECO_FLOWER_PINK,
	DECO_FLOWER_WHITE,
	DECO_FLOWER_PURPLE,
	DECO_FLOWER_ORANGE,
];
const GRASS_DECOR: DecoTile[] = [
	DECO_FLOWER_BUSH,
	DECO_SMALL_BUSH,
	DECO_TALL_GRASS,
	DECO_GRASS_TUFT,
];
const FOREST_FLOOR: DecoTile[] = [
	DECO_MUSH_BROWN,
	DECO_MUSH_RED,
	DECO_MUSH_SMALL,
	DECO_TALL_GRASS,
	DECO_GRASS_TUFT,
];

function generateDecorations(ground: number[]): (DecoTile | null)[] {
	const data: (DecoTile | null)[] = new Array(W * H).fill(null);

	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const gid = ground[y * W + x] ?? 0;
			const h = hash(x, y, 47);

			// Lily pads on water
			if (getBaseGid(gid) === WATER) {
				if (h < 10) data[y * W + x] = DECO_LILY_PAD;
				continue;
			}

			// Skip roads/cobblestone (keep them clean)
			if (getBaseGid(gid) === DIRT || getBaseGid(gid) === COBBLE) {
				// Very sparse grass tufts along road edges
				if (h < 3 && isNearGrass(x, y, ground)) {
					data[y * W + x] = DECO_GRASS_TUFT;
				}
				continue;
			}

			// Sand: sparse rocks
			if (getBaseGid(gid) === SAND) {
				if (h < 8) data[y * W + x] = DECO_ROCK_PEBBLE;
				continue;
			}

			// Dark grass (forest): mushrooms, grass, dense understory
			if (getBaseGid(gid) === DARK) {
				if (h < 18) {
					data[y * W + x] = FOREST_FLOOR[hash(x, y, 49) % FOREST_FLOOR.length]!;
				}
				continue;
			}

			// Light grass: flowers and grass based on location
			if (getBaseGid(gid) === GRASS) {
				// Near roads: flower beds (higher density)
				if (isNearRoad(x, y, ground) && h < 35) {
					data[y * W + x] = FLOWERS[hash(x, y, 51) % FLOWERS.length]!;
				}
				// Near pond: bushes and rocks
				else if (isNearWater(x, y, ground) && h < 20) {
					data[y * W + x] = hash(x, y, 53) < 50 ? DECO_SMALL_BUSH : DECO_ROCK_SMALL;
				}
				// Open meadow: scattered flowers + grass
				else if (h < 12) {
					data[y * W + x] =
						hash(x, y, 55) < 40
							? FLOWERS[hash(x, y, 57) % FLOWERS.length]!
							: GRASS_DECOR[hash(x, y, 59) % GRASS_DECOR.length]!;
				}
			}
		}
	}
	return data;
}

function isNearGrass(x: number, y: number, ground: number[]): boolean {
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			const nx = x + dx,
				ny = y + dy;
			if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
				if (getBaseGid(ground[ny * W + nx] ?? 0) === GRASS) return true;
			}
		}
	}
	return false;
}

function isNearRoad(x: number, y: number, ground: number[]): boolean {
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const nx = x + dx,
				ny = y + dy;
			if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
				const base = getBaseGid(ground[ny * W + nx] ?? 0);
				if (base === DIRT || base === COBBLE) return true;
			}
		}
	}
	return false;
}

function isNearWater(x: number, y: number, ground: number[]): boolean {
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const nx = x + dx,
				ny = y + dy;
			if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
				if (getBaseGid(ground[ny * W + nx] ?? 0) === WATER) return true;
			}
		}
	}
	return false;
}

// =============================================================================
// Upper Layer — Large bushes/shrubs placed as "trees"
// =============================================================================
//
// NOTE: Tree sprites in trees_summer.png are multi-tile (2×2 or 3×3).
// For the 2D preview we use large plant bushes as stand-ins.
// The actual engine renders multi-tile trees properly.

// Large round bushes from plants_summer.png (single-tile, works standalone)
const BUSH_LARGE: DecoTile[] = [
	{ tileset: 'plants', row: 0, col: 0 }, // large flower bush
	{ tileset: 'plants', row: 0, col: 1 }, // large round bush
	{ tileset: 'plants', row: 0, col: 2 }, // medium bush
	{ tileset: 'plants', row: 0, col: 3 }, // small round bush
	{ tileset: 'plants', row: 1, col: 0 }, // pointed bush
	{ tileset: 'plants', row: 1, col: 1 }, // fan bush
	{ tileset: 'plants', row: 1, col: 2 }, // leafy bush
	{ tileset: 'plants', row: 1, col: 3 }, // round bush variant
];

function generateUpperLayer(ground: number[]): (DecoTile | null)[] {
	const data: (DecoTile | null)[] = new Array(W * H).fill(null);

	// ── Dense bushes in dark grass (forest) zones ──────────────────────
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const gid = ground[y * W + x] ?? 0;
			if (getBaseGid(gid) === DARK) {
				if (hash(x, y, 81) < 28) {
					data[y * W + x] = BUSH_LARGE[hash(x, y, 85) % BUSH_LARGE.length]!;
				}
			}
		}
	}

	// ── Scattered bushes along road edges ──────────────────────────────
	const roadBushes: [number, number][] = [
		// Along E-W road
		[5, 11],
		[7, 12],
		[12, 11],
		[15, 12],
		[25, 12],
		[28, 11],
		[32, 12],
		[36, 11],
		[5, 17],
		[9, 18],
		[14, 17],
		[24, 17],
		[27, 18],
		[31, 17],
		[35, 18],
		// Along N-S road
		[17, 5],
		[18, 8],
		[17, 10],
		[22, 4],
		[23, 7],
		[22, 10],
		[17, 19],
		[18, 22],
		[17, 25],
		[22, 19],
		[23, 22],
		[22, 25],
		[23, 28],
		// Near pond
		[2, 11],
		[13, 4],
		[14, 8],
		// Open field scattered
		[30, 6],
		[33, 3],
		[36, 8],
		[3, 20],
		[7, 22],
		[11, 25],
		[5, 27],
		[29, 24],
		[33, 22],
		[37, 26],
	];

	for (const [tx, ty] of roadBushes) {
		if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
			const gid = ground[ty * W + tx] ?? 0;
			const base = getBaseGid(gid);
			if (base === WATER || base === DIRT || base === COBBLE) continue;
			if (data[ty * W + tx]) continue; // don't overwrite forest bushes
			data[ty * W + tx] = BUSH_LARGE[hash(tx, ty, 95) % BUSH_LARGE.length]!;
		}
	}

	return data;
}

// =============================================================================
// PNG Loading & Compositing
// =============================================================================

function loadPNG(relativePath: string): PNG {
	const full = path.resolve(ASSET_ROOT, relativePath);
	if (!fs.existsSync(full)) {
		console.error(`Missing: ${full}`);
		process.exit(1);
	}
	return PNG.sync.read(fs.readFileSync(full));
}

function extractTileFromGrid(png: PNG, row: number, col: number, cols: number): PNG {
	const tileW = Math.floor(png.width / cols);
	const tileH = tileW; // assume square tiles
	const sx = col * tileW,
		sy = row * tileH;
	const tile = new PNG({ width: TILE, height: TILE });

	for (let py = 0; py < TILE; py++) {
		for (let px = 0; px < TILE; px++) {
			// Scale if tile size differs from TILE
			const srcX = Math.min(sx + Math.floor((px * tileW) / TILE), png.width - 1);
			const srcY = Math.min(sy + Math.floor((py * tileH) / TILE), png.height - 1);
			const si = (srcY * png.width + srcX) * 4;
			const di = (py * TILE + px) * 4;
			tile.data[di] = png.data[si] ?? 0;
			tile.data[di + 1] = png.data[si + 1] ?? 0;
			tile.data[di + 2] = png.data[si + 2] ?? 0;
			tile.data[di + 3] = png.data[si + 3] ?? 0;
		}
	}
	return tile;
}

function extractAutotileFrame(terrain: PNG, frameIndex: number): PNG {
	const col = frameIndex % 8,
		row = Math.floor(frameIndex / 8);
	const sx = col * TILE,
		sy = row * TILE;
	const tile = new PNG({ width: TILE, height: TILE });
	for (let py = 0; py < TILE; py++) {
		for (let px = 0; px < TILE; px++) {
			const si = ((sy + py) * terrain.width + (sx + px)) * 4;
			const di = (py * TILE + px) * 4;
			tile.data[di] = terrain.data[si] ?? 0;
			tile.data[di + 1] = terrain.data[si + 1] ?? 0;
			tile.data[di + 2] = terrain.data[si + 2] ?? 0;
			tile.data[di + 3] = terrain.data[si + 3] ?? 0;
		}
	}
	return tile;
}

function blitAlpha(output: PNG, tile: PNG, gx: number, gy: number): void {
	const ox = gx * TILE,
		oy = gy * TILE;
	for (let py = 0; py < TILE; py++) {
		for (let px = 0; px < TILE; px++) {
			const si = (py * TILE + px) * 4;
			const di = ((oy + py) * output.width + (ox + px)) * 4;
			const a = (tile.data[si + 3] ?? 0) / 255;
			if (a <= 0) continue;
			if (a >= 1) {
				output.data[di] = tile.data[si]!;
				output.data[di + 1] = tile.data[si + 1]!;
				output.data[di + 2] = tile.data[si + 2]!;
				output.data[di + 3] = 255;
			} else {
				const ia = 1 - a;
				output.data[di] = Math.round(tile.data[si]! * a + (output.data[di] ?? 0) * ia);
				output.data[di + 1] = Math.round(tile.data[si + 1]! * a + (output.data[di + 1] ?? 0) * ia);
				output.data[di + 2] = Math.round(tile.data[si + 2]! * a + (output.data[di + 2] ?? 0) * ia);
				output.data[di + 3] = 255;
			}
		}
	}
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
	const outputPath = process.argv[2] ?? 'map-preview.png';
	console.log(`Generating ${W}×${H} map preview...`);

	// Load terrain PNGs
	console.log('  Loading autotile terrains...');
	const terrainPNGs: Record<string, PNG> = {};
	for (const [, idx] of Object.entries(TERRAINS)) {
		terrainPNGs[idx] = loadPNG(`autotile-expanded/terrain-${idx}.png`);
	}

	// Load decoration PNGs
	console.log('  Loading decoration tilesets...');
	const decoPNGs: Record<string, PNG> = {};
	for (const [key, cfg] of Object.entries(DECO)) {
		decoPNGs[key] = loadPNG(cfg.file);
	}

	// Generate layers
	console.log('  Generating ground...');
	const ground = generateGround();
	console.log('  Generating decorations...');
	const decos = generateDecorations(ground);
	console.log('  Generating upper layer...');
	const upper = generateUpperLayer(ground);

	// Create output
	const outW = W * TILE,
		outH = H * TILE;
	const output = new PNG({ width: outW, height: outH });
	for (let i = 0; i < output.data.length; i += 4) {
		output.data[i] = 20;
		output.data[i + 1] = 20;
		output.data[i + 2] = 20;
		output.data[i + 3] = 255;
	}

	// Pass 1a: Render base grass EVERYWHERE first (autotile terrains have
	// transparent edges meant to blend with the layer below)
	console.log('  Rendering base grass...');
	const grassPNG = terrainPNGs[TERRAINS.grass]!;
	// For base grass, use frame 0 (fully surrounded) since it's the base
	const grassBaseTile = extractAutotileFrame(grassPNG, 0);
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			blitAlpha(output, grassBaseTile, x, y);
		}
	}

	// Pass 1b: Ground (autotile) — overlay on top of base grass
	console.log('  Rendering ground overlays...');
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const id = ground[y * W + x] ?? 0;
			if (id <= 0) continue;
			const base = getBaseGid(id);
			// Skip base grass — already rendered
			if (base === GRASS) {
				// Still need autotile edges for grass-to-other transitions
				const mask = buildBitmask(x, y, ground);
				const frame = BITMASK_TO_FRAME[mask] ?? 0;
				if (frame !== 0) {
					// only re-render if NOT fully surrounded
					const tile = extractAutotileFrame(grassPNG, frame);
					blitAlpha(output, tile, x, y);
				}
				continue;
			}
			const tidx = GID_TO_TERRAIN[base];
			if (!tidx || !terrainPNGs[tidx]) continue;
			const mask = buildBitmask(x, y, ground);
			const frame = BITMASK_TO_FRAME[mask] ?? 0;
			const tile = extractAutotileFrame(terrainPNGs[tidx]!, frame);
			blitAlpha(output, tile, x, y);
		}
	}

	// Pass 2: Decorations
	console.log('  Rendering decorations...');
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const d = decos[y * W + x];
			if (!d) continue;
			const cfg = DECO[d.tileset];
			const png = decoPNGs[d.tileset];
			if (!png) continue;
			const tile = extractTileFromGrid(png, d.row, d.col, cfg.cols);
			blitAlpha(output, tile, x, y);
		}
	}

	// Pass 3: Upper (bushes/shrubs)
	console.log('  Rendering upper layer...');
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const u = upper[y * W + x];
			if (!u) continue;
			const cfg = DECO[u.tileset];
			const png = decoPNGs[u.tileset];
			if (!png) continue;
			const tile = extractTileFromGrid(png, u.row, u.col, cfg.cols);
			blitAlpha(output, tile, x, y);
		}
	}

	// Write
	const buffer = PNG.sync.write(output);
	fs.writeFileSync(outputPath, buffer);
	console.log(`\nPreview: ${outputPath} (${outW}×${outH}px)`);
}

main();
