# Map Refocus — Design Document

## Context

The Map Navigation panel in the dev harness has a "Fit Map" button, but it only works in the `mapeditor` preset (orthographic mode). When using any other camera preset (hd2d, topdown, cinematic, free, isometric, tactical, etc.), the entire Map Navigation panel shows "Switch to Map Editor for zoom/navigation" — there is no way to refocus on the full tilemap.

This design adds a universal "Refocus Map" action that works across ALL camera presets, with smooth animated transitions and configurable options.

## Architecture

### Core Function: `refocusOnTilemap()`

A new exported function in `camera-controller.ts` that computes the ideal camera position to view the entire tilemap and smoothly animates there.

**For perspective cameras (ArcRotateCamera):**
1. Compute tilemap bounding box center: `centerX = mapWidth / 2`, `centerZ = mapHeight / 2`
2. Compute the bounding sphere radius: `boundRadius = Math.hypot(mapWidth, mapHeight) / 2`
3. Compute ideal camera radius from FOV: `radius = boundRadius / Math.sin(fov / 2)` × `paddingScale`
4. Animate `camera.target` → map center, `camera.radius` → computed radius
5. Optionally animate `camera.beta` → preset default elevation
6. Optionally animate `camera.alpha` → preset default orbit angle

**For orthographic cameras (mapeditor preset):**
1. Set `orthoSize` = `MAP_SIZE / 2` (zoom 1x — full map visible)
2. Set `camera.target` = map center
3. Apply ortho bounds and clamp

**For UniversalCamera (firstperson preset):**
1. Set camera position to elevated center above the map
2. Look direction toward map center — limited usefulness but handled gracefully

### Animation System

Reuses the same `onBeforeRenderObservable` pattern from `switchCameraPreset()`:

1. Snapshot current camera state (target, radius, alpha, beta)
2. Compute destination state
3. Register per-frame observer that interpolates using elapsed time + easing function
4. Self-removes when progress reaches 1.0
5. Returns a `RefocusHandle` with `.dispose()` to cancel mid-animation
6. User input (wheel/pan) cancels the animation via `zoomStopsAnimation` behavior

### Easing Functions

Reuse the existing `EASING_FUNCTIONS` map from `camera-controller.ts`:

| Easing | Description |
|--------|-------------|
| `linear` | Constant speed |
| `easeInOutCubic` | Smooth acceleration/deceleration (default) |
| `easeOutBack` | Slight overshoot then settle |
| `easeInOutQuad` | Gentle ease |

## Valibot Schema

### RefocusConfigSchema

Added as a sub-object of the existing camera config schema:

```
refocus: {
  animated: Bool          (default: true)
  durationMs: Num         (100–3000, default: 800)
  easing: Str             ('linear' | 'easeInOutCubic' | 'easeOutBack' | 'easeInOutQuad', default: 'easeInOutCubic')
  paddingScale: Num       (1.0–2.0, default: 1.15)
  resetElevation: Bool    (default: true)
  resetOrbit: Bool        (default: false)
}
```

### Property Details

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `animated` | Bool | `true` | — | Smooth transition vs instant snap |
| `durationMs` | Num | `800` | 100–3000 | Animation duration in milliseconds |
| `easing` | Str | `'easeInOutCubic'` | enum | Easing curve for the transition |
| `paddingScale` | Num | `1.15` | 1.0–2.0 | Multiplier on computed radius — breathing room around map edges |
| `resetElevation` | Bool | `true` | — | Animate beta (pitch) back to current preset's default elevation |
| `resetOrbit` | Bool | `false` | — | Animate alpha (orbit angle) back to current preset's default |

## Camera-Specific Behavior

### Perspective Presets (hd2d, topdown, sideview, cinematic, free, isometric, tactical, thirdperson, rts, dungeon, platformer, panoramic, orbit, editor)

All use `ArcRotateCamera`. The refocus action:

1. **Target**: Animate to tilemap center `(mapWidth/2, 0, mapHeight/2)`
2. **Radius**: Compute from tilemap bounding sphere + FOV + paddingScale
3. **Beta**: If `resetElevation=true`, animate to `PRESET_DEFAULTS[currentPreset].beta`
4. **Alpha**: If `resetOrbit=true`, animate to `PRESET_DEFAULTS[currentPreset].alpha`
5. **Limits**: Temporarily unlock alpha/beta limits during animation (same as `switchCameraPreset`)
6. **Finalize**: Re-apply limits after animation completes

