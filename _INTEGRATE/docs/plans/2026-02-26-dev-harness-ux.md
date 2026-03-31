# Dev Harness UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the dev harness with dropdowns (replacing button groups), data tags on every control, day/night pause/play, and sky/parallax management controls.

**Architecture:** Pure UI changes in two files (`dev/index.html` CSS/HTML, `dev/dev.ts` JS wiring) plus a small mutability fix in `parallax-manager.ts` and `tilemap-renderer.ts` (same pattern as the flicker config fix). No new modules or schemas needed.

**Tech Stack:** Vanilla HTML/CSS/JS in dev harness, Babylon.js Layer API for parallax, existing `createSky`/`disposeSky` for sky rebuilds.

**Design doc:** `docs/plans/2026-02-26-dev-harness-ux-design.md`

---

### Task 1: Dropdown CSS + Helper

Add dropdown styling and the `createDropdown` helper function.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html` (add CSS)
- Modify: `packages/products/webforge/runtime/dev/dev.ts` (add helper)

**Step 1: Add dropdown CSS to index.html**

In `dev/index.html`, after the `.status-text` CSS rule (around line 249), add:

```css
/* Dropdown */
.control-dropdown {
	-webkit-appearance: none;
	appearance: none;
	width: 100%;
	padding: 4px 8px;
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 4px;
	color: #ccc;
	font-family: inherit;
	font-size: 10px;
	cursor: pointer;
	outline: none;
}
.control-dropdown:hover {
	background: rgba(255, 255, 255, 0.1);
	border-color: rgba(255, 255, 255, 0.2);
	color: #fff;
}
.control-dropdown:focus {
	border-color: rgba(100, 100, 255, 0.4);
}
.control-dropdown option {
	background: #1a1a2e;
	color: #ccc;
}
```

**Step 2: Add `createDropdown` helper to dev.ts**

In `dev/dev.ts`, after the `createSubHeader` function (around line 663), add:

```typescript
/**
 * Creates a control-row with label and styled dropdown.
 *
 * @param label - Display label text.
 * @param options - Array of option strings.
 * @param active - Currently selected option.
 * @param onChange - Callback when selection changes.
 * @param dataControl - Optional data-control attribute value.
 * @returns The row element.
 */
function createDropdown(
	label: string,
	options: readonly string[],
	active: string,
	onChange: (value: string) => void,
	dataControl?: string,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';
	if (dataControl) row.dataset['control'] = dataControl;

	const lbl = document.createElement('span');
	lbl.className = 'control-label';
	lbl.textContent = label;

	const select = document.createElement('select');
	select.className = 'control-dropdown';
	if (dataControl) select.dataset['control'] = dataControl;

	for (const opt of options) {
		const option = document.createElement('option');
		option.value = opt;
		option.textContent = opt;
		option.dataset['value'] = opt;
		if (opt === active) option.selected = true;
		select.append(option);
	}

	select.addEventListener('change', () => {
		onChange(select.value);
	});

	row.append(lbl, select);
	return row;
}
```

**Step 3: Add `dataControl` param to `createSliderRow`, `createToggleRow`**

In `createSliderRow` (line 550), add optional last param `dataControl?: string`. After `row.className = 'control-row';` add: `if (dataControl) row.dataset['control'] = dataControl;`

In `createToggleRow` (line 594), add optional last param `dataControl?: string`. After `row.className = 'toggle-row';` add: `if (dataControl) row.dataset['control'] = dataControl;`

**Step 4: Verify dev server still loads**

Run: dev server at port 3100, reload page, confirm no errors.

**Step 5: Commit**

```
feat(dev): add dropdown CSS and createDropdown helper
```

---

### Task 2: Data Tags on All Static HTML Sections

Add `data-section` to every `.section` div and `data-control` to every static slider/control in `index.html`.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html`

**Step 1: Add `data-section` to all section divs**

Find each `<div class="section"` and add the corresponding `data-section`:

