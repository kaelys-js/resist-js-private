# Lighting Expansion Design

## Goal

Expand the lighting system from its current ~50-field schema into an ~85-field comprehensive lighting engine with: 8 additional shadow filter types (ESM, Blurred ESM, Close ESM, Blurred Close ESM, Poisson, None) and 18 new shadow properties, 7 new per-light properties (PBR radius, renderPriority, innerAngle, shadow frustum controls), 6 new flicker modes (storm, heartbeat, random, neon, dying, siren), 4 new light features (distance fade, layer mask, lightmap mode, shadow opacity), expanded lens flare system (4 presets + haloWidth + ghostDispersal + threshold), and expanded volumetric light (exposure + color).

## Architecture

### Schema Layer

All new fields are added to existing schemas in `schemas/lighting-config.ts`. No new schema files are needed.

```
ShadowConfigSchema         +18 fields (filter types, ESM/PCSS/CSM controls)
ShadowFilterTypeSchema     NEW picklist (none, esm, blurredEsm, closeEsm, blurredCloseEsm, pcf, pcss, poisson)
PointLightConfigSchema     +5 fields (radius, renderPriority, distanceFade, layerMask, lightmapMode)
SpotLightConfigSchema      +6 fields (innerAngle, radius, renderPriority, distanceFade, layerMask, lightmapMode)
DirectionalLightConfigSchema +6 fields (shadowFrustumSize, shadowOrthoScale, autoUpdateExtends, shadowMinZ, shadowMaxZ, renderPriority, layerMask, lightmapMode)
HemisphericLightConfigSchema +2 fields (renderPriority, layerMask)
FlickerTypeSchema          +6 values (storm, heartbeat, random, neon, dying, siren)
VolumetricLightConfigSchema +2 fields (exposure, color)
LensFlareConfigSchema      +4 fields (preset, haloWidth, ghostDispersal, threshold)
LensFlarePresetSchema      NEW picklist (sun, moonGlow, crystalLight, torchGlow)
DistanceFadeConfigSchema   NEW strictObject (enabled, start, end)
```

### Rendering Layer

Changes to 3 implementation files:

1. **`shadow-manager.ts`** — Apply the 18 new shadow properties when creating shadow generators. New filter types map to Babylon.js `ShadowGenerator` boolean flags.

2. **`light-manager.ts`** — Apply new per-light properties (radius, renderPriority, innerAngle, distanceFade, layerMask, lightmapMode, shadowMinZ/shadowMaxZ) during light creation. Apply volumetric exposure + color. Apply lens flare presets.

3. **`light-animation.ts`** — Add 6 new flicker mode formulas to `computeFlicker()`.

### Data Flow

```
LightingConfigSchema (validated)
  → createLighting() in light-manager.ts
    → createBabylonLight() — applies new per-light properties
    → createShadowGenerator() — applies new shadow filter types + properties
    → createFlicker() — dispatches to new flicker formulas
    → lens flare setup — applies presets, haloWidth, ghostDispersal, threshold
    → volumetric setup — applies exposure, color
```

## Babylon.js Integration

### A. Shadow System — Filter Type Mapping

The current schema uses a `ShadowTypeSchema` picklist (`pcf`, `pcss`, `cascade`) that conflates filter type with generator type. The expansion introduces a separate `ShadowFilterTypeSchema` for fine-grained control:

| Schema Value | Babylon.js Property |
|---|---|
| `'none'` | No filter flags set (raw shadow map) |
| `'esm'` | `gen.useExponentialShadowMap = true` |
| `'blurredEsm'` | `gen.useBlurExponentialShadowMap = true` |
| `'closeEsm'` | `gen.useCloseExponentialShadowMap = true` |
| `'blurredCloseEsm'` | `gen.useBlurCloseExponentialShadowMap = true` |
| `'pcf'` | `gen.usePercentageCloserFiltering = true` |
| `'pcss'` | `gen.useContactHardeningShadow = true` |
| `'poisson'` | `gen.usePoissonSampling = true` |

The existing `type` field (`pcf`, `pcss`, `cascade`) stays for backward compatibility — it selects the generator class (ShadowGenerator vs CascadedShadowGenerator). The new `filterType` field overrides the default filter when set.

