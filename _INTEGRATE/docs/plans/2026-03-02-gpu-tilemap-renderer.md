# GPU Tilemap Renderer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-03-02
**Design Doc:** `docs/plans/2026-03-02-gpu-tilemap-renderer-design.md`
**Scope:** All 3 systems — Data Texture Tile Renderer, Streaming/Virtualization, Thin-Instance Object Renderer — plus lighting integration, multi-tileset, height maps, animation, autotile, per-layer uniforms.

---

## QA Commands (run after EVERY file edit)

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

After each task's tests + implementation:
```bash
pnpm qa:test
```

---

## File Map

### New Files

```
packages/products/webforge/runtime/src/rendering/
├── gpu-tile-data-texture.ts              ← RGBA32UI data packing, texture create/update
├── gpu-tile-data-texture.test.ts
├── gpu-tile-shader.ts                    ← GLSL vertex/fragment source strings
├── gpu-tile-shader.test.ts
├── gpu-tile-renderer.ts                  ← Layer quad + material creation, editing, disposal
├── gpu-tile-renderer.test.ts
├── gpu-tile-material-plugin.ts           ← MaterialPluginBase for StandardMaterial lighting
├── gpu-tile-material-plugin.test.ts
├── tile-mega-atlas.ts                    ← Multi-tileset → single mega-atlas packing
├── tile-mega-atlas.test.ts
├── tile-streaming.ts                     ← Region manager for maps > 16384²
├── tile-streaming.test.ts
├── object-quadtree.ts                    ← Spatial index for thin-instance objects
├── object-quadtree.test.ts
├── object-instance-renderer.ts           ← Thin-instance object/prop renderer
├── object-instance-renderer.test.ts

packages/products/webforge/runtime/src/schemas/
├── streaming-config.ts                   ← StreamingConfig schema
├── streaming-config.test.ts
├── object-instance.ts                    ← ObjectInstance schema
├── object-instance.test.ts
```

### Modified Files

```
├── map-data.ts                           ← Raise max dims, remove maxValue cap for streaming
├── tilemap-renderer.ts                   ← GPU code path, streaming, object instancing
├── tilemap-renderer.test.ts              ← Integration tests for all 3 systems
├── dev/dev.ts                            ← Dev harness controls
```

---

# SYSTEM 1: Data Texture Tile Renderer

## Task 1: Raise MapData Max Dimensions

**File:** `packages/products/webforge/runtime/src/schemas/map-data.ts`

Change `width` and `height` maxValue from 500 to 16384 (WebGL2 max texture size). System 2 (streaming) will remove this cap later.

```typescript
// Before:
width: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),
height: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),

// After:
width: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16384)),
height: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16384)),
```

Update any tests that assert 500 or 501 as boundary values.

---

## Task 2: GPU Tile Data Texture — Pure Logic

**Files:** `gpu-tile-data-texture.ts` + `gpu-tile-data-texture.test.ts`

### Exports

| Function | Purpose |
|----------|---------|
| `packVisualFlags(flags: VisualFlags): Num` | Encode 10 visual flag fields → single uint32 |
| `unpackVisualFlags(packed: Num): VisualFlags` | Decode uint32 → flag fields (testing/debug) |
| `buildLayerData(opts): Result<Uint32Array>` | Pack flat tile ID array → RGBA32UI Uint32Array |
| `createGpuDataTexture(opts): BabylonResult<RawTexture>` | Upload Uint32Array → RGBA32UI GPU texture |
| `updateDataTextureTile(opts): BabylonResult<Bool>` | Patch 1 tile via `texSubImage2D` |
| `buildHeightDataTexture(opts): BabylonResult<RawTexture>` | Height map → R32UI GPU texture for vertex shader |

### VisualFlags Bitfield (G channel)

```
Bit(s)  Width  Field
0       1      flipH
1       1      flipV
2–3     2      rotation (0=0°, 1=90°, 2=180°, 3=270°)
4–7     4      opacity (0–15 → 0.0–1.0)
8       1      shadowDisable (1 = don't receive shadows)
9       1      glow
10–15   6      tintIndex (0–63 palette lookup)
16–23   8      animBase (animation start frame offset)
24–27   4      animCount (0–15 frames)
28      1      bush (lower sprite transparency)
29–31   3      reserved
```

### Key Implementation Details

- Empty tiles (ID=0): both R and G channels = 0 (no flags)
- Non-empty tiles: G channel defaults to `0xF0` (opacity=15, all else off)
- `buildLayerData` validates `tileIds.length === width * height`
- `createGpuDataTexture` uses `BABYLON.Constants.TEXTUREFORMAT_RGBA_INTEGER` + `TEXTURETYPE_UNSIGNED_INTEGER`
- `updateDataTextureTile` uses `engine._gl.texSubImage2D(GL.TEXTURE_2D, 0, x, z, 1, 1, GL.RGBA_INTEGER, GL.UNSIGNED_INT, new Uint32Array([tileId, flags, 0, 0]))`
- `buildHeightDataTexture` creates a separate `R32UI` texture from the heightMap array for vertex displacement

### Tests (~25)

- packVisualFlags: each individual flag, combined flags, round-trip via unpack
- buildLayerData: correct size, R channel = tile ID, G channel = flags, B/A = 0, empty tile handling, length mismatch error
- createGpuDataTexture: NullEngine smoke test (texture created)
- updateDataTextureTile: CPU data updated, out-of-bounds error
- buildHeightDataTexture: correct size, height values stored

