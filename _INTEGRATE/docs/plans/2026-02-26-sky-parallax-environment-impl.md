# Sky/Parallax/Environment Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the sky rendering, parallax system, and environment integration with gradient texture rendering, real SkyMaterial, auto-scroll, foreground layers, blend modes, tint, runtime layer management, day/night sky integration, and a star field.

**Architecture:** Schema-first approach (Valibot `v.strictObject` + `v.optional` with defaults). Each rendering feature is TDD'd against the existing Babylon.js NullEngine test infrastructure. The parallax manager gains an expanded per-frame observer for auto-scroll, blend modes, tint, and foreground support. The sky system replaces its broken gradient path with a generated 1×256 texture and its procedural approximation with real `SkyMaterial` from `@babylonjs/materials`. Runtime layer management is a set of pure functions operating on `ParallaxInstance`. Day/night integration adds optional sky color fields to `TimeKeyframeSchema` and reads interpolated values in the cycle observer.

**Tech Stack:** TypeScript · Valibot · Babylon.js 8.x · `@babylonjs/materials` (SkyMaterial) · Vitest · pnpm

**Design Doc:** `docs/plans/2026-02-26-sky-parallax-environment-design.md`

---

## QA Commands

Run after every file edit:

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

Run tests:

```bash
cd packages/products/webforge/runtime &&pnpm qa:test
```

Run specific test file:

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
cd packages/products/webforge/runtime &&npx vitest run src/rendering/parallax-manager.test.ts
```

Format fix:

```bash
pnpm -w run qa:format
```

---

## Task 1: Schema — Expand ParallaxLayerSchema + Add BlendMode/LayerType Enums

**Files:**
- Modify: `packages/products/webforge/runtime/src/schemas/sky-config.ts`

**Step 1: Add BlendModeSchema and LayerTypeSchema picklists**

Add after `SkyGradientStopSchema` (after line 75):

```typescript
// =============================================================================
// Blend Mode
// =============================================================================

/**
 * Alpha blending mode for parallax layers.
 *
 * Maps to `BABYLON.Constants.ALPHA_*` blending constants.
 */
export const BlendModeSchema = v.picklist([
	'alpha',
	'additive',
	'multiply',
	'subtract',
	'screen',
]);

/** Inferred blend mode type from {@link BlendModeSchema}. */
export type BlendMode = v.InferOutput<typeof BlendModeSchema>;

// =============================================================================
// Layer Type
// =============================================================================

/**
 * Rendering layer for parallax: background (behind tilemap) or foreground (above tilemap).
 */
export const LayerTypeSchema = v.picklist(['background', 'foreground']);

/** Inferred layer type from {@link LayerTypeSchema}. */
export type LayerType = v.InferOutput<typeof LayerTypeSchema>;
```

**Step 2: Add new fields to ParallaxLayerSchema**

Add these after the existing `scale` field (line 123), before the closing `});`:

```typescript
	/** Constant horizontal drift in UV/sec (camera-independent). Default: 0. */
	autoScrollX: v.optional(v.number(), 0),

	/** Constant vertical drift in UV/sec (camera-independent). Default: 0. */
	autoScrollY: v.optional(v.number(), 0),

	/** Rendering layer: behind tilemap or above tilemap. Default: 'background'. */
	layerType: v.optional(LayerTypeSchema, 'background'),

	/** Alpha blending mode. Default: 'alpha'. */
	blendMode: v.optional(BlendModeSchema, 'alpha'),

	/** Color tint multiplied with texture. Default: white (no tint). */
	tint: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),

	/** Sort order (lower = further back). Default: 0. */
	depth: v.optional(v.number(), 0),
```

**Step 3: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

Expected: All pass (schema additions are additive with defaults).

**Step 4: Run existing tests to confirm no regressions**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/parallax-manager.test.ts
```

Expected: All existing tests still pass (new fields have defaults).

**Step 5: Commit**

```bash
git add packages/products/webforge/runtime/src/schemas/sky-config.ts
git commit -m "feat(schema): add parallax blend mode, layer type, auto-scroll, tint, depth fields"
```

---

## Task 2: Schema — Expand SkyConfigSchema + Add StarsConfigSchema

**Files:**
- Modify: `packages/products/webforge/runtime/src/schemas/sky-config.ts`

**Step 1: Add StarsConfigSchema**

Add after `LayerTypeSchema` (before the Parallax Layer section):

```typescript
// =============================================================================
// Stars Config
// =============================================================================

/**
 * Star field configuration for nighttime sky.
 *
 * Rendered as a background Layer with time-based opacity fade and twinkle.
 */
export const StarsConfigSchema = v.strictObject({
	/** Enable star field layer. Default: false. */
	enabled: v.optional(v.boolean(), false),
	/** Path to star texture (required when enabled). */
	texture: v.pipe(v.string(), v.minLength(1)),
	/** Max opacity when fully visible [0, 1]. Default: 0.8. */
	opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.8),
	/** Twinkle oscillation speed [0, 5]. Default: 1. */
	twinkleSpeed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 1),
	/** Hour when stars begin fading in [0, 24]. */
	fadeInTime: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24))),
	/** Hour when stars finish fading out [0, 24]. */
	fadeOutTime: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24))),
	/** Texture scale [0.1, 10]. Default: 2. */
	scale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 2),
});

/** Inferred stars config type from {@link StarsConfigSchema}. */
export type StarsConfig = v.InferOutput<typeof StarsConfigSchema>;
```

**Step 2: Add SkyMaterial fields + stars to SkyConfigSchema**

Add before `parallaxLayers` in `SkyConfigSchema`:

```typescript
	/**
	 * Mie scattering intensity for `'procedural'` type.
	 *
	 * Controls haze glow around the sun. Range 0–0.1. Default: 0.005.
	 */
	mieCoefficient: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.1)), 0.005),

	/**
	 * Mie directional parameter for `'procedural'` type.
	 *
	 * 0 = isotropic, 1 = fully forward scattering. Range 0–1. Default: 0.8.
	 */
	mieDirectionalG: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.8),

	/**
	 * Sun vertical angle for `'procedural'` type.
	 *
	 * 0 = horizon, 0.5 = zenith. Range 0–0.5. Default: 0.49.
	 */
	inclination: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.49),

	/**
	 * Sun horizontal angle for `'procedural'` type.
	 *
	 * Range 0–1 (maps to 0–2π). Default: 0.25.
	 */
	azimuth: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.25),

	/**
	 * Star field configuration for nighttime sky.
	 *
	 * When enabled, renders a background layer with twinkle and time-based opacity.
	 */
	stars: v.optional(StarsConfigSchema),
```

**Step 3: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 4: Run existing tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: Pass (new fields have defaults, existing configs still valid).

**Step 5: Commit**

```bash
git add packages/products/webforge/runtime/src/schemas/sky-config.ts
git commit -m "feat(schema): add SkyMaterial fields, stars config, to SkyConfigSchema"
```

---

## Task 3: Schema — Add Sky Color Fields to TimeKeyframeSchema

**Files:**
- Modify: `packages/products/webforge/runtime/src/schemas/lighting-config.ts`

**Step 1: Add sky color fields to TimeKeyframeSchema**

Add after the `contrast` field (line 634), before the closing `});`:

```typescript
	/** Primary sky color (clearColor for color mode, tint for gradient). */
	skyColor: v.optional(ColorRgbaSchema),
	/** Top gradient color (for gradient sky mode). */
	skyGradientTop: v.optional(ColorRgbaSchema),
	/** Bottom gradient color (for gradient sky mode). */
	skyGradientBottom: v.optional(ColorRgbaSchema),
	/** When true, fog color auto-follows sky horizon color. */
	fogSyncSky: v.optional(v.boolean()),
```

**Step 2: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 3: Run day/night cycle tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/day-night-cycle.test.ts
```

Expected: Pass (new fields are optional, existing keyframes unaffected).

**Step 4: Commit**

```bash
git add packages/products/webforge/runtime/src/schemas/lighting-config.ts
git commit -m "feat(schema): add sky color fields to TimeKeyframeSchema for day/night integration"
```

---

## Task 4: Fix Gradient Sky — Generate 1×256 Texture

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.test.ts`

**Step 1: Write failing tests for gradient texture generation**

Add a new pure-math export `generateGradientTexture` and test it. In `sky-system.test.ts`, add:

```typescript
import { createSky, disposeSky, generateGradientPixels } from './sky-system';

// ... existing tests ...

// =============================================================================
// generateGradientPixels (pure math)
// =============================================================================

describe('generateGradientPixels', () => {
	test('generates 256-pixel RGBA array from 2 stops', () => {
		const pixels = generateGradientPixels([
			{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
			{ position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
		]);
		expect(pixels).toHaveLength(256 * 4); // 256 pixels × 4 channels
		// First pixel = top = red
		expect(pixels[0]).toBeCloseTo(255); // R
		expect(pixels[1]).toBeCloseTo(0);   // G
		expect(pixels[2]).toBeCloseTo(0);   // B
		expect(pixels[3]).toBeCloseTo(255); // A
		// Last pixel = bottom = blue
		expect(pixels[255 * 4]).toBeCloseTo(0);
		expect(pixels[255 * 4 + 2]).toBeCloseTo(255);
	});

	test('interpolates mid-point correctly for 2 stops', () => {
		const pixels = generateGradientPixels([
			{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
			{ position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
		]);
		// Mid pixel (row 128) should be ~50% gray
		const midIdx = 128 * 4;
		expect(pixels[midIdx]).toBeCloseTo(128, -1); // ~128 with rounding tolerance
	});

	test('handles 3+ stops with intermediate positions', () => {
		const pixels = generateGradientPixels([
			{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
			{ position: 0.5, color: { r: 0, g: 1, b: 0, a: 1 } },
			{ position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
		]);
		expect(pixels).toHaveLength(256 * 4);
		// At position 0.5 (row 128): should be green
		const midIdx = 128 * 4;
		expect(pixels[midIdx]).toBeLessThan(30);     // R low
		expect(pixels[midIdx + 1]).toBeGreaterThan(220); // G high
	});

	test('returns empty array for no stops', () => {
		const pixels = generateGradientPixels([]);
		expect(pixels).toHaveLength(0);
	});

	test('single stop fills entire gradient with that color', () => {
		const pixels = generateGradientPixels([
			{ position: 0.5, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } },
		]);
		expect(pixels).toHaveLength(256 * 4);
		// Every pixel should be ~128 gray
		expect(pixels[0]).toBeCloseTo(128, -1);
		expect(pixels[500]).toBeCloseTo(128, -1);
	});
});
```

**Step 2: Run tests — verify they fail**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: FAIL — `generateGradientPixels` is not exported.

**Step 3: Implement generateGradientPixels**

In `sky-system.ts`, add a new exported function:

```typescript
/**
 * Generates a 1×256 pixel RGBA buffer from gradient color stops.
 *
 * Each row is interpolated between the nearest stops. Position 0 = row 0 (top),
 * position 1 = row 255 (bottom). Returns a Uint8Array of 256×4 bytes.
 *
 * @param stops - Gradient stops sorted by position (0 = top, 1 = bottom).
 * @returns Uint8Array with 256 × 4 RGBA bytes, or empty array if no stops.
 *
 * @example
 * ```typescript
 * const pixels = generateGradientPixels([
 *   { position: 0, color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } },
 *   { position: 1, color: { r: 0.8, g: 0.6, b: 0.3, a: 1 } },
 * ]);
 * ```
 */
export function generateGradientPixels(
	stops: ReadonlyArray<{ readonly position: number; readonly color: { readonly r: number; readonly g: number; readonly b: number; readonly a: number } }>,
): Uint8Array {
	if (stops.length === 0) return new Uint8Array(0);

	const height = 256;
	const data = new Uint8Array(height * 4);

	// Single stop: fill with that color
	if (stops.length === 1) {
		const c = stops[0]!.color;
		for (let row = 0; row < height; row++) {
			const idx = row * 4;
			data[idx] = Math.round(c.r * 255);
			data[idx + 1] = Math.round(c.g * 255);
			data[idx + 2] = Math.round(c.b * 255);
			data[idx + 3] = Math.round(c.a * 255);
		}
		return data;
	}

	// Sort stops by position
	const sorted = [...stops].sort((a, b) => a.position - b.position);

	for (let row = 0; row < height; row++) {
		const t = row / (height - 1); // 0..1
		const idx = row * 4;

		// Find the two stops that bracket this position
		let lower = sorted[0]!;
		let upper = sorted[sorted.length - 1]!;

		for (let s = 0; s < sorted.length - 1; s++) {
			if (t >= sorted[s]!.position && t <= sorted[s + 1]!.position) {
				lower = sorted[s]!;
				upper = sorted[s + 1]!;
				break;
			}
		}

		// Interpolation factor between lower and upper
		const range = upper.position - lower.position;
		const f = range > 0 ? (t - lower.position) / range : 0;

		data[idx] = Math.round((lower.color.r + (upper.color.r - lower.color.r) * f) * 255);
		data[idx + 1] = Math.round((lower.color.g + (upper.color.g - lower.color.g) * f) * 255);
		data[idx + 2] = Math.round((lower.color.b + (upper.color.b - lower.color.b) * f) * 255);
		data[idx + 3] = Math.round((lower.color.a + (upper.color.a - lower.color.a) * f) * 255);
	}

	return data;
}
```

**Step 4: Run tests — verify they pass**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: All pass.

**Step 5: Update createGradientSky to use the texture**

Replace the `createGradientSky` function body. Instead of just setting `scene.clearColor` to the first stop, generate a `RawTexture` from `generateGradientPixels`, create a `BackgroundMaterial` with it as the diffuse texture, and render on a fullscreen box:

```typescript
function createGradientSky(
	scene: BABYLON.Scene,
	config: SkyConfigInput,
): BabylonResult<SkyInstance> {
	const stops = config.gradient;
	if (!stops || stops.length < 2) {
		// Fallback to solid color if insufficient stops
		return createColorSky(scene, config);
	}

	// Generate 1×256 gradient pixel data
	const pixels = generateGradientPixels([...stops]);

	// Create RawTexture from pixel data (1 wide × 256 tall, RGBA)
	const tex = new BABYLON.RawTexture(
		pixels,
		1,
		256,
		BABYLON.Engine.TEXTUREFORMAT_RGBA,
		scene,
		false, // generateMipMaps
		false, // invertY
		BABYLON.Texture.BILINEAR_SAMPLINGMODE,
	);
	tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
	tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

	// Create skybox mesh with BackgroundMaterial
	const skyboxMesh = BABYLON.MeshBuilder.CreateBox(
		'sky-gradient',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	const material = new BABYLON.BackgroundMaterial('sky-gradient-mat', scene);
	material.backFaceCulling = false;
	material.diffuseTexture = tex;
	material.useRGBColor = false;

	skyboxMesh.material = material;

	// Also set clearColor to the first stop for areas not covered by the mesh
	const firstStop = stops[0];
	if (firstStop) {
		scene.clearColor = new BABYLON.Color4(
			firstStop.color.r,
			firstStop.color.g,
			firstStop.color.b,
			firstStop.color.a,
		);
	}

	return okShallow({ skyboxMesh, skyboxMaterial: material, scene });
}
```

**Step 6: Update gradient test — now creates a mesh**

Update the gradient test "does not create skybox mesh for gradient" since gradient now DOES create a mesh:

```typescript
test('creates skybox mesh for gradient with 2+ stops', () => {
	const config: SkyConfig = {
		type: 'gradient',
		color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
		gradient: [
			{ position: 0, color: { r: 0, g: 0, b: 0.5, a: 1 } },
			{ position: 1, color: { r: 0.5, g: 0.5, b: 0, a: 1 } },
		],
		parallaxLayers: [],
		skyboxSize: 1000,
		turbidity: 10,
		rayleigh: 2,
		luminance: 1,
	};
	const result = createSky({ scene: instance.scene, config });
	expect(result.ok).toBe(true);
	if (!result.ok) return;
	expect(result.data.skyboxMesh).not.toBeNull();
});
```

And add a test for gradient with <2 stops falling back to color:

```typescript
test('falls back to color sky for gradient with <2 stops', () => {
	const config: SkyConfig = {
		type: 'gradient',
		color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
		gradient: [{ position: 0, color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } }],
		parallaxLayers: [],
		skyboxSize: 1000,
		turbidity: 10,
		rayleigh: 2,
		luminance: 1,
	};
	const result = createSky({ scene: instance.scene, config });
	expect(result.ok).toBe(true);
	if (!result.ok) return;
	// Falls back to color (no mesh)
	expect(result.data.skyboxMesh).toBeNull();
});
```

**Step 7: Run all tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: All pass.

**Step 8: Run full QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 9: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/sky-system.ts packages/products/webforge/runtime/src/rendering/sky-system.test.ts
git commit -m "feat(sky): fix gradient rendering with 1×256 generated texture"
```

---

## Task 5: Procedural Sky — Real SkyMaterial

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.test.ts`

**Step 1: Write failing test for SkyMaterial properties**

Add to `sky-system.test.ts`:

```typescript
describe('createSky — procedural type with SkyMaterial', () => {
	test('creates sky with SkyMaterial when type is procedural', () => {
		const config: SkyConfig = {
			type: 'procedural',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
			mieCoefficient: 0.005,
			mieDirectionalG: 0.8,
			inclination: 0.49,
			azimuth: 0.25,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.skyboxMesh).not.toBeNull();
		expect(result.data.skyboxMaterial).not.toBeNull();
	});
});
```

**Step 2: Run tests — verify they pass (existing procedural creates mesh)**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: Pass — existing code already creates a mesh. Now replace the implementation.

**Step 3: Replace createProceduralSky with real SkyMaterial**

Add import at top of `sky-system.ts`:

```typescript
import { SkyMaterial } from '@babylonjs/materials/sky';
```

Replace the `createProceduralSky` function:

```typescript
function createProceduralSky(
	scene: BABYLON.Scene,
	config: SkyConfigInput,
): BabylonResult<SkyInstance> {
	const skyboxMesh = BABYLON.MeshBuilder.CreateBox(
		'sky-procedural',
		{ size: config.skyboxSize },
		scene,
	);
	skyboxMesh.infiniteDistance = true;
	skyboxMesh.renderingGroupId = 0;

	const material = new SkyMaterial('sky-procedural-mat', scene);
	material.backFaceCulling = false;

	// Apply Rayleigh/Mie scattering parameters from config
	material.turbidity = config.turbidity;
	material.rayleigh = config.rayleigh;
	material.luminance = config.luminance;
	material.mieCoefficient = config.mieCoefficient;
	material.mieDirectionalG = config.mieDirectionalG;
	material.inclination = config.inclination;
	material.azimuth = config.azimuth;

	skyboxMesh.material = material;

	return okShallow({ skyboxMesh, skyboxMaterial: material, scene });
}
```

**NOTE:** `SkyMaterial` from `@babylonjs/materials` may not work in NullEngine since it relies on shader compilation. If tests fail with shader errors, the test should be adapted to verify the config is accepted without asserting internal SkyMaterial behavior. The visual verification step (Task 14) will confirm rendering works.

**Step 4: Run tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

If SkyMaterial fails in NullEngine, wrap the procedural test in a try/catch or skip material assertion. The key test is that `createSky` returns `ok: true` with a non-null mesh.

**Step 5: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 6: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/sky-system.ts packages/products/webforge/runtime/src/rendering/sky-system.test.ts
git commit -m "feat(sky): replace procedural approximation with real SkyMaterial"
```

---

## Task 6: Parallax — Auto-Scroll, Foreground, Blend Modes, Tint, Depth

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/parallax-manager.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/parallax-manager.test.ts`

**Step 1: Write failing tests for new parallax features**

Add to `parallax-manager.test.ts`:

```typescript
describe('createParallax — expanded features', () => {
	test('applies blend mode to layer alphaBlendingMode', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/glow.png',
				scrollSpeedX: 0,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'additive',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Additive = BABYLON.Constants.ALPHA_ADD = 1
		expect(result.data.bgLayers[0]!.alphaBlendingMode).toBe(1);
	});

	test('applies tint color to layer', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/fog.png',
				scrollSpeedX: 0,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 0.8,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 0.5, b: 0.5, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Tint applied via layer.color = Color4(tint.r, tint.g, tint.b, opacity)
		expect(result.data.bgLayers[0]!.color.r).toBeCloseTo(1);
		expect(result.data.bgLayers[0]!.color.g).toBeCloseTo(0.5);
		expect(result.data.bgLayers[0]!.color.b).toBeCloseTo(0.5);
		expect(result.data.bgLayers[0]!.color.a).toBeCloseTo(0.8);
	});

	test('foreground layers use isBackground=false', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/overlay.png',
				scrollSpeedX: 0,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 0.6,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'foreground',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 10,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bgLayers[0]!.isBackground).toBe(false);
	});

	test('sorts layers by depth before creation', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/front.png',
				scrollSpeedX: 0,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 10,
			},
			{
				imagePath: 'bg/back.png',
				scrollSpeedX: 0,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// After sorting, the instance.layers should have depth=0 first, depth=10 second
		expect(result.data.layers[0]!.depth).toBe(0);
		expect(result.data.layers[1]!.depth).toBe(10);
	});
});

describe('parallax blend mode mapping', () => {
	test('maps all 5 blend modes correctly', () => {
		// This tests the mapping helper (import it after implementation)
		const modes = ['alpha', 'additive', 'multiply', 'subtract', 'screen'] as const;
		const expected = [2, 1, 4, 3, 10]; // COMBINE, ADD, MULTIPLY, SUBTRACT, SCREENMODE
		for (let i = 0; i < modes.length; i++) {
			const result = mapBlendMode(modes[i]!);
			expect(result).toBe(expected[i]);
		}
	});
});
```

