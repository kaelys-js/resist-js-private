# Lighting

The lighting system supports 4 light types with per-light configuration for shadows (8 filter types), flicker animation (13 modes), volumetric effects (god rays), lens flares (4 presets), and distance-based fading.

## Overview

Lights are defined as an array in the lighting config. Each light entry specifies a `type` discriminant that selects the light-specific schema. All non-hemispheric lights share common fields for color, intensity, shadows, flicker, and effects.

## Light Types

| Type | Babylon.js Class | Shadows | Flicker | God Rays | Lens Flares | Distance Fade |
|------|------------------|---------|---------|----------|-------------|---------------|
| `hemispheric` | `HemisphericLight` | No | No | No | No | No |
| `directional` | `DirectionalLight` | Yes (incl. cascade) | Yes | Yes | Yes | No |
| `point` | `PointLight` | Yes | Yes | No | No | Yes |
| `spot` | `SpotLight` | Yes | Yes | No | No | Yes |

## Common Light Fields

All light types share these fields:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `id` | Str | (required) | non-empty | Unique light identifier |
| `name` | Str | -- | non-empty | Optional display name |
| `enabled` | Bool | `true` | -- | Light on/off |
| `intensity` | Num | `1.0` | 0--100 | Light brightness |
| `diffuse` | ColorRgba | white | 0--1 | Diffuse light color |
| `specular` | ColorRgba | white | 0--1 | Specular highlight color |
| `colorTemperature` | Num | -- | 1000--15000 | Kelvin temperature (overrides diffuse) |
| `falloffType` | Enum | `'default'` | `'default'`, `'physical'`, `'gltf'`, `'standard'` | Light attenuation model |
| `intensityMode` | Enum | `'automatic'` | `'automatic'`, `'luminous_power'`, `'luminous_intensity'`, `'illuminance'`, `'luminance'` | Physical intensity units |
| `shadow` | ShadowConfig | -- | -- | Shadow configuration (not hemispheric) |
| `flicker` | FlickerConfig | -- | -- | Flicker animation (not hemispheric) |

## Hemispheric Light

Ambient lighting from sky and ground directions. Does NOT support shadows, flicker, or effects.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `direction` | Vector3 | `{x:0,y:1,z:0}` | -- | Sky direction |
| `groundColor` | ColorRgba | `{r:0,g:0,b:0,a:1}` | 0--1 | Ground bounce color |
| `renderPriority` | Num | `0` | 0--10 | Render ordering priority |
| `layerMask` | Num | `0x0FFFFFFF` | >= 0 | Mesh layer filtering bitmask |

## Directional Light

Parallel light rays from a direction (sun/moon). Supports cascaded shadow maps, volumetric light scattering, and lens flares.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `direction` | Vector3 | `{x:0,y:-1,z:0.5}` | -- | Light direction vector |
| `position` | Vector3 | `{x:0,y:50,z:0}` | -- | Shadow origin position |
| `autoCalcShadowZBounds` | Bool | `true` | -- | Auto-calculate shadow depth bounds |
| `volumetricLight` | VolumetricConfig | -- | -- | God rays configuration |
| `lensFlare` | LensFlareConfig | -- | -- | Lens flare configuration |
| `shadowFrustumSize` | Num | `0` | >= 0 | Fixed shadow frustum size (0 = auto) |
| `shadowOrthoScale` | Num | `0.1` | >= 0 | Shadow ortho matrix scale factor |
| `autoUpdateExtends` | Bool | `true` | -- | Auto-update shadow extends each frame |
| `shadowMinZ` | Num | `0` | >= 0 | Shadow near plane (0 = auto) |
| `shadowMaxZ` | Num | `0` | >= 0 | Shadow far plane (0 = auto) |
| `renderPriority` | Num | `0` | 0--10 | Render ordering priority |
| `layerMask` | Num | `0x0FFFFFFF` | >= 0 | Mesh layer filtering bitmask |
| `lightmapMode` | Enum | `'default'` | `'default'`, `'specular'`, `'shadowsOnly'` | Lightmap interaction mode |

## Point Light

Omni-directional light source (torch, lamp, campfire).

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `position` | Vector3 | `{x:0,y:0,z:0}` | -- | World position |
| `range` | Num | `100` | >= 0 | Maximum falloff range |
| `meshRadius` | Num | -- | >= 0 | Auto-assign includedOnlyMeshes within radius |
| `radius` | Num | `0` | >= 0 | PBR physical radius (area light) |
| `renderPriority` | Num | `0` | 0--10 | Render ordering priority |
| `shadowMinZ` | Num | `0` | >= 0 | Shadow near plane (0 = auto) |
| `shadowMaxZ` | Num | `0` | >= 0 | Shadow far plane (0 = auto) |
| `layerMask` | Num | `0x0FFFFFFF` | >= 0 | Mesh layer filtering bitmask |
| `lightmapMode` | Enum | `'default'` | `'default'`, `'specular'`, `'shadowsOnly'` | Lightmap interaction mode |
| `distanceFade` | DistanceFadeConfig | -- | -- | Distance-based fade configuration |