---

## Task 3: GPU Tile Shader Source

**Files:** `gpu-tile-shader.ts` + `gpu-tile-shader.test.ts`

### Exports

| Constant | Purpose |
|----------|---------|
| `GPU_TILE_VERTEX_SHADER` | GLSL vertex shader source |
| `GPU_TILE_FRAGMENT_SHADER` | GLSL fragment shader source |
| `GPU_TILE_HEIGHT_VERTEX_SHADER` | GLSL vertex shader with height displacement |

### Vertex Shader

```glsl
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
uniform vec2 mapSize;
varying vec2 vWorldTilePos;

void main() {
    vWorldTilePos = uv * mapSize;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
```

### Height Vertex Shader (for ground layer with height map)

Same as above but adds:
```glsl
uniform usampler2D heightDataTexture;
uniform float tileWorldHeight;
uniform float layerYOffset;

void main() {
    vWorldTilePos = uv * mapSize;
    vec3 pos = position;
    ivec2 tc = ivec2(floor(uv * mapSize));
    if (tc.x >= 0 && tc.y >= 0 && tc.x < int(mapSize.x) && tc.y < int(mapSize.y)) {
        uint h = texelFetch(heightDataTexture, tc, 0).r;
        pos.y += float(h) * tileWorldHeight + layerYOffset;
    }
    gl_Position = worldViewProjection * vec4(pos, 1.0);
}
```

### Fragment Shader

Full GLSL from design doc §Shader Design including:
- `usampler2D tileDataTexture` — texelFetch tile data
- `sampler2D tileAtlas` — tileset atlas
- Uniforms: `mapSize`, `atlasGridSize`, `atlasTileUvSize`, `layerOpacity`, `animationFrame`
- Per-layer uniforms: `layerTint` (vec4), `layerBrightness` (float), `layerSaturation` (float), `layerContrast` (float), `layerOffset` (vec2)
- Tile coordinate computation from `vWorldTilePos`
- Bounds check + discard outside map
- Empty tile discard (tileId == 0)
- Visual flag decoding (flip H/V, rotation, opacity, animation)
- Animation frame advancement: `finalTileId = tileId + animBase + (uint(animationFrame) % animCount)`
- Atlas UV computation from tile ID + sub-tile position
- Flip/rotate applied to sub-tile UV
- Half-texel inset to prevent atlas bleeding
- Atlas sampling with NEAREST
- Alpha test (discard if `a < 0.5`)
- Per-tile opacity × layer opacity
- Layer tint multiplication
- Brightness (additive), saturation (HSL), contrast (curve)

### Tests (~20)

- Each shader is a non-empty string
- Contains expected uniforms, attributes, varyings
- Contains expected GLSL keywords (texelFetch, usampler2D, discard, flipH, flipV, rotation)
- Height vertex shader contains heightDataTexture uniform

---

## Task 4: GPU Tile Renderer — Layer Creation

**Files:** `gpu-tile-renderer.ts` + `gpu-tile-renderer.test.ts`

### GpuTileLayer Schema

```typescript
export const GpuTileLayerSchema = v.strictObject({
    mesh: v.custom<BABYLON.Mesh>(...),
    material: v.custom<BABYLON.ShaderMaterial>(...),
    dataTexture: v.custom<BABYLON.RawTexture>(...),
    layerData: v.custom<Uint32Array>(...),      // CPU-side copy for editing
    layerIndex: v.number(),
    mapWidth: v.number(),
    mapHeight: v.number(),
});
```

### Exports

| Function | Purpose |
|----------|---------|
| `createGpuTileLayer(opts)` | Mesh + ShaderMaterial + data texture → GpuTileLayer |
| `disposeGpuTileLayer(opts)` | Dispose mesh, material, data texture |
| `updateGpuTile(opts)` | Single-tile edit: CPU data + texSubImage2D |
| `updateGpuTileAutotile(opts)` | Edit tile + re-resolve 8 neighbors → up to 9 texSubImage2D |
| `setGpuLayerVisibility(opts)` | `mesh.setEnabled(visible)` |
| `setGpuLayerOpacity(opts)` | `material.setFloat('layerOpacity', opacity)` + `mesh.visibility` |
| `setGpuLayerTint(opts)` | `material.setColor4('layerTint', tint)` |
| `setGpuLayerBrightness(opts)` | `material.setFloat('layerBrightness', val)` |
| `setGpuLayerSaturation(opts)` | `material.setFloat('layerSaturation', val)` |
| `setGpuLayerContrast(opts)` | `material.setFloat('layerContrast', val)` |
| `setGpuLayerOffset(opts)` | `material.setVector2('layerOffset', vec2)` |
| `setGpuAnimationFrame(opts)` | `material.setFloat('animationFrame', frame)` per-frame tick |

### createGpuTileLayer Implementation

1. `buildLayerData()` → Uint32Array
2. `createGpuDataTexture()` → RawTexture (RGBA32UI)
3. `MeshBuilder.CreateGround(name, { width: mapWidth, height: mapHeight, subdivisions })`:
   - `subdivisions: 1` for flat layers (upper, shadow, deco)
   - `subdivisions: Math.min(mapWidth, 4096)` for ground layer with heightMap (capped at 4096)