**Step 2: Run tests — verify they fail**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/parallax-manager.test.ts
```

Expected: FAIL — `mapBlendMode` not exported, blend modes not applied.

**Step 3: Implement blend mode mapping**

Add to `parallax-manager.ts`:

```typescript
/**
 * Maps a blend mode string to a Babylon.js alpha blending constant.
 *
 * @param mode - Blend mode name.
 * @returns Babylon.js ALPHA_* constant value.
 *
 * @example
 * ```typescript
 * const alphaMode = mapBlendMode('additive'); // Constants.ALPHA_ADD = 1
 * ```
 */
export function mapBlendMode(mode: string): number {
	switch (mode) {
		case 'additive': return BABYLON.Constants.ALPHA_ADD;
		case 'multiply': return BABYLON.Constants.ALPHA_MULTIPLY;
		case 'subtract': return BABYLON.Constants.ALPHA_SUBTRACT;
		case 'screen': return BABYLON.Constants.ALPHA_SCREENMODE;
		case 'alpha':
		default: return BABYLON.Constants.ALPHA_COMBINE;
	}
}
```

**Step 4: Update createParallax for all new features**

Rewrite the `createParallax` function to:
1. Sort layers by `depth` before creating
2. Use `layerType` to set `isBackground` (background=true, foreground=false)
3. Apply `blendMode` via `mapBlendMode`
4. Apply `tint` via `bgLayer.color = new Color4(tint.r, tint.g, tint.b, opacity)`
5. Track elapsed time in observer for `autoScrollX`/`autoScrollY`

Key changes in the `createParallax` function:

```typescript
// Sort layers by depth (lower = further back = created first)
const sortedLayers = [...layers].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

// ... in the layer creation loop:
const isBg = (layer.layerType ?? 'background') === 'background';
const bgLayer = new BABYLON.Layer(`parallax-${i}`, texturePath, scene, isBg);

// Blend mode
bgLayer.alphaBlendingMode = mapBlendMode(layer.blendMode ?? 'alpha');

// Tint + opacity via color
const tint = layer.tint ?? { r: 1, g: 1, b: 1, a: 1 };
bgLayer.color = new BABYLON.Color4(tint.r, tint.g, tint.b, layer.opacity);
```

For auto-scroll in the observer:

```typescript
// Auto-scroll UV offset (camera-independent, time-based)
const autoX = (layer.autoScrollX ?? 0);
const autoY = (layer.autoScrollY ?? 0);
if (autoX !== 0 || autoY !== 0) {
	const dt = scene.getEngine().getDeltaTime() / 1000;
	bgLayer.texture.uOffset += autoX * dt;
	bgLayer.texture.vOffset += autoY * dt;
}
```

**Step 5: Run tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/parallax-manager.test.ts
```

Expected: All pass.

**Step 6: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 7: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/parallax-manager.ts packages/products/webforge/runtime/src/rendering/parallax-manager.test.ts
git commit -m "feat(parallax): add auto-scroll, foreground layers, blend modes, tint, depth sorting"
```

---

## Task 7: Runtime Layer Management API

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/parallax-manager.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/parallax-manager.test.ts`

**Step 1: Write failing tests for runtime API**

Add to `parallax-manager.test.ts`:

```typescript
import {
	createParallax,
	disposeParallax,
	computeParallaxOffset,
	mapBlendMode,
	addParallaxLayer,
	removeParallaxLayer,
	fadeLayerOpacity,
	getParallaxLayerCount,
	setParallaxLayerTint,
} from './parallax-manager';

// ... existing tests ...

describe('runtime layer management', () => {
	test('getParallaxLayerCount returns correct count', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/a.png', scrollSpeedX: 0, scrollSpeedY: 0,
				offsetY: 0, opacity: 1, tileX: true, tileY: false, scale: 1,
				autoScrollX: 0, autoScrollY: 0, layerType: 'background',
				blendMode: 'alpha', tint: { r: 1, g: 1, b: 1, a: 1 }, depth: 0,
			},
		];
		const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const countResult = getParallaxLayerCount({ parallax: result.data });
		expect(countResult.ok).toBe(true);
		if (!countResult.ok) return;
		expect(countResult.data).toBe(1);
	});

	test('addParallaxLayer adds a new layer', () => {
		const result = createParallax({ scene: instance.scene, layers: [], assetBasePath: '/' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const addResult = addParallaxLayer({
			parallax: result.data,
			layer: {
				imagePath: 'bg/new.png', scrollSpeedX: 0.5, scrollSpeedY: 0,
				offsetY: 0, opacity: 0.8, tileX: true, tileY: false, scale: 1,
				autoScrollX: 0, autoScrollY: 0, layerType: 'background',
				blendMode: 'alpha', tint: { r: 1, g: 1, b: 1, a: 1 }, depth: 0,
			},
			assetBasePath: '/',
		});
		expect(addResult.ok).toBe(true);
		expect(result.data.bgLayers).toHaveLength(1);
		expect(result.data.layers).toHaveLength(1);
	});

	test('removeParallaxLayer removes by index', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/a.png', scrollSpeedX: 0, scrollSpeedY: 0,
				offsetY: 0, opacity: 1, tileX: true, tileY: false, scale: 1,
				autoScrollX: 0, autoScrollY: 0, layerType: 'background',
				blendMode: 'alpha', tint: { r: 1, g: 1, b: 1, a: 1 }, depth: 0,
			},
			{
				imagePath: 'bg/b.png', scrollSpeedX: 0, scrollSpeedY: 0,
				offsetY: 0, opacity: 1, tileX: true, tileY: false, scale: 1,
				autoScrollX: 0, autoScrollY: 0, layerType: 'background',
				blendMode: 'alpha', tint: { r: 1, g: 1, b: 1, a: 1 }, depth: 1,
			},
		];
		const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const removeResult = removeParallaxLayer({ parallax: result.data, index: 0 });
		expect(removeResult.ok).toBe(true);
		expect(result.data.bgLayers).toHaveLength(1);
		expect(result.data.layers).toHaveLength(1);
	});

	test('removeParallaxLayer returns error for out-of-bounds index', () => {
		const result = createParallax({ scene: instance.scene, layers: [], assetBasePath: '/' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const removeResult = removeParallaxLayer({ parallax: result.data, index: 5 });
		expect(removeResult.ok).toBe(false);
	});

	test('setParallaxLayerTint updates layer color', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/a.png', scrollSpeedX: 0, scrollSpeedY: 0,
				offsetY: 0, opacity: 1, tileX: true, tileY: false, scale: 1,
				autoScrollX: 0, autoScrollY: 0, layerType: 'background',
				blendMode: 'alpha', tint: { r: 1, g: 1, b: 1, a: 1 }, depth: 0,
			},
		];
		const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const tintResult = setParallaxLayerTint({
			parallax: result.data,
			index: 0,
			tint: { r: 1, g: 0, b: 0, a: 1 },
		});
		expect(tintResult.ok).toBe(true);
		expect(result.data.bgLayers[0]!.color.r).toBeCloseTo(1);
		expect(result.data.bgLayers[0]!.color.g).toBeCloseTo(0);
	});
});
```

