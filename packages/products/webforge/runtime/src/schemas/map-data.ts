/**
 * Bootstrap map data schemas for the tilemap renderer.
 *
 * Defines the minimal schemas needed by Phase 1.3 (tilemap rendering):
 * MapData, TileLayer, TilesetConfig, TileProperties, and ChunkConfig.
 * Phase 3 (Data Layer) will expand these into the full data layer.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { MapDataSchema, type MapData } from './map-data';
 *
 * const result = safeParse(MapDataSchema, {
 *   width: 32,
 *   height: 32,
 *   tilesets: [{ name: 'ground', imagePath: 'ground.png', columns: 8, rows: 6, firstGid: 1 }],
 *   layers: [{ name: 'ground', type: 'ground', data: new Array(1024).fill(1) }],
 * });
 * if (result.ok) {
 *   result.data.width;  // 32
 *   result.data.tileWidth; // 48 (default)
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { LightingConfigSchema } from './lighting-config';
import { PostProcessingConfigSchema } from './post-processing-config';
import { SkyConfigSchema } from './sky-config';

// =============================================================================
// Terrain Type
// =============================================================================

/**
 * Terrain type picklist for tile classification.
 *
 * Determines the terrain category of a tile, used for footstep sounds,
 * encounter rate modifiers, movement speed adjustments, and other
 * terrain-driven game logic.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TerrainTypeSchema } from './map-data';
 *
 * const result = safeParse(TerrainTypeSchema, 'water');
 * if (result.ok) {
 *   result.data; // 'water'
 * }
 * ```
 */
export const TerrainTypeSchema = v.picklist([
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
]);

/** Terrain type classification. */
export type TerrainType = v.InferOutput<typeof TerrainTypeSchema>;

// =============================================================================
// Tile Properties
// =============================================================================

/**
 * Per-tile metadata schema.
 *
 * Stores passability, terrain tags, terrain type, movement modifiers,
 * and special flags for individual tiles within a tileset. Used by the
 * movement system (Phase 4) for collision and terrain-based game logic.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TilePropertiesSchema } from './map-data';
 *
 * const result = safeParse(TilePropertiesSchema, { height: 2, bush: true, terrainType: 'grass' });
 * if (result.ok) {
 *   result.data.passability;    // [true, true, true, true]
 *   result.data.height;          // 2
 *   result.data.bush;            // true
 *   result.data.terrainType;     // 'grass'
 *   result.data.movementSpeed;   // 1 (default)
 * }
 * ```
 */
export const TilePropertiesSchema = v.strictObject({
	/**
	 * 4-directional passability flags: [down, left, right, up].
	 * `true` = passable in that direction. All default to `true`.
	 */
	passability: v.optional(
		v.pipe(v.strictTuple([v.boolean(), v.boolean(), v.boolean(), v.boolean()]), v.readonly()),
		(): readonly [boolean, boolean, boolean, boolean] => [true, true, true, true],
	),

	/**
	 * Terrain tag (0–15). Used by game logic for footstep sounds,
	 * encounter rates, and other terrain-driven behavior.
	 */
	terrainTag: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)), 0),

	/**
	 * Height level of this tile (0–15). Each unit equals one tile height
	 * in 3D space. 0 = ground level.
	 */
	height: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)), 0),

	/** Damage floor flag (lava, poison swamp). */
	damageFloor: v.optional(v.boolean(), false),

	/** Bush flag — lower half of character sprite is hidden. */
	bush: v.optional(v.boolean(), false),

	/** Counter flag — player can interact across this tile. */
	counter: v.optional(v.boolean(), false),

	/** Ladder flag — changes movement direction to vertical climbing. */
	ladder: v.optional(v.boolean(), false),

	/** Whether the tile can be passed from above (e.g., jumping down). */
	passAbove: v.optional(v.boolean(), false),

	/** Whether the tile can be passed from below (e.g., climbing up). */
	passBelow: v.optional(v.boolean(), false),

	/**
	 * Vehicle passability bitmask (0–31). Each bit represents a vehicle type
	 * that can traverse this tile. 0 = no vehicles allowed.
	 */
	passVehicle: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(31)), 0),

	/** Whether events can be triggered on this tile. */
	passEvent: v.optional(v.boolean(), true),

	/**
	 * Passage height level (0–15). Controls which height layers
	 * a character can pass through on this tile.
	 */
	passHeight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)), 0),

	/** Star passage flag — allows passage regardless of direction. */
	starPassage: v.optional(v.boolean(), false),

	/**
	 * Terrain type classification for this tile.
	 * Determines footstep sounds, encounter rates, and movement behavior.
	 */
	terrainType: v.optional(TerrainTypeSchema, 'normal'),

	/** Sound effect identifier for footsteps on this tile. Empty string = no override. */
	footstepSound: v.optional(v.string(), ''),

	/**
	 * Random encounter rate multiplier (0–10).
	 * 0 = no encounters, 1 = normal rate, higher = more frequent.
	 */
	encounterRate: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10)), 1),

	/**
	 * Slipperiness factor (0–1). 0 = no slip, 1 = maximum slip.
	 * Controls how much a character slides after stopping on this tile.
	 */
	slipperiness: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),

	/**
	 * Movement speed multiplier (0.1–5). 1 = normal speed.
	 * Values below 1 slow the character; values above 1 speed them up.
	 */
	movementSpeed: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(5)), 1),

	/**
	 * Region identifier (0–255). Used for map events, encounter tables,
	 * and other region-based game logic. 0 = no region.
	 */
	regionId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)), 0),
});

