# Tilemap Rendering

The tilemap renderer converts MapData JSON into a fully rendered scene via Babylon.js. Flat tile layers use a GPU data texture shader (1 draw call per layer). Cliff geometry uses merged chunk meshes. Maps exceeding 16384 tiles in either dimension use region-based streaming. Object layers use thin-instance rendering.

## Overview

Three rendering systems handle different map elements:

1. **GPU Data Texture Renderer** -- Flat tile layers rendered as one quad per layer with a custom `MaterialPluginBase` shader that samples tile IDs from an RGBA32UI data texture.
2. **Streaming/Virtualization** -- Maps larger than 16384 tiles in either dimension use chunked data textures loaded on demand with LRU eviction.
3. **Thin-Instance Object Renderer** -- Props, NPCs, and events rendered via Babylon.js thin instances (1 draw call per mesh type) with a quadtree spatial index.

The legacy chunk builder is retained for cliff/wall geometry (irregular meshes at height transitions).

## Architecture

```
MapData JSON
  -> safeParse(MapDataSchema)
  -> TilesetLoader (load images, build UV lookup table)
  -> For flat tile layers (maps <= 16384):
      -> GpuTileRenderer:
          -> GpuTileDataTexture (build Uint32Array per layer)
          -> GpuTileMaterialPlugin (data texture lookup in fragment shader)
          -> 1 ground-plane mesh per layer, 1 draw call each
  -> For flat tile layers (maps > 16384):
      -> TileStreaming:
          -> Region Manager (load/evict 2048-tile regions around camera)
          -> Per-region data textures + meshes
  -> For cliff/wall geometry:
      -> ChunkBuilder (legacy 16x16 merged meshes)
  -> For object layers:
      -> ObjectInstanceRenderer:
          -> Quadtree spatial index
          -> Thin-instance buffers per mesh type
  -> TileAnimator (register UV cycling for animated tiles)
  -> TilemapRenderer (top-level orchestrator)
```

## GPU Data Texture Renderer (System 1)

Each flat tile layer is rendered as a single ground-plane mesh with a custom shader:

- **Data Texture** -- `RGBA32UI` texture where each texel = one tile. R = tile ID (uint32), G = visual flags bitfield.
- **MaterialPluginBase** -- Hooks into `StandardMaterial` to override diffuse color lookup. Preserves all Babylon.js lighting, shadows, fog, glow, and post-FX.
- **Result** -- 1 draw call per layer regardless of map size.

### Visual Flags (G Channel)

| Bits | Width | Flag |
|------|-------|------|
| 0 | 1 | Flip horizontal |
| 1 | 1 | Flip vertical |
| 2--3 | 2 | Rotation (0/90/180/270) |
| 4--7 | 4 | Per-tile opacity (0--15 maps to 0.0--1.0) |
| 8 | 1 | Shadow receive override |
| 9 | 1 | Glow flag |
| 10--15 | 6 | Tint palette index (0--63) |
| 16--23 | 8 | Animation base frame (0--255) |
| 24--27 | 4 | Animation frame count (0--15) |
| 28 | 1 | Bush transparency flag |
| 29--31 | 3 | Reserved |

### Per-Layer Shader Uniforms

| Property | Uniform | Shader Usage |
|----------|---------|-------------|
| `opacity` | `float layerOpacity` | Multiplied into final alpha |
| `visible` | mesh `setEnabled()` | Layer quad hidden entirely |
| `tintColor` | `vec4 layerTint` | Multiplied into diffuse color |
| `brightness` | `float layerBrightness` | Added to RGB after lighting |
| `saturation` | `float layerSaturation` | HSL adjustment in fragment |
| `contrast` | `float layerContrast` | Contrast curve in fragment |
| `offsetX/Y` | `vec2 layerOffset` | Added to tile coordinate in shader |

### Tile Editing

Single-tile edits update one texel in the data texture via `texSubImage2D` (~0.01ms). No mesh rebuild needed.

## Streaming (System 2)

For maps exceeding 16384 tiles in either dimension, the map is divided into regions loaded on demand.

