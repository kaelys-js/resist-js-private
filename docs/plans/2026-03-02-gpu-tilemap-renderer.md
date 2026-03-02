# GPU Tilemap Renderer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-03-02
**Design Doc:** `docs/plans/2026-03-02-gpu-tilemap-renderer-design.md`
**Scope:** System 1 only — Data Texture Tile Renderer (1 draw call per layer). Systems 2 (Streaming) and 3 (Thin-Instance Objects) are separate future plans.

---

## Overview

Replace the chunk-based mesh renderer (which produces O(chunks × layers) draw calls) with a GPU data texture renderer that renders each flat tile layer as **1 draw call** via a single quad + custom shader. The current chunk-builder is preserved for cliff/wall geometry only.

**New Files:**
```
packages/products/webforge/runtime/src/rendering/
├── gpu-tile-data-texture.ts          ← Data texture creation/update
├── gpu-tile-data-texture.test.ts
├── gpu-tile-shader.ts                ← GLSL shader source strings
├── gpu-tile-shader.test.ts
├── gpu-tile-renderer.ts              ← Layer creation, disposal, editing
├── gpu-tile-renderer.test.ts
```

**Modified Files:**
```
├── tilemap-renderer.ts               ← New GPU code path + schema update
├── tilemap-renderer.test.ts          ← New integration tests
└── map-data.ts                       ← Raise max width/height to 16384
```

---

## QA Commands (run after EVERY file edit)

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

After each task's tests are written + implementation done:
```bash
pnpm qa:test
```

---

## Task 1: Raise MapData Max Dimensions

**File:** `packages/products/webforge/runtime/src/schemas/map-data.ts`

### 1a. Test updates

Check if existing tests depend on maxValue(500). Grep for `501` or `maxValue` references in map-data tests.

### 1b. Schema change

Change `width` and `height` maxValue from 500 to 16384:

```typescript
// Before:
width: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),
height: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),

// After:
width: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16384)),
height: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16384)),
```

### 1c. Verify

Run `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`.

---

## Task 2: GPU Tile Data Texture — Pure Logic

**Files:**
- `packages/products/webforge/runtime/src/rendering/gpu-tile-data-texture.ts`
- `packages/products/webforge/runtime/src/rendering/gpu-tile-data-texture.test.ts`

This module handles packing tile data into a `Uint32Array` suitable for uploading as an `RGBA32UI` GPU texture. Pure math — no Babylon.js dependency except for the texture creation function.

### 2a. Write tests first

