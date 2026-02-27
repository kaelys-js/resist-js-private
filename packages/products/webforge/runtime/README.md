# @webforge/runtime

Babylon.js HD-2D game runtime for WebForge RPG. Provides engine initialization, 6 camera presets with FF Tactics rotation, scene setup, tilemap rendering, post-processing pipeline, dynamic lighting with day/night cycles, sky/parallax backgrounds, screen effects, performance monitoring, and debug tools in a single lifecycle API.

## Architecture

```
src/
├── runtime.ts                    # Orchestrator: composes all modules into a lifecycle
├── index.ts                      # Public API surface
├── core/
│   ├── babylon-result.ts         # BabylonResult<T> — mutable-safe Result variant
│   ├── engine.ts                 # Engine creation (WebGPU/WebGL2/NullEngine), render loop, resize, dispose
│   ├── camera-controller.ts      # 6 camera presets + FF Tactics rotation + transitions
│   ├── screen-shake.ts           # Trauma-based screen shake (Perlin noise, 3 channels, envelope)
│   ├── perlin.ts                 # 2D Perlin noise generator for shake randomisation
│   ├── performance-monitor.ts    # SceneInstrumentation wrapper for FPS/frame metrics
│   └── debug-inspector.ts        # Lazy-loaded Babylon.js inspector toggle (wired to F12)
├── rendering/
│   ├── scene-setup.ts            # Scene defaults: clear color, ambient, fog, hemispheric light
│   ├── tilemap-renderer.ts       # Tilemap orchestrator: tileset loading → chunks → lighting → sky → parallax
│   ├── tileset-loader.ts         # Texture loading + UV lookup table generation
│   ├── tile-geometry.ts          # Per-tile vertex data (positions, normals, UVs)
│   ├── chunk-builder.ts          # Merge tiles into chunk meshes with visibility/opacity
│   ├── tile-query.ts             # Runtime tile property lookup (bush/counter/damage/ladder flags)
│   ├── autotile-resolver.ts      # 48-pattern terrain + 16-pattern wall + animated autotiles
│   ├── tile-animator.ts          # UV animation for animated terrain autotiles
│   ├── cliff-generator.ts        # Height-map cliff mesh generation
│   ├── light-manager.ts          # Create/update/dispose lights, shadows, flicker, glow, god rays, lens flares
│   ├── shadow-manager.ts         # Shadow generators (PCF, PCSS, Cascade) + quality scaling
│   ├── light-animation.ts        # 7 flicker presets, color shift, position jitter
│   ├── day-night-cycle.ts        # Time engine, keyframe interpolation, procedural sun path
│   ├── glow-manager.ts           # GlowLayer lifecycle + mesh management + custom emissive
│   ├── color-temperature.ts      # Kelvin → RGB conversion (Tanner Helland algorithm)
│   ├── sky-system.ts             # Sky visuals: solid color, gradient, skybox, procedural atmosphere
│   ├── parallax-manager.ts       # Multi-layer scrolling backgrounds with camera-relative UV offset
│   ├── screen-effects.ts         # Full-screen tint/flash/fade effects
│   ├── post-processing.ts        # DefaultRenderingPipeline + individual post-process creation
│   ├── post-processing-presets.ts # Named presets (fantasy, noir, etc.) + quality scaling
│   └── hdr-environment.ts        # HDR .env texture loading + PBR environment setup
├── schemas/
│   ├── engine-config.ts          # EngineConfig schema
│   ├── camera-config.ts          # CameraConfig + 6 presets + tactics rotation + transitions
│   ├── scene-setup-config.ts     # SceneSetupConfig + ColorRgba + Vector3 + FogConfig
│   ├── quality-config.ts         # QualityConfig + QUALITY_PRESETS
│   ├── lighting-config.ts        # All lighting schemas (lights, shadows, flicker, day/night, glow, volumetric, lens flare)
│   ├── post-processing-config.ts # All post-processing effect schemas
│   ├── screen-shake-config.ts    # ScreenShakeConfig, 18 presets, channels, envelope, decay modes
│   ├── sky-config.ts             # SkyConfig (4 types) + ParallaxLayer
│   └── map-data.ts               # MapData: dimensions, tilesets, layers, heightMap, postProcessing, lighting, sky
├── test-setup.ts                 # Vitest polyfills for NullEngine
└── dev/
    ├── index.html                # Visual test harness
    ├── dev.ts                    # Harness entry
    ├── test-map.ts               # 32x32 test map with full config
    └── vite.config.ts            # Vite dev server config
```

