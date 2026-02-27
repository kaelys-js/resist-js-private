# Tiles, Tilemap & Layers Expansion Design

**Date:** 2026-02-26
**Status:** In Progress
**Scope:** Full expansion of tile properties, layer system, autotile, animation, and supporting systems (water, fog of war, pathfinding, map properties)

### Progress

| # | Section | Status |
|---|---------|--------|
| 1 | Layer System Expansion | **In Progress** (Task 7 done: discriminated union) |
| 2 | Tile Properties & Flags | **Done** (Tasks 1-6: passability, terrain, flags, collision, custom props, animation defs) |
| 3 | Tile Flip/Rotate | Pending |
| 4 | Per-Tile Visual Overrides | Pending |
| 5 | Animated Tiles (Runtime) | Pending |
| 6 | Native Autotile System | Pending |
| 7 | Tileset Normal & Emission Maps | Pending |
| 8 | Water/Liquid Tiles | Pending |
| 9 | Fog of War | Pending |
| 10 | Map-Level Properties | Pending |
| 11 | Pathfinding Integration | Pending |
| 12 | Procedural Tile Helpers | Pending |

---

## Current State

The tilemap system has ~700 tests across the runtime. Current capabilities:

- 5 fixed layer types (`ground`, `ground_deco`, `upper1`, `upper2`, `shadow`)
- Flat tile grids with visibility + opacity per layer
- Chunked rendering (16x16 chunks), merged meshes per chunk/layer
- RPG Maker-style autotile (A2/A3/A4/animated_terrain) with hardcoded frame index tables
- `StandardMaterial` with NEAREST sampling, optional alpha test
- Tile IDs are plain integers referencing tileset positions
- No per-tile metadata, no flip/rotate, no object layers, no group layers

### Known Gaps

1. No per-tile properties (passability, terrain, collision, flags)
2. No tile flip/rotate (Tiled convention: bit-packed flags)
3. No per-tile visual overrides (tint, opacity, scale, offset)
4. No object layers (spawn points, trigger zones, collision regions)
5. No group layers (hierarchical folders)
6. No general animated tile system (only autotile animation)
7. No tileset normal/emission maps for HD-2D lighting
8. No water/liquid tile rendering
9. No fog of war
10. No Y-sort rendering
11. No map-level metadata (BGM, encounters, scroll type, hooks)
12. No pathfinding integration
13. Autotile system locked to RPG Maker format, no native terrain sets

---

## Design

### 1. Layer System Expansion

Three layer kinds replace the fixed 5-type enum:

#### Tile Layers (enhanced)

All current fields preserved. Layer type becomes a user-defined string -- the 5 current types become presets.

New properties:
- `tintColor` (RGBA multiply), `brightness` (-1 to 1), `saturation` (0-2), `contrast` (0-2)
- `offsetX`/`offsetY` (pixel shift), `parallaxFactorX`/`parallaxFactorY` (camera-relative scroll, default 1.0), `parallaxOriginX`/`parallaxOriginY`
- `scaleX`/`scaleY`, `renderOrder` (explicit z-index override)
- `castShadows`, `receiveShadows`, `depthWrite` (booleans)
- `maskLayer` (name of another layer used as alpha mask)
- `cullingPadding` (extra tiles beyond camera to prevent pop-in)
- `locked`, `collapsed`, `color` (editor flags)
- `ySortEnabled` (boolean) with per-tile Y-sort origin offset

#### Object Layers

Array of objects, each with: `id`, `name`, `class`, `x`/`y`/`width`/`height`, `rotation`, `shape` (rect/ellipse/point/polygon/polyline), `points` (for polygon/polyline), `visible`, `customProperties`.

Used for spawn points, trigger zones, collision boundaries, event regions. Not rendered as tiles -- the runtime exposes them as queryable data.

Additional properties: same visual/transform/editor properties as tile layers, plus `drawOrder` (`topdown` for Y-sort or `index` for array order).

#### Group Layers