```typescript
// gpu-tile-data-texture.test.ts
import { describe, expect, it } from 'vitest';
import {
    packVisualFlags,
    unpackVisualFlags,
    buildLayerData,
    type VisualFlags,
} from './gpu-tile-data-texture';

describe('packVisualFlags', () => {
    it('packs default flags to 0xF0 (opacity=15)', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        // opacity 15 = bits 4-7 = 0b1111_0000 = 0xF0
        expect(packed).toBe(0xF0);
    });

    it('packs flipH', () => {
        const flags: VisualFlags = {
            flipH: true, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect(packed & 1).toBe(1); // bit 0
    });

    it('packs flipV', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: true, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 1) & 1).toBe(1); // bit 1
    });

    it('packs rotation 90° (value=1) into bits 2-3', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 1,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 2) & 3).toBe(1);
    });

    it('packs opacity 0 into bits 4-7', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 0, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 4) & 0xF).toBe(0);
    });

    it('packs shadow disable flag at bit 8', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: true, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 8) & 1).toBe(1);
    });

    it('packs glow flag at bit 9', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: true,
            tintIndex: 0, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 9) & 1).toBe(1);
    });

    it('packs tintIndex into bits 10-15', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 42, animBase: 0, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 10) & 0x3F).toBe(42);
    });

    it('packs animBase into bits 16-23', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 200, animCount: 0, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 16) & 0xFF).toBe(200);
    });

    it('packs animCount into bits 24-27', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 8, bush: false,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 24) & 0xF).toBe(8);
    });

    it('packs bush flag at bit 28', () => {
        const flags: VisualFlags = {
            flipH: false, flipV: false, rotation: 0,
            opacity: 15, shadowDisable: false, glow: false,
            tintIndex: 0, animBase: 0, animCount: 0, bush: true,
        };
        const packed = packVisualFlags(flags);
        expect((packed >> 28) & 1).toBe(1);
    });

    it('round-trips through pack/unpack', () => {
        const original: VisualFlags = {
            flipH: true, flipV: false, rotation: 2,
            opacity: 10, shadowDisable: true, glow: false,
            tintIndex: 33, animBase: 128, animCount: 5, bush: true,
        };
        const packed = packVisualFlags(original);
        const unpacked = unpackVisualFlags(packed);
        expect(unpacked).toEqual(original);
    });
});

describe('buildLayerData', () => {
    it('creates Uint32Array of correct size for 3×2 map', () => {
        const tileIds = [1, 2, 3, 0, 5, 6];
        const result = buildLayerData({ width: 3, height: 2, tileIds });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // 3*2 tiles * 4 channels = 24
        expect(result.data.length).toBe(24);
    });

    it('stores tile IDs in R channel (offset 0)', () => {
        const tileIds = [42, 0, 7];
        const result = buildLayerData({ width: 3, height: 1, tileIds });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data[0]).toBe(42); // tile 0: R
        expect(result.data[4]).toBe(0);  // tile 1: R
        expect(result.data[8]).toBe(7);  // tile 2: R
    });

    it('stores default visual flags (opacity=15) in G channel (offset 1)', () => {
        const tileIds = [1];
        const result = buildLayerData({ width: 1, height: 1, tileIds });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // Default flags: opacity 15 = bits 4-7 = 0xF0
        expect(result.data[1]).toBe(0xF0);
    });

    it('stores 0 in B and A channels (reserved)', () => {
        const tileIds = [1];
        const result = buildLayerData({ width: 1, height: 1, tileIds });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data[2]).toBe(0); // B
        expect(result.data[3]).toBe(0); // A
    });

    it('returns error for mismatched tileIds length', () => {
        const tileIds = [1, 2]; // 2 tiles but 3x1 map expects 3
        const result = buildLayerData({ width: 3, height: 1, tileIds });
        expect(result.ok).toBe(false);
    });

    it('handles empty tiles (id=0) with zero flags', () => {
        const tileIds = [0];
        const result = buildLayerData({ width: 1, height: 1, tileIds });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data[0]).toBe(0); // R = 0 (empty)
        expect(result.data[1]).toBe(0); // G = 0 (no flags for empty)
    });
});
```

### 2b. Implement

```typescript
// gpu-tile-data-texture.ts
import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, type Result } from '@/schemas/result/result';
import type { Bool, Num } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// Visual flags schema
export const VisualFlagsSchema = v.pipe(
    v.strictObject({
        flipH: v.boolean(),
        flipV: v.boolean(),
        rotation: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3)),
        opacity: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)),
        shadowDisable: v.boolean(),
        glow: v.boolean(),
        tintIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(63)),
        animBase: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
        animCount: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)),
        bush: v.boolean(),
    }),
    v.readonly(),
);
export type VisualFlags = v.InferOutput<typeof VisualFlagsSchema>;

// Default flags: full opacity, no transforms
export const DEFAULT_VISUAL_FLAGS: VisualFlags = {
    flipH: false, flipV: false, rotation: 0,
    opacity: 15, shadowDisable: false, glow: false,
    tintIndex: 0, animBase: 0, animCount: 0, bush: false,
};
export const DEFAULT_PACKED_FLAGS: Num = packVisualFlags(DEFAULT_VISUAL_FLAGS);

/** Pack VisualFlags into a single uint32. */
export function packVisualFlags(flags: VisualFlags): Num { ... }

/** Unpack a uint32 back into VisualFlags (for testing/debugging). */
export function unpackVisualFlags(packed: Num): VisualFlags { ... }

// Build layer data options
export const BuildLayerDataOptionsSchema = v.pipe(
    v.strictObject({
        width: v.pipe(v.number(), v.integer(), v.minValue(1)),
        height: v.pipe(v.number(), v.integer(), v.minValue(1)),
        tileIds: v.array(v.pipe(v.number(), v.integer(), v.minValue(0))),
    }),
    v.readonly(),
);
export type BuildLayerDataOptions = v.InferOutput<typeof BuildLayerDataOptionsSchema>;

/** Build a Uint32Array (RGBA per tile) from flat tile ID array. */
export function buildLayerData(options: BuildLayerDataOptions): Result<Uint32Array> { ... }

// GPU texture creation
export const CreateGpuDataTextureOptionsSchema = v.pipe(
    v.strictObject({
        scene: v.custom<BABYLON.Scene>(...),
        name: v.string(),
        width: v.pipe(v.number(), v.integer(), v.minValue(1)),
        height: v.pipe(v.number(), v.integer(), v.minValue(1)),
        data: v.custom<Uint32Array>(...),
    }),
    v.readonly(),
);
export type CreateGpuDataTextureOptions = v.InferOutput<typeof CreateGpuDataTextureOptionsSchema>;

/** Create a RGBA32UI RawTexture from packed tile data. */
export function createGpuDataTexture(options: CreateGpuDataTextureOptions): BabylonResult<BABYLON.RawTexture> { ... }

// Single-tile update
export const UpdateDataTextureTileOptionsSchema = v.pipe(
    v.strictObject({
        texture: v.custom<BABYLON.RawTexture>(...),
        engine: v.custom<BABYLON.Engine>(...),
        x: v.pipe(v.number(), v.integer(), v.minValue(0)),
        z: v.pipe(v.number(), v.integer(), v.minValue(0)),
        tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
        flags: v.pipe(v.number(), v.integer(), v.minValue(0)),
    }),
    v.readonly(),
);
export type UpdateDataTextureTileOptions = v.InferOutput<typeof UpdateDataTextureTileOptionsSchema>;

/** Update a single tile in the data texture via texSubImage2D. */
export function updateDataTextureTile(options: UpdateDataTextureTileOptions): BabylonResult<Bool> { ... }
```