### Module Dependency Flow

```
RuntimeConfig
  └── createRuntime()
        ├── applyQualityPreset() → EngineConfig
        ├── createBabylonEngine(config, canvas) → BabylonEngineInstance
        ├── applySceneSetup(scene, sceneConfig) → clear color, ambient, fog, light
        ├── createCamera(scene, cameraConfig) → Camera (ArcRotate or Universal)
        ├── createPerformanceMonitor(scene) → PerformanceMonitor (if debug)
        ├── registerInspectorToggle(scene) → F12 keyboard handler (if debug)
        └── showInspector(scene) → Babylon.js inspector panel (if debug)
        → RuntimeInstance

MapData
  └── renderTilemap()
        ├── loadTilesets() → LoadedTileset[] (textures + UV tables)
        ├── buildChunks() → chunk meshes per layer (visibility + opacity)
        ├── createCliffMeshes() → heightMap-driven cliff geometry
        ├── createTileAnimator() → UV animation observer
        ├── createPostProcessingPipeline() → post-processing effects
        ├── createLighting() → lights + shadows + flicker + glow + god rays + lens flares
        ├── createSky() → background visuals (color/gradient/skybox/procedural)
        └── createParallax() → scrolling background layers
        → RenderedTilemap
```

### Key Abstractions

**BabylonResult\<T\>** — Babylon.js objects are mutable and can't survive `DeepReadonly<T>` from the standard `Result<T>`. `BabylonResult<T>` uses `okShallow()` to preserve mutability while remaining assignable to `Result<T>`.

**Camera presets** — 6 presets (`hd2d`, `topdown`, `sideview`, `firstperson`, `cinematic`, `free`) with preset-specific defaults for alpha, beta, radius, inertia, FOV, and panning. The `firstperson` preset creates a `UniversalCamera` with WASD keys; all others use `ArcRotateCamera`. FF Tactics-style 90-degree snap rotation available via `rotateTactics()`.

**Non-fatal sub-module pattern** — Sky, parallax, post-processing, and lighting are all created with non-fatal error handling in the tilemap renderer. A failure in any sub-module is logged but does not prevent the tilemap from rendering.

**Quality presets** — `low`, `medium`, `high`, `ultra` map to hardware scaling, antialias, stencil, and device ratio settings. Presets provide defaults that explicit engine config overrides.

## Camera Presets

| Preset | Camera Type | Alpha | Beta | Radius | FOV | Inertia | Notes |
|--------|-------------|-------|------|--------|-----|---------|-------|
| `hd2d` | ArcRotate | π/4 | π/4 | 100 | 0.8 | 0.7 | Default. Locked iso tilt for HD-2D style |
| `topdown` | ArcRotate | 0 | 0.01 | 80 | 0.8 | 0.5 | Overhead view, no tilt |
| `sideview` | ArcRotate | π/2 | π/2 | 60 | 0.8 | 0.5 | Pure side-on (2D platformer) |
| `firstperson` | Universal | — | — | — | 1.2 | 0 | WASD + mouse look |
| `cinematic` | ArcRotate | π/6 | π/3 | 40 | 1.2 | 0.9 | Low angle, wide FOV, heavy inertia |
| `free` | ArcRotate | π/4 | π/4 | 100 | 0.8 | 0 | Unrestricted orbit, panning enabled |

Legacy `mode: 'editor'` maps to `free`; `mode: 'gameplay'` maps to `hd2d`.

## Sky Types

| Type | Description | Key Config |
|------|-------------|------------|
| `color` | Solid `scene.clearColor` | `color: ColorRgba` |
| `gradient` | Vertical gradient on a large box | `gradient: SkyGradientStop[]` |
| `skybox` | 6-face cubemap on a box | `skyboxPath: string`, `skyboxSize: number` |
| `procedural` | Atmosphere simulation via Rayleigh scattering approximation | `turbidity`, `rayleigh`, `luminance` |

All sky types support `parallaxLayers` for multi-depth scrolling backgrounds.

## Public API

### Lifecycle

| Function | Returns | Description |
|----------|---------|-------------|
| `createRuntime(config)` | `Promise<BabylonResult<RuntimeInstance>>` | Full browser runtime |
| `createTestRuntime(overrides?)` | `BabylonResult<RuntimeInstance>` | Headless NullEngine for tests |
| `disposeRuntime(instance)` | `Result<Bool>` | Dispose all resources |

