# Transitions

Screen transition system with 53 effect types, 6 easing curves, and 32 curated presets. All effects are GLSL shader-based PostProcesses.

## Overview

Transitions animate a mask value from 0 to 1 (or 1 to 0 for reverse) over a configurable duration. The mask controls per-pixel visibility, creating wipes, fades, dissolves, and distortion effects. Each transition is a full-screen PostProcess with a custom GLSL fragment shader.

## Configuration Reference

### Core

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `type` | Enum | (required) | 53 types | Transition effect |
| `durationMs` | Num | `1000` | 100--10000 | Duration (milliseconds) |
| `easing` | Enum | `'easeInOut'` | 6 curves | Easing function |
| `edgeSoftness` | Num | `0.02` | 0--0.5 | Mask edge softness |
| `reverse` | Bool | `false` | -- | Play in reverse |
| `color` | Color3 | black | 0--1 | Background color |
| `edgeColor` | Color3 | -- | 0--1 | Edge glow/outline color |

### Easing Curves

| Curve | Description |
|-------|-------------|
| `linear` | Constant speed |
| `easeIn` | Slow start, fast end |
| `easeOut` | Fast start, slow end |
| `easeInOut` | Slow start and end (default) |
| `easeOutBack` | Overshoot at end |
| `easeInOutCubic` | Smooth cubic S-curve |

### Direction & Axis

| Field | Type | Default | Values | Used By |
|-------|------|---------|--------|---------|
| `direction` | Enum | `'left'` | `'left'`, `'right'`, `'up'`, `'down'` | wipe, bars |
| `axis` | Enum | `'horizontal'` | `'horizontal'`, `'vertical'` | venetianBlinds, bars |
| `openFromCenter` | Bool | `true` | -- | iris, doubleDoor |

### Center / Iris

| Field | Type | Default | Range | Used By |
|-------|------|---------|-------|---------|
| `centerX` | Num | `0.5` | 0--1 | iris, radial effects |
| `centerY` | Num | `0.5` | 0--1 | iris, radial effects |

### Grid / Count

| Field | Type | Default | Range | Used By |
|-------|------|---------|-------|---------|
| `count` | Num | `10` | 2--100 | strips, blinds |
| `gridSize` | Num | `10` | 2--100 | checkerboard, gridFlip |
| `bladeCount` | Num | `4` | 2--16 | pinwheel, radialWipe |
| `pointCount` | Num | `5` | 3--12 | starIris |

### Angle / Rotation

| Field | Type | Default | Range | Used By |
|-------|------|---------|-------|---------|
| `angle` | Num | `45` | 0--360 | diagonalWipe |
| `clockwise` | Bool | `true` | -- | radial effects |

### Noise

| Field | Type | Default | Range | Used By |
|-------|------|---------|-------|---------|
| `noiseScale` | Num | `4` | 0.1--50 | noiseDissove |
| `noiseSeed` | Num | `0` | -- | noise-based |
| `matrixSize` | Enum | `4` | 2, 4, 8 | ditheredFade |

### Scanline / Block

| Field | Type | Default | Range | Used By |
|-------|------|---------|-------|---------|
| `lineWidth` | Num | `2` | 1--16 | scanlineReveal |
| `maxBlockSize` | Num | `32` | 4--128 | pixelate |
| `scanlines` | Bool | `true` | -- | crtPowerOff |

### Distortion

| Field | Type | Default | Range | Used By |
|-------|------|---------|-------|---------|
| `swirlStrength` | Num | `5` | 0.5--20 | swirl |
| `swirlRadius` | Num | `0.5` | 0.1--1 | swirl |
| `zoomLineWidth` | Num | `0.02` | 0.005--0.1 | zoomLines |
| `amplitude` | Num | `0.05` | 0.01--0.5 | wavyDistortion |
| `frequency` | Num | `10` | 1--50 | wavyDistortion |
| `waveCount` | Num | `8` | 1--30 | ripple |
| `cellCount` | Num | `20` | 4--100 | hexagonalize, polkaDots |
| `glitchIntensity` | Num | `0.5` | 0--1 | glitch |

## 53 Transition Types

### Mask-Based (22)

`fade`, `crossFade`, `circleIris`, `diamondIris`, `wipe`, `diagonalWipe`, `doubleDoor`, `noiseDissove`, `ditheredFade`, `venetianBlinds`, `bars`, `checkerboard`, `radialWipe`, `scanlineReveal`, `randomBlocks`, `crossSplit`, `heartIris`, `starIris`, `crossIris`, `clockWipe`, `diagonalBlinds`, `bowTie`

### Procedural (31)

`pixelate`, `crtPowerOff`, `swirl`, `zoomLines`, `shatter`, `wavyDistortion`, `hexagonalize`, `pinwheel`, `polkaDots`, `gridFlip`, `glitch`, `ripple`, `wind`, `chromaticBurst`, `zoom`, `spiralWipe`, `curtain`, `dreamDissolve`, `filmBurn`, `overexposure`, `doomMelt`, `tvStatic`, `matrixRain`, `mosaic`, `burn`, `waterDrop`, `squeeze`, `flyEye`, `crosshatch`, `luminanceMelt`, `pageFlip`

## 32 Curated Presets

`fadeToBlack`, `fadeToWhite`, `crossFade`, `circleIris`, `diamondIris`, `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `diagonalWipe`, `doubleDoor`, `noiseDissove`, `ditheredFade`, `venetianBlinds`, `bars`, `checkerboard`, `radialWipe`, `scanlineReveal`, `pixelate`, `crtPowerOff`, `swirl`, `zoomLines`, `shatter`, `wavyDistortion`, `hexagonalize`, `pinwheel`, `polkaDots`, `gridFlip`, `glitch`, `ripple`, `wind`, `chromaticBurst`

## API

| Function | Description |
|----------|-------------|
| `playTransition` | Play a transition effect |
| `disposeTransition` | Dispose transition PostProcess |

## Files

| File | Purpose |
|------|---------|
| `schemas/transition-config.ts` | TransitionConfigSchema + 53 type enum + 32 presets |
| `rendering/transition-manager.ts` | Transition lifecycle and animation |
| `rendering/transition-shader.ts` | GLSL code generation per transition type |
