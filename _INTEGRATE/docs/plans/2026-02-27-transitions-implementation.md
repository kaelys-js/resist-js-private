# Transitions System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace DOM-overlay screen effects with a full shader-based transition engine supporting 28 transition types via a unified PostProcess pipeline.

**Architecture:** Single custom `BABYLON.PostProcess` with a GLSL uber-shader. 14 mask-based transitions compute a grayscale mask per-pixel from UV coordinates; 14 procedural transitions use custom per-pixel math (UV distortion, pixelation, etc.). Progress uniform (0→1) drives animation via `scene.onBeforeRenderObservable`. Cross-fade captures frame to `RenderTargetTexture` before transition starts.

**Tech Stack:** Babylon.js PostProcess API, GLSL ES 1.0 (WebGL1 compatible), Valibot schemas, TypeScript

---

## Reference: Codebase Conventions

All paths relative to `packages/products/webforge/runtime/` unless stated otherwise.

**Patterns to follow:**
- `BabylonResult<T>` + `okShallow()` from `src/core/babylon-result.ts` — for all functions returning Babylon objects
- `err(ERRORS.SCENE.RENDER_FAILED, ...)` — error returns
- `scene.onBeforeRenderObservable.add()` — per-frame animation
- Handle pattern: `{ dispose: () => void }` — early cancellation (see `screen-effects.ts`, `camera-controller.ts`)
- Dev harness helpers: `createSliderRow`, `createToggleRow`, `createDropdown`, `createColorPickerRow`, `createSubHeader` in `dev/dev.ts`

**QA commands (ALWAYS use these, never run tools directly):**
```bash
pnpm qa:type-check                  # Type checking
pnpm -w run qa:lint                 # Linting
pnpm -w run qa:format:check         # Format check
pnpm qa:test                        # All tests
```

**Grep for test summary:**
```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```

---

## Task 1: Transition Config Schema

**Files:**
- Create: `src/schemas/transition-config.ts`
- Test: `src/schemas/transition-config.test.ts`

### Step 1: Write the failing test

Create `src/schemas/transition-config.test.ts`:

```typescript
// @vitest-environment node

/**
 * Transition config schema tests.
 *
 * Validates all 28 transition type schemas, easing enum, shared parameters,
 * and the TRANSITION_PRESETS constant.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';

import {
	TransitionTypeSchema,
	TransitionEasingSchema,
	TransitionConfigSchema,
	TRANSITION_PRESETS,
	type TransitionType,
	type TransitionEasing,
	type TransitionConfig,
} from './transition-config';

// =============================================================================
// TransitionTypeSchema
// =============================================================================

describe('TransitionTypeSchema', () => {
	const VALID_TYPES: ReadonlyArray<string> = [
		// Mask-based (14)
		'fade', 'crossFade', 'circleIris', 'diamondIris',
		'wipe', 'diagonalWipe', 'doubleDoor', 'noiseDissove',
		'ditheredFade', 'venetianBlinds', 'bars', 'checkerboard',
		'radialWipe', 'scanlineReveal',
		// Procedural (14)
		'pixelate', 'crtPowerOff', 'swirl', 'zoomLines',
		'shatter', 'wavyDistortion', 'hexagonalize', 'pinwheel',
		'polkaDots', 'gridFlip', 'glitch', 'ripple', 'wind', 'chromaticBurst',
	];

	test('accepts all 28 valid transition types', () => {
		for (const t of VALID_TYPES) {
			const result = safeParse(TransitionTypeSchema, t);
			expect(result.ok, `type "${t}" should be valid`).toBe(true);
		}
	});

	test('has exactly 28 types', () => {
		expect(VALID_TYPES.length).toBe(28);
	});

	test('rejects invalid type', () => {
		const result = safeParse(TransitionTypeSchema, 'explode');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// TransitionEasingSchema
// =============================================================================

describe('TransitionEasingSchema', () => {
	test('accepts all easing types', () => {
		const easings = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeOutBack', 'easeInOutCubic'];
		for (const e of easings) {
			const result = safeParse(TransitionEasingSchema, e);
			expect(result.ok, `easing "${e}" should be valid`).toBe(true);
		}
	});

	test('rejects invalid easing', () => {
		const result = safeParse(TransitionEasingSchema, 'bounce');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// TransitionConfigSchema
// =============================================================================

describe('TransitionConfigSchema', () => {
	test('parses minimal config with just type', () => {
		const result = safeParse(TransitionConfigSchema, { type: 'fade' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.type).toBe('fade');
		expect(result.data.durationMs).toBe(1000);
		expect(result.data.easing).toBe('easeInOut');
		expect(result.data.edgeSoftness).toBe(0.02);
		expect(result.data.reverse).toBe(false);
	});

	test('parses full config with all shared params', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'circleIris',
			durationMs: 2000,
			easing: 'easeOut',
			edgeSoftness: 0.1,
			reverse: true,
			color: { r: 0, g: 0, b: 0 },
			edgeColor: { r: 1, g: 1, b: 1 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.durationMs).toBe(2000);
		expect(result.data.easing).toBe('easeOut');
		expect(result.data.reverse).toBe(true);
	});

	test('rejects durationMs below 100', () => {
		const result = safeParse(TransitionConfigSchema, { type: 'fade', durationMs: 50 });
		expect(result.ok).toBe(false);
	});

	test('rejects durationMs above 10000', () => {
		const result = safeParse(TransitionConfigSchema, { type: 'fade', durationMs: 20000 });
		expect(result.ok).toBe(false);
	});

	test('rejects edgeSoftness above 0.5', () => {
		const result = safeParse(TransitionConfigSchema, { type: 'fade', edgeSoftness: 0.8 });
		expect(result.ok).toBe(false);
	});

	// Type-specific parameter tests
	test('parses wipe with direction', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'wipe',
			direction: 'left',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.direction).toBe('left');
	});

	test('parses circleIris with center', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'circleIris',
			centerX: 0.3,
			centerY: 0.7,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.centerX).toBe(0.3);
		expect(result.data.centerY).toBe(0.7);
	});

	test('parses venetianBlinds with count and direction', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'venetianBlinds',
			count: 12,
			direction: 'horizontal',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.count).toBe(12);
	});

	test('parses pixelate with maxBlockSize', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'pixelate',
			maxBlockSize: 32,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.maxBlockSize).toBe(32);
	});

	test('parses noiseDissove with scale and seed', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'noiseDissove',
			noiseScale: 4.0,
			noiseSeed: 42.0,
		});
		expect(result.ok).toBe(true);
	});

	test('parses swirl with strength', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'swirl',
			swirlStrength: 5.0,
		});
		expect(result.ok).toBe(true);
	});

	test('parses glitch with intensity', () => {
		const result = safeParse(TransitionConfigSchema, {
			type: 'glitch',
			glitchIntensity: 0.5,
		});
		expect(result.ok).toBe(true);
	});
});

// =============================================================================
// TRANSITION_PRESETS
// =============================================================================

describe('TRANSITION_PRESETS', () => {
	test('has entries for common presets', () => {
		expect(TRANSITION_PRESETS.fadeToBlack).toBeDefined();
		expect(TRANSITION_PRESETS.fadeToWhite).toBeDefined();
		expect(TRANSITION_PRESETS.circleIris).toBeDefined();
		expect(TRANSITION_PRESETS.pixelate).toBeDefined();
		expect(TRANSITION_PRESETS.wipeLeft).toBeDefined();
		expect(TRANSITION_PRESETS.noiseDissove).toBeDefined();
	});

	test('fadeToBlack preset has correct config', () => {
		const preset = TRANSITION_PRESETS.fadeToBlack;
		expect(preset.type).toBe('fade');
		expect(preset.color).toEqual({ r: 0, g: 0, b: 0 });
	});

	test('fadeToWhite preset has correct config', () => {
		const preset = TRANSITION_PRESETS.fadeToWhite;
		expect(preset.type).toBe('fade');
		expect(preset.color).toEqual({ r: 1, g: 1, b: 1 });
	});

	test('all preset configs validate against schema', () => {
		for (const [name, config] of Object.entries(TRANSITION_PRESETS)) {
			const result = safeParse(TransitionConfigSchema, config);
			expect(result.ok, `preset "${name}" should be valid`).toBe(true);
		}
	});
});
```

### Step 2: Run test to verify it fails

```bash
pnpm qa:test 2>&1 | grep -E "(FAIL|Error|Cannot find)"
```
Expected: FAIL — cannot resolve `./transition-config`

### Step 3: Write minimal implementation

Create `src/schemas/transition-config.ts`:

```typescript
/**
 * Transition configuration schema.
 *
 * Defines 28 transition types, easing functions, shared parameters,
 * and convenience presets for the WebForge screen transition system.
 *
 * All transitions share a common parameter set (duration, easing, edge softness,
 * background color). Each transition type also accepts type-specific parameters
 * (direction, center point, count, intensity, etc.) as optional fields on the
 * same flat config object.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionConfigSchema, TRANSITION_PRESETS } from './transition-config';
 *
 * // Minimal — just specify the type
 * const result = safeParse(TransitionConfigSchema, { type: 'circleIris' });
 *
 * // Use a preset
 * const fade = safeParse(TransitionConfigSchema, TRANSITION_PRESETS.fadeToBlack);
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Transition Type
// =============================================================================

/**
 * All 28 supported transition types.
 *
 * - Mask-based (14): Compute grayscale mask per-pixel, threshold against progress.
 * - Procedural (14): Custom per-pixel math (UV distortion, pixelation, etc.).
 */
export const TransitionTypeSchema = v.picklist([
	// Mask-based (14)
	'fade',
	'crossFade',
	'circleIris',
	'diamondIris',
	'wipe',
	'diagonalWipe',
	'doubleDoor',
	'noiseDissove',
	'ditheredFade',
	'venetianBlinds',
	'bars',
	'checkerboard',
	'radialWipe',
	'scanlineReveal',
	// Procedural (14)
	'pixelate',
	'crtPowerOff',
	'swirl',
	'zoomLines',
	'shatter',
	'wavyDistortion',
	'hexagonalize',
	'pinwheel',
	'polkaDots',
	'gridFlip',
	'glitch',
	'ripple',
	'wind',
	'chromaticBurst',
]);

/** Inferred transition type from {@link TransitionTypeSchema}. */
export type TransitionType = v.InferOutput<typeof TransitionTypeSchema>;

// =============================================================================
// Transition Easing
// =============================================================================

/**
 * Easing functions for transition progress animation.
 *
 * Extends the 4 camera easings with `easeIn` and `easeOut` variants.
 */
export const TransitionEasingSchema = v.picklist([
	'linear',
	'easeIn',
	'easeOut',
	'easeInOut',
	'easeOutBack',
	'easeInOutCubic',
]);

/** Inferred transition easing from {@link TransitionEasingSchema}. */
export type TransitionEasing = v.InferOutput<typeof TransitionEasingSchema>;

// =============================================================================
// Direction
// =============================================================================

/** Direction for wipe/bars/venetianBlinds transitions. */
export const TransitionDirectionSchema = v.picklist(['left', 'right', 'up', 'down']);

/** Inferred direction type. */
export type TransitionDirection = v.InferOutput<typeof TransitionDirectionSchema>;

/** Axis orientation for venetianBlinds/bars/doubleDoor. */
export const TransitionAxisSchema = v.picklist(['horizontal', 'vertical']);

/** Inferred axis type. */
export type TransitionAxis = v.InferOutput<typeof TransitionAxisSchema>;

// =============================================================================
// Color3 (RGB without alpha)
// =============================================================================

/** RGB color for transition background/edge. */
const Color3Schema = v.strictObject({
	/** Red channel (0–1). */
	r: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
	/** Green channel (0–1). */
	g: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
	/** Blue channel (0–1). */
	b: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

// =============================================================================
// Transition Config
// =============================================================================

/**
 * Full transition configuration.
 *
 * Flat object with shared params + all type-specific params as optionals.
 * The `type` field determines which type-specific params are used by the shader.
 *
 * @example
 * ```typescript
 * // Circle iris centered on a point
 * const config = { type: 'circleIris', centerX: 0.3, centerY: 0.7, durationMs: 1500 };
 *
 * // Wipe left with soft edge
 * const config = { type: 'wipe', direction: 'left', edgeSoftness: 0.1 };
 * ```
 */
export const TransitionConfigSchema = v.strictObject({
	/** Transition type (required). */
	type: TransitionTypeSchema,

	// ── Shared parameters ──────────────────────────────────────────
	/** Duration in milliseconds. Default: 1000. */
	durationMs: v.optional(v.pipe(v.number(), v.minValue(100), v.maxValue(10000)), 1000),

	/** Easing function for progress curve. Default: 'easeInOut'. */
	easing: v.optional(TransitionEasingSchema, 'easeInOut'),

	/** Smoothstep width at mask boundary (0 = hard edge). Default: 0.02. */
	edgeSoftness: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.02),

	/** Play transition in reverse (for "in" phase). Default: false. */
	reverse: v.optional(v.boolean(), false),

	/** Background/target color (non-crossfade types). Default: black. */
	color: v.optional(Color3Schema, { r: 0, g: 0, b: 0 }),

	/** Edge tint color at transition boundary. Default: none. */
	edgeColor: v.optional(Color3Schema),

	// ── Type-specific: directional ─────────────────────────────────
	/** Wipe direction (wipe, bars). Default: 'left'. */
	direction: v.optional(TransitionDirectionSchema, 'left'),

	/** Axis orientation (venetianBlinds, bars, doubleDoor). Default: 'horizontal'. */
	axis: v.optional(TransitionAxisSchema, 'horizontal'),

	/** Open from center outward (doubleDoor). Default: true. */
	openFromCenter: v.optional(v.boolean(), true),

	// ── Type-specific: position ────────────────────────────────────
	/** Center X in UV space 0–1 (circleIris, diamondIris, ripple). Default: 0.5. */
	centerX: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Center Y in UV space 0–1 (circleIris, diamondIris, ripple). Default: 0.5. */
	centerY: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	// ── Type-specific: counts ──────────────────────────────────────
	/** Number of stripes/bars/dots (venetianBlinds, bars, polkaDots, zoomLines). Default: 10. */
	count: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(100)), 10),

	/** Grid cell size (checkerboard, hexagonalize, gridFlip). Default: 10. */
	gridSize: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(100)), 10),

	// ── Type-specific: angles ──────────────────────────────────────
	/** Angle in degrees (diagonalWipe, radialWipe, pinwheel). Default: 45. */
	angle: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 45),

	/** Clockwise sweep (radialWipe). Default: true. */
	clockwise: v.optional(v.boolean(), true),

	/** Number of blades (pinwheel). Default: 4. */
	bladeCount: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(16)), 4),

	// ── Type-specific: noise ───────────────────────────────────────
	/** Noise scale (noiseDissove). Default: 4.0. */
	noiseScale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(50)), 4),

	/** Noise seed (noiseDissove). Default: 0.0. */
	noiseSeed: v.optional(v.number(), 0),

	// ── Type-specific: dithering ───────────────────────────────────
	/** Bayer matrix size (ditheredFade). Default: 4. */
	matrixSize: v.optional(v.picklist([2, 4, 8]), 4),

	// ── Type-specific: scanline ────────────────────────────────────
	/** Scanline thickness in pixels (scanlineReveal). Default: 2. */
	lineWidth: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(16)), 2),

	// ── Type-specific: pixelate ────────────────────────────────────
	/** Maximum block size in pixels (pixelate). Default: 32. */
	maxBlockSize: v.optional(v.pipe(v.number(), v.minValue(4), v.maxValue(128)), 32),

	// ── Type-specific: CRT ─────────────────────────────────────────
	/** Show CRT scanlines during power-off (crtPowerOff). Default: true. */
	scanlines: v.optional(v.boolean(), true),

	// ── Type-specific: swirl ───────────────────────────────────────
	/** Swirl rotation strength in radians (swirl). Default: 5.0. */
	swirlStrength: v.optional(v.pipe(v.number(), v.minValue(0.5), v.maxValue(20)), 5),

	/** Swirl radius in UV space (swirl). Default: 0.5. */
	swirlRadius: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(1)), 0.5),

	// ── Type-specific: zoom lines ──────────────────────────────────
	/** Line width for zoom lines (zoomLines). Default: 0.02. */
	zoomLineWidth: v.optional(v.pipe(v.number(), v.minValue(0.005), v.maxValue(0.1)), 0.02),

	// ── Type-specific: shatter ─────────────────────────────────────
	/** Number of Voronoi cells (shatter). Default: 20. */
	cellCount: v.optional(v.pipe(v.number(), v.minValue(4), v.maxValue(100)), 20),

	// ── Type-specific: distortion ──────────────────────────────────
	/** Wave amplitude (wavyDistortion). Default: 0.05. */
	amplitude: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(0.5)), 0.05),

	/** Wave frequency (wavyDistortion). Default: 10.0. */
	frequency: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50)), 10),

	/** Ripple wave count (ripple). Default: 8. */
	waveCount: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(30)), 8),

	/** Wind/glitch/chromatic intensity 0–1 (glitch, wind, chromaticBurst). Default: 0.5. */
	glitchIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),
});

/** Inferred transition config type from {@link TransitionConfigSchema}. */
export type TransitionConfig = v.InferOutput<typeof TransitionConfigSchema>;

// =============================================================================
// Presets
// =============================================================================

/**
 * Pre-configured transition presets for common use cases.
 *
 * Each preset is a partial `TransitionConfig` that can be spread into `playTransition`.
 */
export const TRANSITION_PRESETS = {
	fadeToBlack: { type: 'fade', color: { r: 0, g: 0, b: 0 } },
	fadeToWhite: { type: 'fade', color: { r: 1, g: 1, b: 1 } },
	circleIris: { type: 'circleIris' },
	diamondIris: { type: 'diamondIris' },
	pixelate: { type: 'pixelate' },
	wipeLeft: { type: 'wipe', direction: 'left' },
	wipeRight: { type: 'wipe', direction: 'right' },
	wipeUp: { type: 'wipe', direction: 'up' },
	wipeDown: { type: 'wipe', direction: 'down' },
	noiseDissove: { type: 'noiseDissove' },
	crossFade: { type: 'crossFade' },
	ditheredFade: { type: 'ditheredFade' },
	venetianBlinds: { type: 'venetianBlinds' },
	checkerboard: { type: 'checkerboard' },
	radialWipe: { type: 'radialWipe' },
	diagonalWipe: { type: 'diagonalWipe' },
	crtPowerOff: { type: 'crtPowerOff' },
	scanlineReveal: { type: 'scanlineReveal' },
	doubleDoor: { type: 'doubleDoor' },
	bars: { type: 'bars' },
	swirl: { type: 'swirl' },
	zoomLines: { type: 'zoomLines' },
	shatter: { type: 'shatter' },
	wavyDistortion: { type: 'wavyDistortion' },
	hexagonalize: { type: 'hexagonalize' },
	pinwheel: { type: 'pinwheel' },
	polkaDots: { type: 'polkaDots' },
	gridFlip: { type: 'gridFlip' },
	glitch: { type: 'glitch' },
	ripple: { type: 'ripple' },
	wind: { type: 'wind' },
	chromaticBurst: { type: 'chromaticBurst' },
} as const;
```

