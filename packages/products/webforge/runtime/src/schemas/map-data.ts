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

import type { Num } from '@/schemas/common';

import { LightingConfigSchema } from './lighting-config';
import { PostProcessingConfigSchema } from './post-processing-config';
import { ColorRgbaSchema } from './color-schema';
import { BlendModeSchema, SkyConfigSchema } from './sky-config';

// =============================================================================
// Constants
// =============================================================================

/** Streaming threshold in tiles — maps exceeding this use region-based streaming. */
export const MAX_MAP_DIMENSION: Num = 16_384;

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
// Collision Shape
// =============================================================================

/**
 * Collision shape type picklist.
 *
 * Defines the geometric primitive used for a tile collision region.
 *
 * - `'rect'` — Axis-aligned rectangle.
 * - `'ellipse'` — Axis-aligned ellipse.
 * - `'polygon'` — Closed polygon (last point connects to first).
 * - `'polyline'` — Open polyline (no closing segment).
 * - `'circle'` — Circle (single center point, radius derived from context).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CollisionShapeTypeSchema } from './map-data';
 *
 * const result = safeParse(CollisionShapeTypeSchema, 'rect');
 * if (result.ok) {
 *   result.data; // 'rect'
 * }
 * ```
 */
export const CollisionShapeTypeSchema = v.picklist([
  'rect',
  'ellipse',
  'polygon',
  'polyline',
  'circle',
]);

/** Collision shape type. */
export type CollisionShapeType = v.InferOutput<typeof CollisionShapeTypeSchema>;

/**
 * A single collision point, normalized 0-1 relative to tile dimensions.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CollisionPointSchema } from './map-data';
 *
 * const result = safeParse(CollisionPointSchema, { x: 0.5, y: 0.5 });
 * if (result.ok) {
 *   result.data.x; // 0.5
 *   result.data.y; // 0.5
 * }
 * ```
 */
export const CollisionPointSchema = v.strictObject({
  /** X coordinate (0-1, normalized to tile width). */
  x: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Y coordinate (0-1, normalized to tile height). */
  y: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

/** A single collision point. */
export type CollisionPoint = v.InferOutput<typeof CollisionPointSchema>;

/**
 * One-way direction picklist for one-way collision shapes.
 *
 * Determines which direction allows passage through a one-way collider.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { OneWayDirectionSchema } from './map-data';
 *
 * const result = safeParse(OneWayDirectionSchema, 'south');
 * if (result.ok) {
 *   result.data; // 'south'
 * }
 * ```
 */
export const OneWayDirectionSchema = v.picklist(['north', 'south', 'east', 'west']);

/** One-way direction. */
export type OneWayDirection = v.InferOutput<typeof OneWayDirectionSchema>;

/**
 * Collision shape schema for physics and trigger detection.
 *
 * Each shape defines a collider region within tile bounds using normalized
 * coordinates (0-1). Supports rectangular, elliptical, polygonal, polyline,
 * and circular geometries with optional trigger, one-way, and grouping behavior.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CollisionShapeSchema } from './map-data';
 *
 * const result = safeParse(CollisionShapeSchema, {
 *   type: 'rect',
 *   points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
 *   collisionGroup: 'wall',
 * });
 * if (result.ok) {
 *   result.data.type;           // 'rect'
 *   result.data.collisionGroup; // 'wall'
 * }
 * ```
 */
export const CollisionShapeSchema = v.strictObject({
  /** Shape type. */
  type: CollisionShapeTypeSchema,
  /** Vertices (normalized 0-1 relative to tile origin). */
  points: v.array(CollisionPointSchema),
  /** Whether shape is a trigger (passes through but fires events). */
  isTrigger: v.optional(v.boolean(), false),
  /** Named collision group (e.g., "wall", "water", "barrier", "interactable"). */
  collisionGroup: v.optional(v.string(), 'wall'),
  /** Collision mask — which groups this shape interacts with. */
  collisionMask: v.optional(v.array(v.string()), (): string[] => []),
  /** Whether this is a one-way collider. */
  oneWay: v.optional(v.boolean(), false),
  /** Direction of one-way passage (only meaningful when oneWay is true). */
  oneWayDirection: v.optional(OneWayDirectionSchema, 'south'),
  /** Collision height for 3D collision (0-15). */
  height: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(15)), 0),
  /** Whether this shape is enabled (can be toggled at runtime). */
  enabled: v.optional(v.boolean(), true),
});

