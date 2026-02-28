# Professional Test Map Rework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Overview

Replace the placeholder test map with a hand-crafted RPG village scene. 10 tilesets, 7 zones, procedural 3D props, season switching, atmosphere presets. All changes are in `dev/test-map.ts` and `dev/dev.ts`.

## QA Commands (run after EVERY file edit)

```bash
pnpm qa:type-check
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

---

## Task 1: Rewrite test-map.ts — Tileset Configuration

**File:** `packages/products/webforge/runtime/dev/test-map.ts`

### 1a. Update tileset constants

Replace the current 2-tileset setup with 10 tilesets. Define GID ranges, column/row counts, and tile ID helpers for each.

```typescript
// 10 tileset GID layout
const TILESETS = {
  terrain:      { gid: 1,    cols: 16, rows: 26, count: 416 },
  plants:       { gid: 417,  cols: 16, rows: 5,  count: 80 },
  trees:        { gid: 497,  cols: 16, rows: 18, count: 288 },
  cliffs:       { gid: 785,  cols: 16, rows: 14, count: 224 },
  flowers:      { gid: 1009, cols: 11, rows: 5,  count: 55 },
  mushrooms:    { gid: 1064, cols: 6,  rows: 5,  count: 30 },
  wildflowers:  { gid: 1094, cols: 9,  rows: 10, count: 90 },
  rocks:        { gid: 1184, cols: 6,  rows: 12, count: 72 },
  cliffRocks:   { gid: 1256, cols: 6,  rows: 4,  count: 24 },
  soil:         { gid: 1280, cols: 8,  rows: 8,  count: 64 },
};
```

### 1b. Define tile palette

Map visual tile names to IDs by inspecting each tileset image. Key tiles needed:

**Terrain:** grass (solid, variant), dirt (solid, variant), stone path, sand edge, water (solid, variant, deep)
**Plants:** bushes, tall grass, flowers, lily pads, water flowers
**Trees:** deciduous large, deciduous medium, pine large, pine medium, tree shadow, stump
**Cliffs:** cliff face N/S/E/W, cliff corner, cliff-water edge, cliff-grass transition
**Flowers:** flower varieties (11+ colors)
**Mushrooms:** mushroom varieties
**Wildflowers:** delicate ground scatter
**Rocks:** large boulder, medium rock, small rock, pebbles
**Cliff rocks:** cliff-edge rocks
**Soil:** tilled rows, plowed field

### 1c. Export tileset config array

```typescript
export const TILESET_CONFIGS = [
  { name: 'terrain', imagePath: 'tilesets/lpc-terrain/terrain_summer.png', columns: 16, rows: 26, firstGid: 1, tileWidth: 32, tileHeight: 32, autotileType: 'none' as const, animationFrames: 1, animationSpeed: 4 },
  { name: 'plants', imagePath: 'tilesets/lpc-terrain/plants_summer.png', ... },
  // ... 8 more
];
```

### 1d. Export season path map

```typescript
export const SEASON_PATHS: Record<string, Record<string, string>> = {
  summer: { terrain: 'tilesets/lpc-terrain/terrain_summer.png', ... },
  spring: { terrain: 'tilesets/lpc-terrain/terrain_spring.png', ... },
  autumn: { terrain: 'tilesets/lpc-terrain/terrain_autumn.png', ... },
  winter: { terrain: 'tilesets/lpc-terrain/terrain_winter.png', ... },
};
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 2: Rewrite test-map.ts — Zone Layout & Ground Layer

### 2a. Define zone boundaries

```typescript
// Zone rectangles (x1, z1, x2, z2)
const ZONES = {
  forest:   { x1: 0, z1: 0, x2: 12, z2: 8 },
  village:  { x1: 0, z1: 9, x2: 14, z2: 20 },
  river:    { x1: 15, z1: 0, x2: 17, z2: 31 },
  lake:     { x1: 0, z1: 22, x2: 12, z2: 31 },
  plateau:  { x1: 20, z1: 0, x2: 31, z2: 16 },
  ruins:    { x1: 24, z1: 2, x2: 30, z2: 8 },
  meadow:   { x1: 20, z1: 18, x2: 31, z2: 31 },
};
```

### 2b. Generate ground layer

For each tile (x, z), determine zone membership and pick appropriate ground tile:

- **Forest zone:** grass with subtle variation
- **Village zone:** grass base with stone path network (paths connecting houses, leading to bridge)
- **River zone:** water tiles (solid fills with variation)
- **Lake zone:** water for lake body, grass for shore
- **Plateau zone:** grass on top, dirt/stone transition at edges
- **Ruins zone:** stone tiles
- **Meadow zone:** grass base, tilled soil patches

Stone path layout in village:
- Main E-W path at Z=14 from X=2 to river (bridge)
- N-S path at X=7 from Z=10 to Z=19
- Small branches to each cottage

### 2c. Generate lake shape