Contains child layers (tile, object, or nested groups). Properties cascade:
- `visible` and `locked` cascade as AND (parent hidden = all children hidden)
- Visual properties (tint, opacity, brightness, saturation) cascade multiplicatively
- Transform properties (offset, parallax) cascade additively

Flattened at render time -- the chunk builder iterates leaf tile layers only.

---

### 2. Tile Properties & Flags

Two levels: per-tileset definitions (defined once) and per-placed-tile overrides (sparse).

#### Per-Tileset Tile Definitions

Each tile ID in a tileset can have:

**Passability:**
- `passable` (boolean master toggle)
- `passDirection` (per-direction N/S/E/W independently blockable)
- `passAbove` (can fly/jump over)
- `passBelow` (can tunnel/swim under)
- `passVehicle` (bitmask: foot, horse, boat, airship, custom)
- `passEvent` (whether NPCs can traverse, separate from player)
- `passHeight` (minimum height level required)
- `starPassage` (character walks through but renders behind tile)

**Terrain:**
- `terrainTag` (integer 0-15)
- `terrainType` (enum: normal, water, deepWater, lava, ice, sand, swamp, snow, grass, wood, stone, metal, custom)
- `footstepSound` (sound asset ID, overrides terrainType default)
- `encounterRate` (multiplier: 0=none, 1=normal, 2=double)
- `slipperiness` (0-1 friction modifier)
- `movementSpeed` (speed multiplier: 0.5=swamp, 1=normal, 1.5=road)
- `regionId` (integer 0-255 for scripting zones)

**Flags:**
- `bush` + `bushDepth` (pixels of sprite made semi-transparent, default 12)
- `counter` (interact with events across this tile)
- `damageFloor` + `damageAmount` (HP) + `damagePercent` (% max HP) + `damageElement` + `damageInterval` (steps between ticks)
- `ladder` (lock facing up)
- `slip` (disable dash/run)
- `shelter` (blocks weather effects)
- `reflection` + `reflectionOpacity` (0-1)
- `soundAbsorb` (mute/dampen footstep sounds)
- `glow` + `glowColor` (RGBA) + `glowIntensity` (0-1)
- `coverHeight` (0-1, how much of character sprite is hidden)

**Collision Shapes:**
Array of shapes, each with:
- `type`: rect, ellipse, polygon, polyline, circle
- `points`: Array of `{x, y}` vertices (normalized 0-1 relative to tile origin)
- `isTrigger` (passes through but fires events)
- `collisionGroup` (named group: "wall", "water", "barrier", "interactable")
- `collisionMask` (which groups this shape interacts with)
- `oneWay` + `oneWayDirection` (N/S/E/W -- ledges, one-way platforms)
- `height` (collision extends to this Y for 3D collision)
- `enabled` (togglable at runtime for doors, breakable walls)

**Custom Properties:**
- `properties`: `Record<string, string | number | boolean | string[]>`
- `class`: links to a user-defined type template (pre-fills property keys with typed defaults)
- `tags`: string[] for bulk queries (e.g., `["flammable", "destructible"]`)
- `scriptHook`: event script ID triggered on interaction/step/proximity

**Animation:** Frame sequence (array of `{tileId, duration}`) -- see Section 5.

**Probability:** Weight for random placement (editor feature).

---

### 3. Tile Flip/Rotate (Bit-Packed)

Tiled-compatible bit-packed flags in the top 3 bits of the 32-bit tile ID:

| Bit 31 (H) | Bit 30 (V) | Bit 29 (D) | Result |
|---|---|---|---|
| 0 | 0 | 0 | Original |
| 1 | 0 | 0 | Mirror horizontal |
| 0 | 1 | 0 | Mirror vertical |
| 1 | 1 | 0 | Rotate 180 |
| 0 | 0 | 1 | Rotate 90 CW + flip H |
| 1 | 0 | 1 | Rotate 90 CW |
| 0 | 1 | 1 | Rotate 270 CW |
| 1 | 1 | 1 | Rotate 90 CW + flip V |