| Line | Current | Add |
|------|---------|-----|
| 270 | `id="section-camera"` | `data-section="camera"` |
| 309 | `id="section-shake"` | `data-section="shake"` |
| 346 | `id="section-daynight"` | `data-section="daynight"` |
| 371 | `id="section-layers"` | `data-section="layers"` |
| 383 | `id="section-effects"` | `data-section="effects"` |
| 459 | `id="section-rendering"` | `data-section="rendering"` |
| 490 | `id="section-postfx"` | `data-section="postfx"` |
| 501 | `id="section-fog"` | `data-section="fog"` |
| 512 | `id="section-camdetails"` | `data-section="camdetails"` |
| 523 | `id="section-glowdetails"` | `data-section="glow"` |
| 534 | `id="section-lights"` | `data-section="lights"` |
| 545 | `id="section-info"` | `data-section="info"` |

**Step 2: Add `data-control` to static sliders**

| Slider ID | Add |
|-----------|-----|
| `#transition-duration` | `data-control="transition-duration"` |
| `#shake-intensity` | `data-control="shake-intensity"` |
| `#shake-duration` | `data-control="shake-duration"` |
| `#time-slider` | `data-control="time"` |
| `#speed-slider` | `data-control="speed"` |
| `#effect-duration` | `data-control="effect-duration"` |
| `#effect-custom-color` | `data-control="effect-custom-color"` |

Also add `data-control` to the rendering toggle divs:

| Toggle ID | Add |
|-----------|-----|
| `#toggle-postprocess` parent `.toggle-row` | `data-control="post-processing"` |
| `#toggle-glow` parent `.toggle-row` | `data-control="glow-layer"` |
| `#toggle-shadows` parent `.toggle-row` | `data-control="shadows"` |
| `#toggle-godrays` parent `.toggle-row` | `data-control="god-rays"` |
| `#toggle-lensflares` parent `.toggle-row` | `data-control="lens-flares"` |

**Step 3: Verify and commit**

Reload dev server, confirm no errors.

```
feat(dev): add data-section and data-control tags to static HTML
```

---

### Task 3: Convert Camera Presets to Dropdown

Replace the 6 camera preset buttons with a dropdown.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html`
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Replace camera button HTML with dropdown container**

In `index.html`, replace the two `btn-group` divs containing preset buttons (lines 276-285) with a single placeholder:

```html
<div id="camera-preset-dropdown"></div>
```

Keep the Transition slider row and Tactics Rotate row as-is.

**Step 2: Build dropdown dynamically in dev.ts**

In the camera presets setup section of `setupControls` (around line 195), replace the `presetButtons` / `handlePresetClick` / button listener wiring with:

```typescript
// ── Camera Presets (dropdown) ──────────────────────────────────
const presetContainer = document.querySelector('#camera-preset-dropdown');
const presetOptions = ['free', 'hd2d', 'topdown', 'sideview', 'cinematic', 'firstperson'] as const;

if (presetContainer) {
	const presetDropdown = createDropdown(
		'Preset',
		presetOptions,
		'free',
		(value) => {
			handlePresetChange(value);
		},
		'preset',
	);
	presetContainer.append(presetDropdown);
}
```

Refactor `handlePresetClick` into `handlePresetChange(preset: string)` that takes a preset string instead of a button element. Remove the `allButtons` active class management since the dropdown handles selection state natively. Keep the firstperson camera creation/disposal logic, transition duration reading, and `debug.switchPreset` calls.

**Step 3: Verify all 6 presets work via dropdown**

Reload, test each preset from the dropdown. Verify firstperson creates UniversalCamera, switching away restores ArcRotateCamera with pipelines.

**Step 4: Commit**

```
refactor(dev): convert camera presets from buttons to dropdown
```

---

### Task 4: Convert Screen Effects to Dropdown + Trigger

Replace the 4 effect buttons with a dropdown and a "Trigger" button.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html`
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Replace effect button HTML**

In `index.html`, replace the effect `btn-group` (lines 401-406) with:

```html
<div id="effect-type-dropdown"></div>
<button class="btn" id="effect-trigger-btn" style="width: 100%; margin-top: 4px" data-control="effect-trigger">
	Trigger Effect
</button>
```

Keep the Duration slider and Color section as-is.

**Step 2: Build dropdown and wire trigger in dev.ts**

