# Transitions System Design

## Goal

Replace the DOM-overlay screen effects system with a full shader-based transition engine supporting 28 transition types via a unified PostProcess pipeline. All transitions use procedural mask generation in GLSL — no texture uploads needed for built-in types. Custom mask textures supported for user-defined transitions.

## Architecture

Single custom `BABYLON.PostProcess` with a GLSL uber-shader. The shader computes mask values procedurally from UV coordinates + type parameters. A `progress` uniform (0.0→1.0) sweeps through the mask, transitioning pixels based on their mask brightness relative to the cutoff.

**Two shader paths:**

1. **Mask path** (14 types): Computes grayscale mask per-pixel, compares against `progress` with configurable `edgeSoftness` (smoothstep width) and optional `edgeColor` tint at the boundary.

2. **Procedural path** (14 types): Custom per-pixel math for effects that can't be expressed as simple masks — pixelate (UV snapping), CRT power-off (squeeze), swirl (UV rotation), shatter (Voronoi displacement), glitch (RGB separation), etc.

**Cross-fade support:** Before transition starts, current frame is captured to a `RenderTargetTexture`. Shader blends RTT (old frame) with live scene (new frame) through the mask. Enables dissolve/cross-fade without intermediate solid color.

**Custom mask texture support:** Users can provide a grayscale PNG. Shader reads from it instead of computing procedurally.

## Babylon.js PostProcess Integration

- Fragment shader registered via `Effect.ShadersStore["transitionFragmentShader"]`
- PostProcess created with `new BABYLON.PostProcess(name, 'transition', params, samplers, 1.0, null, ...)`
- Attached to camera via `camera.attachPostProcess(pp)` when transition starts
- Detached + disposed via `camera.detachPostProcess(pp); pp.dispose()` when complete
- Uniforms set per-frame via `postProcess.onApply = (effect) => { effect.setFloat(...); }`
- GLSL uses `varying vec2 vUV`, `uniform sampler2D textureSampler` (mandatory), custom uniforms

## Transition Types (28)

### Mask-Based (14)

| Type | Mask Algorithm | Parameters |
|------|---------------|------------|
| `fade` | Uniform (all pixels same value) | `color` |
| `crossFade` | Uniform + RTT blend | — |
| `circleIris` | Radial distance from point | `centerX`, `centerY` |
| `diamondIris` | Manhattan distance from point | `centerX`, `centerY` |
| `wipe` | Linear gradient along axis | `direction` (left/right/up/down) |
| `diagonalWipe` | Angled linear gradient | `angle` |
| `doubleDoor` | Distance from center axis | `direction`, `openFromCenter` |
| `noiseDissove` | Value noise | `scale`, `seed` |
| `ditheredFade` | Bayer matrix ordered dithering | `matrixSize` (2/4/8) |
| `venetianBlinds` | Repeating stripe gradient | `count`, `direction` |
| `bars` | Staggered bar sweep | `count`, `direction` |
| `checkerboard` | Alternating block values | `gridSize` |
| `radialWipe` | Angular gradient (atan2) | `startAngle`, `clockwise` |
| `scanlineReveal` | Horizontal line sweep | `lineWidth` |

### Procedural (14)

| Type | Algorithm | Parameters |
|------|-----------|------------|
| `pixelate` | UV snapping to coarsening grid + fade | `maxBlockSize` |
| `crtPowerOff` | Vertical squeeze → horizontal squeeze → dot | `scanlines` |
| `swirl` | UV rotation increasing toward center | `strength`, `radius` |
| `zoomLines` | Radiating lines from center + zoom | `lineCount`, `lineWidth` |
| `shatter` | Voronoi cell displacement + gravity | `cellCount` |
| `wavyDistortion` | Sine wave UV distortion | `amplitude`, `frequency` |
| `hexagonalize` | Hexagonal grid dissolve | `gridSize` |
| `pinwheel` | Angular sector sweep | `bladeCount` |
| `polkaDots` | Expanding circular dots on grid | `dotCount` |
| `gridFlip` | Tile flip with staggered timing | `gridSize` |
| `glitch` | RGB separation + block displacement | `intensity` |
| `ripple` | Concentric circle UV distortion | `centerX`, `centerY`, `waveCount` |
| `wind` | Horizontal pixel streaking | `strength` |
| `chromaticBurst` | RGB channel separation burst | `intensity` |

