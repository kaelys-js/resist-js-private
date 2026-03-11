/**
 * Light manager — orchestrator for the lighting system.
 *
 * Creates, updates, removes, and disposes Babylon.js lights from a
 * `LightingConfig` schema. Coordinates with shadow-manager, light-animation,
 * day-night-cycle, and glow-manager sub-modules.
 *
 * Removes the scene-setup default hemispheric light (`'default-light'`)
 * when managed lighting is created.
 *
 * @example
 * ```typescript
 * import { createLighting, disposeLighting } from './light-manager';
 *
 * const result = createLighting({ scene, config: mapData.lighting });
 * if (!result.ok) return result;
 * // ... use result.data.lights ...
 * disposeLighting({ lighting: result.data });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type DeepReadonly, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import {
  LightingConfigSchema,
  type DayNightCycleConfig,
  type FlickerConfig,
  type LensFlarePreset,
  type LightConfig,
  type LightingConfig,
} from '../schemas/lighting-config';
import type { ColorRgba, Vector3 } from '../schemas/color-schema';
import { colorTemperatureToRgb } from './color-temperature';
import {
  createShadowGenerator,
  addShadowCasters,
  disposeShadowGenerator,
  type ShadowGeneratorInstance,
} from './shadow-manager';
import { createFlicker, disposeFlicker, type FlickerInstance } from './light-animation';
import {
  createDayNightCycle,
  disposeDayNightCycle,
  type DayNightCycleInstance,
} from './day-night-cycle';
import { createGlowLayer, excludeUiMeshes } from './glow-manager';

// =============================================================================
// Types
// =============================================================================

/** A managed light with its associated sub-resources. */
export type ManagedLight = {
  readonly config: DeepReadonly<LightConfig>;
  readonly light: BABYLON.Light;
  readonly shadowGenerator: ShadowGeneratorInstance | null;
  readonly flickerInstance: FlickerInstance | null;
  readonly volumetricPostProcess: BABYLON.VolumetricLightScatteringPostProcess | null;
  readonly lensFlareSystem: BABYLON.LensFlareSystem | null;
  readonly lensFlareEmitter: BABYLON.Mesh | null;
  readonly distanceFadeObserver: BABYLON.Observer<BABYLON.Scene> | null;
};

/** The top-level lighting system instance. */
export type LightingInstance = {
  readonly lights: readonly ManagedLight[];
  readonly glowLayer: BABYLON.GlowLayer | null;
  readonly dayNightCycle: DayNightCycleInstance | null;
  readonly scene: BABYLON.Scene;
  readonly config: DeepReadonly<LightingConfig>;
};

// =============================================================================
// Falloff, Intensity Mode & Lightmap Mode Mappings
// =============================================================================

/** Maps falloff type string to Babylon.js constant. */
const FALLOFF_TYPE_MAP: Readonly<Record<string, number>> = {
  default: BABYLON.Light.FALLOFF_DEFAULT,
  physical: BABYLON.Light.FALLOFF_PHYSICAL,
  gltf: BABYLON.Light.FALLOFF_GLTF,
  standard: BABYLON.Light.FALLOFF_STANDARD,
};

/** Maps intensity mode string to Babylon.js constant. */
const INTENSITY_MODE_MAP: Readonly<Record<string, number>> = {
  automatic: BABYLON.Light.INTENSITYMODE_AUTOMATIC,
  luminous_power: BABYLON.Light.INTENSITYMODE_LUMINOUSPOWER,
  luminous_intensity: BABYLON.Light.INTENSITYMODE_LUMINOUSINTENSITY,
  illuminance: BABYLON.Light.INTENSITYMODE_ILLUMINANCE,
  luminance: BABYLON.Light.INTENSITYMODE_LUMINANCE,
};

/** Maps lightmap mode string to Babylon.js constant. */
const LIGHTMAP_MODE_MAP: Readonly<Record<string, number>> = {
  default: BABYLON.Light.LIGHTMAP_DEFAULT,
  specular: BABYLON.Light.LIGHTMAP_SPECULAR,
  shadowsOnly: BABYLON.Light.LIGHTMAP_SHADOWSONLY,
};

// =============================================================================
// Lens Flare Presets
// =============================================================================

/** A single flare definition within a preset. */
type FlarePresetEntry = {
  readonly size: Num;
  readonly position: Num;
  readonly r: Num;
  readonly g: Num;
  readonly b: Num;
};

