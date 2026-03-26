# Post-Processing

Full post-processing pipeline built on Babylon.js `DefaultRenderingPipeline` and `SSAO2RenderingPipeline`. 12 independently configurable effects with 5 named presets.

## Overview

The pipeline processes the rendered frame through a chain of effects. Each effect can be individually enabled/disabled and configured. Named presets provide curated defaults for common visual styles.

## Pipeline Order

```
Scene Render
  -> SSAO (depth-based ambient occlusion)
  -> Bloom (bright area glow)
  -> Depth of Field (tilt-shift blur)
  -> Chromatic Aberration (lens color fringing)
  -> Sharpen (edge enhancement)
  -> Film Grain (noise overlay)
  -> Vignette (darkened edges)
  -> Tone Mapping (HDR -> LDR)
  -> Color Grading (color curves)
  -> FXAA (anti-aliasing)
  -> Dithering (banding reduction)
  -> HDR Environment (IBL reflections)
```

## Top-Level Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | Bool | `true` | Master pipeline enable |
| `preset` | Enum | `'hd2d'` | Base preset |
| `exposure` | Num | `1.0` | Scene exposure |
| `contrast` | Num | `1.0` | Scene contrast |

## Named Presets

| Preset | Description |
|--------|-------------|
| `neutral` | Minimal processing, natural look |
| `hd2d` | Octopath Traveler-style: bloom, DoF, grain, vignette (default) |
| `cinematic` | Heavy bloom, strong vignette, color grading |
| `retro` | Dithering, grain, muted colors |
| `fantasy` | Warm tones, soft bloom, dreamy DoF |

## Effect Configuration

### Bloom

Soft glow on bright areas. Maps to `DefaultRenderingPipeline.bloomEnabled`.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `bloom.enabled` | Bool | `true` | -- | Bloom active |
| `bloom.weight` | Num | `0.15` | 0--1 | Bloom strength |
| `bloom.threshold` | Num | `0.9` | 0--1 | Luminance threshold |
| `bloom.kernel` | Num | `64` | 1--512 | Blur kernel size |
| `bloom.scale` | Num | `0.5` | 0.1--1 | Performance scale |

### Depth of Field

Tilt-shift diorama effect. Maps to `DepthOfFieldEffect`.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `depthOfField.enabled` | Bool | `true` | -- | DoF active |
| `depthOfField.focalLength` | Num | `50` | >= 0 | Focal length (mm) |
| `depthOfField.fStop` | Num | `2.8` | >= 0.1 | Aperture f-stop |
| `depthOfField.focusDistance` | Num | `0` | >= 0 | Focus distance (0 = auto) |
| `depthOfField.blurLevel` | Enum | `'medium'` | `'low'`, `'medium'`, `'high'` | Blur quality |

### Tone Mapping

HDR to LDR range mapping.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `toneMapping.enabled` | Bool | `true` | -- | Active |
| `toneMapping.type` | Enum | `'aces'` | `'standard'`, `'aces'`, `'khr_pbr_neutral'` | Operator |

### Color Grading

Color curve adjustments via named presets.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `colorGrading.enabled` | Bool | `false` | -- | Active |
| `colorGrading.preset` | Enum | `'neutral'` | `'neutral'`, `'warm'`, `'cool'`, `'cinematic'`, `'retro'` | Preset |

### Vignette

Darkened screen edges.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `vignette.enabled` | Bool | `true` | -- | Active |
| `vignette.weight` | Num | `1.5` | 0--10 | Darkness |
| `vignette.stretch` | Num | `0` | 0--25 | Stretch |
| `vignette.color` | ColorRgba | black | 0--1 | Vignette color |
| `vignette.blendMode` | Enum | `'multiply'` | `'multiply'`, `'opaque'` | Blend mode |

### Film Grain

Cinematic noise overlay.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `grain.enabled` | Bool | `true` | -- | Active |
| `grain.intensity` | Num | `5` | 0--100 | Intensity |
| `grain.animated` | Bool | `true` | -- | Animate per frame |

### SSAO (Screen-Space Ambient Occlusion)

Depth-based contact shadows. Uses `SSAO2RenderingPipeline`.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `ssao.enabled` | Bool | `true` | -- | Active |
| `ssao.totalStrength` | Num | `1.0` | 0--3 | AO strength |
| `ssao.radius` | Num | `2.0` | 0.01--16 | Sampling radius |
| `ssao.samples` | Num | `16` | 1--64 | Sample count |
| `ssao.base` | Num | `0.1` | 0--1 | Base AO value |
| `ssao.expensiveBlur` | Bool | `true` | -- | Bilateral blur |

### Chromatic Aberration

Lens color fringing at screen edges.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `chromaticAberration.enabled` | Bool | `false` | -- | Active |
| `chromaticAberration.amount` | Num | `30` | 0--200 | Amount |
| `chromaticAberration.radialIntensity` | Num | `0.3` | 0--5 | Radial falloff |

### Sharpen

Edge-preserving sharpening filter.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `sharpen.enabled` | Bool | `false` | -- | Active |
| `sharpen.edgeAmount` | Num | `0.3` | 0--2 | Edge amount |
| `sharpen.colorAmount` | Num | `1.0` | 0--1 | Color amount |

### FXAA

Fast approximate anti-aliasing.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `fxaa.enabled` | Bool | `true` | -- | Active |

### Dithering

Reduces color banding in gradients.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `dithering.enabled` | Bool | `false` | -- | Active |
| `dithering.intensity` | Num | `0.004` | 0--1 | Intensity |

### HDR Environment

Image-based lighting via HDR cubemap (no visible skybox).

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `hdrEnvironment.enabled` | Bool | `false` | -- | Active |
| `hdrEnvironment.texturePath` | Str | `''` | -- | HDR cubemap path |
| `hdrEnvironment.intensity` | Num | `1.0` | 0--5 | Intensity |
| `hdrEnvironment.rotationY` | Num | `0` | 0--6.28 | Y-rotation (radians) |

## API

| Function | Description |
|----------|-------------|
| `createPostProcessing` | Create full pipeline from config |
| `updatePostProcessing` | Update effect parameters |
| `applyPostProcessingPreset` | Apply named preset |
| `disposePostProcessing` | Dispose pipeline |

## Files

| File | Purpose |
|------|---------|
| `schemas/post-processing-config.ts` | 12 effect sub-schemas + top-level |
| `rendering/post-processing.ts` | Pipeline creation and management |
| `rendering/post-processing-presets.ts` | 5 named presets |
| `rendering/hdr-environment.ts` | HDR cubemap loading |
