# Fog Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the 5-property fog system into a 77+ option fog engine with height fog, dual layers, inscattering, atmospheric scattering, noise, wind, overlays, animation, presets, day/night integration, and per-mesh control.

**Architecture:** Two custom PostProcesses (advanced fog + overlay fog) layered on top of Babylon.js built-in scene fog. Advanced fog uses depth buffer for world-space reconstruction. Overlay fog renders up to 4 scrolling texture layers with blend modes.

**Tech Stack:** Babylon.js PostProcess API, GLSL ES 3.0, DepthRenderer, Valibot schemas, TypeScript

---

## Reference: Codebase Conventions

All paths relative to `packages/products/webforge/runtime/` unless stated otherwise.

**Patterns to follow:**
- `BabylonResult<T>` + `okShallow()` from `src/core/babylon-result.ts`
- `err(ERRORS.SCENE.RENDER_FAILED, ...)` for errors
- `scene.onBeforeRenderObservable.add()` for per-frame updates
- Handle pattern: `{ dispose: () => void }` for cleanup
- Dev harness helpers: `createSliderRow`, `createToggleRow`, `createDropdown`, `createColorPickerRow`, `createSubHeader`, `createCollapsibleGroup` in `dev/dev.ts`

**QA commands (run after EVERY file edit):**
```bash
pnpm qa:type-check
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Test command:**
```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```

---

## Task 1: Fog Config Schema — Sub-Schemas

**Files:**
- Create: `src/schemas/fog-config.ts`
- Create: `src/schemas/fog-config.test.ts`
- Modify: `src/schemas/scene-setup-config.ts` (update FogConfigSchema import)

### Step 1: Write the failing test

Create `src/schemas/fog-config.test.ts` with tests for all 12 sub-schemas:

- `HeightFogSchema` — defaults, valid values, rejects out-of-range falloff
- `SecondFogLayerSchema` — defaults, valid color, rejects invalid density
- `InscatteringSchema` — defaults, valid values, rejects exponent < 1
- `AtmosphericSchema` — defaults, valid per-channel values, rejects > 0.5
- `FogNoiseSchema` — defaults, valid octaves, rejects octaves > 6
- `FogWindSchema` — defaults, valid angle 0-360, rejects speed < 0
- `FogOverlaySchema` — defaults, valid blend modes, rejects invalid vignette
- `FogAnimationSchema` — defaults, valid waveforms, rejects invalid waveform
- `FogDayNightSchema` — defaults, valid colors
- `FogPerMeshSchema` — defaults
- `FogPresetSchema` — accepts all 14 preset names, rejects invalid
- `FogConfigSchema` — expanded: accepts all defaults, accepts all sub-objects, rejects unknown properties

### Step 2: Run tests to verify they fail

```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```

Expected: FAIL — module `./fog-config` not found.

### Step 3: Write the schema implementation

Create `src/schemas/fog-config.ts` with all Valibot schemas for Groups 1-12.

Key schemas:
```
HeightFogSchema = v.strictObject({ enabled, baseHeight, falloff, density, offset })
SecondFogLayerSchema = v.strictObject({ enabled, density, heightFalloff, heightOffset, color })
InscatteringSchema = v.strictObject({ enabled, color, exponent, startDistance, intensity })
AtmosphericSchema = v.strictObject({ enabled, extinctionR/G/B, inscatteringR/G/B })
FogNoiseSchema = v.strictObject({ enabled, scale, amplitude, speed, octaves, lacunarity, persistence })
FogWindSchema = v.strictObject({ enabled, directionAngle, speed, turbulence })
FogOverlaySchema = v.strictObject({ enabled, texture, opacity, blendMode, scrollX/Y, scale, tint, hue, hueSpeed, mapLocked, vignette, vignetteIntensity })
FogAnimationSchema = v.strictObject({ enabled, speed, amplitude, waveform })
FogDayNightSchema = v.strictObject({ enabled, dayColor, nightColor, dawnColor, dayDensity, nightDensity })
FogPerMeshSchema = v.strictObject({ excludeGround, excludeSprites })
FogPresetSchema = v.picklist([14 preset names])

FogConfigSchema = v.strictObject({
  // Existing 5 fields (mode, color, density, start, end)
  // + Group 1: maxOpacity, startDistance, cutoffDistance, excludeSkybox, skyAffect
  // + Groups 2-12 as optional sub-objects
})
```

### Step 4: Run tests to verify they pass

```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```

### Step 5: Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 6: Update scene-setup-config.ts

Move `FogConfigSchema` out of `scene-setup-config.ts` into the new `fog-config.ts`. Update `scene-setup-config.ts` to import from `./fog-config`. Update existing test imports.

### Step 7: Run all tests + QA

```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 8: Commit

```bash
git add src/schemas/fog-config.ts src/schemas/fog-config.test.ts src/schemas/scene-setup-config.ts src/schemas/scene-setup-config.test.ts
git commit -m "feat(fog): add expanded FogConfigSchema with 12 sub-schemas (77 options)"
```

