# Glow Layer Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the GlowLayer system from a basic 4-field create/update/dispose into a full-featured glow engine with quality presets, mesh management (include/exclude with dev harness UI), custom emissive color override, automatic exclusion of UI overlays, and comprehensive dev harness controls.

**Architecture:** Expand `GlowLayerConfigSchema` with new fields (samples, fixed size, LDR merge, neutral color). Add `GLOW_QUALITY_PRESETS` constant. Rewrite `updateGlowLayer` to handle blur/enabled changes and detect constructor-only param changes needing recreate. Add mesh management functions. Add `customEmissiveColorSelector` support. Exclude renderingGroupId=3 (UI) meshes automatically. Full dev harness integration with ~12 controls including mesh category toggles.

**Tech Stack:** TypeScript, Valibot, Babylon.js GlowLayer API, Vitest, dev harness (vanilla DOM)

---

## Shared Context

All file paths are relative to `packages/products/webforge/runtime/`.

**Key files:**
- Schema: `src/schemas/lighting-config.ts` (GlowLayerConfigSchema at line 784)
- Manager: `src/rendering/glow-manager.ts` (114 lines — create/update/dispose)
- Tests: `src/rendering/glow-manager.test.ts` (105 lines — 3 basic tests)
- Light manager integration: `src/rendering/light-manager.ts` (glow creation at line 454-464, LightingInstance type at line 69-75)
- Dev harness UI: `dev/dev.ts` (buildGlowDetailsUI at line 3332, toggleGlow at line 1628)
- Dev harness HTML: `dev/index.html` (glow section at line 910-919)
- Index exports: `src/index.ts` (glow exports at line 370-375)
- README: `README.md`

**Test infrastructure:**
```typescript
import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import { applySceneSetup } from './scene-setup';
```

**Result pattern:**
```typescript
import { ERRORS, err, okUnchecked } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';
import { okShallow, type BabylonResult } from '../core/babylon-result';
```

**Dev harness helpers available:** `createSliderRow(label, min, max, step, value, onChange, dataControl?)`, `createToggleRow(label, initialOn, onChange, dataControl?)`, `createSubHeader(text)`, `createColorPickerRow(label, presets, initialHex, onChange)`, `createCollapsibleGroup(title, collapsed)`.

**QA commands (run after EVERY file edit):**
```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

**Test command:**
```bash
cd packages/products/webforge/runtime && pnpm qa:test
```

---

## Task 1: Expand GlowLayerConfigSchema + Quality Presets

**Files:**
- Modify: `src/schemas/lighting-config.ts:784-796`
- Modify: `src/rendering/glow-manager.test.ts`

### Step 1: Write failing tests for new schema fields

Add to `glow-manager.test.ts`, in a new `describe('GlowLayerConfigSchema')` block before the existing `createGlowLayer` block. Import `safeParse` from `@/utils/result/safe` and `GlowLayerConfigSchema` + `GLOW_QUALITY_PRESETS` from the schema file.

```typescript
import { safeParse } from '@/utils/result/safe';
import { GlowLayerConfigSchema, GLOW_QUALITY_PRESETS } from '../schemas/lighting-config';

describe('GlowLayerConfigSchema', () => {
	test('validates default config', () => {
		const result = safeParse(GlowLayerConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.intensity).toBe(0.5);
		expect(result.data.blurKernelSize).toBe(32);
		expect(result.data.mainTextureRatio).toBe(0.5);
		expect(result.data.mainTextureSamples).toBe(1);
		expect(result.data.ldrMerge).toBe(false);
	});

	test('validates mainTextureSamples within range', () => {
		const valid = safeParse(GlowLayerConfigSchema, { mainTextureSamples: 4 });
		expect(valid.ok).toBe(true);
		const invalid = safeParse(GlowLayerConfigSchema, { mainTextureSamples: 8 });
		expect(invalid.ok).toBe(false);
	});

	test('validates mainTextureFixedSize enum values', () => {
		for (const size of [256, 512, 1024, 2048]) {
			const result = safeParse(GlowLayerConfigSchema, { mainTextureFixedSize: size });
			expect(result.ok).toBe(true);
		}
		const invalid = safeParse(GlowLayerConfigSchema, { mainTextureFixedSize: 100 });
		expect(invalid.ok).toBe(false);
	});

	test('validates ldrMerge boolean', () => {
		const result = safeParse(GlowLayerConfigSchema, { ldrMerge: true });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ldrMerge).toBe(true);
	});

	test('validates neutralColor hex string', () => {
		const valid = safeParse(GlowLayerConfigSchema, { neutralColor: '#ff00ff80' });
		expect(valid.ok).toBe(true);
		const short = safeParse(GlowLayerConfigSchema, { neutralColor: '#abc' });
		expect(short.ok).toBe(false);
	});
});

