# Engine

The engine module creates and manages the Babylon.js rendering engine, including WebGPU/WebGL2 backend selection, render loop lifecycle, and quality presets.

## Overview

`createEngine()` wraps Babylon.js engine creation with schema-validated configuration, automatic WebGPU detection with WebGL2 fallback, and device-adaptive defaults. The engine is the first system created and the last disposed.

## Architecture

```
EngineConfigSchema (Valibot)
  -> safeParse + validate
  -> BABYLON.Engine or BABYLON.WebGPUEngine
  -> startRenderLoop / stopRenderLoop
  -> resize observer
  -> disposeEngine
```

## Configuration Reference

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `antialias` | Bool | `true` | -- | Enable MSAA anti-aliasing |
| `adaptToDeviceRatio` | Bool | `true` | -- | Scale to device pixel ratio |
| `powerPreference` | Enum | `'high-performance'` | `'default'`, `'high-performance'`, `'low-power'` | GPU power preference |
| `enableWebGPU` | Bool | `false` | -- | Attempt WebGPU (falls back to WebGL2) |
| `preserveDrawingBuffer` | Bool | `false` | -- | Preserve buffer for screenshots |
| `stencil` | Bool | `true` | -- | Enable stencil buffer |
| `depth` | Bool | `true` | -- | Enable depth buffer |
| `premultipliedAlpha` | Bool | `true` | -- | Premultiplied alpha blending |
| `failIfMajorPerformanceCaveat` | Bool | `false` | -- | Fail on software rendering |
| `useExactSrgbConversions` | Bool | `true` | -- | Exact sRGB color conversions |

## Quality Presets

Quality presets configure shadow resolution, texture quality, and particle counts. Applied via `applyQualityPreset()`.

| Preset | Shadow Resolution | Use Case |
|--------|-------------------|----------|
| `low` | 512 | Low-end hardware, mobile |
| `medium` | 1024 | Balanced (default) |
| `high` | 2048 | Desktop gaming |
| `ultra` | 4096 | High-end desktop |

## API

| Function | Signature | Description |
|----------|-----------|-------------|
| `createEngine` | `(canvas, config) -> Result<EngineHandle>` | Create engine with config |
| `disposeEngine` | `(handle) -> Result<Void>` | Dispose engine and resources |
| `startRenderLoop` | `(engine, scene) -> Result<Void>` | Start frame rendering |
| `stopRenderLoop` | `(engine) -> Result<Void>` | Pause rendering |
| `applyQualityPreset` | `(engine, preset) -> Result<Void>` | Apply quality preset |

## Usage

```typescript
import { createEngine, startRenderLoop, disposeEngine } from '@webforge/runtime';

const engineResult = createEngine(canvas, {
  antialias: true,
  adaptToDeviceRatio: true,
  powerPreference: 'high-performance',
});
if (!engineResult.ok) return engineResult;

const { engine } = engineResult.data;
startRenderLoop(engine, scene);

// Later...
disposeEngine(engineResult.data);
```

## Files

| File | Purpose |
|------|---------|
| `schemas/engine-config.ts` | Engine configuration schema |
| `schemas/quality-config.ts` | Quality preset schema + 4 presets |
| `core/engine.ts` | Engine creation, render loop, disposal |
| `core/performance-monitor.ts` | FPS and frame time tracking |