/**
 * Curated lens flare preset definitions.
 *
 * Each preset provides a ready-made array of flare elements for common
 * lighting scenarios. Used when `lensFlare.preset` is set and no custom
 * `flares` array is provided.
 */
const LENS_FLARE_PRESETS: Readonly<Record<LensFlarePreset, readonly FlarePresetEntry[]>> = {
  /** 6-element outdoor sun flare with rainbow ring. */
  sun: [
    { size: 0.5 as Num, position: 0 as Num, r: 1 as Num, g: 1 as Num, b: 1 as Num },
    { size: 0.2 as Num, position: 0.2 as Num, r: 1 as Num, g: 0.8 as Num, b: 0.5 as Num },
    { size: 0.3 as Num, position: 0.4 as Num, r: 0.5 as Num, g: 0.5 as Num, b: 1 as Num },
    { size: 0.15 as Num, position: 0.6 as Num, r: 0.8 as Num, g: 1 as Num, b: 0.8 as Num },
    { size: 0.1 as Num, position: 0.8 as Num, r: 1 as Num, g: 0.6 as Num, b: 0.3 as Num },
    { size: 0.4 as Num, position: 1.0 as Num, r: 1 as Num, g: 1 as Num, b: 1 as Num },
  ],
  /** 3-element soft white/blue moon glow. */
  moonGlow: [
    { size: 0.6 as Num, position: 0 as Num, r: 0.8 as Num, g: 0.85 as Num, b: 1 as Num },
    { size: 0.3 as Num, position: 0.3 as Num, r: 0.6 as Num, g: 0.7 as Num, b: 1 as Num },
    { size: 0.15 as Num, position: 0.7 as Num, r: 0.9 as Num, g: 0.9 as Num, b: 1 as Num },
  ],
  /** 5-element prismatic rainbow (fantasy). */
  crystalLight: [
    { size: 0.3 as Num, position: 0 as Num, r: 1 as Num, g: 1 as Num, b: 1 as Num },
    { size: 0.2 as Num, position: 0.2 as Num, r: 1 as Num, g: 0.3 as Num, b: 0.3 as Num },
    { size: 0.2 as Num, position: 0.4 as Num, r: 0.3 as Num, g: 1 as Num, b: 0.3 as Num },
    { size: 0.2 as Num, position: 0.6 as Num, r: 0.3 as Num, g: 0.3 as Num, b: 1 as Num },
    { size: 0.15 as Num, position: 0.9 as Num, r: 1 as Num, g: 0.8 as Num, b: 1 as Num },
  ],
  /** 2-element warm orange indoor glow. */
  torchGlow: [
    { size: 0.4 as Num, position: 0 as Num, r: 1 as Num, g: 0.7 as Num, b: 0.3 as Num },
    { size: 0.15 as Num, position: 0.5 as Num, r: 1 as Num, g: 0.5 as Num, b: 0.2 as Num },
  ],
};

// =============================================================================
// Light Creation (Private)
// =============================================================================

/**
 * Applies shadow Z-bounds to a shadow-capable light when values are > 0.
 *
 * @param light - A Babylon.js light that supports shadowMinZ/shadowMaxZ.
 * @param minZ - Shadow near plane (0 = auto).
 * @param maxZ - Shadow far plane (0 = auto).
 */
function applyShadowZBounds(light: BABYLON.ShadowLight, minZ: Num, maxZ: Num): void {
  if (minZ > 0) {
    light.shadowMinZ = minZ;
  }
  if (maxZ > 0) {
    light.shadowMaxZ = maxZ;
  }
}

/**
 * Creates a Babylon.js light from a validated config.
 *
 * Applies type-specific properties (position, direction, range, radius,
 * inner angle, shadow frustum, etc.) and common properties (intensity,
 * diffuse/specular, color temperature, falloff, intensity mode,
 * render priority, lightmap mode).
 *
 * @param scene - The scene to add the light to.
 * @param config - The validated light configuration.
 * @returns BabylonResult containing the created light.
 */