4. `new BABYLON.ShaderMaterial(name, scene, { vertexSource, fragmentSource }, { attributes, uniforms, samplers })`
5. Set all uniforms: `mapSize`, `atlasGridSize`, `atlasTileUvSize`, `layerOpacity`, `animationFrame`, `layerTint`, `layerBrightness`, `layerSaturation`, `layerContrast`, `layerOffset`
6. Set textures: `tileDataTexture`, `tileAtlas`, optionally `heightDataTexture`
7. Position mesh at `(mapWidth/2, layerYOffset, mapHeight/2)`
8. `renderingGroupId = 2`, `backFaceCulling = false`, `receiveShadows = layer.receiveShadows`
9. `material.depthWrite = layer.depthWrite`
10. `material.alphaMode` from `layer.blendMode`

### updateGpuTileAutotile

When a tile is edited on an autotile layer:
1. Resolve the placed tile's autotile frame via existing `resolveAutotile()`
2. For each of the 8 neighbors: re-resolve their autotile frames
3. Call `updateDataTextureTile()` for each changed tile (up to 9 calls)
4. Update CPU-side `layerData` for all changed tiles

### Tests (~20)

- createGpuTileLayer: mesh name, position, renderingGroupId, CPU data stored, error on empty tileIds
- disposeGpuTileLayer: mesh removed from scene
- updateGpuTile: CPU data updated, out-of-bounds error
- setGpuLayerVisibility: mesh enabled/disabled
- setGpuLayerOpacity: mesh.visibility updated
- Per-layer uniform setters: verify no errors

---

## Task 5: Lighting Integration — MaterialPluginBase

**Files:** `gpu-tile-material-plugin.ts` + `gpu-tile-material-plugin.test.ts`

### Core Concept

Instead of pure `ShaderMaterial` (which loses all Babylon.js lighting), use `StandardMaterial` + custom `MaterialPluginBase` that overrides the diffuse color lookup. StandardMaterial's lighting, shadow, fog, glow, and post-FX pipeline all work unchanged.

### GpuTileMaterialPlugin

Extends `BABYLON.MaterialPluginBase`:

```typescript
class GpuTileMaterialPlugin extends BABYLON.MaterialPluginBase {
    // Custom uniforms
    tileDataTexture: BABYLON.RawTexture;
    mapSize: BABYLON.Vector2;
    atlasGridSize: BABYLON.Vector2;
    atlasTileUvSize: BABYLON.Vector2;
    animationFrame: number;
    layerTint: BABYLON.Color4;
    layerBrightness: number;
    layerSaturation: number;
    layerContrast: number;
    layerOffset: BABYLON.Vector2;

    getCustomCode(shaderType: string) {
        if (shaderType === 'vertex') {
            return {
                'CUSTOM_VERTEX_DEFINITIONS': `varying vec2 vWorldTilePos; uniform vec2 mapSize;`,
                'CUSTOM_VERTEX_MAIN_END': `vWorldTilePos = vMainUV1 * mapSize;`,
            };
        }
        if (shaderType === 'fragment') {
            return {
                'CUSTOM_FRAGMENT_DEFINITIONS': `
                    precision highp usampler2D;
                    uniform usampler2D tileDataTexture;
                    uniform sampler2D tileAtlas;
                    uniform vec2 mapSize;
                    uniform vec2 atlasGridSize;
                    uniform vec2 atlasTileUvSize;
                    uniform float animationFrame;
                    uniform float layerOpacity;
                    uniform vec4 layerTint;
                    uniform float layerBrightness;
                    uniform float layerSaturation;
                    uniform float layerContrast;
                    uniform vec2 layerOffset;
                    varying vec2 vWorldTilePos;
                `,
                // Override diffuse color with data texture tile lookup
                '!baseColor\\=texture2D\\(diffuseSampler\\,vDiffuseUV\\+uvOffset\\);':
                    `/* data-texture tile lookup */
                    vec2 tilePos = vWorldTilePos + layerOffset;
                    ivec2 tileCoord = ivec2(floor(tilePos));
                    if (tileCoord.x < 0 || tileCoord.y < 0 ||
                        tileCoord.x >= int(mapSize.x) || tileCoord.y >= int(mapSize.y)) discard;
                    uvec4 tileData = texelFetch(tileDataTexture, tileCoord, 0);
                    uint tileId = tileData.r;
                    uint flags = tileData.g;
                    if (tileId == 0u) discard;
                    // ... (full tile lookup logic from design doc fragment shader)
                    baseColor = tileColor;`,
            };
        }
        return null;
    }

    getSamplers(samplers: string[]) {
        samplers.push('tileDataTexture', 'tileAtlas');
    }

    getUniforms() {
        return {
            ubo: [
                { name: 'mapSize', size: 2, type: 'vec2' },
                { name: 'atlasGridSize', size: 2, type: 'vec2' },
                { name: 'atlasTileUvSize', size: 2, type: 'vec2' },
                { name: 'animationFrame', size: 1, type: 'float' },
                { name: 'layerOpacity', size: 1, type: 'float' },
                { name: 'layerTint', size: 4, type: 'vec4' },
                { name: 'layerBrightness', size: 1, type: 'float' },
                { name: 'layerSaturation', size: 1, type: 'float' },
                { name: 'layerContrast', size: 1, type: 'float' },
                { name: 'layerOffset', size: 2, type: 'vec2' },
            ],
        };
    }

    bindForSubMesh(uniformBuffer, scene, engine, subMesh) {
        // Bind all uniforms and textures
    }
}
```

### What This Gives Us For Free

