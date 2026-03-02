# GPU Tilemap Renderer Design

**Date:** 2026-03-02
**Status:** Draft
**Scope:** Replace chunk-based mesh rendering with GPU data texture shader for flat tile layers, add streaming for maps >16384², add thin-instance object/prop system.

---

## Current State

The tilemap renderer (`tilemap-renderer.ts` + `chunk-builder.ts`) builds per-tile quad geometry CPU-side, merges into one mesh per chunk (16×16 tiles), and uses `StandardMaterial` with NEAREST-sampled tileset atlas textures. Each chunk = 1 draw call.

### Current Rendering Pipeline

```
Map Data (JS arrays)
  → for each layer:
      → for each 16×16 chunk region:
          → for each tile in chunk:
              → createFlatTileGeometry() → 4 verts, 6 indices, UV from atlas
          → mergeTileVertexData() → 1 merged VertexData
          → applyToMesh() → 1 Babylon.js Mesh + StandardMaterial
  → Result: (chunksX × chunksZ × visibleLayers) draw calls
```

### Performance at Scale

| Map Size | Chunks/Layer | Total Meshes (4 layers) | Draw Calls | Status |
|----------|-------------|------------------------|------------|--------|
| 300×300 | 361 | 1,444 | ~600 | OK |
| 500×500 | 1,024 | 4,096 | ~2,000 | Slow |
| 1000×1000 | 3,969 | 15,876 | ~8,000 | Broken |
| 5000×5000 | 97,969 | 391,876 | ~196,000 | Impossible |

**Bottlenecks:**
1. **Draw calls** — WebGL2 handles ~1,000–2,000 draw calls at 60fps
2. **Active mesh evaluation** — Babylon.js tests every mesh against frustum every frame. At 15,876 meshes → ~10ms CPU overhead before any rendering
3. **CPU array construction** — `Array.from({ length: N }).fill()` + `mergeTileVertexData()` for millions of tiles takes seconds at init
4. **VRAM** — Each tile = 4 vertices × (3 pos + 3 norm + 2 UV) = 32 floats. 1M tiles = 128MB vertex data per layer

---

## Design

### Architecture Overview

Three independent systems that can be built and shipped incrementally:

```
System 1: Data Texture Tile Renderer     (flat tile layers → 1 draw call/layer)
System 2: Streaming/Virtualization        (maps > 16384² → chunked data textures)
System 3: Thin-Instance Object Renderer   (props/events → 1 draw call/mesh type)
```

All three systems are additive — they don't break existing functionality. The current chunk-builder is kept for cliff/wall geometry (non-flat, irregular meshes that can't be GPU-tiled).

---

### System 1: Data Texture Tile Renderer

#### Core Concept

Instead of building thousands of meshes with baked vertex UVs, render each tile layer as **one screen-covering quad** with a custom shader that:

1. Computes which tile the current fragment falls on (from world position)
2. Fetches the tile ID from a **data texture** (the map data uploaded to GPU)
3. Fetches per-tile visual flags from the data texture
4. Samples the correct tile pixel from the **tileset atlas texture**

**Result: 1 draw call per layer, regardless of map size.**

#### Data Texture Format

Each layer gets one `RGBA32UI` data texture (4 × 32 = 128 bits per tile):

```
Channel   Bits   Purpose
───────   ────   ──────────────────────────────────────────────
R         32     Tile ID (0–4,294,967,295 unique tiles)
G         32     Visual flags bitfield (see table below)
B         32     Reserved / Extended flags
A         32     Reserved / User-defined per-tile data
```

**Visual Flags (G channel, 32 bits):**

```
Bit(s)   Width   Flag
──────   ─────   ───────────────────────────────
0        1       Flip horizontal
1        1       Flip vertical
2–3      2       Rotation (0°/90°/180°/270°)
4–7      4       Per-tile opacity (0–15 → 0.0–1.0)
8        1       Shadow receive override (1 = disable)
9        1       Glow flag
10–15    6       Tint palette index (0–63)
16–23    8       Animation base frame (0–255)
24–27    4       Animation frame count (0–15)
28       1       Bush transparency flag
29–31    3       Reserved
```

**CPU-side game logic flags** (passability, terrain, damage, collision, etc.) remain in the existing `TilePropertiesSchema` JS objects — NOT in the GPU texture. Only flags that affect rendering go to the GPU.

**Created via:**