describe('GLOW_QUALITY_PRESETS', () => {
	test('has low/medium/high/ultra presets', () => {
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('low');
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('medium');
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('high');
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('ultra');
	});

	test('presets have increasing quality', () => {
		expect(GLOW_QUALITY_PRESETS.low.mainTextureRatio).toBeLessThan(
			GLOW_QUALITY_PRESETS.medium.mainTextureRatio,
		);
		expect(GLOW_QUALITY_PRESETS.medium.mainTextureRatio).toBeLessThan(
			GLOW_QUALITY_PRESETS.high.mainTextureRatio,
		);
		expect(GLOW_QUALITY_PRESETS.high.mainTextureRatio).toBeLessThan(
			GLOW_QUALITY_PRESETS.ultra.mainTextureRatio,
		);
	});

	test('each preset validates against schema', () => {
		for (const [, preset] of Object.entries(GLOW_QUALITY_PRESETS)) {
			const result = safeParse(GlowLayerConfigSchema, preset);
			expect(result.ok).toBe(true);
		}
	});
});
```

### Step 2: Run tests to verify they fail

```bash
cd packages/products/webforge/runtime && pnpm qa:test -- --run src/rendering/glow-manager.test.ts
```

Expected: FAIL — `mainTextureSamples`, `ldrMerge`, `mainTextureFixedSize`, `neutralColor` don't exist on schema; `GLOW_QUALITY_PRESETS` doesn't exist.

### Step 3: Implement schema changes + quality presets

In `src/schemas/lighting-config.ts`, replace the current `GlowLayerConfigSchema` (lines 784-793) with:

```typescript
/** Valid fixed sizes for glow render target. */
export const GlowTextureFixedSizeSchema = v.picklist([256, 512, 1024, 2048]);

/** Inferred fixed-size type. */
export type GlowTextureFixedSize = v.InferOutput<typeof GlowTextureFixedSizeSchema>;

/**
 * Glow layer configuration.
 *
 * Global GlowLayer effect (separate from bloom post-process).
 * Used for magical effects, torch glow, and emissive highlights.
 *
 * Constructor-only fields (`mainTextureRatio`, `mainTextureFixedSize`,
 * `mainTextureSamples`, `ldrMerge`, `neutralColor`) require a full
 * recreate when changed at runtime.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { GlowLayerConfigSchema } from './lighting-config';
 *
 * const result = safeParse(GlowLayerConfigSchema, {
 *   enabled: true, intensity: 0.3, blurKernelSize: 32,
 * });
 * ```
 */
export const GlowLayerConfigSchema = v.strictObject({
	/** Whether glow is enabled. Default: false. */
	enabled: v.optional(v.boolean(), false),
	/** Glow intensity [0, 5]. Default: 0.5. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 0.5),
	/** Blur kernel size [1, 256]. Default: 32. */
	blurKernelSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(256)), 32),
	/** Glow render target resolution ratio (0, 1]. Default: 0.5. Constructor-only. */
	mainTextureRatio: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(1)), 0.5),
	/** Fixed render target size (overrides ratio when set). Constructor-only. */
	mainTextureFixedSize: v.optional(GlowTextureFixedSizeSchema),
	/** MSAA samples on glow render target [1, 4]. Default: 1. Constructor-only. */
	mainTextureSamples: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4)), 1),
	/** Use LDR merge mode instead of HDR additive. Better for stylized/2D. Default: false. Constructor-only. */
	ldrMerge: v.optional(v.boolean(), false),
	/** Neutral "no glow" color as 8-char hex (#RRGGBBAA). Default: '#000000ff'. Constructor-only. */
	neutralColor: v.optional(
		v.pipe(v.string(), v.regex(/^#[\da-fA-F]{8}$/)),
		'#000000ff',
	),
});

/** Inferred glow layer config type from {@link GlowLayerConfigSchema}. */
export type GlowLayerConfig = v.InferOutput<typeof GlowLayerConfigSchema>;

/** Glow quality preset name. */
export const GlowQualityPresetNameSchema = v.picklist(['low', 'medium', 'high', 'ultra']);

/** Inferred glow quality preset name type. */
export type GlowQualityPresetName = v.InferOutput<typeof GlowQualityPresetNameSchema>;

/**
 * Quality presets for glow layer.
 *
 * | Preset | Ratio | Blur | Samples |
 * |--------|-------|------|---------|
 * | low    | 0.25  | 16   | 1       |
 * | medium | 0.5   | 32   | 1       |
 * | high   | 0.75  | 48   | 2       |
 * | ultra  | 1.0   | 64   | 4       |
 */
export const GLOW_QUALITY_PRESETS: Readonly<
	Record<GlowQualityPresetName, { readonly mainTextureRatio: number; readonly blurKernelSize: number; readonly mainTextureSamples: number }>