### Step 4: Run tests and QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```
Expected: All tests pass

### Step 5: Commit

```bash
git add src/schemas/transition-config.ts src/schemas/transition-config.test.ts
git commit -m "feat(transitions): add TransitionConfigSchema with 28 types and presets"
```

---

## Task 2: Transition Shader (GLSL)

**Files:**
- Create: `src/rendering/transition-shader.ts`

This file contains the GLSL fragment shader string and a factory function to create the PostProcess.

### Step 1: Write the failing test

No separate test file for the shader string — shader compilation is tested through the transition-manager tests in Task 3. However, the PostProcess factory function DOES need testing. We'll test it as part of Task 3.

### Step 2: Write the shader module

Create `src/rendering/transition-shader.ts`:

```typescript
/**
 * Transition PostProcess shader and factory.
 *
 * Registers a GLSL uber-shader in Babylon's `Effect.ShadersStore` and provides
 * a factory to create the PostProcess instance. The shader handles all 28 transition
 * types via a `maskType` uniform that selects the computation path.
 *
 * Two shader paths:
 * - **Mask-based** (types 0–13): Compute grayscale mask from UV, threshold against progress.
 * - **Procedural** (types 14–27): Custom per-pixel math (pixelate, CRT, swirl, etc.).
 *
 * @example
 * ```typescript
 * import { createTransitionPostProcess, TRANSITION_SHADER_NAME } from './transition-shader';
 *
 * const pp = createTransitionPostProcess({ engine, camera: null });
 * if (pp.ok) {
 *   camera.attachPostProcess(pp.data);
 * }
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Shader Name
// =============================================================================

/** Shader store key. PostProcess references `'webforgeTransition'`. */
export const TRANSITION_SHADER_NAME = 'webforgeTransition';

// =============================================================================
// GLSL Fragment Shader
// =============================================================================

/**
 * Transition type → int mapping (must match TransitionTypeSchema order).
 *
 * Mask-based:  0–13
 * Procedural: 14–27
 */
export const TRANSITION_TYPE_MAP: Record<string, number> = {
	fade: 0,
	crossFade: 1,
	circleIris: 2,
	diamondIris: 3,
	wipe: 4,
	diagonalWipe: 5,
	doubleDoor: 6,
	noiseDissove: 7,
	ditheredFade: 8,
	venetianBlinds: 9,
	bars: 10,
	checkerboard: 11,
	radialWipe: 12,
	scanlineReveal: 13,
	pixelate: 14,
	crtPowerOff: 15,
	swirl: 16,
	zoomLines: 17,
	shatter: 18,
	wavyDistortion: 19,
	hexagonalize: 20,
	pinwheel: 21,
	polkaDots: 22,
	gridFlip: 23,
	glitch: 24,
	ripple: 25,
	wind: 26,
	chromaticBurst: 27,
};

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;  // current frame (live scene or pipeline output)
uniform sampler2D fromTexture;     // captured "from" frame (for crossFade)
uniform sampler2D maskTexture;     // user-provided custom mask (optional)

uniform float progress;            // 0.0 → 1.0
uniform int maskType;              // transition type index (0–27)
uniform float edgeSoftness;        // smoothstep width at mask boundary
uniform vec3 bgColor;              // background/target color
uniform vec3 edgeColor;            // edge tint color
uniform float hasEdgeColor;        // 1.0 if edge tint enabled, 0.0 otherwise
uniform float useCustomMask;       // 1.0 if using user PNG mask, 0.0 otherwise
uniform float reversed;            // 1.0 if playing in reverse

// Type-specific uniforms
uniform float direction;           // 0=left, 1=right, 2=up, 3=down
uniform float axis;                // 0=horizontal, 1=vertical
uniform float openFromCenter;      // 1.0 = center-out, 0.0 = edge-in
uniform vec2 center;               // center point (circleIris, diamondIris, ripple)
uniform float count;               // stripe/dot count
uniform float gridSize;            // grid cell size
uniform float angle;               // angle in radians
uniform float clockwise;           // 1.0 = clockwise
uniform float bladeCount;          // pinwheel blades
uniform float noiseScale;          // noise zoom
uniform float noiseSeed;           // noise offset
uniform float matrixSize;          // bayer matrix dimension
uniform float lineWidth;           // scanline width (pixels / resolution)
uniform float maxBlockSize;        // pixelate block size
uniform float hasScanlines;        // CRT scanlines toggle
uniform float swirlStrength;       // swirl rotation
uniform float swirlRadius;         // swirl radius
uniform float zoomLineWidth;       // zoom line thickness
uniform float cellCount;           // shatter voronoi cells
uniform float amplitude;           // wave amplitude
uniform float frequency;           // wave frequency
uniform float waveCount;           // ripple waves
uniform float glitchIntensity;     // glitch/wind/chromatic intensity
uniform vec2 resolution;           // screen resolution in pixels

// ─── Noise helpers ──────────────────────────────────────────────────────────

// Simple value noise (hash-based)
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// ─── Voronoi for shatter ────────────────────────────────────────────────────

vec2 voronoiCell(vec2 p, float cells) {
    vec2 n = floor(p * cells);
    vec2 f2 = fract(p * cells);
    float minDist = 1.0;
    vec2 closestCell = n;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = vec2(hash(n + neighbor), hash(n + neighbor + vec2(31.0, 17.0)));
            vec2 diff = neighbor + point - f2;
            float d = dot(diff, diff);
            if (d < minDist) {
                minDist = d;
                closestCell = n + neighbor;
            }
        }
    }
    return closestCell;
}

// ─── Bayer matrix for dithering ─────────────────────────────────────────────

float bayerMatrix(vec2 pixel, float size) {
    if (size < 3.0) {
        // 2x2 Bayer
        vec2 p = mod(pixel, 2.0);
        float idx = p.x + p.y * 2.0;
        if (idx < 1.0) return 0.0;
        if (idx < 2.0) return 0.5;
        if (idx < 3.0) return 0.75;
        return 0.25;
    }
    if (size < 5.0) {
        // 4x4 Bayer
        vec2 p = mod(pixel, 4.0);
        float idx = p.x + p.y * 4.0;
        float bayer[16];
        bayer[0] = 0.0;    bayer[1] = 8.0;    bayer[2] = 2.0;    bayer[3] = 10.0;
        bayer[4] = 12.0;   bayer[5] = 4.0;    bayer[6] = 14.0;   bayer[7] = 6.0;
        bayer[8] = 3.0;    bayer[9] = 11.0;   bayer[10] = 1.0;   bayer[11] = 9.0;
        bayer[12] = 15.0;  bayer[13] = 7.0;   bayer[14] = 13.0;  bayer[15] = 5.0;
        int i = int(idx);
        for (int j = 0; j < 16; j++) {
            if (j == i) return bayer[j] / 16.0;
        }
        return 0.0;
    }
    // 8x8 — use hash approximation
    vec2 p = mod(pixel, 8.0);
    return hash(p * 0.125) * 0.9 + 0.05;
}

