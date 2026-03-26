# Screen Shake Expansion Design

## Context

The current screen shake system is minimal: raw `Math.random()` per frame (jittery, discouraged by all sources), linear-only decay, translational-only (no rotation or FOV), no trauma system, no additive stacking, and only 2 basic tests. This design replaces it with a professional trauma-based system matching Unity Cinemachine / UE5 / Godot quality.

## Architecture

### Trauma-Based Core

Replace raw random with Eiserloh/Godot trauma pattern:

- **Trauma** (0.0–1.0): Accumulated shake intensity. `addTrauma(amount)` stacks additively, clamped at 1.0.
- **Shake amount** = `trauma ^ traumaPower` (default power=2 for quadratic falloff).
- **Perlin noise** replaces `Math.random()` for smooth, continuous motion. Configurable seed, frequency, octaves.
- **Auto-decay**: trauma decreases each frame by `decayRate * deltaTime`.

### Three Shake Channels

| Channel | Property | Default Max | Notes |
|---------|----------|-------------|-------|
| Translation | Camera target X/Z | 0.5 world units | Horizontal displacement (no Y — avoids ground clipping) |
| Rotation | Camera roll via upVector | 0.05 radians (~3°) | Subtle rotation for realism |
| FOV | camera.fov offset | 0.03 radians (~2°) | Zoom punch for impacts |

Each channel has independent amplitude, frequency, and enable toggle.

### Envelope System (Attack/Sustain/Decay)

| Phase | Description | Default |
|-------|-------------|---------|
| Attack | Ramp from 0 to full trauma | 0 ms (instant onset) |
| Sustain | Hold at full trauma | 0 ms (immediate decay) |
| Decay | Fade from full to 0 | 300 ms |

### Decay Modes

| Mode | Formula | Feel |
|------|---------|------|
| Linear | `1 - t` | Even fade, predictable |
| Exponential | `e^(-5t)` | Fast initial drop, long tail — most natural |
| Ease-out | `1 - t²` | Smooth deceleration — cinematic |

### Directional Shake

Optional `direction` vector (X, Z normalized) biases displacement along that axis. 70% along direction, 30% perpendicular noise. When no direction is set, shake is omnidirectional.

### Freeze Frame

Optional pre-shake pause: freezes the render loop for N milliseconds before the shake begins. Configurable 0–300ms, default 0 (disabled). Used for combat impact emphasis.

### Perlin Noise Configuration

| Parameter | Default | Range |
|-----------|---------|-------|
| Seed | random per instance | 0–9999 |
| Frequency | 25 Hz (translation), 20 Hz (rotation), 15 Hz (FOV) | 1–100 Hz |
| Octaves | 2 | 1–4 |

## Valibot Schemas

### ScreenShakeConfigSchema

All shake parameters in a single config object for serialization:

```
intensity: Num (0–3)
durationMs: Num (50–5000)
traumaPower: Num (1–4)
decayRate: Num (0.1–5.0)
decayMode: 'linear' | 'exponential' | 'easeOut'
translation: { enabled: Bool, amplitude: Num, frequency: Num }
rotation: { enabled: Bool, maxRoll: Num, frequency: Num }
fov: { enabled: Bool, maxFov: Num, frequency: Num }
envelope: { attackMs: Num, sustainMs: Num, decayMs: Num }
noise: { seed: Num, octaves: Num }
direction: { x: Num, z: Num } | null
freezeMs: Num (0–300)
```

### ShakePresetSchema

Named preset wrapping a ScreenShakeConfig plus metadata:

```
name: Str
category: 'combat' | 'environment' | 'ui' | 'cinematic'
config: ScreenShakeConfig
```

## Presets (18)

### Combat (6)

| Preset | Intensity | Duration | Rotation | FOV | Freeze | Decay |
|--------|-----------|----------|----------|-----|--------|-------|
| Light Hit | 0.3 | 150ms | 0.02 | 0.01 | 0ms | Exponential |
| Heavy Hit | 0.6 | 300ms | 0.04 | 0.02 | 50ms | Exponential |
| Critical Hit | 0.9 | 400ms | 0.06 | 0.03 | 100ms | Exponential |
| Explosion | 1.0 | 600ms | 0.05 | 0.04 | 80ms | Linear |
| Parry/Block | 0.4 | 120ms | 0.01 | 0.02 | 30ms | Exponential |
| Spell Cast | 0.25 | 350ms | 0.03 | 0.015 | 0ms | Ease-out |

### Environment (5)

| Preset | Intensity | Duration | Rotation | FOV | Freeze | Decay |
|--------|-----------|----------|----------|-----|--------|-------|
| Earthquake | 0.7 | 2000ms | 0.03 | 0.01 | 0ms | Linear |
| Tremor | 0.3 | 1000ms | 0.01 | 0 | 0ms | Ease-out |
| Rumble | 0.15 | 3000ms | 0.005 | 0 | 0ms | Ease-out |
| Thunder | 0.5 | 500ms | 0.02 | 0.01 | 60ms | Exponential |
| Footstep (Giant) | 0.35 | 250ms | 0.015 | 0.01 | 20ms | Exponential |

