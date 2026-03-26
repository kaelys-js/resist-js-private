# Phase 8: Lighting + Day/Night + Fog + Weather

**Status:** Not started
**Dependencies:** Phase 1.5 (Lighting + Day/Night, already implemented), Phase 4 (Game Map + Player + Movement)
**Estimated weeks:** 1.5 (Weeks 17-18)

## Goal

Weather particle system runtime, fog-of-war system, and screen-space effects (rain drops, heat distortion) fully functional. Extends the lighting and day/night work already completed in Phase 1.5.

---

## Sub-phase 8.1: Weather Particle System

- Weather particle system runtime with configurable emitters
- Particle presets: rain, snow, leaves, fireflies, fog, etc.
- Screen-space effects: rain drops on camera, heat distortion

### Files

```
packages/products/webforge/runtime/src/rendering/weather-system.ts
packages/products/webforge/runtime/src/rendering/particle-presets.ts
packages/products/webforge/runtime/src/rendering/screen-effects.ts
```

### Acceptance Criteria

- Weather system spawns and manages particle emitters at runtime
- Rain preset produces visible falling particles with correct angle and speed
- Snow preset produces slower, drifting particles with varied sizes
- Leaves preset produces tumbling particles with rotation
- Fireflies preset produces small glowing particles with random movement
- Fog preset produces translucent layered particles
- Screen-space rain drop effect renders on the camera
- Heat distortion effect warps the scene with a shimmer shader

---

## Sub-phase 8.2: Fog-of-War System

- Grid-based fog-of-war with per-tile visibility states (hidden, explored, visible)
- Player sight radius reveals tiles
- Explored tiles remain dimmed but visible
- Configurable per-map (enable/disable, sight radius, fog color)

### Files

```
packages/products/webforge/runtime/src/rendering/fog-of-war.ts
```

### Acceptance Criteria

- Fog-of-war grid covers the entire map with per-tile visibility
- Tiles within player sight radius are fully visible
- Tiles previously seen but outside current radius are dimmed (explored state)
- Tiles never seen are fully hidden
- Fog-of-war is configurable per map (enable/disable, sight radius, fog color)
- Performance remains stable on large maps (100x100+)

---

## Sub-phase 8.3: Weather Editor Tools

- Particle editor for creating and tuning custom weather presets
- Weather preset picker for selecting presets in the map properties

### Files

```
packages/products/webforge/editor/src/lib/components/tools/ParticleEditor.svelte
packages/products/webforge/editor/src/lib/components/tools/WeatherPresetPicker.svelte
```

### Acceptance Criteria

- Particle editor allows creating custom presets with configurable parameters (count, speed, size, color, lifetime, direction)
- Particle editor shows a live preview of the configured effect
- Weather preset picker lists all built-in and custom presets
- Selected preset is stored in map properties and activates at runtime

---

## Test Plan (Skeleton)

### Schema Tests

- WeatherSystem config schema validates emitter count, particle limits, and blend modes
- ParticlePreset schema validates speed range, size range, color, lifetime, direction, and rotation
- FogOfWar config schema validates sight radius (positive integer), fog color, and enable flag
- ScreenEffect schema validates effect type enum and shader parameter ranges

### Logic Tests

- Fog-of-war grid calculation: player at center reveals correct circular radius of tiles
- Fog-of-war grid calculation: tiles at exactly the sight radius boundary are included
- Fog-of-war grid calculation: moving player updates visible tiles and marks old tiles as explored
- Fog-of-war grid calculation: tiles behind walls remain hidden (if wall-aware mode enabled)
- Fog-of-war grid calculation: explored tiles do not revert to hidden state
- Weather preset validation: rain preset has downward direction, non-zero speed, small particle size
- Weather preset validation: snow preset has slower speed than rain, allows drift angle
- Weather preset validation: custom preset with out-of-range values returns error Result
- Particle emitter lifecycle: particles spawn, age, and despawn within their lifetime
- Particle emitter lifecycle: emitter respects max particle count limit

### Integration Tests

- Weather system + map load: map with weather preset activates the correct particle emitter on scene enter
- Weather system + day/night: weather appearance adjusts to current time-of-day lighting
- Fog-of-war + player movement: walking reveals tiles and updates the fog grid in real-time
- Fog-of-war + map transfer: transferring to a new map resets fog state for that map
- Particle editor + runtime: custom preset created in editor renders correctly in runtime
- Weather preset picker + map properties: selected preset persists across save/load

### Visual Verification

- Rain particles fall at a visible angle with splash effects near the ground
- Snow particles drift slowly with varied sizes and gentle horizontal movement
- Firefly particles glow and move in random patterns at night
- Fog-of-war renders as a dark overlay with smooth edges around the visible radius
- Explored tiles are visually dimmed compared to fully visible tiles
- Screen-space rain drops appear on the camera during rain weather
- Heat distortion effect creates a visible shimmer without obscuring gameplay