### Streaming Configuration

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `regionSize` | Num | `2048` | 2048, 4096 | Region size in tiles |
| `maxLoadedRegions` | Num | `16` | 4--64 | Maximum regions in memory (LRU eviction) |
| `loadRadius` | Num | `1` | 0--4 | Extra regions to preload around viewport |
| `unloadDistance` | Num | `3` | 2--8 | Distance before region eviction |

### How It Works

1. Camera viewport converted to tile coordinates.
2. Compute which regions overlap the viewport + load radius buffer.
3. Load needed regions (allocate data texture, upload tile data, create layer mesh).
4. Evict regions beyond unload distance (LRU).
5. Each visible region = 1 quad per layer.

Draw calls = `visibleRegions x layers` (e.g., 9 regions x 4 layers = 36 draw calls for a 50000x50000 map).

## Object Renderer (System 3)

Object layers (props, NPCs, events) use Babylon.js thin instances for efficient rendering.

### ObjectInstance Schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | Str | (required) | Unique instance identifier |
| `meshType` | Str | (required) | Base mesh type (e.g., 'torch', 'tree-oak') |
| `position` | [Num, Num, Num] | (required) | World XYZ position |
| `rotation` | [Num, Num, Num] | `[0, 0, 0]` | Euler rotation XYZ |
| `scale` | [Num, Num, Num] | `[1, 1, 1]` | Scale XYZ |
| `tintColor` | [Num, Num, Num, Num] | `[1, 1, 1, 1]` | Per-instance tint RGBA |
| `visible` | Bool | `true` | Instance visibility |
| `eventId` | Str | `''` | Event trigger identifier |
| `scriptHook` | Str | `''` | Script hook name |
| `properties` | Record | `{}` | Custom key-value properties |

### Quadtree Spatial Index

A 2D quadtree stores all object positions for fast AABB queries:

- Configurable max depth and items per node
- Sub-millisecond queries for 100K+ objects
- Automatic subdivision on insert, deduplication on query

### Rendering

1. Each unique `meshType` gets one base mesh.
2. All instances of that type share a transform matrix buffer (`thinInstanceSetBuffer`).
3. Frustum culling via quadtree query each frame.
4. 1 draw call per mesh type, regardless of instance count.

## Chunk System (Cliff/Wall Geometry)

Cliff faces at height transitions use the legacy chunk builder:

- Map divided into configurable chunks (default 16x16 tiles)
- 1 draw call per chunk
- `StandardMaterial` with atlas texture, UVs baked into vertices

### Chunk Configuration

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `chunkSize` | Num | `16` | 4--64 | Chunk size in tiles |

## Autotile Format

| Type | Patterns | Description |
|------|----------|-------------|
| `none` | 1 | Normal grid atlas -- each tile is one cell |
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

Contains `MapObject` instances with position, rotation, shape, and custom properties. Object layers are rendered via the thin-instance object renderer.

### Group Layer

Recursive container for nested layers of any kind.

## Tile Properties

Per-tile metadata for gameplay systems (CPU-side only, not in GPU texture):

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
| `width` | Num | (required) | >= 1 | Map width in tiles (no upper limit; >16384 uses streaming) |
| `height` | Num | (required) | >= 1 | Map height in tiles (no upper limit; >16384 uses streaming) |
| `tileWidth` | Num | `48` | >= 1 | Tile width in pixels |
| `tileHeight` | Num | `48` | >= 1 | Tile height in pixels |
| `tilesets` | Array | (required) | >= 1 | Tileset configurations |
| `layers` | Array | (required) | >= 1 | Layer array |
| `heightMap` | Num[] | -- | 0--15 | Per-tile height map |

## Performance

| Map Size | Rendering System | Draw Calls |
|----------|-----------------|------------|
| 300x300, 4 layers | GPU data texture | 4 |
| 1000x1000, 4 layers | GPU data texture | 4 |
| 16384x16384, 4 layers | GPU data texture | 4 |
| 50000x50000, 4 layers | Streaming (9 regions) | ~36 |
| 10,000 torch props | Thin-instance | 1 |
| 50 types, 100K objects | Thin-instance | 50 |

## API

