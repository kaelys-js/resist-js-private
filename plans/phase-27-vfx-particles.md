# Phase 27: VFX + Particle Engine

GPU-accelerated particle system and visual effects engine. Provides the foundational VFX runtime that Phase 8 (weather effects), Phase 18.3 (particle editor), and the battle system (spell/skill effects) build upon.

**Package:** `@webforge/runtime`

---

## 27.1 GPU Particle System Core

High-performance particle system using Babylon.js compute shaders (WebGPU) with WebGL2 fallback.

### Files
- `packages/products/webforge/runtime/src/vfx/particle-system.ts` — Core particle system manager
- `packages/products/webforge/runtime/src/vfx/particle-emitter.ts` — Emitter shapes and emission logic
- `packages/products/webforge/runtime/src/vfx/particle-affectors.ts` — Lifetime modules: velocity, color, size, rotation, gravity, noise
- `packages/products/webforge/runtime/src/schemas/vfx-config.ts` — Valibot schemas for particle system configuration
- `packages/products/webforge/runtime/src/vfx/*.test.ts`

### Schemas
- **ParticleSystemConfigSchema** — `maxParticles` (Num, 1-100000), `emissionRate` (Num), `lifetime` (min/max Num), `worldSpace` (Bool), `preWarm` (Bool), `simulationSpeed` (Num)
- **EmitterShapeSchema** — `type` (picklist: 'point', 'sphere', 'hemisphere', 'cone', 'box', 'circle', 'edge', 'mesh-surface'), shape-specific params (radius, angle, dimensions)
- **ParticleModuleSchema** — Array of modules: `velocity` (initial direction + speed + spread), `colorOverLifetime` (gradient), `sizeOverLifetime` (curve), `rotationOverLifetime` (speed + random), `gravity` (Vector3), `noise` (frequency, amplitude, scroll speed), `velocityOverLifetime` (linear/orbital/radial)

### Implementation
- Use Babylon.js `ParticleSystem` or `GPUParticleSystem` depending on backend
- `GPUParticleSystem` for WebGPU (compute shader simulation, millions of particles)
- `ParticleSystem` fallback for WebGL2 (CPU simulation, thousands of particles)
- Automatic backend selection based on engine capabilities
- Object pooling for particle instances
- `createParticleSystem(scene, config): BabylonResult<ManagedParticleSystem>`
- `ManagedParticleSystem`: start, stop, reset, dispose, setEmissionRate, setWorldPosition

---

## 27.2 Sprite Sheet Animation

Frame-based animated particle textures with atlas support.

### Files
- `packages/products/webforge/runtime/src/vfx/sprite-sheet-animation.ts` — Sprite sheet UV animation for particles
- `packages/products/webforge/runtime/src/vfx/texture-atlas.ts` — Texture atlas management for VFX textures
- `packages/products/webforge/runtime/src/schemas/sprite-sheet-config.ts`
- `packages/products/webforge/runtime/src/vfx/sprite-sheet-animation.test.ts`

### Features
- **Sprite sheet particles** — Animate through frames of a sprite sheet texture over particle lifetime
- **Atlas packing** — Multiple small VFX textures packed into a single atlas to reduce draw calls
- **Blend modes** — Additive (fire, glow), alpha (smoke, dust), multiply (shadows), screen (light rays)
- **Sub-UV animation** — Configure rows × columns in atlas, frame rate, random start frame, loop/clamp modes
- **Billboard modes** — Camera-facing (default), velocity-aligned, free rotation, horizontal-only

### Schemas
- **SpriteSheetConfigSchema** — `rows` (Num), `columns` (Num), `frameRate` (Num), `startFrame` (optional Num or 'random'), `playMode` (picklist: 'loop', 'clamp', 'ping-pong')
- **BlendModeSchema** — picklist: 'alpha', 'additive', 'multiply', 'screen'

---

## 27.3 Spell/Skill Effects

Pre-built effect templates and a sequencing system for battle VFX.