/** Collision shape for physics/trigger detection. */
export type CollisionShape = v.InferOutput<typeof CollisionShapeSchema>;

// =============================================================================
// Custom Property Value
// =============================================================================

/**
 * Custom property value type.
 * Supports string, number, boolean, and string array values.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CustomPropertyValueSchema } from './map-data';
 *
 * const strResult = safeParse(CustomPropertyValueSchema, 'hello');
 * const numResult = safeParse(CustomPropertyValueSchema, 42);
 * const boolResult = safeParse(CustomPropertyValueSchema, true);
 * const arrResult = safeParse(CustomPropertyValueSchema, ['a', 'b']);
 * ```
 */
export const CustomPropertyValueSchema = v.union([
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string()),
]);

/** Custom property value. */
export type CustomPropertyValue = v.InferOutput<typeof CustomPropertyValueSchema>;

// =============================================================================
// Animation Playback Mode
// =============================================================================

/**
 * Animation playback mode for tile animations.
 *
 * - `'loop'` — Repeats indefinitely (default).
 * - `'pingPong'` — Plays forward then backward repeatedly.
 * - `'once'` — Plays once and stops on last frame.
 * - `'random'` — Picks random frames (useful for flickering effects).
 */
export const AnimationPlaybackModeSchema = v.picklist(['loop', 'pingPong', 'once', 'random']);
export type AnimationPlaybackMode = v.InferOutput<typeof AnimationPlaybackModeSchema>;

// =============================================================================
// Animation Frame
// =============================================================================

/**
 * A single frame in a tile animation sequence.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { AnimationFrameSchema } from './map-data';
 *
 * const result = safeParse(AnimationFrameSchema, { tileId: 5, duration: 200 });
 * if (result.ok) {
 *   result.data.tileId;   // 5
 *   result.data.duration; // 200
 * }
 * ```
 */
export const AnimationFrameSchema = v.strictObject({
  /** Local tile ID to display for this frame. */
  tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
  /** Duration of this frame in milliseconds. */
  duration: v.pipe(v.number(), v.minValue(1)),
});
export type AnimationFrame = v.InferOutput<typeof AnimationFrameSchema>;

// =============================================================================
// Tile Properties
// =============================================================================

