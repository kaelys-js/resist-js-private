/**
 * Fog presets.
 *
 * Named presets that populate all `FogConfig` fields with curated defaults
 * for common atmospheric scenarios. Each preset is a complete `FogConfig`
 * object that can be passed directly to the fog manager.
 *
 * Presets cover 14 environments: clear, light mist, morning fog, dense fog,
 * dungeon, underwater, forest, mountain, sandstorm, snowstorm, dream,
 * volcanic, swamp, and night mist.
 *
 * @example
 * ```typescript
 * import { FOG_PRESETS, FOG_PRESET_NAMES } from './fog-presets';
 *
 * // Apply a preset
 * const fogConfig = FOG_PRESETS.morningFog;
 *
 * // List available presets
 * FOG_PRESET_NAMES.forEach(name => console.log(name));
 * ```
 *
 * @module
 */

import type { FogConfig } from '../schemas/fog-config';

// =============================================================================
// Preset Name Type
// =============================================================================

/**
 * Valid fog preset names.
 *
 * Matches the keys of {@link FOG_PRESETS}.
 */
export type FogPresetName =
  | 'clear'
  | 'lightMist'
  | 'morningFog'
  | 'denseFog'
  | 'dungeon'
  | 'underwater'
  | 'forest'
  | 'mountain'
  | 'sandstorm'
  | 'snowstorm'
  | 'dream'
  | 'volcanic'
  | 'swamp'
  | 'nightMist';

// =============================================================================
// Preset Name List
// =============================================================================

/**
 * Ordered list of all fog preset names.
 *
 * Useful for UI dropdown population and iteration.
 */
export const FOG_PRESET_NAMES: readonly FogPresetName[] = [
  'clear',
  'lightMist',
  'morningFog',
  'denseFog',
  'dungeon',
  'underwater',
  'forest',
  'mountain',
  'sandstorm',
  'snowstorm',
  'dream',
  'volcanic',
  'swamp',
  'nightMist',
];

// =============================================================================
// Fog Presets
// =============================================================================

/**
 * Named fog presets with curated defaults for common atmospheric scenarios.
 *
 * Each preset is a complete `FogConfig` object. When applied, it populates
 * all fog fields. Individual fields can still be overridden after preset
 * application via spread: `{ ...FOG_PRESETS.morningFog, density: 0.01 }`.
 *
 * @example
 * ```typescript
 * import { FOG_PRESETS } from './fog-presets';
 *
 * // Use directly
 * const config = FOG_PRESETS.morningFog;
 *
 * // Override specific field
 * const custom = { ...FOG_PRESETS.morningFog, density: 0.015 };
 * ```
 */