/** Per-tile metadata. */
export type TileProperties = v.InferOutput<typeof TilePropertiesSchema>;

// =============================================================================
// Autotile Type
// =============================================================================

/**
 * Autotile behavior type for a tileset.
 *
 * - `'none'` — Normal grid atlas, no neighbor analysis.
 * - `'terrain_48'` — 48-pattern terrain autotile (8-neighbor bitmask).
 * - `'wall_16'` — 16-pattern wall autotile (4-directional, N/S/E/W only).
 * - `'animated_terrain'` — Same as terrain_48 with animation frame cycling.
 */
export const AutotileTypeSchema = v.picklist(['none', 'terrain_48', 'wall_16', 'animated_terrain']);

/** Autotile behavior type. */
export type AutotileType = v.InferOutput<typeof AutotileTypeSchema>;

// =============================================================================
// Tileset Config
// =============================================================================

/**
 * Tileset configuration schema.
 *
 * Describes a single tileset image and its grid layout, including autotile
 * behavior and per-tile properties. Multiple tilesets can be referenced by
 * a single map, distinguished by `firstGid` ranges.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TilesetConfigSchema } from './map-data';
 *
 * const result = safeParse(TilesetConfigSchema, {
 *   name: 'terrain',
 *   imagePath: 'tilesets/terrain.png',
 *   columns: 8,
 *   rows: 6,
 *   firstGid: 1,
 *   autotileType: 'terrain_48',
 * });
 * ```
 */
export const TilesetConfigSchema = v.strictObject({
	/** Unique name for this tileset. */
	name: v.pipe(v.string(), v.minLength(1)),

	/** Path to the tileset image (relative to project assets directory). */
	imagePath: v.pipe(v.string(), v.minLength(1)),

	/** Width of each tile in pixels. */
	tileWidth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 48),

	/** Height of each tile in pixels. */
	tileHeight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 48),

	/** Number of tile columns in the tileset image. */
	columns: v.pipe(v.number(), v.integer(), v.minValue(1)),

	/** Number of tile rows in the tileset image. */
	rows: v.pipe(v.number(), v.integer(), v.minValue(1)),

	/**
	 * First global tile ID for this tileset. Tiles with IDs below this
	 * value belong to a prior tileset. ID 0 always means "empty".
	 */
	firstGid: v.pipe(v.number(), v.integer(), v.minValue(0)),

	/** Autotile behavior type. */
	autotileType: v.optional(AutotileTypeSchema, 'none'),

	/**
	 * Number of horizontal animation frames in the tileset image.
	 * Only meaningful for `'animated_terrain'` autotile type.
	 * Each frame is a complete copy of the tile grid laid out horizontally.
	 */
	animationFrames: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),

	/**
	 * Animation playback speed in frames per second.
	 * Only meaningful for `'animated_terrain'` autotile type.
	 */
	animationSpeed: v.optional(v.pipe(v.number(), v.minValue(0.1)), 4),

	/**
	 * Per-tile properties, keyed by local tile index (0-based string).
	 * Only tiles with non-default properties need entries.
	 */
	tileProperties: v.optional(v.record(v.string(), TilePropertiesSchema), {}),
});

/** Tileset configuration. */
export type TilesetConfig = v.InferOutput<typeof TilesetConfigSchema>;

// =============================================================================
// Layer Type
// =============================================================================

/**
 * Tile layer rendering type, determining draw order and height offset.
 *
 * - `'ground'` — Base terrain layer (A-tiles), rendered at tile height.
 * - `'ground_deco'` — Ground decorations, rendered slightly above ground.
 * - `'upper1'` — First upper layer (above character sprites).
 * - `'upper2'` — Second upper layer (above upper1).
 * - `'shadow'` — Auto-generated shadow layer at cliff bases.
 */
