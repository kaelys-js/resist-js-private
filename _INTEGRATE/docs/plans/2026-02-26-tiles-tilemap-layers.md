# Tiles, Tilemap & Layers Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the tilemap system with rich tile properties, layer types, autotile terrain sets, animated tiles, water rendering, fog of war, pathfinding, and full dev harness coverage.

**Architecture:** Schema-first TDD approach. New Valibot schemas define every data structure, then rendering/runtime code consumes them. Existing files are extended (not replaced). Each feature is independently testable.

**Tech Stack:** TypeScript, Valibot, Babylon.js, Vitest

**Design doc:** `docs/plans/2026-02-26-tiles-tilemap-layers-design.md`

---

## Workflow: One Feature at a Time

**CRITICAL:** Each feature/option follows this cycle before proceeding to the next:

1. **TDD** — Write failing test, implement, pass
2. **Full QA** — `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`
3. **Dev harness wiring** — Add editable UI controls (sliders, toggles, dropdowns, inputs) for EVERY new schema field. Info-only rows are NOT acceptable — controls must be interactive. Every control callback must be wired to a real runtime function — `noop` placeholders are not acceptable for shipped features.
4. **Visual verification (scene — per-control)** — Run `pnpm dev` and test EACH individual control one at a time:
   - **Toggles:** Turn off → verify the visual effect disappears from the scene. Turn on → verify it reappears.
   - **Sliders:** Move to min → screenshot. Move to max → screenshot. Confirm the scene changes visually at each extreme.
   - **Dropdowns:** Select each option. Verify the scene updates for each one.
   - **Buttons:** Click each action button. Verify the expected effect occurs in the scene.
   - **Color controls:** Change each channel (R/G/B/A). Verify the scene tint/color changes accordingly.
   - If a control does NOT produce a visible change in the scene, investigate — the callback may be a `noop`, the runtime function may be unimplemented, or the wiring may be wrong.
5. **Visual verification (dev UX)** — Confirm all new dev harness controls appear, expand/collapse correctly, respond to interaction, and display proper labels. Take a screenshot as proof.
6. **Mark complete** — Update this plan doc, marking the task as `[x]` done
7. **Commit** — One commit per feature with all changes
8. **Ask approval** — Ask the user for permission before proceeding to the next task

**Never batch verification.** Every single feature gets its own QA + visual test pass. If a feature breaks something, fix it before moving on. Never skip per-control scene verification — it catches wiring bugs that unit tests miss.

---

## Conventions

**Imports:**
```typescript
import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import type { Str, Bool, Num } from '@/schemas/common';
```

**Test pattern:**
```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { setupEngine, disposeEngine } from './test-helpers';

describe('featureName', () => {
  let instance: ReturnType<typeof setupEngine>;
  afterEach(() => { if (instance) disposeEngine(instance); });

  it('should do X', () => {
    const result = functionUnderTest({ ... });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.fieldName).toBe(expectedValue);
  });
});
```

**QA after every file edit:**
```bash
cd packages/products/webforge && pnpm qa:type-check
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**File locations:**
- Schemas: `packages/products/webforge/runtime/src/schemas/`
- Rendering: `packages/products/webforge/runtime/src/rendering/`
- Tests: colocated (`foo.ts` → `foo.test.ts`)
- Dev harness: `packages/products/webforge/runtime/dev/`

---

## Phase A: Enhanced Tile Properties Schema

Expand `TilePropertiesSchema` with passability, terrain, flags, collision, and custom properties.

### Task 1: Passability Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests**

Add tests for the new passability fields to `map-data.test.ts`:

```typescript
describe('TilePropertiesSchema — passability expansion', () => {
  it('should accept passAbove field', () => {
    const result = safeParse(TilePropertiesSchema, { passAbove: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passAbove).toBe(true);
  });

  it('should default passAbove to false', () => {
    const result = safeParse(TilePropertiesSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passAbove).toBe(false);
  });

  it('should accept passBelow field', () => {
    const result = safeParse(TilePropertiesSchema, { passBelow: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passBelow).toBe(true);
  });

  it('should accept passVehicle bitmask 0-31', () => {
    const result = safeParse(TilePropertiesSchema, { passVehicle: 15 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passVehicle).toBe(15);
  });

  it('should reject passVehicle > 31', () => {
    const result = safeParse(TilePropertiesSchema, { passVehicle: 32 });
    expect(result.ok).toBe(false);
  });

  it('should accept passEvent field', () => {
    const result = safeParse(TilePropertiesSchema, { passEvent: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passEvent).toBe(false);
  });

  it('should accept passHeight 0-15', () => {
    const result = safeParse(TilePropertiesSchema, { passHeight: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passHeight).toBe(5);
  });

  it('should accept starPassage field', () => {
    const result = safeParse(TilePropertiesSchema, { starPassage: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.starPassage).toBe(true);
  });
});
```

**Step 2: Run tests to verify failure**

Run: `cd packages/products/webforge && pnpm qa:test -- --run src/schemas/map-data.test.ts`
Expected: FAIL — unknown properties rejected by `strictObject`

**Step 3: Add passability fields to TilePropertiesSchema**

In `map-data.ts`, add to `TilePropertiesSchema`:

```typescript
passAbove: v.optional(v.boolean(), false),
passBelow: v.optional(v.boolean(), false),
passVehicle: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(31)), 0),
passEvent: v.optional(v.boolean(), true),
passHeight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)), 0),
starPassage: v.optional(v.boolean(), false),
```

**Step 4: Run tests to verify pass**

Run: `cd packages/products/webforge && pnpm qa:test -- --run src/schemas/map-data.test.ts`
Expected: PASS

**Step 5: Run QA**

```bash
cd packages/products/webforge && pnpm qa:type-check
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 6: Commit**

```bash
git add packages/products/webforge/runtime/src/schemas/map-data.ts packages/products/webforge/runtime/src/schemas/map-data.test.ts
git commit -m "feat(tiles): add expanded passability fields to TilePropertiesSchema"
```

---

### Task 2: Terrain Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests**

```typescript
describe('TilePropertiesSchema — terrain expansion', () => {
  it('should accept terrainTag 0-15', () => {
    const result = safeParse(TilePropertiesSchema, { terrainTag: 15 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.terrainTag).toBe(15);
  });

  it('should reject terrainTag > 15', () => {
    const result = safeParse(TilePropertiesSchema, { terrainTag: 16 });
    expect(result.ok).toBe(false);
  });

  it('should accept terrainType enum values', () => {
    for (const type of ['normal', 'water', 'deepWater', 'lava', 'ice', 'sand', 'swamp', 'snow', 'grass', 'wood', 'stone', 'metal', 'custom']) {
      const result = safeParse(TilePropertiesSchema, { terrainType: type });
      expect(result.ok).toBe(true);
    }
  });

  it('should default terrainType to normal', () => {
    const result = safeParse(TilePropertiesSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.terrainType).toBe('normal');
  });

  it('should accept footstepSound string', () => {
    const result = safeParse(TilePropertiesSchema, { footstepSound: 'sfx/grass-step.ogg' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.footstepSound).toBe('sfx/grass-step.ogg');
  });

  it('should accept encounterRate multiplier', () => {
    const result = safeParse(TilePropertiesSchema, { encounterRate: 2.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.encounterRate).toBe(2.5);
  });

  it('should accept slipperiness 0-1', () => {
    const result = safeParse(TilePropertiesSchema, { slipperiness: 0.7 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.slipperiness).toBe(0.7);
  });

  it('should accept movementSpeed multiplier', () => {
    const result = safeParse(TilePropertiesSchema, { movementSpeed: 0.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.movementSpeed).toBe(0.5);
  });

  it('should accept regionId 0-255', () => {
    const result = safeParse(TilePropertiesSchema, { regionId: 128 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regionId).toBe(128);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Add terrain fields**

In `map-data.ts`:

```typescript
// Add TerrainTypeSchema before TilePropertiesSchema
const TerrainTypeSchema = v.picklist([
  'normal', 'water', 'deepWater', 'lava', 'ice', 'sand',
  'swamp', 'snow', 'grass', 'wood', 'stone', 'metal', 'custom',
]);
export type TerrainType = v.InferOutput<typeof TerrainTypeSchema>;
```

Add to `TilePropertiesSchema`:
```typescript
// Update terrainTag range from 0-7 to 0-15
terrainTag: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)), 0),
terrainType: v.optional(TerrainTypeSchema, 'normal'),
footstepSound: v.optional(v.string(), ''),
encounterRate: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10)), 1),
slipperiness: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),
movementSpeed: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(5)), 1),
regionId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)), 0),
```

**Step 4: Run tests — expect PASS**

**Step 5: QA + Step 6: Commit**

```bash
git commit -m "feat(tiles): add terrain type, footstep, encounter, movement fields to TilePropertiesSchema"
```

---

### Task 3: Tile Flags Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for bush (with bushDepth), counter, damageFloor (with damageAmount, damagePercent, damageElement, damageInterval), ladder, slip, shelter, reflection (with reflectionOpacity), soundAbsorb, glow (with glowColor, glowIntensity), coverHeight.

Test pattern: each flag boolean with default false, each associated numeric/color field with range validation.

**Step 2: Run tests — expect FAIL**

**Step 3: Add flag fields to TilePropertiesSchema**

```typescript
// Existing fields (update bush/damageFloor with sub-fields):
bush: v.optional(v.boolean(), false),
bushDepth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(64)), 12),
// counter already exists
damageFloor: v.optional(v.boolean(), false),
damageAmount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(9999)), 0),
damagePercent: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),
damageElement: v.optional(v.string(), ''),
damageInterval: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 1),
// ladder already exists
slip: v.optional(v.boolean(), false),
shelter: v.optional(v.boolean(), false),
reflection: v.optional(v.boolean(), false),
reflectionOpacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),
soundAbsorb: v.optional(v.boolean(), false),
glow: v.optional(v.boolean(), false),
glowColor: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
glowIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),
coverHeight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),
```

Note: Import `ColorRgbaSchema` from `scene-setup-config.ts` or define an inline RGBA schema.

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add expanded flags (bush depth, damage, shelter, reflection, glow, cover) to TilePropertiesSchema"
```