- Hemispheric, directional, point, spot lights
- Shadow map receiving (per-layer `receiveShadows`)
- Scene fog
- Glow layer inclusion
- All post-FX pipeline compatibility (bloom, DoF, SSAO, etc.)
- `material.depthWrite`, `material.alphaMode` from layer config

### createGpuTileLayer Update

Replace `ShaderMaterial` creation with:
1. Create `StandardMaterial` with atlas as diffuse texture
2. Register `GpuTileMaterialPlugin` on it
3. Set all uniforms via plugin instance
4. Material keeps all StandardMaterial properties (specularColor=black, backFaceCulling=false, etc.)

### Tests (~15)

- Plugin registers without errors
- Plugin getSamplers returns expected names
- Plugin getUniforms returns expected fields
- Plugin getCustomCode returns vertex/fragment hooks
- Full integration: createGpuTileLayer with plugin produces working mesh

---

## Task 6: Multi-Tileset Mega-Atlas

**Files:** `tile-mega-atlas.ts` + `tile-mega-atlas.test.ts`

### Core Concept

Maps may reference multiple tilesets (different atlas images). The GPU shader samples from ONE texture. Solution: pack all tileset atlases into a single mega-atlas at load time.

### Exports

| Function | Purpose |
|----------|---------|
| `buildMegaAtlas(opts)` | Pack N tileset textures → 1 mega-atlas + ID remap table |
| `remapTileIds(opts)` | Translate global tile IDs to mega-atlas local IDs |

### buildMegaAtlas

1. Calculate mega-atlas dimensions: sum all tileset pixel areas, find optimal power-of-2 square
2. Create a `DynamicTexture` or canvas
3. For each tileset: draw its atlas image at the correct offset in the mega-atlas
4. Create `RawTexture` from the composite canvas
5. Return: `{ texture, gridColumns, gridRows, remapTable: Map<globalId, megaAtlasLocalId> }`

### remapTileIds

Maps each layer's global tile IDs through the remap table so the data texture stores mega-atlas-relative IDs.

### Integration

- `createGpuTileLayer` accepts either a single atlas or a mega-atlas
- When multiple tilesets exist, `renderTilemap` builds the mega-atlas first, remaps tile IDs, then creates GPU layers

### Tests (~15)

- Single tileset: mega-atlas is just the tileset itself
- Two tilesets: mega-atlas contains both, IDs remapped correctly
- ID remap preserves empty tile (0 → 0)
- Power-of-2 sizing
- Error on zero tilesets

---

## Task 7: Height Map Support

**File:** `gpu-tile-renderer.ts` (extend)

### Ground Layer with Height Data

When `mapData.heightMap` exists:
1. Create subdivided ground quad: `subdivisions: Math.min(Math.max(mapWidth, mapHeight), 4096)`
2. Build height data texture via `buildHeightDataTexture()`
3. Use `GPU_TILE_HEIGHT_VERTEX_SHADER` instead of regular vertex shader
4. Pass `heightDataTexture`, `tileWorldHeight`, `layerYOffset` uniforms

### Subdivision Limit

For maps >4096², chunk the ground quad into tiles of 4096² subdivisions:
- 16384×16384 → 4×4 = 16 ground quads (still only 16 meshes vs current ~64K)
- Each ground quad chunk gets its own data texture slice (or reads from the full texture with offset)

### Cliff Coexistence

Cliff meshes from `buildCliffChunk()` remain unchanged. They composite via depth buffer with `renderingGroupId = 2`.

### Tests (~10)

- Ground layer with heightMap uses subdivided quad
- Height vertex shader receives heightDataTexture uniform
- Flat layers (no heightMap) use subdivisions=1
- Large map chunked ground quad creates multiple meshes

---

## Task 8: Animation Integration

**File:** `gpu-tile-renderer.ts` (extend)

### Per-Frame Animation Tick

Connect `animationFrame` uniform to the existing `TileAnimationManager`:

1. In `tilemap-renderer.ts`, after creating GPU layers, register a scene `onBeforeRenderObservable` callback
2. Each frame: `material.setFloat('animationFrame', animator.currentFrame)` on each GPU layer
3. The fragment shader advances animated tiles: `finalTileId = tileId + animBase + (uint(animationFrame) % animCount)`

### Autotile Animation

For `animated_terrain` type tilesets:
- At map load, store `animBase` and `animCount` in the G channel flags for each animated tile
- The shader handles frame cycling via the `animationFrame` uniform

### Tests (~8)

- Animation frame uniform updates per tick
- Animated tile flags packed correctly in data texture
- Non-animated tiles unaffected (animCount = 0)

---

## Task 9: Autotile Resolution for GPU Path

**File:** `gpu-tile-renderer.ts` (extend)

### Map Load

At map load time, resolve ALL autotile frames CPU-side using existing `resolveAutotile()` before packing into the data texture. The data texture stores **resolved** tile IDs, not raw autotile base IDs.

### Tile Edit

`updateGpuTileAutotile()`:
1. Place tile → resolve its autotile frame via `resolveAutotile()`
2. For each of 8 neighbors: re-resolve their frames (neighbor relationships may change)
3. Update up to 9 data texture pixels via `texSubImage2D`

### Tests (~10)

- Autotile tiles in data texture have resolved IDs
- Placing an autotile tile updates neighbors
- Non-autotile tiles bypass resolution

---

## Task 10: Integration into tilemap-renderer.ts

**Files:** `tilemap-renderer.ts` + `tilemap-renderer.test.ts`

### RenderedTilemapSchema Changes

