# Test Map Rework — Design (v2: Autotile Support)

## Goal

Replace the broken test map with a professional RPG village scene by making the autotile system work end-to-end. Instead of manually picking tile IDs from a complex atlas (which failed previously), the engine will:

1. **Expand** RPG Maker A2-format autotile source images (2×3 blocks) into 48 full tiles at load time
2. **Resolve** neighbor-based patterns using the existing `autotile-resolver.ts`
3. **Render** the correct tile variant per cell automatically

This means **any** RPG Maker-compatible autotile tileset can be dropped in and used directly.

## Architecture

### What Already Works (no changes needed)

| Component | File | Status |
|-----------|------|--------|
| Autotile resolver | `src/rendering/autotile-resolver.ts` | ✅ Complete — bitmask, diagonal gating, 48-pattern lookup |
| Chunk builder integration | `src/rendering/chunk-builder.ts` | ✅ Complete — calls resolver when `autotileType !== 'none'` |
| Map data schema | `src/schemas/map-data.ts` | ✅ Complete — `AutotileType` includes `'terrain_48'` |
| Tile geometry | `src/rendering/tile-geometry.ts` | ✅ Complete — UV-based quad generation |

### What Needs To Be Built

| Component | File | Change |
|-----------|------|--------|
| A2 atlas splitter | `dev/scripts/split-a2-atlas.ts` | New — offline script to split A2 atlas into individual 2×3 PNGs |
| Autotile expander | `src/rendering/autotile-expander.ts` | New — runtime expansion of 2×3 source → 48 full tiles |
| Tileset loader update | `src/rendering/tileset-loader.ts` | Modified — detect autotile source and expand before creating texture |
| Test map rewrite | `dev/test-map.ts` | Rewritten — use expanded autotile tilesets with correct terrain type references |
| Dev harness wiring | `dev/dev.ts` | Modified — 3D prop system wiring (partially done), dev harness UI |

### Files NOT Modified

- `autotile-resolver.ts` — already correct
- `chunk-builder.ts` — already integrates autotile resolver
- `map-data.ts` — schema already supports autotile types

## Autotile Expansion Algorithm

### Source Format: RPG Maker A2 (2×3 blocks)

Each terrain type is stored as a 2-tile × 3-tile block (64×96px for 32px tiles). When divided into 16×16 quarter-tiles, this is a 4×6 grid of sub-tiles:

```
Source 2×3 block → 4×6 sub-tile grid:

     col0  col1  col2  col3
    +------+------+------+------+
row0|      |  IC  |      |  IC  |   IC = Inner Corner sub-tiles
row1|  --preview-- |  A   |  B   |   A,B = Inner corner for TL/TR quadrants
    +------+------+------+------+
row2|  HE  |  HE  |  CE  |  CE  |   HE = Horizontal Edge sub-tiles
row3|  HE  |  HE  |  CE  |  CE  |   CE = Center/Fill sub-tiles
    +------+------+------+------+
row4|  OC  |  OC  |  VE  |  VE  |   OC = Outer Corner sub-tiles
row5|  OC  |  OC  |  VE  |  VE  |   VE = Vertical Edge sub-tiles
    +------+------+------+------+
```

### Sub-Tile Composition

Each of the 48 output tiles is composed from 4 quarter-tiles (one per quadrant: TL, TR, BL, BR). The composition table maps frame index → which sub-tile to use for each quadrant:

```
FLOOR_AUTOTILE_TABLE[frameIndex] = [
  [tl_col, tl_row],  // Top-Left quadrant sub-tile coords
  [tr_col, tr_row],  // Top-Right quadrant sub-tile coords
  [bl_col, bl_row],  // Bottom-Left quadrant sub-tile coords
  [br_col, br_row],  // Bottom-Right quadrant sub-tile coords
]
```

The 5 sub-tile types per quadrant:

| Type | Role | Source position (TL quadrant) |
|------|------|-------------------------------|
| Outer corner | Convex corner at this quadrant | (0, 4) |
| Horizontal edge | Edge runs horizontally | (0, 2) |
| Vertical edge | Edge runs vertically | (2, 4) |
| Inner corner | Concave corner at this quadrant | (2, 0) |
| Center/fill | Fully surrounded, no edge | (2, 2) |

### Expansion Pipeline

```
Input: 64×96 PNG (2 tiles × 3 tiles, 32px per tile)
                    ↓
Split into 4×6 grid of 16×16 sub-tiles (24 sub-tiles total)
                    ↓
For each frame index 0–47:
  Look up FLOOR_AUTOTILE_TABLE[frame] → 4 sub-tile coordinates
  Compose: draw TL at (0,0), TR at (16,0), BL at (0,16), BR at (16,16)
  → produces one 32×32 output tile
                    ↓
Output: 48 tiles arranged in a grid (8 cols × 6 rows = 256×192 PNG)
```

### Frame Index ↔ BITMASK_TO_FRAME Alignment

**Critical**: The expanded tiles must be arranged so that frame index N in the output grid matches frame index N in `BITMASK_TO_FRAME`. The existing table in `autotile-resolver.ts` uses this mapping:

- Frame 0 = bitmask 0 (isolated, no matching neighbors)
- Frame 15 = bitmask 15 (N+NE+E+SE, all four cardinal+diagonal in one quadrant)
- Higher frames = more complex patterns with edges, corridors, peninsulas, etc.

The FLOOR_AUTOTILE_TABLE must be ordered to match BITMASK_TO_FRAME. We will verify this with unit tests that check representative patterns.

## A2 Atlas Splitter Script

The LPC `terrain_summer.png` (512×832, 16 cols × 26 rows) is a full A2 atlas containing multiple terrain types:

```
A2 atlas layout (8 terrain types per row, 2 cols × 3 rows each):

  T0   T1   T2   T3   T4   T5   T6   T7     ← Row 0 (rows 0–2)
  T8   T9   T10  T11  T12  T13  T14  T15    ← Row 1 (rows 3–5)
  T16  T17  T18  T19  T20  T21  T22  T23    ← Row 2 (rows 6–8)
  ...
```

Each terrain type T_n:
- Source position: column = (n % 8) × 2 tiles, row = floor(n / 8) × 3 tiles
- Pixel position: x = (n % 8) × 64, y = floor(n / 8) × 96

The splitter script:
1. Reads the A2 atlas PNG
2. For each 2×3 block, extracts 64×96 pixels
3. Saves as individual file: `terrain-00-grass.png`, `terrain-01-grass-dark.png`, etc.
4. Naming includes both index and human-readable label

### Terrain Types in LPC terrain_summer.png

From visual inspection of the atlas:

| Block | Row | Col | Terrain | Description |
|-------|-----|-----|---------|-------------|
| 0 | 0 | 0 | grass | Light green grass |
| 1 | 0 | 1 | grass-dark | Darker green grass variant |
| 2 | 0 | 2 | dirt | Brown dirt |
| 3 | 0 | 3 | cobble | Stone cobblestone path |
| 4 | 1 | 0 | grass-dirt | Grass → dirt transition |
| 5 | 1 | 1 | sand-grass | Sand/beach → grass transition |
| 6 | 1 | 2 | grass-light | Light/pale grass |
| 7 | 1 | 3 | sand | Sandy terrain |
| 8–11 | 2–3 | 0–3 | More grass/dirt variants | Additional transitions |
| 12–15 | 4 | 0–3 | water | Water tiles (with grass border) |
| 16–19 | 5 | 0–3 | water-dirt | Water with dirt border |
| 20+ | 6+ | 0–3 | deep water | Deep water, ocean variants |

(Exact mapping will be confirmed by visual inspection during implementation.)

## Test Map Layout

Same 32×32 tile grid, 7 zones as original design. Key change: terrain types are now autotile-resolved instead of manually placed.

```
  0         8        16        24       31
0 ┌─────────┬────┬────┬────────────────┐
  │ FOREST  │    │    │  CLIFF PLATEAU  │
  │ dark    │    │    │  height=3       │
  │ grass   │    │    │  ┌──RUINS──┐    │
8 │         │    │RIVR│  │stone    │    │
  ├─────────┘    │ E  │  │torches  │    │
  │   VILLAGE    │ R  │  └─────────┘    │
  │ grass+paths  │    │  cliff face     │
  │ cottages     │    │  height=2       │
16│ well,torches │    │  rocks          │
  │              │    ├─────────────────┤
  ├──────────────┤    │ MEADOW/FARM    │
  │  LAKE/SHORE  │    │ wildflowers    │
  │  water       │    │ tilled soil    │
24│  rocks       │    │ open field     │
  │              │    │ height=1       │
  │              │    │                │
  │              │    │                │
31└──────────────┴────┴────────────────┘
```

### Zone → Terrain Type Mapping

| Zone | Ground Terrain | Decoration |
|------|---------------|------------|
| Forest | dark grass (autotile) | mushrooms, flowers from non-autotile sheets |
| Village | grass (autotile) + cobble paths (autotile) | flower beds, grass tufts |
| River | water (autotile) | — |
| Lake & Shore | water (autotile) + grass (autotile) shore | rocks, lily pads |
| Cliff Plateau | grass (autotile) on top | cliff face tiles on upper layer |
| Ruins | cobble (autotile) | — |
| Meadow/Farm | grass (autotile) + dirt (autotile) patches | wildflowers, flowers |

### How Autotile Map Data Works

With autotiles, each cell in the layer data just stores the `firstGid` of its terrain type. The engine handles the rest:

```
Example ground layer for a 4×4 area (grass surrounded by water):
  water  water  water  water
  water  grass  grass  water
  water  grass  grass  water
  water  water  water  water

Layer data (using firstGid values):
  [2, 2, 2, 2,
   2, 1, 1, 2,
   2, 1, 1, 2,
   2, 2, 2, 2]

Where: 1 = grass tileset firstGid, 2 = water tileset firstGid

For the grass tile at (1,1):
  - Resolver checks 8 neighbors → N=water, NE=water, E=grass, SE=grass, S=grass, SW=water, W=water, NW=water
  - Bitmask = E + SE + S = bits 2,3,4 → 0b00011100 = 28
  - Reduced (SE valid since both S and E set) → 28
  - BITMASK_TO_FRAME[28] → frame index for "NW outer corner" pattern
  - uvLookup[frameIndex] → correct UV from the expanded grass tileset
```