### 2c. Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 3: GPU Tile Shader Source

**Files:**
- `packages/products/webforge/runtime/src/rendering/gpu-tile-shader.ts`
- `packages/products/webforge/runtime/src/rendering/gpu-tile-shader.test.ts`

GLSL vertex and fragment shader source strings for the GPU tile renderer. These are plain string constants — no Babylon.js dependency.

### 3a. Write tests first

```typescript
// gpu-tile-shader.test.ts
import { describe, expect, it } from 'vitest';
import { GPU_TILE_VERTEX_SHADER, GPU_TILE_FRAGMENT_SHADER } from './gpu-tile-shader';

describe('GPU_TILE_VERTEX_SHADER', () => {
    it('is a non-empty string', () => {
        expect(GPU_TILE_VERTEX_SHADER.length).toBeGreaterThan(0);
    });

    it('declares worldViewProjection uniform', () => {
        expect(GPU_TILE_VERTEX_SHADER).toContain('worldViewProjection');
    });

    it('declares mapSize uniform', () => {
        expect(GPU_TILE_VERTEX_SHADER).toContain('mapSize');
    });

    it('outputs vWorldTilePos varying', () => {
        expect(GPU_TILE_VERTEX_SHADER).toContain('vWorldTilePos');
    });

    it('has position attribute', () => {
        expect(GPU_TILE_VERTEX_SHADER).toContain('position');
    });

    it('has uv attribute', () => {
        expect(GPU_TILE_VERTEX_SHADER).toContain('uv');
    });
});

describe('GPU_TILE_FRAGMENT_SHADER', () => {
    it('is a non-empty string', () => {
        expect(GPU_TILE_FRAGMENT_SHADER.length).toBeGreaterThan(0);
    });

    it('declares usampler2D for tile data', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('usampler2D');
    });

    it('uses texelFetch for tile data lookup', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('texelFetch');
    });

    it('declares tileAtlas sampler', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('tileAtlas');
    });

    it('declares atlasGridSize uniform', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('atlasGridSize');
    });

    it('declares layerOpacity uniform', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('layerOpacity');
    });

    it('handles flip H/V', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('flipH');
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('flipV');
    });

    it('handles rotation', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('rotation');
    });

    it('discards empty tiles (tileId == 0)', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('discard');
    });

    it('applies alpha test', () => {
        expect(GPU_TILE_FRAGMENT_SHADER).toContain('0.5');
    });
});
```

### 3b. Implement

Export two `const` strings: `GPU_TILE_VERTEX_SHADER` and `GPU_TILE_FRAGMENT_SHADER`.

The vertex shader transforms the quad and passes `vWorldTilePos = uv * mapSize` to the fragment shader.