> = {
	low: { mainTextureRatio: 0.25, blurKernelSize: 16, mainTextureSamples: 1 },
	medium: { mainTextureRatio: 0.5, blurKernelSize: 32, mainTextureSamples: 1 },
	high: { mainTextureRatio: 0.75, blurKernelSize: 48, mainTextureSamples: 2 },
	ultra: { mainTextureRatio: 1.0, blurKernelSize: 64, mainTextureSamples: 4 },
};
```

### Step 4: Run tests to verify they pass

```bash
cd packages/products/webforge/runtime && pnpm qa:test -- --run src/rendering/glow-manager.test.ts
```

Expected: ALL PASS.

### Step 5: Run QA

```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 6: Commit

```bash
git add src/schemas/lighting-config.ts src/rendering/glow-manager.test.ts
git commit -m "feat(glow): expand GlowLayerConfigSchema with samples, fixed size, LDR merge, neutral color + quality presets"
```

---

## Task 2: Rewrite glow-manager.ts — Full Update + Recreate Detection + Mesh Management

**Files:**
- Modify: `src/rendering/glow-manager.ts`
- Modify: `src/rendering/glow-manager.test.ts`

### Step 1: Write failing tests for expanded glow-manager

Add these test blocks to `glow-manager.test.ts`:

```typescript
describe('createGlowLayer — new constructor options', () => {
	test('applies mainTextureSamples', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, mainTextureSamples: 4 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Babylon.js GlowLayer stores samples internally — verify via the layer existing
		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies ldrMerge option', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, ldrMerge: true },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies mainTextureFixedSize', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, mainTextureFixedSize: 512 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies neutralColor', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, neutralColor: '#ff000080' },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.neutralColor).toBeDefined();
	});
});

describe('updateGlowLayer — expanded', () => {
	test('updates blurKernelSize', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, blurKernelSize: 32 },
		});
		if (!createResult.ok) throw new Error('Failed');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { blurKernelSize: 64 },
		});
		expect(updateResult.ok).toBe(true);
		expect(createResult.data.blurKernelSize).toBe(64);
	});

	test('updates isEnabled', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		expect(createResult.data.isEnabled).toBe(true);
		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { enabled: false },
		});
		expect(updateResult.ok).toBe(true);
		expect(createResult.data.isEnabled).toBe(false);
	});

	test('detects constructor-only change needing recreate', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, mainTextureRatio: 0.5 },
		});
		if (!createResult.ok) throw new Error('Failed');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { mainTextureRatio: 0.75 },
			previousConfig: { mainTextureRatio: 0.5 },
		});
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;
		expect(updateResult.data.needsRecreate).toBe(true);
	});

	test('no recreate needed for runtime-only changes', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.5 },
		});
		if (!createResult.ok) throw new Error('Failed');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { intensity: 1.0 },
			previousConfig: { intensity: 0.5 },
		});
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;
		expect(updateResult.data.needsRecreate).toBe(false);
	});
});

describe('mesh management', () => {
	test('excludeMeshFromGlow excludes a mesh', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const mesh = BABYLON.MeshBuilder.CreateGround('test-mesh', { width: 1, height: 1 }, instance.scene);
		const result = excludeMeshFromGlow({ glowLayer: createResult.data, mesh });
		expect(result.ok).toBe(true);
	});

	test('includeOnlyMeshInGlow includes a mesh', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const mesh = BABYLON.MeshBuilder.CreateGround('test-mesh', { width: 1, height: 1 }, instance.scene);
		const result = includeOnlyMeshInGlow({ glowLayer: createResult.data, mesh });
		expect(result.ok).toBe(true);
	});

	test('removeMeshFromGlow removes exclusion/inclusion', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const mesh = BABYLON.MeshBuilder.CreateGround('test-mesh', { width: 1, height: 1 }, instance.scene);
		excludeMeshFromGlow({ glowLayer: createResult.data, mesh });
		const result = removeMeshFromGlow({ glowLayer: createResult.data, mesh });
		expect(result.ok).toBe(true);
	});

	test('excludeUiMeshes excludes all renderingGroupId=3 meshes', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const uiMesh = BABYLON.MeshBuilder.CreateGround('ui-mesh', { width: 1, height: 1 }, instance.scene);
		uiMesh.renderingGroupId = 3;
		const normalMesh = BABYLON.MeshBuilder.CreateGround('normal-mesh', { width: 1, height: 1 }, instance.scene);
		normalMesh.renderingGroupId = 2;

		const result = excludeUiMeshes({ glowLayer: createResult.data, scene: instance.scene });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeGreaterThan(0); // at least 1 excluded
	});
});

describe('custom emissive color selector', () => {
	test('setCustomEmissiveColor sets the selector', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const result = setCustomEmissiveColor({
			glowLayer: createResult.data,
			color: new BABYLON.Color4(1, 0, 0, 1),
		});
		expect(result.ok).toBe(true);
		expect(createResult.data.customEmissiveColorSelector).toBeDefined();
	});

	test('clearCustomEmissiveColor removes the selector', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		setCustomEmissiveColor({
			glowLayer: createResult.data,
			color: new BABYLON.Color4(1, 0, 0, 1),
		});
		const result = clearCustomEmissiveColor({ glowLayer: createResult.data });
		expect(result.ok).toBe(true);
		expect(createResult.data.customEmissiveColorSelector).toBeNull();
	});
});
```