Irregular organic shape using ellipse with noise:
```typescript
function isLake(x: Num, z: Num): boolean {
  const cx = 6, cz = 26, rx = 4, rz = 3;
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  const noise = ((x * 31 + z * 17) % 7) / 20; // subtle irregularity
  return dx * dx + dz * dz <= 1.0 + noise;
}
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 3: Rewrite test-map.ts — Decoration, Upper, Shadow Layers

### 3a. Ground decoration layer

Zone-specific decoration placement:

- **Forest:** mushrooms (8% density), wildflowers (5%), grass tufts (10%)
- **Village:** flower beds near houses, grass tufts along paths
- **Lake shore:** rocks along shore, lily pads on water, water flowers
- **Meadow:** wildflowers (15% density), flowers (10%), tilled soil rows
- **Plateau:** sparse rocks, cliff-edge rocks
- **Ruins:** scattered stones

### 3b. Upper layer

- **Forest:** tree canopy tiles — large deciduous and pine trees, placed densely
- **Lake:** large rocks protruding from shore
- **Plateau:** cliff face tiles at height transitions (north, west, south edges of plateau)
- **General:** larger vegetation that should render above character sprites

### 3c. Shadow layer

- Tree shadow sprites from `trees_summer.png` (columns 0-1 are shadow ovals)
- Placed under each tree in the upper layer
- Opacity: 0.4

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 4: Rewrite test-map.ts — Height Map

### 4a. Multi-level height map

```
Level 0: River channel (X:15-17), lake body
Level 1: Ground (default) — forest, village, meadow
Level 2: Hillside — transition tiles east of river (X:18-19)
Level 3: Cliff top — plateau (X:20-31, Z:0-16), ruins
```

### 4b. Generate height map array

```typescript
function generateHeightMap(): Num[] {
  const hm: Num[] = new Array(TOTAL).fill(1); // default ground level
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      // River at level 0
      if (x >= 15 && x <= 17) hm[idx(x, z)] = 0;
      // Lake at level 0
      if (isLake(x, z)) hm[idx(x, z)] = 0;
      // Hillside transition
      if (x >= 18 && x <= 19 && z <= 16) hm[idx(x, z)] = 2;
      // Plateau at level 3
      if (x >= 20 && z <= 16) hm[idx(x, z)] = 3;
      // Meadow at level 1 (stays default)
    }
  }
  return hm;
}
```

### 4c. Update tile properties

Full tile property definitions for all terrain types (grass, dirt, stone, water, cliff, soil, wood, forest).

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 5: Assemble TEST_MAP_DATA export

### 5a. Compose final export

```typescript
export const TEST_MAP_DATA = {
  width: W,
  height: H,
  tileWidth: TILE_SIZE,
  tileHeight: TILE_SIZE,
  tilesets: TILESET_CONFIGS,
  layers: [
    { name: 'ground', type: 'ground', data: generateGround(), visible: true, opacity: 1 },
    { name: 'ground_deco', type: 'ground_deco', data: generateDecorations(), visible: true, opacity: 1 },
    { name: 'upper1', type: 'upper1', data: generateUpper(), visible: true, opacity: 1 },
    { name: 'shadow', type: 'shadow', data: generateShadow(), visible: true, opacity: 0.4 },
  ],
  heightMap: generateHeightMap(),
  tileProperties: { ... },
  lighting: TEST_LIGHTING_CONFIG,
  postProcessing: TEST_POST_PROCESSING_CONFIG,
  sky: TEST_SKY_CONFIG,
};
```

### 5b. Export SEASON_PATHS for dev harness

### 5c. Export ATMOSPHERE_PRESETS for dev harness

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 6: 3D Prop System in dev.ts

### 6a. Create prop materials

```typescript
function createPropMaterials(scene: BABYLON.Scene) {
  // Wood, stone, roof, metal, torch emissive
}
```

### 6b. Create individual prop builders

```typescript
function createCottage(scene, materials, x, z, height, rotation): BABYLON.Mesh[]
function createWell(scene, materials, x, z, height): BABYLON.Mesh[]
function createFenceSegment(scene, materials, x, z, height, axis): BABYLON.Mesh
function createTorchPost(scene, materials, x, z, height): { meshes, light }
function createBridge(scene, materials, x, z, height): BABYLON.Mesh[]
function createBoulder(scene, materials, x, z, height, scale): BABYLON.Mesh
function createBarrel(scene, materials, x, z, height): BABYLON.Mesh
function createCrate(scene, materials, x, z, height): BABYLON.Mesh
```

### 6c. Place all props

```typescript
function create3DProps(scene, heightMap): PropSystem {
  // Returns { meshes: Mesh[], lights: PointLight[], torchMeshes: Mesh[] }
  // For dev harness toggle control
}
```

Placement coordinates (tile positions):
- Cottages: (4,12), (8,14), (10,17) — rotated to face paths
- Well: (7,14) — village center
- Fence posts: along village perimeter edges
- Torch posts: (3,14), (6,14), (9,14), (12,14), (7,11), (7,17) — along main paths
- Bridge: (15,14)–(17,14) spanning river
- Boulders: (2,24), (9,23), (22,5), (25,12), (28,14) — cliff/shore edges
- Barrels: (5,13), (9,15), (11,18)
- Crates: (4,13), (8,15)

### 6d. Wire shadows and glow

```typescript
// Add all solid props to shadow generator
const shadowGen = scene.lights[0]?.getShadowGenerator();
for (const mesh of propSystem.meshes) {
  shadowGen?.addShadowCaster(mesh);
  mesh.receiveShadows = true;
}

