# Camera

The camera system provides 16 configurable presets spanning gameplay, editing, and cinematic use cases. Built on Babylon.js `ArcRotateCamera` (orbit) and `UniversalCamera` (first-person).

## Overview

Each preset defines camera angle, orbit constraints, panning behavior, FOV, and inertia. Presets can be switched at runtime with smooth animated transitions. The system supports orthographic mode (map editor), auto-rotation (showcase), and FF Tactics-style 90-degree rotation steps.

## Preset Table

| Preset | Camera Type | Angle | Orbit | Pan | Description |
|--------|-------------|-------|-------|-----|-------------|
| `hd2d` | ArcRotate | 45 deg iso | Locked alpha | No | Octopath Traveler-style (default) |
| `topdown` | ArcRotate | 90 deg overhead | Locked | No | Pure top-down view |
| `sideview` | ArcRotate | 0 deg pitch | Locked | No | Pure side-on (2D) |
| `firstperson` | Universal | FPS | N/A | N/A | WASD + mouse look |
| `cinematic` | ArcRotate | Low angle | Free | No | Wide FOV, heavy inertia |
| `free` | ArcRotate | 45 deg | Free | Yes | Unrestricted editor orbit |
| `isometric` | ArcRotate | 35.264 deg | Locked | No | True isometric (Diablo) |
| `tactical` | ArcRotate | 30 deg steep | Locked alpha | Yes | SRPG grid view |
| `thirdperson` | ArcRotate | 60 deg shoulder | Free | No | Close follow camera |
| `rts` | ArcRotate | 36 deg tilt | Locked alpha | Yes | RTS battlefield overview |
| `dungeon` | ArcRotate | 22.5 deg steep | Locked | No | Dungeon crawler close-up |
| `platformer` | ArcRotate | Side-on | Locked | No | 2.5D platformer, tight FOV |
| `panoramic` | ArcRotate | 45 deg | Free | No | Ultra-wide FOV panorama |
| `orbit` | ArcRotate | 45 deg | Free + auto | No | Auto-rotating showcase |
| `editor` | ArcRotate | 45 deg | Free | Yes | Level editor, zero inertia |
| `mapeditor` | ArcRotate | Top-down | Locked | Yes | Orthographic, RPG Maker-style |

## Configuration Reference

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `preset` | Enum | `'hd2d'` | 16 presets | Camera behavior preset |
| `alpha` | Num | (per preset) | -- | Horizontal orbit angle (radians) |
| `beta` | Num | (per preset) | -- | Vertical orbit angle (radians) |
| `radius` | Num | (per preset) | >= 0.1 | Distance from target |
| `target` | Vector3 | `{x:0, y:0, z:0}` | -- | Camera look-at point |
| `fov` | Num | (per preset) | 0.1--3.14 | Field of view (radians) |
| `inertia` | Num | (per preset) | 0--1 | Camera movement smoothing |
| `speed` | Num | 1 | 0.1--10 | Camera movement speed |
| `minZ` | Num | 0.1 | >= 0.01 | Near clip plane |
| `maxZ` | Num | 1000 | -- | Far clip plane |
| `lowerRadiusLimit` | Num | (per preset) | -- | Minimum zoom distance |
| `upperRadiusLimit` | Num | (per preset) | -- | Maximum zoom distance |
| `lowerBetaLimit` | Num | (per preset) | -- | Min vertical angle |
| `upperBetaLimit` | Num | (per preset) | -- | Max vertical angle |
| `panningSensibility` | Num | (per preset) | -- | Pan speed (0 = disabled) |
| `wheelPrecision` | Num | 3 | 0.1--100 | Mouse wheel zoom speed |
| `orthoSize` | Num | 20 | >= 1 | Orthographic view size (mapeditor) |
| `autoRotationSpeed` | Num | 0.5 | -- | Auto-rotation speed (orbit preset) |

### Preset Defaults vs Schema Defaults

Numeric fields like `alpha`, `beta`, `radius`, `inertia`, and `panningSensibility` are optional in the schema without default values. The camera controller applies the correct preset default when a field is `undefined`. Explicit user overrides always win.

## Preset Switching

`switchCameraPreset()` interpolates alpha, beta, radius, FOV, and inertia between presets using configurable easing. Alpha/beta limits are unlocked during the transition and re-applied at completion.

```typescript
switchCameraPreset(camera, 'cinematic', {
  durationMs: 1000,
  easing: 'easeInOut',
});
```

## Orthographic Mode (mapeditor)

The `mapeditor` preset sets `camera.mode = ORTHOGRAPHIC_CAMERA` with symmetric ortho bounds controlled by `orthoSize` (default: 20). This provides an RPG Maker-style tile editing view.

## Auto-Rotation (orbit)

The `orbit` preset enables `camera.useAutoRotationBehavior = true`, which uses Babylon.js built-in `AutoRotationBehavior` for continuous orbiting.

## Refocus / Fit Map

`refocusOnTilemap()` computes the ideal camera position to view the entire tilemap and smoothly animates there. Works with all ArcRotateCamera presets. Returns an error for firstperson (UniversalCamera).

### Refocus Configuration

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `animated` | Bool | `true` | -- | Smooth transition vs instant snap |
| `durationMs` | Num | `800` | 100--3000 | Animation duration in milliseconds |
| `easing` | Enum | `'easeInOutCubic'` | 4 options | Easing curve for the transition |
| `paddingScale` | Num | `1.15` | 1.0--2.0 | Radius multiplier for breathing room |
| `resetElevation` | Bool | `true` | -- | Reset pitch to preset default |
| `resetOrbit` | Bool | `false` | -- | Reset orbit angle to preset default |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Refocus on entire tilemap |
| `Home` | Refocus on entire tilemap (alternative) |

### Radius Calculation

For perspective presets, the camera radius is computed as:

```
diagonal = hypot(mapWidth, mapHeight)
radius = (diagonal / 2) / sin(fov / 2) * paddingScale
```

## API

| Function | Signature | Description |
|----------|-----------|-------------|
| `createCamera` | `(scene, config) -> Result<Camera>` | Create camera from preset config |
| `switchCameraPreset` | `(camera, preset, options) -> Result<Void>` | Animated preset transition |
| `resetCamera` | `(camera, preset) -> Result<Void>` | Instant reset to preset defaults |
| `refocusOnTilemap` | `(options) -> Result<Handle>` | Animate camera to show entire tilemap |

## Files

| File | Purpose |
|------|---------|
| `schemas/camera-config.ts` | Camera preset schema + 16 preset enum + RefocusConfigSchema |
| `core/camera-controller.ts` | PRESET_DEFAULTS, createCamera, switchCameraPreset, resetCamera, refocusOnTilemap |
