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
 *
 * @example
 * ```typescript
 * const result = createGlowLayer({ scene, config: { enabled: true, intensity: 0.8 } });
 * if (!result.ok) return result;
 * // result.data is a BABYLON.GlowLayer
 * ```
 */
export function createGlowLayer(options: CreateGlowLayerOptions): BabylonResult<BABYLON.GlowLayer> {
  try {
    const { scene, config } = options;
    const blurKernelSize: Num = (config.blurKernelSize ?? 32) as Num;
    const mainTextureRatio: Num = (config.mainTextureRatio ?? 0.5) as Num;
    const mainTextureSamples: Num = (config.mainTextureSamples ?? 1) as Num;
    const ldrMerge: Bool = (config.ldrMerge ?? false) as Bool;

    const glowOptions: Partial<BABYLON.IGlowLayerOptions> = {
      blurKernelSize,
      mainTextureRatio,
      mainTextureSamples,
      ldrMerge,
    };

    // Fixed size overrides ratio
    if (config.mainTextureFixedSize !== undefined) {
      glowOptions.mainTextureFixedSize = config.mainTextureFixedSize;
    }

    const glowLayer: BABYLON.GlowLayer = new BABYLON.GlowLayer('storylyne-glow', scene, glowOptions);

    glowLayer.intensity = config.intensity ?? 0.5;

    // Apply neutral color if provided and not default
    if (config.neutralColor && config.neutralColor !== '#000000ff') {
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
 *
 * @example
 * ```typescript
 * const result = updateGlowLayer({
 *   glowLayer,
 *   config: { intensity: 1.0, blurKernelSize: 64 },
 *   previousConfig: { intensity: 0.5, blurKernelSize: 32 },
 * });
 * if (!result.ok) return result;
 * if (result.data.needsRecreate) { // dispose and recreate }
 * ```
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
 *
 * @example
 * ```typescript
 * const result = disposeGlowLayer({ glowLayer });
 * if (!result.ok) return result;
 * ```
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
 * The mesh will not emit or receive glow from this layer.
 *
 * @param options - Glow layer and mesh to exclude.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * excludeMeshFromGlow({ glowLayer, mesh: groundMesh });
 * ```
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
 *
 * @example
 * ```typescript
 * includeOnlyMeshInGlow({ glowLayer, mesh: heroMesh });
 * ```
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
 *
 * @example
 * ```typescript
 * removeMeshFromGlow({ glowLayer, mesh });
 * ```
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
 * This is a legacy defensive measure — the dev harness now renders
 * overlay meshes (grid, selection highlight, border, fill) in a
 * UtilityLayerRenderer scene that is immune to all post-processing
 * including glow. This function is retained for any future meshes
 * that might use renderingGroupId 3 in the main scene.
 *
 * @param options - Glow layer and scene to scan.
 * @returns BabylonResult containing the count of excluded meshes.
 *
 * @example
 * ```typescript
 * const result = excludeUiMeshes({ glowLayer, scene });
 * if (!result.ok) return result;
 * console.log(`Excluded ${result.data} UI meshes from glow`);
 * ```
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
 *
 * @example
 * ```typescript
 * setCustomEmissiveColor({
 *   glowLayer,
 *   color: new BABYLON.Color4(1, 0, 0, 1),
 * });
 * ```
 */
export function setCustomEmissiveColor(
  options: SetCustomEmissiveColorOptions,
): BabylonResult<Bool> {
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
 *
 * @example
 * ```typescript
 * clearCustomEmissiveColor({ glowLayer });
 * ```
 */
export function clearCustomEmissiveColor(
  options: ClearCustomEmissiveColorOptions,
): BabylonResult<Bool> {
  try {
    // Babylon.js expects null to clear the selector — the typed getter
    // returns the function signature, so we cast through unknown.
    const layer: Record<string, unknown> = options.glowLayer as unknown as Record<string, unknown>;
    layer['customEmissiveColorSelector'] = null;
    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}