**Step 2: Run tests — verify they fail**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/parallax-manager.test.ts
```

Expected: FAIL — functions not exported.

**Step 3: Implement runtime API functions**

Add to `parallax-manager.ts`:

```typescript
/**
 * Returns the number of active parallax layers.
 *
 * @param options - The parallax instance.
 * @returns Result containing the layer count.
 */
export function getParallaxLayerCount(options: {
	readonly parallax: ParallaxInstance;
}): BabylonResult<Num> {
	return okShallow(options.parallax.bgLayers.length as Num);
}

/**
 * Adds a new parallax layer at runtime.
 *
 * @param options - Parallax instance, new layer config, and asset base path.
 * @returns Result indicating success.
 */
export function addParallaxLayer(options: {
	readonly parallax: ParallaxInstance;
	readonly layer: ParallaxLayer;
	readonly assetBasePath: string;
}): BabylonResult<Bool> {
	const { parallax, layer, assetBasePath } = options;

	try {
		const texturePath = `${assetBasePath}${layer.imagePath}`;
		const isBg = (layer.layerType ?? 'background') === 'background';
		const bgLayer = new BABYLON.Layer(
			`parallax-${parallax.bgLayers.length}`,
			texturePath,
			parallax.scene,
			isBg,
		);

		bgLayer.alphaBlendingMode = mapBlendMode(layer.blendMode ?? 'alpha');
		const tint = layer.tint ?? { r: 1, g: 1, b: 1, a: 1 };
		bgLayer.color = new BABYLON.Color4(tint.r, tint.g, tint.b, layer.opacity);

		const tex = bgLayer.texture;
		if (tex && tex instanceof BABYLON.Texture) {
			tex.wrapU = layer.tileX ? BABYLON.Texture.WRAP_ADDRESSMODE : BABYLON.Texture.CLAMP_ADDRESSMODE;
			tex.wrapV = layer.tileY ? BABYLON.Texture.WRAP_ADDRESSMODE : BABYLON.Texture.CLAMP_ADDRESSMODE;
			tex.uScale = 1 / layer.scale;
			tex.vScale = 1 / layer.scale;
		}

		bgLayer.scale = new BABYLON.Vector2(layer.scale, layer.scale);
		bgLayer.offset = new BABYLON.Vector2(0, layer.offsetY * 0.01);

		parallax.bgLayers.push(bgLayer);
		parallax.layers.push({ ...layer });

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Removes a parallax layer by index, disposing the Babylon.js Layer.
 *
 * @param options - Parallax instance and layer index.
 * @returns Result indicating success.
 */
export function removeParallaxLayer(options: {
	readonly parallax: ParallaxInstance;
	readonly index: Num;
}): BabylonResult<Bool> {
	const { parallax, index } = options;

	if (index < 0 || index >= parallax.bgLayers.length) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Layer index ${index} out of bounds`);
	}

	const bgLayer = parallax.bgLayers[index];
	if (bgLayer) bgLayer.dispose();
	parallax.bgLayers.splice(index, 1);
	parallax.layers.splice(index, 1);

	return okShallow(true as Bool);
}

/**
 * Smoothly fades a layer's opacity to a target value over time.
 *
 * Uses `scene.registerBeforeRender` with per-frame lerp. Returns a handle
 * with `dispose()` to cancel mid-fade.
 *
 * @param options - Parallax instance, layer index, target opacity, duration in ms.
 * @returns Result containing a disposable handle.
 */
export function fadeLayerOpacity(options: {
	readonly parallax: ParallaxInstance;
	readonly index: Num;
	readonly target: Num;
	readonly durationMs: Num;
}): BabylonResult<{ readonly dispose: () => void }> {
	const { parallax, index, target, durationMs } = options;

	if (index < 0 || index >= parallax.bgLayers.length) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Layer index ${index} out of bounds`);
	}

	const bgLayer = parallax.bgLayers[index]!;
	const layer = parallax.layers[index]!;
	const startOpacity: number = bgLayer.color.a;
	let elapsed = 0;

	const observer = parallax.scene.onBeforeRenderObservable.add(() => {
		const dt: number = parallax.scene.getEngine().getDeltaTime();
		elapsed += dt;
		const t: number = Math.min(1, elapsed / durationMs);
		const current: number = startOpacity + (target - startOpacity) * t;

		const tint = layer.tint ?? { r: 1, g: 1, b: 1, a: 1 };
		bgLayer.color = new BABYLON.Color4(tint.r, tint.g, tint.b, current);
		layer.opacity = current;

		if (t >= 1) {
			parallax.scene.onBeforeRenderObservable.remove(observer);
		}
	});

	return okShallow({
		dispose: () => {
			parallax.scene.onBeforeRenderObservable.remove(observer);
		},
	});
}

/**
 * Changes a parallax layer's tint color at runtime.
 *
 * @param options - Parallax instance, layer index, and new tint color.
 * @returns Result indicating success.
 */