```typescript
const data = new Uint32Array(mapWidth * mapHeight * 4); // RGBA per tile
// Fill: data[i*4+0] = tileId, data[i*4+1] = visualFlags, ...
const texture = new BABYLON.RawTexture(
    data, mapWidth, mapHeight,
    BABYLON.Constants.TEXTUREFORMAT_RGBA_INTEGER,
    scene, false, false,
    BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    BABYLON.Constants.TEXTURETYPE_UNSIGNED_INTEGER
);
```

#### Layer Quad Geometry

Each layer is rendered as a single ground plane mesh sized to the map:

```typescript
const layerQuad = BABYLON.MeshBuilder.CreateGround(
    `layer-${layerIndex}`,
    { width: mapWidth, height: mapHeight, subdivisions: 1 },
    scene
);
layerQuad.position.x = mapWidth / 2;
layerQuad.position.z = mapHeight / 2;
layerQuad.position.y = LAYER_Y_OFFSETS[layer.type];
layerQuad.renderingGroupId = 2;
layerQuad.receiveShadows = layer.receiveShadows;
```

#### Shader Design

Using `BABYLON.ShaderMaterial` (or `CustomMaterial` if we need built-in lighting for free):

**Vertex Shader:**

```glsl
// Standard Babylon.js vertex transform
attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform vec2 mapSize;          // (mapWidth, mapHeight) in tiles

varying vec2 vWorldTilePos;    // position in tile-space

void main() {
    // UV goes 0→1 across the quad; scale to tile coordinates
    vWorldTilePos = uv * mapSize;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
```

**Fragment Shader:**

```glsl
precision highp float;
precision highp usampler2D;

uniform usampler2D tileDataTexture;   // RGBA32UI — tile IDs + flags
uniform sampler2D tileAtlas;          // Tileset atlas (NEAREST sampled)
uniform vec2 mapSize;                 // Map dimensions in tiles
uniform vec2 atlasGridSize;           // Atlas dimensions in tiles (cols, rows)
uniform vec2 atlasTileUvSize;         // Size of one tile in atlas UV space
uniform float layerOpacity;           // Per-layer opacity uniform
uniform float animationFrame;         // Global animation tick

varying vec2 vWorldTilePos;

void main() {
    // 1. Which tile are we on?
    ivec2 tileCoord = ivec2(floor(vWorldTilePos));

    // Bounds check — discard fragments outside the map
    if (tileCoord.x < 0 || tileCoord.y < 0 ||
        tileCoord.x >= int(mapSize.x) || tileCoord.y >= int(mapSize.y)) {
        discard;
    }

    // 2. Fetch tile data from data texture (no interpolation)
    uvec4 tileData = texelFetch(tileDataTexture, tileCoord, 0);
    uint tileId = tileData.r;
    uint flags = tileData.g;

    // Empty tile
    if (tileId == 0u) discard;

    // 3. Decode visual flags
    bool flipH = (flags & 1u) != 0u;
    bool flipV = (flags & 2u) != 0u;
    uint rotation = (flags >> 2u) & 3u;
    float tileOpacity = float((flags >> 4u) & 15u) / 15.0;
    uint animBase = (flags >> 16u) & 255u;
    uint animCount = (flags >> 24u) & 15u;

    // 4. Handle animation
    uint finalTileId = tileId;
    if (animCount > 0u) {
        uint frame = uint(animationFrame) % animCount;
        finalTileId = tileId + animBase + frame;
    }

    // 5. Convert tile ID → atlas UV
    uint atlasCol = finalTileId % uint(atlasGridSize.x);
    uint atlasRow = finalTileId / uint(atlasGridSize.x);

    // 6. Sub-tile UV (position within the tile, 0→1)
    vec2 subTileUV = fract(vWorldTilePos);

    // Apply flip/rotation to sub-tile UV
    if (flipH) subTileUV.x = 1.0 - subTileUV.x;
    if (flipV) subTileUV.y = 1.0 - subTileUV.y;
    // Rotation: 1=90°, 2=180°, 3=270°
    if (rotation == 1u) subTileUV = vec2(1.0 - subTileUV.y, subTileUV.x);
    else if (rotation == 2u) subTileUV = vec2(1.0 - subTileUV.x, 1.0 - subTileUV.y);
    else if (rotation == 3u) subTileUV = vec2(subTileUV.y, 1.0 - subTileUV.x);

    // 7. Half-texel inset to prevent atlas bleeding
    vec2 halfTexel = 0.5 / vec2(textureSize(tileAtlas, 0));
    vec2 tileOrigin = vec2(float(atlasCol), float(atlasRow)) * atlasTileUvSize;
    vec2 atlasUV = tileOrigin + subTileUV * (atlasTileUvSize - 2.0 * halfTexel) + halfTexel;

    // 8. Sample atlas
    vec4 color = texture(tileAtlas, atlasUV);

    // Alpha test (same as current StandardMaterial behavior)
    if (color.a < 0.5) discard;

    // Apply per-tile opacity and layer opacity
    color.a *= tileOpacity * layerOpacity;

    gl_FragColor = color;
}
```