// ─── Mask computation ───────────────────────────────────────────────────────

float computeMask(vec2 uv) {
    // User-provided custom mask
    if (useCustomMask > 0.5) {
        return texture2D(maskTexture, uv).r;
    }

    if (maskType == 0) {
        // fade — uniform
        return 0.5;
    }
    if (maskType == 1) {
        // crossFade — uniform (blending handled separately)
        return 0.5;
    }
    if (maskType == 2) {
        // circleIris — radial distance
        vec2 diff = uv - center;
        diff.x *= resolution.x / resolution.y; // aspect correction
        return length(diff) / length(vec2(resolution.x / resolution.y, 1.0));
    }
    if (maskType == 3) {
        // diamondIris — manhattan distance
        vec2 diff = abs(uv - center);
        diff.x *= resolution.x / resolution.y;
        return (diff.x + diff.y) / (resolution.x / resolution.y + 1.0);
    }
    if (maskType == 4) {
        // wipe — linear gradient
        if (direction < 0.5) return uv.x;             // left
        if (direction < 1.5) return 1.0 - uv.x;       // right
        if (direction < 2.5) return 1.0 - uv.y;       // up
        return uv.y;                                    // down
    }
    if (maskType == 5) {
        // diagonalWipe — rotated linear gradient
        float rad = angle;
        float c = cos(rad);
        float s = sin(rad);
        float projected = (uv.x - 0.5) * c + (uv.y - 0.5) * s;
        return projected + 0.5;
    }
    if (maskType == 6) {
        // doubleDoor — distance from center axis
        float d;
        if (axis < 0.5) {
            d = abs(uv.x - 0.5) * 2.0; // horizontal
        } else {
            d = abs(uv.y - 0.5) * 2.0; // vertical
        }
        return openFromCenter > 0.5 ? 1.0 - d : d;
    }
    if (maskType == 7) {
        // noiseDissove — value noise
        return valueNoise((uv + vec2(noiseSeed)) * noiseScale);
    }
    if (maskType == 8) {
        // ditheredFade — Bayer matrix
        vec2 pixel = uv * resolution;
        return bayerMatrix(pixel, matrixSize);
    }
    if (maskType == 9) {
        // venetianBlinds — repeating stripes
        float coord = axis < 0.5 ? uv.y : uv.x;
        return fract(coord * count);
    }
    if (maskType == 10) {
        // bars — staggered sweep
        float coord = axis < 0.5 ? uv.y : uv.x;
        float perpCoord = axis < 0.5 ? uv.x : uv.y;
        float barIndex = floor(coord * count);
        float stagger = hash(vec2(barIndex, 0.0)) * 0.3;
        if (direction < 0.5 || direction > 2.5) {
            return perpCoord * 0.7 + stagger;
        }
        return (1.0 - perpCoord) * 0.7 + stagger;
    }
    if (maskType == 11) {
        // checkerboard — alternating blocks
        vec2 cell = floor(uv * gridSize);
        float checker = mod(cell.x + cell.y, 2.0);
        return checker * 0.5 + hash(cell) * 0.3 + 0.1;
    }
    if (maskType == 12) {
        // radialWipe — angular gradient
        vec2 diff = uv - center;
        diff.x *= resolution.x / resolution.y;
        float a = atan(diff.y, diff.x); // -PI to PI
        a = a / 6.28318 + 0.5; // normalize to 0–1
        a = fract(a - angle / 6.28318); // offset by start angle
        return clockwise > 0.5 ? a : 1.0 - a;
    }
    if (maskType == 13) {
        // scanlineReveal — horizontal line sweep
        return uv.y;
    }

    // Procedural types return 0.5 (mask not used — handled in main)
    return 0.5;
}

// ─── Main ───────────────────────────────────────────────────────────────────