### Files
- `packages/products/webforge/runtime/src/vfx/effect-sequence.ts` — Timed sequence of VFX, audio, and camera actions
- `packages/products/webforge/runtime/src/vfx/effect-library.ts` — Pre-built effect templates (fire, ice, lightning, heal, etc.)
- `packages/products/webforge/runtime/src/schemas/effect-sequence-config.ts`
- `packages/products/webforge/runtime/src/vfx/effect-sequence.test.ts`

### Effect Sequence System
- An effect sequence is a timeline of keyframed events:
  - `spawn-particles` — Create a particle system at a position/target
  - `play-sound` — Play a sound effect
  - `camera-shake` — Trigger screen shake
  - `flash` — Screen flash (white, red, etc.)
  - `animation` — Play a sprite sheet animation at a position
  - `wait` — Pause the sequence for N milliseconds
  - `callback` — Run a custom function (for game state changes like applying damage)
- `createEffectSequence(scene, config): BabylonResult<EffectSequence>`
- `EffectSequence.play(): Promise<Result<Bool>>` — resolves when sequence completes
- `EffectSequence.stop()`, `EffectSequence.dispose()`

### Schemas
- **EffectSequenceConfigSchema** — `name` (Str), `events` (array of EffectEventSchema)
- **EffectEventSchema** — `time` (Num ms), `type` (picklist of event types), type-specific params
- **EffectTargetSchema** — `type` (picklist: 'caster', 'target', 'screen-center', 'world-position'), position offsets

### Pre-built Effect Templates
- **Elemental:** Fire burst, ice shards, lightning bolt, water splash, earth spike, wind slash, light pillar, dark vortex
- **Physical:** Sword slash, arrow impact, blunt impact, critical hit flash
- **Healing:** Green particles rising, warm glow, sparkle burst
- **Status:** Poison drip, burn flicker, freeze crystal, sleep Z's, buff glow (red/blue/green)
- **Projectile:** Fireball arc, arrow trajectory, magic missile homing

---

## 27.4 Screen Effects

Full-screen visual effects that complement Phase 1.4's post-processing pipeline.

### Files
- `packages/products/webforge/runtime/src/vfx/screen-shake.ts` — Camera shake with configurable intensity, frequency, and decay
- `packages/products/webforge/runtime/src/vfx/screen-flash.ts` — Screen color flash with fade
- `packages/products/webforge/runtime/src/vfx/screen-fade.ts` — Fade in/out (black, white, custom color)
- `packages/products/webforge/runtime/src/vfx/screen-effects.ts` — Chromatic aberration burst, radial blur, vignette pulse
- `packages/products/webforge/runtime/src/schemas/screen-effect-config.ts`
- `packages/products/webforge/runtime/src/vfx/screen-effects.test.ts`

### Screen Shake
- `triggerScreenShake(camera, config): Result<() => void>` — returns stop function
- Config: `intensity` (Num, pixels), `frequency` (Num, Hz), `duration` (Num, ms), `decay` (picklist: 'linear', 'exponential', 'none'), `axes` (picklist: 'xy', 'x', 'y')
- Frame-rate independent: uses Perlin noise for organic feel, not random jitter
- Multiple shakes stack additively

### Screen Flash
- `triggerScreenFlash(scene, config): Result<Bool>`
- Config: `color` (ColorRgba), `duration` (Num, ms), `fadeMode` (picklist: 'fade-out', 'fade-in-out', 'instant')
- Implemented as fullscreen quad with alpha animation

### Screen Fade
- `fadeToColor(scene, config): Promise<Result<Bool>>`
- Config: `color` (ColorRgba), `duration` (Num, ms), `hold` (optional Num, ms — hold at full opacity before fading back)
- Used for map transitions, battle transitions, cutscene fades

### Advanced Effects
- **Chromatic aberration burst** — Brief RGB channel separation on impact (post-process shader)
- **Radial blur** — Zoom blur from center or impact point (post-process shader)
- **Vignette pulse** — Darken screen edges rhythmically (damage indicator, low HP)
- These integrate with Phase 1.4's post-processing pipeline as togglable effects