/**
 * Per-tile metadata schema.
 *
 * Stores passability, terrain tags, terrain type, movement modifiers,
 * collision shapes, custom properties, and special flags for individual
 * tiles within a tileset. Used by the movement system (Phase 4) for
 * collision and terrain-based game logic.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TilePropertiesSchema } from './map-data';
 *
 * const result = safeParse(TilePropertiesSchema, {
 *   height: 2,
 *   bush: true,
 *   terrainType: 'grass',
 *   class: 'treasure_chest',
 *   tags: ['flammable', 'destructible'],
 * });
 * if (result.ok) {
 *   result.data.passability;    // [true, true, true, true]
 *   result.data.height;          // 2
 *   result.data.bush;            // true
 *   result.data.terrainType;     // 'grass'
 *   result.data.movementSpeed;   // 1 (default)
 *   result.data['class'];        // 'treasure_chest'
 *   result.data.tags;            // ['flammable', 'destructible']
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

  /** Slip flag — disables dash/run on this tile. */
  slip: v.optional(v.boolean(), false),

  /** Shelter flag — blocks weather effects on this tile. */
  shelter: v.optional(v.boolean(), false),

  /** Bush depth in pixels (0–48). How much of character sprite is semi-transparent. */
  bushDepth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(48)), 12),

  /** Cover height (0–1). How much of character sprite is hidden by this tile. */
  coverHeight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),

  /** Sound absorb flag — mutes/dampens footstep sounds on this tile. */
  soundAbsorb: v.optional(v.boolean(), false),

  /** Damage amount in HP per tick. 0 = no damage. */
  damageAmount: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(9999)), 0),

  /** Damage as percentage of max HP per tick (0–100). */
  damagePercent: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 0),

  /** Damage element type (e.g., 'fire', 'poison'). Empty string = untyped. */
  damageElement: v.optional(v.string(), ''),

  /** Steps between damage ticks (1–999). */
  damageInterval: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(999)), 1),

  /** Reflection flag — whether tile surface shows reflections. */
  reflection: v.optional(v.boolean(), false),

  /** Reflection opacity (0–1). Only meaningful when `reflection` is true. */
  reflectionOpacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

  /** Glow flag — whether this tile emits a glow effect. */
  glow: v.optional(v.boolean(), false),

  /** Glow color as hex RGBA string (e.g., '#ff0000ff'). */
  glowColor: v.optional(v.string(), '#ffffffff'),

  /** Glow intensity (0–1). Only meaningful when `glow` is true. */
  glowIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),

  /**
   * Collision shapes for physics/trigger detection.
   * Each shape defines a collider region within the tile bounds.
   */
  collisionShapes: v.optional(v.array(CollisionShapeSchema), (): CollisionShape[] => []),

  /**
   * Custom properties for game logic. Keyed by property name,
   * values can be string, number, boolean, or string array.
   */
  properties: v.optional(
    v.record(v.string(), CustomPropertyValueSchema),
    (): Record<string, CustomPropertyValue> => ({}),
  ),

  /** Class name linking to a user-defined type template. */
  class: v.optional(v.string(), ''),

  /** Tags for bulk queries (e.g., ["flammable", "destructible"]). */
  tags: v.optional(v.array(v.string()), (): string[] => []),

  /** Event script ID triggered on interaction/step/proximity. */
  scriptHook: v.optional(v.string(), ''),

  /**
   * Animation frame sequence for this tile.
   * Each frame specifies a tile ID and duration in milliseconds.
   * Empty array = no animation.
   */
  frames: v.optional(v.array(AnimationFrameSchema), (): AnimationFrame[] => []),

  /**
   * Animation playback mode.
   * Only meaningful when `frames` is non-empty.
   */
  playbackMode: v.optional(AnimationPlaybackModeSchema, 'loop'),

  /**
   * Whether all tiles with this animation play in sync (true)
   * or with random phase offsets (false).
   * true = lockstep for water/lava, false = random for flowers/torches.
   */
  globalSync: v.optional(v.boolean(), true),

  /**
   * Animation playback speed multiplier. 1 = normal speed.
   */
  speedMultiplier: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),

  /**
   * Whether to pause animation when tile is off-screen.
   */
  pauseWhenOffscreen: v.optional(v.boolean(), true),

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

// =============================================================================
// Map Object Shape
// =============================================================================

/**
 * Shape type picklist for map objects.
 *
 * Determines the geometric shape representation of an object on the map.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { MapObjectShapeSchema } from './map-data';
 *
 * const result = safeParse(MapObjectShapeSchema, 'rect');
 * if (result.ok) {
 *   result.data; // 'rect'
 * }
 * ```
 */
export const MapObjectShapeSchema = v.picklist(['rect', 'ellipse', 'point', 'polygon', 'polyline']);

/** Map object geometric shape. */
export type MapObjectShape = v.InferOutput<typeof MapObjectShapeSchema>;

// =============================================================================
// Draw Order
// =============================================================================

/**
 * Draw order mode for object layers.
 *
 * - `'topdown'` — Objects are drawn from top to bottom by Y coordinate.
 * - `'index'` — Objects are drawn in array index order.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { DrawOrderSchema } from './map-data';
 *
 * const result = safeParse(DrawOrderSchema, 'topdown');
 * if (result.ok) {
 *   result.data; // 'topdown'
 * }
 * ```
 */
export const DrawOrderSchema = v.picklist(['topdown', 'index']);

/** Draw order mode. */
export type DrawOrder = v.InferOutput<typeof DrawOrderSchema>;