### Engine

| Function | Returns | Description |
|----------|---------|-------------|
| `createBabylonEngine(config, canvas)` | `Promise<BabylonResult<BabylonEngineInstance>>` | Browser engine (WebGPU/WebGL2/auto) |
| `createTestEngine()` | `BabylonResult<BabylonEngineInstance>` | Headless NullEngine |
| `startRenderLoop(instance)` | `Result<Bool>` | Start rendering |
| `stopRenderLoop(instance)` | `Result<Bool>` | Stop rendering |
| `registerResizeHandler(instance, canvas)` | `Result<() => void>` | ResizeObserver on canvas parent |
| `disposeEngine(instance)` | `Result<Bool>` | Dispose scene then engine |

### Camera

| Function | Returns | Description |
|----------|---------|-------------|
| `createCamera(scene, config)` | `BabylonResult<Camera>` | Create camera from preset config |
| `createHd2dCamera(scene, config)` | `BabylonResult<Camera>` | Alias for `createCamera` |
| `updateCameraTarget(camera, options)` | `Result<Bool>` | Frame-rate independent smooth follow |
| `rotateTactics(options)` | `BabylonResult<Bool>` | FF Tactics-style 90-degree snap rotation |

### Screen Shake

| Function | Returns | Description |
|----------|---------|-------------|
| `screenShake(options)` | `BabylonResult<ShakeHandle>` | Trauma-based camera shake with Perlin noise, 3 channels, envelope |
| `addTrauma(amount)` | `void` | Add trauma for additive shake stacking (clamped at 1.0) |
| `getTrauma()` | `Num` | Read current trauma level (0.0--1.0) |
| `resetTrauma()` | `void` | Reset trauma to 0 |
| `stopAllShakes()` | `void` | Cancel all active shakes and reset trauma |
| `setGlobalScale(scale)` | `void` | Set global shake amplitude multiplier (0 = disabled, 2 = double) |
| `getGlobalScale()` | `Num` | Read current global scale (default 1.0) |
| `setMasterEnabled(enabled)` | `void` | Master on/off toggle for all shakes |
| `getMasterEnabled()` | `Bool` | Read master enable state |

Trauma-based camera shake system with Perlin noise, replacing the old `Math.random()` approach.

**Architecture:** `trauma^traumaPower * envelope * globalScale` drives 3 independent channels through multi-octave Perlin noise. Higher `traumaPower` (default 2) makes light hits barely visible while heavy hits produce dramatic displacement.

| Channel | Property | Default Amplitude | Notes |
|---------|----------|-------------------|-------|
| Translation | Camera target X/Z | 0.5 world units | No Y axis -- avoids ground clipping |
| Rotation | Camera roll via upVector | 0.05 radians (~3 degrees) | Subtle roll for realism |
| FOV | `camera.fov` offset | 0.03 radians (~2 degrees) | Zoom punch for impacts |

Each channel can be independently enabled/disabled with its own amplitude and noise frequency.

**Envelope (Attack/Sustain/Decay):**

- Attack: ramp from 0 to full over `attackMs` (default 0ms)
- Sustain: hold at full for `sustainMs` (default 0ms)
- Decay: fade to 0 over `decayMs` using one of 3 curves (default 300ms exponential)
- Decay modes: `linear`, `exponential` (fast drop, slow tail), `easeOut` (smooth deceleration)
- Total duration = `attackMs + sustainMs + decayMs`

**Additional features:**

- **Directional bias:** optional XZ vector biases translation 70/30 along the direction
- **Freeze frame:** optional `freezeMs` pause before the shake begins (hit-stop effect)
- **Accessibility:** `setGlobalScale()` (0--200%) + `setMasterEnabled()` toggle
- **Additive stacking:** `addTrauma()` accumulates trauma across multiple shake sources, clamped at 1.0

**18 Built-in Presets** (`SHAKE_PRESETS`):

| Category | Count | Presets |
|----------|-------|---------|
| Combat | 6 | Light Hit, Heavy Hit, Critical Hit, Explosion, Parry/Block, Spell Cast |
| Environment | 5 | Earthquake, Tremor, Rumble, Thunder, Footstep (Giant) |
| UI/Feedback | 3 | Deny, Alert, Landing |
| Cinematic | 4 | Boss Intro, Teleport, Death Blow, World Shift |