The fragment shader:
1. Computes `tileCoord = ivec2(floor(vWorldTilePos))`
2. Bounds-checks and discards outside map
3. `texelFetch(tileDataTexture, tileCoord, 0)` → tile ID + flags
4. Discards empty tiles (id=0)
5. Decodes visual flags (flip, rotate, opacity, etc.)
6. Computes atlas UV from tile ID + sub-tile position
7. Applies flip/rotate to sub-tile UV
8. Half-texel inset to prevent bleeding
9. Samples `tileAtlas` with computed UV
10. Alpha test (discard if `a < 0.5`)
11. Applies per-tile opacity × layer opacity

See design doc §System 1 → Shader Design for the full GLSL.

### 3c. Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 4: GPU Tile Renderer

**Files:**
- `packages/products/webforge/runtime/src/rendering/gpu-tile-renderer.ts`
- `packages/products/webforge/runtime/src/rendering/gpu-tile-renderer.test.ts`

Creates the ground-plane mesh, ShaderMaterial, and wires up data texture + atlas texture uniforms.

### 4a. Schema: GpuTileLayer

```typescript
export const GpuTileLayerSchema = v.strictObject({
    mesh: v.custom<BABYLON.Mesh>(...),
    material: v.custom<BABYLON.ShaderMaterial>(...),
    dataTexture: v.custom<BABYLON.RawTexture>(...),
    layerData: v.custom<Uint32Array>(...),   // CPU-side copy for editing
    layerIndex: v.number(),
    mapWidth: v.number(),
    mapHeight: v.number(),
});
export type GpuTileLayer = v.InferOutput<typeof GpuTileLayerSchema>;
```

### 4b. Write tests first

