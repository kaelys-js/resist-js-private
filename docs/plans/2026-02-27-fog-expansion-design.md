# Fog Expansion Design

## Goal

Expand the minimal 5-property fog system (mode, color, density, start, end) into a comprehensive 77+ option fog engine covering enhanced core parameters, height fog, dual fog layers, directional inscattering, atmospheric scattering, noise-based density, wind movement, scrolling overlays, animated density, presets, day/night integration, and per-mesh control.

## Architecture

### Three Fog Tiers

1. **Scene fog** (Babylon.js built-in): Enhanced with maxOpacity, startDistance, cutoffDistance via a custom post-process that clamps/modifies the standard fog output.

2. **Advanced fog post-process** (custom GLSL): Single `BABYLON.PostProcess` handling height fog, dual layers, inscattering, atmospheric scattering, noise density, wind, and animated density. Reads from depth buffer via `DepthRenderer` to reconstruct world-space positions.

3. **Overlay fog** (screen-space quads): Up to 4 scrolling texture layers rendered as full-screen quads with blend modes, tint, hue animation, and vignette masks. Uses `BABYLON.Layer` or custom `PostProcess` per overlay.

### Post-Process Pipeline

```
Scene renders normally with Babylon.js built-in fog
  → Advanced Fog PostProcess (height, dual layer, inscattering, atmospheric, noise, wind, animation)
  → Overlay PostProcess (up to 4 scrolling texture layers)
```

The advanced fog post-process samples the depth buffer, reconstructs world position, and computes fog density analytically. It then blends its result with the existing scene fog output.

## Babylon.js Integration

### Depth Buffer Access

```typescript
scene.enableDepthRenderer(camera, false, true);  // force32bits = true
const depthTexture = scene.enableDepthRenderer().getDepthMap();
```

The depth renderer produces a texture where each pixel stores normalized depth (0 = near, 1 = far). World position is reconstructed in the fragment shader:

```glsl
float depth = texture2D(depthSampler, vUV).r;
// Reconstruct world position from depth + inverse view-projection matrix
vec4 clipPos = vec4(vUV * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
vec4 worldPos = invViewProj * clipPos;
worldPos /= worldPos.w;
```

### PostProcess Registration

Same pattern as transition shader:
- Fragment shader stored in `BABYLON.Effect.ShadersStore["webforgeFogFragmentShader"]`
- Created via `new BABYLON.PostProcess('webforge-fog', 'webforgeFog', uniforms, samplers, 1.0, camera)`
- Uniforms updated per-frame via `postProcess.onApply`

### Overlay Layers

Each overlay uses `BABYLON.Layer`:
- `new BABYLON.Layer(name, textureUrl, scene, isBackground)` with `isBackground = false` (foreground)
- Layer alpha, color, and offset updated per-frame for scrolling
- Alternative: custom PostProcess per overlay for blend mode control

For blend modes beyond normal alpha blending, a custom PostProcess per overlay is required since `BABYLON.Layer` only supports standard alpha blending. The overlay post-process samples a tileable noise/cloud texture and composites with the scene using the selected blend mode.

## Feature Groups

### Group 1: Enhanced Core Parameters

Extend existing Babylon.js scene fog with clamping and distance control.

| Property | Type | Default | Babylon.js Mapping |
|----------|------|---------|-------------------|
| `maxOpacity` | `Num [0,1]` | `1.0` | Custom post-process clamps fog factor |
| `startDistance` | `Num >= 0` | `0` | Offsets fog start for exp/exp2 modes |
| `cutoffDistance` | `Num >= 0` | `0` | Disables fog beyond this distance (0 = disabled) |
| `excludeSkybox` | `Bool` | `true` | Sets `skyboxMesh.applyFog = false` |
| `skyAffect` | `Num [0,1]` | `0.0` | Blends fog into sky (0 = no fog on sky) |

**Implementation:** `maxOpacity` and `startDistance` modify the fog factor in the advanced post-process. `cutoffDistance` zeroes fog beyond the distance. `excludeSkybox` sets `mesh.applyFog = false` on skybox meshes. `skyAffect` is applied in the post-process by comparing depth against far plane.

### Group 2: Height Fog