**Note on lighting integration:** The above is a pure `ShaderMaterial`. For full Babylon.js lighting/shadow support, we use `BABYLON.CustomMaterial` (extends `StandardMaterial`) with `Fragment_Custom_Diffuse` hook to override the diffuse color lookup while keeping all lighting, shadow, and fog computations from `StandardMaterial`. This gives us:
- All scene lights (hemispheric, directional, point, spot)
- Shadow maps (receive shadows per-layer)
- Scene fog
- Glow layer inclusion
- All post-FX pipeline compatibility

The `CustomMaterial` approach:

```typescript
const mat = new BABYLON.CustomMaterial(`layer-${idx}-mat`, scene);
mat.diffuseTexture = atlasTexture; // For Babylon internals
mat.AddUniform('tileDataTexture', 'sampler2D');
mat.AddUniform('mapSize', 'vec2');
mat.AddUniform('atlasGridSize', 'vec2');
mat.AddUniform('atlasTileUvSize', 'vec2');
mat.AddUniform('animationFrame', 'float');
mat.Fragment_Custom_Diffuse(`
    // Override diffuseColor with data-texture tile lookup
    // (same logic as fragment shader above, writing to baseColor)
`);
```

#### Tile Editing

Editing a single tile becomes:

```typescript
function setTile(layer: number, x: number, z: number, tileId: number, flags: number): void {
    const offset = (z * mapWidth + x) * 4;
    layerData[layer][offset + 0] = tileId;
    layerData[layer][offset + 1] = flags;
    // Update 1 pixel in the GPU texture
    const engine = scene.getEngine();
    engine._gl.texSubImage2D(
        engine._gl.TEXTURE_2D, 0,
        x, z, 1, 1,
        engine._gl.RGBA_INTEGER, engine._gl.UNSIGNED_INT,
        new Uint32Array([tileId, flags, 0, 0])
    );
}
```

**Cost:** ~0.01ms per tile edit (vs ~2ms for current chunk rebuild).

#### Autotile Resolution

Autotile neighbor rules are resolved **CPU-side at map load and on edit**. The data texture stores the **resolved** tile ID (the specific autotile frame after neighbor analysis), not the raw autotile base ID.

When a tile is edited:
1. Resolve the placed tile's autotile frame based on neighbors
2. Re-resolve the 8 neighbor tiles (their frames may change)
3. Update up to 9 pixels in the data texture via `texSubImage2D`

This is the same autotile logic that currently runs in `chunk-builder.ts` → `resolveAutotile()`, just triggered per-edit instead of per-chunk-build.

#### Height Map

For tiles at different height levels, the vertex shader reads from a separate height data texture:

```glsl
uniform usampler2D heightDataTexture;

// In vertex shader, after computing tileCoord:
uint heightLevel = texelFetch(heightDataTexture, tileCoord, 0).r;
position.y += float(heightLevel) * tileWorldHeight + layerYOffset;
```

However, this only works with subdivided geometry (the single quad needs enough vertices to deform per-tile). For height-mapped layers, we subdivide the quad to match tile grid resolution:

```typescript
BABYLON.MeshBuilder.CreateGround('layer-0', {
    width: mapWidth, height: mapHeight,
    subdivisions: Math.max(mapWidth, mapHeight), // 1 vertex per tile
}, scene);
```

**Trade-off:** A 5000×5000 map would need 25M vertices for the subdivided quad. This is acceptable for the ground layer (which typically uses height) but wasteful for flat upper layers. Solution: only the ground layer uses a subdivided quad; flat layers use `subdivisions: 1`.

For extremely large maps (>4096²), the subdivided ground quad can be chunked (see System 2).

#### Cliff/Wall Geometry