Add:
```typescript
gpuLayers: v.custom<GpuTileLayer[]>(...),
megaAtlas: v.nullable(v.custom<MegaAtlas>(...)),
streamingManager: v.nullable(v.custom<StreamingManager>(...)),
objectRenderer: v.nullable(v.custom<ObjectInstanceRenderer>(...)),
```

### renderTilemap() Changes

Replace chunk-building loop with:

```
1. Build mega-atlas if multiple tilesets
2. For each tile layer:
   a. If map fits in single texture (≤16384²): createGpuTileLayer()
   b. Else: create streaming manager (System 2)
3. Cliff chunks: still use buildCliffChunk() (unchanged)
4. For object layers: create object instance renderer (System 3)
5. Register animation tick callback
6. Ground fill plane: still created (unchanged)
```

### updateTile() Changes

```
1. Find GPU layer for this layerIndex
2. If autotile: updateGpuTileAutotile() (resolves neighbors)
3. Else: updateGpuTile() (single pixel update)
4. Update CPU-side mapData
5. Return updated tilemap
```

### disposeTilemap() Changes

Add disposal for: GPU layers, mega-atlas, streaming manager, object renderer.

### setLayerVisibility() / setLayerOpacity() Changes

Route to GPU layer functions alongside existing chunk path (backward compat for cliff chunks).

### Tests (~15)

- GPU layers created for flat tile layers (chunks.length = 0)
- GPU layer count matches visible tile layer count
- updateTile patches data texture (not chunk rebuild)
- setLayerVisibility toggles GPU layer mesh
- setLayerOpacity updates uniform
- Cliff chunks still created when heightMap exists
- Dispose cleans up GPU layers + mega-atlas

---

## Task 11: Dev Harness — System 1

**File:** `dev/dev.ts`

### Changes

- Tile picker + tile inspector work through GPU `updateTile()` path
- Layer visibility/opacity controls route through GPU layer functions
- Per-layer uniform controls: tint, brightness, saturation, contrast, offset → wire to `setGpuLayerTint()` etc.
- Scene Info panel additions:
  - "Renderer: GPU Data Texture" label
  - "GPU Layers: N" count
  - "Data Textures: N × W×H" dimensions
  - "Draw Calls: N" (from `scene.getEngine().drawCallsPerfCounter.current`)
  - "VRAM (est): N MB"
- Map resize: verify 1000×1000, 5000×5000, 16384×16384 work fast

---

# SYSTEM 2: Streaming/Virtualization

## Task 12: StreamingConfig Schema

**Files:** `streaming-config.ts` + `streaming-config.test.ts`

```typescript
export const StreamingConfigSchema = v.pipe(
    v.strictObject({
        /** Region size in tiles (2048 or 4096). */
        regionSize: v.optional(v.picklist([2048, 4096]), 2048),
        /** Max loaded regions before LRU eviction. */
        maxLoadedRegions: v.optional(v.pipe(v.number(), v.integer(), v.minValue(4), v.maxValue(64)), 16),
        /** Regions beyond viewport to preload. */
        loadRadius: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(4)), 1),
        /** Regions beyond this distance get evicted. */
        unloadDistance: v.optional(v.pipe(v.number(), v.integer(), v.minValue(2), v.maxValue(8)), 3),
    }),
    v.readonly(),
);
export type StreamingConfig = v.InferOutput<typeof StreamingConfigSchema>;
```

### Tests (~8)

- Default values accepted
- Region size must be 2048 or 4096
- All fields within ranges
- Invalid values rejected

---

## Task 13: Region Manager — tile-streaming.ts

**Files:** `tile-streaming.ts` + `tile-streaming.test.ts`

### Exports

| Function/Type | Purpose |
|---------------|---------|
| `StreamingManager` | Manager object with loaded regions, LRU list, config |
| `createStreamingManager(opts)` | Initialize with map data + config |
| `updateStreamingViewport(opts)` | Camera moved → load/unload regions |
| `disposeStreamingManager(opts)` | Cleanup all regions |
| `StreamingRegion` | Schema: mesh, dataTexture, regionX, regionZ, lastAccessFrame |

### Region Lifecycle

```
updateStreamingViewport(camera, streamingManager):
  1. Compute camera viewport in tiles (AABB for ortho, frustum for perspective)
  2. Determine which region grid cells overlap viewport + loadRadius buffer
  3. For each needed region NOT yet loaded:
     a. Allocate Uint32Array for region (regionSize × regionSize × 4)
     b. Copy tile data from CPU-side map arrays into region array
     c. Resolve autotile edges at region boundaries (1-tile overlap)
     d. Create RawTexture (RGBA32UI or RGBA16UI)
     e. Create ground quad mesh positioned at region world offset
     f. Attach ShaderMaterial with GpuTileMaterialPlugin
     g. Add to loaded regions list
  4. For each loaded region BEYOND unloadDistance:
     a. Dispose texture + mesh
     b. Remove from loaded list (LRU eviction)
  5. Touch accessed regions (update lastAccessFrame for LRU)
```

### Async Region Upload

Large regions (4096²) can hitch when uploading in one frame. Upload rows incrementally:

```typescript
async function uploadRegionAsync(region, data, engine) {
    const ROWS_PER_FRAME = 256;
    for (let row = 0; row < regionSize; row += ROWS_PER_FRAME) {
        const endRow = Math.min(row + ROWS_PER_FRAME, regionSize);
        const slice = data.subarray(row * regionSize * 4, endRow * regionSize * 4);
        engine._gl.texSubImage2D(
            GL.TEXTURE_2D, 0,
            0, row, regionSize, endRow - row,
            GL.RGBA_INTEGER, GL.UNSIGNED_INT, slice
        );
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
}
```

