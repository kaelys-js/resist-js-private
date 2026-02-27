# Camera System Architecture

## Overview

The WebForge camera system provides 16 configurable presets spanning gameplay,
editing, and cinematic use cases. It is built on Babylon.js `ArcRotateCamera`
(orbit) and `UniversalCamera` (first-person).

## Preset Table

| Preset | Camera Type | Angle | Orbit | Pan | Description |
|--------|-------------|-------|-------|-----|-------------|
| `hd2d` | ArcRotate | 45° iso | Locked alpha | No | Octopath Traveler-style (default) |
| `topdown` | ArcRotate | 90° overhead | Locked | No | Pure top-down view |
| `sideview` | ArcRotate | 0° pitch | Locked | No | Pure side-on (2D) |
| `firstperson` | Universal | FPS | N/A | N/A | WASD + mouse look |
| `cinematic` | ArcRotate | Low angle | Free | No | Wide FOV, heavy inertia |
| `free` | ArcRotate | 45° | Free | Yes | Unrestricted editor orbit |
| `isometric` | ArcRotate | 35.264° | Locked | No | True isometric (Diablo) |
| `tactical` | ArcRotate | 30° steep | Locked alpha | Yes | SRPG grid view |
| `thirdperson` | ArcRotate | 60° shoulder | Free | No | Close follow camera |
| `rts` | ArcRotate | 36° tilt | Locked alpha | Yes | RTS battlefield overview |
| `dungeon` | ArcRotate | 22.5° steep | Locked | No | Dungeon crawler close-up |
| `platformer` | ArcRotate | Side-on | Locked | No | 2.5D platformer, tight FOV |
| `panoramic` | ArcRotate | 45° | Free | No | Ultra-wide FOV panorama |
| `orbit` | ArcRotate | 45° | Free + auto | No | Auto-rotating showcase |
| `editor` | ArcRotate | 45° | Free | Yes | Level editor, zero inertia |
| `mapeditor` | ArcRotate | Top-down | Locked | Yes | Orthographic, RPG Maker-style |

## File Structure

```
runtime/src/
  schemas/camera-config.ts   — Valibot schema (CameraPresetSchema, CameraConfigSchema)
  core/camera-controller.ts  — Controller (PRESET_DEFAULTS, createCamera, switchCameraPreset, resetCamera)
  core/camera-controller.test.ts — Tests (882+ assertions)
```

## Key Concepts

### Preset Defaults vs Schema Defaults

Numeric fields like `alpha`, `beta`, `radius`, `inertia`, and `panningSensibility`
are `v.optional()` in the schema **without** a default value. The camera controller
applies the correct preset default when the field is `undefined`. This ensures
explicit user overrides always win.

### Camera Creation Flow

```
createCamera(scene, config)
  -> safeParse(CameraConfigSchema, config)    // Validate
  -> resolvePreset(cfg)                        // Legacy mode mapping
  -> if firstperson: createFirstPersonCamera() // UniversalCamera
  -> else: createArcRotateCamera()             // ArcRotateCamera
     -> apply orthographic mode (mapeditor)
     -> apply auto-rotation (orbit)
```

### Preset Switching

`switchCameraPreset()` interpolates alpha, beta, radius, fov, and inertia between
presets using configurable easing. Alpha/beta limits are unlocked during transition
and re-applied at completion.

### Orthographic Mode (mapeditor)

The `mapeditor` preset sets `camera.mode = ORTHOGRAPHIC_CAMERA` with symmetric
ortho bounds controlled by the `orthoSize` config field (default: 20). This gives
an RPG Maker XP/2003/MV/MZ-style tile editing view.

### Auto-Rotation (orbit)

The `orbit` preset enables `camera.useAutoRotationBehavior = true`, which uses
Babylon.js built-in `AutoRotationBehavior` for smooth continuous orbiting.

### Reset Camera

`resetCamera()` instantly applies all preset defaults to a camera without animation.
Useful for recovering from manual camera manipulation.