Cliff faces (vertical walls at height transitions) remain as current chunk-builder meshes. They are irregular geometry that cannot be represented by a flat data texture lookup. The cliff builder already works well at scale because cliffs are sparse (only at height transitions, not every tile).

**Coexistence:** The scene contains both data-texture layer quads and cliff chunk meshes, each with `renderingGroupId = 2`. They composite correctly via depth buffer.

---

### System 2: Streaming/Virtualization

#### When Needed

System 1 alone handles maps up to **16384×16384** (WebGL2 max texture size). Beyond that, or when VRAM is limited, streaming chunks data textures on demand.

#### Chunked Data Textures

The map is divided into **texture regions** (e.g., 4096×4096 tiles each):

```
50000×50000 map:
  = ceil(50000/4096) = 13 regions per axis
  = 13×13 = 169 region slots
  = Each region: 4096×4096 × 16 bytes (RGBA32UI) = 256 MB per layer
  = Only ~9 regions visible at any time (3×3 around camera)
  = Loaded VRAM: 9 regions × 4 layers × 256 MB = ~9 GB (too much)
```

To reduce VRAM, use `RGBA16UI` (8 bytes per tile) for streaming regions:

```
Streaming region: 4096×4096 × 8 bytes = 128 MB per layer
9 visible regions × 4 layers = ~4.6 GB
```

Or use smaller regions (2048×2048):

```
2048×2048 × 8 bytes = 32 MB per layer
9 visible regions × 4 layers = ~1.2 GB ← manageable
```

#### Region Management

```
Camera viewport (in tiles)
  → Compute which regions overlap viewport + 1-region buffer
  → For each needed region not yet loaded:
      → Allocate RawTexture (2048×2048 × RGBA16UI)
      → Upload tile data from CPU-side map arrays
      → Create layer quad mesh positioned at region world offset
  → For each loaded region no longer needed:
      → Dispose texture + mesh (LRU with configurable max)
  → Each visible region renders as 1 quad per layer
```

**Draw calls:** `visibleRegions × layers` = 9 × 4 = **36 draw calls** for a 50000×50000 map.

#### Seamless Boundaries

Adjacent regions share 1-tile overlap for autotile resolution at edges. When loading a region, the edge tiles are resolved considering their neighbors in the adjacent region's data.

#### Async Loading

Region textures are uploaded via `requestAnimationFrame`-batched `texSubImage2D` calls (uploading rows incrementally over multiple frames) to avoid frame hitches. A loading indicator can show for regions still being uploaded.

#### Memory Budget

Configurable max VRAM usage with LRU eviction:

```typescript
interface StreamingConfig {
    regionSize: number;           // 2048 or 4096
    maxLoadedRegions: number;     // e.g., 16 (LRU eviction beyond this)
    loadRadius: number;           // Regions beyond viewport to preload
    unloadDistance: number;        // Regions beyond this distance get evicted
}
```

---

### System 3: Thin-Instance Object Renderer

#### Core Concept

Events, props, NPCs, and other non-tile entities use Babylon.js **thin instances** — one base mesh per unique type, all instances rendered in a single draw call via a shared transform matrix buffer.

#### Architecture

```
Object Layer Data (positions, types, properties)
  → Group objects by mesh type
  → For each unique mesh type:
      → Create/load base mesh once
      → Build Float32Array of 4×4 transform matrices (position, rotation, scale)
      → thinInstanceSetBuffer('matrix', matrices, 16)
      → 1 draw call renders ALL instances of this type
  → Quadtree spatial index for frustum culling
```

#### Instance Data

```typescript
interface ObjectInstance {
    id: string;                    // Unique instance ID
    meshType: string;              // Base mesh identifier (e.g., 'torch', 'tree-oak')
    position: [number, number, number];  // World XYZ
    rotation: [number, number, number];  // Euler XYZ
    scale: [number, number, number];     // Scale XYZ
    tintColor?: [number, number, number, number]; // Per-instance tint
    visible: boolean;
    // Game logic properties (not GPU):
    eventId?: string;
    scriptHook?: string;
    properties?: Record<string, unknown>;
}
```

#### Frustum Culling via Quadtree

A quadtree index stores all object positions. Each frame:

1. Compute camera frustum bounds (AABB for ortho, frustum planes for perspective)
2. Query quadtree for objects within bounds
3. Build instance matrix buffer from visible objects only
4. Upload to GPU

**Cost:** Quadtree query ~0.1ms for 100K objects. Matrix buffer build ~0.5ms. One `thinInstanceSetBuffer` call per mesh type.

