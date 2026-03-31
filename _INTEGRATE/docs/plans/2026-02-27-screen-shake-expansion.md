# Screen Shake Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the basic `Math.random()` screen shake with a professional trauma-based system featuring Perlin noise, 3 shake channels (translation, rotation, FOV), ASD envelope, 3 decay modes, directional shake, freeze frame, 18 presets, and full dev harness UI.

**Architecture:** New `screen-shake.ts` module owns all shake logic. Old `screenShake()` in `camera-controller.ts` is replaced. Perlin noise lives in its own `perlin.ts` module. Valibot schemas in `screen-shake-schema.ts`. Dev harness rebuilt programmatically (replaces HTML section).

**Tech Stack:** Babylon.js (camera manipulation, scene observers), Valibot (schemas), Vitest (TDD)

**Design doc:** `docs/plans/2026-02-27-screen-shake-expansion-design.md`

---

## Task 1: Perlin Noise Module

**Files:**
- Create: `packages/products/webforge/runtime/src/core/perlin.ts`
- Create: `packages/products/webforge/runtime/src/core/perlin.test.ts`

### Step 1: Write failing tests

Create `packages/products/webforge/runtime/src/core/perlin.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { perlin2d } from './perlin';

describe('perlin2d', () => {
	test('returns a number in range [-1, 1]', () => {
		for (let i = 0; i < 1000; i++) {
			const val = perlin2d(Math.random() * 100, Math.random() * 100);
			expect(val).toBeGreaterThanOrEqual(-1);
			expect(val).toBeLessThanOrEqual(1);
		}
	});

	test('is deterministic — same input returns same output', () => {
		const a = perlin2d(3.14, 2.71);
		const b = perlin2d(3.14, 2.71);
		expect(a).toBe(b);
	});

	test('varies with input — different inputs return different outputs', () => {
		const a = perlin2d(0, 0);
		const b = perlin2d(1.5, 2.5);
		expect(a).not.toBe(b);
	});

	test('is smooth — nearby inputs produce nearby outputs', () => {
		const a = perlin2d(5.0, 5.0);
		const b = perlin2d(5.001, 5.001);
		expect(Math.abs(a - b)).toBeLessThan(0.01);
	});

	test('varies across a range — not constant', () => {
		const values = new Set<number>();
		for (let x = 0; x < 10; x++) {
			values.add(Math.round(perlin2d(x * 0.7, 0) * 1000));
		}
		expect(values.size).toBeGreaterThan(3);
	});
});
```

### Step 2: Run tests to verify they fail

Run: `cd packages/products/webforge/runtime && pnpm vitest run src/core/perlin.test.ts`
Expected: FAIL — `perlin2d` not found.

### Step 3: Write minimal implementation

Create `packages/products/webforge/runtime/src/core/perlin.ts`:

```typescript
/**
 * Lightweight 2D Perlin noise implementation.
 *
 * Deterministic — same (x, y) always produces the same output.
 * Returns values in the range [-1, 1].
 *
 * Based on the improved Perlin noise algorithm (Ken Perlin, 2002).
 *
 * @example
 * ```typescript
 * const value = perlin2d(3.14, 2.71); // deterministic float in [-1, 1]
 * ```
 *
 * @module
 */

/* eslint-disable max-lines-per-function */

/** Permutation table (doubled for wrapping). */
const PERM: readonly number[] = (() => {
	const p: number[] = [
		151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30,
		69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94,
		252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
		168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60,
		211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1,
		216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
		164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118,
		126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170,
		213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39,
		253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
		242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49,
		192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
		138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
	];
	return [...p, ...p];
})();

/**
 * Fade function — 6t^5 - 15t^4 + 10t^3 (Perlin improved).
 */
function fade(t: number): number {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation.
 */
function lerp(a: number, b: number, t: number): number {
	return a + t * (b - a);
}

/**
 * Gradient function — dot product of gradient vector and distance vector.
 */
function grad(hash: number, x: number, y: number): number {
	const h: number = hash & 3;
	const u: number = h < 2 ? x : y;
	const v: number = h < 2 ? y : x;
	return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * Computes 2D Perlin noise at the given coordinates.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @returns Noise value in the range [-1, 1].
 */
export function perlin2d(x: number, y: number): number {
	// Find unit grid cell
	const xi: number = Math.floor(x) & 255;
	const yi: number = Math.floor(y) & 255;

	// Relative position within cell
	const xf: number = x - Math.floor(x);
	const yf: number = y - Math.floor(y);

	// Fade curves
	const u: number = fade(xf);
	const v: number = fade(yf);

	// Hash corners
	const aa: number = PERM[PERM[xi]! + yi]!;
	const ab: number = PERM[PERM[xi]! + yi + 1]!;
	const ba: number = PERM[PERM[xi + 1]! + yi]!;
	const bb: number = PERM[PERM[xi + 1]! + yi + 1]!;

	// Blend
	return lerp(
		lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
		lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
		v,
	);
}

/* eslint-enable max-lines-per-function */
```

