# Lighting Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the lighting system with 8 shadow filter types, 18 shadow properties, 7 light properties, 6 flicker modes, distance fade, lens flare presets, and volumetric light expansion (~35 new configurable fields).

**Architecture:** All changes extend existing schemas and rendering modules. No new files needed (except tests). Schema changes in `lighting-config.ts`, rendering in `shadow-manager.ts` + `light-manager.ts` + `light-animation.ts`, dev harness in `dev/dev.ts`.

**Tech Stack:** Babylon.js Light API, ShadowGenerator/CascadedShadowGenerator, Valibot schemas, TypeScript

---

## Reference: Codebase Conventions

All paths relative to `packages/products/webforge/runtime/` unless stated otherwise.

**Patterns to follow:**
- `BabylonResult<T>` + `okShallow()` from `src/core/babylon-result.ts`
- `err(ERRORS.SCENE.LOAD_FAILED, ...)` for errors
- `scene.onBeforeRenderObservable.add()` for per-frame updates
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

## Task 1: Schema Expansion — Shadow Filter Types & Properties

**Files:**
- Modify: `src/schemas/lighting-config.ts`
- Modify: `src/schemas/lighting-config.test.ts`

### Step 1: Write the failing tests

Add tests to `src/schemas/lighting-config.test.ts`:

- `ShadowFilterTypeSchema` — accepts all 8 values (`none`, `esm`, `blurredEsm`, `closeEsm`, `blurredCloseEsm`, `pcf`, `pcss`, `poisson`), rejects invalid strings
- `ShadowConfigSchema` new fields:
  - `filterType` — accepts each of 8 values, defaults to undefined
  - `forceBackFacesOnly` — defaults to `false`
  - `frustumEdgeFalloff` — defaults to `0`, rejects < 0 and > 1
  - `contactHardeningLightSizeUVRatio` — defaults to `0.1`, rejects < 0 and > 1
  - `useKernelBlur` — defaults to `false`
  - `blurKernel` — defaults to `1`, rejects < 1 and > 64
  - `blurScale` — defaults to `2`, rejects < 0.5 and > 4
  - `depthScale` — defaults to `50`, rejects < 0 and > 1000
  - `useOpacityTextureForTransparentShadow` — defaults to `false`
  - `lambda` — defaults to `0.5`, rejects < 0 and > 1
  - `depthClamp` — defaults to `true`
  - `penumbraDarkness` — defaults to `1.0`, rejects < 0 and > 1
  - `shadowMaxZ` — defaults to `0`, rejects < 0
  - `freezeShadowCastersBoundingInfo` — defaults to `false`

### Step 2: Run tests — expect FAIL

### Step 3: Implement schema changes

Add to `src/schemas/lighting-config.ts`:

1. New `ShadowFilterTypeSchema` picklist: `['none', 'esm', 'blurredEsm', 'closeEsm', 'blurredCloseEsm', 'pcf', 'pcss', 'poisson']`

2. Add 14 new fields to `ShadowConfigSchema`:
   - `filterType: v.optional(ShadowFilterTypeSchema)` — undefined means use default based on `type`
   - `forceBackFacesOnly: v.optional(v.boolean(), false)`
   - `frustumEdgeFalloff: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0)`
   - `contactHardeningLightSizeUVRatio: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.1)`
   - `useKernelBlur: v.optional(v.boolean(), false)`
   - `blurKernel: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(64)), 1)`
   - `blurScale: v.optional(v.pipe(v.number(), v.minValue(0.5), v.maxValue(4)), 2)`
   - `depthScale: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1000)), 50)`
   - `useOpacityTextureForTransparentShadow: v.optional(v.boolean(), false)`
   - `lambda: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5)`
   - `depthClamp: v.optional(v.boolean(), true)`
   - `penumbraDarkness: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1.0)`
   - `shadowMaxZ: v.optional(v.pipe(v.number(), v.minValue(0)), 0)`
   - `freezeShadowCastersBoundingInfo: v.optional(v.boolean(), false)`

### Step 4: Run tests — expect PASS

### Step 5: QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 2: Schema Expansion — Light Properties, Distance Fade, Lightmap Mode

**Files:**
- Modify: `src/schemas/lighting-config.ts`
- Modify: `src/schemas/lighting-config.test.ts`

### Step 1: Write the failing tests

Add tests:

- `DistanceFadeConfigSchema` — new schema with enabled (default false), start (default 50, >= 0), end (default 100, >= 0)
- `LightmapModeSchema` — new picklist: `default`, `specular`, `shadowsOnly`
- `PointLightConfigSchema` new fields: `radius` (default 0, >= 0), `renderPriority` (default 0, integer [0,10]), `distanceFade`, `layerMask` (default `0x0FFFFFFF`), `lightmapMode`
- `SpotLightConfigSchema` new fields: same as point + `innerAngle` (default 0, [0, PI])
- `DirectionalLightConfigSchema` new fields: `renderPriority`, `layerMask`, `lightmapMode`, `shadowFrustumSize` (default 0, >= 0), `shadowOrthoScale` (default 0.1, > 0), `autoUpdateExtends` (default true), `shadowMinZ` (default 0, >= 0), `shadowMaxZ` (default 0, >= 0)
- `HemisphericLightConfigSchema` new fields: `renderPriority`, `layerMask`
- Backward compat: existing configs (without new fields) still parse correctly

### Step 2: Run tests — expect FAIL

### Step 3: Implement schema changes

1. Create `DistanceFadeConfigSchema = v.strictObject({ enabled, start, end })`
2. Create `LightmapModeSchema = v.picklist(['default', 'specular', 'shadowsOnly'])`
3. Add new fields to each light type schema:
   - **Point/Spot common:** `radius`, `renderPriority`, `distanceFade`, `layerMask`, `lightmapMode`, `shadowMinZ`, `shadowMaxZ`
   - **Spot extra:** `innerAngle`
   - **Directional:** `renderPriority`, `layerMask`, `lightmapMode`, `shadowFrustumSize`, `shadowOrthoScale`, `autoUpdateExtends`, `shadowMinZ`, `shadowMaxZ`
   - **Hemispheric:** `renderPriority`, `layerMask`

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 3: Schema Expansion — Flicker Modes, Lens Flare, Volumetric

**Files:**
- Modify: `src/schemas/lighting-config.ts`
- Modify: `src/schemas/lighting-config.test.ts`

### Step 1: Write the failing tests

- `FlickerTypeSchema` — accepts 6 new values: `storm`, `heartbeat`, `random`, `neon`, `dying`, `siren`
- `LensFlarePresetSchema` — new picklist: `sun`, `moonGlow`, `crystalLight`, `torchGlow`
- `LensFlareConfigSchema` new fields: `preset` (optional LensFlarePresetSchema), `haloWidth` (default 0.4, [0,2]), `ghostDispersal` (default 0.3, [0,2]), `threshold` (default 0.5, [0,1])
- `VolumetricLightConfigSchema` new fields: `exposure` (default 1.0, [0,2]), `color` (default white)

### Step 2: Run tests — expect FAIL

### Step 3: Implement schema changes

1. Add 6 new values to `FlickerTypeSchema` picklist
2. Create `LensFlarePresetSchema = v.picklist(['sun', 'moonGlow', 'crystalLight', 'torchGlow'])`
3. Add `preset`, `haloWidth`, `ghostDispersal`, `threshold` to `LensFlareConfigSchema`
4. Add `exposure`, `color` to `VolumetricLightConfigSchema`

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 4: Shadow Manager — Apply New Filter Types & Properties

**Files:**
- Modify: `src/rendering/shadow-manager.ts`
- Modify: `src/rendering/shadow-manager.test.ts`

### Step 1: Write the failing tests

Add tests to `shadow-manager.test.ts`:

- `createShadowGenerator` with `filterType: 'esm'` → `gen.useExponentialShadowMap === true`
- `createShadowGenerator` with `filterType: 'blurredEsm'` → `gen.useBlurExponentialShadowMap === true`
- `createShadowGenerator` with `filterType: 'closeEsm'` → `gen.useCloseExponentialShadowMap === true`
- `createShadowGenerator` with `filterType: 'blurredCloseEsm'` → `gen.useBlurCloseExponentialShadowMap === true`
- `createShadowGenerator` with `filterType: 'poisson'` → `gen.usePoissonSampling === true`
- `createShadowGenerator` with `filterType: 'none'` → no filter flags set
- `createShadowGenerator` applies `forceBackFacesOnly`, `frustumEdgeFalloff`
- `createShadowGenerator` applies `contactHardeningLightSizeUVRatio` when PCSS
- `createShadowGenerator` applies `useKernelBlur`, `blurKernel`, `blurScale` when ESM
- `createShadowGenerator` applies `depthScale` when ESM
- `createShadowGenerator` applies `useOpacityTextureForTransparentShadow`
- CSM: applies `lambda`, `depthClamp`, `penumbraDarkness`, `shadowMaxZ`, `freezeShadowCastersBoundingInfo`