---

### Task 4: Collision Shape Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for `CollisionShapeSchema` and `collisionShapes` field on TileProperties.

**Step 2: Run tests — expect FAIL**

**Step 3: Define CollisionShapeSchema and add to TilePropertiesSchema**

```typescript
const CollisionShapeTypeSchema = v.picklist(['rect', 'ellipse', 'polygon', 'polyline', 'circle']);

const CollisionPointSchema = v.pipe(
  v.strictObject({
    x: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    y: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  }),
  v.readonly(),
);

const CollisionShapeSchema = v.pipe(
  v.strictObject({
    type: CollisionShapeTypeSchema,
    points: v.optional(v.array(CollisionPointSchema), []),
    isTrigger: v.optional(v.boolean(), false),
    collisionGroup: v.optional(v.string(), 'default'),
    collisionMask: v.optional(v.array(v.string()), []),
    oneWay: v.optional(v.boolean(), false),
    oneWayDirection: v.optional(v.picklist(['north', 'south', 'east', 'west']), 'south'),
    height: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(15)), 1),
    enabled: v.optional(v.boolean(), true),
  }),
  v.readonly(),
);
export type CollisionShape = v.InferOutput<typeof CollisionShapeSchema>;
```

Add to TilePropertiesSchema:
```typescript
collisionShapes: v.optional(v.array(CollisionShapeSchema), []),
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add collision shape schema with type, trigger, group, mask, one-way support"
```

---

### Task 5: Custom Properties & Tags Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for `properties` (record), `class` (string), `tags` (string[]), `scriptHook` (string), `probability` (number 0-1).

**Step 2: Run tests — expect FAIL**

**Step 3: Add fields to TilePropertiesSchema**

```typescript
properties: v.optional(v.record(v.string(), v.union([v.string(), v.number(), v.boolean()])), {}),
class: v.optional(v.string(), ''),
tags: v.optional(v.array(v.string()), []),
scriptHook: v.optional(v.string(), ''),
probability: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add custom properties, class, tags, scriptHook, probability to TilePropertiesSchema"
```

---

### Task 6: Tile Animation Definition Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for `TileAnimationFrameSchema` and `animation` field on TileProperties.

**Step 2: Run tests — expect FAIL**

**Step 3: Define schemas**

```typescript
const TileAnimationFrameSchema = v.pipe(
  v.strictObject({
    tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    duration: v.pipe(v.number(), v.minValue(16)),
  }),
  v.readonly(),
);

const PlaybackModeSchema = v.picklist(['loop', 'pingPong', 'once', 'random']);

const TileAnimationSchema = v.pipe(
  v.strictObject({
    frames: v.pipe(v.array(TileAnimationFrameSchema), v.minLength(1)),
    playbackMode: v.optional(PlaybackModeSchema, 'loop'),
    globalSync: v.optional(v.boolean(), true),
    speedMultiplier: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),
    pauseWhenOffscreen: v.optional(v.boolean(), true),
  }),
  v.readonly(),
);
export type TileAnimation = v.InferOutput<typeof TileAnimationSchema>;
```