function createBabylonLight(
  scene: BABYLON.Scene,
  config: DeepReadonly<LightConfig>,
): BabylonResult<BABYLON.Light> {
  try {
    let light: BABYLON.Light;

    switch (config.type) {
      case 'point': {
        const pos: BABYLON.Vector3 = new BABYLON.Vector3(
          config.position.x,
          config.position.y,
          config.position.z,
        );
        const pointLight: BABYLON.PointLight = new BABYLON.PointLight(config.id, pos, scene);
        pointLight.range = config.range;
        pointLight.radius = config.radius;
        applyShadowZBounds(pointLight, config.shadowMinZ, config.shadowMaxZ);

        // Apply lightmap mode (non-hemispheric)
        const pointLmMode: number | undefined = LIGHTMAP_MODE_MAP[config.lightmapMode];
        if (pointLmMode !== undefined) {
          pointLight.lightmapMode = pointLmMode;
        }

        light = pointLight;
        break;
      }

      case 'spot': {
        const pos: BABYLON.Vector3 = new BABYLON.Vector3(
          config.position.x,
          config.position.y,
          config.position.z,
        );
        const dir: BABYLON.Vector3 = new BABYLON.Vector3(
          config.direction.x,
          config.direction.y,
          config.direction.z,
        );
        const spotLight: BABYLON.SpotLight = new BABYLON.SpotLight(
          config.id,
          pos,
          dir,
          config.angle,
          config.exponent,
          scene,
        );
        spotLight.range = config.range;
        spotLight.innerAngle = config.innerAngle;
        spotLight.radius = config.radius;
        applyShadowZBounds(spotLight, config.shadowMinZ, config.shadowMaxZ);

        // Apply lightmap mode (non-hemispheric)
        const spotLmMode: number | undefined = LIGHTMAP_MODE_MAP[config.lightmapMode];
        if (spotLmMode !== undefined) {
          spotLight.lightmapMode = spotLmMode;
        }

        light = spotLight;
        break;
      }

      case 'directional': {
        const dir: BABYLON.Vector3 = new BABYLON.Vector3(
          config.direction.x,
          config.direction.y,
          config.direction.z,
        );
        const dirLight: BABYLON.DirectionalLight = new BABYLON.DirectionalLight(
          config.id,
          dir,
          scene,
        );
        dirLight.position = new BABYLON.Vector3(
          config.position.x,
          config.position.y,
          config.position.z,
        );
        dirLight.autoCalcShadowZBounds = config.autoCalcShadowZBounds;

        // Apply new directional-specific properties
        if (config.shadowFrustumSize > 0) {
          dirLight.shadowFrustumSize = config.shadowFrustumSize;
        }
        dirLight.shadowOrthoScale = config.shadowOrthoScale;
        dirLight.autoUpdateExtends = config.autoUpdateExtends;
        applyShadowZBounds(dirLight, config.shadowMinZ, config.shadowMaxZ);

        // Apply lightmap mode (non-hemispheric)
        const dirLmMode: number | undefined = LIGHTMAP_MODE_MAP[config.lightmapMode];
        if (dirLmMode !== undefined) {
          dirLight.lightmapMode = dirLmMode;
        }

        light = dirLight;
        break;
      }

      case 'hemispheric': {
        const dir: BABYLON.Vector3 = new BABYLON.Vector3(
          config.direction.x,
          config.direction.y,
          config.direction.z,
        );
        const hemiLight: BABYLON.HemisphericLight = new BABYLON.HemisphericLight(
          config.id,
          dir,
          scene,
        );
        hemiLight.groundColor = new BABYLON.Color3(
          config.groundColor.r,
          config.groundColor.g,
          config.groundColor.b,
        );
        light = hemiLight;
        break;
      }
    }

    // Apply common properties
    light.intensity = config.intensity;
    light.setEnabled(config.enabled);
    light.renderPriority = config.renderPriority;

    // Apply diffuse — may be overridden by colorTemperature below
    light.diffuse = new BABYLON.Color3(config.diffuse.r, config.diffuse.g, config.diffuse.b);
    light.specular = new BABYLON.Color3(config.specular.r, config.specular.g, config.specular.b);

    // Color temperature overrides diffuse
    if (config.colorTemperature !== undefined) {
      const cctResult: Result<ColorRgba> = colorTemperatureToRgb(config.colorTemperature);
      if (cctResult.ok) {
        light.diffuse = new BABYLON.Color3(cctResult.data.r, cctResult.data.g, cctResult.data.b);
      }
    }

    // Apply falloff type
    const falloff: number | undefined = FALLOFF_TYPE_MAP[config.falloffType];
    if (falloff !== undefined) {
      light.falloffType = falloff;
    }

    // Apply intensity mode
    const intensityMode: number | undefined = INTENSITY_MODE_MAP[config.intensityMode];
    if (intensityMode !== undefined) {
      light.intensityMode = intensityMode;
    }

    return okShallow(light);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

/**
 * Checks whether a light implements IShadowLight (can cast shadows).
 *
 * @param light - The light to check.
 * @returns True if the light supports shadow generation.
 */
function isShadowLight(light: BABYLON.Light): light is BABYLON.IShadowLight {
  return 'setShadowProjectionMatrix' in light;
}

/**
 * Creates a distance fade observer for a positional light.
 *
 * Registers a scene `onBeforeRenderObservable` callback that computes the
 * distance from the active camera to the light position each frame. The
 * light intensity is scaled by a linear fade factor:
 *   factor = clamp((end - dist) / (end - start), 0, 1)
 * Lights beyond `end` are disabled; lights closer than `start` are full.
 *
 * @param scene - The scene to observe.
 * @param light - The light to fade.
 * @param baseIntensity - The light's configured base intensity.
 * @param start - Distance at which fade begins.
 * @param end - Distance at which light fully fades out.
 * @returns The registered observer, or null if no camera is available.
 */
function createDistanceFadeObserver(
  scene: BABYLON.Scene,
  light: BABYLON.Light,
  baseIntensity: Num,
  start: Num,
  end: Num,
): BABYLON.Observer<BABYLON.Scene> | null {
  // ShadowLight is the base class for all positional lights (Point, Spot, Directional).
  // Hemispheric lights do not extend ShadowLight and have no position.
  if (!(light instanceof BABYLON.ShadowLight)) {
    return null;
  }
  const positionedLight: BABYLON.ShadowLight = light;

  const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
    const camera: BABYLON.Nullable<BABYLON.Camera> = scene.activeCamera;
    if (!camera) return;

    const lightPos: BABYLON.Vector3 = positionedLight.position;
    const camPos: BABYLON.Vector3 = camera.position;
    const dist: number = BABYLON.Vector3.Distance(lightPos, camPos);

    const range: number = end - start;
    // Avoid division by zero when start === end
    let factor = 0;
    if (range > 0) {
      factor = Math.max(0, Math.min(1, (end - dist) / range));
    } else if (dist <= start) {
      factor = 1;
    }

    light.intensity = baseIntensity * factor;
    light.setEnabled(factor > 0);
  });

  return observer;
}