Replace the `triggerEffect` global function setup with:

```typescript
// ── Screen Effects (dropdown + trigger) ────────────────────────
let _selectedEffectType = 'flash';
const effectDropdownContainer = document.querySelector('#effect-type-dropdown');
if (effectDropdownContainer) {
	effectDropdownContainer.append(
		createDropdown('Effect', ['flash', 'tint', 'fadeOut', 'fadeIn'], 'flash', (val) => {
			_selectedEffectType = val;
		}, 'effect-type'),
	);
}

const effectTriggerBtn = document.querySelector('#effect-trigger-btn');
effectTriggerBtn?.addEventListener('click', () => {
	triggerEffect(_selectedEffectType);
});
```

Move the `triggerEffect` logic from a `window` global to a local function. Remove the `onclick="triggerEffect('flash')"` inline handlers.

**Step 3: Verify all 4 effects fire correctly**

Test: select each effect from dropdown, click Trigger, confirm visual effect.

**Step 4: Commit**

```
refactor(dev): convert screen effects from buttons to dropdown + trigger
```

---

### Task 5: Convert Day/Night Presets to Dropdown

Replace the 4 time preset buttons with a dropdown.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html`
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Replace preset button HTML**

In `index.html`, replace the day/night `btn-group` (lines 362-367) with:

```html
<div id="daynight-preset-dropdown"></div>
```

**Step 2: Build dropdown in dev.ts**

In the day/night setup section (around line 340), replace the `setTimePreset` global with:

```typescript
const dayNightDropdownContainer = document.querySelector('#daynight-preset-dropdown');
const timePresetMap: Record<string, number> = { dawn: 6, noon: 12, dusk: 18, night: 0 };
if (dayNightDropdownContainer) {
	dayNightDropdownContainer.append(
		createDropdown('Preset', ['dawn', 'noon', 'dusk', 'night'], 'noon', (val) => {
			const hour = timePresetMap[val] ?? 12;
			debug.setTime(hour);
			if (timeSlider) timeSlider.value = String(hour);
			updateTimeDisplay(hour);
		}, 'daynight-preset'),
	);
}
```

**Step 3: Verify all 4 presets work**

**Step 4: Commit**

```
refactor(dev): convert day/night presets from buttons to dropdown
```

---

### Task 6: Convert Fog Mode + Tone Mapping to Dropdowns

These are built dynamically in `setupFogControls` and `setupPostFxControls`. Replace `createButtonGroup` calls with `createDropdown`.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Find fog mode button group creation**

Search for `createButtonGroup` in the fog setup. Replace with `createDropdown` keeping the same `onChange` callback.

**Step 2: Find tone mapping button group creation**

Search for `createButtonGroup` in the post-fx setup (tone mapping section). Replace with `createDropdown`.

**Step 3: Delete `createButtonGroup` function**

After all callsites are converted, delete the now-unused `createButtonGroup` helper (lines 626-649).

**Step 4: Verify fog modes and tone mapping work via dropdowns**

**Step 5: Commit**

```
refactor(dev): convert fog mode and tone mapping from buttons to dropdowns
```

---

### Task 7: Day/Night Pause/Play Toggle

Add a pause/play button that saves and restores the last non-zero speed.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html`
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Add pause button HTML**

In `index.html`, after the speed slider row in `#section-daynight` (after line 361), add:

```html
<button class="btn" id="daynight-pause-btn" data-control="daynight-pause" style="width: 100%; margin-top: 4px">
	Pause
</button>
```

**Step 2: Add pause/play state and wiring in dev.ts**

Add state variable near the other state vars (around line 185):

```typescript
let _lastDayNightSpeed = 1.0;
```

In the day/night setup section, after the speed slider listener, add:

```typescript
const pauseBtn = document.querySelector('#daynight-pause-btn') as HTMLButtonElement | null;

pauseBtn?.addEventListener('click', () => {
	const cycle = debug.tilemap?.lighting?.dayNightCycle;
	if (!cycle) return;
	if (cycle.speed > 0) {
		// Pause: save current speed, set to 0
		_lastDayNightSpeed = cycle.speed;
		cycle.speed = 0;
		if (speedSlider) speedSlider.value = '0';
		if (speedValue) speedValue.textContent = '0x';
		pauseBtn.textContent = 'Play';
	} else {
		// Play: restore saved speed
		cycle.speed = _lastDayNightSpeed;
		if (speedSlider) speedSlider.value = String(_lastDayNightSpeed);
		if (speedValue) speedValue.textContent = `${_lastDayNightSpeed}x`;
		pauseBtn.textContent = 'Pause';
	}
});
```

Also update the speed slider listener to save the speed:

```typescript
speedSlider?.addEventListener('input', () => {
	const speed = Number(speedSlider.value);
	const cycle = debug.tilemap?.lighting?.dayNightCycle;
	if (cycle) cycle.speed = speed;
	if (speed > 0) _lastDayNightSpeed = speed;
	if (speedValue) speedValue.textContent = speed === 0 ? '0x' : `${speed}x`;
	if (pauseBtn) pauseBtn.textContent = speed > 0 ? 'Pause' : 'Play';
});
```

**Step 3: Verify pause/play works**

Set speed to 3x, click Pause (speed → 0, button says "Play"), click Play (speed → 3x, button says "Pause"). Manually set speed slider to 5x, click Pause, click Play → speed should be 5x.

**Step 4: Commit**

```
feat(dev): add day/night cycle pause/play toggle
```

---

### Task 8: Parallax Layer Mutability Fix

