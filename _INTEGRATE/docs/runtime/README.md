# WebForge Runtime

The WebForge runtime is an HD-2D game engine built on Babylon.js. It renders tile-based worlds with a complete visual pipeline spanning 12 systems and 300+ configurable options.

## Quick Start

```typescript
import { createRuntime, type RuntimeConfig } from '@webforge/runtime';

const result = createRuntime({
  canvas: document.getElementById('game') as HTMLCanvasElement,
  engine: { antialias: true, adaptToDeviceRatio: true },
  camera: { preset: 'hd2d' },
  mapData: { /* ... tilemap JSON ... */ },
});

if (!result.ok) {
  console.error(result.error);
} else {
  const runtime = result.data;
  // runtime.scene, runtime.engine, runtime.camera, etc.
}
```

## Systems Overview

| System | Description | Config Options | Docs |
|--------|-------------|----------------|------|
| **Engine** | WebGPU/WebGL2 renderer, render loop, quality presets | 10 | [engine.md](engine.md) |
| **Camera** | 16 presets, FF Tactics rotation, smooth transitions, refocus | 18 | [camera.md](camera.md) |
| **Tilemap** | GPU data texture renderer, streaming, thin-instance objects, autotile, animated tiles | 80+ | [tilemap.md](tilemap.md) |
| **Lighting** | 4 light types, 8 shadow filters, 13 flicker modes, god rays, lens flares, distance fade | 85+ | [lighting.md](lighting.md) |
| **Day/Night Cycle** | 9 keyframes, seasons, moon phases, callbacks | 30+ | [day-night-cycle.md](day-night-cycle.md) |
| **Glow Layer** | Mesh glow, intensity control, custom emissive colors | 6 | [glow-layer.md](glow-layer.md) |
| **Fog** | 3-tier architecture, 14 presets, GLSL shaders | 77+ | [fog.md](fog.md) |
| **Sky & Parallax** | 6 sky types, procedural atmosphere, parallax layers | 30+ | [sky-and-parallax.md](sky-and-parallax.md) |
| **Post-Processing** | 12 effects, 5 presets, full DefaultRenderingPipeline | 45+ | [post-processing.md](post-processing.md) |
| **Transitions** | 53 types, 6 easings, 32 presets, GLSL shaders | 25+ | [transitions.md](transitions.md) |
| **Screen Shake** | Trauma system, Perlin noise, ASR envelope, 18 presets | 20+ | [screen-shake.md](screen-shake.md) |
| **Screen Effects** | Tint overlay, flash, fade in/out | 6 | [screen-effects.md](screen-effects.md) |

## Architecture

All systems follow the same pattern:

1. **Schema** (`schemas/*.ts`) -- Valibot schema with sensible defaults
2. **Implementation** (`core/*.ts` or `rendering/*.ts`) -- Pure functions returning `Result<T>`
3. **Tests** (`*.test.ts`) -- Colocated, 2090+ total across the runtime

An empty `{}` config input produces a fully working setup with HD-2D defaults.

## File Map

```
runtime/src/
├── schemas/                    Configuration schemas (14 files)
│   ├── engine-config.ts        Engine creation options
│   ├── camera-config.ts        Camera presets & behavior
│   ├── scene-setup-config.ts   Scene setup, screen effects
│   ├── fog-config.ts           3-tier fog (12 sub-schemas)
│   ├── quality-config.ts       Quality presets (low/medium/high/ultra)
│   ├── lighting-config.ts      Lights, 8 shadow filters, 13 flicker modes, god rays, lens flares, distance fade
│   ├── post-processing-config.ts  12 post-FX sub-schemas
│   ├── screen-shake-config.ts  Trauma shake + 18 presets
│   ├── transition-config.ts    53 transition types + 32 presets
│   ├── sky-config.ts           Sky types + parallax layers
│   ├── map-data.ts             Tilemap format (layers, tilesets, properties)
│   ├── streaming-config.ts     Region-based streaming configuration
│   ├── object-instance.ts      Object instance schema (props, NPCs, events)
│   └── color-schema.ts         Shared ColorRgba, Vector3
├── core/                       Core engine systems
│   ├── engine.ts               Engine creation & render loop
│   ├── camera-controller.ts    Camera presets, switching, reset
│   ├── screen-shake.ts         Trauma-based shake system
│   ├── perlin.ts               2D Perlin noise generator
│   ├── performance-monitor.ts  FPS/frame time tracking
│   ├── debug-inspector.ts      Babylon.js inspector toggle
│   └── babylon-result.ts       Result helpers for Babylon objects
├── rendering/                  Visual rendering systems
│   ├── scene-setup.ts          Scene creation, screen effects
│   ├── tilemap-renderer.ts     Top-level tilemap orchestrator
│   ├── gpu-tile-renderer.ts    GPU data texture tile layer (1 draw call/layer)
│   ├── gpu-tile-shader.ts      GLSL vertex/fragment shader source
│   ├── gpu-tile-data-texture.ts Data texture creation + visual flags
│   ├── gpu-tile-material-plugin.ts MaterialPluginBase for StandardMaterial
│   ├── tile-streaming.ts       Region-based streaming for large maps
│   ├── object-instance-renderer.ts Thin-instance object renderer
│   ├── object-quadtree.ts      Quadtree spatial index for objects
│   ├── chunk-builder.ts        Merged mesh per 16x16 chunk (cliff geometry)
│   ├── tile-geometry.ts        Vertex generation (quads, walls)
│   ├── autotile-resolver.ts    48-pattern autotile lookup
│   ├── cliff-generator.ts      Height-diff cliff face geometry
│   ├── tileset-loader.ts       Tileset image + UV lookup
│   ├── tile-material.ts        StandardMaterial (NEAREST sampling)
│   ├── tile-animator.ts        UV cycling for animated tiles
│   ├── tile-query.ts           Tile inspection / querying
│   ├── light-manager.ts        4 light types + shadows + distance fade + lens flare presets
│   ├── light-animation.ts      13 flicker modes with color shift + position jitter
│   ├── shadow-manager.ts       Shadow generators with 8 filter types
│   ├── day-night-cycle.ts      Keyframe interpolation + callbacks
│   ├── color-temperature.ts    Kelvin-to-RGB conversion
│   ├── glow-manager.ts         GlowLayer mesh management
│   ├── fog-manager.ts          3-tier fog lifecycle
│   ├── fog-shader.ts           GLSL shaders + PostProcess
│   ├── fog-overlay-textures.ts 5 procedural noise generators
│   ├── fog-presets.ts          14 named fog presets
│   ├── sky-system.ts           6 sky type renderers
│   ├── parallax-manager.ts     Scrolling parallax backgrounds
│   ├── post-processing.ts      DefaultRenderingPipeline setup
│   ├── post-processing-presets.ts  5 named PP presets
│   ├── hdr-environment.ts      HDR cubemap loading
│   ├── transition-manager.ts   53 transition effects (GLSL)
│   └── transition-shader.ts    Transition GLSL code generation
└── runtime.ts                  Top-level runtime orchestrator

runtime/dev/                    Dev harness
├── index.html                  Dev harness entry point
└── dev.ts                      12-section interactive UI
```

