# Phase 18: Character Gen + Animation + Particles

**Status:** Not started
**Dependencies:** Phase 1 (Renderer -- sprite rendering and texture pipeline), Phase 2 (Editor Shell -- component hosting and tool panel infrastructure)
**Estimated weeks:** 2 (Weeks 37-38)

## Goal

Visual editors for character assembly, frame-by-frame animation, and particle effects. Runtime particle system renders designed effects in-game.

---

## Sub-phase 18.1: Character Generator

- Layered character assembly (body, hair, face, clothing, accessories)
- Per-layer color tinting and hue shifting
- Live preview of assembled character
- Export composite sprite sheet

### Files

```
packages/products/webforge/editor/src/lib/components/tools/CharacterGenerator.svelte
```

### Acceptance Criteria

- Character generator displays available layers (body, hair, face, clothing, accessories)
- Each layer supports independent selection from available assets
- Per-layer color tinting applies and previews in real-time
- Per-layer hue shifting applies and previews in real-time
- Live preview composites all visible layers into a single character view
- Export produces a composite sprite sheet suitable for runtime use

---

## Sub-phase 18.2: Animation Editor

- Frame-by-frame animation timeline
- Onion skinning for adjacent frames
- Playback controls (play, pause, step, loop, speed)
- Keyframe interpolation for smooth transitions

### Files

```
packages/products/webforge/editor/src/lib/components/tools/AnimationEditor.svelte
```

### Acceptance Criteria

- Timeline displays animation frames with drag-to-reorder
- Frame-by-frame editing modifies individual frames
- Onion skinning overlays previous/next frames with configurable opacity
- Playback controls work (play, pause, step forward, step backward, loop toggle, speed slider)
- Keyframe interpolation generates smooth in-between frames
- Animation data exports in a format the runtime consumes

---

## Sub-phase 18.3: Particle Editor + Runtime

- Visual particle effect designer with live preview
- Configurable emitter shape, rate, lifetime, velocity, color gradient, size curve
- Gravity, wind, and turbulence forces
- Runtime particle manager renders designed effects in-game

### Files

```
packages/products/webforge/editor/src/lib/components/tools/ParticleEditor.svelte
packages/products/webforge/runtime/src/rendering/particle-manager.ts
```

### Acceptance Criteria

- Particle editor displays live preview of the configured effect
- Emitter shape is configurable (point, circle, rectangle, cone)
- Emission rate, particle lifetime, and max particle count are adjustable
- Velocity, direction, and spread parameters control particle motion
- Color gradient over lifetime renders and is editable
- Size curve over lifetime renders and is editable
- Gravity, wind, and turbulence forces affect particle movement
- Runtime particle manager loads effect data and renders particles in-game
- Particle effects start, stop, and loop on command from events

---

## Test Plan (Skeleton)

### Schema Tests

- CharacterLayerSchema validates layer type, asset reference, tint color, and hue offset
- CharacterCompositeSchema validates ordered layer array and export configuration
- AnimationFrameSchema validates frame index, duration, and sprite reference
- AnimationDataSchema validates frame sequence, loop flag, and playback speed
- ParticleEffectSchema validates emitter shape, rate, lifetime range, velocity range, color gradient stops, and size curve points
- ParticleForceSchema validates gravity vector, wind direction, and turbulence intensity

### Logic Tests

- Character layer compositing: layers render in correct z-order with tint and hue applied
- Animation frame timing: frames advance at correct intervals matching configured duration
- Particle emission rates: emitter spawns correct number of particles per second
- Particle lifetime curves: particles follow size and color curves over their lifetime
- Keyframe interpolation: in-between frames interpolate position/rotation/scale correctly
- Color tint application: tint modifies base sprite colors without affecting alpha
- Hue shift calculation: hue rotation produces expected color output

### Integration Tests

- Character generator to runtime: create character in editor, export sprite sheet, load in runtime, verify rendering
- Animation editor to runtime: create animation in editor, export data, play in runtime, verify frame sequence
- Particle editor to runtime: design effect in editor, export data, trigger in runtime, verify visual output
- Event-triggered particles: event command starts particle effect at map position, effect renders and loops/stops as configured

### Visual Verification

- Character generator layer compositing with multiple layers visible
- Color tinting and hue shifting preview accuracy
- Animation editor timeline with onion skinning overlay
- Animation playback at various speeds
- Particle effect rendering with color gradient and size curves
- Particle forces (gravity, wind, turbulence) producing natural motion
- Runtime particle effects matching editor preview
