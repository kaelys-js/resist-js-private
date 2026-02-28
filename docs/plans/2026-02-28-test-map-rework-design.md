# Professional Test Map Rework — Design

## Goal

Replace the placeholder test map with a hand-crafted RPG village scene that uses 10 tilesets (up from 2), features 7 distinct terrain zones, adds procedural 3D mesh props via Babylon.js, and provides dev harness controls for season switching, prop visibility, and atmosphere presets. Every zone is purpose-built to showcase specific engine features (fog, glow, shadows, height map, day/night cycle, volumetric lighting, post-FX).

## Architecture

### Files Modified

| File | Change |
|------|--------|
| `runtime/dev/test-map.ts` | Complete rewrite — new layout, 10 tilesets, 7 zones, multi-level height map |
| `runtime/dev/dev.ts` | New "Test Map" sidebar section, 3D prop system, season switching, atmosphere presets |

No schema files are changed. No new packages. Everything stays in the dev harness.

### Files NOT Modified

- `runtime/src/schemas/map-data.ts` — existing schemas support all needed features
- `runtime/src/rendering/tilemap-renderer.ts` — tilemap renderer is unchanged
- No new dependencies

## Map Layout

32×32 tile grid, 7 distinct zones:

```
  0         8        16        24       31
0 ┌─────────┬────┬────┬────────────────┐
  │ FOREST  │    │    │  CLIFF PLATEAU  │
  │ trees   │    │    │  height=3       │
  │ mushroom│    │    │  ┌──RUINS──┐    │
8 │ floor   │    │RIVR│  │stones   │    │
  ├─────────┘    │ E  │  │torches  │    │
  │   VILLAGE    │ R  │  └─────────┘    │
  │ paths,houses │    │  cliff face     │
  │ well,torches │    │  height=2       │
16│ fences       │    │  rocks          │
  │              │    ├─────────────────┤
  ├──────────────┤    │ MEADOW/FARM    │
  │  LAKE/SHORE  │    │ wildflowers    │
  │  water,lilies│    │ tilled soil    │
24│  waterfall   │    │ open field     │
  │  rocks       │    │ height=1       │
  │              │    │                │
  │              │    │                │
31└──────────────┴────┴────────────────┘
```

### Zone Specifications

**Forest (NW: X:0–12, Z:0–8)**
- Dense trees from `trees_summer.png` (with shadow sprites on shadow layer)
- Mushrooms from `mushrooms.png` scattered on forest floor
- Wildflower ground cover
- Engine showcase: fog, volumetric light filtering through canopy, god rays

**Village (CW: X:0–14, Z:9–20)**
- Stone paths connecting buildings
- 3D cottage meshes (3 houses)
- Well in center, fence posts around perimeter
- Torch posts along main path (6 total — warm point lights, glow emissive)
- Engine showcase: shadows from buildings, glow layer from torches, day/night

**River (Center: X:15–17, full height)**
- Water channel carved at height=0 through terrain
- Bridge crossing at village level (Z:14)
- Water tiles with variation
- Engine showcase: water tile rendering, bridge 3D prop

**Lake & Shore (SW: X:0–12, Z:22–31)**
- Larger organic lake shape
- Lily pads, water flowers on surface
- Rocky shore with boulders from `Rocks, Grasslands.png`
- Cliff edge waterfall tiles from `Waterfall.png` at south cliff
- Engine showcase: water features, animated tiles, rocks

**Cliff Plateau (NE: X:20–31, Z:0–16)**
- Height level 3 on top, cliff faces from `cliff_summer.png`
- Rocky edges from `Rocks, Cliffs.png`
- Transition zone at height=2 (hillside)
- Engine showcase: height map, cliff rendering, 3D camera depth

**Ruins (on cliff: X:24–30, Z:2–8)**
- Stone terrain tiles on plateau
- 2 torch props for atmospheric lighting
- Darker area for point light showcase
- Engine showcase: point lights in dark area, post-FX grain/vignette

**Meadow/Farm (SE: X:20–31, Z:18–31)**
- Tilled soil from `tilled_soil.png`
- Wildflowers from `wildflowers_summer.png`
- Colorful flowers from `flowers.png`
- Open field area
- Engine showcase: open sky, day/night cycle, panoramic camera views

## Tileset Configuration

10 tilesets with non-overlapping GID ranges:

| # | Name | Image | Columns × Rows | Tile Size | First GID | Count |
|---|------|-------|-----------------|-----------|-----------|-------|
| 1 | terrain | `lpc-terrain/terrain_summer.png` | 16×26 | 32×32 | 1 | 416 |
| 2 | plants | `lpc-terrain/plants_summer.png` | 16×5 | 32×32 | 417 | 80 |
| 3 | trees | `lpc-terrain/trees_summer.png` | 16×18 | 32×32 | 497 | 288 |
| 4 | cliffs | `lpc-terrain/cliff_summer.png` | 16×14 | 32×32 | 785 | 224 |
| 5 | flowers | `lpc-terrain/flowers.png` | 11×5 | 32×32 | 1009 | 55 |
| 6 | mushrooms | `lpc-terrain/mushrooms.png` | 6×5 | 32×32 | 1064 | 30 |
| 7 | wildflowers | `lpc-terrain/wildflowers_summer.png` | 9×10 | 16×16 | 1094 | 90 |
| 8 | rocks | `lpc-terrain/Rocks, Grasslands.png` | 6×12 | 32×32 | 1184 | 72 |
| 9 | cliffRocks | `lpc-terrain/Rocks, Cliffs.png` | 6×4 | 32×32 | 1256 | 24 |
| 10 | soil | `lpc-terrain/tilled_soil.png` | 8×8 | 32×32 | 1280 | 64 |

Note: `wildflowers_summer.png` is 144×160 with 16×16 sub-tiles — each 32×32 map tile will use a 2×2 block of wildflower sub-tiles composed into one tile slot.
Alternatively, skip sub-tile complexity and use wildflowers at 32×32 grid (9 cols × 10 rows = 90 tiles at native pixel scale, each wildflower occupies a full tile).

### Season Variants

For season switching, only tilesets 1–4 and 7 have seasonal variants:

| Tileset | Summer | Spring | Autumn | Winter |
|---------|--------|--------|--------|--------|
| terrain | `terrain_summer.png` | `terrain_spring.png` | `terrain_autumn.png` | `terrain_winter.png` |
| plants | `plants_summer.png` | `plants_spring.png` | `plants_autumn.png` | `plants_winter.png` |
| trees | `trees_summer.png` | `trees_spring.png` | `trees_autumn.png` | `trees_winter.png` |
| cliffs | `cliff_summer.png` | `cliff_spring.png` | `cliff_autumn.png` | `cliff_winter.png` |
| wildflowers | `wildflowers_summer.png` | `wildflowers_spring.png` | `wildflowers_autumn.png` | `wildflowers_winter.png` |

Tilesets 5 (flowers), 6 (mushrooms), 8 (rocks), 9 (cliffRocks), 10 (soil) have no seasonal variants and stay constant.

Season switching works by destroying the current `RenderedTilemap`, updating the tileset `imagePath` values in the map data, and calling `renderTilemap()` again with the new paths.

## 3D Prop System

### Approach

All 3D props are procedural Babylon.js meshes. No external GLB files — keeps the dev harness self-contained.

### Prop Types

| Prop | Geometry | Babylon.js Mesh | Material | Count | Position |
|------|----------|-----------------|----------|-------|----------|
| Cottage | Box body + box roof | `MeshBuilder.CreateBox` × 2 | Brown diffuse, darker roof | 3 | Village zone |
| Well | Cylinder + cylinder rim | `MeshBuilder.CreateCylinder` × 2 | Gray stone | 1 | Village center |
| Fence post | Thin box | `MeshBuilder.CreateBox` | Brown wood | ~20 | Village perimeter |
| Torch post | Cylinder + small sphere | `MeshBuilder.CreateCylinder` + `CreateSphere` | Dark metal, orange emissive tip | 6 | Along paths |
| Bridge | Flat box | `MeshBuilder.CreateBox` | Brown wood planks | 1 | Over river |
| Boulder | Icosphere | `MeshBuilder.CreateIcoSphere` | Gray/brown stone | ~8 | Cliff edges, shore |
| Barrel | Short cylinder | `MeshBuilder.CreateCylinder` | Brown wood | 4 | Village corners |
| Crate | Small box | `MeshBuilder.CreateBox` | Light wood | 3 | Near cottages |

### Prop Materials

```typescript
// Wood material
const woodMat = new BABYLON.StandardMaterial('wood', scene);
woodMat.diffuseColor = new BABYLON.Color3(0.45, 0.3, 0.15);
woodMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

// Stone material
const stoneMat = new BABYLON.StandardMaterial('stone', scene);
stoneMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
stoneMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);

// Torch emissive (for glow layer)
const torchMat = new BABYLON.StandardMaterial('torch', scene);
torchMat.emissiveColor = new BABYLON.Color3(1, 0.6, 0.1);
torchMat.diffuseColor = new BABYLON.Color3(1, 0.7, 0.2);
```

### Shadows & Glow