```typescript
import { screenShake, addTrauma, SHAKE_PRESETS } from '@webforge/runtime';

// One-shot shake with defaults
const result = screenShake({ scene, camera, intensity: 0.5 });
if (result.ok) {
  // Cancel early if needed:
  result.data.dispose();
}

// Use a preset
const preset = SHAKE_PRESETS.find(p => p.name === 'Heavy Hit');
if (preset) {
  screenShake({ ...preset.config, scene, camera });
}

// Additive stacking from multiple sources
addTrauma(0.3); // light hit
addTrauma(0.3); // another hit -- accumulates, clamped at 1.0
```

### Tilemap Rendering

| Function | Returns | Description |
|----------|---------|-------------|
| `renderTilemap(options)` | `BabylonResult<RenderedTilemap>` | Full tilemap from MapData |
| `disposeTilemap(options)` | `BabylonResult<Bool>` | Dispose all tilemap resources |
| `updateTile(options)` | `BabylonResult<Bool>` | Update a single tile in-place |
| `setLayerVisibility(options)` | `BabylonResult<Bool>` | Show/hide a tile layer |
| `setLayerOpacity(options)` | `BabylonResult<Bool>` | Set layer transparency (0–1) |
| `getTileProperties(options)` | `Result<TileProperties>` | Query bush/counter/damage/ladder flags |

### Scene & Rendering

| Function | Returns | Description |
|----------|---------|-------------|
| `applySceneSetup(scene, config)` | `Result<Bool>` | Apply clear color, ambient, fog, default light |

### Lighting

| Function | Returns | Description |
|----------|---------|-------------|
| `createLighting(options)` | `BabylonResult<LightingInstance>` | Full lighting (lights, shadows, flicker, glow, god rays, lens flares) |
| `disposeLighting(options)` | `BabylonResult<Bool>` | Dispose all lighting resources |
| `updateLightPosition(options)` | `BabylonResult<Bool>` | Move a light by ID |
| `updateLightIntensity(options)` | `BabylonResult<Bool>` | Change intensity by ID |
| `updateLightColor(options)` | `BabylonResult<Bool>` | Change diffuse color by ID |
| `removeLightById(options)` | `BabylonResult<LightingInstance>` | Remove a single light and its resources |
| `colorTemperatureToRgb(kelvin)` | `Result<ColorRgba>` | Kelvin to RGB |
| `createShadowGenerator(options)` | `BabylonResult<ShadowGeneratorInstance>` | PCF, PCSS, or Cascade shadows |
| `addShadowCasters(options)` | `BabylonResult<Bool>` | Register meshes as shadow casters/receivers |
| `applyShadowQualityScaling(options)` | `Result<ScaledShadowConfig>` | Scale shadow config by quality preset |
| `createFlicker(options)` | `BabylonResult<FlickerInstance>` | Per-frame flicker animation |
| `createDayNightCycle(options)` | `BabylonResult<DayNightCycleInstance>` | Time engine with keyframe interpolation |
| `setTimeOfDay(instance, time)` | `Result<Bool>` | Jump to specific hour |
| `getTimeOfDay(instance)` | `Result<Num>` | Query current time |
| `createGlowLayer(options)` | `BabylonResult<GlowLayer>` | Create glow layer with full constructor options |
| `updateGlowLayer(options)` | `BabylonResult<GlowUpdateResult>` | Update runtime props, detect constructor-only changes |
| `disposeGlowLayer(options)` | `BabylonResult<Bool>` | Dispose glow layer |
| `excludeMeshFromGlow(options)` | `BabylonResult<Bool>` | Exclude specific mesh from glow |
| `includeOnlyMeshInGlow(options)` | `BabylonResult<Bool>` | Whitelist-mode mesh inclusion |
| `removeMeshFromGlow(options)` | `BabylonResult<Bool>` | Remove mesh from exclude/include lists |
| `excludeUiMeshes(options)` | `BabylonResult<Num>` | Auto-exclude all renderingGroupId=3 meshes |
| `setCustomEmissiveColor(options)` | `BabylonResult<Bool>` | Override emissive color for glow computation |
| `clearCustomEmissiveColor(options)` | `BabylonResult<Bool>` | Revert to material-based glow |

### Sky & Parallax