## Spot Light

Cone of light from a position in a direction. Supports projection textures (stained glass, patterns).

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `position` | Vector3 | `{x:0,y:0,z:0}` | -- | World position |
| `direction` | Vector3 | `{x:0,y:-1,z:0}` | -- | Spotlight direction |
| `angle` | Num | `PI/4` | 0--PI | Cone angle (radians) |
| `exponent` | Num | `2` | >= 0 | Falloff speed from center to edge |
| `range` | Num | `100` | >= 0 | Max range |
| `meshRadius` | Num | -- | >= 0 | Auto-assign includedOnlyMeshes within radius |
| `projectionTexturePath` | Str | -- | -- | Path to projection texture image |
| `projectionTextureNear` | Num | `0.1` | >= 0 | Projection near clip |
| `projectionTextureFar` | Num | `100` | >= 0 | Projection far clip |
| `innerAngle` | Num | `0` | 0--PI | Inner cone angle for soft edge falloff |
| `radius` | Num | `0` | >= 0 | PBR physical radius (area light) |
| `renderPriority` | Num | `0` | 0--10 | Render ordering priority |
| `shadowMinZ` | Num | `0` | >= 0 | Shadow near plane (0 = auto) |
| `shadowMaxZ` | Num | `0` | >= 0 | Shadow far plane (0 = auto) |
| `layerMask` | Num | `0x0FFFFFFF` | >= 0 | Mesh layer filtering bitmask |
| `lightmapMode` | Enum | `'default'` | `'default'`, `'specular'`, `'shadowsOnly'` | Lightmap interaction mode |
| `distanceFade` | DistanceFadeConfig | -- | -- | Distance-based fade configuration |

## Shadows

Per-light shadow configuration with 8 filter types:

### Shadow Config

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Enable shadows |
| `type` | Enum | `'pcf'` | `'pcf'`, `'pcss'`, `'esm'`, `'cascade'` | Shadow generator type |
| `mapSize` | Num | `1024` | 256--4096 | Shadow map resolution |
| `filteringQuality` | Enum | `'medium'` | `'low'`, `'medium'`, `'high'` | Filter quality |
| `bias` | Num | `0.00005` | 0--1 | Depth bias (reduces acne) |
| `normalBias` | Num | `0.04` | 0--1 | Normal bias (reduces peter-panning) |
| `darkness` | Num | `0.5` | 0--1 | Shadow darkness (0 = invisible, 1 = pitch black) |
| `transparencyShadow` | Bool | `false` | -- | Render transparent objects in shadow map |
| `enableSoftTransparentShadow` | Bool | `false` | -- | Dithered soft shadows for foliage/cloth |