- All solid props added to the directional light's shadow generator `renderList`
- Torch tip meshes added to the scene's `GlowLayer` include list
- Each torch prop creates a `PointLight` with:
  - Range: 8 tiles
  - Intensity: 0.8
  - Diffuse: warm orange `(1, 0.7, 0.3)`
  - Flicker: `candle` mode

### Height-Aware Placement

Props are placed at the height map elevation:
```typescript
const height = heightMap[idx(tileX, tileZ)] ?? 0;
mesh.position.y = height * TILE_HEIGHT_SCALE;
```

## Height Map Design

```
Level 0: Water (river channel, lake)
Level 1: Ground (village, forest, meadow — default)
Level 2: Hillside (transition between ground and cliff top)
Level 3: Cliff top (plateau, ruins)
```

The height map is a flat array of 1024 values (32×32). Each value 0–3. The cliff tileset tiles (`cliff_summer.png`) are placed on the `upper1` layer at elevation transitions to provide visual cliff faces.

## Atmosphere Presets

Pre-configured scene states for one-click testing. Each preset adjusts time, fog, torch lights, and post-FX:

```typescript
const ATMOSPHERE_PRESETS = {
  sunnyVillage: { time: 10, fog: 'clear', torches: false, postFx: 'default' },
  dusk:         { time: 18.5, fog: 'lightMist', torches: true, postFx: 'warm' },
  nightMarket:  { time: 22, fog: 'clear', torches: true, postFx: 'nightGlow' },
  foggyForest:  { time: 6, fog: 'denseFog', torches: false, postFx: 'misty' },
  cliffPanorama:{ time: 12, fog: 'clear', torches: false, postFx: 'sharp' },
  stormy:       { time: 15, fog: 'morningFog', torches: true, postFx: 'storm' },
};
```

Presets use existing `__WEBFORGE__` API: `setTime()`, `switchPreset()` for fog, and manual post-FX slider adjustments.

## Dev Harness UI

New **"Test Map"** collapsible section in sidebar:

```
TEST MAP
├── Season          [Dropdown: Summer/Spring/Autumn/Winter]
├── 3D Props        [Toggle: ON]
├── Prop Shadows    [Toggle: ON]
├── Torch Lights    [Toggle: ON]
├── Torch Glow      [Toggle: ON]
├── Prop Opacity    [Slider: 0.0 – 1.0, default 1.0]
├── Atmosphere      [Dropdown: Sunny Village/Dusk/Night Market/Foggy Forest/Cliff Panorama/Stormy]
└── Randomize Deco  [Button]
```

All controls use the existing dev harness UI primitives (`createToggle`, `createSlider`, `createDropdown`, `createButton`).

## Layer Utilization

| Layer | Type | Content |
|-------|------|---------|
| ground | `ground` | Full terrain: grass, dirt paths, stone roads, water, tilled soil |
| ground_deco | `ground_deco` | Flowers, mushrooms, wildflowers, rocks, lily pads, path edges, grass tufts |
| upper1 | `upper1` | Tree canopies, cliff face tiles, large rock formations |
| shadow | `shadow` | Tree shadow sprites (from trees tileset cols 0–1), building ambient occlusion |

## Data Flow

```
test-map.ts
  → exports TEST_MAP_DATA (static map data object)
  → exports SEASON_TILESET_PATHS (season→tileset path lookup)

dev.ts
  → imports TEST_MAP_DATA
  → renderTilemap(TEST_MAP_DATA) — creates RenderedTilemap
  → create3DProps(scene, heightMap) — creates procedural meshes
  → buildTestMapUI() — creates sidebar controls
    → season dropdown → destroy tilemap, update paths, re-render
    → prop toggles → show/hide mesh groups
    → atmosphere dropdown → apply time + fog + post-FX preset
```

## Tile Properties

Tile properties attached to specific tile IDs in the map data:

| Tile Group | Terrain Type | Passable | Speed | Sound | Encounter |
|-----------|-------------|----------|-------|-------|-----------|
| Grass | `grass` | ✅ | 1.0× | grass | 1.0 |
| Dirt path | `normal` | ✅ | 1.2× | dirt | 0.5 |
| Stone road | `stone` | ✅ | 1.5× | stone | 0.3 |
| Water | `water` | ❌ | 0.5× | water | 0.2 |
| Deep water | `deepWater` | ❌ | 0.0× | water | 0.0 |
| Cliff face | `stone` | ❌ | 0.0× | — | 0.0 |
| Tilled soil | `normal` | ✅ | 0.8× | dirt | 0.1 |
| Forest floor | `grass` | ✅ | 0.9× | grass | 1.5 |
| Bridge | `wood` | ✅ | 1.0× | wood | 0.0 |
