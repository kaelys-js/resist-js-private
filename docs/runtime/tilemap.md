# Tilemap Rendering

The tilemap renderer converts MapData JSON into 3D tile geometry rendered via Babylon.js. It uses a chunk-based merged geometry approach for efficient rendering.

## Overview

The map is divided into 16x16 tile chunks, each becoming a single merged Babylon.js `Mesh` per layer. This yields one draw call per chunk per layer, natural frustum culling, and fast partial rebuilds via `updateTile()` (rebuilds one chunk, not the entire map).

## Architecture

```
MapData JSON
  -> safeParse(MapDataSchema)
  -> TilesetLoader (load images, build UV lookup table)
  -> AutotileResolver (neighbor analysis -> pattern index)
  -> ChunkBuilder (per 16x16 chunk):
      -> TileGeometry (vertex generation per tile type)
      -> CliffGenerator (height diff -> cliff face vertices)
      -> Merge all vertices into one Mesh per layer
  -> TileAnimator (register UV cycling for animated tiles)
  -> TileMaterial (StandardMaterial, NEAREST sampling)
  -> TilemapRenderer (orchestrator)
```

## Chunk System

- Map divided into configurable chunks (default 16x16 tiles)
- 1 draw call per chunk per layer
- Natural frustum culling per chunk
- Fast partial rebuild via `updateTile()` (rebuilds 1 chunk, not the whole map)
- No custom shaders -- StandardMaterial with atlas texture, UVs baked into vertices

### Chunk Configuration

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `chunkSize` | Num | `16` | 4--64 | Chunk size in tiles |

## Autotile Format

WebForge uses a custom autotile format (not RPG Maker layout):

| Type | Patterns | Description |
|------|----------|-------------|
| `none` | 1 | Normal grid atlas -- each tile is one cell in the grid |
| `terrain_48` | 48 | 8-neighbor bitmask -> pattern index 0--47 |
| `wall_16` | 16 | 4-directional (N/S/E/W, no corners) |
| `animated_terrain` | 48 x N | terrain_48 with animation frames laid out horizontally |

## Tileset Configuration

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `name` | Str | (required) | -- | Tileset name |
| `imagePath` | Str | (required) | -- | Path to tileset image |
| `tileWidth` | Num | `48` | >= 1 | Tile width in pixels |
| `tileHeight` | Num | `48` | >= 1 | Tile height in pixels |
| `columns` | Num | (required) | >= 1 | Tile columns in image |
| `rows` | Num | (required) | >= 1 | Tile rows in image |
| `firstGid` | Num | (required) | >= 0 | First global tile ID |
| `autotileType` | Enum | `'none'` | 4 types | Autotile behavior |
| `animationFrames` | Num | `1` | >= 1 | Horizontal animation frames |
| `animationSpeed` | Num | `4` | >= 0.1 | Animation FPS |
| `tileProperties` | Record | `{}` | -- | Per-tile metadata |

## Tile Animation

Animated tiles cycle UV offsets on a timer via `scene.registerBeforeRender`. Frame rate is configurable per tileset via `animationSpeed` (FPS) and `animationFrames` (frame count).

## Layer Types