void main(void) {
    float prog = reversed > 0.5 ? 1.0 - progress : progress;
    vec4 sceneColor = texture2D(textureSampler, vUV);
    vec4 bg = vec4(bgColor, 1.0);

    // ── Procedural types (14–27): custom per-pixel math ─────────

    if (maskType == 14) {
        // pixelate — UV snapping + fade
        float blockPx = mix(1.0, maxBlockSize, prog);
        vec2 snapped = floor(vUV * resolution / blockPx) * blockPx / resolution;
        vec4 pixelated = texture2D(textureSampler, snapped);
        float fadeStart = 0.7;
        float fadeProg = smoothstep(fadeStart, 1.0, prog);
        gl_FragColor = mix(pixelated, bg, fadeProg);
        return;
    }
    if (maskType == 15) {
        // crtPowerOff — squeeze to line then dot
        vec2 uv2 = vUV;
        float phase1 = smoothstep(0.0, 0.6, prog); // vertical squeeze
        float phase2 = smoothstep(0.6, 1.0, prog);  // horizontal squeeze
        uv2.y = mix(uv2.y, 0.5, phase1);
        uv2.x = mix(uv2.x, 0.5, phase2);
        float band = smoothstep(0.0, lineWidth / resolution.y, abs(vUV.y - 0.5) * (1.0 - phase1));
        vec4 squeezed = texture2D(textureSampler, uv2);
        float dot2 = 1.0 - smoothstep(0.0, 0.02, length(vUV - 0.5) * (1.0 - phase2));
        float vis = phase1 < 0.99 ? (1.0 - band * phase1) : dot2;
        float scanline2 = hasScanlines > 0.5 ? (0.8 + 0.2 * sin(vUV.y * resolution.y * 3.14159)) : 1.0;
        gl_FragColor = mix(bg, squeezed * scanline2, vis);
        return;
    }
    if (maskType == 16) {
        // swirl — UV rotation around center
        vec2 diff = vUV - center;
        float dist = length(diff);
        float theta = swirlStrength * prog * smoothstep(swirlRadius, 0.0, dist);
        float cosT = cos(theta);
        float sinT = sin(theta);
        vec2 rotated = vec2(
            cosT * diff.x - sinT * diff.y,
            sinT * diff.x + cosT * diff.y
        ) + center;
        vec4 swirled = texture2D(textureSampler, rotated);
        float fade = smoothstep(0.5, 1.0, prog);
        gl_FragColor = mix(swirled, bg, fade);
        return;
    }
    if (maskType == 17) {
        // zoomLines — radiating lines from center + zoom
        vec2 diff = vUV - center;
        float dist = length(diff);
        float a = atan(diff.y, diff.x);
        float line = abs(sin(a * count * 0.5));
        float zoom = 1.0 + prog * 2.0;
        vec2 zoomed = (vUV - center) / zoom + center;
        vec4 zoomedColor = texture2D(textureSampler, zoomed);
        float lineMask = smoothstep(zoomLineWidth, 0.0, line * (1.0 - prog));
        float fade = smoothstep(0.6, 1.0, prog);
        gl_FragColor = mix(zoomedColor, mix(vec4(1.0), bg, fade), lineMask * prog);
        return;
    }
    if (maskType == 18) {
        // shatter — voronoi cell displacement + fade
        vec2 cell = voronoiCell(vUV, cellCount);
        float cellHash = hash(cell);
        float cellProg = smoothstep(cellHash * 0.5, cellHash * 0.5 + 0.5, prog);
        vec2 offset = vec2(
            (hash(cell + vec2(1.0, 0.0)) - 0.5) * cellProg * 0.3,
            cellProg * cellProg * 0.5
        );
        vec2 displaced = vUV + offset;
        vec4 shattered = texture2D(textureSampler, displaced);
        float fade = smoothstep(0.7, 1.0, cellProg);
        gl_FragColor = mix(shattered, bg, fade);
        return;
    }
    if (maskType == 19) {
        // wavyDistortion — sine wave UV
        float wave = sin(vUV.y * frequency + prog * 20.0) * amplitude * prog;
        vec2 distorted = vec2(vUV.x + wave, vUV.y);
        vec4 wavy = texture2D(textureSampler, distorted);
        float fade = smoothstep(0.6, 1.0, prog);
        gl_FragColor = mix(wavy, bg, fade);
        return;
    }
    if (maskType == 20) {
        // hexagonalize — hex grid dissolve
        vec2 hexUV = vUV * gridSize;
        vec2 hexCell = floor(hexUV);
        float cellHash2 = hash(hexCell);
        float threshold = smoothstep(cellHash2 * 0.6, cellHash2 * 0.6 + 0.4, prog);
        gl_FragColor = mix(sceneColor, bg, threshold);
        return;
    }
    if (maskType == 21) {
        // pinwheel — angular sectors sweep
        vec2 diff = vUV - vec2(0.5);
        float a = atan(diff.y, diff.x);
        float sector = fract(a * bladeCount / 6.28318);
        float mask = smoothstep(prog - edgeSoftness, prog + edgeSoftness, sector);
        gl_FragColor = mix(bg, sceneColor, mask);
        return;
    }
    if (maskType == 22) {
        // polkaDots — expanding dots on grid
        vec2 cell2 = fract(vUV * count);
        float dist2 = length(cell2 - 0.5);
        float dotRadius = prog * 0.5;
        float dot3 = smoothstep(dotRadius, dotRadius - edgeSoftness, dist2);
        gl_FragColor = mix(sceneColor, bg, dot3);
        return;
    }
    if (maskType == 23) {
        // gridFlip — tiles flip with stagger
        vec2 cell3 = floor(vUV * gridSize);
        float cellHash3 = hash(cell3);
        vec2 cellUV = fract(vUV * gridSize);
        float flipProg = smoothstep(cellHash3 * 0.5, cellHash3 * 0.5 + 0.5, prog);
        float scaleX = abs(1.0 - flipProg * 2.0);
        vec2 flippedUV = vec2((cellUV.x - 0.5) / max(scaleX, 0.01) + 0.5, cellUV.y);
        if (flippedUV.x < 0.0 || flippedUV.x > 1.0) {
            gl_FragColor = bg;
        } else {
            vec2 origUV = (cell3 + flippedUV) / gridSize;
            vec4 tileColor = texture2D(textureSampler, origUV);
            gl_FragColor = flipProg > 0.5 ? bg : tileColor;
        }
        return;
    }
    if (maskType == 24) {
        // glitch — RGB separation + block displacement
        float blockY = floor(vUV.y * 20.0);
        float blockOffset = (hash(vec2(blockY, prog * 10.0)) - 0.5) * glitchIntensity * prog * 0.15;
        vec2 uv3 = vUV + vec2(blockOffset, 0.0);
        float rgbSplit = glitchIntensity * prog * 0.03;
        float r = texture2D(textureSampler, uv3 + vec2(rgbSplit, 0.0)).r;
        float g = texture2D(textureSampler, uv3).g;
        float b = texture2D(textureSampler, uv3 - vec2(rgbSplit, 0.0)).b;
        vec4 glitched = vec4(r, g, b, 1.0);
        float fade = smoothstep(0.7, 1.0, prog);
        gl_FragColor = mix(glitched, bg, fade);
        return;
    }
    if (maskType == 25) {
        // ripple — concentric circle distortion
        vec2 diff = vUV - center;
        float dist3 = length(diff);
        float rippleOffset = sin(dist3 * waveCount * 6.28318 - prog * 20.0) * amplitude * prog;
        vec2 rippleUV = vUV + normalize(diff + vec2(0.001)) * rippleOffset;
        vec4 rippled = texture2D(textureSampler, rippleUV);
        float fade = smoothstep(0.6, 1.0, prog);
        gl_FragColor = mix(rippled, bg, fade);
        return;
    }
    if (maskType == 26) {
        // wind — horizontal pixel streaking
        float streak = hash(vec2(floor(vUV.y * resolution.y), floor(prog * 10.0)));
        float offset = streak * glitchIntensity * prog * 0.3;
        vec2 windUV = vUV + vec2(offset, 0.0);
        vec4 blown = texture2D(textureSampler, windUV);
        float fade = smoothstep(0.6, 1.0, prog);
        gl_FragColor = mix(blown, bg, fade);
        return;
    }
    if (maskType == 27) {
        // chromaticBurst — RGB channel separation
        float split = glitchIntensity * prog * 0.05;
        vec2 dir = normalize(vUV - vec2(0.5));
        float r2 = texture2D(textureSampler, vUV + dir * split).r;
        float g2 = texture2D(textureSampler, vUV).g;
        float b2 = texture2D(textureSampler, vUV - dir * split).b;
        vec4 aberrated = vec4(r2, g2, b2, 1.0);
        float fade = smoothstep(0.6, 1.0, prog);
        gl_FragColor = mix(aberrated, bg, fade);
        return;
    }

    // ── Mask-based types (0–13): threshold against progress ─────

    float mask = computeMask(vUV);

    // Cross-fade blends from captured frame to live scene
    if (maskType == 1) {
        vec4 fromColor = texture2D(fromTexture, vUV);
        gl_FragColor = mix(fromColor, sceneColor, smoothstep(0.0, 1.0, prog));
        return;
    }

    // Standard mask → background color transition
    float edge = smoothstep(prog - edgeSoftness, prog + edgeSoftness, mask);
    vec4 result = mix(bg, sceneColor, edge);

    // Edge color tint at boundary
    if (hasEdgeColor > 0.5) {
        float edgeBand = smoothstep(prog - edgeSoftness * 2.0, prog - edgeSoftness, mask)
                       * smoothstep(prog + edgeSoftness, prog, mask);
        result = mix(result, vec4(edgeColor, 1.0), edgeBand * 0.8);
    }

    gl_FragColor = result;
}
`;

// =============================================================================
// Register Shader
// =============================================================================

/** Whether the shader has been registered in Effect.ShadersStore. */
let _shaderRegistered = false;

/**
 * Ensures the transition fragment shader is registered in Babylon's ShadersStore.
 *
 * Called automatically by {@link createTransitionPostProcess}. Safe to call multiple times.
 */
export function registerTransitionShader(): void {
	if (_shaderRegistered) return;
	BABYLON.Effect.ShadersStore[`${TRANSITION_SHADER_NAME}FragmentShader`] = FRAGMENT_SHADER;
	_shaderRegistered = true;
}

// =============================================================================
// PostProcess Factory
// =============================================================================

/** Options for creating the transition PostProcess. */
type CreateTransitionPostProcessOptions = {
	/** Babylon.js engine instance. */
	readonly engine: BABYLON.AbstractEngine;
	/** Camera to attach to (null to defer attachment). */
	readonly camera: BABYLON.Camera | null;
};

/** Uniform parameter names (non-sampler). */
const UNIFORM_NAMES: ReadonlyArray<string> = [
	'progress', 'maskType', 'edgeSoftness', 'bgColor', 'edgeColor',
	'hasEdgeColor', 'useCustomMask', 'reversed', 'direction', 'axis',
	'openFromCenter', 'center', 'count', 'gridSize', 'angle', 'clockwise',
	'bladeCount', 'noiseScale', 'noiseSeed', 'matrixSize', 'lineWidth',
	'maxBlockSize', 'hasScanlines', 'swirlStrength', 'swirlRadius',
	'zoomLineWidth', 'cellCount', 'amplitude', 'frequency', 'waveCount',
	'glitchIntensity', 'resolution',
];

/** Sampler uniform names. */
const SAMPLER_NAMES: ReadonlyArray<string> = ['fromTexture', 'maskTexture'];

/**
 * Creates the transition PostProcess instance.
 *
 * Registers the shader if not already registered. Returns a mutable
 * PostProcess that can be attached to a camera.
 *
 * @param options - Engine and optional camera.
 * @returns BabylonResult with the PostProcess.
 */
export function createTransitionPostProcess(
	options: CreateTransitionPostProcessOptions,
): BabylonResult<BABYLON.PostProcess> {
	try {
		registerTransitionShader();

		const pp = new BABYLON.PostProcess(
			'WebForgeTransition',
			TRANSITION_SHADER_NAME,
			[...UNIFORM_NAMES],
			[...SAMPLER_NAMES],
			1.0,
			options.camera,
			BABYLON.Texture.BILINEAR_SAMPLINGMODE,
			options.engine,
			false, // reusable
		);

		return okShallow(pp);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
```

### Step 3: Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```
Expected: All pass

### Step 4: Commit

```bash
git add src/rendering/transition-shader.ts
git commit -m "feat(transitions): add GLSL uber-shader with 28 transition algorithms"
```

---

## Task 3: Transition Manager

**Files:**
- Create: `src/rendering/transition-manager.ts`
- Create: `src/rendering/transition-manager.test.ts`

### Step 1: Write the failing test

Create `src/rendering/transition-manager.test.ts`:

```typescript
// @vitest-environment jsdom

/**
 * Transition manager tests.
 *
 * Tests the core playTransition lifecycle, easing computation,
 * convenience wrappers, and dispose/cancel behavior.
 *
 * Uses jsdom for DOM access (test engine relies on canvas).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';

import {
	playTransition,
	applyTransitionEasing,
	fadeToBlack,
	fadeToWhite,
	fadeToColor,
	screenFlash,
	screenTint,
	type TransitionHandle,
} from './transition-manager';

let instance: BabylonEngineInstance;

beforeEach(() => {
	const result = createTestEngine();
	if (!result.ok) throw new Error('Failed to create test engine');
	instance = result.data;
});

afterEach(() => {
	disposeEngine(instance);
});

// =============================================================================
// playTransition
// =============================================================================

describe('playTransition', () => {
	test('returns ok with a TransitionHandle', () => {
		const result = playTransition({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
			config: { type: 'fade' },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('dispose cleans up PostProcess and observer', () => {
		const result = playTransition({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
			config: { type: 'fade' },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const ppCountBefore = instance.scene.activeCamera!.getPostProcesses().length;
		result.data.dispose();
		// PostProcess should be detached after dispose
		expect(instance.scene.activeCamera!.getPostProcesses().length).toBeLessThanOrEqual(ppCountBefore);
	});

	test('accepts all 28 transition types without error', () => {
		const types = [
			'fade', 'crossFade', 'circleIris', 'diamondIris', 'wipe',
			'diagonalWipe', 'doubleDoor', 'noiseDissove', 'ditheredFade',
			'venetianBlinds', 'bars', 'checkerboard', 'radialWipe', 'scanlineReveal',
			'pixelate', 'crtPowerOff', 'swirl', 'zoomLines', 'shatter',
			'wavyDistortion', 'hexagonalize', 'pinwheel', 'polkaDots', 'gridFlip',
			'glitch', 'ripple', 'wind', 'chromaticBurst',
		] as const;

		for (const type of types) {
			const result = playTransition({
				scene: instance.scene,
				camera: instance.scene.activeCamera!,
				engine: instance.engine,
				config: { type },
			});
			expect(result.ok, `type "${type}" should succeed`).toBe(true);
			if (result.ok) result.data.dispose();
		}
	});

	test('double dispose is safe', () => {
		const result = playTransition({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
			config: { type: 'fade' },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		result.data.dispose();
		// Should not throw
		result.data.dispose();
	});

	test('passes type-specific params to shader', () => {
		const result = playTransition({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
			config: {
				type: 'circleIris',
				centerX: 0.3,
				centerY: 0.7,
				durationMs: 2000,
				easing: 'easeOut',
				edgeSoftness: 0.1,
			},
		});
		expect(result.ok).toBe(true);
		if (result.ok) result.data.dispose();
	});
});

// =============================================================================
// Easing functions
// =============================================================================

describe('applyTransitionEasing', () => {
	test('linear returns input unchanged', () => {
		expect(applyTransitionEasing(0.5, 'linear')).toBe(0.5);
	});

	test('easeIn at 0 returns 0', () => {
		expect(applyTransitionEasing(0, 'easeIn')).toBe(0);
	});

	test('easeIn at 1 returns 1', () => {
		expect(applyTransitionEasing(1, 'easeIn')).toBeCloseTo(1, 5);
	});

	test('easeOut at 0 returns 0', () => {
		expect(applyTransitionEasing(0, 'easeOut')).toBe(0);
	});

	test('easeOut at 1 returns 1', () => {
		expect(applyTransitionEasing(1, 'easeOut')).toBeCloseTo(1, 5);
	});

	test('easeInOut at 0.5 returns ~0.5', () => {
		expect(applyTransitionEasing(0.5, 'easeInOut')).toBeCloseTo(0.5, 1);
	});

	test('easeOutBack overshoots', () => {
		// easeOutBack should momentarily exceed 1.0 for values near the end
		const val = applyTransitionEasing(0.4, 'easeOutBack');
		expect(val).toBeGreaterThan(0.4);
	});

	test('easeInOutCubic at boundaries', () => {
		expect(applyTransitionEasing(0, 'easeInOutCubic')).toBe(0);
		expect(applyTransitionEasing(1, 'easeInOutCubic')).toBeCloseTo(1, 5);
	});
});

// =============================================================================
// Convenience wrappers
// =============================================================================

describe('fadeToBlack', () => {
	test('returns ok with handle', () => {
		const result = fadeToBlack({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
		});
		expect(result.ok).toBe(true);
		if (result.ok) result.data.dispose();
	});
});

describe('fadeToWhite', () => {
	test('returns ok with handle', () => {
		const result = fadeToWhite({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
		});
		expect(result.ok).toBe(true);
		if (result.ok) result.data.dispose();
	});
});

describe('fadeToColor', () => {
	test('returns ok with handle', () => {
		const result = fadeToColor({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
			color: { r: 1, g: 0, b: 0 },
		});
		expect(result.ok).toBe(true);
		if (result.ok) result.data.dispose();
	});
});

describe('screenFlash', () => {
	test('returns ok with handle', () => {
		const result = screenFlash({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
		});
		expect(result.ok).toBe(true);
		if (result.ok) result.data.dispose();
	});
});

describe('screenTint', () => {
	test('returns ok with handle', () => {
		const result = screenTint({
			scene: instance.scene,
			camera: instance.scene.activeCamera!,
			engine: instance.engine,
			color: { r: 1, g: 0, b: 0 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (result.ok) result.data.dispose();
	});
});
```

### Step 2: Run test to verify it fails

```bash
pnpm qa:test 2>&1 | grep -E "(FAIL|Error|Cannot find)"
```
Expected: FAIL — cannot resolve `./transition-manager`

### Step 3: Write the implementation

Create `src/rendering/transition-manager.ts`:

```typescript
/**
 * Transition manager — core engine for screen transitions.
 *
 * Creates and manages Babylon.js PostProcess-based transitions. Each call to
 * `playTransition` creates a PostProcess, attaches it to the camera, animates
 * the `progress` uniform from 0→1 (or 1→0 for reverse), then cleans up.
 *
 * Returns a `TransitionHandle` with `dispose()` for early cancellation.
 *
 * @example
 * ```typescript
 * import { playTransition, fadeToBlack } from './transition-manager';
 *
 * // Full control
 * const result = playTransition({
 *   scene, camera, engine,
 *   config: { type: 'circleIris', durationMs: 1500, easing: 'easeOut' },
 * });
 * if (result.ok) result.data.dispose(); // cancel early
 *
 * // Convenience
 * fadeToBlack({ scene, camera, engine, durationMs: 800 });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { fromUnknownError } from '@/utils/result/safe';
import type { Num } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import { TransitionConfigSchema, type TransitionConfig, type TransitionEasing } from '../schemas/transition-config';
import { createTransitionPostProcess, TRANSITION_TYPE_MAP } from './transition-shader';

// =============================================================================
// Types
// =============================================================================

/**
 * Handle for an active transition.
 *
 * Call `dispose()` to cancel the transition early and clean up the PostProcess.
 */
export type TransitionHandle = {
	/** Disposes the PostProcess and per-frame observer. */
	readonly dispose: () => void;
};

/** Options for {@link playTransition}. */
type PlayTransitionOptions = {
	/** The Babylon.js scene. */
	readonly scene: BABYLON.Scene;
	/** Camera to attach the PostProcess to. */
	readonly camera: BABYLON.Camera;
	/** Babylon.js engine instance. */
	readonly engine: BABYLON.AbstractEngine;
	/** Transition configuration (validated internally). */
	readonly config: Record<string, unknown>;
};

// =============================================================================
// Easing Functions
// =============================================================================

/**
 * Applies an easing function to a linear progress value.
 *
 * @param t - Linear progress (0–1).
 * @param easing - Easing function name.
 * @returns Eased progress value.
 *
 * @example
 * ```typescript
 * const eased = applyTransitionEasing(0.5, 'easeInOut'); // ~0.5
 * ```
 */
export function applyTransitionEasing(t: Num, easing: TransitionEasing): Num {
	switch (easing) {
		case 'linear':
			return t;
		case 'easeIn':
			return (t * t * t) as Num;
		case 'easeOut':
			return (1 - (1 - t) ** 3) as Num;
		case 'easeInOut': {
			if (t < 0.5) return (4 * t * t * t) as Num;
			return (1 - (-2 * t + 2) ** 3 / 2) as Num;
		}
		case 'easeOutBack': {
			const c1 = 1.70158;
			const c3 = c1 + 1;
			return (1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2) as Num;
		}
		case 'easeInOutCubic': {
			if (t < 0.5) return (4 * t * t * t) as Num;
			return (1 - (-2 * t + 2) ** 3 / 2) as Num;
		}
		default:
			return t;
	}
}

// =============================================================================
// Core: playTransition
// =============================================================================