Add to TilePropertiesSchema:
```typescript
animation: v.optional(v.nullable(TileAnimationSchema), null),
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add tile animation definition schema (frames, playback modes, sync)"
```

---

## Phase B: Layer System Schemas

### Task 7: Layer Kind Discriminated Union

Replace the fixed 5-type enum with a discriminated union of tile/object/group layers.

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for object layers and group layers alongside existing tile layers.

```typescript
describe('Layer types — discriminated union', () => {
  it('should accept tile layer with kind=tile', () => {
    const result = safeParse(LayerSchema, {
      kind: 'tile',
      name: 'ground',
      type: 'ground',
      data: [0, 0, 0, 0],
      width: 2,
      height: 2,
    });
    expect(result.ok).toBe(true);
  });

  it('should accept object layer with kind=object', () => {
    const result = safeParse(LayerSchema, {
      kind: 'object',
      name: 'spawns',
      objects: [{
        id: 'spawn-1',
        name: 'Player Start',
        class: 'spawn',
        x: 100,
        y: 200,
        width: 32,
        height: 32,
        shape: 'rect',
        visible: true,
      }],
    });
    expect(result.ok).toBe(true);
  });

  it('should accept group layer with kind=group', () => {
    const result = safeParse(LayerSchema, {
      kind: 'group',
      name: 'Buildings',
      children: [],
    });
    expect(result.ok).toBe(true);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Define layer schemas**

Define `MapObjectSchema`, `ObjectLayerSchema`, `GroupLayerSchema`, and a `LayerSchema` discriminated union on `kind`:

```typescript
const MapObjectShapeSchema = v.picklist(['rect', 'ellipse', 'point', 'polygon', 'polyline']);

const MapObjectSchema = v.pipe(
  v.strictObject({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.optional(v.string(), ''),
    class: v.optional(v.string(), ''),
    x: v.number(),
    y: v.number(),
    width: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
    height: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
    rotation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 0),
    shape: v.optional(MapObjectShapeSchema, 'rect'),
    points: v.optional(v.array(v.strictObject({ x: v.number(), y: v.number() })), []),
    visible: v.optional(v.boolean(), true),
    customProperties: v.optional(
      v.record(v.string(), v.union([v.string(), v.number(), v.boolean()])),
      {},
    ),
  }),
  v.readonly(),
);
export type MapObject = v.InferOutput<typeof MapObjectSchema>;

// Common layer visual properties (shared by all layer kinds)
const LayerVisualPropsSchema = {
  visible: v.optional(v.boolean(), true),
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
  tintColor: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
  brightness: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0),
  saturation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  contrast: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),
  offsetX: v.optional(v.number(), 0),
  offsetY: v.optional(v.number(), 0),
  locked: v.optional(v.boolean(), false),
};

// Tile layer (enhanced from current TileLayerSchema)
const TileLayerSchema = v.pipe(
  v.strictObject({
    kind: v.literal('tile'),
    name: v.pipe(v.string(), v.minLength(1)),
    type: v.optional(v.string(), 'ground'),
    data: v.array(v.pipe(v.number(), v.integer(), v.minValue(0))),
    width: v.pipe(v.number(), v.integer(), v.minValue(1)),
    height: v.pipe(v.number(), v.integer(), v.minValue(1)),
    ...LayerVisualPropsSchema,
    parallaxFactorX: v.optional(v.number(), 1),
    parallaxFactorY: v.optional(v.number(), 1),
    parallaxOriginX: v.optional(v.number(), 0),
    parallaxOriginY: v.optional(v.number(), 0),
    scaleX: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),
    scaleY: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),
    renderOrder: v.optional(v.pipe(v.number(), v.integer()), 0),
    castShadows: v.optional(v.boolean(), false),
    receiveShadows: v.optional(v.boolean(), true),
    depthWrite: v.optional(v.boolean(), true),
    maskLayer: v.optional(v.string(), ''),
    cullingPadding: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(16)), 0),
    ySortEnabled: v.optional(v.boolean(), false),
    blendMode: v.optional(BlendModeSchema, 'alpha'),
    collapsed: v.optional(v.boolean(), false),
    color: v.optional(v.string(), ''),
  }),
  v.readonly(),
);

const ObjectLayerSchema = v.pipe(
  v.strictObject({
    kind: v.literal('object'),
    name: v.pipe(v.string(), v.minLength(1)),
    objects: v.array(MapObjectSchema),
    drawOrder: v.optional(v.picklist(['topdown', 'index']), 'topdown'),
    ...LayerVisualPropsSchema,
  }),
  v.readonly(),
);

const GroupLayerSchema = v.pipe(
  v.strictObject({
    kind: v.literal('group'),
    name: v.pipe(v.string(), v.minLength(1)),
    children: v.array(v.lazy(() => LayerSchema)),
    ...LayerVisualPropsSchema,
  }),
  v.readonly(),
);

const LayerSchema = v.variant('kind', [TileLayerSchema, ObjectLayerSchema, GroupLayerSchema]);
export type Layer = v.InferOutput<typeof LayerSchema>;
export type TileLayer = v.InferOutput<typeof TileLayerSchema>;
export type ObjectLayer = v.InferOutput<typeof ObjectLayerSchema>;
export type GroupLayer = v.InferOutput<typeof GroupLayerSchema>;
```

**CRITICAL:** The existing `TileLayerSchema` must be migrated. Current callers use `layers: TileLayer[]` without `kind` field. Add backward compatibility: if `kind` is missing, treat as tile layer.

Migration strategy:
1. Keep old `TileLayerSchema` as `LegacyTileLayerSchema` temporarily
2. `MapDataSchema.layers` accepts both old format (without `kind`) and new format
3. A migration function converts legacy → new format at load time
4. Update all tests to use new format

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(layers): add discriminated union (tile/object/group) with shared visual properties"
```

---

### Task 8: Map-Level Properties Schema

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for map-level properties (displayName, bgm, bgs, encounters, scrollType, hooks).

**Step 2: Run tests — expect FAIL**

**Step 3: Define MapPropertiesSchema**

