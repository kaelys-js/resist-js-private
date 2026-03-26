# Map Refocus — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Task 1: Add RefocusConfigSchema to camera-config.ts

**File:** `packages/products/webforge/runtime/src/schemas/camera-config.ts`

### 1a. Test — refocus schema validates defaults

**File:** `packages/products/webforge/runtime/src/schemas/camera-config.test.ts`

Add test that `RefocusConfigSchema` accepts default values and rejects out-of-range values:

```typescript
describe('RefocusConfigSchema', () => {
  test('accepts valid defaults', () => {
    const result = safeParse(RefocusConfigSchema, {
      animated: true,
      durationMs: 800,
      easing: 'easeInOutCubic',
      paddingScale: 1.15,
      resetElevation: true,
      resetOrbit: false,
    });
    expect(result.ok).toBeTruthy();
  });

  test('rejects durationMs below minimum', () => {
    const result = safeParse(RefocusConfigSchema, {
      animated: true,
      durationMs: 50,
      easing: 'easeInOutCubic',
      paddingScale: 1.15,
      resetElevation: true,
      resetOrbit: false,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects invalid easing', () => {
    const result = safeParse(RefocusConfigSchema, {
      animated: true,
      durationMs: 800,
      easing: 'bounce',
      paddingScale: 1.15,
      resetElevation: true,
      resetOrbit: false,
    });
    expect(result.ok).toBeFalsy();
  });
});
```

### 1b. Implement — add RefocusConfigSchema

**File:** `packages/products/webforge/runtime/src/schemas/camera-config.ts`

Add after the existing camera config schemas:

```typescript
export const RefocusConfigSchema = v.strictObject({
  animated: v.pipe(v.boolean(), v.description('Smooth transition vs instant snap')),
  durationMs: v.pipe(v.number(), v.minValue(100), v.maxValue(3000), v.description('Animation duration in ms')),
  easing: v.pipe(v.picklist(['linear', 'easeInOutCubic', 'easeOutBack', 'easeInOutQuad']), v.description('Easing curve')),
  paddingScale: v.pipe(v.number(), v.minValue(1.0), v.maxValue(2.0), v.description('Radius multiplier for breathing room')),
  resetElevation: v.pipe(v.boolean(), v.description('Reset camera pitch to preset default')),
  resetOrbit: v.pipe(v.boolean(), v.description('Reset camera orbit angle to preset default')),
});

export type RefocusConfig = v.InferOutput<typeof RefocusConfigSchema>;

export const REFOCUS_DEFAULTS: RefocusConfig = {
  animated: true,
  durationMs: 800,
  easing: 'easeInOutCubic',
  paddingScale: 1.15,
  resetElevation: true,
  resetOrbit: false,
};
```

### QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 2: Add refocusOnTilemap() to camera-controller.ts

**File:** `packages/products/webforge/runtime/src/core/camera-controller.ts`

### 2a. Test — refocus returns ok Result with dispose handle

**File:** `packages/products/webforge/runtime/src/core/camera-controller.test.ts`