Vertical density gradient — denser near the ground, thinner at altitude.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `heightFog.enabled` | `Bool` | `false` | Enable height-based density |
| `heightFog.baseHeight` | `Num` | `0` | Reference altitude (densest below) |
| `heightFog.falloff` | `Num [0.01, 10]` | `0.5` | Density decrease rate with altitude |
| `heightFog.density` | `Num [0, 1]` | `0.1` | Base density at reference height |
| `heightFog.offset` | `Num` | `0` | Vertical offset |

**GLSL formula** (Inigo Quilez analytical height fog):
```glsl
float heightFog(vec3 ro, vec3 rd, float t, float a, float b) {
    float fogAmount = (a / b) * exp(-ro.y * b) * (1.0 - exp(-t * rd.y * b)) / rd.y;
    return clamp(fogAmount, 0.0, 1.0);
}
```
Where `a` = density, `b` = falloff, `ro` = camera position, `rd` = ray direction, `t` = distance.

### Group 3: Second Fog Layer (Unreal-style)

Independent second fog layer at a different altitude.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `secondLayer.enabled` | `Bool` | `false` | Enable second layer |
| `secondLayer.density` | `Num [0, 1]` | `0.05` | Second layer density |
| `secondLayer.heightFalloff` | `Num [0.01, 10]` | `0.2` | Height falloff |
| `secondLayer.heightOffset` | `Num` | `0` | Height offset from base |
| `secondLayer.color` | `RGBA` | `{r:0.7,g:0.75,b:0.8,a:1}` | Blended with primary fog color |

**Implementation:** Computed as a second independent `heightFog()` call in the shader, then blended with the primary fog using additive mixing.

### Group 4: Directional Inscattering

Sun glow effect when looking toward a light source through fog.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `inscattering.enabled` | `Bool` | `false` | Enable inscattering |
| `inscattering.color` | `RGBA` | `{r:1,g:0.9,b:0.7,a:1}` | Glow color |
| `inscattering.exponent` | `Num [1, 32]` | `4.0` | Cone tightness |
| `inscattering.startDistance` | `Num >= 0` | `50` | Effect start distance |
| `inscattering.intensity` | `Num [0, 5]` | `1.0` | Brightness multiplier |

**GLSL formula:**
```glsl
// sunDir = normalized direction to sun/directional light
float sunDot = max(dot(normalize(worldPos - cameraPos), sunDir), 0.0);
float inscatter = pow(sunDot, inscatterExponent) * inscatterIntensity;
vec3 inscatterColor = fogColor + inscatter * uInscatterColor;
```

**Sun direction source:** Read from the first directional light in the scene (`scene.lights` filtered by type), or from the day/night cycle sun position if active.

### Group 5: Atmospheric Scattering

Per-channel extinction/inscattering for physically-based color shifts.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `atmospheric.enabled` | `Bool` | `false` | Enable atmospheric mode |
| `atmospheric.extinctionR` | `Num [0, 0.5]` | `0.02` | Red extinction |
| `atmospheric.extinctionG` | `Num [0, 0.5]` | `0.03` | Green extinction |
| `atmospheric.extinctionB` | `Num [0, 0.5]` | `0.05` | Blue extinction |
| `atmospheric.inscatteringR` | `Num [0, 0.5]` | `0.04` | Red inscattering |
| `atmospheric.inscatteringG` | `Num [0, 0.5]` | `0.04` | Green inscattering |
| `atmospheric.inscatteringB` | `Num [0, 0.5]` | `0.06` | Blue inscattering |

**GLSL formula:**
```glsl
vec3 extinction = vec3(uExtR, uExtG, uExtB);
vec3 inscattering = vec3(uInsR, uInsG, uInsB);
vec3 extFactor = exp(-dist * extinction);
vec3 insFactor = 1.0 - exp(-dist * inscattering);
color.rgb = color.rgb * extFactor + fogColor * insFactor;
```

### Group 6: Noise-Based Density Variation

