# Glow Layer

The glow layer adds emissive bloom to selected meshes using Babylon.js `GlowLayer`. It provides mesh-level inclusion/exclusion, intensity control, and custom emissive color overrides.

## Overview

Unlike the post-processing bloom (which affects the entire scene based on luminance thresholds), the glow layer targets specific meshes with per-mesh intensity and color control. This is ideal for magical effects, glowing tiles, UI highlights, and light sources that need to stand out.

## Configuration Reference

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Enable glow layer |
| `intensity` | Num | `1` | 0--5 | Global glow intensity |
| `blurKernelSize` | Num | `32` | 1--128 | Blur kernel size |
| `mainTextureSamples` | Num | `4` | 1--8 | MSAA samples for glow texture |
| `mainTextureRatio` | Num | `0.5` | 0.1--1 | Glow texture resolution ratio |

## Mesh Management

The glow manager provides functions to include/exclude specific meshes:

- **Include mesh**: Add a mesh to the glow layer with optional custom emissive color
- **Exclude mesh**: Remove a mesh from glow rendering
- **Set emissive color**: Override the emissive color for a specific mesh
- **Set intensity**: Per-mesh intensity multiplier

## API

| Function | Description |
|----------|-------------|
| `createGlowLayer` | Create glow layer from config |
| `addMeshToGlow` | Include a mesh in the glow layer |
| `removeMeshFromGlow` | Exclude a mesh from glow |
| `setGlowIntensity` | Update global glow intensity |
| `setMeshEmissiveColor` | Override emissive color for a mesh |
| `disposeGlowLayer` | Dispose glow layer resources |

## Usage

```typescript
import { createGlowLayer, addMeshToGlow } from '@webforge/runtime';

const glowResult = createGlowLayer(scene, {
  enabled: true,
  intensity: 1.5,
  blurKernelSize: 64,
});

if (glowResult.ok) {
  // Add specific meshes to glow
  addMeshToGlow(glowResult.data, magicOrbMesh, {
    emissiveColor: { r: 0.2, g: 0.5, b: 1.0, a: 1 },
  });
}
```

## Files

| File | Purpose |
|------|---------|
| `schemas/lighting-config.ts` | GlowLayerConfigSchema (nested in LightingConfig) |
| `rendering/glow-manager.ts` | GlowLayer creation, mesh management |