### UI/Feedback (3)

| Preset | Intensity | Duration | Rotation | FOV | Freeze | Decay |
|--------|-----------|----------|----------|-----|--------|-------|
| Deny | 0.2 | 200ms | 0 | 0 | 0ms | Linear |
| Alert | 0.15 | 300ms | 0.01 | 0 | 0ms | Ease-out |
| Landing | 0.4 | 200ms | 0.02 | 0.02 | 30ms | Exponential |

### Cinematic (4)

| Preset | Intensity | Duration | Rotation | FOV | Freeze | Decay |
|--------|-----------|----------|----------|-----|--------|-------|
| Boss Intro | 0.8 | 1200ms | 0.04 | 0.03 | 150ms | Linear |
| Teleport | 0.5 | 400ms | 0.05 | 0.04 | 0ms | Exponential |
| Death Blow | 1.0 | 800ms | 0.07 | 0.05 | 200ms | Ease-out |
| World Shift | 0.6 | 1500ms | 0.02 | 0.02 | 0ms | Linear |

## Public API

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `screenShake` | `(config: ScreenShakeConfig) => BabylonResult<ShakeHandle>` | One-shot shake with full config |
| `addTrauma` | `(amount: Num) => void` | Add trauma for additive stacking |
| `stopAllShakes` | `() => void` | Cancel all active shakes, restore camera |
| `getTrauma` | `() => Num` | Read current trauma level |

### ShakeHandle (returned by screenShake)

| Method | Description |
|--------|-------------|
| `.dispose()` | Cancel this shake early, restore camera |

## Dev Harness UI

### Layout (8 sub-sections)

1. **Presets** — Category tabs (Combat, Environment, UI/Feedback, Cinematic) with preset buttons. Selecting a preset fills all sliders.
2. **Translation** — Enable toggle, Intensity slider (0–3), Frequency slider (1–100 Hz).
3. **Rotation** — Enable toggle, Max Roll slider (0–0.15 rad), Frequency slider (1–100 Hz).
4. **FOV** — Enable toggle, Max FOV slider (0–0.1 rad), Frequency slider (1–100 Hz).
5. **Envelope** — Attack (0–500ms), Sustain (0–2000ms), Decay (0–3000ms), Decay Mode buttons (Linear/Expo/Ease-out).
6. **Noise** — Seed (0–9999), Octaves (1–4).
7. **Advanced** — Trauma Power (1–4), Auto-Decay rate (0.1–5.0/s), Freeze Frame (0–300ms), Direction X (-1 to 1), Direction Z (-1 to 1).
8. **Controls** — Trigger Shake button, Stop All button, live trauma meter bar, Global Scale slider (0–200%), Master Enable toggle.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/core/screen-shake.ts` | **Create** | New dedicated module: trauma system, Perlin noise, envelope, channels |
| `src/core/screen-shake.test.ts` | **Create** | Comprehensive TDD tests |
| `src/core/perlin.ts` | **Create** | Lightweight Perlin noise implementation |
| `src/core/perlin.test.ts` | **Create** | Perlin noise tests |
| `src/schemas/screen-shake-schema.ts` | **Create** | Valibot schemas for config, presets, decay modes |
| `src/core/camera-controller.ts` | **Modify** | Remove old screenShake code, re-export from new module |
| `dev/dev.ts` | **Modify** | Replace SHAKE section with expanded UI |
| `dev/index.html` | **Modify** | Update SHAKE section HTML |
| `README.md` | **Modify** | Document expanded shake API |
| `src/index.ts` | **Modify** | Export new types and functions |

## Testing Strategy

TDD with comprehensive coverage:

- **Perlin noise**: determinism (same seed = same output), range bounds, frequency scaling, octave layering
- **Trauma system**: additive stacking, clamping at 1.0, quadratic power curve, auto-decay rate
- **Envelope**: attack ramp timing, sustain hold, decay curve shapes (linear, expo, ease-out)
- **Channels**: translation displacement range, rotation range, FOV offset range, per-channel enable/disable
- **Directional shake**: direction bias, perpendicular noise component
- **Freeze frame**: render pause duration
- **ShakeHandle**: dispose cancellation, camera restoration
- **Presets**: all 18 presets produce valid configs, schema validation
- **Edge cases**: zero duration, zero intensity, max trauma stacking, rapid successive shakes

## Accessibility

- **Global Scale** slider (0–200%): scales all shake amplitudes. Default 100%.
- **Master Enable** toggle: disables all shake globally. Default: enabled.
- Both stored as state in the shake module, respected by all shake operations.

## References

- Squirrel Eiserloh, "Juicing Your Cameras With Math" (GDC 2016)
- Unity Cinemachine Impulse system
- Unreal Engine 5 Camera Shake Patterns
- Godot trauma-based screen shake
- DaveTech analysis of 21 screen shake types