Procedural noise modulates fog density for organic, non-uniform appearance.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `noise.enabled` | `Bool` | `false` | Enable noise modulation |
| `noise.scale` | `Num [0.1, 10]` | `1.0` | Spatial frequency |
| `noise.amplitude` | `Num [0, 1]` | `0.5` | Density modulation strength |
| `noise.speed` | `Num [0, 2]` | `0.1` | Temporal morphing speed |
| `noise.octaves` | `Num [1, 6]` | `3` | FBM octave count |
| `noise.lacunarity` | `Num [1, 4]` | `2.0` | Frequency multiplier per octave |
| `noise.persistence` | `Num [0.1, 0.9]` | `0.5` | Amplitude multiplier per octave |

**Implementation:** 3D value noise computed in the fragment shader using world position + time offset. FBM (fractal Brownian motion) layers multiple octaves for detail. The noise value multiplies the fog density before applying the fog blend.

```glsl
float noiseVal = fbm(worldPos.xz * noiseScale + time * noiseSpeed, octaves, lacunarity, persistence);
float modulatedDensity = baseDensity * (1.0 + noiseAmplitude * (noiseVal * 2.0 - 1.0));
```

### Group 7: Wind / Fog Movement

Shifts noise sampling position over time for directional fog drift.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `wind.enabled` | `Bool` | `false` | Enable wind |
| `wind.directionAngle` | `Num [0, 360]` | `0` | Wind direction in degrees |
| `wind.speed` | `Num [0, 5]` | `0.5` | Wind speed multiplier |
| `wind.turbulence` | `Num [0, 1]` | `0.2` | Random perturbation intensity |

**Implementation:** Wind offsets the noise sampling coordinate:
```glsl
vec2 windDir = vec2(cos(radians(uWindAngle)), sin(radians(uWindAngle)));
vec2 windOffset = windDir * uWindSpeed * time;
float noiseVal = fbm((worldPos.xz + windOffset) * noiseScale, ...);
```

Turbulence adds a secondary noise layer to the wind offset for organic movement.

### Group 8: Scrolling Fog Overlays (RPG Maker-style)

Up to 4 independent screen-space texture layers.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `overlays[n].enabled` | `Bool` | `false` | Enable layer |
| `overlays[n].texture` | `Str` | `'perlin'` | Built-in or custom path |
| `overlays[n].opacity` | `Num [0, 1]` | `0.3` | Layer opacity |
| `overlays[n].blendMode` | `Str` | `'additive'` | normal/additive/multiply/screen |
| `overlays[n].scrollX` | `Num` | `0.5` | Horizontal scroll speed |
| `overlays[n].scrollY` | `Num` | `0.0` | Vertical scroll speed |
| `overlays[n].scale` | `Num [0.1, 10]` | `1.0` | Texture tiling scale |
| `overlays[n].tint` | `RGBA` | white | Color tint |
| `overlays[n].hue` | `Num [0, 360]` | `0` | Hue shift |
| `overlays[n].hueSpeed` | `Num` | `0` | Animated hue rotation/sec |
| `overlays[n].mapLocked` | `Bool` | `false` | Scroll with map vs camera |
| `overlays[n].vignette` | `Str` | `'none'` | Vignette mask type |
| `overlays[n].vignetteIntensity` | `Num [0, 1]` | `0.5` | Vignette strength |

**Built-in textures:** Generated procedurally at runtime using canvas:
- `'perlin'` — Standard Perlin noise (tileable 512x512)
- `'worley'` — Worley/cellular noise
- `'clouds'` — Multi-octave FBM cloud pattern
- `'wisps'` — Stretched directional noise for wispy fog
- `'smoke'` — Dense turbulent smoke pattern

**Blend mode GLSL:**
```glsl
// Normal: standard alpha blend
result = mix(scene, overlay, overlayAlpha);
// Additive: brightens
result = scene + overlay * overlayAlpha;
// Multiply: darkens
result = scene * mix(vec3(1.0), overlay, overlayAlpha);
// Screen: inverse multiply
result = 1.0 - (1.0 - scene) * (1.0 - overlay * overlayAlpha);
```

**Vignette types:** Mask multiplied against overlay opacity:
- `'border'` — Fade from all edges
- `'horizontal'` — Fade from left/right edges
- `'vertical'` — Fade from top/bottom edges
- `'upper'` / `'lower'` / `'left'` / `'right'` — One-sided fade

**Implementation:** Single overlay PostProcess with up to 4 texture samplers. Each layer's UV is scrolled by `time * scrollSpeed` and tiled by `scale`. Hue shift applied via RGB→HSV→RGB conversion in GLSL.