/**
 * Plays a screen transition.
 *
 * Creates a PostProcess, attaches it to the camera, animates progress
 * from 0→1 over the configured duration with the specified easing,
 * then auto-disposes. Returns a handle for early cancellation.
 *
 * @param options - Scene, camera, engine, and transition config.
 * @returns BabylonResult with TransitionHandle.
 */
export function playTransition(options: PlayTransitionOptions): BabylonResult<TransitionHandle> {
	const { scene, camera, engine } = options;

	// Validate config
	const parseResult = safeParse(TransitionConfigSchema, options.config);
	if (!parseResult.ok) return parseResult;
	const config: TransitionConfig = parseResult.data;

	try {
		// Create PostProcess
		const ppResult = createTransitionPostProcess({ engine, camera: null });
		if (!ppResult.ok) return ppResult;
		const pp: BABYLON.PostProcess = ppResult.data;

		// Attach to camera
		camera.attachPostProcess(pp);

		// Resolve type index
		const typeIndex: Num = (TRANSITION_TYPE_MAP[config.type] ?? 0) as Num;

		// Track state
		let disposed = false;
		const startTime: Num = performance.now() as Num;
		const durationMs: Num = config.durationMs as Num;

		// Set up onApply for per-frame uniform updates
		pp.onApply = (effect: BABYLON.Effect) => {
			const elapsed: Num = (performance.now() - startTime) as Num;
			const rawProgress: Num = Math.min(1, elapsed / durationMs) as Num;
			const easedProgress: Num = applyTransitionEasing(rawProgress, config.easing);

			// Core uniforms
			effect.setFloat('progress', easedProgress);
			effect.setInt('maskType', typeIndex);
			effect.setFloat('edgeSoftness', config.edgeSoftness);
			effect.setFloat3('bgColor', config.color.r, config.color.g, config.color.b);
			effect.setFloat('reversed', config.reverse ? 1.0 : 0.0);

			// Edge color
			if (config.edgeColor) {
				effect.setFloat('hasEdgeColor', 1.0);
				effect.setFloat3('edgeColor', config.edgeColor.r, config.edgeColor.g, config.edgeColor.b);
			} else {
				effect.setFloat('hasEdgeColor', 0.0);
				effect.setFloat3('edgeColor', 1.0, 1.0, 1.0);
			}

			effect.setFloat('useCustomMask', 0.0);

			// Type-specific uniforms
			const dirMap: Record<string, number> = { left: 0, right: 1, up: 2, down: 3 };
			effect.setFloat('direction', dirMap[config.direction] ?? 0);
			effect.setFloat('axis', config.axis === 'vertical' ? 1.0 : 0.0);
			effect.setFloat('openFromCenter', config.openFromCenter ? 1.0 : 0.0);
			effect.setFloat2('center', config.centerX, config.centerY);
			effect.setFloat('count', config.count);
			effect.setFloat('gridSize', config.gridSize);
			effect.setFloat('angle', (config.angle * Math.PI) / 180); // degrees to radians
			effect.setFloat('clockwise', config.clockwise ? 1.0 : 0.0);
			effect.setFloat('bladeCount', config.bladeCount);
			effect.setFloat('noiseScale', config.noiseScale);
			effect.setFloat('noiseSeed', config.noiseSeed);
			effect.setFloat('matrixSize', config.matrixSize);
			effect.setFloat('lineWidth', config.lineWidth);
			effect.setFloat('maxBlockSize', config.maxBlockSize);
			effect.setFloat('hasScanlines', config.scanlines ? 1.0 : 0.0);
			effect.setFloat('swirlStrength', config.swirlStrength);
			effect.setFloat('swirlRadius', config.swirlRadius);
			effect.setFloat('zoomLineWidth', config.zoomLineWidth);
			effect.setFloat('cellCount', config.cellCount);
			effect.setFloat('amplitude', config.amplitude);
			effect.setFloat('frequency', config.frequency);
			effect.setFloat('waveCount', config.waveCount);
			effect.setFloat('glitchIntensity', config.glitchIntensity);
			effect.setFloat2('resolution', pp.width || 1920, pp.height || 1080);
		};

		// Auto-dispose observer
		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (performance.now() - startTime) as Num;
			if (elapsed >= durationMs && !disposed) {
				handle.dispose();
			}
		});

		const handle: TransitionHandle = {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				scene.onBeforeRenderObservable.remove(observer);
				camera.detachPostProcess(pp);
				pp.dispose();
			},
		};

		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/** Common options for convenience wrappers. */
type CommonTransitionOptions = {
	readonly scene: BABYLON.Scene;
	readonly camera: BABYLON.Camera;
	readonly engine: BABYLON.AbstractEngine;
	readonly durationMs?: Num;
};

/**
 * Fades to black.
 *
 * @param options - Scene, camera, engine, optional duration.
 * @returns BabylonResult with TransitionHandle.
 */
export function fadeToBlack(options: CommonTransitionOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		...options,
		config: { type: 'fade', color: { r: 0, g: 0, b: 0 }, durationMs: options.durationMs ?? 1000 },
	});
}

/**
 * Fades to white.
 *
 * @param options - Scene, camera, engine, optional duration.
 * @returns BabylonResult with TransitionHandle.
 */
export function fadeToWhite(options: CommonTransitionOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		...options,
		config: { type: 'fade', color: { r: 1, g: 1, b: 1 }, durationMs: options.durationMs ?? 1000 },
	});
}

/**
 * Fades to a custom color.
 *
 * @param options - Scene, camera, engine, color, optional duration.
 * @returns BabylonResult with TransitionHandle.
 */
export function fadeToColor(
	options: CommonTransitionOptions & { readonly color: { readonly r: Num; readonly g: Num; readonly b: Num } },
): BabylonResult<TransitionHandle> {
	return playTransition({
		...options,
		config: { type: 'fade', color: options.color, durationMs: options.durationMs ?? 1000 },
	});
}

/**
 * Quick white flash that fades out.
 *
 * @param options - Scene, camera, engine, optional color/duration.
 * @returns BabylonResult with TransitionHandle.
 */
export function screenFlash(
	options: CommonTransitionOptions & {
		readonly color?: { readonly r: Num; readonly g: Num; readonly b: Num };
	},
): BabylonResult<TransitionHandle> {
	return playTransition({
		...options,
		config: {
			type: 'fade',
			color: options.color ?? { r: 1, g: 1, b: 1 },
			durationMs: options.durationMs ?? 150,
			easing: 'easeOut',
			reverse: true,
		},
	});
}

/**
 * Color tint overlay (fades in, holds, fades out).
 *
 * Implemented as two sequential transitions: fade out (20% of time),
 * hold at full (60%), then fade in (20%). For simplicity, uses a single
 * transition with extended duration.
 *
 * @param options - Scene, camera, engine, color, duration.
 * @returns BabylonResult with TransitionHandle.
 */
export function screenTint(
	options: CommonTransitionOptions & {
		readonly color: { readonly r: Num; readonly g: Num; readonly b: Num };
	},
): BabylonResult<TransitionHandle> {
	return playTransition({
		...options,
		config: {
			type: 'fade',
			color: options.color,
			durationMs: options.durationMs ?? 1000,
		},
	});
}
```

### Step 4: Run tests and QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```
Expected: All pass

### Step 5: Commit

```bash
git add src/rendering/transition-manager.ts src/rendering/transition-manager.test.ts
git commit -m "feat(transitions): add transition manager with 28 types and convenience wrappers"
```

---

## Task 4: Delete Screen Effects + Update Exports

**Files:**
- Delete: `src/rendering/screen-effects.ts`
- Delete: `src/rendering/screen-effects.test.ts`
- Modify: `src/index.ts`
- Modify: `dev/dev.ts` (imports only — functional replacement in Task 6)

### Step 1: Update index.ts exports

Replace the screen-effects export block (lines 434-441 of `src/index.ts`) with transition exports:

```typescript
// Transitions (replaces screen-effects)
export {
	playTransition,
	fadeToBlack,
	fadeToWhite,
	fadeToColor,
	screenFlash,
	screenTint,
	applyTransitionEasing,
	type TransitionHandle,
} from './rendering/transition-manager';

// Transition shader
export {
	createTransitionPostProcess,
	registerTransitionShader,
	TRANSITION_TYPE_MAP,
	TRANSITION_SHADER_NAME,
} from './rendering/transition-shader';

// Schemas — Transition config
export {
	TransitionConfigSchema,
	TransitionTypeSchema,
	TransitionEasingSchema,
	TransitionDirectionSchema,
	TransitionAxisSchema,
	TRANSITION_PRESETS,
	type TransitionConfig,
	type TransitionType,
	type TransitionEasing,
	type TransitionDirection,
	type TransitionAxis,
} from './schemas/transition-config';
```