### A. Shadow System — New Property Mappings

| Schema Field | Babylon.js Property | Type | Default | Notes |
|---|---|---|---|---|
| `forceBackFacesOnly` | `gen.forceBackFacesOnly` | Bool | `false` | Reduces self-shadowing artifacts |
| `frustumEdgeFalloff` | `gen.frustumEdgeFalloff` | Num [0,1] | `0` | Fades shadow at frustum edges |
| `contactHardeningLightSizeUVRatio` | `gen.contactHardeningLightSizeUVRatio` | Num [0,1] | `0.1` | PCSS light size (soft penumbra radius) |
| `useKernelBlur` | `gen.useKernelBlur` | Bool | `false` | Use kernel blur instead of box (ESM modes) |
| `blurKernel` | `gen.blurKernel` | Num [1,64] | `1` | Blur kernel size (ESM modes) |
| `blurScale` | `gen.blurScale` | Num [0.5,4] | `2` | Blur render scale (ESM modes) |
| `depthScale` | `gen.depthScale` | Num [0,1000] | `50` | ESM depth scale factor |
| `useOpacityTextureForTransparentShadow` | `gen.useOpacityTextureForTransparentShadow` | Bool | `false` | Uses opacity texture for alpha shadows |
| `lambda` | `csm.lambda` | Num [0,1] | `0.5` | Cascade split balance (0=uniform, 1=logarithmic) |
| `depthClamp` | `csm.depthClamp` | Bool | `true` | Clamps depth to prevent clipping |
| `penumbraDarkness` | `csm.penumbraDarkness` | Num [0,1] | `1.0` | Cascade penumbra darkness |
| `shadowMaxZ` (CSM) | `csm.shadowMaxZ` | Num >= 0 | `0` | Max shadow distance (0 = auto) |
| `freezeShadowCastersBoundingInfo` | `csm.freezeShadowCastersBoundingInfo` | Bool | `false` | Cache bounding info for performance |

### B. Light Properties — New Property Mappings

| Schema Field | Babylon.js Property | Applies To | Type | Default | Notes |
|---|---|---|---|---|---|
| `radius` | `light.radius` | Point, Spot | Num >= 0 | `0` | PBR light physical radius |
| `renderPriority` | `light.renderPriority` | All | Num [0,10] | `0` | Render ordering priority |
| `innerAngle` | `spotLight.innerAngle` | Spot | Num [0, PI] | `0` | Inner cone angle (soft edge) |
| `shadowFrustumSize` | `dirLight.shadowFrustumSize` | Directional | Num > 0 | `0` | Fixed shadow frustum (0 = auto) |
| `shadowOrthoScale` | `dirLight.shadowOrthoScale` | Directional | Num > 0 | `0.1` | Shadow ortho matrix scale |
| `autoUpdateExtends` | `dirLight.autoUpdateExtends` | Directional | Bool | `true` | Auto-update shadow extents |
| `shadowMinZ` | `light.shadowMinZ` | Point, Spot, Dir | Num >= 0 | `0` | Shadow near plane (0 = auto) |
| `shadowMaxZ` | `light.shadowMaxZ` | Point, Spot, Dir | Num >= 0 | `0` | Shadow far plane (0 = auto) |

### C. Flicker Modes — Algorithm Design

Each new mode returns a multiplier in [1 - amplitude, 1]:

| Mode | Algorithm | Character |
|---|---|---|
| `storm` | Rare bright flashes (noise threshold 0.95) + low-frequency rumble | Lightning storm, occasional bright flash over dim base |
| `heartbeat` | Double-pulse pattern: two quick sine bumps per cycle, then silence | Living/organic pulse, pulsating crystal |
| `random` | Per-frame pure noise, frame-rate independent via `pseudoNoise(t)` | Chaotic, unstable light (magic sparks) |
| `neon` | Mostly full brightness with rare brief dropouts (noise < 0.03) | Buzzing neon sign, mostly on with flicker dips |
| `dying` | Increasingly long off-periods with occasional flickers | Failing light bulb, light going out |
| `siren` | Sinusoidal at 2Hz with hard on/off threshold at 0.5 | Emergency/alarm rotating light |

