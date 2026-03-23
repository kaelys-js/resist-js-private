# Phase 1: Project Scaffold + Babylon.js HD-2D Renderer

**Status:** Not started (1.1 scaffold complete)
**Dependencies:** None
**Estimated weeks:** 3

## Goal

Render a 3D tilemap with HD-2D visual style. Camera works. Tiles have height. Post-processing active.

---

## Sub-phase 1.1: Monorepo Setup (COMPLETE)

Already done. The monorepo is scaffolded with pnpm workspaces, Turborepo, and the following workspace structure:

- `packages/products/webforge/editor/` -- SvelteKit + shadcn-svelte editor UI
- `packages/products/webforge/runtime/` -- Babylon.js HD-2D game runtime
- `packages/shared/` -- Shared schemas, utils, locale, config

---

## Sub-phase 1.2: Babylon.js Scene Setup

- Install `@babylonjs/core`, `@babylonjs/materials`, `@babylonjs/loaders`, `@babylonjs/gui`
- Create `BabylonEngine` class in runtime: init scene, camera, render loop
- HD-2D camera: ArcRotateCamera at 45 deg pitch, limited zoom range, smooth follow
- WebGL2 default with WebGPU opt-in detection
- Canvas resize handling with proper aspect ratio

### Files

```
packages/products/webforge/runtime/src/core/engine.ts              # BabylonEngine class -- init, resize, loop
packages/products/webforge/runtime/src/core/camera-controller.ts   # HD-2D camera setup, follow target, zoom, transitions
packages/products/webforge/runtime/src/rendering/scene-setup.ts    # Default scene config (clear color, ambient, fog)
```

### Acceptance Criteria

- Blank Babylon.js scene renders in browser
- Camera orbits
- WebGPU activates if supported

---

## Sub-phase 1.3: Tilemap Renderer

- Parse MapData JSON to 3D tile geometry
- Each tile: plane mesh at grid position (x, z) at height (y)
- Tile texture from tileset spritesheet UV coordinates
- Autotile system: read tile ID, compute autotile frame, assign UVs
- Instanced mesh rendering for repeated tiles (performance)
- Layers: ground (A tiles), above-ground (B-E tiles), doodad layer
- Wall tiles (A3/A4): auto-extrude vertical faces when height differs from neighbor
- Cliff face generation between height-differing adjacent tiles

### Files

```
packages/products/webforge/runtime/src/rendering/tilemap-renderer.ts    # Main tilemap mesh generation
packages/products/webforge/runtime/src/rendering/autotile-resolver.ts   # Autotile frame calculation (48-frame system)
packages/products/webforge/runtime/src/rendering/tile-geometry.ts       # Per-tile mesh: flat, wall, slope, cross, fence, stair
packages/products/webforge/runtime/src/rendering/tileset-loader.ts      # Load tileset image, create texture atlas, UV mapping
packages/products/webforge/runtime/src/rendering/cliff-generator.ts     # Auto-generate cliff faces between height levels
packages/products/webforge/runtime/src/rendering/instance-manager.ts    # Babylon.js instanced mesh pooling
```

### Acceptance Criteria

- Load a JSON map file and render as HD-2D scene with height, walls, cliffs
- Tiles textured from tileset
- 60fps on 100x100 map

---

## Sub-phase 1.4: Post-Processing Pipeline

- Babylon.js DefaultRenderingPipeline
- Bloom (glow on lights, magic effects)
- Depth of Field (tilt-shift for HD-2D miniature look)
- Color grading via 3D LUT
- Tone mapping (ACES filmic)
- Vignette
- Film grain (subtle)
- Ambient occlusion (SSAO)
- All configurable per-map via MapData.postProcessing

### Files

```
packages/products/webforge/runtime/src/rendering/post-processing.ts    # Pipeline setup, per-map config application
packages/products/webforge/runtime/src/rendering/hdr-environment.ts    # Environment lighting, reflections
```