// =============================================================================
// Map Object
// =============================================================================

/**
 * Map object schema for object layers.
 *
 * Represents a positioned object on the map such as a spawn point, NPC,
 * trigger zone, or any other non-tile entity.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { MapObjectSchema } from './map-data';
 *
 * const result = safeParse(MapObjectSchema, {
 *   id: 'spawn-1',
 *   x: 128,
 *   y: 256,
 *   name: 'Player Start',
 *   shape: 'point',
 * });
 * if (result.ok) {
 *   result.data.id;    // 'spawn-1'
 *   result.data.shape; // 'point'
 * }
 * ```
 */
export const MapObjectSchema = v.strictObject({
  /** Unique identifier for this object. */
  id: v.pipe(v.string(), v.nonEmpty()),
  /** Display name. */
  name: v.optional(v.string(), ''),
  /** Class name linking to a user-defined type template. */
  class: v.optional(v.string(), ''),
  /** X position in pixels. */
  x: v.number(),
  /** Y position in pixels. */
  y: v.number(),
  /** Object width in pixels (only meaningful for rect/ellipse shapes). */
  width: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  /** Object height in pixels (only meaningful for rect/ellipse shapes). */
  height: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  /** Rotation in degrees (0–360). */
  rotation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 0),
  /** Geometric shape type. */
  shape: v.optional(MapObjectShapeSchema, 'rect'),
  /** Polygon/polyline vertex points. */
  points: v.optional(
    v.array(v.strictObject({ x: v.number(), y: v.number() })),
    (): Array<{ x: number; y: number }> => [],
  ),
  /** Whether this object is visible in the renderer. */
  visible: v.optional(v.boolean(), true),
  /** Custom properties for game logic. */
  customProperties: v.optional(
    v.record(v.string(), CustomPropertyValueSchema),
    (): Record<string, CustomPropertyValue> => ({}),
  ),
});

/** Map object. */
export type MapObject = v.InferOutput<typeof MapObjectSchema>;

// =============================================================================
// Tile Layer
// =============================================================================

/**
 * Tile layer schema.
 *
 * One layer of tile data in the map. The `data` array is a flat row-major
 * array of global tile IDs where 0 means empty/transparent.
 *
 * The `type` field accepts any non-empty string. The original 5 preset values
 * (`'ground'`, `'ground_deco'`, `'upper1'`, `'upper2'`, `'shadow'`) are still
 * available via {@link LayerTypeSchema} for reference, but custom types are
 * now supported for user-defined layer categories.
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
  /** Layer kind discriminant. Defaults to `'tile'` for backward compatibility. */
  kind: v.optional(v.literal('tile'), 'tile'),

  /** Layer name (for editor display and identification). */
  name: v.pipe(v.string(), v.minLength(1)),

  /**
   * Layer type determines render order and height offset.
   * Accepts any non-empty string — the 5 preset types are still recommended.
   */
  type: v.pipe(v.string(), v.minLength(1)),

  /**
   * Flat row-major array of global tile IDs.
   * Length must equal map `width * height`. ID 0 = empty/transparent.
   */
  data: v.custom<readonly Num[]>((val): boolean => {
    if (!Array.isArray(val)) return false;
    for (const n of val) {
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return false;
    }
    return true;
  }, 'Expected array of non-negative integers'),

  /** Whether this layer is visible in the renderer. */
  visible: v.optional(v.boolean(), true),

  /** Layer opacity (0 = fully transparent, 1 = fully opaque). */
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),

  // Visual properties
  /** Tint color applied to the layer. */
  tintColor: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
  /** Brightness adjustment (-1 to 1). 0 = no change. */
  brightness: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0),
  /** Saturation multiplier (0 to 2). 1 = no change. */
  saturation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  /** Contrast multiplier (0 to 2). 1 = no change. */
  contrast: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),

  // Transform
  /** Horizontal pixel offset. */
  offsetX: v.optional(v.number(), 0),
  /** Vertical pixel offset. */
  offsetY: v.optional(v.number(), 0),
  /** Parallax scroll factor X (1 = normal scroll, 0 = fixed). */
  parallaxFactorX: v.optional(v.number(), 1),
  /** Parallax scroll factor Y (1 = normal scroll, 0 = fixed). */
  parallaxFactorY: v.optional(v.number(), 1),
  /** Parallax origin X in pixels. */
  parallaxOriginX: v.optional(v.number(), 0),
  /** Parallax origin Y in pixels. */
  parallaxOriginY: v.optional(v.number(), 0),
  /** Horizontal scale factor (0.1 to 10). */
  scaleX: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),
  /** Vertical scale factor (0.1 to 10). */
  scaleY: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),

  // Rendering
  /** Explicit render order (integer). Higher values draw later. */
  renderOrder: v.optional(v.pipe(v.number(), v.integer()), 0),
  /** Whether this layer casts shadows. */
  castShadows: v.optional(v.boolean(), false),
  /** Whether this layer receives shadows. */
  receiveShadows: v.optional(v.boolean(), true),
  /** Whether this layer writes to the depth buffer. */
  depthWrite: v.optional(v.boolean(), true),
  /** Name of a mask layer controlling visibility. */
  maskLayer: v.optional(v.string(), ''),
  /** Extra tile padding for frustum culling (0–16). */
  cullingPadding: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(16)), 0),
  /** Whether Y-sort is enabled for this layer. */
  ySortEnabled: v.optional(v.boolean(), false),
  /** Blend mode for compositing. */
  blendMode: v.optional(BlendModeSchema, 'alpha'),

  // Editor
  /** Whether this layer is locked in the editor. */
  locked: v.optional(v.boolean(), false),
  /** Whether this layer is collapsed in the editor panel. */
  collapsed: v.optional(v.boolean(), false),
  /** Editor color tag (hex string or empty). */
  color: v.optional(v.string(), ''),
});