| Function | Module | Description |
|----------|--------|-------------|
| `renderTilemap` | `tilemap-renderer.ts` | MapData JSON -> scene pipeline (routes to GPU/streaming/objects) |
| `disposeTilemap` | `tilemap-renderer.ts` | Clean up all resources (GPU layers, streaming, objects, chunks) |
| `updateTile` | `tilemap-renderer.ts` | Single-tile edit via `texSubImage2D` (~0.01ms) |
| `setLayerVisibility` | `tilemap-renderer.ts` | Toggle GPU layer visibility |
| `setLayerOpacity` | `tilemap-renderer.ts` | Set GPU layer opacity |
| `createGpuTileLayer` | `gpu-tile-renderer.ts` | Create one GPU-rendered tile layer |
| `updateGpuTile` | `gpu-tile-renderer.ts` | Update single tile in data texture |
| `setGpuLayerTint` | `gpu-tile-renderer.ts` | Set layer tint color |
| `setGpuLayerBrightness` | `gpu-tile-renderer.ts` | Set layer brightness |
| `setGpuLayerSaturation` | `gpu-tile-renderer.ts` | Set layer saturation |
| `setGpuLayerContrast` | `gpu-tile-renderer.ts` | Set layer contrast |
| `setGpuLayerOffset` | `gpu-tile-renderer.ts` | Set layer scroll offset |
| `packVisualFlags` | `gpu-tile-data-texture.ts` | Encode visual flags to uint32 |
| `unpackVisualFlags` | `gpu-tile-data-texture.ts` | Decode visual flags from uint32 |
| `buildLayerData` | `gpu-tile-data-texture.ts` | Build Uint32Array for data texture |
| `createStreamingManager` | `tile-streaming.ts` | Create region-based streaming manager |
| `createObjectRenderer` | `object-instance-renderer.ts` | Create thin-instance object renderer |
| `createQuadtree` | `object-quadtree.ts` | Create spatial index |
| `queryRect` | `object-quadtree.ts` | Query objects in AABB |
| `loadTileset` | `tileset-loader.ts` | Load tileset image + UV lookup table |
| `resolveAutotile` | `autotile-resolver.ts` | Neighbor analysis -> pattern index |
| `createTileAnimator` | `tile-animator.ts` | Create UV cycling manager |

## Files

| File | Purpose |
|------|---------|
| `schemas/map-data.ts` | MapData, TileLayer, TilesetConfig, ChunkConfig, MapObject schemas |
| `schemas/object-instance.ts` | ObjectInstance schema (placed objects with transforms) |
| `rendering/tilemap-renderer.ts` | Top-level orchestrator (routes to GPU/streaming/objects/chunks) |
| `rendering/gpu-tile-renderer.ts` | GPU data texture layer creation, updates, and disposal |
| `rendering/gpu-tile-shader.ts` | GLSL vertex/fragment shader source strings |
| `rendering/gpu-tile-data-texture.ts` | Data texture creation, visual flags pack/unpack |
| `rendering/gpu-tile-material-plugin.ts` | MaterialPluginBase for StandardMaterial shader hooks |
| `rendering/tile-streaming.ts` | Region-based streaming manager for large maps |
| `schemas/streaming-config.ts` | StreamingConfig schema |
| `rendering/object-instance-renderer.ts` | Thin-instance object renderer |
| `rendering/object-quadtree.ts` | Quadtree spatial index for objects |
| `rendering/chunk-builder.ts` | Merged mesh per 16x16 chunk (cliff geometry) |
| `rendering/tile-geometry.ts` | Vertex generation: flat quads, wall faces, buffer merge |
| `rendering/autotile-resolver.ts` | 48-frame autotile lookup + 8-neighbor bitmask |
| `rendering/cliff-generator.ts` | Height map -> cliff edge detection -> wall geometry |
| `rendering/tileset-loader.ts` | Tileset image loading + UV lookup table |
| `rendering/tile-material.ts` | StandardMaterial factory (NEAREST, no specular) |
| `rendering/tile-animator.ts` | UV cycling for animated tilesets |
| `rendering/tile-query.ts` | Tile inspection and querying |