### D. New Light Features — Babylon.js Integration

**Distance Fade:**
Not a native Babylon.js property. Implemented in the per-frame `onBeforeRenderObservable` callback. Each frame:
1. Calculate distance from camera to light position
2. If distance < `start`: intensity = base intensity
3. If distance > `end`: intensity = 0 (and `setEnabled(false)`)
4. Between: linear interpolation
5. Only applies to Point and Spot lights (they have positions)

Schema:
```
DistanceFadeConfigSchema = v.strictObject({
  enabled: v.optional(v.boolean(), false),
  start: v.optional(v.pipe(v.number(), v.minValue(0)), 50),
  end: v.optional(v.pipe(v.number(), v.minValue(0)), 100),
})
```

**Layer Mask:**
- `light.includedOnlyMeshes` / `light.excludedMeshes` — but these are mesh-based
- `light.lightmapMode` maps to `Light.LIGHTMAP_DEFAULT`, `Light.LIGHTMAP_SPECULAR`, `Light.LIGHTMAP_SHADOWSONLY`
- Layer mask: Babylon.js doesn't have a direct bitmask on lights, but we expose it as a numeric field that maps to the `renderingGroupId` system or mesh tagging

Schema: `layerMask` as `Num [0, 0xFFFFFFFF]` with default `0x0FFFFFFF` (Babylon.js default). Maps directly to Babylon.js `light.includedOnlyWithLayerMask`.

**Lightmap Mode:**
Maps to `light.lightmapMode`:
- `'default'` → `Light.LIGHTMAP_DEFAULT`
- `'specular'` → `Light.LIGHTMAP_SPECULAR`
- `'shadowsOnly'` → `Light.LIGHTMAP_SHADOWSONLY`

**Shadow Opacity:**
Not a direct Babylon.js property, but achieved via `shadowGenerator.darkness`. We already have `darkness` in the shadow config. Adding `shadowOpacity` as a convenience alias that maps to `1 - darkness` is confusing — instead, we'll skip this and rely on the existing `darkness` field (it already provides shadow opacity control). Replace "shadow opacity" with making `darkness` more prominent in the dev harness.

### E. Lens Flare Expansion

**Presets:**
4 curated presets that generate flare element arrays:

| Preset | Elements | Character |
|---|---|---|
| `sun` | 6 elements: large bright center, small blue ghosts, rainbow ring | Outdoor sun flare |
| `moonGlow` | 3 elements: soft white center glow, subtle blue halo | Night moon flare |
| `crystalLight` | 5 elements: prismatic rainbow ghosts, diamond sparkle | Fantasy crystal |
| `torchGlow` | 2 elements: warm orange center, small amber ghost | Indoor warm light |

When `preset` is set AND `flares` is omitted, the runtime generates the preset flare array. Custom `flares` always override the preset.

**New LensFlareConfigSchema fields:**

| Field | Type | Default | Babylon.js Mapping |
|---|---|---|---|
| `preset` | Picklist | undefined | Generates flare array at runtime |
| `haloWidth` | Num [0, 2] | `0.4` | `LensFlare` with size = haloWidth at position 0 |
| `ghostDispersal` | Num [0, 2] | `0.3` | Spacing multiplier between ghost elements |
| `threshold` | Num [0, 1] | `0.5` | Minimum dot product for flare visibility |

`haloWidth` and `ghostDispersal` parameterize the preset flare generation (element sizes and spacing). `threshold` is applied as a visibility check — when the dot product between the camera forward vector and the light direction falls below threshold, flares fade out.

### F. Volumetric Light Expansion

Two new fields on `VolumetricLightConfigSchema`:

| Field | Type | Default | Babylon.js Mapping |
|---|---|---|---|
| `exposure` | Num [0, 2] | `1.0` | `vlsPostProcess.exposure` |
| `color` | ColorRgba | white (1,1,1,1) | `vlsPostProcess.mesh.material.diffuseColor` (tints god ray mesh) |