### Step 2: Run tests — expect FAIL

### Step 3: Implement

Update `createShadowGenerator()`:

1. Add `SHADOW_FILTER_MAP` constant mapping filter type strings to Babylon.js property setters
2. When `config.filterType` is set, apply the corresponding filter instead of using `config.type` to determine the filter
3. Apply all new shadow properties after generator creation:
   ```
   gen.forceBackFacesOnly = config.forceBackFacesOnly ?? false
   gen.frustumEdgeFalloff = config.frustumEdgeFalloff ?? 0
   if (gen.useContactHardeningShadow) gen.contactHardeningLightSizeUVRatio = ...
   if (isEsm) { gen.useKernelBlur, gen.blurKernel, gen.blurScale, gen.depthScale }
   gen.useOpacityTextureForTransparentShadow = ...
   ```
4. For CSM, apply: `lambda`, `depthClamp`, `penumbraDarkness`, `shadowMaxZ`, `freezeShadowCastersBoundingInfo`

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 5: Light Manager — Apply New Per-Light Properties

**Files:**
- Modify: `src/rendering/light-manager.ts`
- Modify: `src/rendering/light-manager.test.ts`

### Step 1: Write the failing tests

- `createBabylonLight` with Point: applies `radius`, `renderPriority`, `shadowMinZ`, `shadowMaxZ`, `layerMask`, `lightmapMode`
- `createBabylonLight` with Spot: applies `innerAngle`, `radius`, `renderPriority`, `shadowMinZ`, `shadowMaxZ`, `layerMask`, `lightmapMode`
- `createBabylonLight` with Directional: applies `shadowFrustumSize`, `shadowOrthoScale`, `autoUpdateExtends`, `shadowMinZ`, `shadowMaxZ`, `renderPriority`, `layerMask`, `lightmapMode`
- `createBabylonLight` with Hemispheric: applies `renderPriority`, `layerMask`
- Lightmap mode mapping: `default` → `LIGHTMAP_DEFAULT`, `specular` → `LIGHTMAP_SPECULAR`, `shadowsOnly` → `LIGHTMAP_SHADOWSONLY`

### Step 2: Run tests — expect FAIL

### Step 3: Implement

Update `createBabylonLight()`:

1. Add `LIGHTMAP_MODE_MAP` constant
2. After existing common property application, add:
   - `light.renderPriority = config.renderPriority ?? 0`
   - If has `layerMask`: `light.includedOnlyWithLayerMask = config.layerMask`
   - If has `lightmapMode`: `light.lightmapMode = LIGHTMAP_MODE_MAP[config.lightmapMode]`
3. In `case 'point'`: apply `pointLight.radius`, `shadowMinZ`, `shadowMaxZ`
4. In `case 'spot'`: apply `spotLight.innerAngle`, `spotLight.radius`, `shadowMinZ`, `shadowMaxZ`
5. In `case 'directional'`: apply `dirLight.shadowFrustumSize`, `dirLight.shadowOrthoScale`, `dirLight.autoUpdateExtends`, `shadowMinZ`, `shadowMaxZ`

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 6: Light Manager — Distance Fade Observer

**Files:**
- Modify: `src/rendering/light-manager.ts`
- Modify: `src/rendering/light-manager.test.ts`

### Step 1: Write the failing tests

- Distance fade: light at distance < start keeps full intensity
- Distance fade: light at distance > end has intensity 0 and is disabled
- Distance fade: light at midpoint has interpolated intensity
- Distance fade disabled: no intensity change regardless of distance
- ManagedLight type includes `distanceFadeObserver`

### Step 2: Run tests — expect FAIL

### Step 3: Implement

1. Add `distanceFadeObserver: BABYLON.Observer<BABYLON.Scene> | null` to `ManagedLight`
2. After light creation, if `config.distanceFade?.enabled` and light has position:
   - Register `scene.onBeforeRenderObservable.add()` callback
   - Each frame: compute distance from active camera to light position
   - Apply linear fade: `factor = clamp((end - dist) / (end - start), 0, 1)`
   - `light.intensity = baseIntensity * factor`
   - `light.setEnabled(factor > 0)`
