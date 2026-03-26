# Screen Effects

Simple screen overlay effects: color tint, flash, and fade in/out. These are immediate visual feedback tools for gameplay events.

## Overview

Screen effects apply full-screen color overlays that can be triggered instantly or animated over time. They are configured in the scene setup config and managed by the scene setup module.

## Effects

### Tint

Applies a persistent color overlay to the entire screen. Useful for indicating status effects (poison = green, damage = red) or environmental mood.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `tint.color` | ColorRgba | transparent | 0--1 | Tint color + opacity |

### Flash

Brief full-screen flash that fades out. Useful for lightning, hits, and spell effects.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `flash.color` | ColorRgba | white | 0--1 | Flash color |
| `flash.durationMs` | Num | `200` | 50--2000 | Flash duration |

### Fade

Smooth fade to/from a color. Commonly used for scene transitions.

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `fade.color` | ColorRgba | black | 0--1 | Fade target color |
| `fade.durationMs` | Num | `500` | 100--5000 | Fade duration |
| `fade.direction` | Enum | `'out'` | `'in'`, `'out'` | Fade direction |

## Scene Setup Configuration

Screen effects are part of the scene setup config:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `clearColor` | ColorRgba | `{r:0.15, g:0.15, b:0.15, a:1}` | Scene background clear color |
| `ambientColor` | ColorRgba | `{r:0.3, g:0.3, b:0.3, a:1}` | Scene ambient light color |
| `gravity` | Vector3 | `{x:0, y:-9.81, z:0}` | Scene gravity |
| `screenTint` | ColorRgba | -- | Initial screen tint |
| `screenFlash` | Object | -- | Flash config |
| `screenFade` | Object | -- | Fade config |

## API

| Function | Module | Description |
|----------|--------|-------------|
| `createScene` | `scene-setup.ts` | Create scene with effects |
| `applyScreenTint` | `scene-setup.ts` | Apply color tint |
| `triggerScreenFlash` | `scene-setup.ts` | Trigger flash |
| `startScreenFade` | `scene-setup.ts` | Start fade |
| `clearScreenEffects` | `scene-setup.ts` | Clear all effects |

## Files

| File | Purpose |
|------|---------|
| `schemas/scene-setup-config.ts` | Scene setup + screen effect schemas |
| `rendering/scene-setup.ts` | Scene creation + screen effect management |