### Group 9: Animated Density

Density pulsing/breathing effect.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `animation.enabled` | `Bool` | `false` | Enable density animation |
| `animation.speed` | `Num [0.01, 5]` | `0.5` | Oscillation speed |
| `animation.amplitude` | `Num [0, 0.5]` | `0.3` | Density variation range |
| `animation.waveform` | `Str` | `'sine'` | sine/triangle/sawtooth |

**Implementation:**
```glsl
float animFactor;
if (waveform == 0) animFactor = sin(time * speed);           // sine
else if (waveform == 1) animFactor = abs(fract(time * speed) * 2.0 - 1.0) * 2.0 - 1.0;  // triangle
else animFactor = fract(time * speed) * 2.0 - 1.0;          // sawtooth
float animatedDensity = baseDensity * (1.0 + amplitude * animFactor);
```

### Group 10: Fog Presets

Named presets that populate all fog fields with curated defaults.

| Preset | Mode | Color | Density | Height | Noise | Wind | Overlays |
|--------|------|-------|---------|--------|-------|------|----------|
| `clear` | none | — | — | — | — | — | — |
| `lightMist` | exp | `(0.85,0.87,0.9)` | 0.003 | — | low | — | — |
| `morningFog` | exp2 | `(0.9,0.85,0.75)` | 0.008 | base=0, falloff=0.3 | med | gentle | wisps |
| `denseFog` | exp | `(0.7,0.7,0.72)` | 0.04 | — | high | — | clouds |
| `dungeon` | exp2 | `(0.15,0.12,0.1)` | 0.025 | — | low | — | smoke |
| `underwater` | exp | `(0.1,0.3,0.5)` | 0.06 | — | med | slow | — |
| `forest` | exp | `(0.3,0.45,0.25)` | 0.015 | base=0, falloff=0.5 | med | gentle | wisps |
| `mountain` | exp2 | `(0.9,0.9,0.95)` | 0.005 | base=5, falloff=0.2 | low | med | clouds |
| `sandstorm` | exp | `(0.7,0.55,0.3)` | 0.035 | — | high | strong | smoke |
| `snowstorm` | exp | `(0.85,0.85,0.9)` | 0.03 | — | high | strong | perlin |
| `dream` | exp2 | `(0.7,0.5,0.8)` | 0.008 | — | low | — | wisps |
| `volcanic` | exp | `(0.4,0.15,0.05)` | 0.02 | base=0, falloff=0.8 | high | med | smoke |
| `swamp` | exp | `(0.25,0.35,0.15)` | 0.018 | base=0, falloff=0.6 | med | slow | wisps |
| `nightMist` | exp2 | `(0.08,0.08,0.15)` | 0.006 | — | low | gentle | — |

Presets are applied by populating the FogConfig fields. The `preset` field is optional — when set, it fills all other fields with preset values. Individual fields can still override after preset application.

### Group 11: Day/Night Fog Integration

Animate fog color and density with the existing day/night cycle system.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `dayNight.enabled` | `Bool` | `false` | Enable integration |
| `dayNight.dayColor` | `RGBA` | `(0.8,0.85,0.9,1)` | Day fog color |
| `dayNight.nightColor` | `RGBA` | `(0.1,0.1,0.2,1)` | Night fog color |
| `dayNight.dawnColor` | `RGBA` | `(0.9,0.7,0.5,1)` | Dawn/dusk color |
| `dayNight.dayDensity` | `Num [0, 0.1]` | `0.005` | Day density |
| `dayNight.nightDensity` | `Num [0, 0.1]` | `0.02` | Night density |

**Implementation:** Each frame, read the current time-of-day progress from the day/night cycle system. Interpolate fog color and density between the three keyframes (dawn → day → dusk → night). The interpolated values override the base fog color/density before applying to the scene.

### Group 12: Per-Mesh Fog Control

Exclude specific mesh categories from fog.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `perMesh.excludeGround` | `Bool` | `false` | Exclude ground/tilemap meshes |
| `perMesh.excludeSprites` | `Bool` | `false` | Exclude billboard sprites |

**Implementation:** After meshes are created, set `mesh.applyFog = false` on matching meshes. The tilemap renderer tags its meshes, and sprite billboards are identified by name or metadata.

