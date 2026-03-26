# Bug: Tilemap Grid Lines When Parallax Is Enabled

## Summary

Grid-shaped lines appear across the tilemap (following tile boundaries, rotated at the isometric camera angle) **only** when parallax background layers are enabled. Lines disappear when parallax is off or when the `renderGroupObserver` is removed.

## Root Cause (Confirmed)

`BABYLON.Layer.render()` corrupts GPU state when called from `scene.onAfterRenderingGroupObservable`. The parallax system suppresses native Layer rendering (`renderOnlyInRenderTargetTextures = true`) and manually calls `layer.render()` in an observer after rendering group 0 (sky) so parallax appears between sky and tilemap (group 2).

**Why manual rendering is needed:** Parallax must render AFTER the sky (group 0) but BEFORE the tilemap (group 2). Native `isBackground=true` layers render before all groups, so the scene's `autoClear` wipes them before the sky renders.

**What Layer.render() does that causes problems:**
- `engine.setState(false)` — disables backface culling
- `engine.enableEffect(this._drawWrapper)` — binds the layer's shader program
- `engine.bindBuffers(...)` — binds the layer's vertex/index buffers
- `engine.setAlphaMode(...)` — changes alpha blending (only partially restored)

Source: `node_modules/.pnpm/@babylonjs+core@8.52.1/node_modules/@babylonjs/core/Layers/layer.js` line ~217

## What the Lines Look Like

- Grid pattern following tile boundaries across the entire tilemap
- Rotated because tilemap is viewed at isometric angle
- Only visible with parallax ON; invisible with parallax OFF
- The lines are NOT sub-pixel gaps between tiles (seam overlap fix had no effect)

## Approaches Tried (All Failed)

### 1. GL State Restoration After Layer.render()
**File:** `parallax-manager.ts` observer callback
```typescript
gl.enable(gl.CULL_FACE);
gl.enable(gl.DEPTH_TEST);
gl.depthMask(true);
gl.depthFunc(gl.LEQUAL);
gl.useProgram(null);
engine.wipeCaches(true);
scene.resetCachedMaterial();
```
**Result:** Lines still present.

### 2. Depth Mask Disable Before Layer.render()
Disabled depth writing before `layer.render()` to prevent the fullscreen quad from polluting the depth buffer.
```typescript
gl.depthMask(false);
// ... layer.render() calls ...
gl.depthMask(true);
engine.wipeCaches(true);
```
**Result:** Lines still present.

### 3. Opaque Ground Materials
Created separate `MATERIAL_OPAQUE` materials for ground-layer chunks (no alpha testing).
**Result:** Lines still present. Ground chunks correctly use opaque materials but lines persist.

### 4. Ground Fill Plane
Added an opaque `BABYLON.MeshBuilder.CreateGround` at Y=-0.01 behind all tile layers in rendering group 2.
**Result:** Lines still present. Fill plane renders correctly but is completely covered by tiles.

### 5. Tile Seam Overlap (0.001 and 0.005)
Expanded each tile quad outward by a small epsilon to overlap adjacent tiles.
```typescript
const SEAM_OVERLAP = 0.005;
const x = gridX * tileWorldSize - SEAM_OVERLAP;
// etc.
```
**Result:** Lines still present. Confirms the issue is NOT sub-pixel gaps between tile quads.

### 6. Clear Depth Before Group 2
```typescript
scene.setRenderingAutoClearDepthStencil(2, true, true, false);
```
**Result:** Lines still present.

### 7. onBeforeRenderingGroupObservable for Group 2
Moved parallax rendering from `onAfterRenderingGroupObservable` (group 0) to `onBeforeRenderingGroupObservable` (group 2).
**Result:** Lines still present.

### 8. onAfterClearObservable (Tried Twice)
Rendered parallax right after the framebuffer clear.
**Result:** Parallax invisible — the rendering pipeline overwrites it before the tilemap renders.

### 9. onBeforeCameraRenderObservable + autoClear=false
Rendered parallax before the clear, disabled autoClear, manually cleared color.
**Result:** Parallax invisible — same issue.

### 10. isBackground=true (Native Layer Rendering)
Set `isBackground=true` and removed `renderOnlyInRenderTargetTextures`, letting Babylon handle layers natively.
**Result:** Parallax invisible — scene's `autoClear` wipes background layers before rendering groups.

### 11. Mesh Planes (Prior Session)
Replacing `BABYLON.Layer` with 3D mesh planes positioned behind the tilemap.
**Result:** "Fucked so many things up" (user quote from prior session). Approach is OFF LIMITS.

## Key Observations

1. **Only `onAfterRenderingGroupObservable` for group 0 successfully shows parallax.** All other hook points (`onAfterClearObservable`, `onBeforeCameraRenderObservable`, `onBeforeRenderingGroupObservable` for group 2, `isBackground=true`) result in invisible parallax.

2. **Every state restoration attempt after `layer.render()` has failed.** GL-level restoration, `wipeCaches(true)`, `resetCachedMaterial()`, depth mask manipulation — none fix the lines.

3. **The seam overlap fix had no effect.** The lines are NOT caused by sub-pixel gaps between tile quads. Something about the rendering STATE causes tile boundaries to become visible.

4. **The lines form a grid following tile boundaries.** Not chunk boundaries (every 16 tiles), but individual tile boundaries across the entire map.

## Unexplored Approaches

1. **RenderTargetTexture (RTT) Compositing** — Render parallax layers to an offscreen RTT (isolated from main framebuffer), then display the RTT as a background. This fully isolates `Layer.render()` from the rendering pipeline. Could use a simple fullscreen quad mesh in group 1 with the RTT as texture.

2. **Custom Shader for Parallax** — Instead of using `BABYLON.Layer`, write a custom fullscreen post-process or ShaderMaterial that draws parallax without the state-corrupting `Layer.render()` internals.

3. **Babylon.js EffectLayer or Similar** — Investigate if Babylon has other 2D compositing mechanisms that don't corrupt state.

4. **Monkey-Patch Layer.render()** — Override the Layer's render method to add proper state save/restore around the draw call at the GL level. More thorough than restoring after — save ALL state before, restore ALL state after.

5. **Scene.customRenderFunction** — Replace Babylon's rendering pipeline entirely with a custom function that renders parallax at the right point with proper state management.

6. **Filing a Babylon.js Bug** — Layer.render() not properly restoring GPU state could be considered a Babylon.js bug. The Babylon team might have a recommended approach.

## Files Modified (Current State)

- **`parallax-manager.ts`** — Observer uses `onAfterRenderingGroupObservable` for group 0 (original working approach, lines present)
- **`tilemap-renderer.ts`** — Has `opaqueMaterials` and `groundFill` plane additions (harmless, don't fix the issue)
- **`tile-geometry.ts`** — Clean (seam fix reverted)
- **`test-map.ts`** — `parallaxLayers: []` (disabled for now)

## Rendering Architecture

```
Sky (group 0) → Observer fires → Layer.render() for parallax → Group 2 (tilemap)

scene.setRenderingAutoClearDepthStencil(2, false, false, false)
Tilemap meshes: renderingGroupId = 2
Tile materials: MATERIAL_ALPHATEST (alphaCutOff=0.5) or MATERIAL_OPAQUE (ground)
Parallax layers: BABYLON.Layer with renderOnlyInRenderTargetTextures=true
```