3. Dispose observer in `removeLightById` and `disposeLighting`

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 7: Light Manager — Expanded Lens Flare & Volumetric

**Files:**
- Modify: `src/rendering/light-manager.ts`
- Modify: `src/rendering/light-manager.test.ts`

### Step 1: Write the failing tests

- Lens flare preset `sun` generates 6 flare elements
- Lens flare preset `moonGlow` generates 3 flare elements
- Lens flare preset `crystalLight` generates 5 flare elements
- Lens flare preset `torchGlow` generates 2 flare elements
- `haloWidth` scales the first (center) flare element size
- `ghostDispersal` affects spacing between ghost elements
- Custom `flares` array always overrides preset
- Volumetric `exposure` is applied to post-process
- Volumetric `color` tints the god ray mesh material

### Step 2: Run tests — expect FAIL

### Step 3: Implement

1. Add `LENS_FLARE_PRESETS` constant with 4 preset definitions (arrays of `{ size, position, color }`)
2. In lens flare creation: if `preset` is set and `flares` is empty, use preset array. Scale sizes by `haloWidth`, positions by `ghostDispersal`.
3. Apply `threshold` as flare system `borderLimit` or custom visibility check
4. In volumetric creation: `volumetric.exposure = vlCfg.exposure ?? 1.0`
5. In volumetric creation: if `vlCfg.color`, set `volumetric.mesh.material.diffuseColor`

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 8: Light Animation — 6 New Flicker Modes

**Files:**
- Modify: `src/rendering/light-animation.ts`
- Modify: `src/rendering/light-animation.test.ts`

### Step 1: Write the failing tests

For each new mode, test `computeFlicker()`:

- `storm`: output is 1 most of the time, occasionally drops to 1-amplitude (flash pattern)
- `heartbeat`: double pulse visible — two peaks per cycle
- `random`: output varies each frame, stays in [1-amplitude, 1]
- `neon`: output is 1 most of the time with rare dips
- `dying`: output tends toward 0 over time (longer off periods)
- `siren`: oscillates between 1 and 1-amplitude at ~2Hz

Also test: amplitude=0 returns 1 for all new types.

### Step 2: Run tests — expect FAIL

### Step 3: Implement

Add 6 new cases to `computeFlicker()` switch:

```typescript
case 'storm': {
  const flash = pseudoNoise(t * s * 2) > 0.95 ? 1 : 0;
  const rumble = 0.1 * Math.sin(t * s * 3);
  return 1 - a * (1 - flash) * (1 - rumble);
}
case 'heartbeat': {
  const phase = (t * s * 1.2) % 1;
  const beat1 = Math.max(0, 1 - Math.abs(phase - 0.15) * 15);
  const beat2 = Math.max(0, 1 - Math.abs(phase - 0.35) * 15);
  return 1 - a * (1 - Math.max(beat1, beat2));
}
case 'random': {
  return 1 - a * pseudoNoise(t * s * 30);
}
case 'neon': {
  return pseudoNoise(t * s * 15) < 0.03 ? 1 - a * 0.9 : 1;
}
case 'dying': {
  const cycle = (t * s * 0.3) % 1;
  const onChance = Math.max(0.05, 1 - cycle * 0.8);
  return pseudoNoise(t * s * 8) < onChance ? 1 : 1 - a;
}
case 'siren': {
  const wave = Math.sin(t * s * Math.PI * 4);
  return wave > 0 ? 1 : 1 - a;
}
```

### Step 4: Run tests — expect PASS

### Step 5: QA

---

## Task 9: Dev Harness — Shadow & Light Property Controls

**Files:**
- Modify: `dev/dev.ts`

### Step 1: Add shadow expansion controls

