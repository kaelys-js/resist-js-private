# Tilemap Rendering Architecture

## Overview

The tilemap renderer converts MapData JSON into 3D tile geometry rendered via Babylon.js. It uses a **chunk-based merged geometry** approach where the map is divided into 16x16 tile chunks, each becoming a single merged Babylon.js `Mesh` per layer.

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

## Autotile Format

WebForge uses a custom autotile format (not RPG Maker layout):

- **`'none'`** -- Normal grid atlas. Each tile = one cell in the grid.
- **`'terrain_48'`** -- 48-pattern terrain autotile. 8-neighbor bitmask -> pattern index 0-47.
- **`'wall_16'`** -- 16-pattern wall autotile. 4-directional (N/S/E/W, no corners).
- **`'animated_terrain'`** -- terrain_48 with animation frames laid out horizontally.

## Tile Animation

Animated tiles cycle UV offsets on a timer via `scene.registerBeforeRender`. Frame rate configurable per tileset via `animationSpeed` (fps) and `animationFrames` (frame count).

## Public API

### Renderer

- `renderTilemap(options)` -- MapData JSON -> scene pipeline
- `disposeTilemap(options)` -- Clean up all resources
- `updateTile(options)` -- Single-tile edit, rebuilds affected chunk only

### Tileset Loader

- `loadTileset(options)` -- Load tileset image + UV lookup table
- `computeTileUVs(options)` -- Pure UV math for grid atlas
- `resolveGlobalTileId(options)` -- Map global tile ID -> tileset + local index

### Autotile

- `resolveAutotile(options)` -- Neighbor analysis -> pattern index
- `buildAdjacencyBitmask(options)` -- 8-neighbor bitmask computation

### Animator

- `createTileAnimator(options)` -- Create UV cycling manager
- `disposeTileAnimator(options)` -- Clean up animation observers

### Schemas

- `MapDataSchema`, `TileLayerSchema`, `TilesetConfigSchema`
- `TilePropertiesSchema`, `ChunkConfigSchema`
- `AutotileTypeSchema`, `LayerTypeSchema`

## File Map

| File | Purpose |
|------|---------|
| `schemas/map-data.ts` | MapData, TileLayer, TilesetConfig, ChunkConfig schemas |
| `rendering/tile-geometry.ts` | Vertex generation: flat quads, wall faces, buffer merge |
| `rendering/autotile-resolver.ts` | 48-frame autotile lookup + 8-neighbor bitmask |
| `rendering/cliff-generator.ts` | Height map -> cliff edge detection -> wall geometry |
| `rendering/tileset-loader.ts` | Tileset image loading + UV lookup table |
| `rendering/tile-material.ts` | StandardMaterial factory (NEAREST, no specular) |
| `rendering/tile-animator.ts` | UV cycling for animated tilesets |
| `rendering/chunk-builder.ts` | Merged mesh per 16x16 chunk per layer |
| `rendering/tilemap-renderer.ts` | Top-level orchestrator |

## Testing

All modules have colocated `.test.ts` files. Pure math modules (tile-geometry, autotile-resolver, cliff-generator) use logic tests. Modules touching Babylon.js (tileset-loader, tile-material, tile-animator, chunk-builder, tilemap-renderer) use NullEngine integration tests.

## Known Limitations

- Animated tiles share material with static tiles (no separate sub-mesh yet)
- Autotile tileset images must match the WebForge 48-pattern layout
- No LOD or streaming for very large maps (>200x200)
- Phase 25 will add RPG Maker tileset import/conversion
