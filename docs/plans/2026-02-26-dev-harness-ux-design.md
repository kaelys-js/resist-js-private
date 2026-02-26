# Dev Harness UX Improvements

## Overview

Four changes to the runtime dev harness (`dev/index.html` + `dev/dev.ts`):

1. Convert all button groups to dropdowns
2. Add `data-*` tags on every interactive element
3. Add day/night pause/play toggle
4. Add Sky / Background section with parallax controls

## 1. Dropdowns

Replace every `btn-group` selection with a styled `<select>` dropdown.

### New CSS

`.control-dropdown` — dark-themed `<select>` matching the panel aesthetic (dark bg, light text, monospace font, rounded border).

### New Helper

`createDropdown(label, options, active, onChange, dataControl?)` — returns a `.control-row` with label + `<select>`. Each `<option>` gets `data-value="optionName"`. The `<select>` gets `data-control` if provided.

### Conversions

| Section | Label | Options | Notes |
|---------|-------|---------|-------|
| Camera Presets | Preset | free, hd2d, topdown, sideview, cinematic, firstperson | Active selection triggers `handlePresetClick` |
| Screen Effects | Effect | flash, tint, fadeOut, fadeIn | Dropdown selects type; separate "Trigger" button fires it |
| Day/Night | Preset | dawn, noon, dusk, night | Selecting jumps time to that hour |
| Fog | Mode | none, linear, exponential, exponential2 | Sets `scene.fogMode` |
| Tone Mapping | Mapping | standard, aces, khr_pbr_neutral | Sets pipeline tone mapping type |

Screen effects: dropdown + "Trigger" button below it. Color swatches stay as-is (different interaction pattern).

## 2. Data Tags

Every interactive element gets `data-*` attributes for programmatic querying.

### Attribute Schema

- `data-section` on every `.section` div — matches section id sans prefix (e.g., `data-section="camera"`, `data-section="daynight"`, `data-section="sky"`)
- `data-control` on every control row (slider, toggle, dropdown) — kebab-case identifier (e.g., `data-control="shake-intensity"`, `data-control="preset"`, `data-control="fog-mode"`)
- `data-value` on dropdown `<option>` elements (e.g., `data-value="free"`, `data-value="hd2d"`)

### Helper Changes

`createSliderRow`, `createToggleRow`, `createDropdown` gain an optional `dataControl?: string` parameter. When provided, sets `data-control` on the row element.

### Static HTML

Existing HTML sections get `data-section` attributes added directly. Existing sliders with `id` attributes (like `#time-slider`, `#shake-intensity`) also get `data-control`.

## 3. Day/Night Pause/Play

### UX

A pause/play button next to the speed slider in the Day/Night section.

- Display: "Pause" when speed > 0, "Play" when speed === 0
- State: `_lastDayNightSpeed` variable (default: 1.0)
- Click when playing (speed > 0): save current speed to `_lastDayNightSpeed`, set speed to 0
- Click when paused (speed === 0): restore speed from `_lastDayNightSpeed`
- Speed slider manual change: if new speed > 0, update `_lastDayNightSpeed`

### HTML

Add a button row below the speed slider in `#section-daynight`.

## 4. Sky / Background Section

New collapsible section (starts collapsed), positioned between Layers and Screen Effects.

### Sky Sub-section

- **Type dropdown**: color, gradient, skybox, procedural
  - Changing type disposes current sky and recreates it — calls `disposeSky` then `createSky` with updated config
  - Sky config is stored on the debug object for mutation
- **Color type**: R, G, B, A sliders (0-1, step 0.01) — modifies `scene.clearColor` directly
- **Gradient type**: read-only info text showing stop count ("3 gradient stops") — gradient mesh is baked at creation, not runtime-editable
- **Procedural type**: turbidity (0-20, step 0.5), rayleigh (0-10, step 0.1), luminance (0-2, step 0.05) sliders — requires sky rebuild on change
- **Skybox type**: read-only info text showing skybox path (not runtime-editable without new texture)

### Parallax Sub-section

Per-layer controls, dynamically built (same pattern as per-light controls in Lights section).

For each parallax layer:
- **Header**: "Layer N: {imagePath}" (truncated)
- **Opacity** slider: 0-1, step 0.01 — sets `bgLayers[i].alphaBlendingMode` and alpha directly on the Babylon Layer
- **ScrollSpeedX** slider: -2 to 2, step 0.05 — mutates layer config (requires mutable clone)
- **ScrollSpeedY** slider: -2 to 2, step 0.05 — mutates layer config
- **Scale** slider: 0.1-10, step 0.1 — mutates layer config
- **Visible** toggle — sets `bgLayers[i].isEnabled`

### Mutability Fix

`tilemap-renderer.ts` must clone parallax layer configs before passing to `createParallax`, matching the flicker config pattern from `light-manager.ts`. `ParallaxInstance.layers` type changes from `readonly` to mutable.

## Files Modified

| File | Changes |
|------|---------|
| `dev/index.html` | New CSS for `.control-dropdown`. `data-section` on all section divs. Remove `btn-group` HTML for camera/effects/daynight presets (replaced by dynamic dropdowns). Add pause button markup in daynight section. Add Sky/Background section shell. |
| `dev/dev.ts` | New `createDropdown` helper. Refactor `createSliderRow`/`createToggleRow`/`createButtonGroup` to accept `dataControl` param. Replace all button group wiring with dropdown wiring. Add pause/play logic. Add `setupSkyControls` function. Add `setupParallaxControls` function. |
| `src/rendering/tilemap-renderer.ts` | Clone parallax layer configs at boundary before `createParallax` call. |
| `src/rendering/parallax-manager.ts` | Change `ParallaxInstance.layers` from `readonly` to mutable. Add JSDoc noting mutability. |