### Step 4: Run tests to verify they pass

Run: `cd packages/products/webforge/runtime && pnpm vitest run src/core/perlin.test.ts`
Expected: ALL PASS (5 tests).

### Step 5: Run QA

Run: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`
Expected: Clean.

### Step 6: Commit

```bash
git add packages/products/webforge/runtime/src/core/perlin.ts packages/products/webforge/runtime/src/core/perlin.test.ts
git commit -m "feat(shake): add deterministic 2D Perlin noise module"
```

---

## Task 2: Screen Shake Schema

**Files:**
- Create: `packages/products/webforge/runtime/src/schemas/screen-shake-config.ts`
- Create: `packages/products/webforge/runtime/src/schemas/screen-shake-config.test.ts`

### Step 1: Write failing tests

Create `packages/products/webforge/runtime/src/schemas/screen-shake-config.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import {
	DecayModeSchema,
	ShakeChannelSchema,
	ShakeEnvelopeSchema,
	ShakeNoiseSchema,
	ShakeDirectionSchema,
	ScreenShakeConfigSchema,
	ShakePresetCategorySchema,
	ShakePresetSchema,
	SHAKE_PRESETS,
	type ScreenShakeConfig,
} from './screen-shake-config';

describe('DecayModeSchema', () => {
	test('accepts valid decay modes', () => {
		for (const mode of ['linear', 'exponential', 'easeOut']) {
			const result = safeParse(DecayModeSchema, mode);
			expect(result.ok).toBeTruthy();
		}
	});

	test('rejects invalid decay mode', () => {
		const result = safeParse(DecayModeSchema, 'bounce');
		expect(result.ok).toBeFalsy();
	});
});

describe('ShakeChannelSchema', () => {
	test('accepts valid channel config', () => {
		const result = safeParse(ShakeChannelSchema, {
			enabled: true,
			amplitude: 0.5,
			frequency: 25,
		});
		expect(result.ok).toBeTruthy();
	});

	test('provides defaults when fields omitted', () => {
		const result = safeParse(ShakeChannelSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.enabled).toBe(true);
	});
});

describe('ShakeEnvelopeSchema', () => {
	test('accepts valid envelope', () => {
		const result = safeParse(ShakeEnvelopeSchema, {
			attackMs: 50,
			sustainMs: 100,
			decayMs: 300,
		});
		expect(result.ok).toBeTruthy();
	});

	test('provides defaults when fields omitted', () => {
		const result = safeParse(ShakeEnvelopeSchema, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.attackMs).toBe(0);
		expect(result.data.sustainMs).toBe(0);
		expect(result.data.decayMs).toBe(300);
	});
});