Clone parallax layer configs at the `tilemap-renderer.ts` boundary so dev harness sliders can mutate scroll speeds. Same pattern as the flicker config fix.

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/tilemap-renderer.ts:326-336`
- Modify: `packages/products/webforge/runtime/src/rendering/parallax-manager.ts:43-52`

**Step 1: Clone parallax layers in tilemap-renderer.ts**

At line 328-331, change:

```typescript
const parallaxResult = createParallax({
	scene,
	layers: mapData.sky.parallaxLayers,
	assetBasePath,
});
```

to:

```typescript
// Spread to strip DeepReadonly — createParallax stores mutable layer
// configs that the dev harness can mutate at runtime (scroll speed, etc).
const mutableLayers = mapData.sky.parallaxLayers.map((l) => ({ ...l }));
const parallaxResult = createParallax({
	scene,
	layers: mutableLayers,
	assetBasePath,
});
```

Import `ParallaxLayer` type if not already imported:

```typescript
import type { ParallaxLayer } from '../schemas/sky-config';
```

**Step 2: Make ParallaxInstance.layers mutable**

In `parallax-manager.ts` line 43-52, change:

```typescript
export type ParallaxInstance = {
	readonly bgLayers: BABYLON.Layer[];
	readonly layers: readonly ParallaxLayer[];
	...
```

to:

```typescript
/**
 * A live parallax background instance in the scene.
 *
 * `layers` is intentionally mutable — external code (dev harness)
 * may write to layer configs at runtime and the per-frame observer
 * reads the latest values each tick.
 */
export type ParallaxInstance = {
	readonly bgLayers: BABYLON.Layer[];
	/** Mutable — external code may change scroll speeds between frames. */
	layers: ParallaxLayer[];
	...
```

**Step 3: Run type check**

Run: `pnpm -w run qa:lint --tools`
Expected: all pass.

**Step 4: Commit**

```
fix(runtime): clone parallax layer configs for runtime mutability
```

---

### Task 9: Sky / Background Section — HTML Shell + Sky Controls

Add the new collapsible section and sky type controls.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html`
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Add section HTML**

In `index.html`, after `#section-layers` (after line 380) and before `#section-effects`, add:

```html
<!-- Sky / Background -->
<div class="section collapsed" id="section-sky" data-section="sky">
	<div class="section-header" onclick="toggleSection('section-sky')">
		<span>Sky / Background</span>
		<span class="panel-toggle">+</span>
	</div>
	<div class="section-body" id="sky-body">
		<div class="status-text">Loading...</div>
	</div>
</div>
```

**Step 2: Add `setupSkyControls` function in dev.ts**

Add new function after `setupSceneInfo` (near the end of dev.ts). Import `createSky`, `disposeSky`, `SkyInstance` from their modules.

```typescript
function setupSkyControls(
	tilemap: RenderedTilemap,
	scene: BABYLON.Scene,
): void {
	const container = document.querySelector('#sky-body') as HTMLElement | null;
	if (!container) return;
	container.innerHTML = '';

	const sky = tilemap.sky;
	const skyConfig = tilemap.sky ? /* read from test map */ : null;

	// Sub-header: Sky
	container.append(createSubHeader('Sky'));

	// Sky type — read-only display for now (changing type requires sky rebuild)
	const currentType = /* from map config */ 'gradient';
	container.append(
		createDropdown('Type', ['color', 'gradient', 'skybox', 'procedural'], currentType, (val) => {
			// Sky type change: modify scene.clearColor for 'color', show info for others
			if (val === 'color') {
				// Show RGBA sliders, hide others
			}
			// Full sky rebuild would go here in the future
		}, 'sky-type'),
	);

	// Color RGBA sliders — always visible, controls scene.clearColor
	const cc = scene.clearColor;
	container.append(createSliderRow('Clear R', 0, 1, 0.01, cc.r, (v) => { scene.clearColor.r = v; }, 'sky-clear-r'));
	container.append(createSliderRow('Clear G', 0, 1, 0.01, cc.g, (v) => { scene.clearColor.g = v; }, 'sky-clear-g'));
	container.append(createSliderRow('Clear B', 0, 1, 0.01, cc.b, (v) => { scene.clearColor.b = v; }, 'sky-clear-b'));
	container.append(createSliderRow('Clear A', 0, 1, 0.01, cc.a, (v) => { scene.clearColor.a = v; }, 'sky-clear-a'));
}
```

Call `setupSkyControls` from `main()` after tilemap is rendered, alongside the other setup calls.

**Step 3: Verify the section appears and clear color sliders work**

Reload, expand Sky / Background, change Clear R/G/B sliders, confirm sky color changes.

**Step 4: Commit**

```
feat(dev): add Sky / Background section with clear color controls
```

---

### Task 10: Parallax Layer Controls

Add per-layer parallax controls in the Sky / Background section.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Add parallax sub-section to `setupSkyControls`**

After the sky controls, add parallax layer controls:

```typescript
// Sub-header: Parallax Layers
const parallax = tilemap.parallax;
if (parallax && parallax.layers.length > 0) {
	container.append(createSubHeader('Parallax Layers'));

	for (let i = 0; i < parallax.layers.length; i++) {
		const layer = parallax.layers[i];
		const bgLayer = parallax.bgLayers[i];
		if (!layer || !bgLayer) continue;

		// Layer header
		const header = document.createElement('div');
		header.style.cssText = 'font-size: 9px; color: #777; padding: 4px 0 2px;';
		const shortPath = layer.imagePath.length > 20
			? '...' + layer.imagePath.slice(-17)
			: layer.imagePath;
		header.textContent = `${i}: ${shortPath}`;
		container.append(header);

		// Visibility toggle
		container.append(
			createToggleRow('Visible', bgLayer.isEnabled, (on) => {
				bgLayer.isEnabled = on;
			}, `parallax-${i}-visible`),
		);

		// Opacity slider
		container.append(
			createSliderRow('Opacity', 0, 1, 0.01, layer.opacity, (v) => {
				bgLayer.color = new BABYLON.Color4(1, 1, 1, v);
				layer.opacity = v;
			}, `parallax-${i}-opacity`),
		);

		// ScrollSpeedX slider
		container.append(
			createSliderRow('Speed X', -2, 2, 0.05, layer.scrollSpeedX, (v) => {
				layer.scrollSpeedX = v;
			}, `parallax-${i}-speed-x`),
		);

		// ScrollSpeedY slider
		container.append(
			createSliderRow('Speed Y', -2, 2, 0.05, layer.scrollSpeedY, (v) => {
				layer.scrollSpeedY = v;
			}, `parallax-${i}-speed-y`),
		);

		// Scale slider
		container.append(
			createSliderRow('Scale', 0.1, 10, 0.1, layer.scale, (v) => {
				layer.scale = v;
				// Update texture UV scale
				const tex = bgLayer.texture;
				if (tex && tex instanceof BABYLON.Texture) {
					tex.uScale = 1 / v;
					tex.vScale = 1 / v;
				}
			}, `parallax-${i}-scale`),
		);
	}
}
```

**Step 2: Verify parallax controls work**

Reload, expand Sky / Background, scroll down to Parallax Layers. Change opacity on layer 0 (mountains) — should fade. Change Speed X — parallax scroll rate should change when panning camera. Toggle Visible off — layer disappears.

**Step 3: Commit**

```
feat(dev): add parallax layer controls (opacity, speed, scale, visibility)
```

---

### Task 11: Add Data Tags to All Dynamic Controls

Go through every `createSliderRow`, `createToggleRow`, and `createDropdown` call in the dynamic setup functions and add the `dataControl` parameter where missing.

**Files:**
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Audit all dynamic control creation calls**

Search for all `createSliderRow(` and `createToggleRow(` calls. Add `dataControl` param to each one that doesn't already have it.

The naming convention is `section-property` in kebab-case:

- PostFX: `postfx-exposure`, `postfx-contrast`, `postfx-bloom-enabled`, `postfx-bloom-weight`, `postfx-bloom-threshold`, `postfx-bloom-kernel`, `postfx-bloom-scale`, `postfx-dof-enabled`, `postfx-dof-focal-length`, `postfx-dof-fstop`, `postfx-dof-focus-dist`, `postfx-ca-enabled`, `postfx-ca-amount`, `postfx-ca-radial`, `postfx-grain-enabled`, `postfx-grain-intensity`, `postfx-grain-animated`, `postfx-sharpen-enabled`, `postfx-sharpen-edge`, `postfx-sharpen-color`, `postfx-vignette-enabled`, `postfx-vignette-weight`, `postfx-vignette-stretch`, `postfx-tonemapping-enabled`, `postfx-colorgrading-enabled`, `postfx-fxaa-enabled`, `postfx-dithering-enabled`
- Fog: `fog-mode`, `fog-density`, `fog-start`, `fog-end`, `fog-r`, `fog-g`, `fog-b`
- Camera details: `cam-fov`, `cam-radius`, `cam-inertia`, `cam-wheel-prec`, `cam-pan-sens`, `cam-lower-radius`, `cam-upper-radius`
- Glow: `glow-enabled`, `glow-intensity`, `glow-blur-kernel`
- Per-light: `light-{id}-enabled`, `light-{id}-intensity`, `light-{id}-diffuse-r`, etc.
- Layer controls: `layer-{index}-visible`, `layer-{index}-opacity`

**Step 2: Verify data attributes are present**

Open browser devtools, run: `document.querySelectorAll('[data-control]').length` — should be > 50.

**Step 3: Commit**

```
feat(dev): add data-control tags to all dynamic controls
```

---

### Task 12: Final Verification

**Step 1: Reload the dev server and test everything end-to-end**

Walk through every section:
1. Camera preset dropdown — all 6 presets
2. Transition slider
3. Tactics rotate CW/CCW
4. Screen shake intensity/duration + trigger
5. Day/Night time slider, speed slider, pause/play toggle, preset dropdown
6. Layer visibility toggles + opacity sliders
7. Sky / Background: clear color sliders, parallax layer controls
8. Screen effect dropdown + trigger button (all 4 effects), color swatches
9. Rendering toggles (post processing, glow, shadows, god rays, lens flares)
10. Post-FX details (expand, tweak a few sliders)
11. Fog mode dropdown + density/color sliders
12. Camera details (FOV, radius, etc.)
13. Glow layer (enabled, intensity, blur kernel)
14. Lights (per-light controls, flicker sliders)
15. Scene info

**Step 2: Verify data tags**

In browser console: `document.querySelectorAll('[data-section]').length` should be 13 (12 original + sky). `document.querySelectorAll('[data-control]').length` should be 60+.

**Step 3: Take screenshot as proof**

**Step 4: Commit**

```
feat(dev): complete dev harness UX overhaul — dropdowns, data tags, sky/parallax
```