```typescript
const ScrollTypeSchema = v.picklist(['none', 'loopHorizontal', 'loopVertical', 'loopBoth']);

const EncounterEntrySchema = v.pipe(
  v.strictObject({
    troopId: v.pipe(v.string(), v.nonEmpty()),
    weight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 1),
    regionIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))), []),
  }),
  v.readonly(),
);

const MapPropertiesSchema = v.pipe(
  v.strictObject({
    displayName: v.optional(v.string(), ''),
    bgm: v.optional(v.string(), ''),
    bgs: v.optional(v.string(), ''),
    encounterList: v.optional(v.array(EncounterEntrySchema), []),
    encounterSteps: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(999)), 30),
    scrollType: v.optional(ScrollTypeSchema, 'none'),
    disableDash: v.optional(v.boolean(), false),
    specifyBattleback: v.optional(v.string(), ''),
    onEnter: v.optional(v.string(), ''),
    onExit: v.optional(v.string(), ''),
    onStep: v.optional(v.string(), ''),
    onParallelProcess: v.optional(v.string(), ''),
  }),
  v.readonly(),
);
export type MapProperties = v.InferOutput<typeof MapPropertiesSchema>;
```

Add to MapDataSchema:
```typescript
properties: v.optional(MapPropertiesSchema),
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(map): add map-level properties (display name, BGM, encounters, scroll type, hooks)"
```

---

### Task 9: Tileset Normal & Emission Map Fields

**Files:**
- Modify: `runtime/src/schemas/map-data.ts`
- Test: `runtime/src/schemas/map-data.test.ts`

**Step 1: Write failing tests** for `normalMapPath` and `emissionMapPath` on TilesetConfig.

**Step 2: Run tests — expect FAIL**

**Step 3: Add fields to TilesetConfigSchema**

```typescript
normalMapPath: v.optional(v.string(), ''),
emissionMapPath: v.optional(v.string(), ''),
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tileset): add normal map and emission map atlas paths to TilesetConfigSchema"
```

---

### Task 10: Per-Tile Override Schema

**Files:**
- Create: `runtime/src/schemas/tile-overrides.ts`
- Create: `runtime/src/schemas/tile-overrides.test.ts`

**Step 1: Write failing tests** for `TileOverrideSchema` with transform, visual, animation, rendering sub-groups.

**Step 2: Run tests — expect FAIL**

**Step 3: Create tile-overrides.ts**

```typescript
import * as v from 'valibot';
import type { Num } from '@/schemas/common';

const TileOverrideSchema = v.pipe(
  v.strictObject({
    // Transform
    rotation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 0),
    scaleX: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(10)), 1),
    scaleY: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(10)), 1),
    offsetX: v.optional(v.number(), 0),
    offsetY: v.optional(v.number(), 0),
    offsetZ: v.optional(v.number(), 0),

    // Visual
    tintR: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    tintG: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    tintB: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    tintA: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    brightness: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0),
    saturation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),

    // Animation
    animationSpeed: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),
    animationPhase: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),
    animationPaused: v.optional(v.boolean(), false),

    // Rendering
    renderOrder: v.optional(v.pipe(v.number(), v.integer()), 0),
    blendMode: v.optional(v.picklist(['normal', 'add', 'multiply', 'screen']), 'normal'),
    castShadow: v.optional(v.boolean(), false),
    receiveShadow: v.optional(v.boolean(), true),
    emissive: v.optional(v.boolean(), false),
    emissiveR: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    emissiveG: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    emissiveB: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
    emissiveIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),
    normalMapOverride: v.optional(v.string(), ''),
    depthWrite: v.optional(v.boolean(), true),
  }),
  v.readonly(),
);
export const TileOverrideSchema_ = TileOverrideSchema;
export type TileOverride = v.InferOutput<typeof TileOverrideSchema>;
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add TileOverrideSchema for per-tile transform, visual, animation, rendering overrides"
```

---

### Task 11: Terrain Set Schema (Autotile)

**Files:**
- Create: `runtime/src/schemas/terrain-set.ts`
- Create: `runtime/src/schemas/terrain-set.test.ts`

**Step 1: Write failing tests** for `TerrainSetSchema`.

**Step 2: Run tests — expect FAIL**

**Step 3: Create terrain-set.ts**

```typescript
import * as v from 'valibot';

const TerrainSetTypeSchema = v.picklist(['corner', 'edge', 'cornerEdge']);

const TerrainCornerLabelsSchema = v.pipe(
  v.strictObject({
    topLeft: v.pipe(v.string(), v.nonEmpty()),
    topRight: v.pipe(v.string(), v.nonEmpty()),
    bottomLeft: v.pipe(v.string(), v.nonEmpty()),
    bottomRight: v.pipe(v.string(), v.nonEmpty()),
  }),
  v.readonly(),
);

const TerrainEdgeLabelsSchema = v.pipe(
  v.strictObject({
    north: v.pipe(v.string(), v.nonEmpty()),
    south: v.pipe(v.string(), v.nonEmpty()),
    east: v.pipe(v.string(), v.nonEmpty()),
    west: v.pipe(v.string(), v.nonEmpty()),
  }),
  v.readonly(),
);

const TerrainTileAssignmentSchema = v.pipe(
  v.strictObject({
    tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    corners: v.optional(TerrainCornerLabelsSchema),
    edges: v.optional(TerrainEdgeLabelsSchema),
    probability: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
  }),
  v.readonly(),
);

const TerrainSetSchema = v.pipe(
  v.strictObject({
    name: v.pipe(v.string(), v.nonEmpty()),
    type: TerrainSetTypeSchema,
    terrains: v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(2)),
    tileAssignments: v.array(TerrainTileAssignmentSchema),
    defaultTileId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
  }),
  v.readonly(),
);
export const TerrainSetSchema_ = TerrainSetSchema;
export type TerrainSet = v.InferOutput<typeof TerrainSetSchema>;
```

Add `terrainSets` field to TilesetConfigSchema:
```typescript
terrainSets: v.optional(v.array(TerrainSetSchema), []),
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(autotile): add terrain set schema (corner/edge/cornerEdge matching)"
```

---

## Phase C: Tile ID Bit-Packing (Flip/Rotate)

### Task 12: resolveGlobalTileId with Flip Flags

**Files:**
- Modify: `runtime/src/rendering/tileset-loader.ts`
- Test: `runtime/src/rendering/tileset-loader.test.ts`

**Step 1: Write failing tests**