### Acceptance Criteria

- Scene has visible bloom on bright objects, DoF tilt-shift effect, color grading
- Toggling settings changes look in real-time

---

## Sub-phase 1.5: Lighting System

- Babylon.js lights: PointLight, SpotLight, DirectionalLight, HemisphericLight
- ShadowGenerator per light (PCF / PCSS selectable)
- Light data stored in MapData.lights array
- Day/night cycle: time-of-day float (0.0-24.0) driving ambient color, directional light angle/color, sky color
- Light flicker animation (candle/torch effect)
- Per-event light attachment (light follows event position)

### Files

```
packages/products/webforge/runtime/src/rendering/light-manager.ts      # Create/update/remove lights from MapData
packages/products/webforge/runtime/src/rendering/shadow-manager.ts     # ShadowGenerator per light, quality settings
packages/products/webforge/runtime/src/rendering/day-night-cycle.ts    # Time-driven ambient/directional transitions
packages/products/webforge/runtime/src/rendering/sky-system.ts         # Skybox blending for time-of-day
```

### Acceptance Criteria

- Drag lights in editor (Phase 2) and they appear in scene
- Shadows cast
- Day/night cycle animates ambient
- Torch flickers

---

## Test Plan (Skeleton)

### Schema Tests

- EngineConfigSchema: validate WebGL2/WebGPU renderer selection, canvas dimensions, target FPS
- CameraConfigSchema: validate pitch angle, zoom range min/max, follow speed, damping
- MapDataSchema: validate map dimensions, tile layer arrays, tileset references
- TileDataSchema: validate tile ID, autotile flag, height value, passability
- TilesetConfigSchema: validate tileset image path, tile size, column count, autotile type markers
- PostProcessingConfigSchema: validate bloom threshold/intensity, DoF focal length/fStop, vignette weight, grain intensity, SSAO radius
- LightDataSchema: validate light type enum, color (RGB), intensity range, position, cone angle for spotlights
- DayNightConfigSchema: validate time-of-day range (0.0-24.0), color keyframes, transition speed
- ShadowConfigSchema: validate shadow quality enum (PCF/PCSS), map size, bias, darkness

### Logic Tests

- Autotile frame calculation: given a tile ID and 8 neighbors, compute the correct frame index from the 48-frame autotile table
- UV mapping: given a tile index and tileset dimensions, compute correct UV coordinates for the quad
- Cliff detection: given two adjacent tiles with different heights, determine cliff face direction and height delta
- Camera angle clamping: verify pitch stays within configured min/max bounds after user input
- Day/night color interpolation: given a time-of-day float, interpolate between keyframe colors correctly
- Flicker math: verify flicker offset produces values within configured intensity range and frequency

### Integration Tests (Headless Babylon.js with NullEngine)

- NullEngine init: create a NullEngine instance, verify it initializes without errors
- Scene creation: create a scene with scene-setup defaults, verify clear color, ambient light, fog settings
- Camera setup: create ArcRotateCamera via camera-controller, verify initial pitch, distance, target
- Mesh generation: generate tile geometry for a small test map (e.g. 4x4), verify vertex count and positions
- Light creation: add PointLight, DirectionalLight via light-manager, verify light type and position
- Shadow generator: attach ShadowGenerator to a light, verify shadow map configuration

### Visual Verification

- HD-2D camera angle produces the expected isometric-style perspective
- Tilemap renders with correct textures and no UV seams
- Autotiles connect properly at edges and corners
- Cliff faces generate between height levels without gaps
- Bloom glow is visible on bright surfaces
- DoF tilt-shift creates miniature diorama appearance
- Day/night cycle transitions smoothly through dawn, day, dusk, night
- Torch/candle flicker looks natural and is not uniform
- Shadows fall in the correct direction relative to light position
- 60fps maintained on 100x100 map with post-processing enabled