---

## Task 2: Fog Presets

**Files:**
- Create: `src/rendering/fog-presets.ts`
- Create: `src/rendering/fog-presets.test.ts`

### Step 1: Write the failing test

Test that all 14 presets (`clear`, `lightMist`, `morningFog`, `denseFog`, `dungeon`, `underwater`, `forest`, `mountain`, `sandstorm`, `snowstorm`, `dream`, `volcanic`, `swamp`, `nightMist`) produce valid `FogConfig` when parsed through `FogConfigSchema`.

### Step 2: Run test — FAIL

### Step 3: Implement `FOG_PRESETS` constant

Object mapping preset names to full `FogConfig` objects with curated defaults per the design doc preset table.

### Step 4: Run test — PASS

### Step 5: QA + Commit

```bash
git commit -m "feat(fog): add 14 fog presets (clear, lightMist, morningFog, etc.)"
```

---

## Task 3: Fog Shader (Advanced Fog GLSL)

**Files:**
- Create: `src/rendering/fog-shader.ts`

### Step 1: Write the GLSL fragment shader

The advanced fog post-process shader with:
- Depth buffer sampling + world position reconstruction
- Height fog (Inigo Quilez analytical formula)
- Second fog layer (independent height fog call)
- Directional inscattering (dot product with sun direction)
- Atmospheric scattering (per-channel extinction/inscattering)
- Noise density modulation (3D value noise + FBM)
- Wind offset (time-based UV shift)
- Animated density (sine/triangle/sawtooth oscillation)
- Max opacity clamping
- Start distance / cutoff distance
- Sky affect blending

Register in `BABYLON.Effect.ShadersStore["webforgeFogFragmentShader"]`.

### Step 2: Write the overlay fog GLSL fragment shader

Up to 4 texture layers with:
- Per-layer UV scrolling
- Per-layer blend mode (normal/additive/multiply/screen)
- Per-layer tint color
- Per-layer hue shift (RGB→HSV→RGB)
- Per-layer vignette mask
- Per-layer opacity

Register in `BABYLON.Effect.ShadersStore["webforgeFogOverlayFragmentShader"]`.

### Step 3: Create PostProcess factory functions

```
createAdvancedFogPostProcess(options) → BabylonResult<BABYLON.PostProcess>
createOverlayFogPostProcess(options) → BabylonResult<BABYLON.PostProcess>
```

### Step 4: QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 5: Commit

```bash
git commit -m "feat(fog): add advanced fog + overlay GLSL shaders and PostProcess factories"
```

---

## Task 4: Procedural Overlay Textures

**Files:**
- Create: `src/rendering/fog-overlay-textures.ts`
- Create: `src/rendering/fog-overlay-textures.test.ts`

### Step 1: Write failing tests

Test that each procedural texture generator (`perlin`, `worley`, `clouds`, `wisps`, `smoke`) produces a canvas of expected dimensions (512x512 by default) and the canvas is not blank (has non-zero pixel data).

### Step 2: Run test — FAIL

### Step 3: Implement procedural texture generators

Each generator creates a 512x512 OffscreenCanvas with tileable noise patterns using 2D canvas operations. The textures are converted to `BABYLON.DynamicTexture` for use in the overlay PostProcess.

### Step 4: Run test — PASS

### Step 5: QA + Commit

```bash
git commit -m "feat(fog): add procedural overlay textures (perlin, worley, clouds, wisps, smoke)"
```

---

## Task 5: Fog Manager

**Files:**
- Create: `src/rendering/fog-manager.ts`
- Create: `src/rendering/fog-manager.test.ts`
- Modify: `src/rendering/scene-setup.ts`

### Step 1: Write failing tests

Test:
- `applyFog` creates advanced PostProcess when height fog enabled
- `applyFog` creates overlay PostProcess when overlays configured
- `applyFog` sets scene fog properties (mode, color, density, start, end)
- `applyFog` enables depth renderer when advanced features active
- `updateFog` updates uniforms on existing PostProcess
- `applyFogPreset` loads preset config and applies
- `disposeFog` cleans up PostProcess and depth renderer
- Per-mesh exclusion sets `mesh.applyFog = false`
- Max opacity clamping works
- Day/night integration reads cycle progress

### Step 2: Run test — FAIL

### Step 3: Implement fog-manager.ts

```typescript
export function applyFog(scene, camera, config): BabylonResult<FogHandle>
export function updateFog(handle, config): BabylonResult<Bool>
export function applyFogPreset(handle, presetName): BabylonResult<Bool>
export function disposeFog(handle): void
```

Key responsibilities:
- Apply built-in scene fog (mode, color, density, start, end)
- Create DepthRenderer if advanced features needed
- Create advanced fog PostProcess if height/noise/inscattering/atmospheric/animation enabled
- Create overlay PostProcess if any overlays enabled
- Register per-frame observable for uniform updates (time, animation, day/night)
- Handle per-mesh fog exclusion

### Step 4: Run test — PASS

### Step 5: Modify scene-setup.ts