export const LayerTypeSchema = v.picklist(['ground', 'ground_deco', 'upper1', 'upper2', 'shadow']);

/** Tile layer rendering type. */
export type LayerType = v.InferOutput<typeof LayerTypeSchema>;

// =============================================================================
// Tile Layer
// =============================================================================

/**
 * Tile layer schema.
 *
 * One layer of tile data in the map. The `data` array is a flat row-major
 * array of global tile IDs where 0 means empty/transparent.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TileLayerSchema } from './map-data';
 *
 * const result = safeParse(TileLayerSchema, {
 *   name: 'ground',
 *   type: 'ground',
 *   data: [1, 2, 3, 4, 0, 0, 1, 2, 3],
 * });
 * ```
 */
export const TileLayerSchema = v.strictObject({
	/** Layer name (for editor display and identification). */
	name: v.pipe(v.string(), v.minLength(1)),

	/** Layer type determines render order and height offset. */
	type: LayerTypeSchema,

	/**
	 * Flat row-major array of global tile IDs.
	 * Length must equal map `width * height`. ID 0 = empty/transparent.
	 */
	data: v.array(v.pipe(v.number(), v.integer(), v.minValue(0))),

	/** Whether this layer is visible in the renderer. */
	visible: v.optional(v.boolean(), true),

	/** Layer opacity (0 = fully transparent, 1 = fully opaque). */
	opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
});

/** Tile layer. */
export type TileLayer = v.InferOutput<typeof TileLayerSchema>;

// =============================================================================
// Map Data
// =============================================================================

/**
 * Top-level map data schema.
 *
 * Describes a complete tilemap: dimensions, tileset references, tile layers,
 * and an optional height map for cliff generation. This is a bootstrap schema
 * for Phase 1.3; Phase 3 will expand it with additional metadata.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { MapDataSchema, type MapData } from './map-data';
 *
 * const result = safeParse(MapDataSchema, {
 *   width: 32,
 *   height: 32,
 *   tilesets: [{
 *     name: 'terrain',
 *     imagePath: 'terrain.png',
 *     columns: 8,
 *     rows: 6,
 *     firstGid: 1,
 *   }],
 *   layers: [{
 *     name: 'ground',
 *     type: 'ground',
 *     data: new Array(1024).fill(1),
 *   }],
 * });
 * ```
 */
export const MapDataSchema = v.strictObject({
	/** Map width in tiles (1–500). */
	width: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),

	/** Map height in tiles (1–500). */
	height: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),

	/** Tile width in pixels (for UV calculations). */
	tileWidth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 48),

	/** Tile height in pixels (for UV calculations). */
	tileHeight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 48),

	/** Ordered tileset configurations (at least one required). */
	tilesets: v.pipe(v.array(TilesetConfigSchema), v.minLength(1)),

	/** Ordered tile layers (render order = array order, at least one required). */
	layers: v.pipe(v.array(TileLayerSchema), v.minLength(1)),

	/**
	 * Per-tile height map. Flat row-major array (length = width × height).
	 * Values 0–15. Omit for flat maps (all tiles at height 0).
	 */
	heightMap: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)))),

	/** Optional post-processing pipeline configuration for this map. */
	postProcessing: v.optional(PostProcessingConfigSchema),

	/** Optional lighting system configuration for this map. */
	lighting: v.optional(LightingConfigSchema),

	/** Optional sky and parallax background configuration for this map. */
	sky: v.optional(SkyConfigSchema),
});

/** Top-level map data. */
export type MapData = v.InferOutput<typeof MapDataSchema>;

// =============================================================================
// Chunk Config
// =============================================================================

/**
 * Chunk configuration schema for the tile rendering system.
 *
 * Controls how the map is subdivided into renderable chunks.
 * Each chunk is a square region of tiles that becomes a single
 * merged mesh per layer.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ChunkConfigSchema } from './map-data';
 *
 * const result = safeParse(ChunkConfigSchema, { chunkSize: 32 });
 * if (result.ok) {
 *   result.data.chunkSize; // 32
 * }
 * ```
 */
export const ChunkConfigSchema = v.strictObject({
	/** Chunk size in tiles (chunks are square). Range 4–64, default 16. */
	chunkSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(4), v.maxValue(64)), 16),
});

/** Chunk configuration. */
export type ChunkConfig = v.InferOutput<typeof ChunkConfigSchema>;
