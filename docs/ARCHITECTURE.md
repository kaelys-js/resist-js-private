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

---

## Fog System

### Overview

Three-tier fog system providing basic scene fog, advanced depth-based effects,
and procedural overlay texture layers. 77+ configurable options across 12
sub-schemas with 14 curated presets.

### File Structure

```
runtime/src/
  schemas/fog-config.ts                — Valibot schemas (FogConfigSchema + 12 sub-schemas)
  rendering/fog-manager.ts             — Lifecycle (applyFog, updateFog, applyFogPreset, disposeFog)
  rendering/fog-presets.ts             — 14 presets (clear through volcanic)
  rendering/fog-shader.ts              — GLSL shaders + PostProcess factories
  rendering/fog-overlay-textures.ts    — 5 procedural noise generators
  rendering/fog-manager.test.ts        — Tests (21 tests)
  rendering/fog-presets.test.ts        — Tests (46 tests)
  rendering/fog-overlay-textures.test.ts — Tests (32 tests)
```

### Three-Tier Architecture

```
Tier 1: Scene Fog (Babylon.js built-in)
  scene.fogMode → linear | exponential | exponential²
  scene.fogColor, fogDensity, fogStart, fogEnd

Tier 2: Advanced Fog PostProcess (depth-based)
  DepthRenderer → world-space position reconstruction
  → Height fog (baseHeight, falloff, density, offset)
  → Second fog layer (independent density + height)
  → Inscattering (sun-direction color bleeding)
  → Atmospheric scattering (per-channel extinction + inscattering)
  → Noise perturbation (FBM, octaves, lacunarity)
  → Wind displacement (direction, speed, turbulence)
  → Density animation (sine/triangle/sawtooth waveform)
  → Day/night color + density blending

Tier 3: Overlay Fog PostProcess (texture-based)
  4 independent layers, each with:
  → Procedural texture (perlin | worley | clouds | wisps | smoke)
  → Blend mode (normal | additive | multiply | screen)
  → Scroll speed, scale, hue rotation
  → Vignette masking (9 types: radial, border, directional edges)
```

### Fog Handle Pattern

`applyFog()` returns a `FogHandle` that owns all fog resources:

- `advancedPP` — Advanced fog PostProcess (nullable)
- `overlayPP` — Overlay fog PostProcess (nullable)
- `overlayTextures` — Generated `RawTexture[]` for overlay layers
- `depthRenderer` — Scene depth renderer (nullable)
- `observer` — Per-frame time accumulation observer
- `elapsedTime` — Accumulated time for shader animation
- `config`, `scene`, `camera`, `engine` — References for updates

`updateFog()` patches the handle's config and updates shader uniforms.
`disposeFog()` disposes PostProcesses, textures, depth renderer, and observer.

### 14 Built-in Presets

| Preset | Mode | Density | Features |
|--------|------|---------|----------|
| clear | none | 0 | No fog |
| lightMist | exponential | 0.003 | Subtle atmosphere |
| morningFog | exponential² | 0.008 | Height fog + wisps overlay + wind |
| denseFog | exponential | 0.04 | Clouds overlay |
| dungeon | exponential² | 0.02 | Dark + smoke overlay |
| underwater | exponential | 0.06 | Blue-green tint |
| forest | exponential | 0.01 | Height fog + perlin overlay |
| mountain | exponential² | 0.005 | Elevated height fog + clouds overlay |
| sandstorm | exponential | 0.035 | Strong wind + smoke overlay |
| snowstorm | exponential | 0.03 | Strong wind + perlin overlay |
| dream | exponential² | 0.012 | Purple + wisps overlay |
| volcanic | exponential | 0.025 | Red-orange + steep height fog + smoke overlay |
| swamp | exponential | 0.015 | Murky green + height fog + worley overlay |
| nightMist | exponential² | 0.006 | Very dark + wisps overlay |

### API Functions

| Function | Purpose |
|----------|---------|
| `applyFog` | Create full fog system from config |
| `updateFog` | Update fog parameters at runtime |
| `applyFogPreset` | Apply a named preset |
| `disposeFog` | Dispose all fog resources |
| `generateOverlayTexture` | Generate procedural noise texture data |