export function setParallaxLayerTint(options: {
	readonly parallax: ParallaxInstance;
	readonly index: Num;
	readonly tint: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
}): BabylonResult<Bool> {
	const { parallax, index, tint } = options;

	if (index < 0 || index >= parallax.bgLayers.length) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Layer index ${index} out of bounds`);
	}

	const bgLayer = parallax.bgLayers[index]!;
	const layer = parallax.layers[index]!;

	bgLayer.color = new BABYLON.Color4(tint.r, tint.g, tint.b, layer.opacity);
	layer.tint = { ...tint };

	return okShallow(true as Bool);
}
```

**Step 4: Run tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/parallax-manager.test.ts
```

Expected: All pass.

**Step 5: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 6: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/parallax-manager.ts packages/products/webforge/runtime/src/rendering/parallax-manager.test.ts
git commit -m "feat(parallax): add runtime layer management API (add/remove/fade/count/tint)"
```

---

## Task 8: Day/Night Sky Integration

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.test.ts`

**Step 1: Write failing test for regenerateGradientTexture**

Add to `sky-system.test.ts`:

```typescript
import { createSky, disposeSky, generateGradientPixels, regenerateGradientTexture } from './sky-system';

describe('regenerateGradientTexture', () => {
	test('returns ok for gradient sky with new top/bottom colors', () => {
		const config: SkyConfig = {
			type: 'gradient',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			gradient: [
				{ position: 0, color: { r: 0, g: 0, b: 0.5, a: 1 } },
				{ position: 1, color: { r: 0.5, g: 0.5, b: 0, a: 1 } },
			],
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const createResult = createSky({ scene: instance.scene, config });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const result = regenerateGradientTexture({
			sky: createResult.data,
			topColor: { r: 1, g: 0, b: 0, a: 1 },
			bottomColor: { r: 0, g: 0, b: 1, a: 1 },
		});
		expect(result.ok).toBe(true);
	});

	test('returns error for non-gradient sky (no mesh)', () => {
		const config: SkyConfig = {
			type: 'color',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const createResult = createSky({ scene: instance.scene, config });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const result = regenerateGradientTexture({
			sky: createResult.data,
			topColor: { r: 1, g: 0, b: 0, a: 1 },
			bottomColor: { r: 0, g: 0, b: 1, a: 1 },
		});
		// No mesh to regenerate on
		expect(result.ok).toBe(false);
	});
});
```

**Step 2: Run tests — verify they fail**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: FAIL — `regenerateGradientTexture` not exported.

**Step 3: Implement regenerateGradientTexture**

Add to `sky-system.ts`:

```typescript
/**
 * Regenerates the gradient texture on a gradient sky instance with new top/bottom colors.
 *
 * Used by day/night integration to smoothly transition sky gradient colors
 * across the day cycle.
 *
 * @param options - Sky instance and new gradient colors.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * regenerateGradientTexture({
 *   sky: skyInstance,
 *   topColor: { r: 0.1, g: 0.1, b: 0.3, a: 1 },
 *   bottomColor: { r: 0.8, g: 0.4, b: 0.2, a: 1 },
 * });
 * ```
 */
export function regenerateGradientTexture(options: {
	readonly sky: SkyInstance;
	readonly topColor: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
	readonly bottomColor: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
}): BabylonResult<Bool> {
	const { sky, topColor, bottomColor } = options;

	if (!sky.skyboxMesh || !sky.skyboxMaterial) {
		return err(ERRORS.SCENE.RENDER_FAILED, 'Cannot regenerate gradient: no skybox mesh');
	}

	try {
		const pixels = generateGradientPixels([
			{ position: 0, color: topColor },
			{ position: 1, color: bottomColor },
		]);

		const tex = new BABYLON.RawTexture(
			pixels,
			1,
			256,
			BABYLON.Engine.TEXTUREFORMAT_RGBA,
			sky.scene,
			false,
			false,
			BABYLON.Texture.BILINEAR_SAMPLINGMODE,
		);
		tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
		tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

		// Replace texture on the BackgroundMaterial
		const mat = sky.skyboxMaterial;
		if (mat instanceof BABYLON.BackgroundMaterial) {
			if (mat.diffuseTexture) mat.diffuseTexture.dispose();
			mat.diffuseTexture = tex;
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
```

**Step 4: Write and implement updateSkyFromDayNight**

Add a function that the day/night observer calls to apply interpolated sky values:

```typescript
/**
 * Applies interpolated sky values from the day/night cycle.
 *
 * Called per-frame by the day/night observer when sky integration is active.
 * Handles color mode (clearColor), gradient mode (regenerate texture), and
 * procedural mode (SkyMaterial inclination/azimuth from sun direction).
 *
 * @param options - Sky instance, interpolated values, and optional sun direction.
 * @returns BabylonResult indicating success.
 */
export function updateSkyFromDayNight(options: {
	readonly sky: SkyInstance;
	readonly skyColor?: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
	readonly skyGradientTop?: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
	readonly skyGradientBottom?: { readonly r: number; readonly g: number; readonly b: number; readonly a: number };
	readonly fogSyncSky?: boolean;
	readonly skyType: string;
}): BabylonResult<Bool> {
	const { sky, skyColor, skyGradientTop, skyGradientBottom, fogSyncSky, skyType } = options;

	try {
		switch (skyType) {
			case 'color': {
				if (skyColor) {
					sky.scene.clearColor = new BABYLON.Color4(skyColor.r, skyColor.g, skyColor.b, skyColor.a);
				}
				break;
			}
			case 'gradient': {
				if (skyGradientTop && skyGradientBottom) {
					regenerateGradientTexture({ sky, topColor: skyGradientTop, bottomColor: skyGradientBottom });
				}
				break;
			}
			case 'procedural': {
				// SkyMaterial inclination/azimuth are updated externally from sun direction
				// This function handles skyColor-based clearColor as fallback
				if (skyColor) {
					sky.scene.clearColor = new BABYLON.Color4(skyColor.r, skyColor.g, skyColor.b, skyColor.a);
				}
				break;
			}
			// skybox: no animation (static cubemap)
		}

		// Fog sync: set fog color to horizon/bottom color
		if (fogSyncSky && skyGradientBottom) {
			sky.scene.fogColor = new BABYLON.Color3(
				skyGradientBottom.r,
				skyGradientBottom.g,
				skyGradientBottom.b,
			);
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
```

**Step 5: Run tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

**Step 6: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 7: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/sky-system.ts packages/products/webforge/runtime/src/rendering/sky-system.test.ts
git commit -m "feat(sky): add regenerateGradientTexture and updateSkyFromDayNight for day/night integration"
```

---

## Task 9: Star Field

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/sky-system.test.ts`

**Step 1: Write failing test for star opacity computation**

Add a pure-math helper `computeStarOpacity` and test it:

```typescript
import { createSky, disposeSky, generateGradientPixels, regenerateGradientTexture, computeStarOpacity } from './sky-system';

describe('computeStarOpacity', () => {
	test('returns 0 during daytime (noon)', () => {
		const opacity = computeStarOpacity({
			timeOfDay: 12,
			maxOpacity: 0.8,
			fadeInTime: 18,
			fadeOutTime: 6,
			twinkleSpeed: 1,
			elapsedTime: 0,
		});
		expect(opacity).toBeCloseTo(0);
	});

	test('returns maxOpacity at midnight', () => {
		const opacity = computeStarOpacity({
			timeOfDay: 0,
			maxOpacity: 0.8,
			fadeInTime: 18,
			fadeOutTime: 6,
			twinkleSpeed: 0,
			elapsedTime: 0,
		});
		expect(opacity).toBeCloseTo(0.8);
	});

	test('returns partial opacity during fade-in', () => {
		// Halfway through fade-in (18-24 range, at 21 = 50%)
		const opacity = computeStarOpacity({
			timeOfDay: 21,
			maxOpacity: 1,
			fadeInTime: 18,
			fadeOutTime: 6,
			twinkleSpeed: 0,
			elapsedTime: 0,
		});
		expect(opacity).toBeGreaterThan(0.3);
		expect(opacity).toBeLessThan(0.7);
	});

	test('twinkle modulates opacity', () => {
		const o1 = computeStarOpacity({
			timeOfDay: 0,
			maxOpacity: 0.8,
			fadeInTime: 18,
			fadeOutTime: 6,
			twinkleSpeed: 1,
			elapsedTime: 0,
		});
		const o2 = computeStarOpacity({
			timeOfDay: 0,
			maxOpacity: 0.8,
			fadeInTime: 18,
			fadeOutTime: 6,
			twinkleSpeed: 1,
			elapsedTime: Math.PI / 2, // quarter cycle
		});
		// Should be slightly different due to twinkle
		expect(Math.abs(o1 - o2)).toBeGreaterThan(0);
	});
});
```

**Step 2: Run tests — verify they fail**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: FAIL — `computeStarOpacity` not exported.

**Step 3: Implement computeStarOpacity (pure math)**

Add to `sky-system.ts`:

```typescript
/**
 * Computes current star field opacity based on time of day and twinkle.
 *
 * Stars fade in at fadeInTime and fade out at fadeOutTime. Twinkle adds
 * a small sine oscillation on top of the base opacity.
 *
 * @param options - Time, opacity params, and twinkle state.
 * @returns Opacity value [0, maxOpacity].
 *
 * @example
 * ```typescript
 * const opacity = computeStarOpacity({
 *   timeOfDay: 22, maxOpacity: 0.8, fadeInTime: 18, fadeOutTime: 6,
 *   twinkleSpeed: 1, elapsedTime: 5.3,
 * });
 * ```
 */
export function computeStarOpacity(options: {
	readonly timeOfDay: number;
	readonly maxOpacity: number;
	readonly fadeInTime: number;
	readonly fadeOutTime: number;
	readonly twinkleSpeed: number;
	readonly elapsedTime: number;
}): number {
	const { timeOfDay, maxOpacity, fadeInTime, fadeOutTime, twinkleSpeed, elapsedTime } = options;

	let baseOpacity = 0;

	// Fade-in period: fadeInTime → midnight (24/0)
	// Fade-out period: midnight → fadeOutTime
	// Full visibility: between midnight and fadeOutTime/fadeInTime

	if (fadeInTime > fadeOutTime) {
		// Normal case: fadeIn=18, fadeOut=6 → stars visible 18→6 (through midnight)
		if (timeOfDay >= fadeInTime) {
			// Fading in: 18→24
			const fadeRange = 24 - fadeInTime;
			const progress = (timeOfDay - fadeInTime) / (fadeRange > 0 ? fadeRange : 1);
			baseOpacity = Math.min(1, progress) * maxOpacity;
		} else if (timeOfDay <= fadeOutTime) {
			// Fading out: 0→6
			const progress = 1 - timeOfDay / (fadeOutTime > 0 ? fadeOutTime : 1);
			baseOpacity = Math.max(0, progress) * maxOpacity;
		}
		// else: daytime, opacity = 0
	}

	// Twinkle: small sine oscillation (±5% of max)
	if (baseOpacity > 0 && twinkleSpeed > 0) {
		const twinkle = Math.sin(elapsedTime * twinkleSpeed * Math.PI * 2) * 0.05 * maxOpacity;
		baseOpacity = Math.max(0, Math.min(maxOpacity, baseOpacity + twinkle));
	}

	return baseOpacity;
}
```

**Step 4: Run tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

Expected: All pass.

**Step 5: Add SkyInstance fields for star layer**

Extend `SkyInstance` type to include optional star layer:

```typescript
export type SkyInstance = {
	readonly skyboxMesh: BABYLON.Mesh | null;
	readonly skyboxMaterial: BABYLON.Material | null;
	readonly scene: BABYLON.Scene;
	/** Optional star field background layer. */
	readonly starLayer: BABYLON.Layer | null;
	/** Star field observer for per-frame opacity updates. */
	readonly starObserver: BABYLON.Observer<BABYLON.Scene> | null;
};
```

Update all `okShallow` returns in `createColorSky`, `createGradientSky`, `createSkyboxSky`, `createProceduralSky` to include `starLayer: null, starObserver: null`.

**Step 6: Add createStarField function**

```typescript
/**
 * Creates a star field background layer (called after sky creation).
 *
 * @param options - Sky instance and star config.
 * @returns BabylonResult with updated sky instance including star layer.
 */
export function createStarField(options: {
	readonly sky: SkyInstance;
	readonly config: {
		readonly texture: string;
		readonly opacity: number;
		readonly twinkleSpeed: number;
		readonly fadeInTime?: number;
		readonly fadeOutTime?: number;
		readonly scale: number;
	};
	readonly assetBasePath: string;
	readonly getTimeOfDay: () => number;
}): BabylonResult<SkyInstance> {
	const { sky, config, assetBasePath, getTimeOfDay } = options;

	try {
		const texPath = `${assetBasePath}${config.texture}`;
		const starLayer = new BABYLON.Layer('stars', texPath, sky.scene, true);
		starLayer.alphaBlendingMode = BABYLON.Constants.ALPHA_ADD;
		starLayer.color = new BABYLON.Color4(1, 1, 1, 0); // starts invisible

		const tex = starLayer.texture;
		if (tex && tex instanceof BABYLON.Texture) {
			tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
			tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
			tex.uScale = 1 / config.scale;
			tex.vScale = 1 / config.scale;
		}

		let elapsed = 0;
		const starObserver = sky.scene.onBeforeRenderObservable.add(() => {
			const dt = sky.scene.getEngine().getDeltaTime() / 1000;
			elapsed += dt;

			const opacity = computeStarOpacity({
				timeOfDay: getTimeOfDay(),
				maxOpacity: config.opacity,
				fadeInTime: config.fadeInTime ?? 18,
				fadeOutTime: config.fadeOutTime ?? 6,
				twinkleSpeed: config.twinkleSpeed,
				elapsedTime: elapsed,
			});
			starLayer.color = new BABYLON.Color4(1, 1, 1, opacity);
		});

		return okShallow({
			...sky,
			starLayer,
			starObserver,
		});
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
```

Update `disposeSky` to also dispose star layer:

```typescript
if (sky.starObserver) {
	sky.scene.onBeforeRenderObservable.remove(sky.starObserver);
}
if (sky.starLayer) {
	sky.starLayer.dispose();
}
```

**Step 7: Run all tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/sky-system.test.ts
```

**Step 8: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 9: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/sky-system.ts packages/products/webforge/runtime/src/rendering/sky-system.test.ts
git commit -m "feat(sky): add star field with time-based opacity fade and twinkle"
```

---

## Task 10: Update Index.ts Exports

**Files:**
- Modify: `packages/products/webforge/runtime/src/index.ts`

**Step 1: Add new exports**

Add to the sky-config schema exports section:

```typescript
export {
	SkyConfigSchema,
	SkyTypeSchema,
	SkyGradientStopSchema,
	ParallaxLayerSchema,
	BlendModeSchema,
	LayerTypeSchema,
	StarsConfigSchema,
	type SkyConfig,
	type SkyType,
	type SkyGradientStop,
	type ParallaxLayer,
	type BlendMode,
	type LayerType,
	type StarsConfig,
} from './schemas/sky-config';
```

Update sky-system exports:

```typescript
export {
	createSky,
	disposeSky,
	generateGradientPixels,
	regenerateGradientTexture,
	updateSkyFromDayNight,
	createStarField,
	computeStarOpacity,
	type SkyInstance,
} from './rendering/sky-system';
```

Update parallax-manager exports:

```typescript
export {
	createParallax,
	disposeParallax,
	computeParallaxOffset,
	mapBlendMode,
	addParallaxLayer,
	removeParallaxLayer,
	fadeLayerOpacity,
	getParallaxLayerCount,
	setParallaxLayerTint,
	type ParallaxInstance,
} from './rendering/parallax-manager';
```

**Step 2: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 3: Run full test suite**

```bash
cd packages/products/webforge/runtime &&pnpm qa:test
```

Expected: All pass.

**Step 4: Commit**

```bash
git add packages/products/webforge/runtime/src/index.ts
git commit -m "feat: export all new sky, parallax, and star field functions and types"
```

---

## Task 11: Dev Harness — Expanded Parallax Controls

**Files:**
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Add new parallax controls to buildSkyUI**

In the parallax per-layer loop, after the existing Scale slider, add:

- **Auto-Scroll X** slider [-2, 2] → updates `layer.autoScrollX`
- **Auto-Scroll Y** slider [-2, 2] → updates `layer.autoScrollY`
- **Blend Mode** dropdown (alpha/additive/multiply/subtract/screen) → updates `layer.blendMode` + `bgLayer.alphaBlendingMode` via `mapBlendMode`
- **Layer Type** dropdown (background/foreground) — read-only info (changing requires rebuild)
- **Tint R/G/B** sliders [0, 1] → updates `layer.tint` + `bgLayer.color`
- **Fade Opacity** button → calls `fadeLayerOpacity` (fades to 0 over 1s, then back to 1)
- **Add Layer** / **Remove Layer** buttons at bottom

Import the new functions from `parallax-manager.ts`:

```typescript
import { mapBlendMode, addParallaxLayer, removeParallaxLayer, fadeLayerOpacity } from '../src/rendering/parallax-manager';
```

**Step 2: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 3: Commit**

```bash
git add packages/products/webforge/runtime/dev/dev.ts
git commit -m "feat(dev): add expanded parallax controls (auto-scroll, blend, tint, layer management)"
```

---

## Task 12: Dev Harness — Procedural Sky + Stars Controls

**Files:**
- Modify: `packages/products/webforge/runtime/dev/dev.ts`

**Step 1: Add procedural sky controls to buildSkyUI**

When sky type is `'procedural'`, add:
- **Mie Coefficient** slider [0, 0.1, step 0.001]
- **Mie Directional G** slider [0, 1, step 0.01]
- **Inclination** slider [0, 0.5, step 0.01]
- **Azimuth** slider [0, 1, step 0.01]

These update the SkyMaterial properties on the material directly (if it's a SkyMaterial instance).

**Step 2: Add stars controls**

Add a "Stars" sub-header with:
- **Enabled** toggle
- **Opacity** slider [0, 1]
- **Twinkle Speed** slider [0, 5]

**Step 3: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 4: Commit**

```bash
git add packages/products/webforge/runtime/dev/dev.ts
git commit -m "feat(dev): add procedural sky and star field controls"
```

---

## Task 13: Visual Verification

**Step 1: Start dev server**

```bash
cd packages/products/webforge/runtime &&pnpm dev
```

**Step 2: Verify in browser**

Open the dev harness at `http://localhost:3100` and verify:

1. **Gradient sky**: Change sky type to gradient → verify visible gradient (not just solid color)
2. **Procedural sky**: Change sky type to procedural → verify SkyMaterial renders atmosphere
3. **Procedural controls**: Adjust Mie/inclination/azimuth sliders → sky updates in real time
4. **Parallax auto-scroll**: Set Auto-Scroll X to 0.5 → layer drifts horizontally independent of camera
5. **Parallax blend modes**: Switch blend mode dropdown → visual change (additive = brighter, multiply = darker)
6. **Parallax tint**: Adjust tint R/G/B sliders → layer color tint changes
7. **Parallax layer management**: Click Add Layer → new layer appears; Remove Layer → layer removed
8. **Fade opacity**: Click Fade button → layer fades out smoothly over 1s then back
9. **Star field controls**: Enable stars toggle → stars visible at night; twinkle speed adjusts

**Step 3: Run final full QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

Expected: All pass, 0 warnings, 0 errors.

---

## Task 14: Update InterpolatedValues for Sky Fields

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Add sky fields to InterpolatedValues type**

```typescript
export type InterpolatedValues = {
	// ... existing fields ...
	readonly skyColor?: ColorRgba;
	readonly skyGradientTop?: ColorRgba;
	readonly skyGradientBottom?: ColorRgba;
	readonly fogSyncSky?: boolean;
};
```

**Step 2: Update interpolateKeyframes to interpolate new fields**

In the `interpolateKeyframes` function, add interpolation for the new fields alongside the existing color interpolation logic. Follow the same pattern as `clearColor`/`fogColor`:

```typescript
// Sky color fields
if (lower.skyColor && upper.skyColor) {
	interpolated.skyColor = lerpColor(lower.skyColor, upper.skyColor, easedT);
}
if (lower.skyGradientTop && upper.skyGradientTop) {
	interpolated.skyGradientTop = lerpColor(lower.skyGradientTop, upper.skyGradientTop, easedT);
}
if (lower.skyGradientBottom && upper.skyGradientBottom) {
	interpolated.skyGradientBottom = lerpColor(lower.skyGradientBottom, upper.skyGradientBottom, easedT);
}
// fogSyncSky: use lower keyframe's value (boolean, not interpolated)
if (lower.fogSyncSky !== undefined) {
	interpolated.fogSyncSky = lower.fogSyncSky;
}
```

**Step 3: Add sky color values to DEFAULT_DAY_CYCLE_KEYFRAMES**

Add sensible `skyGradientTop` and `skyGradientBottom` values to the default keyframes:

- Midnight: top dark navy, bottom dark navy
- Dawn: top deep blue, bottom warm orange
- Morning: top light blue, bottom pale yellow
- Noon: top bright blue, bottom white
- Afternoon: top blue, bottom warm
- Dusk: top purple, bottom orange-red
- Night: top dark, bottom dark

**Step 4: Write test for sky field interpolation**

```typescript
test('interpolates skyGradientTop and skyGradientBottom', () => {
	const keyframes: readonly TimeKeyframe[] = [
		{ time: 0, skyGradientTop: { r: 0, g: 0, b: 0.1, a: 1 }, skyGradientBottom: { r: 0, g: 0, b: 0.05, a: 1 } },
		{ time: 12, skyGradientTop: { r: 0.3, g: 0.5, b: 0.9, a: 1 }, skyGradientBottom: { r: 0.9, g: 0.9, b: 1, a: 1 } },
	];
	const result = interpolateKeyframes(keyframes, 6, 'linear');
	expect(result.ok).toBe(true);
	if (!result.ok) return;
	// At time 6 (halfway), should be ~50% blend
	expect(result.data.skyGradientTop?.r).toBeGreaterThan(0.1);
	expect(result.data.skyGradientTop?.b).toBeGreaterThan(0.4);
});
```

**Step 5: Run tests**

```bash
cd packages/products/webforge/runtime &&npx vitest run src/rendering/day-night-cycle.test.ts
```

**Step 6: Run QA**

```bash
cd packages/products/webforge/runtime &&pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

**Step 7: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/day-night-cycle.ts packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts
git commit -m "feat(daynight): add sky color interpolation fields to day/night cycle"
```

---

## Summary

| Task | Feature | Tests |
|------|---------|-------|
| 1 | Schema: ParallaxLayer + BlendMode/LayerType | Existing pass |
| 2 | Schema: SkyConfig + Stars | Existing pass |
| 3 | Schema: TimeKeyframe sky fields | Existing pass |
| 4 | Fix gradient sky (1×256 texture) | ~5 new tests |
| 5 | Real SkyMaterial | ~1 new test |
| 6 | Parallax expansion (auto-scroll, foreground, blend, tint, depth) | ~5 new tests |
| 7 | Runtime layer management API | ~5 new tests |
| 8 | Day/night sky integration | ~3 new tests |
| 9 | Star field | ~4 new tests |
| 10 | Index.ts exports | Full suite pass |
| 11 | Dev harness: parallax controls | Visual only |
| 12 | Dev harness: procedural + stars | Visual only |
| 13 | Visual verification | Manual check |
| 14 | Day/night interpolation for sky fields | ~2 new tests |

**Estimated new tests: ~25-30**
**Total after expansion: ~970+ tests**