Implementation:
- `resolveGlobalTileId` strips top 3 bits, returns real tile ID + flip flags
- UV manipulation only in `createFlatTileGeometry` -- no geometry changes
- Backward compatible: existing maps with plain IDs (top bits 0) work unchanged

---

### 4. Per-Tile Visual Overrides (Sparse)

Stored as `Map<tileIndex, TileOverrides>` -- only tiles with overrides consume memory.

**Transform:**
- `rotation` (0-360 degrees, arbitrary angles)
- `scaleX`/`scaleY` (per-tile scale, default 1.0)
- `offsetX`/`offsetY` (pixel-level nudge from grid position)
- `offsetZ` (vertical offset for uneven terrain, floating objects)

**Visual:**
- `tint` (RGBA color multiply)
- `opacity` (0-1)
- `brightness` (-1 to 1)
- `saturation` (0-2)

**Animation:**
- `animationSpeed` (playback rate override)
- `animationPhase` (0-1 starting phase offset)
- `animationPaused` (freeze at current frame)

**Rendering:**
- `renderOrder` (integer offset within same layer)
- `blendMode` (normal, add, multiply, screen)
- `castShadow`/`receiveShadow`
- `emissive` + `emissiveColor` (RGB) + `emissiveIntensity` (0-1)
- `normalMapOverride` (path to per-tile normal map)
- `depthWrite`

---

### 5. Animated Tiles

#### Definition (in tileset config)
- `frames`: Array of `{tileId: number, duration: number}`
- `playbackMode`: `loop` (default), `pingPong`, `once`, `random`
- `globalSync`: boolean (true = lockstep for water/lava, false = random phase offset for flowers/torches)
- `speedMultiplier`: runtime-adjustable playback rate (default 1.0)
- `pauseWhenOffscreen`: skip animation for off-camera tiles

#### Runtime System
- Single per-frame observer iterates all animated tile definitions
- Accumulates elapsed time, advances frame index when duration exceeded
- On frame change: updates UV lookup in tileset so all chunks automatically show new frame
- UV-only updates -- no geometry rebuild, no new draw calls
- Frame changes batched per tileset

---

### 6. Native Autotile System (Corner+Edge Terrain Sets)

Replaces RPG Maker-locked autotile with a native terrain set system. RPG Maker types preserved as compatibility/import layer.

#### Terrain Set Definition (in tileset config)
- `name`: e.g., "Grass-Dirt Transition"
- `type`: `corner` (4 corners), `edge` (4 edges), `cornerEdge` (full 8-way)
- `terrains`: Array of named terrains within the set
- `tileAssignments`: Map of tile IDs to corner/edge terrain labels (TL, TR, BL, BR for corners; N, S, E, W for edges)

#### Matching Algorithm
1. Examine 8 neighbors (or 4 for edge-only)
2. Determine terrain for each corner/edge based on neighbor continuity
3. Find tile whose labels match
4. Multiple matches: use probability weights for random variation
5. Fallback to default tile if no exact match

#### Coverage
- Corner: 16 combos per 2-terrain transition, typically 47-tile "blob" tileset
- Edge: 16 combos, good for paths/roads
- CornerEdge: 256 combos, most precise, graceful fallback when tiles missing

#### Compatibility
- Existing `autotileType` field still works
- New `terrainSets` field on tileset config for native definitions
- RPG Maker types translate to equivalent corner terrain sets at load time
- Tiled TMX import maps wangsets directly to this format

---

### 7. Tileset Normal & Emission Maps

Core to the HD-2D look -- per-tileset companion textures.

- **Normal map atlas:** Same dimensions as tile atlas, encodes surface normals so tiles respond to dynamic lighting with surface detail (brick bumps, wood grain, stone roughness)
- **Emission map atlas:** Same dimensions, encodes self-illumination regions (glowing windows, lava veins, magic runes)

Applied in the tile material shader. If no normal/emission map provided, behavior is unchanged.

---

### 8. Water/Liquid Tiles

Configurable rendering for water and liquid terrain:

- Shore foam generation at water-land boundaries
- Caustic light pattern projection onto underwater tiles
- Reflection of nearby tiles/sprites on water surface
- Configurable wave distortion, flow direction, speed

Tiles with `terrainType: water` (or `deepWater`, `lava`) automatically get water rendering. Parameters configurable per terrain type.

---

### 9. Fog of War

Per-tile visibility system:

- Three states: `hidden` (black), `explored` (greyed out), `visible` (full color)
- Runtime API: `revealRegion(rect)`, `hideRegion(rect)`, `getTileVisibility(x, z)`
- Smooth edge blending between visibility states
- Stored as a flat array matching map dimensions

---

### 10. Map-Level Properties

Global metadata per map:

- `displayName`, `bgm` (background music), `bgs` (background sound)
- `encounterList` (array of encounter definitions), `encounterSteps`
- `scrollType`: none, loop-horizontal, loop-vertical, loop-both
- `disableDash`, `specifyBattleback`
- Map hooks: `onEnter`, `onExit`, `onStep`, `onParallelProcess`

---

### 11. Pathfinding Integration

- Nav mesh generation from tile passability + collision shapes
- A* pathfinding with terrain movement cost support (uses `movementSpeed` field)
- Runtime API: `findPath(start, end)`, `generateNavMesh()`

---

### 12. Procedural Tile Helpers

- Weighted random fill using the probability field on tile definitions
- Noise-based terrain generation (Perlin/Simplex mapped to terrain sets)

---

## Runtime API Summary

```
getTileProperties(x, z, layerIndex)  -- merged tile definition for placed tile
getTilePassability(x, z)             -- combined passability across all layers
getTilesInRegion(rect)               -- bulk query for pathfinding
getObjectsOnLayer(layerName)         -- all objects from an object layer
revealRegion(rect)                   -- fog of war: reveal
hideRegion(rect)                     -- fog of war: hide
getTileVisibility(x, z)             -- fog of war: query
findPath(start, end)                 -- A* pathfinding
generateNavMesh()                    -- build nav mesh from passability
```

---

## Dev Harness Controls

- All layer properties as sliders/toggles/color pickers
- Per-tile property inspector
- Terrain set visualizer and debug overlay
- Animated tile controls (global speed, pause, per-tileset list)
- Flip/rotate debug overlay (colored borders on transformed tiles)
- Fog of war toggle and region reveal tool
- Water tile parameter controls
- Y-sort debug visualization

---

## Changelog Summary

| Category | Features |
|---|---|
| Layer Types | Object layers (rect/ellipse/point/polygon/polyline), Group layers (hierarchical with cascading props) |
| Layer Props | Tint, brightness, saturation, contrast, offset, parallax, scale, render order, shadows, depth write, mask, culling, editor flags, Y-sort |
| Tileset Rendering | Normal map atlas, Emission map atlas |
| Tile Properties | Passability (8 fields), Terrain (7 fields), Flags (11 types), Collision shapes (8 fields each), Custom props + class + tags + script hooks |
| Per-Tile Overrides | Transform (rotation, scale, offset), Visual (tint, opacity, brightness, saturation), Animation (speed, phase, pause), Rendering (order, blend, shadow, emissive, normal, depth) |
| Flip/Rotate | Tiled-compatible bit-packed (H/V/D) in top 3 bits of tile ID |
| Animated Tiles | Frame sequences, 4 playback modes, global sync vs phase offset, UV-only updates |
| Autotile | Native corner+edge terrain sets, RPG Maker compat layer, Tiled wangset import |
| Water/Liquid | Foam, caustics, reflection, wave distortion |
| Fog of War | Hidden/explored/visible states, smooth blending, runtime API |
| Map Properties | Display name, BGM/BGS, encounters, scroll type, hooks |
| Pathfinding | A* with nav mesh, terrain movement cost |
| Procedural | Weighted random fill, noise-based terrain generation |
| Runtime API | Tile queries, object queries, fog of war, pathfinding |
| Dev Harness | Controls for every configurable option |