```typescript
// gpu-tile-renderer.test.ts
import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import {
    createGpuTileLayer,
    disposeGpuTileLayer,
    updateGpuTile,
    setGpuLayerVisibility,
    setGpuLayerOpacity,
} from './gpu-tile-renderer';

let instance: BabylonEngineInstance | null = null;

afterEach(() => {
    if (instance) { disposeEngine(instance); instance = null; }
});

function setupEngine(): BABYLON.Scene {
    const result: BabylonResult<BabylonEngineInstance> = createTestEngine();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Engine creation failed');
    instance = result.data;
    return instance.scene;
}

describe('createGpuTileLayer', () => {
    it('creates a mesh named with layer index', () => {
        const scene = setupEngine();
        const tileIds = Array.from<number>({ length: 4 }).fill(1);
        const result = createGpuTileLayer({
            scene,
            layerIndex: 0,
            mapWidth: 2,
            mapHeight: 2,
            tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4,
            atlasRows: 4,
            layerOpacity: 1,
            layerYOffset: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.mesh.name).toContain('gpu-layer-0');
        disposeGpuTileLayer({ layer: result.data });
    });

    it('creates mesh with correct world dimensions', () => {
        const scene = setupEngine();
        const tileIds = Array.from<number>({ length: 6 }).fill(1);
        const result = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 3, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // Mesh position should be at map center
        expect(result.data.mesh.position.x).toBeCloseTo(1.5); // 3/2
        expect(result.data.mesh.position.z).toBeCloseTo(1);   // 2/2
        disposeGpuTileLayer({ layer: result.data });
    });

    it('stores CPU-side layer data', () => {
        const scene = setupEngine();
        const tileIds = [5, 0, 3, 1];
        const result = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // R channel (offset 0) of each tile = tile ID
        expect(result.data.layerData[0]).toBe(5);
        expect(result.data.layerData[4]).toBe(0);
        expect(result.data.layerData[8]).toBe(3);
        expect(result.data.layerData[12]).toBe(1);
        disposeGpuTileLayer({ layer: result.data });
    });

    it('sets renderingGroupId = 2', () => {
        const scene = setupEngine();
        const tileIds = Array.from<number>({ length: 4 }).fill(1);
        const result = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.mesh.renderingGroupId).toBe(2);
        disposeGpuTileLayer({ layer: result.data });
    });

    it('returns error for empty tileIds', () => {
        const scene = setupEngine();
        const result = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds: [],
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(result.ok).toBe(false);
    });
});

describe('disposeGpuTileLayer', () => {
    it('disposes mesh, material, and data texture', () => {
        const scene = setupEngine();
        const tileIds = Array.from<number>({ length: 4 }).fill(1);
        const createResult = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(createResult.ok).toBe(true);
        if (!createResult.ok) return;

        const meshBefore = scene.meshes.length;
        disposeGpuTileLayer({ layer: createResult.data });
        expect(scene.meshes.length).toBeLessThan(meshBefore);
    });
});

describe('updateGpuTile', () => {
    it('updates CPU-side layer data', () => {
        const scene = setupEngine();
        const tileIds = [1, 2, 3, 4];
        const createResult = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(createResult.ok).toBe(true);
        if (!createResult.ok) return;

        const updateResult = updateGpuTile({
            layer: createResult.data,
            x: 1, z: 0,
            tileId: 99,
        });
        expect(updateResult.ok).toBe(true);
        // Tile at (1,0) = index 1 → offset 1*4 = 4 → R channel
        expect(createResult.data.layerData[4]).toBe(99);
        disposeGpuTileLayer({ layer: createResult.data });
    });

    it('returns error for out-of-bounds coordinates', () => {
        const scene = setupEngine();
        const tileIds = [1, 2, 3, 4];
        const createResult = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(createResult.ok).toBe(true);
        if (!createResult.ok) return;

        const updateResult = updateGpuTile({
            layer: createResult.data,
            x: 5, z: 0, tileId: 99,
        });
        expect(updateResult.ok).toBe(false);
        disposeGpuTileLayer({ layer: createResult.data });
    });
});

describe('setGpuLayerVisibility', () => {
    it('hides mesh when set to false', () => {
        const scene = setupEngine();
        const tileIds = Array.from<number>({ length: 4 }).fill(1);
        const result = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        setGpuLayerVisibility({ layer: result.data, visible: false });
        expect(result.data.mesh.isEnabled()).toBe(false);

        setGpuLayerVisibility({ layer: result.data, visible: true });
        expect(result.data.mesh.isEnabled()).toBe(true);
        disposeGpuTileLayer({ layer: result.data });
    });
});

describe('setGpuLayerOpacity', () => {
    it('updates layerOpacity uniform on material', () => {
        const scene = setupEngine();
        const tileIds = Array.from<number>({ length: 4 }).fill(1);
        const result = createGpuTileLayer({
            scene, layerIndex: 0,
            mapWidth: 2, mapHeight: 2, tileIds,
            atlasTexture: new BABYLON.Texture(null, scene),
            atlasColumns: 4, atlasRows: 4,
            layerOpacity: 1, layerYOffset: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        setGpuLayerOpacity({ layer: result.data, opacity: 0.5 });
        // ShaderMaterial stores the uniform; verify mesh visibility is used
        expect(result.data.mesh.visibility).toBeCloseTo(0.5);
        disposeGpuTileLayer({ layer: result.data });
    });
});
```

### 4c. Implement

The `createGpuTileLayer` function:
1. Calls `buildLayerData()` to pack tile IDs into Uint32Array
2. Calls `createGpuDataTexture()` to upload as RGBA32UI RawTexture
3. Creates a `BABYLON.MeshBuilder.CreateGround()` sized to `(mapWidth, mapHeight)` with `subdivisions: 1`
4. Creates a `BABYLON.ShaderMaterial` with the shader sources from `gpu-tile-shader.ts`
5. Sets uniforms: `mapSize`, `atlasGridSize`, `atlasTileUvSize`, `layerOpacity`, `animationFrame`
6. Sets textures: `tileDataTexture` (the RGBA32UI texture), `tileAtlas` (the tileset atlas)
7. Positions mesh at `(mapWidth/2, layerYOffset, mapHeight/2)`
8. Sets `renderingGroupId = 2`, `backFaceCulling = false`
9. Returns `GpuTileLayer` handle

The `updateGpuTile` function:
1. Validates coordinates are in bounds
2. Updates CPU-side `layerData` array
3. Calls `updateDataTextureTile()` to patch the GPU texture

### 4d. Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 5: Integration into tilemap-renderer.ts

**Files:**
- `packages/products/webforge/runtime/src/rendering/tilemap-renderer.ts`
- `packages/products/webforge/runtime/src/rendering/tilemap-renderer.test.ts`

### 5a. Add GpuTileLayer[] to RenderedTilemapSchema