| Function | Returns | Description |
|----------|---------|-------------|
| `createSky(options)` | `BabylonResult<SkyInstance>` | Sky background (color/gradient/skybox/procedural) |
| `disposeSky(options)` | `BabylonResult<Bool>` | Dispose sky resources |
| `createParallax(options)` | `BabylonResult<ParallaxInstance>` | Multi-layer scrolling backgrounds |
| `disposeParallax(options)` | `BabylonResult<Bool>` | Dispose parallax resources |
| `computeParallaxOffset(options)` | `{ x, y }` | Pure math parallax UV offset |

### Screen Effects

| Function | Returns | Description |
|----------|---------|-------------|
| `screenTint(options)` | `BabylonResult<ScreenEffectHandle>` | Colored overlay with fade in/out |
| `screenFlash(options)` | `BabylonResult<ScreenEffectHandle>` | Instant flash that decays |
| `screenFadeIn(options)` | `BabylonResult<ScreenEffectHandle>` | Opaque → transparent transition |
| `screenFadeOut(options)` | `BabylonResult<ScreenEffectHandle>` | Transparent → opaque transition |

### Post-Processing

| Function | Returns | Description |
|----------|---------|-------------|
| `createPostProcessingPipeline(options)` | `BabylonResult<PostProcessingPipeline>` | Full post-processing stack |
| `updatePostProcessingConfig(options)` | `BabylonResult<Bool>` | Update pipeline settings at runtime |
| `disposePostProcessingPipeline(options)` | `BabylonResult<Bool>` | Dispose pipeline |
| `getPostProcessingPreset(name)` | `Result<PostProcessingConfig>` | Get named preset (fantasy, noir, etc.) |
| `resolvePostProcessingConfig(config)` | `Result<PostProcessingConfig>` | Resolve preset + overrides |
| `applyQualityScaling(config, quality)` | `Result<PostProcessingConfig>` | Scale effects by quality level |

### Performance & Debug

| Function | Returns | Description |
|----------|---------|-------------|
| `createPerformanceMonitor(scene)` | `BabylonResult<PerformanceMonitor>` | SceneInstrumentation wrapper |
| `getMetrics(monitor)` | `Result<PerformanceMetrics>` | FPS, frame time, render time, draw calls |
| `disposePerformanceMonitor(monitor)` | `Result<Bool>` | Dispose instrumentation |
| `showInspector(scene, embedMode)` | `Promise<Result<Bool>>` | Lazy-load and show Babylon.js inspector |
| `hideInspector(scene)` | `Result<Bool>` | Hide inspector |

## Usage

```typescript
import { createRuntime, startRenderLoop, disposeRuntime } from '@webforge/runtime';

const result = await createRuntime({
  engine: { canvasId: 'game-canvas' },
  camera: { preset: 'hd2d' },
  debug: true, // enables F12 inspector toggle + performance monitor
});
if (!result.ok) return result;

startRenderLoop(result.data.engine);

// Later:
disposeRuntime(result.data);
```

## Testing

833 tests across 35 files covering:

- **Schema validation** — all config schemas with defaults, boundaries, and rejection cases
- **Pure math** — parallax offset, flicker waveforms, keyframe interpolation, sun direction, autotile bitmask
- **NullEngine integration** — engine lifecycle, camera presets, scene setup, tilemap rendering, lighting, sky, parallax, screen effects, post-processing, debug inspector
- **TDD** — all tests written before implementation

```bash
pnpm qa:test          # Run all tests
pnpm qa:type-check    # Type check
pnpm qa:lint          # Lint (oxlint)
pnpm qa:format:check  # Format check (Biome)
```

Tests use `NullEngine` for headless Babylon.js execution in Vitest. The `test-setup.ts` file polyfills browser globals (`XMLHttpRequest`, `navigator`, `document`, `window`) required by `@babylonjs/core` at import time.

## Dev Harness

```bash
pnpm dev    # Opens browser with visual test scene
```

Visual verification: 32x32 tilemap with cascaded shadows, torch flicker, day/night cycle, glow layer with mesh controls, sky background, parallax layers, mouse orbit, FPS logging.

## Known Limitations

- Quality preset `hardwareScalingLevel` is computed but not yet applied to the engine (requires `engine.setHardwareScalingLevel()` after creation)
- WebGPU path is untested in CI (requires GPU-capable browser)
- `attachControl` is not called by the runtime — consumers must call it on the camera with their canvas
- Procedural sky uses a BackgroundMaterial color approximation, not a full atmospheric scattering shader
- Parallax texture loading is synchronous in NullEngine tests (no actual image data)
- Screen effects use billboard overlay planes rather than post-processing (simpler, works on all cameras)
