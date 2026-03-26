# Sky/Parallax/Environment Expansion Design

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Full expansion of sky rendering, parallax system, and environment integration

---

## Current State

The sky/parallax/environment system has ~49 tests across 3 files:

- 4 sky types (color, gradient, skybox, procedural) — gradient is broken (only uses first stop)
- Parallax layers with camera-relative scrolling, opacity, scale, tiling, offsetY
- Scene setup with clear color, ambient color, fog modes
- Dev harness with clear color RGBA sliders + per-layer parallax controls

### Known Gaps

1. Gradient sky ignores all stops except the first (sets clearColor only)
2. No auto-scrolling (layers only move with camera, not independently)
3. No foreground layers (everything renders behind tilemap)
4. No blend mode control (hardcoded alpha combine)
5. No layer tinting
6. Procedural sky is approximated via BackgroundMaterial, not real SkyMaterial
7. No sky animation / day-night integration
8. No star field
9. No runtime layer add/remove
10. No opacity fade transitions

---

## New Features

### 1. Fix Gradient Sky Rendering

Generate a 1x256 gradient texture from the color stops array. Apply to a fullscreen BackgroundMaterial plane (same mesh approach as skybox mode). The texture is a 1-pixel-wide, 256-pixel-tall strip where each row is interpolated from the stops (position 0 = top, position 1 = bottom).

Texture is regenerated when gradient colors change (e.g., day/night transition). Replaces the broken single-clearColor approach.

### 2. Procedural Sky — Real SkyMaterial

Add `@babylonjs/materials` dependency. Replace the procedural sky path with actual Babylon.js `SkyMaterial`, which provides physically-based Rayleigh/Mie scattering.

New schema fields on `SkyConfigSchema`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mieCoefficient` | Num [0, 0.1] | 0.005 | Mie scattering intensity |
| `mieDirectionalG` | Num [0, 1] | 0.8 | Mie directional parameter |
| `inclination` | Num [0, 0.5] | 0.49 | Sun vertical angle |
| `azimuth` | Num [0, 1] | 0.25 | Sun horizontal angle |

When day/night integration is active, `inclination` and `azimuth` are computed from the sun direction automatically (overriding manual values).

### 3. Parallax System Expansion

New fields on `ParallaxLayerSchema`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `autoScrollX` | Num | 0 | Constant horizontal drift (UV/sec), camera-independent |
| `autoScrollY` | Num | 0 | Constant vertical drift (UV/sec), camera-independent |
| `layerType` | picklist | `'background'` | `'background'` (behind tilemap) or `'foreground'` (above tilemap) |
| `blendMode` | picklist | `'alpha'` | `'alpha'`, `'additive'`, `'multiply'`, `'subtract'`, `'screen'` |
| `tint` | ColorRgba | `{r:1,g:1,b:1,a:1}` | Color tint multiplied with texture |
| `depth` | Num | 0 | Sort order (lower = further back) |

Observer changes:
- Add `autoScrollX * deltaTime` and `autoScrollY * deltaTime` to UV offset each frame
- Foreground layers use `new BABYLON.Layer(name, url, scene, false)` (isBackground=false)
- Blend mode mapped to `BABYLON.Constants.ALPHA_*` constants
- Tint applied via `bgLayer.color = new Color4(tint.r, tint.g, tint.b, opacity)`
- Layers sorted by depth before creation

Blend mode mapping:

```
'alpha'     → Constants.ALPHA_COMBINE
'additive'  → Constants.ALPHA_ADD
'multiply'  → Constants.ALPHA_MULTIPLY
'subtract'  → Constants.ALPHA_SUBTRACT
'screen'    → Constants.ALPHA_SCREENMODE
```

### 4. Runtime Layer Management API

| Function | Purpose |
|----------|---------|
| `addParallaxLayer(instance, layer)` | Add a new layer at runtime, returns Result<Bool> |
| `removeParallaxLayer(instance, index)` | Remove a layer by index, disposes the Layer |
| `fadeLayerOpacity(instance, index, target, durationMs)` | Smooth opacity fade, returns handle with dispose() |
| `getParallaxLayerCount(instance)` | Get number of active layers |
| `setParallaxLayerTint(instance, index, tint)` | Change layer tint at runtime |

`fadeLayerOpacity` uses `scene.registerBeforeRender` with per-frame lerp. Auto-removes the observer when target is reached. Returns a handle with `dispose()` to cancel mid-fade.

### 5. Day/Night Sky Integration

New optional fields on `TimeKeyframeSchema` (existing day/night cycle schema):

| Field | Type | Description |
|-------|------|-------------|
| `skyColor` | ColorRgba | Primary sky color (clearColor for color mode, tint for gradient) |
| `skyGradientTop` | ColorRgba | Top gradient color (for gradient mode) |
| `skyGradientBottom` | ColorRgba | Bottom gradient color (for gradient mode) |
| `fogSyncSky` | Bool | When true, fog color auto-follows sky horizon color |

The existing day/night cycle observer interpolates these fields alongside lighting colors. The sky system reads interpolated values from the cycle instance each frame:

- **Color mode:** Sets `scene.clearColor` to interpolated `skyColor`
- **Gradient mode:** Regenerates gradient texture from interpolated top/bottom colors
- **Procedural mode:** Updates `SkyMaterial.inclination`/`azimuth` from computed sun direction
- **Skybox mode:** No animation (static cubemap)

When `fogSyncSky` is true, `scene.fogColor` is set to the interpolated `skyGradientBottom` (horizon color) for visual coherence.

Default keyframes gain sky color values for the full dawn→noon→dusk→night cycle.

### 6. Star Field

New optional `stars` field on `SkyConfigSchema`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | Bool | false | Enable star field layer |
| `texture` | string | (required if enabled) | Path to star texture |
| `opacity` | Num [0, 1] | 0.8 | Max opacity when fully visible |
| `twinkleSpeed` | Num [0, 5] | 1 | Twinkle oscillation speed |
| `fadeInTime` | Num [0, 24] | sunset - 1h | Hour when stars begin fading in |
| `fadeOutTime` | Num [0, 24] | sunrise + 0.5h | Hour when stars finish fading out |
| `scale` | Num [0.1, 10] | 2 | Texture scale |

Implemented as a `BABYLON.Layer` with `isBackground = true`. Per-frame:
- Opacity = 0 during daytime, fades to `opacity` between fadeIn/fadeOut times
- Twinkle: small `sin(time * twinkleSpeed)` oscillation on top of base opacity
- Uses additive blending for natural star glow against dark sky

### 7. Dev Harness Controls

All new features get UI controls in the Environment section:

**Parallax per-layer:**
- Auto-Scroll X slider [-2, 2]
- Auto-Scroll Y slider [-2, 2]
- Blend Mode dropdown (alpha/additive/multiply/subtract/screen)
- Layer Type toggle (Background/Foreground)
- Tint R/G/B sliders [0, 1]
- Fade Opacity button (fades to 0 over 1s, then back to 1)
- Add Layer / Remove Layer buttons

**Sky procedural (when type=procedural):**
- Mie Coefficient slider [0, 0.1]
- Mie Directional G slider [0, 1]
- Inclination slider [0, 0.5]
- Azimuth slider [0, 1]

**Stars:**
- Enabled toggle
- Opacity slider [0, 1]
- Twinkle Speed slider [0, 5]

**Day/night sync:**
- Sky Sync toggle (enables sky color animation from day/night cycle)

---

## Schema Changes Summary

### sky-config.ts additions

```
SkyConfigSchema:
  mieCoefficient    — Num [0, 0.1], default 0.005
  mieDirectionalG   — Num [0, 1], default 0.8
  inclination       — Num [0, 0.5], default 0.49
  azimuth           — Num [0, 1], default 0.25
  stars             — optional StarsConfigSchema