Add a `gpuLayers` field alongside existing `chunks`:

```typescript
gpuLayers: v.custom<GpuTileLayer[]>((val): val is GpuTileLayer[] => Array.isArray(val)),
```

### 5b. Modify renderTilemap() — GPU code path

Replace the chunk-building loop (step 9) with a conditional:

```typescript
// For each tile layer:
const gpuLayers: GpuTileLayer[] = [];

for (let layerIndex = 0; layerIndex < mapData.layers.length; layerIndex++) {
    const layer = mapData.layers[layerIndex];
    if (layer.kind !== 'tile') continue;
    if (!layer.visible) continue;

    // Use GPU renderer for flat tile layers
    const gpuResult = createGpuTileLayer({
        scene,
        layerIndex,
        mapWidth: mapData.width,
        mapHeight: mapData.height,
        tileIds: [...layer.data],
        atlasTexture: tilesets[0].texture,  // First tileset for now
        atlasColumns: tilesets[0].config.columns,
        atlasRows: tilesets[0].config.rows,
        layerOpacity: layer.opacity,
        layerYOffset: LAYER_Y_OFFSETS[layer.type] ?? 0,
    });
    if (!gpuResult.ok) return gpuResult;
    gpuLayers.push(gpuResult.data);
}

// Cliff chunks still use legacy builder
```

The old chunk-building loop (steps 9–10c) is **removed** for tile layers. Cliff chunks (step 10) remain unchanged.

### 5c. Modify disposeTilemap()

Add GPU layer disposal:

```typescript
// Dispose GPU tile layers
for (const gpuLayer of tilemap.gpuLayers) {
    disposeGpuTileLayer({ layer: gpuLayer });
}
```

### 5d. Modify updateTile()

Replace chunk-rebuild path with GPU tile update:

```typescript
// Find the GPU layer for this layer index
const gpuLayer = tilemap.gpuLayers.find(l => l.layerIndex === layerIndex);
if (gpuLayer) {
    const updateResult = updateGpuTile({ layer: gpuLayer, x, z, tileId: newTileId });
    if (!updateResult.ok) return updateResult;
    // Update CPU-side mapData too
    const mutableData = [...layer.data];
    mutableData[z * mapData.width + x] = newTileId;
    const updatedLayers = mapData.layers.map((l, i) =>
        i === layerIndex ? { ...l, data: mutableData } : l
    );
    return okShallow({ ...tilemap, mapData: { ...mapData, layers: updatedLayers } });
}
```

### 5e. Modify setLayerVisibility() and setLayerOpacity()

Add GPU layer path alongside existing chunk path:

```typescript
// GPU layers
for (const gpuLayer of options.tilemap.gpuLayers) {
    if (gpuLayer.layerIndex === options.layerIndex) {
        setGpuLayerVisibility({ layer: gpuLayer, visible: options.visible });
    }
}
```

### 5f. Write integration tests

```typescript
describe('renderTilemap (GPU path)', () => {
    it('creates GPU layers instead of chunk meshes for tile layers', () => {
        const scene = setupEngine();
        const result = renderTilemap({
            scene,
            mapDataInput: makeMinimalMapData(4, 4),
            assetBasePath: '/assets/',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.gpuLayers.length).toBeGreaterThan(0);
        // Legacy chunks should be empty (no cliff geometry on flat map)
        expect(result.data.chunks.length).toBe(0);
        disposeTilemap({ tilemap: result.data });
    });

    it('GPU layer count matches visible tile layer count', () => {
        const scene = setupEngine();
        const mapData = makeMinimalMapData(4, 4);
        // makeMinimalMapData creates layers with data — check count
        const result = renderTilemap({
            scene,
            mapDataInput: mapData,
            assetBasePath: '/assets/',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const visibleTileLayers = (mapData.layers as Array<Record<string, unknown>>)
            .filter(l => l.visible !== false && (!l.kind || l.kind === 'tile'));
        expect(result.data.gpuLayers.length).toBe(visibleTileLayers.length);
        disposeTilemap({ tilemap: result.data });
    });

    it('updateTile patches GPU data texture instead of rebuilding chunk', () => {
        const scene = setupEngine();
        const result = renderTilemap({
            scene,
            mapDataInput: makeMinimalMapData(4, 4),
            assetBasePath: '/assets/',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const updateResult = updateTile({
            tilemap: result.data,
            layerIndex: 0,
            x: 1, z: 1,
            newTileId: 7,
        });
        expect(updateResult.ok).toBe(true);
        if (!updateResult.ok) return;

        // CPU-side data should be updated
        const layer = updateResult.data.mapData.layers[0];
        if (layer.kind === 'tile') {
            expect(layer.data[1 * 4 + 1]).toBe(7);
        }
        disposeTilemap({ tilemap: updateResult.data });
    });
});
```