Both are already supported by Babylon.js `VolumetricLightScatteringPostProcess` — just not exposed in our schema.

## Dev Harness Controls

All new fields map to controls in the existing **Lights** section (#11) of the dev harness sidebar. Each per-light expanded panel gets new sub-sections:

### Shadow Sub-Section (expanded)

Current controls: enabled, type, mapSize, filteringQuality, bias, normalBias, darkness, transparencyShadow, enableSoftTransparentShadow, numCascades, stabilizeCascades, cascadeBlendPercentage, autoCalcDepthBounds

New controls:
- **Filter Type** — Select dropdown (none, esm, blurredEsm, closeEsm, blurredCloseEsm, pcf, pcss, poisson)
- **Force Back Faces Only** — Toggle
- **Frustum Edge Falloff** — Slider [0, 1]
- **Contact Hardening Light Size** — Slider [0, 1] (visible when filterType = pcss)
- **Use Kernel Blur** — Toggle (visible when filterType contains "esm")
- **Blur Kernel** — Slider [1, 64] (visible when useKernelBlur = true)
- **Blur Scale** — Slider [0.5, 4] (visible when useKernelBlur = true)
- **Depth Scale** — Slider [0, 1000] (visible when filterType contains "esm")
- **Use Opacity Texture** — Toggle
- **Lambda** — Slider [0, 1] (cascade only)
- **Depth Clamp** — Toggle (cascade only)
- **Penumbra Darkness** — Slider [0, 1] (cascade only)
- **Shadow Max Z** — Slider [0, 1000] (cascade only)
- **Freeze Bounding Info** — Toggle (cascade only)

### Light Properties Sub-Section (new)

- **Radius (PBR)** — Slider [0, 10] (Point, Spot only)
- **Render Priority** — Slider [0, 10] (integer)
- **Inner Angle** — Slider [0, PI] (Spot only)
- **Shadow Frustum Size** — Slider [0, 100] (Directional only)
- **Shadow Ortho Scale** — Slider [0, 1] (Directional only)
- **Auto Update Extends** — Toggle (Directional only)
- **Shadow Min Z** — Slider [0, 500] (Point, Spot, Directional)
- **Shadow Max Z** — Slider [0, 500] (Point, Spot, Directional)
- **Layer Mask** — Slider [0, 0x0FFFFFFF] (all)
- **Lightmap Mode** — Select (default, specular, shadowsOnly)

### Distance Fade Sub-Section (new)

- **Enabled** — Toggle
- **Start Distance** — Slider [0, 500]
- **End Distance** — Slider [0, 500]

### Flicker Sub-Section (expanded)

Type dropdown gains 6 new options: storm, heartbeat, random, neon, dying, siren

### Volumetric Light Sub-Section (expanded)

- **Exposure** — Slider [0, 2]
- **Color** — Color picker

### Lens Flare Sub-Section (expanded)

- **Preset** — Select (none, sun, moonGlow, crystalLight, torchGlow)
- **Halo Width** — Slider [0, 2]
- **Ghost Dispersal** — Slider [0, 2]
- **Threshold** — Slider [0, 1]

## Files

| File | Changes |
|---|---|
| `schemas/lighting-config.ts` | +18 shadow fields, +8 light fields, +6 flicker modes, +2 volumetric fields, +4 lens flare fields, +DistanceFadeConfigSchema, +ShadowFilterTypeSchema, +LensFlarePresetSchema, +LightmapModeSchema |
| `schemas/lighting-config.test.ts` | Tests for all new schema fields, validation, defaults |
| `rendering/shadow-manager.ts` | Apply new shadow filter types + 13 new properties |
| `rendering/shadow-manager.test.ts` | Tests for new filter types and properties |
| `rendering/light-manager.ts` | Apply new per-light properties, distance fade observer, expanded lens flare + volumetric setup |
| `rendering/light-manager.test.ts` | Tests for new light properties, distance fade, lens flare presets |
| `rendering/light-animation.ts` | +6 flicker mode formulas in `computeFlicker()` |
| `rendering/light-animation.test.ts` | Tests for new flicker modes |
| `dev/dev.ts` | New dev harness controls for all ~35 new configurable fields |
