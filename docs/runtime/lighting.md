# Lighting

The lighting system supports 4 light types with per-light configuration for shadows, flicker animation, volumetric effects (god rays), and lens flares.

## Overview

Lights are defined as an array in the lighting config. Each light entry specifies a `type` discriminant that selects the light-specific schema. All lights share common fields for color, intensity, shadows, and effects.

## Light Types

| Type | Babylon.js Class | Description |
|------|------------------|-------------|
| `hemispheric` | `HemisphericLight` | Ambient fill light with ground color |
| `directional` | `DirectionalLight` | Sun/moon parallel rays |
| `point` | `PointLight` | Omni-directional (torch, lamp) |
| `spot` | `SpotLight` | Cone of light (spotlight, flashlight) |

## Common Light Fields

All light types share these fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | Enum | (required) | Light type discriminant |
| `name` | Str | (required) | Unique light name |
| `intensity` | Num | `1` | Light brightness (0--10) |
| `color` | ColorRgba | white | Light color |
| `enabled` | Bool | `true` | Light on/off |

## Hemispheric Light

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `direction` | Vector3 | `{x:0,y:1,z:0}` | -- | Sky direction |
| `groundColor` | ColorRgba | `{r:0,g:0,b:0,a:1}` | 0--1 | Ground bounce color |

## Directional Light

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `direction` | Vector3 | `{x:0,y:-1,z:0}` | -- | Light direction vector |
| `position` | Vector3 | `{x:0,y:10,z:0}` | -- | Shadow origin position |

## Point Light

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `position` | Vector3 | `{x:0,y:5,z:0}` | -- | World position |
| `range` | Num | `20` | >= 0 | Falloff range |

## Spot Light

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `position` | Vector3 | `{x:0,y:10,z:0}` | -- | World position |
| `direction` | Vector3 | `{x:0,y:-1,z:0}` | -- | Spotlight direction |
| `angle` | Num | `0.8` | 0--PI | Cone angle (radians) |
| `exponent` | Num | `2` | 0--128 | Falloff exponent |
| `range` | Num | `40` | >= 0 | Max range |

## Shadows

Per-light shadow configuration:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `shadows.enabled` | Bool | `false` | -- | Enable shadows |
| `shadows.resolution` | Num | `1024` | 256--4096 | Shadow map resolution |
| `shadows.darkness` | Num | `0.5` | 0--1 | Shadow darkness |
| `shadows.bias` | Num | `0.00005` | 0--0.01 | Depth bias (reduce acne) |
| `shadows.normalBias` | Num | `0.01` | 0--0.1 | Normal bias |
| `shadows.filter` | Enum | `'pcf'` | `'none'`, `'pcf'`, `'pcss'`, `'poisson'`, `'exponential'`, `'blurExponential'`, `'blurClose'`, `'contactHardening'` | Shadow filter type |
| `shadows.frustumEdgeFalloff` | Num | `0` | 0--1 | Edge softening |
| `shadows.forceBackFacesOnly` | Bool | `false` | -- | Back-face culling for shadows |

## Flicker Animation

Per-light animation for torches, candles, and other flickering light sources:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `flicker.enabled` | Bool | `false` | -- | Enable flicker |
| `flicker.mode` | Enum | `'random'` | `'random'`, `'sine'`, `'campfire'`, `'candle'`, `'strobe'`, `'pulse'`, `'fluorescent'`, `'storm'`, `'heartbeat'`, `'breathe'` | Flicker pattern |
| `flicker.intensityRange` | Num | `0.2` | 0--5 | Intensity oscillation range |
| `flicker.speed` | Num | `1` | 0.1--10 | Animation speed |
| `flicker.colorShift` | Bool | `false` | -- | Shift color during flicker |
| `flicker.colorShiftHue` | Num | `0.05` | 0--1 | Hue shift range |
| `flicker.colorShiftSaturation` | Num | `0.1` | 0--1 | Saturation shift range |

## Volumetric Light (God Rays)

Per-light volumetric lighting effect:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `volumetric.enabled` | Bool | `false` | -- | Enable god rays |
| `volumetric.samples` | Num | `50` | 10--200 | Ray marching samples |
| `volumetric.density` | Num | `0.5` | 0--2 | Fog density |
| `volumetric.weight` | Num | `0.5` | 0--2 | Effect weight |
| `volumetric.decay` | Num | `0.95` | 0--1 | Ray decay |
| `volumetric.exposure` | Num | `0.3` | 0--1 | Exposure |

## Lens Flare

Per-light lens flare effect:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `lensFlare.enabled` | Bool | `false` | -- | Enable lens flares |
| `lensFlare.preset` | Enum | `'sun'` | `'sun'`, `'moon'`, `'torch'`, `'neon'`, `'spotlight'`, `'custom'` | Flare preset |
| `lensFlare.intensity` | Num | `1` | 0--5 | Overall intensity |
| `lensFlare.haloWidth` | Num | `0.4` | 0--1 | Halo width |

## API

| Function | Module | Description |
|----------|--------|-------------|
| `createLights` | `light-manager.ts` | Create all lights from config array |
| `updateLight` | `light-manager.ts` | Update a light's properties at runtime |
| `disposeLights` | `light-manager.ts` | Dispose all lights |
| `createShadows` | `shadow-manager.ts` | Set up shadow generators |
| `disposeShadows` | `shadow-manager.ts` | Dispose shadow generators |

## Files

| File | Purpose |
|------|---------|
| `schemas/lighting-config.ts` | Light type schemas, shadow, flicker, volumetric, lens flare |
| `rendering/light-manager.ts` | Light creation and management |
| `rendering/light-animation.ts` | Flicker, pulse, color cycling |
| `rendering/shadow-manager.ts` | Shadow generator setup |
| `rendering/color-temperature.ts` | Kelvin-to-RGB conversion |