## Tileset Configuration

For the test map, we'll use 5–8 terrain types as autotile tilesets, plus 3–5 regular (non-autotile) tilesets for decorations:

### Autotile Tilesets (terrain_48)

| # | Name | Source | Expanded Size | firstGid |
|---|------|--------|---------------|----------|
| 1 | grass | `terrain-00-grass.png` | 8×6 (48 tiles) | 1 |
| 2 | dark-grass | `terrain-01-darkgrass.png` | 8×6 (48 tiles) | 49 |
| 3 | dirt | `terrain-02-dirt.png` | 8×6 (48 tiles) | 97 |
| 4 | cobble | `terrain-03-cobble.png` | 8×6 (48 tiles) | 145 |
| 5 | water | `terrain-12-water.png` | 8×6 (48 tiles) | 193 |
| 6 | sand | `terrain-07-sand.png` | 8×6 (48 tiles) | 241 |

### Regular Tilesets (no autotile)

| # | Name | Source | Cols × Rows | firstGid |
|---|------|--------|-------------|----------|
| 7 | trees | `lpc-terrain/trees_summer.png` | 16×18 | 289 |
| 8 | flowers | `lpc-terrain/flowers.png` | 11×5 | 577 |
| 9 | rocks | `lpc-terrain/Rocks, Grasslands.png` | 6×12 | 632 |
| 10 | cliffs | `lpc-terrain/cliff_summer.png` | 16×14 | 704 |

(Exact GID assignments will be confirmed during implementation based on actual tile counts.)

## Tileset Loader Changes

### Autotile Source Detection

When loading a tileset with `autotileType: 'terrain_48'`:

1. Load the source image
2. Check if it's a compact 2×3 source (2 cols × 3 rows) or pre-expanded (8×6 / other)
3. If compact: run the autotile expander to produce a 48-tile canvas
4. Create Babylon.js texture from the expanded canvas
5. Compute `uvLookup` for the expanded 8×6 grid (48 entries)

```typescript
// In tileset-loader.ts, within loadTileset():
if (config.autotileType === 'terrain_48' && config.columns === 2 && config.rows === 3) {
  // Compact RPG Maker A2 source — expand to 48 tiles
  const expandedCanvas = expandAutotileSource(sourceImage, config.tileWidth);
  // Create texture from expanded canvas (8 cols × 6 rows)
  // Compute uvLookup for 48 tiles
}
```

### New Config Fields

Add to `TilesetConfig`:

```typescript
/** If true, the source image is in compact RPG Maker A2 format (2×3 block)
 *  and will be expanded to 48 tiles at load time. Auto-detected from
 *  columns=2, rows=3 when autotileType is 'terrain_48'. */
```

No schema changes needed — the loader auto-detects based on `columns`, `rows`, and `autotileType`.

## 3D Prop System (unchanged from v1 design)

All 3D props are procedural Babylon.js meshes — cottages, well, fence posts, torch posts, bridge, boulders, barrels, crates. Already partially implemented in `dev.ts`. No changes to the prop design.

## Height Map (unchanged from v1 design)

```
Level 0: Water (river channel, lake)
Level 1: Ground (village, forest, meadow — default)
Level 2: Hillside (transition between ground and cliff top)
Level 3: Cliff top (plateau, ruins)
```

## Dev Harness UI (unchanged from v1 design)

```
TEST MAP
├── Season          [Dropdown: Summer/Spring/Autumn/Winter]
├── 3D Props        [Toggle: ON]
├── Prop Shadows    [Toggle: ON]
├── Torch Lights    [Toggle: ON]
├── Torch Glow      [Toggle: ON]
├── Prop Opacity    [Slider: 0.0 – 1.0, default 1.0]
├── Atmosphere      [Dropdown: presets]
└── Randomize Deco  [Button]
```

## Data Flow

```
LPC terrain_summer.png (A2 atlas)
  → split-a2-atlas.ts (offline, one-time)
  → individual 2×3 PNGs per terrain type

2×3 PNG per terrain type
  → tileset-loader.ts (runtime, at load time)
  → autotile-expander.ts expands to 48 tiles
  → Babylon.js texture + 48-entry uvLookup

test-map.ts
  → layer data uses firstGid per cell (one value per terrain type)
  → autotile-resolver.ts resolves neighbor bitmask → frame index
  → chunk-builder.ts uses uvLookup[frameIndex] for UV coords
  → merged mesh per chunk rendered
```

## Season Switching

Season variants (`terrain_spring.png`, `terrain_autumn.png`, `terrain_winter.png`) get the same A2 splitting treatment. The season paths map indexes terrain names to seasonal file variants. Switching seasons destroys the tilemap, updates image paths, and re-renders.
