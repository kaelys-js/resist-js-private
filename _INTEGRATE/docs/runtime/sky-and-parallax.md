# Sky & Parallax

The sky system renders backgrounds using 6 configurable types, with optional star fields and scrolling parallax layers.

## Overview

The sky system provides a range of background rendering options from simple solid colors to physically-based atmospheric scattering. Parallax layers scroll independently of the camera, creating depth in 2D scenes.

## Sky Types

| Type | Description | Use Case |
|------|-------------|----------|
| `color` | Solid background color | Minimal, indoor scenes |
| `gradient` | Vertical gradient with color stops | Stylized 2D skies |
| `skybox` | 6-face cubemap texture | Pre-rendered 3D environments |
| `procedural` | Physically-based atmospheric scattering | Dynamic outdoor skies |
| `panorama` | Equirectangular image mapped to sphere | Photo-realistic backgrounds |
| `hdri` | HDR cubemap for IBL + background | PBR-lit environments |

## Configuration Reference

### Core

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `type` | Enum | `'color'` | 6 types | Sky rendering method |
| `color` | ColorRgba | `{r:0.35, g:0.5, b:0.8, a:1}` | 0--1 | Solid color (color type) |

### Gradient

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gradient` | SkyGradientStop[] | -- | Array of gradient color stops |

**SkyGradientStop:**

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `position` | Num | 0--1 | Vertical position (0=top, 1=bottom) |
| `color` | ColorRgba | 0--1 | Color at stop |

### Skybox

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `skyboxPath` | Str | -- | -- | Cubemap prefix path |
| `skyboxSize` | Num | `1000` | >= 10 | Skybox mesh size |

### Procedural (Atmospheric Scattering)

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `turbidity` | Num | `10` | 0--20 | Atmospheric haze |
| `rayleigh` | Num | `2` | 0--10 | Rayleigh scattering intensity |
| `luminance` | Num | `1` | 0--2 | Overall brightness |
| `mieCoefficient` | Num | `0.005` | 0--0.1 | Mie scattering coefficient |
| `mieDirectionalG` | Num | `0.8` | 0--1 | Mie directional parameter |
| `inclination` | Num | `0.49` | 0--0.5 | Sun vertical angle |
| `azimuth` | Num | `0.25` | 0--1 | Sun horizontal angle |

### Panorama

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `panoramaPath` | Str | -- | Equirectangular image path |

### HDRI

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hdriPath` | Str | -- | HDR cubemap path |

### Star Field

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `stars.enabled` | Bool | `false` | -- | Enable star field |
| `stars.texture` | Str | `'sky/stars.png'` | -- | Star texture path |
| `stars.opacity` | Num | `0.8` | 0--1 | Max opacity |
| `stars.twinkleSpeed` | Num | `1` | 0--5 | Twinkle speed |
| `stars.fadeInTime` | Num | `18` | 0--24 | Hour stars fade in |
| `stars.fadeOutTime` | Num | `6` | 0--24 | Hour stars fade out |
| `stars.scale` | Num | `2` | 0.1--10 | Texture scale |

## Parallax Layers

Array of independently scrolling background layers:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `imagePath` | Str | (required) | -- | Background image path |
| `scrollSpeedX` | Num | `0.5` | -- | Horizontal scroll speed |
| `scrollSpeedY` | Num | `0` | -- | Vertical scroll speed |
| `offsetY` | Num | `0` | -- | Vertical offset (world units) |
| `opacity` | Num | `1` | 0--1 | Layer opacity |
| `tileX` | Bool | `true` | -- | Repeat horizontally |
| `tileY` | Bool | `false` | -- | Repeat vertically |
| `scale` | Num | `1` | 0.1--10 | Image scale |
| `autoScrollX` | Num | `0` | -- | Constant horizontal drift |
| `autoScrollY` | Num | `0` | -- | Constant vertical drift |
| `layerType` | Enum | `'background'` | `'background'`, `'foreground'` | Rendering layer |
| `blendMode` | Enum | `'alpha'` | 8 modes | Alpha blend mode |
| `tint` | ColorRgba | white | 0--1 | Color tint |
| `depth` | Num | `0` | -- | Sort order (lower = further back) |

**Blend Modes:** `alpha`, `additive`, `multiply`, `subtract`, `screen`, `maximized`, `oneone`, `premultiplied`

## API

| Function | Module | Description |
|----------|--------|-------------|
| `createSkySystem` | `sky-system.ts` | Create sky from config |
| `updateSkySystem` | `sky-system.ts` | Update sky parameters |
| `disposeSkySystem` | `sky-system.ts` | Dispose sky resources |
| `createParallaxManager` | `parallax-manager.ts` | Create parallax layers |
| `updateParallaxLayers` | `parallax-manager.ts` | Update layer properties |
| `disposeParallaxManager` | `parallax-manager.ts` | Dispose parallax |

## Files

| File | Purpose |
|------|---------|
| `schemas/sky-config.ts` | SkyConfigSchema, StarsConfig, ParallaxLayer |
| `rendering/sky-system.ts` | 6 sky type renderers |
| `rendering/parallax-manager.ts` | Scrolling parallax backgrounds |