```typescript
describe('resolveGlobalTileId — flip flags', () => {
  it('should strip flip bits and return flags', () => {
    const FLIP_H = 0x80000000;
    const tileId = 5 | FLIP_H;
    const result = resolveGlobalTileId({ globalId: tileId, tilesets: [testTileset] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    expect(result.data!.localIndex).toBe(4); // 5 - firstGid(1)
    expect(result.data!.flipH).toBe(true);
    expect(result.data!.flipV).toBe(false);
    expect(result.data!.flipD).toBe(false);
  });

  it('should handle all 8 rotation combinations', () => {
    const FLIP_H = 0x80000000;
    const FLIP_V = 0x40000000;
    const FLIP_D = 0x20000000;

    const cases = [
      { flags: 0, h: false, v: false, d: false },
      { flags: FLIP_H, h: true, v: false, d: false },
      { flags: FLIP_V, h: false, v: true, d: false },
      { flags: FLIP_H | FLIP_V, h: true, v: true, d: false },
      { flags: FLIP_D, h: false, v: false, d: true },
      { flags: FLIP_H | FLIP_D, h: true, v: false, d: true },
      { flags: FLIP_V | FLIP_D, h: false, v: true, d: true },
      { flags: FLIP_H | FLIP_V | FLIP_D, h: true, v: true, d: true },
    ];

    for (const { flags, h, v, d } of cases) {
      const tileId = 5 | flags;
      const result = resolveGlobalTileId({ globalId: tileId, tilesets: [testTileset] });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data!.flipH).toBe(h);
      expect(result.data!.flipV).toBe(v);
      expect(result.data!.flipD).toBe(d);
    }
  });

  it('should preserve backward compat for plain IDs', () => {
    const result = resolveGlobalTileId({ globalId: 5, tilesets: [testTileset] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.flipH).toBe(false);
    expect(result.data!.flipV).toBe(false);
    expect(result.data!.flipD).toBe(false);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Modify resolveGlobalTileId**

```typescript
const FLIP_H_BIT: Num = 0x80000000;
const FLIP_V_BIT: Num = 0x40000000;
const FLIP_D_BIT: Num = 0x20000000;
const TILE_ID_MASK: Num = 0x1FFFFFFF;

// In resolveGlobalTileId:
const flipH: Bool = (globalId & FLIP_H_BIT) !== 0;
const flipV: Bool = (globalId & FLIP_V_BIT) !== 0;
const flipD: Bool = (globalId & FLIP_D_BIT) !== 0;
const cleanId: Num = globalId & TILE_ID_MASK;

// Use cleanId for tileset lookup, return { tileset, localIndex, flipH, flipV, flipD }
```

Update the `ResolvedTile` type to include flip flags.

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add Tiled-compatible flip/rotate bit extraction to resolveGlobalTileId"
```

---

### Task 13: UV Transformation for Flipped Tiles

**Files:**
- Modify: `runtime/src/rendering/tile-geometry.ts`
- Test: `runtime/src/rendering/tile-geometry.test.ts`

**Step 1: Write failing tests** for UV flipping in `createFlatTileGeometry`.

Test: Given UV (u0=0.1, v0=0.2, u1=0.3, v1=0.4) with flipH=true, expect u0/u1 swapped in the vertex data.

**Step 2: Run tests — expect FAIL**

**Step 3: Add flip flag parameters and UV transformation**

```typescript
// In createFlatTileGeometry, after receiving flipH, flipV, flipD:
let uvCoords = [
  { u: uv.u0, v: uv.v0 }, // bottom-left
  { u: uv.u1, v: uv.v0 }, // bottom-right
  { u: uv.u1, v: uv.v1 }, // top-right
  { u: uv.u0, v: uv.v1 }, // top-left
];

if (flipH) {
  // Swap U coordinates
  for (const coord of uvCoords) {
    coord.u = coord.u === uv.u0 ? uv.u1 : uv.u0;
  }
}
if (flipV) {
  // Swap V coordinates
  for (const coord of uvCoords) {
    coord.v = coord.v === uv.v0 ? uv.v1 : uv.v0;
  }
}
if (flipD) {
  // Swap U and V (anti-diagonal)
  uvCoords = [uvCoords[0], uvCoords[3], uvCoords[2], uvCoords[1]];
}
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): implement UV transformation for H/V/diagonal flip in tile geometry"
```

---

### Task 14: Wire Flip Flags Through Chunk Builder

**Files:**
- Modify: `runtime/src/rendering/chunk-builder.ts`
- Test: `runtime/src/rendering/chunk-builder.test.ts`

**Step 1: Write failing test** — build a chunk with a flipped tile ID (e.g., `5 | 0x80000000`), verify the chunk mesh is created successfully.

**Step 2: Run tests — expect FAIL**