### Tile Layer

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kind` | `'tile'` | -- | Layer discriminant |
| `name` | Str | (required) | Layer name |
| `type` | Str | (required) | Layer type (ground, upper1, etc.) |
| `data` | Num[] | (required) | Tile ID array (width x height) |
| `visible` | Bool | `true` | Layer visibility |
| `opacity` | Num | `1` | Layer opacity (0--1) |
| `tintColor` | ColorRgba | white | Tint color |
| `brightness` | Num | `0` | Brightness (-1 to 1) |
| `saturation` | Num | `1` | Saturation (0--2) |
| `contrast` | Num | `1` | Contrast (0--2) |
| `offsetX` / `offsetY` | Num | `0` | Pixel offset |
| `parallaxFactorX` / `Y` | Num | `1` | Parallax scroll factor |
| `scaleX` / `scaleY` | Num | `1` | Scale (0.1--10) |
| `renderOrder` | Num | `0` | Explicit render order |
| `castShadows` | Bool | `false` | Layer casts shadows |
| `receiveShadows` | Bool | `true` | Layer receives shadows |
| `depthWrite` | Bool | `true` | Write to depth buffer |
| `blendMode` | Enum | `'alpha'` | Blend mode |
| `ySortEnabled` | Bool | `false` | Enable Y-sort |

### Object Layer

Contains `MapObject` instances with position, rotation, shape, and custom properties.

### Group Layer

Recursive container for nested layers of any kind.

## Tile Properties

Per-tile metadata for gameplay systems:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `passability` | Bool[4] | all true | [down, left, right, up] passability |
| `terrainTag` | Num | `0` | Terrain tag (0--15) |
| `height` | Num | `0` | Tile height level (0--15) |
| `terrainType` | Enum | `'normal'` | 13 terrain types |
| `damageFloor` | Bool | `false` | Damage floor (lava, poison) |
| `bush` | Bool | `false` | Bush (hides lower sprite) |
| `counter` | Bool | `false` | Counter (interact across) |
| `ladder` | Bool | `false` | Ladder (vertical climbing) |
| `reflection` | Bool | `false` | Surface reflection |
| `glow` | Bool | `false` | Tile emits glow |
| `movementSpeed` | Num | `1` | Movement speed multiplier |
| `footstepSound` | Str | `''` | Footstep sound ID |
| `collisionShapes` | Array | `[]` | Collision shapes |
| `regionId` | Num | `0` | Region ID (0--255) |

### Terrain Types

`normal`, `water`, `deepWater`, `lava`, `ice`, `sand`, `swamp`, `snow`, `grass`, `wood`, `stone`, `metal`, `custom`

### Collision Shapes

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | Enum | (required) | `'rect'`, `'ellipse'`, `'polygon'`, `'polyline'`, `'circle'` |
| `points` | Array | (required) | Vertices (0--1 normalized) |
| `isTrigger` | Bool | `false` | Trigger zone |
| `collisionGroup` | Str | `'wall'` | Collision group |
| `oneWay` | Bool | `false` | One-way collider |
| `oneWayDirection` | Enum | `'south'` | One-way direction |

## Map Data (Top-Level)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `width` | Num | (required) | 1--500 | Map width in tiles |
| `height` | Num | (required) | 1--500 | Map height in tiles |
| `tileWidth` | Num | `48` | >= 1 | Tile width in pixels |
| `tileHeight` | Num | `48` | >= 1 | Tile height in pixels |
| `tilesets` | Array | (required) | >= 1 | Tileset configurations |
| `layers` | Array | (required) | >= 1 | Layer array |
| `heightMap` | Num[] | -- | 0--15 | Per-tile height map |

## API

| Function | Module | Description |
|----------|--------|-------------|
| `renderTilemap` | `tilemap-renderer.ts` | MapData JSON -> scene pipeline |
| `disposeTilemap` | `tilemap-renderer.ts` | Clean up all resources |
| `updateTile` | `tilemap-renderer.ts` | Single-tile edit, rebuilds affected chunk |
| `loadTileset` | `tileset-loader.ts` | Load tileset image + UV lookup table |
| `computeTileUVs` | `tileset-loader.ts` | Pure UV math for grid atlas |
| `resolveGlobalTileId` | `tileset-loader.ts` | Map global tile ID -> tileset + local index |
| `resolveAutotile` | `autotile-resolver.ts` | Neighbor analysis -> pattern index |
| `buildAdjacencyBitmask` | `autotile-resolver.ts` | 8-neighbor bitmask computation |
| `createTileAnimator` | `tile-animator.ts` | Create UV cycling manager |
| `disposeTileAnimator` | `tile-animator.ts` | Clean up animation observers |

## Files

| File | Purpose |
|------|---------|
| `schemas/map-data.ts` | MapData, TileLayer, TilesetConfig, ChunkConfig schemas |
| `rendering/tilemap-renderer.ts` | Top-level orchestrator |
| `rendering/chunk-builder.ts` | Merged mesh per 16x16 chunk per layer |
| `rendering/tile-geometry.ts` | Vertex generation: flat quads, wall faces, buffer merge |
| `rendering/autotile-resolver.ts` | 48-frame autotile lookup + 8-neighbor bitmask |
| `rendering/cliff-generator.ts` | Height map -> cliff edge detection -> wall geometry |
| `rendering/tileset-loader.ts` | Tileset image loading + UV lookup table |
| `rendering/tile-material.ts` | StandardMaterial factory (NEAREST, no specular) |
| `rendering/tile-animator.ts` | UV cycling for animated tilesets |
| `rendering/tile-query.ts` | Tile inspection and querying |

## Known Limitations

- Animated tiles share material with static tiles (no separate sub-mesh yet)
- Autotile tileset images must match the WebForge 48-pattern layout
- No LOD or streaming for very large maps (>200x200)
