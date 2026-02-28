# Fog

Three-tier fog system providing basic scene fog, advanced depth-based effects, and procedural overlay texture layers. 77+ configurable options across 12 sub-schemas with 14 curated presets.

## Overview

The fog system layers three independent effect tiers that can be used individually or combined:

1. **Tier 1 -- Scene Fog**: Babylon.js built-in fog (linear/exponential/exponential-squared)
2. **Tier 2 -- Advanced Fog**: Custom PostProcess with depth-based height fog, inscattering, atmospheric scattering, noise, wind, and animation
3. **Tier 3 -- Overlay Fog**: Texture-based PostProcess with 4 independent layers using procedural noise textures

## Architecture

```
Tier 1: Scene Fog (Babylon.js built-in)
  scene.fogMode -> linear | exponential | exponential-squared
  scene.fogColor, fogDensity, fogStart, fogEnd

Tier 2: Advanced Fog PostProcess (depth-based)
  DepthRenderer -> world-space position reconstruction
  -> Height fog (baseHeight, falloff, density, offset)
  -> Second fog layer (independent density + height)
  -> Inscattering (sun-direction color bleeding)
  -> Atmospheric scattering (per-channel extinction + inscattering)
  -> Noise perturbation (FBM, octaves, lacunarity)
  -> Wind displacement (direction, speed, turbulence)
  -> Density animation (sine/triangle/sawtooth waveform)
  -> Day/night color + density blending

Tier 3: Overlay Fog PostProcess (texture-based)
  4 independent layers, each with:
  -> Procedural texture (perlin | worley | clouds | wisps | smoke)
  -> Blend mode (normal | additive | multiply | screen)
  -> Scroll speed, scale, hue rotation
  -> Vignette masking (9 types)
```

## Configuration Reference

### Scene Fog (Tier 1)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `mode` | Enum | `'none'` | `'none'`, `'linear'`, `'exponential'`, `'exponentialSquared'` | Fog mode |
| `color` | ColorRgba | `{r:0.8, g:0.85, b:0.9, a:1}` | 0--1 | Fog color |
| `density` | Num | `0.01` | 0--1 | Exponential density |
| `start` | Num | `20` | >= 0 | Linear fog start distance |
| `end` | Num | `100` | >= 0 | Linear fog end distance |

### Height Fog (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `heightFog.enabled` | Bool | `false` | -- | Enable height fog |
| `heightFog.baseHeight` | Num | `0` | -100 to 100 | Fog base height |
| `heightFog.falloff` | Num | `0.5` | 0.01--10 | Vertical density falloff |
| `heightFog.density` | Num | `0.5` | 0--5 | Height fog density |
| `heightFog.offset` | Num | `0` | -50 to 50 | Height offset |

### Second Fog Layer (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `secondLayer.enabled` | Bool | `false` | -- | Enable second layer |
| `secondLayer.density` | Num | `0.3` | 0--5 | Layer density |
| `secondLayer.height` | Num | `5` | -100 to 100 | Layer height |

### Inscattering (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `inscattering.enabled` | Bool | `false` | -- | Enable inscattering |
| `inscattering.color` | ColorRgba | warm orange | 0--1 | Scatter color |
| `inscattering.intensity` | Num | `0.5` | 0--3 | Scatter intensity |
| `inscattering.exponent` | Num | `3` | 0.5--10 | Angular falloff |

### Atmospheric Scattering (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `atmospheric.enabled` | Bool | `false` | -- | Enable atmospheric |
| `atmospheric.extinctionR/G/B` | Num | 0.2/0.3/0.4 | 0--2 | Per-channel extinction |
| `atmospheric.inscatterR/G/B` | Num | 0.3/0.4/0.5 | 0--2 | Per-channel inscattering |

### Noise (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `noise.enabled` | Bool | `false` | -- | Enable noise |
| `noise.scale` | Num | `1` | 0.01--20 | Noise scale |
| `noise.intensity` | Num | `0.3` | 0--2 | Noise intensity |
| `noise.octaves` | Num | `3` | 1--8 | FBM octaves |
| `noise.lacunarity` | Num | `2` | 1--4 | Frequency multiplier |

### Wind (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `wind.enabled` | Bool | `false` | -- | Enable wind |
| `wind.directionX/Z` | Num | 1/0 | -1 to 1 | Wind direction |
| `wind.speed` | Num | `1` | 0--10 | Wind speed |
| `wind.turbulence` | Num | `0.3` | 0--2 | Turbulence intensity |