## File Structure

```
src/
├── schemas/
│   └── fog-config.ts               — Expanded Valibot schemas (all 12 groups)
│   └── fog-config.test.ts          — Schema validation tests
├── rendering/
│   ├── fog-manager.ts              — Fog lifecycle, PostProcess creation, per-frame updates
│   ├── fog-manager.test.ts         — Fog manager tests
│   ├── fog-shader.ts               — GLSL fragment shaders (advanced fog + overlay)
│   ├── fog-overlay-textures.ts     — Procedural texture generation (perlin, worley, clouds, wisps, smoke)
│   ├── fog-overlay-textures.test.ts — Texture generation tests
│   ├── fog-presets.ts              — FOG_PRESETS constant with all 14 presets
│   ├── fog-presets.test.ts         — Preset validation tests
│   ├── scene-setup.ts              — Modified: delegates to fog-manager
│   └── scene-setup.test.ts         — Updated tests
dev/
├── dev.ts                          — Expanded Fog UI section with sub-groups
├── index.html                      — Updated fog section HTML
src/
├── index.ts                        — Export new fog types and functions
README.md                           — Updated fog API docs
docs/ARCHITECTURE.md                — Updated fog architecture section
```

## Public API

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `applyFog` | `(scene, camera, config) => BabylonResult<FogHandle>` | Apply full fog system |
| `updateFog` | `(handle, config) => BabylonResult<Bool>` | Update fog parameters at runtime |
| `applyFogPreset` | `(handle, presetName) => BabylonResult<Bool>` | Apply named preset |
| `disposeFog` | `(handle) => void` | Clean up fog resources |

### FogHandle

```typescript
type FogHandle = {
    readonly postProcess: BABYLON.PostProcess | null;
    readonly overlayPostProcess: BABYLON.PostProcess | null;
    readonly dispose: () => void;
};
```

## Dev Harness UI

Expanded Fog section with collapsible sub-groups:

1. **Core** — Mode dropdown, density, start, end, color RGB, maxOpacity, startDistance, cutoffDistance, excludeSkybox, skyAffect
2. **Height Fog** — Enable toggle, baseHeight, falloff, density, offset
3. **Second Layer** — Enable toggle, density, heightFalloff, heightOffset, color RGB
4. **Inscattering** — Enable toggle, color picker, exponent, startDistance, intensity
5. **Atmospheric** — Enable toggle, 6x extinction/inscattering sliders (R/G/B)
6. **Noise** — Enable toggle, scale, amplitude, speed, octaves, lacunarity, persistence
7. **Wind** — Enable toggle, direction angle, speed, turbulence
8. **Overlays** — 4 collapsible layer groups, each with: enable, texture dropdown, opacity, blend mode, scrollX/Y, scale, tint color, hue, hueSpeed, mapLocked, vignette dropdown, vignetteIntensity
9. **Animation** — Enable toggle, speed, amplitude, waveform dropdown
10. **Presets** — Preset buttons (14 presets in 5 categories)
11. **Day/Night** — Enable toggle, day/night/dawn color pickers, day/night density sliders
12. **Per-Mesh** — excludeGround toggle, excludeSprites toggle

## Testing Strategy

TDD with comprehensive coverage:

- **Schema tests**: All 12 sub-schemas validate defaults, accept valid values, reject invalid values, reject unknown properties
- **Preset tests**: All 14 presets produce valid FogConfig when parsed
- **Fog manager tests**: PostProcess creation, uniform updates, dispose cleanup, preset application
- **Overlay texture tests**: Canvas generation produces expected dimensions, tileable patterns
- **Integration tests**: Scene fog properties set correctly, depth renderer enabled, post-process attached to camera
- **Edge cases**: Zero density, max opacity at 0, cutoff at 0 (disabled), empty overlays array, all features disabled

## References

- Inigo Quilez, "Better Fog" (height fog analytical formula)
- Unreal Engine 5 Exponential Height Fog documentation
- Unity HDRP Fog Volume Override documentation
- Godot 4 Environment fog + FogVolume documentation
- RPG Maker MZ VisuStella Visual Fogs plugin
- CryEngine Fog Volume documentation
- Babylon.js PostProcess API + DepthRenderer