### Shadow Filter Type Override

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filterType` | Enum | -- | Overrides default filter from `type` |

Filter type options: `'none'`, `'esm'`, `'blurredEsm'`, `'closeEsm'`, `'blurredCloseEsm'`, `'pcf'`, `'pcss'`, `'poisson'`

### General Shadow Properties

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `forceBackFacesOnly` | Bool | `false` | -- | Render only back faces into shadow map |
| `frustumEdgeFalloff` | Num | `0` | 0--1 | Fade shadow at frustum edges |
| `contactHardeningLightSizeUVRatio` | Num | `0.1` | 0--1 | PCSS soft penumbra radius |
| `useKernelBlur` | Bool | `false` | -- | Use kernel blur (ESM modes) |
| `blurKernel` | Num | `1` | 1--64 | Blur kernel size (ESM modes) |
| `blurScale` | Num | `2` | 0.5--4 | Blur render scale (ESM modes) |
| `depthScale` | Num | `50` | 0--1000 | ESM depth scale factor |
| `useOpacityTextureForTransparentShadow` | Bool | `false` | -- | Uses opacity texture for alpha-tested shadows |
| `freezeShadowCastersBoundingInfo` | Bool | `false` | -- | Cache caster bounds for performance |

### Cascade-Specific Properties

These fields only apply when `type` is `'cascade'`:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `numCascades` | Num | `3` | 1--4 | Number of shadow cascades |
| `stabilizeCascades` | Bool | `true` | -- | Prevents shimmer on camera rotation |
| `cascadeBlendPercentage` | Num | `0.05` | 0--1 | Smooth transitions between cascade levels |
| `autoCalcDepthBounds` | Bool | `true` | -- | Auto-optimize shadow frustum per frame |
| `lambda` | Num | `0.5` | 0--1 | Cascade split balance (0 = uniform, 1 = logarithmic) |
| `depthClamp` | Bool | `true` | -- | Clamps depth to prevent clipping |
| `penumbraDarkness` | Num | `1.0` | 0--1 | Cascade penumbra darkness |
| `shadowMaxZ` | Num | `0` | >= 0 | Max shadow distance (0 = auto) |

## Flicker Animation

13 procedural flicker modes for fire, pulse, electrical, and special effects:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `type` | Enum | `'candle'` | see below | Flicker pattern |
| `intensity` | Num | `0.3` | 0--1 | Flicker intensity |
| `speed` | Num | `1.0` | 0.1--10 | Animation speed |
| `colorShift` | ColorShiftConfig | -- | -- | Optional color shift during flicker |
| `positionJitter` | PositionJitterConfig | -- | -- | Optional position jitter |

### Flicker Modes

| Mode | Description |
|------|-------------|
| `candle` | Irregular, high-frequency flicker (multi-harmonic sine + noise) |
| `torch` | Slower, broader flicker than candle |
| `campfire` | Slow rolling intensity with occasional flare |
| `pulse` | Smooth sinusoidal oscillation |
| `strobe` | Binary on/off at high frequency |
| `breathing` | Very slow, gentle sine wave |
| `fluorescent` | Mostly steady with rare sudden dips |
| `storm` | Rare bright flashes over dim base (lightning storm) |
| `heartbeat` | Double-pulse pattern (living/organic pulse) |
| `random` | Per-frame pure noise (chaotic magic sparks) |
| `neon` | Mostly on with rare brief dropouts (buzzing neon sign) |
| `dying` | Increasingly long off-periods (failing light) |
| `siren` | Sinusoidal at ~2Hz with hard threshold (emergency alarm) |

## Volumetric Light (God Rays)

Directional light only. Uses Babylon.js `VolumetricLightScatteringPostProcess`.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Enable god rays |
| `samples` | Num | `100` | 10--200 | Ray sampling quality |
| `decay` | Num | `0.97` | 0--1 | Light falloff along ray |
| `weight` | Num | `0.5` | 0--1 | Ray brightness |
| `density` | Num | `0.5` | 0--1 | Ray density |
| `passRatio` | Num | `0.5` | 0.01--1 | Internal render target resolution |
| `exposure` | Num | `1.0` | 0--2 | Exposure multiplier for ray brightness |
| `color` | ColorRgba | white | 0--1 | God ray tint color |

## Lens Flare

Directional light only. 4 built-in presets or custom flare arrays.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Enable lens flares |
| `flares` | LensFlareEntry[] | -- | -- | Custom flare elements (overrides preset) |
| `preset` | Enum | -- | `'sun'`, `'moonGlow'`, `'crystalLight'`, `'torchGlow'` | Built-in flare preset |
| `haloWidth` | Num | `0.4` | 0--2 | Center halo element size |
| `ghostDispersal` | Num | `0.3` | 0--2 | Spacing between ghost elements |
| `threshold` | Num | `0.5` | 0--1 | Min dot product for flare visibility |

## Distance Fade

Point and Spot lights only. Fades lights based on distance from the active camera.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Whether distance fade is active |
| `start` | Num | `50` | >= 0 | Distance at which fade begins |
| `end` | Num | `100` | >= 0 | Distance at which light fully fades out |

## API

| Function | Module | Description |
|----------|--------|-------------|
| `createLights` | `light-manager.ts` | Create all lights from config array |
| `removeLightById` | `light-manager.ts` | Remove and dispose a light by ID |
| `updateLightPosition` | `light-manager.ts` | Update a light's position at runtime |
| `updateLightIntensity` | `light-manager.ts` | Update a light's intensity at runtime |
| `updateLightColor` | `light-manager.ts` | Update a light's diffuse color at runtime |
| `disposeLighting` | `light-manager.ts` | Dispose all lights and sub-resources |
| `createShadowGenerator` | `shadow-manager.ts` | Set up shadow generator for a light |
| `disposeShadowGenerator` | `shadow-manager.ts` | Dispose a shadow generator |
| `addShadowCasters` | `shadow-manager.ts` | Add meshes as shadow casters |

## Files

| File | Purpose |
|------|---------|
| `schemas/lighting-config.ts` | Light type schemas, shadow, flicker, volumetric, lens flare, distance fade |
| `rendering/light-manager.ts` | Light creation, distance fade, lens flare presets, volumetric config |
| `rendering/light-animation.ts` | 13 flicker modes with color shift and position jitter |
| `rendering/shadow-manager.ts` | Shadow generator setup with 8 filter types |
| `rendering/day-night-cycle.ts` | Day/night cycle with keyframe interpolation |
| `rendering/color-temperature.ts` | Kelvin-to-RGB conversion |