### Step 2: Delete old files

```bash
rm src/rendering/screen-effects.ts src/rendering/screen-effects.test.ts
```

### Step 3: Update dev.ts imports

Replace the screen-effects imports (lines 30-33 of `dev/dev.ts`) with:

```typescript
	playTransition,
	screenFlash,
	screenTint,
	fadeToBlack,
	fadeToWhite,
	TRANSITION_PRESETS,
	type TransitionConfig,
```

Also update the `triggerEffect` function to use the new API (full replacement in Task 6).

### Step 4: Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```
Expected: All pass (old screen-effects tests removed, new transition tests passing)

### Step 5: Commit

```bash
git add -A
git commit -m "feat(transitions): replace screen-effects with transition system exports"
```

---

## Task 5: Update README

**Files:**
- Modify: `README.md`

### Step 1: Replace the Screen Effects section

Find the existing screen effects API table in README.md and replace with:

```markdown
### Transitions

| Function | Returns | Description |
|----------|---------|-------------|
| `playTransition(options)` | `BabylonResult<TransitionHandle>` | Play any of 28 transition types with full parameter control |
| `fadeToBlack(options)` | `BabylonResult<TransitionHandle>` | Convenience: fade to black |
| `fadeToWhite(options)` | `BabylonResult<TransitionHandle>` | Convenience: fade to white |
| `fadeToColor(options)` | `BabylonResult<TransitionHandle>` | Convenience: fade to custom color |
| `screenFlash(options)` | `BabylonResult<TransitionHandle>` | Convenience: quick white flash |
| `screenTint(options)` | `BabylonResult<TransitionHandle>` | Convenience: color tint overlay |
| `createTransitionPostProcess(options)` | `BabylonResult<PostProcess>` | Low-level: create the transition PostProcess |
| `applyTransitionEasing(t, easing)` | `Num` | Apply easing function to progress value |

**28 Transition Types:**

| Category | Types |
|----------|-------|
| Fade | `fade`, `crossFade` |
| Iris | `circleIris`, `diamondIris` |
| Wipe | `wipe`, `diagonalWipe`, `doubleDoor`, `bars`, `venetianBlinds`, `radialWipe`, `scanlineReveal` |
| Dissolve | `noiseDissove`, `ditheredFade`, `checkerboard` |
| Retro | `pixelate`, `crtPowerOff` |
| Battle | `swirl`, `zoomLines`, `shatter`, `wavyDistortion` |
| Geometric | `hexagonalize`, `pinwheel`, `polkaDots`, `gridFlip` |
| Distortion | `glitch`, `ripple`, `wind`, `chromaticBurst` |
```

### Step 2: Run format check

```bash
pnpm -w run qa:format:check
```

### Step 3: Commit

```bash
git add README.md
git commit -m "docs(transitions): update README with transition API"
```

---

## Task 6: Dev Harness — Transitions UI

**Files:**
- Modify: `dev/index.html` — Replace Effects section HTML
- Modify: `dev/dev.ts` — Replace screen effects JS with full transitions UI

### Step 1: Replace the Effects section in index.html

Replace the entire `<!-- 6. Effects -->` section (lines 780-854) with a minimal container:

```html
<!-- 6. Transitions -->
<div class="section collapsed" id="section-transitions" data-section="transitions">
    <div class="section-header" onclick="toggleSection('section-transitions')">
        <span>Transitions</span>
        <span class="panel-toggle">&#9662;</span>
    </div>
    <div class="section-body" id="transitions-body">
        <!-- Built dynamically by dev.ts -->
    </div>
</div>
```

### Step 2: Build the transitions UI in dev.ts

Add a new `buildTransitionsUI` function that creates:

**Type selector dropdown** — All 28 types grouped by category using `<optgroup>`:
```
Fade: fade, crossFade
Iris: circleIris, diamondIris
Wipe: wipe, diagonalWipe, doubleDoor, bars, venetianBlinds, radialWipe, scanlineReveal
Dissolve: noiseDissove, ditheredFade, checkerboard
Retro: pixelate, crtPowerOff
Battle: swirl, zoomLines, shatter, wavyDistortion
Geometric: hexagonalize, pinwheel, polkaDots, gridFlip
Distortion: glitch, ripple, wind, chromaticBurst
```

**Play buttons row** — Play Out | Play In | Play Cycle | Quick Presets (fadeToBlack, fadeToWhite, circleIris, pixelate, wipeLeft, noiseDissove)

**Shared parameters** — Duration slider, Easing dropdown, Background Color picker, Edge Softness slider, Edge Color toggle + picker

**Context-sensitive parameters** — Show/hide based on selected type. Map of type → visible parameter controls.

The `triggerEffect` function is replaced by `playCurrentTransition(reverse)` which reads the current type + all parameter values from the UI controls, builds a `TransitionConfig`, and calls `playTransition`.

### Step 3: Wire up the play buttons

- **Play Out**: `playCurrentTransition(false)` — scene → color
- **Play In**: `playCurrentTransition(true)` — color → scene (sets `reverse: true`)
- **Play Cycle**: Play Out, wait for completion, then Play In
- **Quick Presets**: Set type dropdown + sensible defaults, then play cycle

### Step 4: Run QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```

### Step 5: Commit

```bash
git add dev/index.html dev/dev.ts
git commit -m "feat(transitions): replace screen effects UI with full transitions dev harness"
```

---

## Task 7: Visual Verification

**Verify every feature via Playwright MCP (visible Chrome browser) so the user can see.**

### Checklist

**Mask-based transitions (14):**
1. `fade` — Play Out (scene goes to black), Play In (comes back)
2. `crossFade` — Capture frame, change something, dissolve
3. `circleIris` — Circle closes from edges to center
4. `diamondIris` — Diamond shape closes
5. `wipe` left/right/up/down — Edge sweeps in each direction
6. `diagonalWipe` — Angled edge sweeps
7. `doubleDoor` — Center-out and edge-in variants
8. `noiseDissove` — Organic noise-based dissolution
9. `ditheredFade` — Ordered dithering pattern
10. `venetianBlinds` — Horizontal/vertical stripe sweep
11. `bars` — Staggered bar sweep
12. `checkerboard` — Alternating block dissolve
13. `radialWipe` — Clock-hand sweep
14. `scanlineReveal` — Horizontal line sweep

**Procedural transitions (14):**
15. `pixelate` — Progressive pixelation → fade
16. `crtPowerOff` — Squeeze to line → dot
17. `swirl` — Spiral distortion → fade
18. `zoomLines` — Radiating lines + zoom
19. `shatter` — Voronoi cell displacement
20. `wavyDistortion` — Sine wave distortion → fade
21. `hexagonalize` — Hex grid dissolve
22. `pinwheel` — Angular sector sweep
23. `polkaDots` — Expanding dots
24. `gridFlip` — Tile flip with stagger
25. `glitch` — RGB separation + block displacement
26. `ripple` — Concentric circle distortion
27. `wind` — Horizontal pixel streaking
28. `chromaticBurst` — RGB channel separation burst

**Shared parameters:**
29. Duration slider — verify fast (200ms) and slow (5000ms)
30. Easing dropdown — verify all 6 easings produce different curves
31. Background Color — verify custom color (red, green, blue)
32. Edge Softness — verify 0.0 (hard edge) vs 0.3 (very soft)
33. Edge Color — verify enabled with white edge glow

**Context-sensitive parameters:**
34. circleIris center X/Y — verify off-center iris
35. venetianBlinds count — verify low (4) vs high (20) stripe count
36. noiseDissove scale — verify small (1) vs large (10) noise
37. pixelate maxBlockSize — verify small (8) vs large (64) blocks

**Quick presets:**
38. fadeToBlack one-click
39. fadeToWhite one-click
40. circleIris one-click
41. pixelate one-click

**Cycle:**
42. Play Cycle — Out + In roundtrip works smoothly

### Step: Take screenshots of representative transitions

Use Playwright MCP to screenshot at least: fade, circleIris, pixelate, wipe, noiseDissove, glitch, swirl, shatter — showing the transition mid-progress.

### Step: Commit final verification

```bash
git add -A
git commit -m "feat(transitions): complete transition system with 28 types"
```

---

## Implementation Order

1. **Task 1** — Schema (foundation for everything)
2. **Task 2** — Shader (GLSL — depends on schema for type mapping)
3. **Task 3** — Manager (core engine — depends on schema + shader)
4. **Task 4** — Delete old + exports (wire up — depends on manager)
5. **Task 5** — README (docs — depends on final API)
6. **Task 6** — Dev harness UI (visual — depends on manager)
7. **Task 7** — Visual verification (QA — depends on everything)

---

## Verification After Each Task

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```