### Density Animation (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `animation.enabled` | Bool | `false` | -- | Enable animation |
| `animation.waveform` | Enum | `'sine'` | `'sine'`, `'triangle'`, `'sawtooth'` | Waveform shape |
| `animation.speed` | Num | `1` | 0.01--5 | Animation speed |
| `animation.amplitude` | Num | `0.2` | 0--1 | Density oscillation |

### Day/Night Blending (Tier 2)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `dayNight.enabled` | Bool | `false` | -- | Enable day/night blend |
| `dayNight.dayColor` | ColorRgba | -- | 0--1 | Daytime fog color |
| `dayNight.nightColor` | ColorRgba | -- | 0--1 | Nighttime fog color |
| `dayNight.dayDensity` | Num | `0.5` | 0--5 | Daytime density |
| `dayNight.nightDensity` | Num | `1` | 0--5 | Nighttime density |

### Overlay Layers (Tier 3)

4 independent layers (`overlay1` through `overlay4`), each with:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Enable layer |
| `textureType` | Enum | `'perlin'` | `'perlin'`, `'worley'`, `'clouds'`, `'wisps'`, `'smoke'` | Noise texture |
| `blendMode` | Enum | `'normal'` | `'normal'`, `'additive'`, `'multiply'`, `'screen'` | Blend mode |
| `opacity` | Num | `0.3` | 0--1 | Layer opacity |
| `scale` | Num | `1` | 0.1--10 | Texture scale |
| `scrollSpeedX/Y` | Num | `0.5/0` | -5 to 5 | Scroll speed |
| `color` | ColorRgba | white | 0--1 | Layer tint |
| `hueRotation` | Num | `0` | 0--360 | Hue rotation (degrees) |
| `vignetteType` | Enum | `'none'` | 9 types | Vignette mask |
| `vignetteIntensity` | Num | `0.5` | 0--1 | Mask intensity |

**Vignette Types:** `none`, `radial`, `border`, `top`, `bottom`, `left`, `right`, `horizontal`, `vertical`

## 14 Built-in Presets

| Preset | Mode | Density | Key Features |
|--------|------|---------|--------------|
| `clear` | none | 0 | No fog |
| `lightMist` | exponential | 0.003 | Subtle atmosphere |
| `morningFog` | exponential-squared | 0.008 | Height fog + wisps overlay + wind |
| `denseFog` | exponential | 0.04 | Clouds overlay |
| `dungeon` | exponential-squared | 0.02 | Dark + smoke overlay |
| `underwater` | exponential | 0.06 | Blue-green tint |
| `forest` | exponential | 0.01 | Height fog + perlin overlay |
| `mountain` | exponential-squared | 0.005 | Elevated height fog + clouds |
| `sandstorm` | exponential | 0.035 | Strong wind + smoke overlay |
| `snowstorm` | exponential | 0.03 | Strong wind + perlin overlay |
| `dream` | exponential-squared | 0.012 | Purple + wisps overlay |
| `volcanic` | exponential | 0.025 | Red-orange + steep height fog + smoke |
| `swamp` | exponential | 0.015 | Murky green + height fog + worley |
| `nightMist` | exponential-squared | 0.006 | Very dark + wisps overlay |

## Fog Handle Pattern

`applyFog()` returns a `FogHandle` that owns all resources:

- `advancedPP` -- Advanced fog PostProcess (nullable)
- `overlayPP` -- Overlay fog PostProcess (nullable)
- `overlayTextures` -- Generated `RawTexture[]` for overlay layers
- `depthRenderer` -- Scene depth renderer (nullable)
- `observer` -- Per-frame time accumulation observer
- `elapsedTime` -- Accumulated time for shader animation
- `config`, `scene`, `camera`, `engine` -- References for updates

## API

| Function | Description |
|----------|-------------|
| `applyFog` | Create full fog system from config |
| `updateFog` | Update fog parameters at runtime |
| `applyFogPreset` | Apply a named preset |
| `disposeFog` | Dispose all fog resources |
| `generateOverlayTexture` | Generate procedural noise texture data |

## Files

| File | Purpose |
|------|---------|
| `schemas/fog-config.ts` | FogConfigSchema + 12 sub-schemas |
| `rendering/fog-manager.ts` | Lifecycle (applyFog, updateFog, disposeFog) |
| `rendering/fog-presets.ts` | 14 presets |
| `rendering/fog-shader.ts` | GLSL shaders + PostProcess factories |
| `rendering/fog-overlay-textures.ts` | 5 procedural noise generators |