describe('ScreenShakeConfigSchema', () => {
	test('accepts minimal config with defaults', () => {
		const result = safeParse(ScreenShakeConfigSchema, {
			intensity: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.intensity).toBe(0.5);
		expect(result.data.traumaPower).toBe(2);
		expect(result.data.decayMode).toBe('exponential');
		expect(result.data.freezeMs).toBe(0);
	});

	test('accepts full config', () => {
		const result = safeParse(ScreenShakeConfigSchema, {
			intensity: 1.0,
			traumaPower: 3,
			decayRate: 2.0,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.8, frequency: 30 },
			rotation: { enabled: true, amplitude: 0.05, frequency: 20 },
			fov: { enabled: false, amplitude: 0, frequency: 15 },
			envelope: { attackMs: 50, sustainMs: 100, decayMs: 500 },
			noise: { seed: 42, octaves: 3 },
			direction: { x: 1, z: 0 },
			freezeMs: 100,
		});
		expect(result.ok).toBeTruthy();
	});

	test('rejects intensity above 3', () => {
		const result = safeParse(ScreenShakeConfigSchema, { intensity: 5 });
		expect(result.ok).toBeFalsy();
	});

	test('rejects negative intensity', () => {
		const result = safeParse(ScreenShakeConfigSchema, { intensity: -1 });
		expect(result.ok).toBeFalsy();
	});
});

describe('ShakePresetSchema', () => {
	test('accepts valid preset', () => {
		const result = safeParse(ShakePresetSchema, {
			name: 'Heavy Hit',
			category: 'combat',
			config: { intensity: 0.6 },
		});
		expect(result.ok).toBeTruthy();
	});
});