### Shared Parameters (all types)

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `durationMs` | 100–10000 | 1000 | Transition duration |
| `easing` | enum | `'easeInOut'` | Progress curve |
| `edgeSoftness` | 0.0–0.5 | 0.02 | Smoothstep width at mask boundary |
| `edgeColor` | Color3 \| null | null | Tint at transition edge |
| `reverse` | bool | false | Play in reverse (for "in" phase) |
| `color` | Color3 | black | Background/target color (non-crossfade) |

### Easing Functions

Extends existing 4 camera easings to 6:
- `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeOutBack`, `easeInOutCubic`

## Public API

### Core

```
playTransition(options: PlayTransitionOptions) → BabylonResult<TransitionHandle>
```

`TransitionHandle = { dispose: () => void }`

### Convenience Wrappers

```
fadeToBlack(options)    → BabylonResult<TransitionHandle>
fadeToWhite(options)    → BabylonResult<TransitionHandle>
fadeToColor(options)    → BabylonResult<TransitionHandle>
crossFade(options)      → BabylonResult<TransitionHandle>
screenFlash(options)    → BabylonResult<TransitionHandle>
screenTint(options)     → BabylonResult<TransitionHandle>
```

### Schema Exports

```
TransitionConfigSchema
TransitionTypeSchema
TransitionEasingSchema
TRANSITION_PRESETS
```

## Screen-Effects Migration

Old DOM-overlay `screen-effects.ts` is deleted. Callers migrate:

| Old | New |
|-----|-----|
| `screenFadeIn(opts)` | `playTransition({ type: 'fade', reverse: true, ...})` |
| `screenFadeOut(opts)` | `playTransition({ type: 'fade', ...})` |
| `screenTint(opts)` | `screenTint(opts)` (new convenience wrapper with hold phase) |
| `screenFlash(opts)` | `screenFlash(opts)` (new convenience wrapper) |

## Dev Harness UI

New "Transitions" section replacing Screen Effects:

**Controls:**
- Type selector dropdown (28 types grouped by category)
- Play Out / Play In / Play Cycle / Play Cross-Fade buttons
- Duration slider (100–10000ms)
- Easing dropdown
- Background Color picker + presets (Black, White, Red)
- Edge Softness slider (0.0–0.5)
- Edge Color toggle + picker
- Context-sensitive parameter controls (shown/hidden based on type):
  - Direction dropdown (wipe, bars, venetian, doubleDoor)
  - Center X/Y sliders (circleIris, diamondIris, ripple)
  - Count slider (venetian, bars, polkaDots, zoomLines)
  - Grid Size slider (checkerboard, hexagonalize, gridFlip)
  - Noise Scale/Seed sliders (noiseDissove)
  - Angle slider (diagonalWipe, radialWipe, pinwheel)
  - Intensity slider (glitch, chromaticBurst, wind)
  - Amplitude/Frequency sliders (wavyDistortion)
  - Strength/Radius sliders (swirl)
  - Block Size slider (pixelate)
  - Scanlines toggle (crtPowerOff)
  - Matrix Size dropdown (ditheredFade)
  - Blade Count slider (pinwheel)
  - Wave Count slider (ripple)
  - Cell Count slider (shatter)
  - Line Count/Width sliders (zoomLines)
  - Clockwise toggle (radialWipe)
  - Open From Center toggle (doubleDoor)

**Quick Presets row:** fadeToBlack, fadeToWhite, circleIris, pixelate, wipeLeft, noiseDissove — one-click cycle demos.

## File Structure

```
src/
├── schemas/
│   └── transition-config.ts       — All Valibot schemas + TRANSITION_PRESETS
├── rendering/
│   ├── transition-manager.ts      — playTransition, convenience wrappers, PostProcess lifecycle
│   ├── transition-shader.ts       — GLSL fragment shader string + PostProcess factory
│   ├── transition-manager.test.ts — Tests
│   └── screen-effects.ts          — DELETED
│   └── screen-effects.test.ts     — DELETED
├── index.ts                       — Updated exports
dev/
├── dev.ts                         — Replace Screen Effects UI with Transitions UI
README.md                          — Updated API docs
```