Update `applyFog` call in `applySceneSetup` to delegate to fog-manager for advanced features while maintaining backward compatibility for basic fog-only configs.

### Step 6: Run ALL tests + QA

```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 7: Commit

```bash
git commit -m "feat(fog): add fog-manager with PostProcess lifecycle, presets, and day/night integration"
```

---

## Task 6: Dev Harness — Fog UI Expansion

**Files:**
- Modify: `dev/dev.ts` (replace `buildFogUI` function)

### Step 1: Expand buildFogUI with 12 sub-groups

Replace the current 7-control fog section with collapsible sub-groups:

1. **Core** — Mode dropdown, density, start, end, color R/G/B, maxOpacity, startDistance, cutoffDistance, excludeSkybox toggle, skyAffect
2. **Height Fog** — Enable toggle, baseHeight, falloff, density, offset
3. **Second Layer** — Enable toggle, density, heightFalloff, heightOffset, color R/G/B
4. **Inscattering** — Enable toggle, color picker, exponent, startDistance, intensity
5. **Atmospheric** — Enable toggle, extinctionR/G/B, inscatteringR/G/B
6. **Noise** — Enable toggle, scale, amplitude, speed, octaves, lacunarity, persistence
7. **Wind** — Enable toggle, directionAngle, speed, turbulence
8. **Overlays** — 4 collapsible layer groups (enable, texture dropdown, opacity, blendMode, scrollX/Y, scale, tint, hue, hueSpeed, mapLocked, vignette, vignetteIntensity)
9. **Animation** — Enable toggle, speed, amplitude, waveform dropdown
10. **Presets** — Preset buttons in categories
11. **Day/Night** — Enable toggle, day/night/dawn colors, day/night densities
12. **Per-Mesh** — excludeGround, excludeSprites toggles

Each control calls `updateFog(handle, newConfig)` to apply changes in real time.

### Step 2: Add fog state variables

Store current fog config and handle as module-level state for the dev harness to read/write.

### Step 3: Wire preset buttons

Each preset button calls `applyFogPreset(handle, name)` and updates all sliders/toggles to reflect the preset values.

### Step 4: QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 5: Commit

```bash
git commit -m "feat(fog): expand dev harness with 77 fog controls across 12 sub-groups"
```

---

## Task 7: Exports + README + ARCHITECTURE

**Files:**
- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md` (repo root)

### Step 1: Update exports

Add to `src/index.ts`:
```typescript
// Fog
export { FogConfigSchema, HeightFogSchema, FogOverlaySchema, ... } from './schemas/fog-config';
export { applyFog, updateFog, applyFogPreset, disposeFog, type FogHandle } from './rendering/fog-manager';
export { FOG_PRESETS } from './rendering/fog-presets';
```

### Step 2: Update README.md

Add Fog section documenting:
- Public API functions
- Schema overview
- Preset list
- Dev harness controls summary

### Step 3: Update ARCHITECTURE.md

Add Fog subsection under Runtime describing:
- Three-tier architecture (scene fog + advanced post-process + overlay post-process)
- Depth buffer integration
- Shader pipeline
- Day/night cycle integration

### Step 4: QA + Commit

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
git commit -m "docs(fog): update README and ARCHITECTURE with expanded fog API"
```

---

## Task 8: Visual Verification

**Tools:** Playwright MCP (`mcp__plugin_playwright_playwright__*`) ONLY.

### Step 1: Navigate to dev server

```
browser_navigate → http://localhost:3100
```

### Step 2: Verify each feature group

For each group, expand the Fog section, enable the feature, adjust controls, and screenshot:

1. **Core** — Set mode to exponential, adjust density, verify fog visible
2. **Height Fog** — Enable, adjust baseHeight/falloff, verify ground-level fog
3. **Second Layer** — Enable, verify two-altitude fog layers
4. **Inscattering** — Enable, verify sun glow in fog direction
5. **Atmospheric** — Enable, adjust per-channel, verify color shift
6. **Noise** — Enable, verify non-uniform fog density
7. **Wind** — Enable, verify fog drift direction
8. **Overlays** — Enable layer 1, select texture, adjust scroll/blend, verify scrolling overlay
9. **Animation** — Enable, verify pulsing density
10. **Presets** — Click each preset button, verify scene changes
11. **Day/Night** — Enable, verify fog color matches cycle
12. **Per-Mesh** — Toggle excludeGround/excludeSprites, verify meshes excluded

### Step 3: Screenshot each verification

Use `browser_take_screenshot` for evidence of each feature working.

---

## Implementation Order Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fog Config Schema (all sub-schemas) | — |
| 2 | Fog Presets | Task 1 |
| 3 | Fog Shader (GLSL) | Task 1 |
| 4 | Procedural Overlay Textures | — |
| 5 | Fog Manager | Tasks 1, 2, 3, 4 |
| 6 | Dev Harness UI | Task 5 |
| 7 | Exports + README + ARCHITECTURE | Tasks 5, 6 |
| 8 | Visual Verification | Task 6 |
