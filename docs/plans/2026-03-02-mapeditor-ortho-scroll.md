# Map Editor Ortho Scroll Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Overview

Fix the map editor orthographic mode so the entire tilemap is visible at 1× zoom. The map is currently cut off at edges due to zero-margin ortho bounds and potential aspect ratio mismatch during initialization.

**File:** `packages/products/webforge/runtime/dev/dev.ts` (all changes in this single file)

---

## Task 1: Add padding to `computeOrthoMax()`

**Line ~152.** Add half-tile padding so the map edges aren't pixel-flush with the viewport border.

### Change

```typescript
// BEFORE (line 158):
_orthoMax = Math.max(_mapHeight / 2, _mapWidth / (2 * aspect));

// AFTER:
_orthoMax = Math.max((_mapHeight + 1) / 2, (_mapWidth + 1) / (2 * aspect));
```

The `+1` adds half a tile of padding on each edge, preventing floating-point clipping at map boundaries.

### QA
```
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 2: Ensure tilemap load reapplies full ortho state

**Line ~13269.** After setting `_mapWidth`/`_mapHeight` from the loaded tilemap, the mapeditor preset reapplies ortho bounds but doesn't call `clampCameraToMap` or `updateScrollbars`.

### Change

```typescript
// BEFORE (lines 13270-13275):
if (_currentPreset === 'mapeditor') {
    const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
    applyOrthoBounds(arcCam, runtime.engine.scene);
    arcCam.target.x = _mapHeight / 2;
    arcCam.target.z = _mapWidth / 2;
}

// AFTER:
if (_currentPreset === 'mapeditor') {
    const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
    _orthoSize = _orthoMax; // Reset to 1× zoom after map dimensions changed
    applyOrthoBounds(arcCam, runtime.engine.scene);
    arcCam.target.x = _mapHeight / 2;
    arcCam.target.z = _mapWidth / 2;
    clampCameraToMap(arcCam, runtime.engine.scene);
    updateScrollbars(arcCam, runtime.engine.scene);
}
```

### QA
```
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 3: Add large-map guard with minimum tile size

**Line ~152 area.** For very large maps, fitting everything at 1× zoom would make tiles too small to see. Add a minimum tile screen-size guard.

### Change

Add a new constant near the other map editor constants (line ~127):

```typescript
const MIN_TILE_PX = 4; // Minimum on-screen pixels per tile at initial zoom
```

In `computeOrthoMax()`, after computing `_orthoMax`, compute the per-tile pixel size and cap if needed:

```typescript
function computeOrthoMax(scene?: BABYLON.Scene, cam?: BABYLON.ArcRotateCamera): number {
    if (scene && cam) {
        const aspect: number = scene.getEngine().getAspectRatio(cam);
        _orthoMax = Math.max((_mapHeight + 1) / 2, (_mapWidth + 1) / (2 * aspect));

        // For very large maps, don't let tiles become microscopic.
        // tileScreenPx = canvasHeight / (2 * orthoSize).
        // If tiles would be < MIN_TILE_PX, cap _orthoMax so tiles are at least that big.
        const canvasH: number = scene.getEngine().getRenderHeight();
        const maxForMinTile: number = canvasH / (2 * MIN_TILE_PX);
        if (_orthoMax > maxForMinTile) {
            _orthoMax = maxForMinTile;
        }
        return _orthoMax;
    }
    return Math.max(_mapWidth, _mapHeight) / 2;
}
```

Note: When `_orthoMax` is capped, the "Fit Map" button (which calls `setZoomLevel(1, ...)`) will zoom to the capped max — not the true full map. This is intentional: tiles would be invisible at true 1×. The user can still Ctrl+scroll to zoom out to the cap level and use scrollbars to navigate.

### QA
```
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 4: Verify `clampCameraToMap()` centering at 1× zoom

**Line ~12786.** Read and verify the existing `else` branches already center the camera when the viewport covers the full map. The current code:

```typescript
if (minX < maxX) {
    cam.target.x = Math.max(minX, Math.min(maxX, cam.target.x));
} else {
    cam.target.x = _mapHeight / 2;
}
```

With the padding from Task 1, at 1× zoom `minX = MAP_MIN + halfH` and `maxX = _mapHeight - halfH`. Since `halfH = (_mapHeight + 1) / 2`, we get `minX = (_mapHeight + 1)/2` and `maxX = _mapHeight - (_mapHeight + 1)/2 = (_mapHeight - 1)/2`. So `minX > maxX` (by 1), triggering the `else` branch → camera centers at `_mapHeight / 2`. This is correct.

**No code change needed** — just verify this logic holds. Document in the plan that it's been verified.

---

## Task 5: Verify ResizeObserver clamps correctly

**Line ~13097.** The existing resize handler already:
1. Recomputes `computeOrthoMax(scene, cam)` with new aspect
2. Clamps `_orthoSize` if it exceeds new `_orthoMax`
3. Applies ortho bounds and clamps camera

**No code change needed** — the resize handler already handles this correctly.

---

## Task 6: Visual verification

1. Start dev server, open in Playwright MCP browser
2. Verify 40×30 test map is fully visible in mapeditor preset at 1× zoom — no tiles cut off
3. Ctrl+scroll to zoom in — scrollbars appear
4. Ctrl+scroll to zoom out — stops at 1× (padded full map)
5. Resize window — map stays fully visible
6. "Fit Map" button — returns to full map view
7. Switch to other presets (hd2d, topdown) and back to mapeditor — still works

---

## Summary of actual code changes

Only **3 edits** in `dev.ts`:
1. **`computeOrthoMax()`** — padding (+1 to dimensions) + large-map guard
2. **Tilemap load block** — add `_orthoSize = _orthoMax` + `clampCameraToMap` + `updateScrollbars`
3. **New constant** `MIN_TILE_PX = 4` near line 127