#### Editing

Adding/removing/moving an object:
1. Update quadtree index
2. If object is visible, update its entry in the instance matrix buffer
3. Call `thinInstanceBufferUpdated('matrix')` — no mesh rebuild

#### Shadow Casting

Thin instances participate in shadow maps natively in Babylon.js. Each instance mesh type can be added to shadow generators:

```typescript
shadowGenerator.addShadowCaster(baseMesh, true); // includeDescendants
```

All thin instances of that mesh will cast shadows via a single shadow pass draw call.

#### LOD

For 3D props viewed from distance (perspective cameras), Babylon.js LOD levels can be set on base meshes:

```typescript
baseMesh.addLODLevel(50, simplifiedMesh);  // Switch to simplified at 50 units
baseMesh.addLODLevel(200, null);           // Cull entirely at 200 units
```

Thin instances inherit the LOD of their base mesh.

---

## Migration Path

### Phase 1: Data Texture Renderer (System 1)

New files — does not modify existing renderer:

```
packages/products/webforge/runtime/src/rendering/
├── gpu-tile-renderer.ts          ← New: data texture renderer
├── gpu-tile-shader.ts            ← New: shader source strings
├── gpu-tile-data-texture.ts      ← New: data texture creation/update
├── gpu-tile-renderer.test.ts     ← New: tests
├── gpu-tile-shader.test.ts       ← New: tests
├── gpu-tile-data-texture.test.ts ← New: tests
├── tilemap-renderer.ts           ← Modified: use gpu renderer for flat layers
├── chunk-builder.ts              ← Unchanged: still used for cliffs
└── tile-geometry.ts              ← Unchanged: still used for cliffs
```

**`tilemap-renderer.ts` changes:**

The `renderTilemap()` function gains a code path that checks whether to use the GPU data texture renderer or the legacy chunk builder:

```typescript
// For each tile layer:
if (layer.kind === 'tile' && !hasHeightVariation(layer, mapData)) {
    // Use GPU data texture renderer (1 quad per layer)
    const result = createGpuTileLayer({ scene, layer, mapData, tilesets, materials });
    gpuLayers.push(result.data);
} else {
    // Fall back to chunk builder for cliff geometry or height-varying layers
    buildChunksForLayer(context, layerIndex);
}
```

For the ground layer with height map data, we use a subdivided quad (vertices match tile grid) with the height data texture in the vertex shader.

### Phase 2: Streaming (System 2)

New files:

```
packages/products/webforge/runtime/src/rendering/
├── tile-streaming.ts             ← New: region manager
├── tile-streaming.test.ts        ← New: tests
└── gpu-tile-renderer.ts          ← Modified: accept region-based textures
```

### Phase 3: Object Instancing (System 3)

New files:

```
packages/products/webforge/runtime/src/rendering/
├── object-instance-renderer.ts   ← New: thin-instance manager
├── object-quadtree.ts            ← New: spatial index
├── object-instance-renderer.test.ts
├── object-quadtree.test.ts
└── tilemap-renderer.ts           ← Modified: wire object layers
```

---

## Per-Layer Properties (Shader Uniforms)

These existing `TileLayerSchema` properties become shader uniforms on the `CustomMaterial`:

| Property | Uniform Type | Shader Usage |
|----------|-------------|-------------|
| `opacity` | `float` | Multiplied into final alpha |
| `visible` | mesh `setEnabled()` | Layer quad hidden entirely |
| `tintColor` | `vec4` | Multiplied into diffuse color |
| `brightness` | `float` | Added to RGB after lighting |
| `saturation` | `float` | HSL adjustment in fragment |
| `contrast` | `float` | Contrast curve in fragment |
| `offsetX/Y` | `vec2` | Added to tile coordinate in shader |
| `parallaxFactorX/Y` | `vec2` | Camera offset multiplier |
| `receiveShadows` | mesh property | Babylon.js shadow system |
| `depthWrite` | material property | `material.depthWrite` |
| `blendMode` | material property | `material.alphaMode` |
| `renderOrder` | mesh property | `mesh.renderingGroupId` or custom sort |

---

## Per-Tile Properties

### GPU-Side (Data Texture — affects rendering)

Stored in the RGBA32UI data texture channels. Read by the fragment shader every frame:

- Tile ID (R channel, 32 bits)
- Flip H/V, rotation (G channel, bits 0–3)
- Per-tile opacity (G channel, bits 4–7)
- Shadow receive override (G channel, bit 8)
- Glow flag (G channel, bit 9)
- Tint palette index (G channel, bits 10–15)
- Animation base + frame count (G channel, bits 16–27)
- Bush transparency (G channel, bit 28)

### CPU-Side (TilePropertiesSchema — game logic only)

Stored in JS objects, NOT uploaded to GPU. Queried by game engine at runtime:

- Passability (4-directional)
- Terrain tag, terrain type
- Height level
- Damage floor, damage amount/percent/element/interval
- Bush, counter, ladder, slip, shelter flags
- Vehicle passability, event trigger
- Star passage, pass above/below
- Collision shapes
- Movement speed, slipperiness
- Encounter rate, region ID
- Script hooks, class, tags
- Animation definitions (frames, playback mode, sync, speed)
- Reflection, glow properties
- Custom user properties

**No limit on CPU-side flags** — they're plain JS objects, not GPU texture channels.

**Extensibility:** If more GPU-side visual flags are needed beyond 128 bits, a second data texture per layer can be added (the shader does one more `texelFetch()`). Practically unlimited.

---

## Performance Targets

| Scenario | Current | System 1 | System 1+2 | System 1+2+3 |
|----------|---------|----------|------------|--------------|
| 300×300, 4 layers | ~360 meshes, ~240 DC | 4 meshes, 4 DC | Same | Same |
| 1000×1000, 4 layers | ~16K meshes, broken | 4 meshes, 4 DC | Same | Same |
| 5000×5000, 4 layers | impossible | 4 meshes, 4 DC | Same | Same |
| 16384×16384, 4 layers | impossible | 4 meshes, 4 DC | Same | Same |
| 50000×50000, 4 layers | impossible | impossible | ~36 DC | ~36 DC |
| 10,000 torch props | 10K meshes | 10K meshes | 10K meshes | 1 DC |
| 50 unique prop types, 100K total | 100K meshes | 100K meshes | 100K meshes | 50 DC |

DC = draw calls at 60fps.

---

## Compatibility

### What Stays Identical

- All post-processing (bloom, DoF, SSAO, chromatic aberration, grain, vignette, tone mapping, FXAA, dithering, HDR)
- All lighting (hemispheric, directional, point, spot, shadows, flicker, god rays, lens flares, glow, day/night)
- Sky system, parallax backgrounds, screen effects
- Camera system (all 6 presets, transitions, screen shake, ortho map editor)
- Editor UI, tile picker, tile inspector, keyboard shortcuts
- All existing schemas (MapDataSchema, TileLayerSchema, TilePropertiesSchema, etc.)
- All existing tests (~1741 tests)
- Dev harness controls

### What Changes

- `tilemap-renderer.ts` — new code path for GPU tile layers alongside existing chunk path
- Flat tile layers render via data texture shader instead of chunk meshes
- Cliff/wall layers continue using chunk-builder
- Tile edit path changes from `rebuildChunk()` to `texSubImage2D()`
- `disposeTilemap()` disposes data textures in addition to chunk meshes

### WebGL2/WebGPU

System 1 uses `texelFetch()` and unsigned integer textures — both require **WebGL2** minimum. WebGPU works natively. The existing engine already requires WebGL2 (`Engine.isSupported()` check in runtime init).

---

## Open Questions

1. **CustomMaterial vs ShaderMaterial** — CustomMaterial gives free lighting but less shader control. ShaderMaterial is fully custom but requires reimplementing lighting. Recommend: start with CustomMaterial, fall back to ShaderMaterial only if hooks are insufficient.

2. **Ground layer subdivision limit** — A 16384×16384 subdivided quad = 268M vertices. Too many. For height-mapped ground layers >4096², we'll need to chunk the ground quad (4096² subdivisions per chunk, ~16 chunks for 16384²). This is still far fewer meshes than the current system.

3. **Animated tile performance** — The `animationFrame` uniform updates once per frame (cheap). But if tiles have different animation speeds, we may need per-tile phase offsets in the data texture. Current design handles this via `animBase` + `animCount` flags.

4. **Multi-tileset support** — If a layer uses tiles from multiple tilesets (different atlas textures), the shader needs either a texture array (`sampler2DArray`) or atlas-of-atlases. Recommend: pack all tilesets into one mega-atlas at load time, or use `RawTexture2DArray`.