describe('SHAKE_PRESETS', () => {
	test('has 18 presets', () => {
		expect(SHAKE_PRESETS).toHaveLength(18);
	});

	test('all presets validate against ShakePresetSchema', () => {
		for (const preset of SHAKE_PRESETS) {
			const result = safeParse(ShakePresetSchema, preset);
			expect(result.ok, `Preset "${preset.name}" should validate`).toBeTruthy();
		}
	});

	test('covers all 4 categories', () => {
		const categories = new Set(SHAKE_PRESETS.map((p) => p.category));
		expect(categories.has('combat')).toBeTruthy();
		expect(categories.has('environment')).toBeTruthy();
		expect(categories.has('ui')).toBeTruthy();
		expect(categories.has('cinematic')).toBeTruthy();
	});

	test('combat category has 6 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'combat')).toHaveLength(6);
	});

	test('environment category has 5 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'environment')).toHaveLength(5);
	});

	test('ui category has 3 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'ui')).toHaveLength(3);
	});

	test('cinematic category has 4 presets', () => {
		expect(SHAKE_PRESETS.filter((p) => p.category === 'cinematic')).toHaveLength(4);
	});
});
```

### Step 2: Run tests to verify they fail

Run: `cd packages/products/webforge/runtime && pnpm vitest run src/schemas/screen-shake-config.test.ts`
Expected: FAIL — imports not found.

### Step 3: Write the schema implementation

Create `packages/products/webforge/runtime/src/schemas/screen-shake-config.ts`. This file must define:

- `DecayModeSchema` — `v.picklist(['linear', 'exponential', 'easeOut'])`
- `ShakeChannelSchema` — `v.strictObject({ enabled: v.optional(v.boolean(), true), amplitude: v.optional(v.pipe(v.number(), v.minValue(0)), ...), frequency: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), ...) })`
- `ShakeEnvelopeSchema` — `v.strictObject({ attackMs: v.optional(..., 0), sustainMs: v.optional(..., 0), decayMs: v.optional(..., 300) })`
- `ShakeNoiseSchema` — `v.strictObject({ seed: v.optional(..., 0), octaves: v.optional(..., 2) })`
- `ShakeDirectionSchema` — `v.strictObject({ x: v.number(), z: v.number() })`
- `ScreenShakeConfigSchema` — full config with all optional fields and sensible defaults:
  - `intensity` required (0–3)
  - `traumaPower` optional (1–4, default 2)
  - `decayRate` optional (0.1–5.0, default 0.8)
  - `decayMode` optional (default `'exponential'`)
  - `translation` optional (default enabled, amplitude 0.5, frequency 25)
  - `rotation` optional (default enabled, amplitude 0.05, frequency 20)
  - `fov` optional (default enabled, amplitude 0.03, frequency 15)
  - `envelope` optional (default attackMs 0, sustainMs 0, decayMs 300)
  - `noise` optional (default seed 0, octaves 2)
  - `direction` optional (default null via `v.nullable`)
  - `freezeMs` optional (0–300, default 0)
- `ShakePresetCategorySchema` — `v.picklist(['combat', 'environment', 'ui', 'cinematic'])`
- `ShakePresetSchema` — `v.strictObject({ name: v.string(), category: ShakePresetCategorySchema, config: ScreenShakeConfigSchema })`
- `SHAKE_PRESETS` — array of 18 presets (see design doc for exact values)
- All inferred types exported via `v.InferOutput`

Follow the exact patterns from `camera-config.ts`: use `v.strictObject()`, `v.optional(schema, default)`, `v.pipe()` with min/max validators, and JSDoc on every export.

### Step 4: Run tests to verify they pass

Run: `cd packages/products/webforge/runtime && pnpm vitest run src/schemas/screen-shake-config.test.ts`
Expected: ALL PASS.

### Step 5: Run QA

Run: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

### Step 6: Commit

```bash
git add packages/products/webforge/runtime/src/schemas/screen-shake-config.ts packages/products/webforge/runtime/src/schemas/screen-shake-config.test.ts
git commit -m "feat(shake): add Valibot schemas for screen shake config and 18 presets"
```

---

## Task 3: Core Screen Shake Module — Trauma System & Channels

**Files:**
- Create: `packages/products/webforge/runtime/src/core/screen-shake.ts`
- Create: `packages/products/webforge/runtime/src/core/screen-shake.test.ts`

### Step 1: Write failing tests for the trauma system

Create `packages/products/webforge/runtime/src/core/screen-shake.test.ts` with these test groups:

**Group 1 — Trauma system:**
```typescript
describe('trauma system', () => {
	test('getTrauma returns 0 initially');
	test('addTrauma increases current trauma');
	test('addTrauma clamps at 1.0');
	test('multiple addTrauma calls accumulate');
	test('resetTrauma sets trauma to 0');
});
```

**Group 2 — screenShake function:**
```typescript
describe('screenShake', () => {
	test('returns ok BabylonResult with ShakeHandle');
	test('returned handle has dispose function');
	test('dispose does not throw when called multiple times');
	test('accepts minimal config (intensity only + scene/camera)');
	test('accepts full config with all options');
	test('rejects invalid config via schema validation');
});
```

**Group 3 — Envelope:**
```typescript
describe('envelope', () => {
	test('computeEnvelopeMultiplier returns 0 at t=0 with attack > 0');
	test('computeEnvelopeMultiplier returns 1 during sustain phase');
	test('computeEnvelopeMultiplier returns 0 at end of decay');
	test('computeEnvelopeMultiplier linear decay is 0.5 at midpoint');
	test('computeEnvelopeMultiplier exponential decay drops faster initially');
	test('computeEnvelopeMultiplier easeOut is smoother than linear');
});
```

**Group 4 — Decay modes:**
```typescript
describe('decay modes', () => {
	test('applyDecay linear returns 0.5 at midpoint');
	test('applyDecay exponential returns less than linear at midpoint');
	test('applyDecay easeOut returns more than linear at midpoint');
	test('all decay modes return 1 at t=0');
	test('all decay modes return ~0 at t=1');
});
```

**Group 5 — Channel computation:**
```typescript
describe('channels', () => {
	test('translation channel produces X/Z offsets within amplitude range');
	test('rotation channel produces roll within amplitude range');
	test('fov channel produces offset within amplitude range');
	test('disabled channel produces zero offset');
	test('directional shake biases translation along direction vector');
});
```

**Group 6 — stopAllShakes:**
```typescript
describe('stopAllShakes', () => {
	test('stopAllShakes cancels active shake');
	test('stopAllShakes resets trauma to 0');
});
```

Use the same test setup pattern as `camera-controller.test.ts`: `createTestEngine()` in `beforeEach`, dispose in `afterEach`, create camera with `createCamera(instance.scene, { preset: 'hd2d' })`.

### Step 2: Run tests to verify they fail

Run: `cd packages/products/webforge/runtime && pnpm vitest run src/core/screen-shake.test.ts`
Expected: FAIL — imports not found.

### Step 3: Write the screen-shake module

Create `packages/products/webforge/runtime/src/core/screen-shake.ts`. Key implementation details:

**State management:**
```typescript
let _trauma: Num = 0;
let _activeHandles: ShakeHandle[] = [];
```

**Core functions to implement:**

1. `addTrauma(amount: Num): void` — `_trauma = Math.min(1, _trauma + amount)`
2. `getTrauma(): Num` — returns `_trauma`
3. `resetTrauma(): void` — `_trauma = 0`
4. `stopAllShakes(): void` — disposes all handles, resets trauma
5. `computeEnvelopeMultiplier(elapsed, envelope, decayMode)` — pure function returning 0–1
6. `applyDecay(t, mode)` — pure function: linear `1-t`, exponential `Math.exp(-5*t)`, easeOut `1-t*t`
7. `screenShake(options)` — main function:
   - Validate config via `safeParse(ScreenShakeConfigSchema, ...)`
   - Set trauma from config intensity
   - Optional freeze frame: `await new Promise(r => setTimeout(r, freezeMs))` (or scene observer pause)
   - Register `scene.onBeforeRenderObservable` observer
   - Each frame: compute envelope multiplier, compute `shakeAmount = trauma^traumaPower * envelopeMultiplier`
   - For each enabled channel: sample `perlin2d(seed + channelOffset, elapsed * frequency)` × amplitude × shakeAmount
   - Apply translation offsets to camera target (ArcRotate) or position
   - Apply rotation via camera `upVector` rotation
   - Apply FOV offset
   - Auto-decay trauma: `_trauma -= decayRate * deltaTime`
   - When envelope finishes: restore camera, remove observer
   - Return `okShallow(handle)`

**Important:** Use `okShallow()` from `babylon-result.ts` for the return value. Use `err(ERRORS.SCENE.RENDER_FAILED, ...)` for errors. Import `perlin2d` from `./perlin`.

### Step 4: Run tests to verify they pass

Run: `cd packages/products/webforge/runtime && pnpm vitest run src/core/screen-shake.test.ts`
Expected: ALL PASS (~25-30 tests).

### Step 5: Run QA

Run: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

### Step 6: Commit

```bash
git add packages/products/webforge/runtime/src/core/screen-shake.ts packages/products/webforge/runtime/src/core/screen-shake.test.ts
git commit -m "feat(shake): trauma-based screen shake with Perlin noise, 3 channels, envelope, decay modes"
```

---

## Task 4: Remove Old Shake Code & Update Exports

**Files:**
- Modify: `packages/products/webforge/runtime/src/core/camera-controller.ts` (lines 660-778)
- Modify: `packages/products/webforge/runtime/src/core/camera-controller.test.ts` (lines 457-489)
- Modify: `packages/products/webforge/runtime/src/index.ts`

### Step 1: Remove old screenShake from camera-controller.ts

Delete the entire screen shake section (lines ~660-778): the `ShakeHandle` type, `ScreenShakeOptions` type, and `screenShake` function. These now live in `screen-shake.ts`.

### Step 2: Remove old shake tests from camera-controller.test.ts

Delete the `describe('screenShake', ...)` block (lines ~457-489).

### Step 3: Update index.ts exports

Replace the old shake exports:

```typescript
// OLD:
export { screenShake, type ScreenShakeOptions, type ShakeHandle } from './core/camera-controller';

