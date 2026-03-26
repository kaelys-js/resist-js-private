# Map Editor Ortho Scroll Fix — Design Document

## Bug Description

In Map Editor Ortho mode, the entire tilemap is **not visible** — it is cut off at the top and bottom edges. At the default 1× zoom level, there are no scrollbars, so the user cannot navigate to the hidden portions of the map.

RPG Maker MV's behavior: if the tilemap is larger than the viewport, the editor shows scrollbars immediately and the user can scroll to any part of the map. The map starts fully zoomed out (all tiles visible) or at a usable tile size with scrollbars for very large maps.

## Root Cause

`computeOrthoMax()` computes the ortho half-height to fit the map:

```typescript
_orthoMax = Math.max(_mapHeight / 2, _mapWidth / (2 * aspect));
```

This tries to ensure both dimensions fit, but the initial `_orthoSize` is set **before** `computeOrthoMax()` runs with the actual scene/camera:

```typescript
let _orthoSize: number = Math.max(_mapWidth, _mapHeight) / 2;
```

When the mapeditor preset activates, `computeOrthoMax()` recalculates with the real aspect ratio. However, `_orthoSize` is then set to `_orthoMax` — which **should** fit the map. The actual bug is that the ortho bounds calculation doesn't account for the axis mapping correctly.

**The axis mapping:** In the dev harness, `_mapWidth` = tilemap columns (Z axis, screen horizontal) and `_mapHeight` = tilemap rows (X axis, screen vertical). The camera looks down the negative Y axis with target at `(_mapHeight/2, 0, _mapWidth/2)`.

For orthographic projection:
- `orthoTop / orthoBottom = ±halfHeight` controls the **X axis** (vertical on screen)
- `orthoLeft / orthoRight = ±halfWidth` controls the **Z axis** (horizontal on screen)
- `halfWidth = halfHeight × aspect`

To fit the map:
- Need `halfHeight ≥ _mapHeight / 2` (all rows visible vertically)
- Need `halfWidth ≥ _mapWidth / 2`, i.e., `halfHeight × aspect ≥ _mapWidth / 2`, i.e., `halfHeight ≥ _mapWidth / (2 × aspect)`

So `_orthoMax = Math.max(_mapHeight / 2, _mapWidth / (2 × aspect))` is correct in principle. The problem is likely that `_orthoSize` doesn't get properly synchronized to `_orthoMax` when the mapeditor preset activates, OR the canvas aspect ratio at initialization time differs from the final layout.

Additionally, `clampCameraToMap()` can push the camera target away from center when `_orthoSize` is close to the boundary, which combined with rounding or slight aspect ratio mismatches causes the edges to be clipped.

## Fix Specification

### 1. Ensure `_orthoSize = _orthoMax` on Mapeditor Preset Activation

When the mapeditor preset is selected:
1. Call `computeOrthoMax(scene, cam)` with the real scene/camera
2. Set `_orthoSize = _orthoMax` (zoom 1× = full map visible)
3. Center camera target at `(_mapHeight / 2, 0, _mapWidth / 2)`
4. Call `applyOrthoBounds(cam, scene)` to set the ortho planes
5. Call `updateScrollbars()` — scrollbars hidden at 1× (full map visible)

### 2. Add Padding to `computeOrthoMax()`

Add a small padding factor (e.g., 0.5 tiles) so the map edges aren't pixel-flush with the viewport border:

```
_orthoMax = Math.max((_mapHeight + 1) / 2, (_mapWidth + 1) / (2 * aspect));
```

This adds half a tile of padding on each edge, ensuring no clipping from floating-point or rounding issues.

### 3. Fix `clampCameraToMap()` Edge Cases

When `_orthoSize === _orthoMax` (fully zoomed out), the viewport exactly fits the map. In this case, `clampCameraToMap` should force the camera to dead center rather than attempting min/max clamping that might push it off-center:

```
if (minX >= maxX) cam.target.x = _mapHeight / 2;
if (minZ >= maxZ) cam.target.z = _mapWidth / 2;
```

This already exists in the code — verify it triggers correctly at 1× zoom.

### 4. Recalculate on Resize

The `ResizeObserver` callback already calls `computeOrthoMax()` and `applyOrthoBounds()`. Verify that when the viewport resizes:
1. `_orthoMax` is recalculated with the new aspect ratio
2. If `_orthoSize > _orthoMax`, clamp `_orthoSize = _orthoMax` (don't allow zooming out beyond what fits)
3. Scrollbar visibility updates accordingly

### 5. Scrollbar Behavior

Current behavior: scrollbars show only when zoomed in past 1×. This is correct and should remain:
- At 1× zoom: full map visible, no scrollbars needed
- At 2× zoom: half the map visible, scrollbars appear for navigation
- Scrollbar thumb size = viewport fraction of map
- Scrollbar thumb position = camera position fraction

No changes needed to scrollbar logic itself — the fix is ensuring 1× zoom actually shows the full map.

### 6. Large Map Handling

For very large maps where fitting the entire map at 1× would make tiles microscopic (< 4 pixels per tile on screen):
- Compute minimum usable `_orthoSize` where tiles are at least 4px on screen
- If `_orthoMax` would make tiles smaller than 4px, cap initial zoom at the usable level
- Show scrollbars immediately since the full map doesn't fit
- The "Fit Map" button zooms to `_orthoMax` regardless (user explicitly chose to see all tiles)

Tile screen size calculation:
```
tileScreenPx = canvasHeight / (2 * orthoSize)
```
If `tileScreenPx < 4`, set initial `_orthoSize` = `canvasHeight / (2 * 4)` = `canvasHeight / 8`.

## Files to Modify

- `packages/products/webforge/runtime/dev/dev.ts` — all changes in this single file:
  - `computeOrthoMax()`: add padding
  - Mapeditor preset handler: ensure `_orthoSize = _orthoMax` after computation
  - `clampCameraToMap()`: verify centering at 1× zoom
  - ResizeObserver callback: ensure `_orthoSize` clamped to new `_orthoMax`
  - Large map guard: add minimum tile size check

No other files need changes. The scrollbar HTML/CSS is already correct. The tile rendering and camera controller are unchanged.

## Verification

1. Load dev harness with 40×30 test map in mapeditor preset
2. At 1× zoom: entire map visible, no tiles cut off, no scrollbars
3. Ctrl+scroll to zoom in: scrollbars appear, can navigate to all edges
4. Ctrl+scroll to zoom out: stops at 1× (can't zoom past full map)
5. Resize browser window: map stays fully visible, ortho bounds recalculate
6. "Fit Map" button: returns to 1× with full map visible
7. All other presets (hd2d, topdown, etc.) unaffected