### Seamless Boundaries

Adjacent regions share 1-tile overlap for autotile resolution. When resolving autotile for edge tiles of region A, read neighbor data from region B's CPU-side data (not GPU texture).

### Memory Budget

With 2048² regions, 8 bytes/tile (RGBA16UI):
- 1 region = 32 MB per layer
- 9 visible regions × 4 layers = ~1.2 GB VRAM
- LRU eviction keeps total under `maxLoadedRegions × layers × 32 MB`

### Tests (~20)

- Region grid calculation from camera viewport
- Region load: correct position, correct data slice
- Region unload: beyond unloadDistance
- LRU eviction: oldest regions evicted when max exceeded
- Seamless boundary: autotile at region edge resolved correctly
- Async upload: no frame hitch (mock RAF)
- Dispose: all regions cleaned up

---

## Task 14: Raise MapData Max to Unlimited

**File:** `map-data.ts`

With streaming support, remove the maxValue cap entirely (or raise to a very large number):

```typescript
// With streaming:
width: v.pipe(v.number(), v.integer(), v.minValue(1)),
height: v.pipe(v.number(), v.integer(), v.minValue(1)),
```

`renderTilemap()` decides at runtime: if `w × h ≤ 16384²`, use System 1. Otherwise, use System 2 streaming.

### Tests (~5)

- Maps larger than 16384 accepted by schema
- renderTilemap routes to streaming for 50000×50000

---

## Task 15: Integration — Streaming in tilemap-renderer.ts

**File:** `tilemap-renderer.ts`

### renderTilemap() — Streaming Path

```typescript
const needsStreaming = mapData.width > 16384 || mapData.height > 16384;

if (needsStreaming) {
    const streamResult = createStreamingManager({
        scene, mapData, tilesets, megaAtlas,
        config: mapData.streaming ?? {},
    });
    if (!streamResult.ok) return streamResult;
    streamingManager = streamResult.data;
} else {
    // System 1: single data texture per layer
    for (const layer ...) { createGpuTileLayer(...); }
}
```

Register `scene.onBeforeRenderObservable` to call `updateStreamingViewport()` each frame.

### updateTile() — Streaming Path

Find which region contains (x, z). If region is loaded, patch its data texture. Always update CPU-side map data.

### Tests (~10)

- Large map triggers streaming path
- Small map uses direct GPU layers
- Tile edit in loaded region patches texture
- Tile edit in unloaded region only updates CPU data

---

## Task 16: Dev Harness — Streaming Controls

**File:** `dev/dev.ts`

### New Controls

- Streaming section in Scene Info:
  - "Regions: N loaded / M total"
  - "Region Size: 2048" (read-only)
  - "VRAM Budget: ~X MB"
  - Visual: region grid overlay on map (optional)
- Preset sizes beyond 16384 in dropdown (20000, 50000)

---

# SYSTEM 3: Thin-Instance Object Renderer

## Task 17: ObjectInstance Schema

**Files:** `object-instance.ts` + `object-instance.test.ts`

```typescript
export const ObjectInstanceSchema = v.pipe(
    v.strictObject({
        /** Unique instance ID. */
        id: v.pipe(v.string(), v.nonEmpty()),
        /** Base mesh type identifier (e.g., 'torch', 'tree-oak'). */
        meshType: v.pipe(v.string(), v.nonEmpty()),
        /** World position [x, y, z]. */
        position: v.strictTuple([v.number(), v.number(), v.number()]),
        /** Euler rotation [x, y, z] in radians. */
        rotation: v.optional(v.strictTuple([v.number(), v.number(), v.number()]), (): [number, number, number] => [0, 0, 0]),
        /** Scale [x, y, z]. */
        scale: v.optional(v.strictTuple([v.number(), v.number(), v.number()]), (): [number, number, number] => [1, 1, 1]),
        /** Per-instance tint color [r, g, b, a]. */
        tintColor: v.optional(v.strictTuple([v.number(), v.number(), v.number(), v.number()]), (): [number, number, number, number] => [1, 1, 1, 1]),
        /** Whether this instance is visible. */
        visible: v.optional(v.boolean(), true),
        /** Event script ID. */
        eventId: v.optional(v.string(), ''),
        /** Script hook identifier. */
        scriptHook: v.optional(v.string(), ''),
        /** Custom game logic properties. */
        properties: v.optional(v.record(v.string(), v.union([v.string(), v.number(), v.boolean()])), {}),
    }),
    v.readonly(),
);
export type ObjectInstance = v.InferOutput<typeof ObjectInstanceSchema>;
```

### Tests (~10)

- Default values accepted
- Position required
- meshType required and non-empty
- Optional fields have correct defaults

---

## Task 18: Quadtree Spatial Index

**Files:** `object-quadtree.ts` + `object-quadtree.test.ts`

### Exports

| Function/Type | Purpose |
|---------------|---------|
| `Quadtree<T>` | Generic quadtree with insert, remove, query |
| `createQuadtree(opts)` | Initialize with bounds and max depth |
| `insertItem(tree, item, bounds)` | Add item to spatial index |
| `removeItem(tree, itemId)` | Remove by ID |
| `queryRect(tree, rect)` | Get all items overlapping AABB |
| `queryFrustum(tree, planes)` | Get all items in camera frustum |