In the Lights section (#11), in each per-light panel's shadow sub-section, add:

- **Filter Type** dropdown: none, esm, blurredEsm, closeEsm, blurredCloseEsm, pcf, pcss, poisson
- **Force Back Faces Only** toggle
- **Frustum Edge Falloff** slider [0, 1, step 0.01]
- **Contact Hardening Size** slider [0, 1, step 0.01]
- **Use Kernel Blur** toggle
- **Blur Kernel** slider [1, 64, step 1]
- **Blur Scale** slider [0.5, 4, step 0.1]
- **Depth Scale** slider [0, 1000, step 1]
- **Use Opacity Texture** toggle
- **Lambda** slider [0, 1, step 0.01] (cascade only)
- **Depth Clamp** toggle (cascade only)
- **Penumbra Darkness** slider [0, 1, step 0.01] (cascade only)
- **Shadow Max Z (CSM)** slider [0, 1000, step 1] (cascade only)
- **Freeze Bounding Info** toggle (cascade only)

Each control reads from and writes to the shadow generator instance.

### Step 2: Add light property controls

New "Properties" sub-section per light:

- **Radius (PBR)** slider [0, 10, step 0.1] (Point/Spot only)
- **Render Priority** slider [0, 10, step 1] (all)
- **Inner Angle** slider [0, 3.14, step 0.01] (Spot only)
- **Shadow Frustum Size** slider [0, 100, step 1] (Directional only)
- **Shadow Ortho Scale** slider [0, 1, step 0.01] (Directional only)
- **Auto Update Extends** toggle (Directional only)
- **Shadow Min Z** slider [0, 500, step 1]
- **Shadow Max Z** slider [0, 500, step 1]
- **Layer Mask** slider [0, 268435455, step 1]
- **Lightmap Mode** dropdown: default, specular, shadowsOnly

### Step 3: Add distance fade controls

New "Distance Fade" sub-section per Point/Spot light:

- **Enabled** toggle
- **Start** slider [0, 500, step 1]
- **End** slider [0, 500, step 1]

### Step 4: QA

---

## Task 10: Dev Harness — Flicker, Lens Flare, Volumetric Controls

**Files:**
- Modify: `dev/dev.ts`

### Step 1: Update flicker dropdown

Add 6 new options to the flicker Type dropdown: storm, heartbeat, random, neon, dying, siren

### Step 2: Add lens flare expansion controls

In the Lens Flare sub-section per directional light:

- **Preset** dropdown: none, sun, moonGlow, crystalLight, torchGlow
- **Halo Width** slider [0, 2, step 0.01]
- **Ghost Dispersal** slider [0, 2, step 0.01]
- **Threshold** slider [0, 1, step 0.01]

### Step 3: Add volumetric expansion controls

In the Volumetric sub-section per directional light:

- **Exposure** slider [0, 2, step 0.01]
- **Color** color picker

### Step 4: QA

---

## Task 11: Update Documentation

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/runtime/README.md`
- Modify: `docs/runtime/lighting.md`

### Step 1: Update docs/runtime/lighting.md

Add comprehensive tables for all new fields:
- Shadow filter types table (8 types with descriptions)
- Shadow expanded properties table (14 new fields)
- Per-light new properties table
- Distance fade configuration table
- New flicker modes table (6 modes with descriptions)
- Lens flare presets table (4 presets)
- Expanded lens flare config table
- Expanded volumetric light config table

### Step 2: Update docs/runtime/README.md

Update the Lighting row in the systems overview table to reflect new field counts.

### Step 3: Update docs/ARCHITECTURE.md

Update the Lighting entry in the system table if field counts changed.

### Step 4: QA

---

## Task 12: Visual Verification via Playwright MCP

Follow the expand-feature skill's Step 8 EXACTLY:

1. Navigate to `http://localhost:3100`
2. Register `__discover` and `__helper` scripts
3. Run `__discover.panels()` and `__discover.fullInventory('lights-body')`
4. Use inventory as testing checklist
5. Systematically test EVERY new control:
   - Shadow filter type dropdown: cycle through all 8 options, screenshot each
   - All new shadow sliders: test min/max, screenshot each
   - All new shadow toggles: test ON/OFF, screenshot each
   - Light properties: test sliders at extremes, screenshot
   - Distance fade: test ON/OFF, adjust start/end, screenshot
   - Flicker type dropdown: test all 13 types (7 existing + 6 new), screenshot
   - Lens flare presets: test all 4, screenshot
   - Lens flare sliders: test min/max, screenshot
   - Volumetric exposure: test min/max, screenshot
   - Volumetric color: change color, screenshot
6. Document ✅ or ❌ for each control

---

## Task 13: Final Commit

Commit all changes with descriptive message covering all 6 feature categories.