// Add torch tips to glow layer
const glowLayer = scene.effectLayers?.find(l => l instanceof BABYLON.GlowLayer);
for (const torchMesh of propSystem.torchMeshes) {
  glowLayer?.addIncludedOnlyMesh(torchMesh);
}
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 7: Dev Harness UI — Test Map Section

### 7a. Build "Test Map" sidebar section

New collapsible section with controls:

| Control | Type | Binding |
|---------|------|---------|
| Season | Dropdown (Summer/Spring/Autumn/Winter) | Destroy tilemap, update tileset paths, re-render |
| 3D Props | Toggle (default ON) | Show/hide all prop meshes |
| Prop Shadows | Toggle (default ON) | Add/remove props from shadow caster list |
| Torch Lights | Toggle (default ON) | Enable/disable torch point lights |
| Torch Glow | Toggle (default ON) | Add/remove torch meshes from glow layer |
| Prop Opacity | Slider (0–1, default 1.0) | Set visibility on all prop meshes |
| Atmosphere | Dropdown (6 presets) | Apply time+fog+torches+post-FX combination |
| Randomize Deco | Button | Re-roll decoration seed, re-generate deco layer |

### 7b. Season switching implementation

```typescript
async function switchSeason(season: string): Promise<void> {
  // 1. Get new paths from SEASON_PATHS[season]
  // 2. Update tileset imagePath values in map data
  // 3. Destroy current tilemap
  // 4. Re-render with updated map data
  // 5. Re-wire layer controls
}
```

### 7c. Atmosphere preset implementation

```typescript
function applyAtmosphere(preset: string): void {
  const config = ATMOSPHERE_PRESETS[preset];
  debug.setTime(config.time);
  if (config.fog !== 'clear') debug.switchPreset(config.fog);
  // Toggle torch lights
  // Adjust post-FX sliders
}
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 8: Lighting Configuration

### 8a. Update test map lighting

Configure lighting to complement the village scene:
- Directional light: angle for visible building/tree shadows
- Hemispheric: warm ambient for outdoor feel
- 6 torch point lights defined in config (positions match torch prop placement)

### 8b. Ensure torches interact with glow/shadow

Torch point lights should:
- Cast shadows (shadow generator per light, or shared)
- Emit warm orange diffuse
- Flicker with `candle` mode
- Be controllable via dev harness toggle

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 9: Update Documentation

### 9a. Update `docs/ARCHITECTURE.md`

Add section on test map architecture, zone layout, 3D prop system, season switching.

### 9b. Update runtime `README.md`

Document the test map features, available dev harness controls, atmosphere presets.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 10: Visual Verification

### 10a. Navigate to dev harness, take baseline screenshot
### 10b. Register discovery + helper scripts
### 10c. Inventory Test Map section controls
### 10d. Test each control systematically:
- Season dropdown: Summer → screenshot, Spring → screenshot, Autumn → screenshot, Winter → screenshot
- 3D Props: ON → screenshot, OFF → screenshot
- Prop Shadows: ON → screenshot, OFF → screenshot
- Torch Lights: ON → screenshot, OFF → screenshot
- Torch Glow: ON → screenshot, OFF → screenshot
- Prop Opacity: 0.0 → screenshot, 0.5 → screenshot, 1.0 → screenshot
- Atmosphere: each preset → screenshot
- Randomize Deco: click → screenshot
### 10e. Test camera modes with new map:
- Switch to Free Orbit → screenshot (verify 3D depth)
- Switch to HD-2D → screenshot (verify classic RPG look)
- Switch to Isometric → screenshot
### 10f. Document ✅ or ❌ for each control

---

## Task 11: Commit

```bash
git add packages/products/webforge/runtime/dev/test-map.ts
git add packages/products/webforge/runtime/dev/dev.ts
git add docs/ARCHITECTURE.md
git add docs/plans/2026-02-28-test-map-rework-design.md
git add docs/plans/2026-02-28-test-map-rework.md
git commit -m "feat(dev): professional test map with village zones, 3D props, season switching"
```

## Implementation Order

1. **Task 1** — Tileset configuration (test-map.ts)
2. **Task 2** — Zone layout + ground layer (test-map.ts)
3. **Task 3** — Decoration + upper + shadow layers (test-map.ts)
4. **Task 4** — Height map (test-map.ts)
5. **Task 5** — Assemble export (test-map.ts)
6. **Task 6** — 3D prop system (dev.ts)
7. **Task 7** — Dev harness UI (dev.ts)
8. **Task 8** — Lighting config (test-map.ts)
9. **Task 9** — Documentation
10. **Task 10** — Visual verification
11. **Task 11** — Commit