### Implementation

Recursive quadtree with configurable max depth (default 8) and max items per node (default 32). When a node exceeds max items, it subdivides into 4 children.

### queryFrustum

For orthographic cameras: convert ortho bounds to AABB → `queryRect`.
For perspective cameras: extract 6 frustum planes → test each quadtree node's AABB against planes.

### Tests (~20)

- Insert/remove items
- Query rect returns correct items
- Query empty rect returns nothing
- Items at boundaries
- Large dataset (100K items) query performance < 1ms
- Quadtree subdivision happens at max items
- Remove from subdivided tree
- Query frustum (ortho → rect conversion)

---

## Task 19: Thin-Instance Object Renderer

**Files:** `object-instance-renderer.ts` + `object-instance-renderer.test.ts`

### Exports

| Function/Type | Purpose |
|---------------|---------|
| `ObjectInstanceRenderer` | Manager schema: base meshes, quadtree, instance buffers |
| `createObjectRenderer(opts)` | Initialize from object layer data |
| `disposeObjectRenderer(opts)` | Cleanup all meshes + buffers |
| `addObjectInstance(opts)` | Add new object at runtime |
| `removeObjectInstance(opts)` | Remove object by ID |
| `moveObjectInstance(opts)` | Update position → quadtree + matrix buffer |
| `updateVisibleInstances(opts)` | Per-frame: frustum cull → rebuild instance buffers |
| `getObjectsInRect(opts)` | Query objects by world AABB |

### Architecture

```
ObjectInstanceRenderer:
  baseMeshes: Map<meshType, BABYLON.Mesh>    // 1 base mesh per unique type
  quadtree: Quadtree<ObjectInstance>          // spatial index for all objects
  instanceBuffers: Map<meshType, Float32Array> // 4x4 transform matrices
  dirtyMeshTypes: Set<string>                // types needing buffer rebuild
```

### Per-Frame Update (updateVisibleInstances)

1. Compute camera frustum/AABB
2. `queryRect(quadtree, cameraBounds)` → visible objects
3. Group visible objects by `meshType`
4. For each mesh type with visible instances:
   a. Build `Float32Array` of 4×4 transform matrices from position/rotation/scale
   b. `baseMesh.thinInstanceSetBuffer('matrix', matrices, 16)`
5. For mesh types with 0 visible instances: `baseMesh.thinInstanceCount = 0`

### Shadow Casting

```typescript
for (const [type, baseMesh] of baseMeshes) {
    shadowGenerator.addShadowCaster(baseMesh, true);
}
```

Thin instances inherit shadow casting from base mesh. Single shadow pass draw call per type.

### LOD

```typescript
baseMesh.addLODLevel(50, simplifiedMesh);   // Simplified at 50 units
baseMesh.addLODLevel(200, null);            // Culled at 200 units
```

Thin instances inherit LOD from base mesh.

### Editing

- `addObjectInstance()`: insert into quadtree + mark meshType dirty
- `removeObjectInstance()`: remove from quadtree + mark meshType dirty
- `moveObjectInstance()`: update quadtree position + mark meshType dirty
- Dirty mesh types get their instance buffer rebuilt next frame in `updateVisibleInstances()`

### Tests (~25)

- createObjectRenderer: base meshes created for each unique type
- addObjectInstance: quadtree contains item, dirty flag set
- removeObjectInstance: quadtree doesn't contain item
- moveObjectInstance: position updated in quadtree
- updateVisibleInstances: instance count matches visible objects
- updateVisibleInstances: transform matrix correct for position/rotation/scale
- Shadow caster registration
- LOD levels set on base mesh
- getObjectsInRect: returns correct objects
- Dispose: all meshes + buffers cleaned up
- Large dataset (10K objects): updateVisibleInstances < 2ms

---

## Task 20: Integration — Objects in tilemap-renderer.ts

**File:** `tilemap-renderer.ts`

### renderTilemap() — Object Path

```typescript
// For object layers:
let objectRenderer: ObjectInstanceRenderer | null = null;
const allObjects: ObjectInstance[] = [];

for (const layer of mapData.layers) {
    if (layer.kind === 'object') {
        for (const obj of layer.objects) {
            allObjects.push(convertMapObjectToInstance(obj));
        }
    }
}

if (allObjects.length > 0) {
    const objResult = createObjectRenderer({
        scene,
        instances: allObjects,
        assetBasePath,
    });
    if (objResult.ok) objectRenderer = objResult.data;
}
```

Register `scene.onBeforeRenderObservable` to call `updateVisibleInstances()` each frame.

### Tests (~8)

- Object layers create object renderer
- No object layers → objectRenderer is null
- Dispose cleans up object renderer

---

## Task 21: Dev Harness — Object Controls

**File:** `dev/dev.ts`

### New Controls

- Object section in Scene Info:
  - "Objects: N total / M visible"
  - "Mesh Types: N unique"
  - "Instance Draw Calls: N"
- Click-to-inspect objects (show properties in sidebar)
- Object placement tool (basic: click to place, right-click to remove)

---

# CROSS-CUTTING

## Task 22: Update Existing Tests

Search for tests that:
- Expect `chunks.length > 0` for flat tile layers → now `chunks.length === 0`, `gpuLayers.length > 0`
- Assert `mapData.width` max of 500 → update to 16384 (or uncapped)
- Rely on `rebuildChunk()` for flat layers → update to GPU path
- Check `RenderedTilemap` shape → add `gpuLayers`, `megaAtlas`, `streamingManager`, `objectRenderer` fields