// =============================================================================
// Public API
// =============================================================================

/** Options for creating the lighting system. */
type CreateLightingOptions = {
  readonly scene: BABYLON.Scene;
  readonly config: unknown;
};

/**
 * Creates the lighting system from a config object.
 *
 * Validates the config, removes the default scene light, creates all
 * Babylon.js lights with their shadow generators, flicker animations,
 * distance fade observers, glow layer, and day/night cycle.
 *
 * @param options - Scene and raw lighting config.
 * @returns BabylonResult containing the lighting instance.
 *
 * @example
 * ```typescript
 * const result = createLighting({ scene, config: mapData.lighting });
 * if (!result.ok) return result;
 * ```
 */
export function createLighting(options: CreateLightingOptions): BabylonResult<LightingInstance> {
  const parsed: Result<LightingConfig> = safeParse(LightingConfigSchema, options.config);
  if (!parsed.ok) return parsed;
  const config: DeepReadonly<LightingConfig> = parsed.data;

  // Check for duplicate light IDs
  const ids: Set<string> = new Set<string>();
  for (const lightCfg of config.lights) {
    if (ids.has(lightCfg.id)) {
      return err(ERRORS.VALIDATION.INVALID_FORMAT, `Duplicate light ID: '${lightCfg.id}'`);
    }
    ids.add(lightCfg.id);
  }

  try {
    // Remove existing default-light
    const defaultLight: BABYLON.Nullable<BABYLON.Light> =
      options.scene.getLightByName('default-light');
    if (defaultLight) {
      defaultLight.dispose();
    }

    // Create lights with sub-resources
    const managedLights: ManagedLight[] = [];
    for (const lightCfg of config.lights) {
      const lightResult: BabylonResult<BABYLON.Light> = createBabylonLight(options.scene, lightCfg);
      if (!lightResult.ok) return lightResult;

      const light: BABYLON.Light = lightResult.data;

      // Create shadow generator (non-fatal — skip if light can't cast shadows)
      let shadowGen: ShadowGeneratorInstance | null = null;
      if (lightCfg.type !== 'hemispheric' && lightCfg.shadow?.enabled && isShadowLight(light)) {
        const shadowResult = createShadowGenerator({
          light,
          config: lightCfg.shadow,
          scene: options.scene,
        });
        if (shadowResult.ok) {
          shadowGen = shadowResult.data;
          // Auto-add scene meshes as shadow casters/receivers
          // oxlint-disable-next-line prefer-destructuring
          const meshes: readonly BABYLON.AbstractMesh[] = options.scene.meshes;
          if (meshes.length > 0) {
            addShadowCasters({ generator: shadowGen, meshes });
          }
        }
      }

      // Create flicker animation (non-fatal — skip on failure)
      let flickerInst: FlickerInstance | null = null;
      if (lightCfg.type !== 'hemispheric' && lightCfg.flicker?.enabled) {
        // Spread to strip DeepReadonly — createFlicker stores a mutable config
        // that the dev harness (and future game scripting) can mutate at runtime.
        const flickerConfig: Partial<FlickerConfig> = { ...lightCfg.flicker };
        const flickerResult = createFlicker({
          scene: options.scene,
          light,
          config: flickerConfig,
          colorTemperature: lightCfg.colorTemperature,
        });
        if (flickerResult.ok) {
          flickerInst = flickerResult.data;
        }
      }

      // Volumetric light scattering (god rays) — DirectionalLight only, non-fatal
      // oxlint-disable-next-line no-warning-comments -- Intentional tracking issue
      // TODO: Babylon.js lacks native WGSL shaders for VolumetricLightScatteringPostProcess.
      // The GLSL-to-WGSL transpilation fails on WebGPU, causing a black screen.
      // Remove this engine check once Babylon.js ships WGSL volumetric shaders.
      // Tracking: https://github.com/BabylonJS/Babylon.js/issues/6443
      let volumetric: BABYLON.VolumetricLightScatteringPostProcess | null = null;
      const isWebGPU: boolean = options.scene.getEngine().name === 'WebGPU';
      if (lightCfg.type === 'directional' && lightCfg.volumetricLight?.enabled && !isWebGPU) {
        try {
          // oxlint-disable-next-line prefer-destructuring
          const cameras: readonly BABYLON.Camera[] = options.scene.cameras;
          if (cameras.length > 0) {
            const vlCfg = lightCfg.volumetricLight;
            volumetric = new BABYLON.VolumetricLightScatteringPostProcess(
              `${lightCfg.id}-godrays`,
              { postProcessRatio: vlCfg.passRatio, passRatio: vlCfg.passRatio },
              // oxlint-disable-next-line typescript/no-non-null-assertion -- guarded by cameras.length > 0 check above
              cameras[0]!,
              undefined,
              vlCfg.samples,
              BABYLON.Texture.BILINEAR_SAMPLINGMODE,
              options.scene.getEngine(),
              false,
            );
            volumetric.decay = vlCfg.decay;
            volumetric.weight = vlCfg.weight;
            volumetric.density = vlCfg.density;
            volumetric.exposure = vlCfg.exposure;

            // Tint the volumetric mesh if color is not pure white
            const vlColor = vlCfg.color;
            if (vlColor.r < 1 || vlColor.g < 1 || vlColor.b < 1) {
              const meshMat: BABYLON.Nullable<BABYLON.Material> = volumetric.mesh.material;
              if (
                meshMat !== null &&
                meshMat !== undefined &&
                meshMat instanceof BABYLON.StandardMaterial
              ) {
                meshMat.diffuseColor = new BABYLON.Color3(vlColor.r, vlColor.g, vlColor.b);
              }
            }

            // Position the internal "light source" mesh at the sun's position
            // in the sky. For directional lights, place it far along the inverse
            // of the light direction so it appears as the sun in the scene.
            const dir = lightCfg.direction;
            const sunDist: Num = 200 as Num;
            volumetric.mesh.position = new BABYLON.Vector3(
              -dir.x * sunDist + lightCfg.position.x,
              -dir.y * sunDist + lightCfg.position.y,
              -dir.z * sunDist + lightCfg.position.z,
            );
            volumetric.mesh.scaling = new BABYLON.Vector3(20, 20, 20);

            // The mesh MUST be visible for the scattering pass to produce
            // any output.  Make it emissive + unlit so it always renders
            // as a bright disc regardless of scene lighting.
            volumetric.mesh.isVisible = true;
            const vlsMat: BABYLON.Nullable<BABYLON.Material> = volumetric.mesh.material;
            if (
              vlsMat !== null &&
              vlsMat !== undefined &&
              vlsMat instanceof BABYLON.StandardMaterial
            ) {
              vlsMat.disableLighting = true;
              vlsMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            }
          }
        } catch {
          // Non-fatal — volumetric may not be supported (e.g. NullEngine)
          volumetric = null;
        }
      }

      // Lens flares — DirectionalLight only, non-fatal
      let lensFlares: BABYLON.LensFlareSystem | null = null;
      let lensFlareEmitter: BABYLON.Mesh | null = null;
      if (lightCfg.type === 'directional' && lightCfg.lensFlare?.enabled) {
        try {
          // Position the emitter far along the inverse light direction so
          // the flare appears "in the sky" (same approach as VLS mesh).
          const flareDir = lightCfg.direction;
          const flareSunDist: Num = 200 as Num;
          lensFlareEmitter = new BABYLON.Mesh(`${lightCfg.id}-flare-emitter`, options.scene);
          lensFlareEmitter.position = new BABYLON.Vector3(
            -flareDir.x * flareSunDist + lightCfg.position.x,
            -flareDir.y * flareSunDist + lightCfg.position.y,
            -flareDir.z * flareSunDist + lightCfg.position.z,
          );
          lensFlareEmitter.isVisible = false;
          lensFlareEmitter.isPickable = false;

          lensFlares = new BABYLON.LensFlareSystem(
            `${lightCfg.id}-flares`,
            lensFlareEmitter,
            options.scene,
          );
          const flareCfg = lightCfg.lensFlare;

          // Create a 1x1 white texture for flares — passing '' as texture path
          // causes sampler binding errors on WebGPU due to null internal textures.
          const flareTexture: BABYLON.RawTexture = new BABYLON.RawTexture(
            new Uint8Array([255, 255, 255, 255]),
            1,
            1,
            BABYLON.Constants.TEXTUREFORMAT_RGBA,
            options.scene,
            false,
            false,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
          );
          flareTexture.name = `${lightCfg.id}-flare-tex`;

          if (flareCfg.flares && flareCfg.flares.length > 0) {
            // Custom flares — always override preset
            for (const f of flareCfg.flares) {
              const flare: BABYLON.LensFlare = new BABYLON.LensFlare(
                f.size,
                f.position,
                new BABYLON.Color3(f.color.r, f.color.g, f.color.b),
                '',
                lensFlares,
              );
              flare.texture = flareTexture;
            }
          } else if (flareCfg.preset) {
            // Use preset flare array
            const presetFlares: readonly FlarePresetEntry[] | undefined =
              LENS_FLARE_PRESETS[flareCfg.preset];
            if (presetFlares) {
              for (const pf of presetFlares) {
                const flare: BABYLON.LensFlare = new BABYLON.LensFlare(
                  pf.size,
                  pf.position,
                  new BABYLON.Color3(pf.r, pf.g, pf.b),
                  '',
                  lensFlares,
                );
                flare.texture = flareTexture;
              }
            }
          } else {
            // Default 3-flare set
            const f1: BABYLON.LensFlare = new BABYLON.LensFlare(
              0.2,
              0,
              new BABYLON.Color3(1, 1, 1),
              '',
              lensFlares,
            );
            f1.texture = flareTexture;
            const f2: BABYLON.LensFlare = new BABYLON.LensFlare(
              0.5,
              0.2,
              new BABYLON.Color3(0.5, 0.5, 1),
              '',
              lensFlares,
            );
            f2.texture = flareTexture;
            const f3: BABYLON.LensFlare = new BABYLON.LensFlare(
              0.2,
              1.0,
              new BABYLON.Color3(1, 1, 1),
              '',
              lensFlares,
            );
            f3.texture = flareTexture;
          }
        } catch {
          // Non-fatal — lens flares may not be supported
          lensFlares = null;
        }
      }

      // Distance fade observer — Point/Spot only, non-fatal
      let distanceFadeObs: BABYLON.Observer<BABYLON.Scene> | null = null;
      if (
        (lightCfg.type === 'point' || lightCfg.type === 'spot') &&
        lightCfg.distanceFade?.enabled
      ) {
        const fadeCfg = lightCfg.distanceFade;
        distanceFadeObs = createDistanceFadeObserver(
          options.scene,
          light,
          lightCfg.intensity,
          fadeCfg.start,
          fadeCfg.end,
        );
      }

      managedLights.push({
        config: lightCfg,
        light,
        shadowGenerator: shadowGen,
        flickerInstance: flickerInst,
        volumetricPostProcess: volumetric,
        lensFlareSystem: lensFlares,
        lensFlareEmitter,
        distanceFadeObserver: distanceFadeObs,
      });
    }

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

    // Create day/night cycle (non-fatal)
    let dayNight: DayNightCycleInstance | null = null;
    if (config.dayNight?.enabled) {
      // Spread to strip DeepReadonly — createDayNightCycle expects Partial<DayNightCycleConfig>
      const dayNightConfig: Partial<DayNightCycleConfig> = {
        ...config.dayNight,
        keyframes: config.dayNight.keyframes
          ? config.dayNight.keyframes.map((kf) => ({ ...kf }))
          : undefined,
        sunPath: config.dayNight.sunPath ? { ...config.dayNight.sunPath } : undefined,
        seasonOrder: config.dayNight.seasonOrder ? [...config.dayNight.seasonOrder] : undefined,
        realTimeSeasonMap: config.dayNight.realTimeSeasonMap
          ? { ...config.dayNight.realTimeSeasonMap }
          : undefined,
        indoorModeConfig: config.dayNight.indoorModeConfig
          ? { ...config.dayNight.indoorModeConfig }
          : undefined,
      };
      const dayNightResult = createDayNightCycle({
        scene: options.scene,
        config: dayNightConfig,
        managedLights,
      });
      if (dayNightResult.ok) {
        dayNight = dayNightResult.data;
      }
    }

    const instance: LightingInstance = {
      lights: managedLights,
      glowLayer,
      dayNightCycle: dayNight,
      scene: options.scene,
      config,
    };

    return okShallow(instance);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// Update Operations
// =============================================================================

/** Options for updating light position. */
type UpdatePositionOptions = {
  readonly lighting: LightingInstance;
  readonly lightId: string;
  readonly position: Vector3;
};

/**
 * Updates a light's position by ID.
 *
 * Only applies to lights with a position property (Point, Spot, Directional).
 *
 * @param options - Lighting instance, light ID, and new position.
 * @returns BabylonResult indicating success.
 */
export function updateLightPosition(options: UpdatePositionOptions): BabylonResult<Bool> {
  const managed: ManagedLight | undefined = options.lighting.lights.find(
    (m: ManagedLight) => m.config.id === options.lightId,
  );
  if (!managed) {
    return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
  }

  try {
    // oxlint-disable-next-line prefer-destructuring
    const light: BABYLON.Light = managed.light;
    if ('position' in light && light.position instanceof BABYLON.Vector3) {
      light.position = new BABYLON.Vector3(
        options.position.x,
        options.position.y,
        options.position.z,
      );
    }
    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

/** Options for updating light intensity. */
type UpdateIntensityOptions = {
  readonly lighting: LightingInstance;
  readonly lightId: string;
  readonly intensity: Num;
};

/**
 * Updates a light's intensity by ID.
 *
 * @param options - Lighting instance, light ID, and new intensity.
 * @returns BabylonResult indicating success.
 */
export function updateLightIntensity(options: UpdateIntensityOptions): BabylonResult<Bool> {
  const managed: ManagedLight | undefined = options.lighting.lights.find(
    (m: ManagedLight) => m.config.id === options.lightId,
  );
  if (!managed) {
    return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
  }

  try {
    managed.light.intensity = options.intensity;
    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

/** Options for updating light color. */
type UpdateColorOptions = {
  readonly lighting: LightingInstance;
  readonly lightId: string;
  readonly diffuse: ColorRgba;
};

/**
 * Updates a light's diffuse color by ID.
 *
 * @param options - Lighting instance, light ID, and new diffuse color.
 * @returns BabylonResult indicating success.
 */
export function updateLightColor(options: UpdateColorOptions): BabylonResult<Bool> {
  const managed: ManagedLight | undefined = options.lighting.lights.find(
    (m: ManagedLight) => m.config.id === options.lightId,
  );
  if (!managed) {
    return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
  }

  try {
    managed.light.diffuse = new BABYLON.Color3(
      options.diffuse.r,
      options.diffuse.g,
      options.diffuse.b,
    );
    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// Remove & Dispose
// =============================================================================

/** Options for removing a light by ID. */
type RemoveLightOptions = {
  readonly lighting: LightingInstance;
  readonly lightId: string;
};

/**
 * Removes a light by ID and returns an updated LightingInstance.
 *
 * Disposes the Babylon.js light and all sub-resources (shadow generator,
 * flicker animation, distance fade observer, volumetric post-process,
 * lens flare system).
 *
 * @param options - Lighting instance and light ID to remove.
 * @returns BabylonResult containing the updated lighting instance.
 */
export function removeLightById(options: RemoveLightOptions): BabylonResult<LightingInstance> {
  const idx: number = options.lighting.lights.findIndex(
    (m: ManagedLight) => m.config.id === options.lightId,
  );
  if (idx === -1) {
    return err(ERRORS.RESOURCE.GONE, `Light '${options.lightId}' not found`);
  }

  try {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- guarded by idx !== -1 check above (findIndex succeeded)
    const managed: ManagedLight = options.lighting.lights[idx]!;

    // Dispose sub-resources before the light
    if (managed.flickerInstance) {
      disposeFlicker({ flicker: managed.flickerInstance, scene: options.lighting.scene });
    }
    if (managed.distanceFadeObserver) {
      options.lighting.scene.onBeforeRenderObservable.remove(managed.distanceFadeObserver);
    }
    if (managed.volumetricPostProcess) {
      const cam: BABYLON.Nullable<BABYLON.Camera> = options.lighting.scene.cameras[0] ?? null;
      if (cam) managed.volumetricPostProcess.dispose(cam);
    }
    if (managed.lensFlareSystem) {
      managed.lensFlareSystem.dispose();
    }
    if (managed.lensFlareEmitter) {
      managed.lensFlareEmitter.dispose();
    }
    if (managed.shadowGenerator) {
      disposeShadowGenerator({ generator: managed.shadowGenerator });
    }

    managed.light.dispose();

    const remaining: ManagedLight[] = [
      ...options.lighting.lights.slice(0, idx),
      ...options.lighting.lights.slice(idx + 1),
    ];

    const updated: LightingInstance = {
      ...options.lighting,
      lights: remaining,
    };

    return okShallow(updated);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

/** Options for disposing the entire lighting system. */
type DisposeLightingOptions = {
  readonly lighting: LightingInstance;
};

/**
 * Disposes the entire lighting system.
 *
 * Disposes day/night cycle, glow layer, then all managed lights
 * and their sub-resources (shadow generators, flicker animations,
 * distance fade observers, volumetric post-processes, lens flare systems).
 *
 * @param options - The lighting instance to dispose.
 * @returns BabylonResult indicating success.
 */
export function disposeLighting(options: DisposeLightingOptions): BabylonResult<Bool> {
  try {
    // Dispose day/night cycle first (references lights)
    if (options.lighting.dayNightCycle) {
      disposeDayNightCycle({
        cycle: options.lighting.dayNightCycle,
        scene: options.lighting.scene,
      });
    }

    // Dispose glow layer
    if (options.lighting.glowLayer) {
      options.lighting.glowLayer.dispose();
    }

    // Dispose all lights and sub-resources
    for (const managed of options.lighting.lights) {
      // Dispose flicker before shadow (flicker modifies light properties)
      if (managed.flickerInstance) {
        disposeFlicker({ flicker: managed.flickerInstance, scene: options.lighting.scene });
      }
      // Dispose distance fade observer
      if (managed.distanceFadeObserver) {
        options.lighting.scene.onBeforeRenderObservable.remove(managed.distanceFadeObserver);
      }
      // Dispose volumetric + lens flares
      if (managed.volumetricPostProcess) {
        const cam: BABYLON.Nullable<BABYLON.Camera> = options.lighting.scene.cameras[0] ?? null;
        if (cam) managed.volumetricPostProcess.dispose(cam);
      }
      if (managed.lensFlareSystem) {
        managed.lensFlareSystem.dispose();
      }
      if (managed.lensFlareEmitter) {
        managed.lensFlareEmitter.dispose();
      }
      // Dispose shadow generator before light
      if (managed.shadowGenerator) {
        disposeShadowGenerator({ generator: managed.shadowGenerator });
      }
      managed.light.dispose();
    }

    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}
