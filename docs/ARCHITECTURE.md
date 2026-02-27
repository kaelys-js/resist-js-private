# WebForge Runtime Architecture

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

---

## Day/Night Cycle System

### Overview

Time-of-day lighting system that interpolates ambient, sun, moon, fog, and
clear colors across 9 default keyframes (midnight through dawn, noon, dusk, night).
Supports seasons, moon phases, indoor/cave modes, transition easing, post-FX
coupling, and event callbacks.

### File Structure

```
runtime/src/
  schemas/lighting-config.ts       — Schemas (DayNightCycleConfigSchema, TimeKeyframeSchema, SeasonSchema, etc.)
  rendering/day-night-cycle.ts     — Controller (createDayNightCycle, interpolateKeyframes, 15+ API functions)
  rendering/day-night-cycle.test.ts — Tests (75 tests, 934+ assertions)
```

### Key Concepts

#### Keyframe Interpolation

9 default keyframes define color/intensity snapshots at specific hours (0:00, 4:00,
5:30, 7:00, 12:00, 16:00, 18:30, 20:00, 22:00). The observer finds the two
bracketing keyframes and linearly interpolates all shared fields. Midnight
wrap-around is handled automatically.

#### Seasons

4 presets (spring, summer, autumn, winter) override `sunPath.sunrise`,
`sunPath.sunset`, and `sunPath.maxElevation` to shift day length and sun arc.
Explicit `sunPath` config values take priority over season presets.

#### Moon Phases

8 discrete phases (new moon through waning crescent) provide an intensity
multiplier [0.0–1.0] that scales `moonIntensity` post-interpolation.

#### Transition Easing

4 easing curves (linear, smooth/smoothstep, easeIn, easeOut) applied uniformly
to the interpolation factor between keyframes.

#### Indoor/Cave Mode

`indoorMode` overrides interpolated values with fixed tints: `indoor` uses warm
amber ambient, `cave` uses dark blue-tinted ambient. Time still advances for
callbacks in both modes.

#### Time Phases

8 auto-computed phases (dawn, morning, noon, afternoon, dusk, twilight, night,
midnight) derived from sun path sunrise/sunset, not hardcoded hours.

#### Post-FX Coupling

Optional `exposure`, `bloomWeight`, and `contrast` fields on keyframes are
interpolated alongside colors and can drive the post-processing pipeline.

#### Event Callbacks

Edge-detected callbacks on the instance: `onSunrise`, `onSunset`, `onHourChange`,
`onPhaseChange`. Fired during the per-frame observer when thresholds are crossed.

### API Functions

| Function | Purpose |
|----------|---------|
| `createDayNightCycle` | Create cycle with observer, lights, config |
| `setTimeOfDay` / `getTimeOfDay` | Set/get current time [0, 24) |
| `setSpeed` / `getSpeed` | Set/get cycle speed (game-hours/sec) |
| `setEnabled` / `isEnabled` | Start/stop cycle observer |
| `jumpToTime` | Jump to a specific time [0, 24) |
| `getCurrentPhase` | Get current time phase from instance |
| `setSeason` / `getSeason` | Change/read season at runtime |
| `setIndoorMode` / `getIndoorMode` | Change/read indoor mode at runtime |
| `interpolateKeyframes` | Pure math interpolation (testable without Babylon) |
| `computeSunDirection` | Sun position from time + sun path |
| `getSeasonSunPath` | Sun path overrides for a season |
| `getMoonPhaseInfo` | Moon phase name + intensity multiplier |
| `applyEasing` | Apply easing curve to interpolation factor |
| `computeTimePhase` | Classify time into phase based on sun path |
| `getIndoorTint` | Fixed tint values for indoor/cave modes |
| `fireCallbacks` | Edge-detect and fire event callbacks |
| `disposeDayNightCycle` | Clean up observer and references |