**Step 3: Modify buildChunk** to pass flip flags from `resolveGlobalTileId` to `createFlatTileGeometry`.

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): wire flip flags from tile ID through chunk builder to geometry"
```

---

## Phase D: Animated Tile System

### Task 15: General Tile Animation Engine

Replace the material-UV-offset approach with a per-tile UV lookup update system.

**Files:**
- Create: `runtime/src/rendering/tile-animation-engine.ts`
- Create: `runtime/src/rendering/tile-animation-engine.test.ts`

**Step 1: Write failing tests**

```typescript
describe('TileAnimationEngine', () => {
  it('should create animation engine', () => {
    const result = createAnimationEngine({ scene });
    expect(result.ok).toBe(true);
  });

  it('should register tile animation from definition', () => {
    const engine = createAnimationEngine({ scene });
    if (!engine.ok) return;
    const result = registerTileAnimation({
      engine: engine.data,
      tilesetIndex: 0,
      localTileId: 5,
      animation: {
        frames: [{ tileId: 5, duration: 200 }, { tileId: 6, duration: 200 }],
        playbackMode: 'loop',
        globalSync: true,
        speedMultiplier: 1,
        pauseWhenOffscreen: true,
      },
    });
    expect(result.ok).toBe(true);
  });

  it('should advance frame after duration elapsed', () => {
    // Register animation, advance by 250ms, check current frame is 1
  });

  it('should loop back to frame 0', () => {
    // Advance past total duration, verify wraps to 0
  });

  it('should handle pingPong playback', () => {
    // 3 frames: 0,1,2 → pingPong: 0,1,2,1,0,1,2...
  });

  it('should respect globalSync vs phase offset', () => {
    // Two instances with globalSync=true should be on same frame
    // With globalSync=false + different animationPhase, different frames
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement tile-animation-engine.ts**

Core data structures:
```typescript
type AnimationState = {
  frames: ReadonlyArray<{ tileId: Num; duration: Num }>;
  playbackMode: 'loop' | 'pingPong' | 'once' | 'random';
  globalSync: Bool;
  speedMultiplier: Num;
  elapsed: Num;
  currentFrameIndex: Num;
  direction: Num; // 1 or -1 for pingPong
};

type AnimationEngine = {
  animations: Map<string, AnimationState>; // key: "tilesetIndex:localTileId"
  observer: BABYLON.Observer<BABYLON.Scene>;
  scene: BABYLON.Scene;
};
```

Key function: `advanceAllAnimations(engine, deltaMs)` — iterates all animations, updates elapsed time, computes new frame index based on playback mode.

Key function: `getCurrentTileId(engine, tilesetIndex, localTileId)` — returns the resolved tile ID for the current animation frame (used by chunk builder during rebuild).

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(tiles): add general tile animation engine with loop/pingPong/once/random modes"
```

---

### Task 16: Wire Animation Engine into Chunk Builder

**Files:**
- Modify: `runtime/src/rendering/chunk-builder.ts`
- Modify: `runtime/src/rendering/tilemap-renderer.ts`
- Test: update existing tests

When building chunks, check if a tile has an animation definition. If so, use the current frame's tile ID for UV lookup.

**Step 1: Write failing test** — render a map with an animated tile, verify the chunk builder uses the animation engine's current frame.

**Step 2–6: Implement, test, QA, commit**

```bash
git commit -m "feat(tiles): integrate animation engine with chunk builder for frame-based UV lookup"
```

---

## Phase E: Native Autotile (Terrain Sets)

### Task 17: Corner Terrain Matcher

**Files:**
- Create: `runtime/src/rendering/terrain-matcher.ts`
- Create: `runtime/src/rendering/terrain-matcher.test.ts`

**Step 1: Write failing tests** for corner-based terrain matching.

```typescript
describe('terrain-matcher — corner type', () => {
  it('should match isolated tile (all 4 corners same terrain)', () => {
    // Single grass tile surrounded by dirt
    // All 4 corners should be "grass"
    // Find tile in terrain set where all corners are grass
  });

  it('should match horizontal edge (N corners dirt, S corners grass)', () => {
    // Grass below, dirt above
  });

  it('should match corner piece (1 corner different)', () => {
    // 3 corners grass, 1 corner dirt
  });

  it('should use probability for multiple matches', () => {
    // Two tiles with same corner labels but different IDs
    // Random selection weighted by probability
  });

  it('should fallback to defaultTileId when no match', () => {
    // Corner combination not in tile assignments
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement terrain-matcher.ts**

Algorithm:
1. For each tile position, examine 8 neighbors
2. Determine corner terrains: each corner is influenced by the 3 adjacent tiles (e.g., top-left corner = tile + north neighbor + west neighbor + NW neighbor)
3. If all 3 neighbors match, corner = that terrain; if any differ, corner = transition terrain
4. Find tile in terrain set whose corner labels match
5. If multiple matches, weighted random selection
6. If no match, use defaultTileId

```typescript
export function matchTerrainTile(options: {
  x: Num;
  z: Num;
  mapWidth: Num;
  mapHeight: Num;
  layerData: ReadonlyArray<Num>;
  terrainSet: TerrainSet;
  tileTerrainMap: Map<Num, Str>; // tileId → terrain name
}): Result<Num> { ... }
```

**Step 4–6: Run tests, QA, commit**

```bash
git commit -m "feat(autotile): implement corner terrain matching algorithm"
```

---

### Task 18: Edge Terrain Matcher

Same pattern as Task 17 but for edge-based matching (cardinal neighbors only, 4 edges per tile).

```bash
git commit -m "feat(autotile): implement edge terrain matching algorithm"
```

---

### Task 19: Combined Corner+Edge Matcher

Combines corner and edge matching for full 8-way precision. Falls back gracefully when tile set doesn't have all 256 combinations.

```bash
git commit -m "feat(autotile): implement combined corner+edge terrain matching with graceful fallback"
```

---

### Task 20: RPG Maker Compatibility Layer

Convert existing RPG Maker autotile types (terrain_48, wall_16) to equivalent terrain set definitions at load time.

**Files:**
- Create: `runtime/src/rendering/rpgmaker-autotile-compat.ts`
- Create: `runtime/src/rendering/rpgmaker-autotile-compat.test.ts`

```bash
git commit -m "feat(autotile): add RPG Maker compatibility layer converting terrain_48/wall_16 to terrain sets"
```

---

### Task 21: Wire Terrain Sets into Chunk Builder

Replace the autotile resolution path in chunk-builder with terrain set matching when terrain sets are defined.

```bash
git commit -m "feat(autotile): integrate terrain set matching into chunk builder pipeline"
```

---

## Phase F: Tileset Normal & Emission Maps

### Task 22: Load Normal/Emission Textures

**Files:**
- Modify: `runtime/src/rendering/tileset-loader.ts`
- Test: `runtime/src/rendering/tileset-loader.test.ts`

Load normal map and emission map textures alongside the diffuse texture. Both use NEAREST sampling, same dimensions as the tile atlas.

```bash
git commit -m "feat(tileset): load normal map and emission map atlas textures"
```

---

### Task 23: Apply Normal/Emission to Tile Material

**Files:**
- Modify: `runtime/src/rendering/tile-material.ts`
- Test: `runtime/src/rendering/tile-material.test.ts`

If a tileset has normalMapPath, set `material.bumpTexture`. If emissionMapPath, set `material.emissiveTexture`.

```bash
git commit -m "feat(tileset): apply normal map and emission map to StandardMaterial"
```

---

## Phase G: Water/Liquid Tile Rendering

### Task 24: Water Tile Configuration Schema

**Files:**
- Create: `runtime/src/schemas/water-config.ts`
- Create: `runtime/src/schemas/water-config.test.ts`

```typescript
const WaterConfigSchema = v.pipe(
  v.strictObject({
    enabled: v.optional(v.boolean(), true),
    waveDistortion: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.02),
    waveSpeed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 1),
    flowDirectionX: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0),
    flowDirectionY: v.optional(v.pipe(v.number(), v.minValue(-1), v.maxValue(1)), 0.5),
    foamEnabled: v.optional(v.boolean(), true),
    foamColor: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 0.6 }),
    foamWidth: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.1),
    causticsEnabled: v.optional(v.boolean(), true),
    causticsIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.3),
    causticsScale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),
    reflectionEnabled: v.optional(v.boolean(), false),
    reflectionOpacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.3),
    tintColor: v.optional(ColorRgbaSchema, { r: 0.2, g: 0.4, b: 0.8, a: 0.5 }),
  }),
  v.readonly(),
);
```

```bash
git commit -m "feat(water): add water tile configuration schema"
```

---

### Task 25: Water Tile Renderer

**Files:**
- Create: `runtime/src/rendering/water-renderer.ts`
- Create: `runtime/src/rendering/water-renderer.test.ts`

Implements wave distortion via UV animation, shore foam detection (check adjacent tiles for non-water), and caustic overlay.

```bash
git commit -m "feat(water): implement water tile renderer with waves, foam, and caustics"
```

---

## Phase H: Fog of War

### Task 26: Fog of War Schema & State

**Files:**
- Create: `runtime/src/schemas/fog-of-war-config.ts`
- Create: `runtime/src/schemas/fog-of-war-config.test.ts`

```typescript
const FogOfWarVisibilitySchema = v.picklist(['hidden', 'explored', 'visible']);

const FogOfWarConfigSchema = v.pipe(
  v.strictObject({
    enabled: v.optional(v.boolean(), false),
    defaultState: v.optional(FogOfWarVisibilitySchema, 'hidden'),
    exploredOpacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),
    hiddenColor: v.optional(ColorRgbaSchema, { r: 0, g: 0, b: 0, a: 1 }),
    exploredTint: v.optional(ColorRgbaSchema, { r: 0.3, g: 0.3, b: 0.3, a: 1 }),
    blendRadius: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3)), 1),
    revealRadius: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)), 5),
  }),
  v.readonly(),
);
```

```bash
git commit -m "feat(fog): add fog of war configuration schema"
```

---

### Task 27: Fog of War Manager

**Files:**
- Create: `runtime/src/rendering/fog-of-war-manager.ts`
- Create: `runtime/src/rendering/fog-of-war-manager.test.ts`

State: flat `Uint8Array` of visibility values (0=hidden, 1=explored, 2=visible).
API: `revealRegion(x, z, radius)`, `hideRegion(x, z, radius)`, `getVisibility(x, z)`.
Rendering: Dynamic texture overlay applied to tilemap material or as a post-process layer.

```bash
git commit -m "feat(fog): implement fog of war manager with reveal/hide/query API"
```

---

## Phase I: Y-Sort Rendering

### Task 28: Y-Sort Layer Mode

**Files:**
- Modify: `runtime/src/rendering/chunk-builder.ts`
- Test: `runtime/src/rendering/chunk-builder.test.ts`

When a tile layer has `ySortEnabled: true`, each tile in the chunk gets an individual mesh (not merged) so it can be depth-sorted by Y position. Alternatively, assign `mesh.position.y` offsets based on the tile's Z coordinate within the chunk.

For merged meshes: use the rendering order within the vertex buffer. Tiles with higher Z (further from camera) should be rendered first. Sort tiles by Z before merging.

```bash
git commit -m "feat(layers): implement Y-sort rendering mode for tile layers"
```

---

## Phase J: Pathfinding

### Task 29: Nav Mesh Generation

**Files:**
- Create: `runtime/src/systems/pathfinding.ts`
- Create: `runtime/src/systems/pathfinding.test.ts`

Generate a navigation grid from tile passability data. Each tile position is a node. Edges connect to passable neighbors. Movement cost comes from `movementSpeed` terrain property.

```typescript
export function generateNavGrid(options: {
  mapWidth: Num;
  mapHeight: Num;
  layers: ReadonlyArray<TileLayer>;
  tilesets: ReadonlyArray<LoadedTileset>;
}): Result<NavGrid> { ... }
```

```bash
git commit -m "feat(pathfinding): generate navigation grid from tile passability"
```

---

### Task 30: A* Pathfinding

**Files:**
- Modify: `runtime/src/systems/pathfinding.ts`
- Test: `runtime/src/systems/pathfinding.test.ts`

Standard A* with support for:
- 4-directional and 8-directional movement
- Terrain movement cost (`movementSpeed` field)
- One-way passage (collision shapes with `oneWay`)

```typescript
export function findPath(options: {
  navGrid: NavGrid;
  startX: Num;
  startZ: Num;
  endX: Num;
  endZ: Num;
  diagonal: Bool;
}): Result<ReadonlyArray<{ x: Num; z: Num }>> { ... }
```

```bash
git commit -m "feat(pathfinding): implement A* pathfinding with terrain cost support"
```

---

## Phase K: Procedural Helpers

### Task 31: Weighted Random Fill

**Files:**
- Create: `runtime/src/systems/procedural.ts`
- Create: `runtime/src/systems/procedural.test.ts`

Uses the `probability` field on tile definitions for weighted random tile placement.

```bash
git commit -m "feat(procedural): add weighted random fill using tile probability"
```

---

### Task 32: Noise-Based Terrain Generation

**Files:**
- Modify: `runtime/src/systems/procedural.ts`
- Test: `runtime/src/systems/procedural.test.ts`

Simplex/Perlin noise mapped to terrain set names. Generates a layer data array from noise.

```bash
git commit -m "feat(procedural): add noise-based terrain generation with Simplex noise"
```

---

## Phase L: Runtime API

### Task 33: Tile Query API

**Files:**
- Modify: `runtime/src/rendering/tile-query.ts`
- Test: `runtime/src/rendering/tile-query.test.ts`

Expand `getTileProperties` and add:
- `getTilePassability(x, z, layers, tilesets)` — combined passability across all layers
- `getTilesInRegion(rect, layers)` — bulk query
- `getObjectsOnLayer(layerName, layers)` — object layer query

```bash
git commit -m "feat(api): expand tile query API with passability, region, and object queries"
```

---

### Task 34: Layer Flattening Utility

**Files:**
- Create: `runtime/src/rendering/layer-utils.ts`
- Create: `runtime/src/rendering/layer-utils.test.ts`

Flatten group layers into leaf tile/object layers with cascaded properties.

```typescript
export function flattenLayers(layers: ReadonlyArray<Layer>): Result<ReadonlyArray<TileLayer | ObjectLayer>> {
  // Recursively traverse group layers
  // Multiply opacity, tint; add offsets; AND visibility/locked
  // Return flat array of leaf layers with cascaded properties
}
```

```bash
git commit -m "feat(layers): add layer flattening utility with cascading property resolution"
```

---

## Phase M: Dev Harness Controls

### Task 35: Tile Properties Inspector

**Files:**
- Modify: `runtime/dev/dev.ts`

Add a "Tile Inspector" section to the dev harness. Click a tile in the viewport to display its full properties (passability, terrain, flags, collision, custom properties).

```bash
git commit -m "feat(devtools): add tile property inspector to dev harness"
```

---

### Task 36: Layer Controls Enhancement

**Files:**
- Modify: `runtime/dev/dev.ts`

Expand the Layers section with:
- Layer kind indicator (tile/object/group)
- Tint color picker, brightness/saturation/contrast sliders
- Offset X/Y sliders
- Y-sort toggle
- Render order input

```bash
git commit -m "feat(devtools): expand layer controls with tint, offset, Y-sort, render order"
```

---

### Task 37: Animated Tile Controls

**Files:**
- Modify: `runtime/dev/dev.ts`

Add controls for:
- Global animation speed multiplier
- Pause/resume all animations
- Per-tileset animation list with current frame display

```bash
git commit -m "feat(devtools): add animated tile controls to dev harness"
```

---

### Task 38: Terrain Set Visualizer

**Files:**
- Modify: `runtime/dev/dev.ts`

Debug overlay that color-codes tiles by terrain type. Toggle per terrain set.

```bash
git commit -m "feat(devtools): add terrain set debug visualizer"
```

---

### Task 39: Fog of War Controls

**Files:**
- Modify: `runtime/dev/dev.ts`

Add controls for:
- Enable/disable fog of war
- Reveal radius slider
- Explored opacity slider
- Click-to-reveal in viewport
- Reset all to hidden

```bash
git commit -m "feat(devtools): add fog of war controls to dev harness"
```

---

### Task 40: Water Tile Controls

**Files:**
- Modify: `runtime/dev/dev.ts`

Add controls for all water config parameters (wave distortion, speed, flow direction, foam, caustics, reflection).

```bash
git commit -m "feat(devtools): add water tile parameter controls to dev harness"
```

---

### Task 41: Flip/Rotate Debug Overlay

**Files:**
- Modify: `runtime/dev/dev.ts`

Debug overlay showing colored borders on flipped/rotated tiles (red=H flip, blue=V flip, green=diagonal).

```bash
git commit -m "feat(devtools): add flip/rotate debug overlay to dev harness"
```

---

## Phase N: Test Map Updates

### Task 42: Update Test Map with New Features

**Files:**
- Modify: `runtime/dev/test-map.ts`

Add to the test map:
- Tiles with flip/rotate flags
- An object layer with spawn points and trigger zones
- A group layer wrapping some existing layers
- Tiles with passability flags (blocked paths, one-way ledges)
- Animated water tiles
- Terrain set definitions
- Per-tile overrides (tinted tiles, scaled tiles)
- Map-level properties (displayName, BGM, encounters)

```bash
git commit -m "feat(devtools): update test map with flip/rotate, object layers, terrain sets, water, properties"
```

---

## Phase O: Integration & Visual Verification

### Task 43: Wire Layer System into Tilemap Renderer

**Files:**
- Modify: `runtime/src/rendering/tilemap-renderer.ts`

Update `renderTilemap` to:
1. Accept new `LayerSchema` discriminated union
2. Flatten group layers via `flattenLayers`
3. Skip object layers during mesh building
4. Apply layer visual properties (tint, offset, parallax factor)
5. Handle Y-sort layers

**CRITICAL:** Maintain backward compatibility with existing maps that use the old TileLayerSchema format.

```bash
git commit -m "feat(tilemap): integrate new layer system, overrides, and animation engine into renderer"
```

---

### Task 44: Visual Verification Pass

**No code changes.** Run `pnpm dev`, open the dev harness, and verify:

1. All 13+ sections collapsed by default, expand/collapse correctly
2. Flip/rotate tiles render correctly (check test map)
3. Object layer data accessible via debug API
4. Group layers cascade visibility/opacity correctly
5. Tile properties inspector shows correct data
6. Animated tiles cycle through frames
7. Terrain sets produce correct autotile patterns
8. Water tiles show wave animation
9. Fog of war reveals/hides correctly
10. Y-sort renders tiles in correct depth order
11. Normal/emission maps affect lighting
12. All sliders, toggles, buttons function correctly

Take screenshots for evidence.

---

### Task 45: Full QA Pass

```bash
cd packages/products/webforge && pnpm qa:type-check
pnpm -w run qa:lint
pnpm -w run qa:format:check
cd packages/products/webforge && pnpm qa:test
```

Fix any issues. Final commit:

```bash
git commit -m "chore: fix QA issues from tiles/tilemap/layers expansion"
```

---

## Progress Tracker

Each task: TDD → full QA → visual verify → mark `[x]` → commit → next task.

### Phase A: Tile Properties Schemas
- [x] Task 1: Passability schema
- [x] Task 2: Terrain schema
- [x] Task 3: Tile flags schema
- [x] Task 4: Collision shape schema
- [x] Task 5: Custom properties & tags schema
- [x] Task 6: Tile animation definition schema

### Phase B: Layer System Schemas
- [x] Task 7: Layer kind discriminated union (tile/object/group)
- [ ] Task 8: Map-level properties schema
- [ ] Task 9: Tileset normal & emission map fields
- [ ] Task 10: Per-tile override schema
- [ ] Task 11: Terrain set schema (autotile)

### Phase C: Tile ID Bit-Packing
- [ ] Task 12: resolveGlobalTileId with flip flags
- [ ] Task 13: UV transformation for flipped tiles
- [ ] Task 14: Wire flip flags through chunk builder

### Phase D: Animated Tile System
- [ ] Task 15: General tile animation engine
- [ ] Task 16: Wire animation engine into chunk builder

### Phase E: Native Autotile
- [ ] Task 17: Corner terrain matcher
- [ ] Task 18: Edge terrain matcher
- [ ] Task 19: Combined corner+edge matcher
- [ ] Task 20: RPG Maker compatibility layer
- [ ] Task 21: Wire terrain sets into chunk builder

### Phase F: Tileset Normal & Emission Maps
- [ ] Task 22: Load normal/emission textures
- [ ] Task 23: Apply normal/emission to tile material

### Phase G: Water/Liquid Tiles
- [ ] Task 24: Water tile configuration schema
- [ ] Task 25: Water tile renderer

### Phase H: Fog of War
- [ ] Task 26: Fog of war schema & state
- [ ] Task 27: Fog of war manager

### Phase I: Y-Sort Rendering
- [ ] Task 28: Y-sort layer mode

### Phase J: Pathfinding
- [ ] Task 29: Nav mesh generation
- [ ] Task 30: A* pathfinding

### Phase K: Procedural Helpers
- [ ] Task 31: Weighted random fill
- [ ] Task 32: Noise-based terrain generation

### Phase L: Runtime API
- [ ] Task 33: Tile query API
- [ ] Task 34: Layer flattening utility

### Phase M: Dev Harness Controls
- [ ] Task 35: Tile properties inspector
- [ ] Task 36: Layer controls enhancement
- [ ] Task 37: Animated tile controls
- [ ] Task 38: Terrain set visualizer
- [ ] Task 39: Fog of war controls
- [ ] Task 40: Water tile controls
- [ ] Task 41: Flip/rotate debug overlay

### Phase N: Test Map Updates
- [ ] Task 42: Update test map with new features

### Phase O: Integration
- [ ] Task 43: Wire layer system into tilemap renderer
- [ ] Task 44: Final visual verification pass
- [ ] Task 45: Final QA pass

**Total: 45 tasks across 15 phases**
