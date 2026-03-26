# Screen Shake

Trauma-based screen shake system with 3 channels (translation, rotation, FOV), Perlin noise, ASR envelopes, directional bias, hit-freeze, and 18 curated presets.

## Overview

The shake system uses a trauma model where the shake intensity is raised to a power (`traumaPower`), making weak shakes barely perceptible while strong shakes produce dramatic displacement. Perlin noise provides smooth, organic motion across 3 independent channels.

## Architecture

```
triggerShake(config)
  -> Validate via ScreenShakeConfigSchema
  -> Apply ASR envelope (attack -> sustain -> decay)
  -> Per-frame update:
      -> Compute trauma^traumaPower = shake amplitude
      -> Sample Perlin noise at (time * frequency) per channel
      -> Apply directional bias (optional)
      -> Offset camera position (translation channel)
      -> Rotate camera (rotation channel)
      -> Adjust FOV (FOV channel)
      -> Decay trauma per decayMode
  -> Hit-freeze: pause scene for freezeMs before shake starts
```

## Configuration Reference

### Core

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `intensity` | Num | (required) | 0--3 | Shake intensity (trauma input) |
| `traumaPower` | Num | `2` | 1--4 | Trauma exponent |
| `decayRate` | Num | `0.8` | 0.1--5 | Decay speed per second |
| `decayMode` | Enum | `'exponential'` | `'linear'`, `'exponential'`, `'easeOut'` | Decay curve |

### Translation Channel (Camera Offset)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `translation.enabled` | Bool | `true` | -- | Channel active |
| `translation.amplitude` | Num | `0.5` | >= 0 | Amplitude multiplier |
| `translation.frequency` | Num | `25` | 1--100 | Noise frequency (Hz) |

### Rotation Channel (Camera Tilt)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `rotation.enabled` | Bool | `true` | -- | Channel active |
| `rotation.amplitude` | Num | `0.05` | >= 0 | Amplitude multiplier |
| `rotation.frequency` | Num | `20` | 1--100 | Noise frequency (Hz) |

### FOV Channel (Zoom Punch)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `fov.enabled` | Bool | `true` | -- | Channel active |
| `fov.amplitude` | Num | `0.03` | >= 0 | Amplitude multiplier |
| `fov.frequency` | Num | `15` | 1--100 | Noise frequency (Hz) |

### ASR Envelope

Models shake amplitude over time: attack (ramp up) -> sustain (hold) -> decay (fade out). Total duration = attackMs + sustainMs + decayMs.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `envelope.attackMs` | Num | `0` | 0--500 | Ramp-up (ms) |
| `envelope.sustainMs` | Num | `0` | 0--2000 | Hold at peak (ms) |
| `envelope.decayMs` | Num | `300` | 0--3000 | Fade-out (ms) |

### Perlin Noise

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `noise.seed` | Num | `0` | 0--9999 | Noise seed |
| `noise.octaves` | Num | `2` | 1--4 | Detail layers |

### Direction

Optional directional bias on the XZ ground plane. `null` = omnidirectional.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `direction.x` | Num | -- | X-axis bias |
| `direction.z` | Num | -- | Z-axis bias |

### Hit-Freeze

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `freezeMs` | Num | `0` | 0--300 | Pause duration before shake (ms) |

## 18 Curated Presets

### Combat (6)

| Preset | Intensity | Decay (ms) | Freeze (ms) | Description |
|--------|-----------|------------|-------------|-------------|
| Light Hit | 0.3 | 150 | 0 | Minor damage feedback |
| Heavy Hit | 0.6 | 300 | 50 | Strong melee impact |
| Critical Hit | 0.9 | 400 | 100 | Critical damage |
| Explosion | 1.0 | 600 | 80 | Area explosion |
| Parry/Block | 0.4 | 120 | 30 | Deflected attack |
| Spell Cast | 0.25 | 350 | 0 | Magic release |

### Environment (5)

| Preset | Intensity | Decay (ms) | Description |
|--------|-----------|------------|-------------|
| Earthquake | 0.7 | 2000 | Long sustained rumble |
| Tremor | 0.3 | 1000 | Moderate ground shake |
| Rumble | 0.15 | 3000 | Subtle continuous shake |
| Thunder | 0.5 | 500 | Thunder crack |
| Footstep (Giant) | 0.35 | 250 | Giant footfall impact |

### UI (3)

| Preset | Intensity | Decay (ms) | Description |
|--------|-----------|------------|-------------|
| Deny | 0.2 | 200 | Action rejected |
| Alert | 0.15 | 300 | Notification shake |
| Landing | 0.4 | 200 | Character landing |

### Cinematic (4)

| Preset | Intensity | Decay (ms) | Freeze (ms) | Description |
|--------|-----------|------------|-------------|-------------|
| Boss Intro | 0.8 | 1200 | 150 | Boss encounter |
| Teleport | 0.5 | 400 | 0 | Teleport arrival |
| Death Blow | 1.0 | 800 | 200 | Finishing move |
| World Shift | 0.6 | 1500 | 0 | Dimension shift |

## API

| Function | Description |
|----------|-------------|
| `createScreenShake` | Trigger shake from config |
| `stopScreenShake` | Cancel active shake |

## Files

| File | Purpose |
|------|---------|
| `schemas/screen-shake-config.ts` | Config schema + 18 presets |
| `core/screen-shake.ts` | Shake trigger, update loop, cleanup |
| `core/perlin.ts` | 2D Perlin noise generator |