```typescript
describe('refocusOnTilemap', () => {
  test('returns ok Result with dispose handle', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    const result = refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 40,
      mapHeight: 30,
      config: REFOCUS_DEFAULTS,
      currentPreset: 'hd2d',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(typeof result.data.dispose).toBe('function');
    result.data.dispose();
  });

  test('instantly sets camera to map center when animated=false', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    const result = refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 40,
      mapHeight: 30,
      config: { ...REFOCUS_DEFAULTS, animated: false },
      currentPreset: 'hd2d',
    });
    expect(result.ok).toBeTruthy();

    expect(arc.target.x).toBeCloseTo(20);
    expect(arc.target.z).toBeCloseTo(15);
  });

  test('computes correct radius from map dimensions and FOV', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 40,
      mapHeight: 30,
      config: { ...REFOCUS_DEFAULTS, animated: false, paddingScale: 1.0 },
      currentPreset: 'hd2d',
    });

    const diagonal = Math.hypot(40, 30);
    const boundRadius = diagonal / 2;
    const expectedRadius = boundRadius / Math.sin(arc.fov / 2);
    expect(arc.radius).toBeCloseTo(expectedRadius, 0);
  });

  test('applies paddingScale to radius', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 32,
      mapHeight: 32,
      config: { ...REFOCUS_DEFAULTS, animated: false, paddingScale: 1.5 },
      currentPreset: 'hd2d',
    });

    const diagonal = Math.hypot(32, 32);
    const boundRadius = diagonal / 2;
    const expectedRadius = (boundRadius / Math.sin(arc.fov / 2)) * 1.5;
    expect(arc.radius).toBeCloseTo(expectedRadius, 0);
  });

  test('resets beta when resetElevation=true', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;
    arc.beta = 1.2; // Move away from default

    refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 32,
      mapHeight: 32,
      config: { ...REFOCUS_DEFAULTS, animated: false, resetElevation: true },
      currentPreset: 'hd2d',
    });

    // hd2d default beta is PI/4
    expect(arc.beta).toBeCloseTo(Math.PI / 4);
  });

  test('does not reset beta when resetElevation=false', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;
    arc.beta = 1.2;

    refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 32,
      mapHeight: 32,
      config: { ...REFOCUS_DEFAULTS, animated: false, resetElevation: false },
      currentPreset: 'hd2d',
    });

    expect(arc.beta).toBeCloseTo(1.2);
  });

  test('dispose cancels animation', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    const result = refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 40,
      mapHeight: 30,
      config: { ...REFOCUS_DEFAULTS, animated: true, durationMs: 5000 },
      currentPreset: 'hd2d',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const alphaBefore = arc.alpha;
    result.data.dispose();
    // Alpha should stay near where it was when disposed
    expect(arc.alpha).toBeCloseTo(alphaBefore, 1);
  });

  test('returns error for non-ArcRotateCamera', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'firstperson' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = refocusOnTilemap({
      scene: instance.scene,
      camera: cameraResult.data,
      mapWidth: 40,
      mapHeight: 30,
      config: REFOCUS_DEFAULTS,
      currentPreset: 'firstperson',
    });
    expect(result.ok).toBeFalsy();
  });

  test('handles zero-size map gracefully', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    const result = refocusOnTilemap({
      scene: instance.scene,
      camera: arc,
      mapWidth: 0,
      mapHeight: 0,
      config: { ...REFOCUS_DEFAULTS, animated: false },
      currentPreset: 'hd2d',
    });
    expect(result.ok).toBeTruthy();
    expect(arc.radius).toBeGreaterThan(0);
  });
});
```

### 2b. Implement — refocusOnTilemap function

**File:** `packages/products/webforge/runtime/src/core/camera-controller.ts`

Add after `resetCamera()`:

```typescript
export type RefocusOptions = {
  readonly scene: BABYLON.Scene;
  readonly camera: BABYLON.Camera;
  readonly mapWidth: Num;
  readonly mapHeight: Num;
  readonly config: RefocusConfig;
  readonly currentPreset: CameraPreset;
};

export function refocusOnTilemap(options: RefocusOptions): BabylonResult<PresetTransitionHandle> {
  const { scene, camera, mapWidth, mapHeight, config, currentPreset } = options;

  try {
    if (!(camera instanceof BABYLON.ArcRotateCamera)) {
      return err(ERRORS.SCENE.RENDER_FAILED, 'Refocus requires ArcRotateCamera (not available in firstperson mode)');
    }

    const arc = camera;
    const defaults = PRESET_DEFAULTS[currentPreset];
    const easeFn = EASING_FUNCTIONS[config.easing] ?? LINEAR_FALLBACK;

    // Compute destination
    const safeWidth = Math.max(1, mapWidth);
    const safeHeight = Math.max(1, mapHeight);
    const targetX = safeWidth / 2;
    const targetZ = safeHeight / 2;
    const diagonal = Math.hypot(safeWidth, safeHeight);
    const boundRadius = diagonal / 2;
    const idealRadius = (boundRadius / Math.sin(arc.fov / 2)) * config.paddingScale;
    const endRadius = Math.min(
      arc.upperRadiusLimit ?? 10000,
      Math.max(arc.lowerRadiusLimit ?? 1, idealRadius),
    );
    const endBeta = config.resetElevation ? defaults.beta : arc.beta;
    const endAlpha = config.resetOrbit ? defaults.alpha : arc.alpha;

    // Instant mode
    if (!config.animated || config.durationMs <= 0) {
      arc.target.x = targetX;
      arc.target.y = 0;
      arc.target.z = targetZ;
      arc.radius = endRadius;
      if (config.resetElevation) arc.beta = endBeta;
      if (config.resetOrbit) arc.alpha = endAlpha;
      return okShallow({ dispose: NOOP_DISPOSE });
    }

    // Animated transition
    const startTarget = arc.target.clone();
    const startRadius = arc.radius;
    const startAlpha = arc.alpha;
    const startBeta = arc.beta;
    const startTime = Date.now();
    let disposed = false;

    // Temporarily unlock limits
    const savedLowerAlpha = arc.lowerAlphaLimit;
    const savedUpperAlpha = arc.upperAlphaLimit;
    const savedLowerBeta = arc.lowerBetaLimit;
    const savedUpperBeta = arc.upperBetaLimit;
    arc.lowerAlphaLimit = null;
    arc.upperAlphaLimit = null;
    arc.lowerBetaLimit = 0;
    arc.upperBetaLimit = Math.PI;

    const restoreLimits = () => {
      arc.lowerAlphaLimit = savedLowerAlpha;
      arc.upperAlphaLimit = savedUpperAlpha;
      arc.lowerBetaLimit = savedLowerBeta;
      arc.upperBetaLimit = savedUpperBeta;
    };

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (disposed) return;

      const elapsed = (Date.now() - startTime);
      const rawProgress = Math.min(1, elapsed / config.durationMs);
      const t = easeFn(rawProgress);

      arc.target.x = startTarget.x + (targetX - startTarget.x) * t;
      arc.target.y = 0;
      arc.target.z = startTarget.z + (targetZ - startTarget.z) * t;
      arc.radius = startRadius + (endRadius - startRadius) * t;

      if (config.resetElevation) {
        arc.beta = startBeta + (endBeta - startBeta) * t;
      }
      if (config.resetOrbit) {
        arc.alpha = startAlpha + (endAlpha - startAlpha) * t;
      }

      if (rawProgress >= 1) {
        restoreLimits();
        disposed = true;
        scene.onBeforeRenderObservable.remove(observer);
      }
    });

    return okShallow({
      dispose: () => {
        if (disposed) return;
        disposed = true;
        restoreLimits();
        scene.onBeforeRenderObservable.remove(observer);
      },
    });
  } catch (error) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}
```

### QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 3: Wire refocus into dev harness (button + keyboard + settings)

**File:** `packages/products/webforge/runtime/dev/dev.ts`

### 3a. Add refocus state variables

Near the existing MAP_MIN/MAP_MAX constants (~line 120), add:

```typescript
// ── Refocus configuration (mutable for dev harness controls) ──
let _refocusAnimated = true;
let _refocusDurationMs = 800;
let _refocusEasing: 'linear' | 'easeInOutCubic' | 'easeOutBack' | 'easeInOutQuad' = 'easeInOutCubic';
let _refocusPaddingScale = 1.15;
let _refocusResetElevation = true;
let _refocusResetOrbit = false;
let _refocusHandle: { dispose: () => void } | null = null;
```

### 3b. Add refocusMap() helper function

```typescript
function refocusMap(cam: BABYLON.Camera, scene: BABYLON.Scene, debug: DevDebugApi): void {
  // Cancel any in-progress refocus
  if (_refocusHandle) {
    _refocusHandle.dispose();
    _refocusHandle = null;
  }

  const mapW = debug.tilemap ? debug.tilemap.mapData.width : MAP_SIZE;
  const mapH = debug.tilemap ? debug.tilemap.mapData.height : MAP_SIZE;

  // For mapeditor preset, use existing ortho zoom system
  if (_currentPreset === 'mapeditor') {
    const arcCam = cam as BABYLON.ArcRotateCamera;
    if (_refocusAnimated && _refocusDurationMs > 0) {
      // Animate ortho zoom + center (simple lerp)
      const startOrtho = _orthoSize;
      const endOrtho = MAP_SIZE / 2; // zoom 1x
      const startX = arcCam.target.x;
      const startZ = arcCam.target.z;
      const endX = (MAP_MIN + MAP_MAX) / 2;
      const endZ = (MAP_MIN + MAP_MAX) / 2;
      const startTime = Date.now();
      const easeFn = ... // lookup from _refocusEasing

      const obs = scene.onBeforeRenderObservable.add(() => {
        const elapsed = Date.now() - startTime;
        const rawT = Math.min(1, elapsed / _refocusDurationMs);
        const t = easeFn(rawT);
        _orthoSize = startOrtho + (endOrtho - startOrtho) * t;
        arcCam.target.x = startX + (endX - startX) * t;
        arcCam.target.z = startZ + (endZ - startZ) * t;
        applyOrthoBounds(arcCam, scene);
        if (rawT >= 1) {
          clampCameraToMap(arcCam, scene);
          updateScrollbars(arcCam, scene);
          scene.onBeforeRenderObservable.remove(obs);
          _refocusHandle = null;
        }
      });
      _refocusHandle = { dispose: () => scene.onBeforeRenderObservable.remove(obs) };
    } else {
      setZoomLevel(1, arcCam, scene);
      arcCam.target.x = (MAP_MIN + MAP_MAX) / 2;
      arcCam.target.z = (MAP_MIN + MAP_MAX) / 2;
      clampCameraToMap(arcCam, scene);
      updateScrollbars(arcCam, scene);
    }
    return;
  }

  // For perspective presets, use refocusOnTilemap
  const result = refocusOnTilemap({
    scene,
    camera: cam,
    mapWidth: mapW,
    mapHeight: mapH,
    config: {
      animated: _refocusAnimated,
      durationMs: _refocusDurationMs,
      easing: _refocusEasing,
      paddingScale: _refocusPaddingScale,
      resetElevation: _refocusResetElevation,
      resetOrbit: _refocusResetOrbit,
    },
    currentPreset: _currentPreset,
  });
  if (result.ok) {
    _refocusHandle = result.data;
  }
}
```