### Run full test suite

```bash
pnpm qa:test
```

All ~1741+ existing tests must pass + new tests from all tasks above.

---

## Task 23: Verify Implementation Against Design Doc

Re-read `docs/plans/2026-03-02-gpu-tilemap-renderer-design.md` top-to-bottom and confirm:

### System 1 Checklist
- [ ] RGBA32UI data texture format (R=tileId, G=flags, B/A=reserved)
- [ ] Visual flags bitfield layout matches design table (10 fields, 32 bits)
- [ ] Fragment shader: texelFetch, atlas lookup, flip/rotate, alpha test, opacity
- [ ] Vertex shader: `vWorldTilePos = uv * mapSize`
- [ ] Height vertex shader: texelFetch height, displacement
- [ ] Layer quad: CreateGround, position at center, renderingGroupId=2
- [ ] Tile editing: texSubImage2D, ~0.01ms per edit
- [ ] Autotile: CPU-side resolution, resolved IDs in data texture, 9-tile update on edit
- [ ] Cliff chunks: legacy builder preserved, coexists via depth buffer
- [ ] Lighting: MaterialPluginBase overrides diffuse lookup, preserves all lighting/shadow/fog
- [ ] Multi-tileset: mega-atlas packing, ID remapping
- [ ] Animation: animationFrame uniform, per-tile animBase + animCount flags
- [ ] Per-layer uniforms: opacity, tint, brightness, saturation, contrast, offset, parallax, receiveShadows, depthWrite, blendMode, renderOrder

### System 2 Checklist
- [ ] StreamingConfig schema: regionSize, maxLoadedRegions, loadRadius, unloadDistance
- [ ] Region manager: viewport → region overlap, load/unload lifecycle
- [ ] LRU eviction when max regions exceeded
- [ ] Async region upload (RAF-batched rows)
- [ ] Seamless boundary autotile at region edges (1-tile overlap)
- [ ] Memory budget: 2048² regions × 8 bytes = 32 MB/layer/region
- [ ] Draw calls: visibleRegions × layers (~36 DC for 50000²)

### System 3 Checklist
- [ ] ObjectInstance schema: id, meshType, position, rotation, scale, tintColor, visible, eventId, scriptHook, properties
- [ ] Quadtree spatial index: insert, remove, queryRect, queryFrustum
- [ ] Thin-instance renderer: 1 draw call per unique mesh type
- [ ] Per-frame frustum culling via quadtree → instance buffer rebuild
- [ ] Shadow casting: `shadowGenerator.addShadowCaster(baseMesh, true)`
- [ ] LOD levels: `baseMesh.addLODLevel(distance, mesh/null)`
- [ ] Editing: add/remove/move → quadtree update + dirty flag → buffer rebuild

### Performance Targets
- [ ] 300×300, 4 layers: 4 draw calls
- [ ] 1000×1000, 4 layers: 4 draw calls
- [ ] 16384×16384, 4 layers: 4 draw calls
- [ ] 50000×50000, 4 layers: ~36 draw calls (streaming)
- [ ] 10K props: 1 draw call per unique type
- [ ] 100K props, 50 types: 50 draw calls

### Compatibility
- [ ] All post-FX unchanged
- [ ] All lighting unchanged
- [ ] Camera system unchanged
- [ ] Editor UI unchanged
- [ ] All existing schemas preserved
- [ ] All existing tests pass

---

## Implementation Order Summary

| # | Task | System | New Files | Tests |
|---|------|--------|-----------|-------|
| 1 | MapData max dims | S1 | — | ~5 |
| 2 | Data texture logic | S1 | gpu-tile-data-texture | ~25 |
| 3 | Shader source | S1 | gpu-tile-shader | ~20 |
| 4 | GPU tile renderer | S1 | gpu-tile-renderer | ~20 |
| 5 | MaterialPlugin lighting | S1 | gpu-tile-material-plugin | ~15 |
| 6 | Multi-tileset mega-atlas | S1 | tile-mega-atlas | ~15 |
| 7 | Height map support | S1 | (extend gpu-tile-renderer) | ~10 |
| 8 | Animation integration | S1 | (extend gpu-tile-renderer) | ~8 |
| 9 | Autotile for GPU path | S1 | (extend gpu-tile-renderer) | ~10 |
| 10 | tilemap-renderer integration | S1 | — | ~15 |
| 11 | Dev harness — System 1 | S1 | — | manual |
| 12 | StreamingConfig schema | S2 | streaming-config | ~8 |
| 13 | Region manager | S2 | tile-streaming | ~20 |
| 14 | Raise max to unlimited | S2 | — | ~5 |
| 15 | Streaming integration | S2 | — | ~10 |
| 16 | Dev harness — Streaming | S2 | — | manual |
| 17 | ObjectInstance schema | S3 | object-instance | ~10 |
| 18 | Quadtree spatial index | S3 | object-quadtree | ~20 |
| 19 | Thin-instance renderer | S3 | object-instance-renderer | ~25 |
| 20 | Object integration | S3 | — | ~8 |
| 21 | Dev harness — Objects | S3 | — | manual |
| 22 | Update existing tests | — | — | ~20 |
| 23 | Verify vs design doc | — | — | checklist |

**Total: 23 tasks, ~270 new tests, 10 new files**