## API Functions

### Lifecycle

| Function | Module | Purpose |
|----------|--------|---------|
| `createRuntime` | `runtime.ts` | Create full runtime from config |
| `disposeRuntime` | `runtime.ts` | Dispose all runtime resources |
| `createEngine` | `core/engine.ts` | Create Babylon.js engine |
| `disposeEngine` | `core/engine.ts` | Dispose engine |
| `startRenderLoop` | `core/engine.ts` | Start/resume rendering |
| `stopRenderLoop` | `core/engine.ts` | Pause rendering |

### Camera

| Function | Module | Purpose |
|----------|--------|---------|
| `createCamera` | `core/camera-controller.ts` | Create camera from preset config |
| `switchCameraPreset` | `core/camera-controller.ts` | Animated transition between presets |
| `resetCamera` | `core/camera-controller.ts` | Instant reset to preset defaults |
| `refocusOnTilemap` | `core/camera-controller.ts` | Animate camera to show entire tilemap |

### Tilemap

| Function | Module | Purpose |
|----------|--------|---------|
| `renderTilemap` | `rendering/tilemap-renderer.ts` | Render full tilemap from MapData |
| `disposeTilemap` | `rendering/tilemap-renderer.ts` | Dispose tilemap resources |
| `updateTile` | `rendering/tilemap-renderer.ts` | Single-tile edit (rebuilds 1 chunk) |
| `loadTileset` | `rendering/tileset-loader.ts` | Load tileset image + UV table |

### Lighting & Day/Night

| Function | Module | Purpose |
|----------|--------|---------|
| `createLights` | `rendering/light-manager.ts` | Create scene lights from config |
| `removeLightById` | `rendering/light-manager.ts` | Remove and dispose a light by ID |
| `updateLightPosition` | `rendering/light-manager.ts` | Update a light's position at runtime |
| `updateLightIntensity` | `rendering/light-manager.ts` | Update a light's intensity at runtime |
| `updateLightColor` | `rendering/light-manager.ts` | Update a light's diffuse color at runtime |
| `disposeLighting` | `rendering/light-manager.ts` | Dispose all lights and sub-resources |
| `createShadowGenerator` | `rendering/shadow-manager.ts` | Set up shadow generator (8 filter types) |
| `createDayNightCycle` | `rendering/day-night-cycle.ts` | Start day/night interpolation |
| `setTimeOfDay` | `rendering/day-night-cycle.ts` | Jump to specific time |
| `setSeason` | `rendering/day-night-cycle.ts` | Change season at runtime |

### Fog

| Function | Module | Purpose |
|----------|--------|---------|
| `applyFog` | `rendering/fog-manager.ts` | Create fog from config |
| `updateFog` | `rendering/fog-manager.ts` | Patch fog parameters |
| `applyFogPreset` | `rendering/fog-manager.ts` | Apply named preset |
| `disposeFog` | `rendering/fog-manager.ts` | Dispose fog resources |

### Post-Processing

| Function | Module | Purpose |
|----------|--------|---------|
| `createPostProcessing` | `rendering/post-processing.ts` | Create full pipeline |
| `updatePostProcessing` | `rendering/post-processing.ts` | Update effect parameters |
| `disposePostProcessing` | `rendering/post-processing.ts` | Dispose pipeline |

### Screen Shake

| Function | Module | Purpose |
|----------|--------|---------|
| `createScreenShake` | `core/screen-shake.ts` | Trigger shake from config |
| `stopScreenShake` | `core/screen-shake.ts` | Cancel active shake |

### Transitions

| Function | Module | Purpose |
|----------|--------|---------|
| `playTransition` | `rendering/transition-manager.ts` | Play transition effect |
| `disposeTransition` | `rendering/transition-manager.ts` | Dispose transition resources |

### Sky & Parallax

| Function | Module | Purpose |
|----------|--------|---------|
| `createSkySystem` | `rendering/sky-system.ts` | Create sky from config |
| `updateSkySystem` | `rendering/sky-system.ts` | Update sky parameters |
| `disposeSkySystem` | `rendering/sky-system.ts` | Dispose sky resources |
| `createParallaxManager` | `rendering/parallax-manager.ts` | Create parallax layers |
| `disposeParallaxManager` | `rendering/parallax-manager.ts` | Dispose parallax |