### 3c. Add "Refocus Map" button — ALWAYS visible (not mapeditor-only)

In `buildCameraNavigationUI()`, add a new button section BEFORE the `fallbackDiv` / `controlsDiv` split, so it's always visible regardless of preset:

```typescript
// ── 0. Refocus Button (always visible — works in all presets) ──
const refocusSection = document.createElement('div');
refocusSection.append(createSubHeader('Refocus'));

const refocusBtn = document.createElement('button');
refocusBtn.className = 'btn';
refocusBtn.textContent = 'Refocus Map (F)';
refocusBtn.title = 'Zoom to show the entire tilemap. Shortcut: F or Home key.';
refocusBtn.style.width = '100%';
refocusBtn.addEventListener('click', () => {
  refocusMap(cam, scene, debug);
});
refocusSection.append(refocusBtn);

container.append(refocusSection);
```

### 3d. Add Refocus Settings sub-section (always visible)

```typescript
// ── 0b. Refocus Settings ──
refocusSection.append(createSubHeader('Refocus Settings'));

refocusSection.append(createToggleRow('Animated', _refocusAnimated, (val) => {
  _refocusAnimated = val;
}, 'nav-refocus-animated', 'Smooth animated transition vs instant snap'));

refocusSection.append(createSliderRow('Duration', 100, 3000, 50, _refocusDurationMs, (val) => {
  _refocusDurationMs = val;
}, 'nav-refocus-duration', 'Animation duration in milliseconds'));

refocusSection.append(createSelectRow('Easing', [
  { value: 'linear', label: 'Linear' },
  { value: 'easeInOutCubic', label: 'Ease In/Out Cubic' },
  { value: 'easeOutBack', label: 'Ease Out Back' },
  { value: 'easeInOutQuad', label: 'Ease In/Out Quad' },
], _refocusEasing, (val) => {
  _refocusEasing = val;
}, 'nav-refocus-easing', 'Easing curve for the transition'));

refocusSection.append(createSliderRow('Padding', 1.0, 2.0, 0.05, _refocusPaddingScale, (val) => {
  _refocusPaddingScale = val;
}, 'nav-refocus-padding', 'Radius multiplier for breathing room around map edges'));

refocusSection.append(createToggleRow('Reset Elevation', _refocusResetElevation, (val) => {
  _refocusResetElevation = val;
}, 'nav-refocus-reset-elev', 'Also reset camera pitch to preset default'));

refocusSection.append(createToggleRow('Reset Orbit', _refocusResetOrbit, (val) => {
  _refocusResetOrbit = val;
}, 'nav-refocus-reset-orbit', 'Also reset camera orbit angle to preset default'));
```

### 3e. Add keyboard shortcuts (F and Home keys)

In the existing `document.addEventListener('keydown', ...)` handler at ~line 12602, add:

```typescript
// F or Home refocuses on entire tilemap
if (e.key === 'f' || e.key === 'F' || e.key === 'Home') {
  if (_currentPreset !== 'firstperson') {
    e.preventDefault();
    refocusMap(cam, scene, debug);
  }
}
```

### 3f. Cancel refocus on user scroll/pan

In the existing wheel handler for map editor controls, add early cancellation:

```typescript
// At the start of wheel handler:
if (_refocusHandle) {
  _refocusHandle.dispose();
  _refocusHandle = null;
}
```

### QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 4: Update documentation

### 4a. Update docs/runtime/camera.md

Add a "Refocus / Fit Map" section documenting:
- `RefocusConfigSchema` properties table
- `refocusOnTilemap()` API
- Keyboard shortcuts (F, Home)
- Dev harness controls

### 4b. Update docs/runtime/README.md

Add refocus to the camera system API table.

### QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | RefocusConfigSchema + defaults | camera-config.ts, camera-config.test.ts |
| 2 | refocusOnTilemap() function | camera-controller.ts, camera-controller.test.ts |
| 3 | Dev harness: button, keyboard, settings | dev.ts |
| 4 | Documentation | docs/runtime/camera.md, docs/runtime/README.md |