**Radius calculation:**
```
mapDiagonal = Math.hypot(mapWidth, mapHeight)
boundRadius = mapDiagonal / 2
idealRadius = boundRadius / Math.sin(camera.fov / 2) × paddingScale
// Clamp to camera's radius limits
finalRadius = Math.min(camera.upperRadiusLimit ?? Infinity, Math.max(camera.lowerRadiusLimit ?? 0, idealRadius))
```

### Map Editor Preset (orthographic)

1. **Ortho size**: Set to `MAP_SIZE / 2` (zoom 1x)
2. **Target**: Animate to map center
3. **Ortho bounds**: Reapply via existing `applyOrthoBounds()`
4. **Clamp**: Call existing `clampCameraToMap()`
5. **Scrollbars**: Update via existing `updateScrollbars()`

### First Person Preset (UniversalCamera)

Not an ArcRotateCamera — skip the refocus action. The button will be disabled or show a tooltip explaining it's not available in first-person mode.

## Keyboard Shortcuts

| Key | Condition | Action |
|-----|-----------|--------|
| `F` | Canvas focused, not typing in input | Refocus on entire tilemap |
| `Home` | Canvas focused, not typing in input | Refocus on entire tilemap (alternative) |

Both keys trigger the same `refocusOnTilemap()` with current config. Keyboard shortcuts work in ALL camera presets (except firstperson).

The key handler follows the existing pattern at `dev.ts:12602` — check `e.target.tagName` to avoid triggering when typing in inputs.

## Dev Harness UI

### Button Placement

The "Refocus Map" button goes in the **Map Navigation** panel's action button group, replacing the existing `Fit Map` button which only works in mapeditor mode. The new button works in ALL presets.

### Refocus Settings Sub-Section

A new collapsible sub-section "Refocus Settings" in the Map Navigation panel:

| Control | Type | Label | Data Attribute |
|---------|------|-------|----------------|
| Toggle | switch | Animated | `nav-refocus-animated` |
| Slider | range | Duration | `nav-refocus-duration` (100–3000, step 50) |
| Select | dropdown | Easing | `nav-refocus-easing` |
| Slider | range | Padding | `nav-refocus-padding` (1.0–2.0, step 0.05) |
| Toggle | switch | Reset Elevation | `nav-refocus-reset-elev` |
| Toggle | switch | Reset Orbit | `nav-refocus-reset-orbit` |

### Visibility

Unlike the existing zoom/action controls which are mapeditor-only, the Refocus button and settings are **always visible** regardless of camera preset. This is the whole point of the feature.

## Interruption Behavior

- **User scroll/wheel during animation**: Cancels the refocus animation immediately (camera stays at current interpolated position)
- **User pan during animation**: Cancels the refocus animation
- **Pressing F/Home during animation**: Cancels current animation and starts a new one (snap-to-latest behavior)
- **Switching camera preset during animation**: Cancels the refocus animation

## Edge Cases

| Case | Handling |
|------|----------|
| Zero-size tilemap | Use minimum radius of 10, center at origin |
| Very large tilemap (500×500) | Computed radius may exceed `upperRadiusLimit`; clamp and accept partial visibility |
| `durationMs = 0` or `animated = false` | Instant snap, no animation |
| First-person camera | Skip refocus, button disabled with tooltip |
| Preset transition in progress | Cancel preset transition, then start refocus |
| Aspect ratio change during animation | Animation continues with new aspect ratio — radius calculation is static at start |

## Files Modified

| File | Change |
|------|--------|
| `src/schemas/camera-config.ts` | Add `RefocusConfigSchema` sub-object |
| `src/core/camera-controller.ts` | Add `refocusOnTilemap()` function |
| `dev/dev.ts` | Add Refocus button (always visible), keyboard shortcuts (F/Home), refocus settings sub-section |
| `docs/runtime/camera.md` | Document refocus configuration and API |
| `docs/ARCHITECTURE.md` | No change (camera system already listed) |