ParallaxLayerSchema additions:
  autoScrollX       — Num, default 0
  autoScrollY       — Num, default 0
  layerType         — picklist: background | foreground, default background
  blendMode         — picklist: alpha | additive | multiply | subtract | screen, default alpha
  tint              — ColorRgba, default {r:1, g:1, b:1, a:1}
  depth             — Num, default 0

New StarsConfigSchema:
  enabled           — Bool, default false
  texture           — string (min 1 char)
  opacity           — Num [0, 1], default 0.8
  twinkleSpeed      — Num [0, 5], default 1
  fadeInTime         — Num [0, 24], optional
  fadeOutTime        — Num [0, 24], optional
  scale             — Num [0.1, 10], default 2

New BlendModeSchema:
  picklist: alpha | additive | multiply | subtract | screen

New LayerTypeSchema:
  picklist: background | foreground
```

### lighting-config.ts additions (TimeKeyframe)

```
skyColor            — optional ColorRgba
skyGradientTop      — optional ColorRgba
skyGradientBottom   — optional ColorRgba
fogSyncSky          — optional Bool
```

---

## New API Functions

| Function | Module | Purpose |
|----------|--------|---------|
| `addParallaxLayer` | parallax-manager | Add layer at runtime |
| `removeParallaxLayer` | parallax-manager | Remove layer by index |
| `fadeLayerOpacity` | parallax-manager | Smooth opacity fade |
| `getParallaxLayerCount` | parallax-manager | Get layer count |
| `setParallaxLayerTint` | parallax-manager | Change tint at runtime |
| `updateSkyFromDayNight` | sky-system | Apply interpolated sky values |
| `regenerateGradientTexture` | sky-system | Rebuild gradient from new colors |

---

## Files to Modify

| File | Changes |
|------|---------|
| `schemas/sky-config.ts` | New parallax fields, SkyMaterial fields, stars schema, blend mode schema |
| `schemas/lighting-config.ts` | Sky color fields on TimeKeyframeSchema |
| `rendering/sky-system.ts` | Fix gradient, real SkyMaterial, star field, day/night integration |
| `rendering/parallax-manager.ts` | Auto-scroll, foreground, blend modes, tint, runtime API, fade |
| `rendering/day-night-cycle.ts` | Apply interpolated sky values, update SkyMaterial from sun |
| `index.ts` | Export new functions and types |
| `dev/dev.ts` + `dev/index.html` | All new dev harness controls |
| `docs/ARCHITECTURE.md` | Sky/parallax system section |
| `package.json` | Add `@babylonjs/materials` dependency |

---

## Research Sources

Design informed by:
- Babylon.js SkyMaterial documentation (Rayleigh/Mie scattering parameters)
- Babylon.js Layer API (isBackground, alphaBlendingMode, color tinting)
- RPG Maker MZ VisuStella Visual Fogs plugin (20+ layers, blend modes, runtime commands)
- RPG Maker XP/2003 fog system (foreground overlays, auto-scroll)
- Godot ParallaxBackground/ParallaxLayer (motion_scale, mirroring)
- Unity parallax scrolling patterns (sorting layers, delta-based movement)
- Octopath Traveler HD-2D environment techniques (atmospheric overlays, diorama depth)