// NEW:
export {
	screenShake,
	addTrauma,
	getTrauma,
	resetTrauma,
	stopAllShakes,
	type ShakeHandle,
} from './core/screen-shake';
export {
	type ScreenShakeConfig,
	type DecayMode,
	type ShakePreset,
	type ShakePresetCategory,
	SHAKE_PRESETS,
	ScreenShakeConfigSchema,
	ShakePresetSchema,
} from './schemas/screen-shake-config';
```

### Step 4: Run ALL tests

Run: `cd packages/products/webforge/runtime && pnpm vitest run`
Expected: ALL PASS. Old shake tests gone, new ones pass, no regressions.

### Step 5: Run QA

Run: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

### Step 6: Commit

```bash
git add packages/products/webforge/runtime/src/core/camera-controller.ts packages/products/webforge/runtime/src/core/camera-controller.test.ts packages/products/webforge/runtime/src/index.ts
git commit -m "refactor(shake): remove old screenShake from camera-controller, re-export from new module"
```

---

## Task 5: Dev Harness — Replace SHAKE Section HTML & JS

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html` (lines 856-893)
- Modify: `packages/products/webforge/runtime/dev/dev.ts` (lines 23, 1186-1204)

### Step 1: Simplify index.html SHAKE section

Replace the existing shake section HTML (lines 856-893) with just the section skeleton — all controls will be built programmatically in dev.ts:

```html
<!-- 6. Shake -->
<div class="section collapsed" id="section-shake" data-section="shake">
	<div class="section-header" onclick="toggleSection('section-shake')">
		<span>Shake</span>
		<span class="panel-toggle">&#9662;</span>
	</div>
	<div class="section-body" id="shake-body"></div>
</div>
```

### Step 2: Update dev.ts import

Change the import at line 23 from:
```typescript
import { screenShake } from '../src/index';
```
To:
```typescript
import { screenShake, addTrauma, getTrauma, stopAllShakes, SHAKE_PRESETS } from '../src/index';
import type { ScreenShakeConfig, ShakePreset } from '../src/index';
```

### Step 3: Replace shake JS wiring in dev.ts

Remove the old shake wiring (lines 1186-1204). Replace with a `buildShakeUI(scene, camera)` function that:

1. Gets `#shake-body` element
2. Builds state variables for all shake parameters (matching `ScreenShakeConfigSchema` defaults)
3. Creates 8 sub-sections using `createSubHeader()`, `createSliderRow()`, `createToggleRow()`:

**Sub-section 1: Presets**
- Category buttons (Combat, Environment, UI/Feedback, Cinematic) using `.btn-group` pattern
- Preset buttons below that change per selected category
- Clicking a preset fills all slider/toggle values from `SHAKE_PRESETS`

**Sub-section 2: Translation**
- Toggle: Enabled (default: true)
- Slider: Amplitude (0–3, step 0.05, default 0.5)
- Slider: Frequency (1–100, step 1, default 25)

**Sub-section 3: Rotation**
- Toggle: Enabled (default: true)
- Slider: Max Roll (0–0.15, step 0.005, default 0.05)
- Slider: Frequency (1–100, step 1, default 20)

**Sub-section 4: FOV**
- Toggle: Enabled (default: true)
- Slider: Max FOV (0–0.1, step 0.005, default 0.03)
- Slider: Frequency (1–100, step 1, default 15)

**Sub-section 5: Envelope**
- Slider: Attack (0–500, step 10, default 0)
- Slider: Sustain (0–2000, step 50, default 0)
- Slider: Decay (0–3000, step 50, default 300)
- Decay Mode buttons: Linear / Exponential / Ease-out (button group)

**Sub-section 6: Noise**
- Slider: Seed (0–9999, step 1, default 0)
- Slider: Octaves (1–4, step 1, default 2)

**Sub-section 7: Advanced**
- Slider: Trauma Power (1–4, step 0.5, default 2)
- Slider: Auto-Decay (0.1–5.0, step 0.1, default 0.8)
- Slider: Freeze Frame (0–300, step 10, default 0)
- Slider: Direction X (-1 to 1, step 0.1, default 0)
- Slider: Direction Z (-1 to 1, step 0.1, default 0)

