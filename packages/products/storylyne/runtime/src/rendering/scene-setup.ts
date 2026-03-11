/**
 * Scene setup rendering.
 *
 * Applies default scene environment settings: clear color, ambient color,
 * fog, and hemispheric light. Maps the `SceneSetupConfig` schema to
 * Babylon.js scene properties.
 *
 * @example
 * ```typescript
 * import { applySceneSetup } from './scene-setup';
 *
 * const result = applySceneSetup(scene, {});
 * if (!result.ok) return result;
 * // Scene now has dark blue-gray background, ambient light, hemispheric light
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type DeepReadonly, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { SceneSetupConfigSchema, type SceneSetupConfig } from '../schemas/scene-setup-config';
import type { FogConfig } from '../schemas/fog-config';

// =============================================================================
// Fog Mode Mapping
// =============================================================================

/** Maps fog mode string to Babylon.js FOGMODE constant. */
const FOG_MODE_MAP: Readonly<Record<string, number>> = {
  none: BABYLON.Scene.FOGMODE_NONE,
  linear: BABYLON.Scene.FOGMODE_LINEAR,
  exponential: BABYLON.Scene.FOGMODE_EXP,
  exponential2: BABYLON.Scene.FOGMODE_EXP2,
};

// =============================================================================
// Scene Setup
// =============================================================================

/**
 * Applies scene environment settings from a config object.
 *
 * Sets clear color, ambient color, fog, and optionally creates a default
 * hemispheric light with the specified intensity and ground color.
 *
 * @param scene - The Babylon.js scene to configure.
 * @param config - Raw scene setup configuration (validated internally).
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * // All defaults
 * applySceneSetup(scene, {});
 *
 * // Custom — no light, linear fog
 * applySceneSetup(scene, {
 *   defaultLight: false,
 *   fog: { mode: 'linear', start: 10, end: 100 },
 * });
 * ```
 */
export function applySceneSetup(scene: BABYLON.Scene, config: unknown): Result<Bool> {
  const parsed: Result<SceneSetupConfig> = safeParse(SceneSetupConfigSchema, config);
  if (!parsed.ok) return parsed;
  const cfg: DeepReadonly<SceneSetupConfig> = parsed.data;

  try {
    // Clear color (Color4)
    scene.clearColor = new BABYLON.Color4(
      cfg.clearColor.r,
      cfg.clearColor.g,
      cfg.clearColor.b,
      cfg.clearColor.a,
    );

    // Ambient color (Color3)
    scene.ambientColor = new BABYLON.Color3(
      cfg.ambientColor.r,
      cfg.ambientColor.g,
      cfg.ambientColor.b,
    );

    // Fog
    if (cfg.fog) {
      applyFog(scene, cfg.fog);
    }

    // Default hemispheric light
    if (cfg.defaultLight) {
      const light: BABYLON.HemisphericLight = new BABYLON.HemisphericLight(
        'default-light',
        new BABYLON.Vector3(0, 1, 0),
        scene,
      );
      light.intensity = cfg.defaultLightIntensity;
      light.groundColor = new BABYLON.Color3(
        cfg.defaultLightGroundColor.r,
        cfg.defaultLightGroundColor.g,
        cfg.defaultLightGroundColor.b,
      );
    }

    return okUnchecked(true as Bool);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

/**
 * Applies fog settings to the scene.
 *
 * @param scene - The Babylon.js scene to configure fog on.
 * @param fog - The validated fog configuration.
 */
function applyFog(scene: BABYLON.Scene, fog: DeepReadonly<FogConfig>): void {
  const mode: number | undefined = FOG_MODE_MAP[fog.mode];
  scene.fogMode = mode ?? BABYLON.Scene.FOGMODE_NONE;

  scene.fogColor = new BABYLON.Color3(fog.color.r, fog.color.g, fog.color.b);
  scene.fogDensity = fog.density;
  scene.fogStart = fog.start;
  scene.fogEnd = fog.end;
}