Update imports at the top:
```typescript
import {
	createGlowLayer,
	updateGlowLayer,
	disposeGlowLayer,
	excludeMeshFromGlow,
	includeOnlyMeshInGlow,
	removeMeshFromGlow,
	excludeUiMeshes,
	setCustomEmissiveColor,
	clearCustomEmissiveColor,
} from './glow-manager';
```

### Step 2: Run tests to verify they fail

```bash
cd packages/products/webforge/runtime && pnpm qa:test -- --run src/rendering/glow-manager.test.ts
```

Expected: FAIL — new functions don't exist, `updateGlowLayer` signature changed.

### Step 3: Implement the expanded glow-manager.ts

Rewrite `src/rendering/glow-manager.ts` entirely:

```typescript
/**
 * Glow manager — creates, updates, disposes, and configures a GlowLayer.
 *
 * GlowLayer is a global post-processing effect separate from bloom.
 * It adds an emissive glow around bright materials and meshes.
 *
 * Supports:
 * - Full constructor option pass-through (ratio, fixed size, samples, LDR merge, neutral color)
 * - Runtime updates for intensity, blurKernelSize, isEnabled
 * - Constructor-only change detection (returns `needsRecreate` flag)
 * - Mesh management (exclude, include-only, remove, UI mesh auto-exclusion)
 * - Custom emissive color selector override
 *
 * @example
 * ```typescript
 * import { createGlowLayer, updateGlowLayer, excludeUiMeshes } from './glow-manager';
 *
 * const result = createGlowLayer({ scene, config: glowConfig });
 * if (!result.ok) return result;
 * excludeUiMeshes({ glowLayer: result.data, scene });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { GlowLayerConfig } from '../schemas/lighting-config';

// =============================================================================
// Create
// =============================================================================

/** Options for creating a glow layer. */
type CreateGlowLayerOptions = {
	readonly scene: BABYLON.Scene;
	readonly config: Partial<GlowLayerConfig>;
};

/**
 * Creates a GlowLayer on the scene.
 *
 * Passes all constructor-only options (ratio, fixed size, samples, LDR merge)
 * and applies runtime options (intensity) after construction.
 *
 * @param options - Scene and glow configuration.
 * @returns BabylonResult containing the glow layer.
 */