### 5g. Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 6: Dev Harness Integration

**File:** `packages/products/webforge/runtime/dev/dev.ts`

### 6a. Update tile placement to use GPU path

The existing `updateTile()` call in the dev harness will automatically use the new GPU path since `tilemap-renderer.ts` now routes through `updateGpuTile()`. Verify tile picker and tile inspector still work.

### 6b. Update layer visibility/opacity controls

The existing layer toggle and opacity slider use `setLayerVisibility()` / `setLayerOpacity()` which now handle GPU layers. Verify they still work.

### 6c. Add GPU renderer info to Scene Info panel

Add to the Scene Info section:
- "Renderer: GPU Data Texture" or "Renderer: Legacy Chunks" label
- "GPU Layers: N" count
- "Data Textures: N × WxH" showing texture dimensions

### 6d. Update resize map function

The resize map function currently rebuilds chunks via `renderTilemap()`. Since `renderTilemap()` now uses the GPU path, this should work automatically. Verify that resizing to large maps (1000×1000, 5000×5000) is fast.

### 6e. Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 7: Update Existing Tests

Any existing tests that:
- Expect `chunks.length > 0` for flat tile layers → now expect `chunks.length === 0` and `gpuLayers.length > 0`
- Check `mapData.width` max of 500 → update to 16384
- Rely on `rebuildChunk()` for flat layers → update to GPU path

Search for affected tests and update them.

### 7a. Run full test suite

```bash
pnpm qa:test
```

Expect all ~1741+ tests to pass.

---

## Task 8: Verify Implementation Against Design Doc

Re-read `docs/plans/2026-03-02-gpu-tilemap-renderer-design.md` top-to-bottom and confirm:
- [ ] RGBA32UI data texture format matches design
- [ ] Visual flags bitfield layout matches design table
- [ ] Shader logic matches design's fragment shader
- [ ] Layer quad creation matches design (CreateGround, position at center)
- [ ] Tile editing uses texSubImage2D per design
- [ ] Cliff chunks still use legacy builder per design
- [ ] renderingGroupId = 2 per design
- [ ] Autotile resolution stays CPU-side per design
- [ ] All per-layer properties from design table are wired as uniforms

---

## Implementation Order Summary

| # | Task | Files | Est. Tests |
|---|------|-------|-----------|
| 1 | Raise MapData max dims | map-data.ts | ~5 |
| 2 | Data texture pure logic | gpu-tile-data-texture.ts | ~20 |
| 3 | Shader source strings | gpu-tile-shader.ts | ~15 |
| 4 | GPU tile renderer | gpu-tile-renderer.ts | ~15 |
| 5 | Integration | tilemap-renderer.ts | ~10 |
| 6 | Dev harness | dev.ts | manual verify |
| 7 | Update existing tests | various .test.ts | ~20 updates |
| 8 | Verify vs design doc | — | checklist |

---

## Notes

- **Lighting/Shadow Integration:** This plan uses `ShaderMaterial` (pure custom shader). Tiles will render correctly but won't participate in Babylon.js scene lighting. A follow-up task will convert to `MaterialPluginBase` (hooks into StandardMaterial) to get free lighting, shadows, and fog. This is a shader-only change — no API or schema changes needed.

- **Multi-Tileset Support:** The current implementation uses the first tileset's atlas texture. A follow-up task will pack multiple tilesets into a mega-atlas or use `RawTexture2DArray` for multi-tileset maps.

- **Ground Layer Height:** The design doc describes a subdivided quad for height-mapped ground layers. This plan uses `subdivisions: 1` (flat quad only). Height-mapped ground layer support is a follow-up task that subdivides the quad to match tile grid resolution.

- **Animation:** The `animationFrame` uniform is set to 0 initially. A follow-up task will connect it to the existing `TileAnimationManager` to advance animation frames per-tick.