export const FOG_PRESETS: Readonly<Record<FogPresetName, FogConfig>> = {
  // =========================================================================
  // Clear — no fog
  // =========================================================================
  clear: {
    mode: 'none',
    color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
    density: 0,
    start: 50,
    end: 300,
    maxOpacity: 1,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    overlays: [],
  },

  // =========================================================================
  // Light Mist — subtle atmospheric haze
  // =========================================================================
  lightMist: {
    mode: 'exponential',
    color: { r: 0.85, g: 0.87, b: 0.9, a: 1 },
    density: 0.005,
    start: 50,
    end: 300,
    maxOpacity: 0.6,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    noise: {
      enabled: true,
      scale: 0.02,
      amplitude: 0.15,
      speed: 0.1,
      octaves: 2,
      lacunarity: 2,
      persistence: 0.5,
    },
    overlays: [],
  },

  // =========================================================================
  // Morning Fog — warm, ground-hugging fog with wisps
  // =========================================================================
  morningFog: {
    mode: 'exponential2',
    color: { r: 0.9, g: 0.85, b: 0.75, a: 1 },
    density: 0.008,
    start: 50,
    end: 300,
    maxOpacity: 0.75,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    heightFog: {
      enabled: true,
      baseHeight: 0,
      falloff: 0.3,
      density: 0.015,
      offset: 0,
    },
    noise: {
      enabled: true,
      scale: 0.03,
      amplitude: 0.3,
      speed: 0.15,
      octaves: 3,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 45,
      speed: 0.3,
      turbulence: 0.1,
    },
    overlays: [
      {
        enabled: true,
        texture: 'wisps',
        opacity: 0.2,
        blendMode: 'additive',
        scrollX: 0.01,
        scrollY: 0.005,
        scale: 1,
        tint: { r: 0.9, g: 0.85, b: 0.75, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Dense Fog — thick, visibility-reducing fog with cloud overlay
  // =========================================================================
  denseFog: {
    mode: 'exponential',
    color: { r: 0.7, g: 0.7, b: 0.72, a: 1 },
    density: 0.012,
    start: 50,
    end: 300,
    maxOpacity: 0.75,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.3,
    noise: {
      enabled: true,
      scale: 0.05,
      amplitude: 0.5,
      speed: 0.08,
      octaves: 4,
      lacunarity: 2,
      persistence: 0.5,
    },
    overlays: [
      {
        enabled: true,
        texture: 'clouds',
        opacity: 0.25,
        blendMode: 'normal',
        scrollX: 0.005,
        scrollY: 0.003,
        scale: 1.5,
        tint: { r: 0.7, g: 0.7, b: 0.72, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Dungeon — dark, oppressive fog with smoke overlay
  // =========================================================================
  dungeon: {
    mode: 'exponential2',
    color: { r: 0.15, g: 0.12, b: 0.1, a: 1 },
    density: 0.01,
    start: 50,
    end: 300,
    maxOpacity: 0.75,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    noise: {
      enabled: true,
      scale: 0.04,
      amplitude: 0.2,
      speed: 0.05,
      octaves: 2,
      lacunarity: 2,
      persistence: 0.5,
    },
    overlays: [
      {
        enabled: true,
        texture: 'smoke',
        opacity: 0.15,
        blendMode: 'additive',
        scrollX: 0.002,
        scrollY: 0.008,
        scale: 1,
        tint: { r: 0.15, g: 0.12, b: 0.1, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'radial',
        vignetteIntensity: 0.6,
      },
    ],
  },

  // =========================================================================
  // Underwater — deep blue-green haze
  // =========================================================================
  underwater: {
    mode: 'exponential',
    color: { r: 0.1, g: 0.3, b: 0.5, a: 1 },
    density: 0.012,
    start: 50,
    end: 300,
    maxOpacity: 0.75,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.5,
    noise: {
      enabled: true,
      scale: 0.03,
      amplitude: 0.35,
      speed: 0.2,
      octaves: 3,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 90,
      speed: 0.15,
      turbulence: 0.2,
    },
    overlays: [],
  },

  // =========================================================================
  // Forest — green-tinted ground fog with wisps
  // =========================================================================
  forest: {
    mode: 'exponential',
    color: { r: 0.3, g: 0.45, b: 0.25, a: 1 },
    density: 0.005,
    start: 50,
    end: 300,
    maxOpacity: 0.55,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    heightFog: {
      enabled: true,
      baseHeight: 0,
      falloff: 0.5,
      density: 0.02,
      offset: 0,
    },
    noise: {
      enabled: true,
      scale: 0.03,
      amplitude: 0.3,
      speed: 0.12,
      octaves: 3,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 30,
      speed: 0.25,
      turbulence: 0.15,
    },
    overlays: [
      {
        enabled: true,
        texture: 'wisps',
        opacity: 0.15,
        blendMode: 'additive',
        scrollX: 0.008,
        scrollY: 0.003,
        scale: 1.2,
        tint: { r: 0.3, g: 0.45, b: 0.25, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Mountain — high-altitude clouds with elevated height fog
  // =========================================================================
  mountain: {
    mode: 'exponential2',
    color: { r: 0.9, g: 0.9, b: 0.95, a: 1 },
    density: 0.005,
    start: 50,
    end: 300,
    maxOpacity: 0.7,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.1,
    heightFog: {
      enabled: true,
      baseHeight: 5,
      falloff: 0.2,
      density: 0.01,
      offset: 0,
    },
    noise: {
      enabled: true,
      scale: 0.02,
      amplitude: 0.2,
      speed: 0.1,
      octaves: 3,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 270,
      speed: 1,
      turbulence: 0.3,
    },
    overlays: [
      {
        enabled: true,
        texture: 'clouds',
        opacity: 0.2,
        blendMode: 'normal',
        scrollX: 0.015,
        scrollY: 0.005,
        scale: 2,
        tint: { r: 0.9, g: 0.9, b: 0.95, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Sandstorm — warm, dense, wind-driven sand particles
  // =========================================================================
  sandstorm: {
    mode: 'exponential',
    color: { r: 0.7, g: 0.55, b: 0.3, a: 1 },
    density: 0.008,
    start: 50,
    end: 300,
    maxOpacity: 0.65,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.4,
    noise: {
      enabled: true,
      scale: 0.08,
      amplitude: 0.6,
      speed: 0.5,
      octaves: 4,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 180,
      speed: 3,
      turbulence: 0.5,
    },
    overlays: [
      {
        enabled: true,
        texture: 'smoke',
        opacity: 0.3,
        blendMode: 'normal',
        scrollX: 0.05,
        scrollY: 0.01,
        scale: 1,
        tint: { r: 0.7, g: 0.55, b: 0.3, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Snowstorm — white-out with perlin noise overlay
  // =========================================================================
  snowstorm: {
    mode: 'exponential',
    color: { r: 0.85, g: 0.85, b: 0.9, a: 1 },
    density: 0.007,
    start: 50,
    end: 300,
    maxOpacity: 0.65,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.3,
    noise: {
      enabled: true,
      scale: 0.06,
      amplitude: 0.5,
      speed: 0.4,
      octaves: 4,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 315,
      speed: 2.5,
      turbulence: 0.4,
    },
    overlays: [
      {
        enabled: true,
        texture: 'perlin',
        opacity: 0.25,
        blendMode: 'additive',
        scrollX: 0.04,
        scrollY: 0.02,
        scale: 1,
        tint: { r: 0.85, g: 0.85, b: 0.9, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Dream — ethereal purple haze with wisps
  // =========================================================================
  dream: {
    mode: 'exponential2',
    color: { r: 0.7, g: 0.5, b: 0.8, a: 1 },
    density: 0.004,
    start: 50,
    end: 300,
    maxOpacity: 0.55,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.1,
    noise: {
      enabled: true,
      scale: 0.02,
      amplitude: 0.2,
      speed: 0.08,
      octaves: 2,
      lacunarity: 2,
      persistence: 0.5,
    },
    animation: {
      enabled: true,
      speed: 0.3,
      amplitude: 0.2,
      waveform: 'sine',
    },
    overlays: [
      {
        enabled: true,
        texture: 'wisps',
        opacity: 0.2,
        blendMode: 'additive',
        scrollX: 0.005,
        scrollY: 0.008,
        scale: 1.5,
        tint: { r: 0.7, g: 0.5, b: 0.8, a: 1 },
        hue: 30,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'radial',
        vignetteIntensity: 0.4,
      },
    ],
  },

  // =========================================================================
  // Volcanic — hot, red-orange haze with steep height fog and smoke
  // =========================================================================
  volcanic: {
    mode: 'exponential',
    color: { r: 0.4, g: 0.15, b: 0.05, a: 1 },
    density: 0.005,
    start: 50,
    end: 300,
    maxOpacity: 0.6,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0.2,
    heightFog: {
      enabled: true,
      baseHeight: 0,
      falloff: 0.8,
      density: 0.03,
      offset: 0,
    },
    noise: {
      enabled: true,
      scale: 0.06,
      amplitude: 0.5,
      speed: 0.25,
      octaves: 4,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 0,
      speed: 1.5,
      turbulence: 0.4,
    },
    overlays: [
      {
        enabled: true,
        texture: 'smoke',
        opacity: 0.3,
        blendMode: 'additive',
        scrollX: 0.003,
        scrollY: 0.02,
        scale: 1,
        tint: { r: 0.6, g: 0.2, b: 0.05, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'radial',
        vignetteIntensity: 0.5,
      },
    ],
  },

  // =========================================================================
  // Swamp — murky green ground fog with wisps
  // =========================================================================
  swamp: {
    mode: 'exponential',
    color: { r: 0.25, g: 0.35, b: 0.15, a: 1 },
    density: 0.005,
    start: 50,
    end: 300,
    maxOpacity: 0.6,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    heightFog: {
      enabled: true,
      baseHeight: 0,
      falloff: 0.6,
      density: 0.025,
      offset: 0,
    },
    noise: {
      enabled: true,
      scale: 0.04,
      amplitude: 0.35,
      speed: 0.1,
      octaves: 3,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 120,
      speed: 0.2,
      turbulence: 0.1,
    },
    overlays: [
      {
        enabled: true,
        texture: 'wisps',
        opacity: 0.15,
        blendMode: 'additive',
        scrollX: 0.003,
        scrollY: 0.006,
        scale: 1,
        tint: { r: 0.25, g: 0.35, b: 0.15, a: 1 },
        hue: 0,
        hueSpeed: 0,
        mapLocked: false,
        vignette: 'none',
        vignetteIntensity: 1,
      },
    ],
  },

  // =========================================================================
  // Night Mist — very dark, subtle fog
  // =========================================================================
  nightMist: {
    mode: 'exponential2',
    color: { r: 0.08, g: 0.08, b: 0.15, a: 1 },
    density: 0.006,
    start: 50,
    end: 300,
    maxOpacity: 0.5,
    startDistance: 0,
    cutoffDistance: 0,
    excludeSkybox: true,
    skyAffect: 0,
    noise: {
      enabled: true,
      scale: 0.02,
      amplitude: 0.15,
      speed: 0.06,
      octaves: 2,
      lacunarity: 2,
      persistence: 0.5,
    },
    wind: {
      enabled: true,
      directionAngle: 60,
      speed: 0.15,
      turbulence: 0.05,
    },
    overlays: [],
  },
};