export function createGlowLayer(options: CreateGlowLayerOptions): BabylonResult<BABYLON.GlowLayer> {
	try {
		const { scene, config } = options;
		const blurKernelSize: Num = (config.blurKernelSize ?? 32) as Num;
		const mainTextureRatio: Num = (config.mainTextureRatio ?? 0.5) as Num;
		const mainTextureSamples: Num = (config.mainTextureSamples ?? 1) as Num;
		const ldrMerge: Bool = (config.ldrMerge ?? false) as Bool;

		const glowOptions: Partial<BABYLON.GlowLayerOptions> = {
			blurKernelSize,
			mainTextureRatio,
			mainTextureSamples,
			ldrMerge,
		};

		// Fixed size overrides ratio
		if (config.mainTextureFixedSize !== undefined) {
			glowOptions.mainTextureFixedSize = config.mainTextureFixedSize;
		}

		const glowLayer: BABYLON.GlowLayer = new BABYLON.GlowLayer('webforge-glow', scene, glowOptions);

		glowLayer.intensity = config.intensity ?? 0.5;

		// Apply neutral color if provided
		if (config.neutralColor) {
			glowLayer.neutralColor = BABYLON.Color4.FromHexString(config.neutralColor);
		}

		return okShallow(glowLayer);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Update
// =============================================================================

/** Result of an update operation. */
type GlowUpdateResult = {
	readonly needsRecreate: Bool;
};

/** Options for updating a glow layer. */
type UpdateGlowLayerOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
	readonly config: Partial<GlowLayerConfig>;
	readonly previousConfig?: Partial<GlowLayerConfig>;
};

/** Constructor-only config keys that require dispose+recreate when changed. */
const CONSTRUCTOR_ONLY_KEYS: ReadonlyArray<keyof GlowLayerConfig> = [
	'mainTextureRatio',
	'mainTextureFixedSize',
	'mainTextureSamples',
	'ldrMerge',
	'neutralColor',
];

/**
 * Updates an existing GlowLayer's runtime properties.
 *
 * Handles intensity, blurKernelSize, and isEnabled at runtime.
 * Detects constructor-only changes and returns `needsRecreate: true`
 * if the caller should dispose and recreate the layer.
 *
 * @param options - The glow layer, new config, and optional previous config.
 * @returns BabylonResult containing whether a recreate is needed.
 */
export function updateGlowLayer(options: UpdateGlowLayerOptions): BabylonResult<GlowUpdateResult> {
	try {
		const { glowLayer, config, previousConfig } = options;

		// Runtime-updatable properties
		if (config.intensity !== undefined) {
			glowLayer.intensity = config.intensity;
		}
		if (config.blurKernelSize !== undefined) {
			glowLayer.blurKernelSize = config.blurKernelSize;
		}
		if (config.enabled !== undefined) {
			glowLayer.isEnabled = config.enabled;
		}

		// Detect constructor-only changes
		let needsRecreate: Bool = false as Bool;
		if (previousConfig) {
			for (const key of CONSTRUCTOR_ONLY_KEYS) {
				const prev: unknown = previousConfig[key];
				const next: unknown = config[key];
				if (next !== undefined && prev !== undefined && next !== prev) {
					needsRecreate = true as Bool;
					break;
				}
			}
		}

		return okShallow({ needsRecreate });
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Dispose
// =============================================================================

/** Options for disposing a glow layer. */
type DisposeGlowLayerOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
};

/**
 * Disposes a GlowLayer and its resources.
 *
 * @param options - The glow layer to dispose.
 * @returns BabylonResult indicating success.
 */
export function disposeGlowLayer(options: DisposeGlowLayerOptions): BabylonResult<Bool> {
	try {
		options.glowLayer.dispose();
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Mesh Management
// =============================================================================

/** Options for mesh management operations. */
type MeshGlowOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
	readonly mesh: BABYLON.Mesh;
};

/**
 * Excludes a mesh from glow rendering.
 *
 * @param options - Glow layer and mesh to exclude.
 * @returns BabylonResult indicating success.
 */
export function excludeMeshFromGlow(options: MeshGlowOptions): BabylonResult<Bool> {
	try {
		options.glowLayer.addExcludedMesh(options.mesh);
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Adds a mesh to the include-only list (whitelist mode).
 *
 * When any mesh is added via this method, ONLY included meshes glow.
 *
 * @param options - Glow layer and mesh to include.
 * @returns BabylonResult indicating success.
 */
export function includeOnlyMeshInGlow(options: MeshGlowOptions): BabylonResult<Bool> {
	try {
		options.glowLayer.addIncludedOnlyMesh(options.mesh);
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Removes a mesh from both the excluded and included-only lists.
 *
 * Returns the mesh to default glow behavior.
 *
 * @param options - Glow layer and mesh to remove from lists.
 * @returns BabylonResult indicating success.
 */
export function removeMeshFromGlow(options: MeshGlowOptions): BabylonResult<Bool> {
	try {
		options.glowLayer.removeExcludedMesh(options.mesh);
		options.glowLayer.removeIncludedOnlyMesh(options.mesh);
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/** Options for excluding UI meshes. */
type ExcludeUiMeshesOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
	readonly scene: BABYLON.Scene;
};

/**
 * Excludes all UI overlay meshes (renderingGroupId=3) from glow.
 *
 * Scans all scene meshes and excludes any with renderingGroupId 3.
 * This prevents grid overlays, selection highlights, and other dev
 * tooling from being affected by the glow layer.
 *
 * @param options - Glow layer and scene to scan.
 * @returns BabylonResult containing the count of excluded meshes.
 */
export function excludeUiMeshes(options: ExcludeUiMeshesOptions): BabylonResult<Num> {
	try {
		const { glowLayer, scene } = options;
		let count: Num = 0 as Num;

		for (const mesh of scene.meshes) {
			if (mesh.renderingGroupId === 3 && mesh instanceof BABYLON.Mesh) {
				glowLayer.addExcludedMesh(mesh);
				count = (count + 1) as Num;
			}
		}

		return okShallow(count);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Custom Emissive Color Selector
// =============================================================================

/** Options for setting custom emissive color. */
type SetCustomEmissiveColorOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
	readonly color: BABYLON.Color4;
};

/**
 * Sets a custom emissive color selector on the glow layer.
 *
 * This overrides the emissive color used for glow computation,
 * allowing non-emissive meshes (like tilemap chunks) to glow
 * with the specified color.
 *
 * @param options - Glow layer and color to use.
 * @returns BabylonResult indicating success.
 */
export function setCustomEmissiveColor(options: SetCustomEmissiveColorOptions): BabylonResult<Bool> {
	try {
		const { glowLayer, color } = options;
		glowLayer.customEmissiveColorSelector = (
			_mesh: BABYLON.Mesh,
			_subMesh: BABYLON.SubMesh,
			_material: BABYLON.Material,
			result: BABYLON.Color4,
		): void => {
			result.set(color.r, color.g, color.b, color.a);
		};
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/** Options for clearing custom emissive color. */
type ClearCustomEmissiveColorOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
};

/**
 * Clears the custom emissive color selector, reverting to material-based glow.
 *
 * @param options - Glow layer to clear.
 * @returns BabylonResult indicating success.
 */
export function clearCustomEmissiveColor(options: ClearCustomEmissiveColorOptions): BabylonResult<Bool> {
	try {
		options.glowLayer.customEmissiveColorSelector = null;
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}
```

### Step 4: Run tests to verify they pass

```bash
cd packages/products/webforge/runtime && pnpm qa:test -- --run src/rendering/glow-manager.test.ts
```

Expected: ALL PASS.

### Step 5: Run QA

```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 6: Commit

```bash
git add src/rendering/glow-manager.ts src/rendering/glow-manager.test.ts
git commit -m "feat(glow): rewrite glow-manager with full update, recreate detection, mesh management, and custom emissive"
```

---

## Task 3: Update light-manager.ts Integration + LightingInstance

**Files:**
- Modify: `src/rendering/light-manager.ts:454-464,69-75`

### Step 1: Update LightingInstance type

No separate test needed — this is a type-level change that existing tests cover. Update the `LightingInstance` type (line 69) to store the scene reference and config for potential recreate:

The `LightingInstance` already has `scene` and `config` fields. No change needed to the type.

### Step 2: Update glow creation to pass new options + auto-exclude UI meshes

In `createLighting` (line 454-464), update the glow creation block:

```typescript
		// Create glow layer (non-fatal)
		let glowLayer: BABYLON.GlowLayer | null = null;
		if (config.glow?.enabled) {
			const glowResult = createGlowLayer({
				scene: options.scene,
				config: config.glow,
			});
			if (glowResult.ok) {
				glowLayer = glowResult.data;
				// Auto-exclude UI overlay meshes (renderingGroupId=3)
				excludeUiMeshes({ glowLayer, scene: options.scene });
			}
		}
```

Add `excludeUiMeshes` to the imports from `./glow-manager`:
```typescript
import { createGlowLayer, excludeUiMeshes } from './glow-manager';
```

### Step 3: Run QA + tests

```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
cd packages/products/webforge/runtime && pnpm qa:test
```

### Step 4: Commit

```bash
git add src/rendering/light-manager.ts
git commit -m "feat(glow): auto-exclude UI meshes on glow layer creation"
```

---

## Task 4: Update index.ts Exports

**Files:**
- Modify: `src/index.ts:370-375`

### Step 1: Update glow exports

Replace the current glow export block (lines 370-375) with:

```typescript
// Glow manager
export {
	createGlowLayer,
	updateGlowLayer,
	disposeGlowLayer,
	excludeMeshFromGlow,
	includeOnlyMeshInGlow,
	removeMeshFromGlow,
	excludeUiMeshes,
	setCustomEmissiveColor,
	clearCustomEmissiveColor,
} from './rendering/glow-manager';
```

Also add the new schema exports. In the lighting schema export block (around line 272), add:

```typescript
	GlowTextureFixedSizeSchema,
	GlowQualityPresetNameSchema,
	GLOW_QUALITY_PRESETS,
	type GlowTextureFixedSize,
	type GlowQualityPresetName,
```

### Step 2: Run QA

```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 3: Commit

```bash
git add src/index.ts
git commit -m "feat(glow): export new glow manager functions and schema types"
```

---

## Task 5: Dev Harness — Expanded Glow UI

**Files:**
- Modify: `dev/dev.ts:3332-3383` (buildGlowDetailsUI)
- Modify: `dev/dev.ts:1628-1634` (toggleGlow — may need update for recreate)

### Step 1: Rewrite buildGlowDetailsUI

Replace the current `buildGlowDetailsUI` function (lines 3332-3383) with a comprehensive version. Import the new functions at the top of dev.ts — add to existing glow imports:

```typescript
import {
	createGlowLayer,
	updateGlowLayer,
	disposeGlowLayer,
	excludeMeshFromGlow,
	includeOnlyMeshInGlow,
	removeMeshFromGlow,
	excludeUiMeshes,
	setCustomEmissiveColor,
	clearCustomEmissiveColor,
	GLOW_QUALITY_PRESETS,
	type GlowQualityPresetName,
} from '@webforge/runtime';
```

The new `buildGlowDetailsUI`:

```typescript
function buildGlowDetailsUI(debug: DevDebugApi): void {
	const container = document.querySelector('#glowdetails-body') as HTMLElement | null;
	const glow = debug.tilemap?.lighting?.glowLayer;
	if (!container) return;

	container.innerHTML = '';

	if (!glow) {
		const status = document.createElement('div');
		status.className = 'status-text';
		status.textContent = 'No glow layer configured';
		container.append(status);
		return;
	}

	// ── Basic Controls ──
	container.append(
		createToggleRow('Enabled', glow.isEnabled, (on) => { glow.isEnabled = on; }, 'glow-enabled'),
	);
	container.append(
		createSliderRow('Intensity', 0, 5, 0.05, glow.intensity, (v) => { glow.intensity = v; }, 'glow-intensity'),
	);
	container.append(
		createSliderRow('Blur Kernel', 1, 256, 1, glow.blurKernelSize, (v) => { glow.blurKernelSize = v; }, 'glow-blur-kernel'),
	);

	// ── Quality Presets ──
	container.append(createSubHeader('Quality Presets'));

	const presetRow = document.createElement('div');
	presetRow.className = 'control-row';
	presetRow.style.flexWrap = 'wrap';

	const presetLabel = document.createElement('span');
	presetLabel.className = 'control-label';
	presetLabel.textContent = 'Preset';

	const btnGroup = document.createElement('div');
	btnGroup.className = 'btn-group';
	btnGroup.style.flex = '1';
	btnGroup.style.justifyContent = 'flex-end';

	const presetNames: GlowQualityPresetName[] = ['low', 'medium', 'high', 'ultra'];
	for (const name of presetNames) {
		const btn = document.createElement('button');
		btn.className = 'btn';
		btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
		btn.dataset['preset'] = name;
		btn.addEventListener('click', () => {
			const preset = GLOW_QUALITY_PRESETS[name];
			// These are constructor-only — need recreate
			// For now, apply the runtime-changeable one (blur)
			glow.blurKernelSize = preset.blurKernelSize;
			// Update the blur slider
			const blurSlider = container.querySelector('[data-control="glow-blur-kernel"] input[type="range"]') as HTMLInputElement | null;
			if (blurSlider) {
				blurSlider.value = String(preset.blurKernelSize);
				const valEl = blurSlider.nextElementSibling as HTMLElement | null;
				if (valEl) valEl.textContent = String(preset.blurKernelSize);
			}
			// Mark active
			for (const b of btnGroup.querySelectorAll('.btn')) b.classList.remove('active');
			btn.classList.add('active');
		});
		btnGroup.append(btn);
	}

	presetRow.append(presetLabel, btnGroup);
	container.append(presetRow);

	// ── Custom Emissive Override ──
	container.append(createSubHeader('Custom Emissive Override'));

	let _emissiveOverrideEnabled = false;
	let _emissiveColor = '#ff6600';

	container.append(
		createToggleRow('Override Emissive', false, (on) => {
			_emissiveOverrideEnabled = on;
			if (on) {
				const c = BABYLON.Color4.FromHexString(_emissiveColor + 'ff');
				setCustomEmissiveColor({ glowLayer: glow, color: c });
			} else {
				clearCustomEmissiveColor({ glowLayer: glow });
			}
		}, 'glow-emissive-override'),
	);

	const GLOW_COLOR_PRESETS: readonly { readonly name: string; readonly hex: string }[] = [
		{ name: 'Orange', hex: '#ff6600' },
		{ name: 'Cyan', hex: '#00ffff' },
		{ name: 'Purple', hex: '#9933ff' },
		{ name: 'Gold', hex: '#ffcc00' },
		{ name: 'White', hex: '#ffffff' },
	];

	container.append(
		createColorPickerRow('Glow Color', GLOW_COLOR_PRESETS, _emissiveColor, (hex) => {
			_emissiveColor = hex;
			if (_emissiveOverrideEnabled) {
				const c = BABYLON.Color4.FromHexString(hex + 'ff');
				setCustomEmissiveColor({ glowLayer: glow, color: c });
			}
		}),
	);

	// ── Mesh Management ──
	container.append(createSubHeader('Mesh Glow Control'));

	// Categorize scene meshes
	const scene = debug.scene;
	const chunkMeshes: BABYLON.AbstractMesh[] = [];
	const uiMeshes: BABYLON.AbstractMesh[] = [];
	const otherMeshes: BABYLON.AbstractMesh[] = [];

	for (const mesh of scene.meshes) {
		if (mesh.name.startsWith('chunk-') || mesh.name.startsWith('cliff-')) {
			chunkMeshes.push(mesh);
		} else if (mesh.renderingGroupId === 3) {
			uiMeshes.push(mesh);
		} else if (
			mesh.name !== 'tilemap-ground-fill' &&
			!mesh.name.startsWith('sky-') &&
			!mesh.name.startsWith('BackgroundHelper') &&
			!mesh.name.startsWith('BackgroundPlane') &&
			mesh.name !== 'hdrSkyBox'
		) {
			otherMeshes.push(mesh);
		}
	}

	// Track exclusion state per category
	let _chunksExcluded = false;
	let _uiExcluded = true; // UI excluded by default

	container.append(
		createToggleRow(`Tilemap Chunks (${String(chunkMeshes.length)})`, true, (on) => {
			_chunksExcluded = !on;
			for (const mesh of chunkMeshes) {
				if (mesh instanceof BABYLON.Mesh) {
					if (on) {
						removeMeshFromGlow({ glowLayer: glow, mesh });
					} else {
						excludeMeshFromGlow({ glowLayer: glow, mesh });
					}
				}
			}
		}, 'glow-chunks'),
	);

	container.append(
		createToggleRow(`UI Overlays (${String(uiMeshes.length)})`, false, (on) => {
			_uiExcluded = !on;
			for (const mesh of uiMeshes) {
				if (mesh instanceof BABYLON.Mesh) {
					if (on) {
						removeMeshFromGlow({ glowLayer: glow, mesh });
					} else {
						excludeMeshFromGlow({ glowLayer: glow, mesh });
					}
				}
			}
		}, 'glow-ui'),
	);

	if (otherMeshes.length > 0) {
		container.append(
			createToggleRow(`Other Meshes (${String(otherMeshes.length)})`, true, (on) => {
				for (const mesh of otherMeshes) {
					if (mesh instanceof BABYLON.Mesh) {
						if (on) {
							removeMeshFromGlow({ glowLayer: glow, mesh });
						} else {
							excludeMeshFromGlow({ glowLayer: glow, mesh });
						}
					}
				}
			}, 'glow-other'),
		);
	}

	// Ground fill mesh
	const groundFill = scene.getMeshByName('tilemap-ground-fill');
	if (groundFill && groundFill instanceof BABYLON.Mesh) {
		container.append(
			createToggleRow('Ground Fill', true, (on) => {
				if (on) {
					removeMeshFromGlow({ glowLayer: glow, mesh: groundFill });
				} else {
					excludeMeshFromGlow({ glowLayer: glow, mesh: groundFill });
				}
			}, 'glow-ground'),
		);
	}
}
```

### Step 2: Run QA

```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 3: Commit

```bash
git add dev/dev.ts
git commit -m "feat(glow): expand dev harness with quality presets, emissive override, and mesh management controls"
```

---

## Task 6: Update README

**Files:**
- Modify: `README.md`

### Step 1: Update README

In the architecture tree, update the glow-manager line:
```
│   ├── glow-manager.ts           # GlowLayer lifecycle + mesh management + custom emissive
```

In the API table (Lighting section around line 256), replace the single `createGlowLayer` entry with:

```markdown
| `createGlowLayer(options)` | `BabylonResult<GlowLayer>` | Create glow layer with full constructor options |
| `updateGlowLayer(options)` | `BabylonResult<GlowUpdateResult>` | Update runtime props, detect constructor-only changes |
| `disposeGlowLayer(options)` | `BabylonResult<Bool>` | Dispose glow layer |
| `excludeMeshFromGlow(options)` | `BabylonResult<Bool>` | Exclude specific mesh from glow |
| `includeOnlyMeshInGlow(options)` | `BabylonResult<Bool>` | Whitelist-mode mesh inclusion |
| `removeMeshFromGlow(options)` | `BabylonResult<Bool>` | Remove mesh from exclude/include lists |
| `excludeUiMeshes(options)` | `BabylonResult<Num>` | Auto-exclude all renderingGroupId=3 meshes |
| `setCustomEmissiveColor(options)` | `BabylonResult<Bool>` | Override emissive color for glow computation |
| `clearCustomEmissiveColor(options)` | `BabylonResult<Bool>` | Revert to material-based glow |
```

Update the visual verification line at the bottom to mention glow mesh controls:
```
Visual verification: 32x32 tilemap with cascaded shadows, torch flicker, day/night cycle, glow layer with mesh controls, sky background, parallax layers, mouse orbit, FPS logging.
```

### Step 2: Run QA

```bash
cd packages/products/webforge/runtime && pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Step 3: Commit

```bash
git add README.md
git commit -m "docs(glow): update README with expanded glow API and mesh management"
```

---

## Task 7: Visual Verification

**Using Playwright MCP browser (visible to user).**

Verify each new control in the Glow section of the dev harness:

1. **Open Glow section** — click section header to expand
2. **Enabled toggle** — toggle off, confirm glow disappears; toggle on, confirm it returns
3. **Intensity slider** — slide from 0 to 5, confirm glow gets brighter
4. **Blur Kernel slider** — slide from 1 to 256, confirm glow spread changes
5. **Quality Preset buttons** — click Low/Medium/High/Ultra, confirm blur kernel updates
6. **Custom Emissive Override** — toggle on, confirm tilemap chunks start glowing with the selected color
7. **Glow Color presets** — click Orange/Cyan/Purple/Gold/White while override is on, confirm color changes
8. **Custom color picker** — pick a custom color, confirm it applies
9. **Tilemap Chunks toggle** — toggle off, confirm chunk meshes stop glowing
10. **UI Overlays toggle** — toggle on, confirm grid/selection meshes start glowing (undesirable but proves the control works); toggle off
11. **Ground Fill toggle** — toggle off/on
12. **Turn Override off** — confirm glow reverts to material-based (no visible glow on tilemap since tiles have no emissive)

---

## Implementation Order

1. Task 1 — Schema + Quality Presets (TDD)
2. Task 2 — Glow Manager Rewrite (TDD)
3. Task 3 — Light Manager Integration
4. Task 4 — Index Exports
5. Task 5 — Dev Harness UI
6. Task 6 — README
7. Task 7 — Visual Verification