---

## 27.5 Trail Renderer

Ribbon/trail meshes for movement visualization.

### Files
- `packages/products/webforge/runtime/src/vfx/trail-renderer.ts` — Trail mesh generation and animation
- `packages/products/webforge/runtime/src/schemas/trail-config.ts`
- `packages/products/webforge/runtime/src/vfx/trail-renderer.test.ts`

### Features
- `createTrailRenderer(scene, config): BabylonResult<TrailRenderer>`
- Generates a ribbon mesh that follows a moving point, fading over time
- Config: `width` (Num), `lifetime` (Num, seconds), `minVertexDistance` (Num — minimum distance between trail points), `textureMode` (picklist: 'stretch', 'tile'), `color` (gradient over lifetime), `blendMode`
- Trail types:
  - **Ribbon trail** — Flat ribbon perpendicular to movement direction (sword slashes)
  - **Tube trail** — 3D tube following path (projectile trails, magic streams)
  - **Fading trail** — Points fade to transparent over lifetime (movement trails, sparkle paths)
- `TrailRenderer.addPoint(position: Vector3)` — call each frame for moving objects
- `TrailRenderer.clear()`, `TrailRenderer.dispose()`
- Uses Babylon.js `MeshBuilder.CreateRibbon` with dynamic vertex updates

---

## 27.6 Environmental Particles

Ambient atmospheric particles (distinct from Phase 8 weather which covers rain/snow/storms).

### Files
- `packages/products/webforge/runtime/src/vfx/environmental-particles.ts` — Ambient particle presets
- `packages/products/webforge/runtime/src/schemas/environmental-config.ts`
- `packages/products/webforge/runtime/src/vfx/environmental-particles.test.ts`

### Presets
- **Dust motes** — Slow-drifting particles in light shafts, slight turbulence, warm color
- **Fireflies** — Glowing dots with random wandering paths, pulse brightness, nighttime only
- **Falling leaves** — Leaf-shaped billboards with spinning rotation, gentle downward drift, seasonal colors
- **Underwater bubbles** — Rise from ground/objects, wobble side-to-side, pop at surface
- **Embers** — Orange/red particles rising from fire sources, brief lifetime, additive blend
- **Spores** — Mushroom/plant areas, slow float upward, green/purple tint
- **Snowfall (light)** — Gentle flurries for non-storm scenes (heavy snow is Phase 8 weather)
- **Pollen** — Spring/meadow scenes, tiny yellow dots drifting on wind

### Schema
- **EnvironmentalConfigSchema** — `preset` (picklist of above presets), `density` (Num, 0-1), `bounds` (box or sphere around camera), `windInfluence` (Num, 0-1 — how much Phase 8's wind affects these particles), `colorTint` (optional ColorRgba override)

### Implementation
- All presets use the core particle system from 27.1
- Camera-relative bounds: particles spawn/despawn around camera, not globally
- LOD: reduce density at distance, disable when camera zoomed out past threshold
- Integrate with Phase 8 wind system: environmental particles respond to wind direction/speed

---

## Dependencies

- **Requires:** Phase 1 (renderer, post-processing pipeline for screen effects)
- **Consumed by:** Phase 8 (weather uses particle engine), Phase 9 (battle spell effects), Phase 18.3 (particle editor provides UI for configuring these systems)

## Testing Strategy

1. **Schema tests** — Particle system config validation, effect sequence schema, emitter shape params
2. **Logic tests** — Emitter shape math (point distribution on sphere/cone/etc.), color gradient interpolation, trail vertex generation, screen shake Perlin noise
3. **Integration tests** — Create particle system with NullEngine, verify particle count after emission, verify disposal cleans up all resources
4. **Visual verification** — Dev harness scene with all effect types: fire particles, sword slash trail, screen shake on click, environmental dust motes