/** Tile layer. */
export type TileLayer = v.InferOutput<typeof TileLayerSchema>;

// =============================================================================
// Object Layer
// =============================================================================

/**
 * Object layer schema for non-tile entities.
 *
 * Contains positioned objects such as spawn points, NPCs, trigger zones,
 * and other map entities that are not part of the tile grid.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ObjectLayerSchema } from './map-data';
 *
 * const result = safeParse(ObjectLayerSchema, {
 *   kind: 'object',
 *   name: 'npcs',
 *   objects: [{ id: 'npc-1', x: 128, y: 256 }],
 * });
 * ```
 */
export const ObjectLayerSchema = v.strictObject({
  /** Layer kind discriminant. Must be `'object'`. */
  kind: v.literal('object'),
  /** Layer name (for editor display and identification). */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Objects contained in this layer. */
  objects: v.optional(v.array(MapObjectSchema), (): MapObject[] => []),
  /** Draw order mode for objects. */
  drawOrder: v.optional(DrawOrderSchema, 'topdown'),
  /** Whether this layer is visible in the renderer. */
  visible: v.optional(v.boolean(), true),
  /** Layer opacity (0 = fully transparent, 1 = fully opaque). */
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
  /** Tint color applied to the layer. */
  tintColor: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
  /** Brightness adjustment (-1 to 1). 0 = no change. */
  brightness: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0),
  /** Saturation multiplier (0 to 2). 1 = no change. */
  saturation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  /** Contrast multiplier (0 to 2). 1 = no change. */
  contrast: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  /** Horizontal pixel offset. */
  offsetX: v.optional(v.number(), 0),
  /** Vertical pixel offset. */
  offsetY: v.optional(v.number(), 0),
  /** Whether this layer is locked in the editor. */
  locked: v.optional(v.boolean(), false),
});

/** Object layer. */
export type ObjectLayer = v.InferOutput<typeof ObjectLayerSchema>;

// =============================================================================
// Group Layer
// =============================================================================

