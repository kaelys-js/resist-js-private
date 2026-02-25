# @webforge/runtime

Babylon.js HD-2D game runtime for WebForge RPG. Provides engine initialization, camera control, scene setup, performance monitoring, and debug tools in a single lifecycle API.

## Architecture

```
src/
├── runtime.ts                  # Orchestrator: composes all modules into a lifecycle
├── index.ts                    # Public API surface
├── core/
│   ├── babylon-result.ts       # BabylonResult<T> — mutable-safe Result variant
│   ├── engine.ts               # Engine creation (WebGPU/WebGL2/NullEngine), render loop, resize, dispose
│   ├── camera-controller.ts    # HD-2D ArcRotateCamera with editor/gameplay modes + smooth follow
│   ├── performance-monitor.ts  # SceneInstrumentation wrapper for FPS/frame metrics
│   └── debug-inspector.ts      # Lazy-loaded Babylon.js inspector toggle
├── rendering/
│   └── scene-setup.ts          # Scene defaults: clear color, ambient, fog, hemispheric light
├── schemas/
│   ├── engine-config.ts        # EngineConfig schema (renderer, antialias, stencil, etc.)
│   ├── camera-config.ts        # CameraConfig schema (dual editor/gameplay modes)
│   ├── scene-setup-config.ts   # SceneSetupConfig + ColorRgba + FogConfig schemas
│   └── quality-config.ts       # QualityConfig schema + QUALITY_PRESETS (low/medium/high/ultra)
├── test-setup.ts               # Vitest polyfills for NullEngine (XMLHttpRequest, navigator, document)
└── dev/
    ├── index.html              # Visual test harness
    ├── dev.ts                  # Harness entry: runtime + ground plane + metrics logging
    └── vite.config.ts          # Vite dev server config
```

### Data Flow

```
RuntimeConfig → createRuntime()
  ├── applyQualityPreset() → EngineConfig with preset overrides
  ├── createBabylonEngine(config, canvas) → BabylonEngineInstance
  ├── applySceneSetup(scene, sceneConfig) → clear color, ambient, fog, light
  ├── createHd2dCamera(scene, cameraConfig) → ArcRotateCamera
  └── createPerformanceMonitor(scene) → PerformanceMonitor (if debug)
  → RuntimeInstance
```

### Key Abstractions

**BabylonResult\<T\>** — Babylon.js objects are mutable and can't survive `DeepReadonly<T>` from the standard `Result<T>`. `BabylonResult<T>` preserves mutability while remaining assignable to `Result<T>`.

**Dual camera modes** — Editor mode: free orbit, XZ panning, zero inertia. Gameplay mode: locked rotation, no panning, momentum inertia. Mode-dependent defaults are applied post-validation; explicit config values always win.

**Quality presets** — `low`, `medium`, `high`, `ultra` map to hardware scaling, antialias, stencil, and device ratio settings. Presets provide defaults that explicit engine config overrides.

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
| `startRenderLoop(instance)` | `Result<Bool>` | Start rendering (guards against stacking) |
| `stopRenderLoop(instance)` | `Result<Bool>` | Stop rendering |
| `registerResizeHandler(instance, canvas)` | `Result<() => void>` | ResizeObserver on canvas parent |
| `disposeEngine(instance)` | `Result<Bool>` | Dispose scene then engine |

### Camera

| Function | Returns | Description |
|----------|---------|-------------|
| `createHd2dCamera(scene, config)` | `BabylonResult<ArcRotateCamera>` | HD-2D camera (editor or gameplay mode) |
| `updateCameraTarget(camera, options)` | `Result<Bool>` | Frame-rate independent smooth follow |

### Scene & Rendering

| Function | Returns | Description |
|----------|---------|-------------|
| `applySceneSetup(scene, config)` | `Result<Bool>` | Apply clear color, ambient, fog, default light |

### Performance & Debug

| Function | Returns | Description |
|----------|---------|-------------|
| `createPerformanceMonitor(scene)` | `BabylonResult<PerformanceMonitor>` | SceneInstrumentation wrapper |
| `getMetrics(monitor)` | `Result<PerformanceMetrics>` | FPS, frame time, render time, draw calls |
| `disposePerformanceMonitor(monitor)` | `Result<Bool>` | Dispose instrumentation |
| `showInspector(scene, embedMode)` | `Promise<Result<Bool>>` | Lazy-load and show Babylon.js inspector |
| `hideInspector(scene)` | `Result<Bool>` | Hide inspector |

### Schemas

`EngineConfigSchema`, `CameraConfigSchema`, `SceneSetupConfigSchema`, `ColorRgbaSchema`, `FogConfigSchema`, `QualityConfigSchema`, `RuntimeConfigSchema`

### Types

`BabylonResult<T>`, `BabylonEngineInstance`, `RuntimeInstance`, `RuntimeConfig`, `EngineConfig`, `CameraConfig`, `CameraTargetOptions`, `SceneSetupConfig`, `ColorRgba`, `FogConfig`, `QualityConfig`, `QualityPresetSettings`, `PerformanceMonitor`, `PerformanceMetrics`

## Usage

```typescript
import { createRuntime, startRenderLoop, disposeRuntime } from '@webforge/runtime';

const result = await createRuntime({
  engine: { canvasId: 'game-canvas' },
  camera: { mode: 'editor' },
});
if (!result.ok) return result;

startRenderLoop(result.data.engine);

// Later:
disposeRuntime(result.data);
```

## Testing

181 tests across 11 files covering schemas, engine lifecycle, camera modes, scene setup, performance monitoring, and debug inspector.

```bash
pnpm qa:test          # Run all tests
pnpm qa:type-check    # Type check
pnpm qa:lint          # Lint
pnpm qa:format:check  # Format check
```

Tests use `NullEngine` for headless Babylon.js execution in Vitest. The `test-setup.ts` file polyfills browser globals (`XMLHttpRequest`, `navigator`, `document`, `window`) required by `@babylonjs/core` at import time.

## Dev Harness

```bash
pnpm dev    # Opens browser with ground plane + editor camera
```

Visual verification: dark blue-gray background, wireframe ground, hemispheric light, mouse orbit, resize handling, FPS logging in console.

## Known Limitations

- Quality preset `hardwareScalingLevel` is computed but not yet applied to the engine (requires `engine.setHardwareScalingLevel()` after creation)
- WebGPU path is untested in CI (requires GPU-capable browser)
- `attachControl` is not called by the runtime — consumers must call it on the camera with their canvas