**Sub-section 8: Controls**
- "Trigger Shake" button — builds `ScreenShakeConfig` from all current slider values and calls `screenShake({ ...config, scene, camera })`
- "Stop All" button — calls `stopAllShakes()`
- Trauma meter — a div showing `getTrauma()` as a visual bar, updated via `requestAnimationFrame`
- Slider: Global Scale (0–200, step 5, default 100) — multiplies all amplitudes
- Toggle: Enabled (default: true) — master kill switch

### Step 4: Run QA

Run: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

### Step 5: Commit

```bash
git add packages/products/webforge/runtime/dev/index.html packages/products/webforge/runtime/dev/dev.ts
git commit -m "feat(devtools): expanded shake UI with presets, per-channel controls, envelope, trauma meter"
```

---

## Task 6: Update README Documentation

**Files:**
- Modify: `packages/products/webforge/runtime/README.md`

### Step 1: Expand the shake section

In the Camera section API table, update the `screenShake` row and add new functions:

```markdown
| `screenShake(config)` | `BabylonResult<ShakeHandle>` | Trauma-based camera shake with Perlin noise, 3 channels, envelope |
| `addTrauma(amount)` | `void` | Add trauma for additive shake stacking (clamped at 1.0) |
| `getTrauma()` | `Num` | Read current trauma level (0.0–1.0) |
| `stopAllShakes()` | `void` | Cancel all active shakes and reset trauma |
```

Add a dedicated "Screen Shake" subsection documenting:
- Trauma-based architecture (trauma → power curve → Perlin noise → 3 channels)
- Channel descriptions (translation X/Z, rotation roll, FOV)
- Envelope system (attack/sustain/decay with 3 decay modes)
- Directional shake
- Freeze frame
- 18 built-in presets across 4 categories
- Accessibility (global scale + master enable)

### Step 2: Run QA

Run: `pnpm -w run qa:format:check`

### Step 3: Commit

```bash
git add packages/products/webforge/runtime/README.md
git commit -m "docs: expand screen shake documentation in runtime README"
```

---

## Task 7: Visual Verification via Playwright

**No files modified — testing only.**

### Step 1: Reload the dev harness page

### Step 2: Open the SHAKE section and verify all 8 sub-sections render

### Step 3: Test presets
- Click each category tab (Combat, Environment, UI/Feedback, Cinematic)
- Click a preset in each category and verify sliders update
- Trigger shake and verify camera moves

### Step 4: Test per-channel controls
- Disable Rotation → trigger shake → verify no roll
- Disable FOV → trigger shake → verify no zoom
- Disable Translation → trigger shake → verify no position shift
- Enable all → trigger → verify all channels active

### Step 5: Test envelope
- Set Attack to 200ms → trigger → verify gradual onset
- Set Sustain to 1000ms → trigger → verify sustained shake
- Switch decay modes → trigger → verify different decay feels

### Step 6: Test advanced controls
- Set Freeze Frame to 200ms → trigger → verify brief pause before shake
- Set Direction X to 1.0 → trigger → verify horizontal bias
- Adjust Trauma Power → trigger → verify intensity curve changes

### Step 7: Test controls
- Trigger shake → verify trauma meter animates
- Click Stop All during active shake → verify immediate stop
- Set Global Scale to 200% → trigger → verify amplified shake
- Toggle Enabled off → trigger → verify no shake

### Step 8: Run full test suite

Run: `pnpm qa:test`
Expected: ALL PASS.

### Step 9: Final commit if any fixes were needed

---

## Summary

| Task | Tests | Files | Description |
|------|-------|-------|-------------|
| 1 | 5 | 2 new | Perlin noise module |
| 2 | ~15 | 2 new | Valibot schemas + 18 presets |
| 3 | ~30 | 2 new | Core shake engine (trauma, channels, envelope) |
| 4 | 0 (moved) | 3 modified | Remove old code, update exports |
| 5 | 0 | 2 modified | Dev harness UI rebuild |
| 6 | 0 | 1 modified | README documentation |
| 7 | 0 | 0 | Visual verification |

**Total: ~50 new tests, 6 new files, 6 modified files, 7 commits.**