/**
 * Group layer schema for organizing layers into hierarchical folders.
 *
 * Contains child layers of any kind (tile, object, or group), enabling
 * recursive nesting for complex map organization. Uses `v.lazy` for
 * the recursive `children` reference to {@link LayerSchema}.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { GroupLayerSchema } from './map-data';
 *
 * const result = safeParse(GroupLayerSchema, {
 *   kind: 'group',
 *   name: 'Buildings',
 *   children: [
 *     { name: 'walls', type: 'upper1', data: [1, 2, 3] },
 *     { kind: 'object', name: 'doors', objects: [] },
 *   ],
 * });
 * ```
 */
export const GroupLayerSchema = v.strictObject({
  /** Layer kind discriminant. Must be `'group'`. */
  kind: v.literal('group'),
  /** Layer name (for editor display and identification). */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Child layers (recursive — can contain any layer kind). */
  children: v.optional(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive reference via v.lazy
    v.array(v.lazy((): v.GenericSchema => LayerSchema)),
    (): unknown[] => [],
  ),
  /** Whether this layer group is visible in the renderer. */
  visible: v.optional(v.boolean(), true),
  /** Group opacity (0 = fully transparent, 1 = fully opaque). */
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
  /** Tint color applied to the group. */
  tintColor: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
  /** Brightness adjustment (-1 to 1). 0 = no change. */
  brightness: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0),
  /** Saturation multiplier (0 to 2). 1 = no change. */
  saturation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  /** Contrast multiplier (0 to 2). 1 = no change. */
  contrast: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  /** Horizontal pixel offset. */
  offsetX: v.optional(v.number(), 0),
  /** Vertical pixel offset. */
  offsetY: v.optional(v.number(), 0),
  /** Whether this layer group is locked in the editor. */
  locked: v.optional(v.boolean(), false),
});

/** Group layer. */
export type GroupLayer = v.InferOutput<typeof GroupLayerSchema>;

// =============================================================================
// Layer Schema (Discriminated Union)
// =============================================================================

/**
 * Discriminated union of all layer kinds.
 *
 * Uses `v.union` to try each schema in order:
 * 1. ObjectLayerSchema (requires `kind: 'object'`)
 * 2. GroupLayerSchema (requires `kind: 'group'`)
 * 3. TileLayerSchema (fallback — `kind` defaults to `'tile'`)
 *
 * This ordering ensures backward compatibility: existing tile layers
 * without a `kind` field are parsed as TileLayerSchema.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { LayerSchema, type Layer } from './map-data';
 *
 * // Tile layer (backward compat, no kind)
 * const tile = safeParse(LayerSchema, { name: 'ground', type: 'ground', data: [1] });
 *
 * // Object layer
 * const obj = safeParse(LayerSchema, { kind: 'object', name: 'npcs', objects: [] });
 *
 * // Group layer
 * const grp = safeParse(LayerSchema, { kind: 'group', name: 'world', children: [] });
 * ```
 */
export const LayerSchema = v.union([ObjectLayerSchema, GroupLayerSchema, TileLayerSchema]);

/** Any layer kind (tile, object, or group). */
export type Layer = v.InferOutput<typeof LayerSchema>;

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
  /** Map width in tiles (≥1). Maps larger than 16384 use streaming. */
  width: v.pipe(v.number(), v.integer(), v.minValue(1)),

  /** Map height in tiles (≥1). Maps larger than 16384 use streaming. */
  height: v.pipe(v.number(), v.integer(), v.minValue(1)),

  /** Tile width in pixels (for UV calculations). */
  tileWidth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 48),

  /** Tile height in pixels (for UV calculations). */
  tileHeight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 48),

  /** Ordered tileset configurations (at least one required). */
  tilesets: v.pipe(v.array(TilesetConfigSchema), v.minLength(1)),

  /** Ordered layers (render order = array order, at least one required). */
  layers: v.pipe(v.array(LayerSchema), v.minLength(1)),

  /**
   * Per-tile height map. Flat row-major array (length = width × height).
   * Values 0–15. Omit for flat maps (all tiles at height 0).
   */
  heightMap: v.optional(
    v.custom<readonly Num[]>((val): boolean => {
      if (!Array.isArray(val)) return false;
      for (const n of val) {
        if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 15) return false;
      }
      return true;
    }, 'Expected array of integers 0–15'),
  ),

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
