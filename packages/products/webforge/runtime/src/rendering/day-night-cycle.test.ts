/**
 * Day/night cycle tests.
 *
 * Tests keyframe interpolation (pure math), sun path computation (pure math),
 * cycle engine (NullEngine), time control, and observer lifecycle.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { ManagedLight } from './light-manager';
import { applySceneSetup } from './scene-setup';
import {
  DEFAULT_DAY_CYCLE_KEYFRAMES,
  applyEasing,
  computeRealMoonPhase,
  computeSunDirection,
  computeTimePhase,
  createDayNightCycle,
  disposeDayNightCycle,
  fireCallbacks,
  getCurrentPhase,
  getDayNightStats,
  getIndoorMode,
  getIndoorTint,
  getMoonPhaseInfo,
  getSeason,
  getSeasonSunPath,
  getSpeed,
  getTimeOfDay,
  interpolateKeyframes,
  isEnabled,
  jumpToTime,
  setEnabled,
  setIndoorMode,
  setSeason,
  setSpeed,
  setTimeOfDay,
  smoothJumpToTime,
} from './day-night-cycle';

let instance: BabylonEngineInstance;

beforeEach(() => {
  const result = createTestEngine();
  if (!result.ok) throw new Error('Failed to create test engine');
  instance = result.data;
  const setupResult = applySceneSetup(instance.scene, {});
  if (!setupResult.ok) throw new Error('Failed to apply scene setup');
});

afterEach(() => {
  disposeEngine(instance);
});

// =============================================================================
// interpolateKeyframes — pure math
// =============================================================================

describe('interpolateKeyframes', () => {
  test('midpoint between two keyframes returns averaged values', () => {
    const keyframes = [
      {
        time: 6,
        sunIntensity: 0,
        ambientColor: { r: 0, g: 0, b: 0, a: 1 },
      },
      {
        time: 12,
        sunIntensity: 1,
        ambientColor: { r: 1, g: 1, b: 1, a: 1 },
      },
    ];
    const result = interpolateKeyframes(keyframes, 9);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.sunIntensity).toBeCloseTo(0.5, 2);
    expect(result.data.ambientColor?.r).toBeCloseTo(0.5, 2);
    expect(result.data.ambientColor?.g).toBeCloseTo(0.5, 2);
    expect(result.data.ambientColor?.b).toBeCloseTo(0.5, 2);
  });

  test('exact keyframe time returns that keyframe values', () => {
    const keyframes = [
      { time: 6, sunIntensity: 0.5 },
      { time: 12, sunIntensity: 1.0 },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.sunIntensity).toBeCloseTo(0.5, 2);
  });

  test('midnight wrap-around interpolates correctly', () => {
    const keyframes = [
      { time: 0, sunIntensity: 0 },
      { time: 22, sunIntensity: 0.3 },
    ];
    // 23 is between 22 and 0 (next day), fraction = 0.5
    const result = interpolateKeyframes(keyframes, 23);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // 0.3 → 0.0: midpoint = 0.15
    expect(result.data.sunIntensity).toBeCloseTo(0.15, 2);
  });

  test('only fields present in BOTH keyframes are interpolated', () => {
    const keyframes = [
      { time: 6, sunIntensity: 0.5 },
      { time: 12, fogDensity: 0.8 },
    ];
    const result = interpolateKeyframes(keyframes, 9);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // sunIntensity only in first, fogDensity only in second — neither interpolated
    expect(result.data.sunIntensity).toBeUndefined();
    expect(result.data.fogDensity).toBeUndefined();
  });

  test('environmentIntensity interpolated correctly', () => {
    const keyframes = [
      { time: 6, environmentIntensity: 0.1 },
      { time: 12, environmentIntensity: 0.6 },
    ];
    const result = interpolateKeyframes(keyframes, 9);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.environmentIntensity).toBeCloseTo(0.35, 2);
  });

  test('color lerp produces correct midpoint values', () => {
    const keyframes = [
      {
        time: 0,
        clearColor: { r: 0, g: 0, b: 0, a: 1 },
      },
      {
        time: 12,
        clearColor: { r: 1, g: 0.5, b: 0.2, a: 1 },
      },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.clearColor?.r).toBeCloseTo(0.5, 2);
    expect(result.data.clearColor?.g).toBeCloseTo(0.25, 2);
    expect(result.data.clearColor?.b).toBeCloseTo(0.1, 2);
  });
});

// =============================================================================
// computeSunDirection — pure math
// =============================================================================

describe('computeSunDirection', () => {
  const defaultPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 };

  test('noon returns near-vertical direction (strong negative Y)', () => {
    const result = computeSunDirection(12, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // At noon, sun should be high → large negative Y
    expect(result.data.y).toBeLessThan(-0.5);
  });

  test('sunrise returns near-horizontal from east', () => {
    const result = computeSunDirection(6.01, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // Near sunrise, Y should be near 0 (near horizon)
    expect(Math.abs(result.data.y)).toBeLessThan(0.3);
  });

  test('sunset returns near-horizontal from west', () => {
    const result = computeSunDirection(17.99, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // Near sunset, Y should be near 0 (near horizon)
    expect(Math.abs(result.data.y)).toBeLessThan(0.3);
  });

  test('before sunrise returns zero vector', () => {
    const result = computeSunDirection(4, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.x).toBe(0);
    expect(result.data.y).toBe(0);
    expect(result.data.z).toBe(0);
  });

  test('after sunset returns zero vector', () => {
    const result = computeSunDirection(20, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.x).toBe(0);
    expect(result.data.y).toBe(0);
    expect(result.data.z).toBe(0);
  });

  test('maxElevation=90 noon direction is near {0, -1, 0}', () => {
    const path = { sunrise: 6, sunset: 18, maxElevation: 90, azimuthStart: 90 };
    const result = computeSunDirection(12, path);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.y).toBeCloseTo(-1, 1);
    expect(Math.abs(result.data.x)).toBeLessThan(0.15);
    expect(Math.abs(result.data.z)).toBeLessThan(0.15);
  });

  test('azimuthStart=270 (west) rotates sun path', () => {
    const westPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 270 };
    const eastResult = computeSunDirection(7, defaultPath);
    const westResult = computeSunDirection(7, westPath);
    expect(eastResult.ok).toBeTruthy();
    expect(westResult.ok).toBeTruthy();
    if (!eastResult.ok || !westResult.ok) return;

    // Different azimuth start should produce different X/Z values
    expect(eastResult.data.x).not.toBeCloseTo(westResult.data.x, 1);
  });
});

// =============================================================================
// Cycle Engine — NullEngine integration
// =============================================================================

describe('createDayNightCycle', () => {
  test('creates observer on scene', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.observer).toBeDefined();
  });

  test('missing sunLightId gracefully results in null sun', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 0, sunLightId: 'nonexistent' },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.sunLight).toBeNull();
  });

  test('resolves sun light from managed lights by ID', () => {
    const sunLight: BABYLON.DirectionalLight = new BABYLON.DirectionalLight(
      'sun',
      new BABYLON.Vector3(0, -1, 0),
      instance.scene,
    );
    const managedLights: readonly ManagedLight[] = [
      {
        config: {
          id: 'sun',
          type: 'directional',
          enabled: true,
          intensity: 1,
          diffuse: { r: 1, g: 1, b: 1, a: 1 },
          specular: { r: 1, g: 1, b: 1, a: 1 },
          falloffType: 'default',
          intensityMode: 'automatic',
          direction: { x: 0, y: -1, z: 0 },
          position: { x: 0, y: 50, z: 0 },
          autoCalcShadowZBounds: true,
          shadowFrustumSize: 0,
          shadowOrthoScale: 0.1,
          autoUpdateExtends: true,
          shadowMinZ: 0,
          shadowMaxZ: 0,
          renderPriority: 0,
          layerMask: 268_435_455,
          lightmapMode: 'default',
        },
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];

    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 0, sunLightId: 'sun' },
      managedLights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.sunLight).toBe(sunLight);
  });

  test('uses default keyframes when none provided', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect(result.data.keyframes.length).toBe(DEFAULT_DAY_CYCLE_KEYFRAMES.length);
  });
});

// =============================================================================
// Time Control
// =============================================================================

describe('setTimeOfDay / getTimeOfDay', () => {
  test('setTimeOfDay jumps to specified time', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const setResult = setTimeOfDay(result.data, 18);
    expect(setResult.ok).toBeTruthy();

    const getResult = getTimeOfDay(result.data);
    expect(getResult.ok).toBeTruthy();
    if (!getResult.ok) return;
    expect(getResult.data).toBeCloseTo(18, 2);
  });

  test('getTimeOfDay returns initial time', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 10, speed: 0 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const getResult = getTimeOfDay(result.data);
    expect(getResult.ok).toBeTruthy();
    if (!getResult.ok) return;
    expect(getResult.data).toBeCloseTo(10, 2);
  });
});

// =============================================================================
// Dispose
// =============================================================================

describe('disposeDayNightCycle', () => {
  test('removes observer from scene', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const disposeResult = disposeDayNightCycle({ cycle: result.data, scene: instance.scene });
    expect(disposeResult.ok).toBeTruthy();
  });
});

// =============================================================================
// DEFAULT_DAY_CYCLE_KEYFRAMES
// =============================================================================

describe('DEFAULT_DAY_CYCLE_KEYFRAMES', () => {
  test('has 9 keyframes', () => {
    expect(DEFAULT_DAY_CYCLE_KEYFRAMES).toHaveLength(9);
  });

  test('keyframes are sorted by time', () => {
    for (let i = 1; i < DEFAULT_DAY_CYCLE_KEYFRAMES.length; i++) {
      const current: number | undefined = DEFAULT_DAY_CYCLE_KEYFRAMES[i]?.time;
      const previous: number | undefined = DEFAULT_DAY_CYCLE_KEYFRAMES[i - 1]?.time;
      expect(current).toBeDefined();
      expect(previous).toBeDefined();
      if (current !== undefined && previous !== undefined) {
        expect(current).toBeGreaterThanOrEqual(previous);
      }
    }
  });

  test('first keyframe is at midnight (0)', () => {
    const [first] = DEFAULT_DAY_CYCLE_KEYFRAMES;
    expect(first).toBeDefined();
    expect(first?.time).toBe(0);
  });

  test('default keyframes include post-FX values at noon', () => {
    const noon = DEFAULT_DAY_CYCLE_KEYFRAMES.find((kf) => kf.time === 12);
    expect(noon).toBeDefined();
    expect(noon?.exposure).toBeDefined();
    expect(noon?.bloomWeight).toBeDefined();
    expect(noon?.contrast).toBeDefined();
  });
});

// =============================================================================
// Season Sun Path — pure math
// =============================================================================

describe('getSeasonSunPath', () => {
  test('summer has earliest sunrise and latest sunset', () => {
    const result = getSeasonSunPath('summer');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.sunrise).toBe(5);
    expect(result.data.sunset).toBe(21);
    expect(result.data.maxElevation).toBe(75);
  });

  test('winter has latest sunrise and earliest sunset', () => {
    const result = getSeasonSunPath('winter');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.sunrise).toBe(7.5);
    expect(result.data.sunset).toBe(16.5);
    expect(result.data.maxElevation).toBe(35);
  });

  test('spring has moderate day length', () => {
    const result = getSeasonSunPath('spring');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.sunrise).toBe(6);
    expect(result.data.sunset).toBe(19);
    expect(result.data.maxElevation).toBe(65);
  });

  test('autumn has shorter days than spring', () => {
    const result = getSeasonSunPath('autumn');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.sunrise).toBe(6.5);
    expect(result.data.sunset).toBe(17.5);
    expect(result.data.maxElevation).toBe(55);
  });

  test('all seasons return valid SunPathConfig shape', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const result = getSeasonSunPath(season);
      expect(result.ok).toBeTruthy();
      if (!result.ok) return;
      expect(result.data.sunrise).toBeGreaterThanOrEqual(0);
      expect(result.data.sunset).toBeLessThanOrEqual(24);
      expect(result.data.sunrise).toBeLessThan(result.data.sunset);
      expect(result.data.maxElevation).toBeGreaterThan(0);
      expect(result.data.maxElevation).toBeLessThanOrEqual(90);
    }
  });

  test('unknown season returns error', () => {
    const result = getSeasonSunPath('monsoon');
    expect(result.ok).toBeFalsy();
  });
});

// =============================================================================
// Moon Phase — pure math
// =============================================================================

describe('getMoonPhaseInfo', () => {
  test('new moon (0) has zero intensity multiplier', () => {
    const result = getMoonPhaseInfo(0);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.name).toBe('New Moon');
    expect(result.data.intensityMultiplier).toBe(0);
  });

  test('full moon (4) has maximum intensity multiplier', () => {
    const result = getMoonPhaseInfo(4);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.name).toBe('Full Moon');
    expect(result.data.intensityMultiplier).toBe(1.0);
  });

  test('first quarter (2) has 0.35 intensity', () => {
    const result = getMoonPhaseInfo(2);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.name).toBe('First Quarter');
    expect(result.data.intensityMultiplier).toBe(0.35);
  });

  test('waxing gibbous (3) and waning gibbous (5) have same intensity', () => {
    const waxing = getMoonPhaseInfo(3);
    const waning = getMoonPhaseInfo(5);
    expect(waxing.ok).toBeTruthy();
    expect(waning.ok).toBeTruthy();
    if (!waxing.ok || !waning.ok) return;
    expect(waxing.data.intensityMultiplier).toBe(waning.data.intensityMultiplier);
    expect(waxing.data.intensityMultiplier).toBe(0.7);
  });

  test('waning crescent (7) has 0.15 intensity', () => {
    const result = getMoonPhaseInfo(7);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.name).toBe('Waning Crescent');
    expect(result.data.intensityMultiplier).toBe(0.15);
  });

  test('all 8 phases return valid info', () => {
    for (let phase = 0; phase <= 7; phase++) {
      const result = getMoonPhaseInfo(phase);
      expect(result.ok).toBeTruthy();
      if (!result.ok) return;
      expect(result.data.name).toBeTruthy();
      expect(result.data.intensityMultiplier).toBeGreaterThanOrEqual(0);
      expect(result.data.intensityMultiplier).toBeLessThanOrEqual(1);
      expect(result.data.phase).toBe(phase);
    }
  });

  test('invalid phase returns error', () => {
    const result = getMoonPhaseInfo(8);
    expect(result.ok).toBeFalsy();
  });
});

// =============================================================================
// Transition Easing — pure math
// =============================================================================

describe('applyEasing', () => {
  test('linear easing returns input unchanged', () => {
    const result = applyEasing(0.5, 'linear');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(0.5);
  });

  test('smooth easing at 0 returns 0', () => {
    const result = applyEasing(0, 'smooth');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(0);
  });

  test('smooth easing at 1 returns 1', () => {
    const result = applyEasing(1, 'smooth');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(1);
  });

  test('smooth easing at 0.5 returns 0.5 (symmetric)', () => {
    const result = applyEasing(0.5, 'smooth');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeCloseTo(0.5, 5);
  });

  test('easeIn at 0.5 returns value less than 0.5', () => {
    const result = applyEasing(0.5, 'easeIn');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeLessThan(0.5);
  });

  test('easeOut at 0.5 returns value greater than 0.5', () => {
    const result = applyEasing(0.5, 'easeOut');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeGreaterThan(0.5);
  });

  test('all easings return 0 at t=0 and 1 at t=1', () => {
    for (const easing of [
      'linear',
      'smooth',
      'easeIn',
      'easeOut',
      'easeInOut',
      'sine',
      'cubic',
    ] as const) {
      const at0 = applyEasing(0, easing);
      const at1 = applyEasing(1, easing);
      expect(at0.ok).toBeTruthy();
      expect(at1.ok).toBeTruthy();
      if (!at0.ok || !at1.ok) return;
      expect(at0.data).toBeCloseTo(0, 5);
      expect(at1.data).toBeCloseTo(1, 5);
    }
  });

  test('easeInOut at 0.5 is symmetric midpoint', () => {
    const result = applyEasing(0.5, 'easeInOut');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeCloseTo(0.5, 5);
  });

  test('easeInOut at 0.25 returns value less than 0.25 (slow start)', () => {
    const result = applyEasing(0.25, 'easeInOut');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeLessThan(0.25);
  });

  test('sine at 0.5 is symmetric', () => {
    const result = applyEasing(0.5, 'sine');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeCloseTo(0.5, 5);
  });

  test('cubic at 0.5 returns 0.125', () => {
    const result = applyEasing(0.5, 'cubic');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeCloseTo(0.125, 5);
  });

  test('step at 0.3 returns 0', () => {
    const result = applyEasing(0.3, 'step');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(0);
  });

  test('step at 0.5 returns 1', () => {
    const result = applyEasing(0.5, 'step');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(1);
  });

  test('step at 0.7 returns 1', () => {
    const result = applyEasing(0.7, 'step');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(1);
  });

  test('step at 0 returns 0 and at 1 returns 1', () => {
    const at0 = applyEasing(0, 'step');
    const at1 = applyEasing(1, 'step');
    expect(at0.ok).toBeTruthy();
    expect(at1.ok).toBeTruthy();
    if (!at0.ok || !at1.ok) return;
    expect(at0.data).toBe(0);
    expect(at1.data).toBe(1);
  });
});

// =============================================================================
// Time Phase Detection — pure math
// =============================================================================

describe('computeTimePhase', () => {
  const defaultPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 };

  test('midnight (0:00) returns midnight phase', () => {
    const result = computeTimePhase(0, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('midnight');
  });

  test('3:00 AM returns midnight phase', () => {
    const result = computeTimePhase(3, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('midnight');
  });

  test('just before sunrise (5:5) returns dawn', () => {
    const result = computeTimePhase(5.5, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('dawn');
  });

  test('after sunrise (7:00) returns morning', () => {
    const result = computeTimePhase(7, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('morning');
  });

  test('noon (12:00) returns noon', () => {
    const result = computeTimePhase(12, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('noon');
  });

  test('3pm returns afternoon', () => {
    const result = computeTimePhase(15, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('afternoon');
  });

  test('just before sunset returns dusk', () => {
    const result = computeTimePhase(17.5, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('dusk');
  });

  test('after sunset (19:00) returns twilight', () => {
    const result = computeTimePhase(19, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('twilight');
  });

  test('late evening (21:00) returns night', () => {
    const result = computeTimePhase(21, defaultPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('night');
  });

  test('winter sunrise shifts dawn later', () => {
    const winterPath = { sunrise: 7.5, sunset: 16.5, maxElevation: 35, azimuthStart: 90 };
    const result = computeTimePhase(6, winterPath);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe('midnight');
  });
});

// =============================================================================
// Indoor Mode — pure math
// =============================================================================

describe('getIndoorTint', () => {
  test('outdoor returns null (no override)', () => {
    const result = getIndoorTint('outdoor');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  test('indoor returns warm amber tint', () => {
    const result = getIndoorTint('indoor');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (result.data === null) return;
    expect(result.data.ambientColor?.r).toBeGreaterThan(0.3);
    expect(result.data.ambientColor?.g).toBeGreaterThan(0.2);
  });

  test('cave returns dark blue tint', () => {
    const result = getIndoorTint('cave');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (result.data === null) return;
    expect(result.data.ambientColor?.b).toBeGreaterThan(result.data.ambientColor?.r ?? 0);
    expect(result.data.environmentIntensity).toBeLessThan(0.1);
  });

  test('indoor has no sun or moon influence', () => {
    const result = getIndoorTint('indoor');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    if (result.data === null) return;
    expect(result.data.sunIntensity).toBe(0);
    expect(result.data.moonIntensity).toBe(0);
  });

  test('firelit returns warm orange-red tint', () => {
    const result = getIndoorTint('firelit');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (result.data === null) return;
    expect(result.data.ambientColor?.r).toBeGreaterThan(0.4);
    expect(result.data.ambientColor?.g).toBeGreaterThan(0.2);
    expect(result.data.sunIntensity).toBe(0);
    expect(result.data.moonIntensity).toBe(0);
    expect(result.data.environmentIntensity).toBeCloseTo(0.25);
  });

  test('dungeon returns cold gray-blue tint', () => {
    const result = getIndoorTint('dungeon');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (result.data === null) return;
    expect(result.data.ambientColor?.b).toBeGreaterThanOrEqual(result.data.ambientColor?.r ?? 0);
    expect(result.data.sunIntensity).toBe(0);
    expect(result.data.moonIntensity).toBe(0);
    expect(result.data.environmentIntensity).toBeCloseTo(0.05);
  });

  test('temple returns soft gold tint', () => {
    const result = getIndoorTint('temple');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (result.data === null) return;
    expect(result.data.ambientColor?.r).toBeGreaterThan(0.3);
    expect(result.data.sunIntensity).toBe(0);
    expect(result.data.moonIntensity).toBe(0);
    expect(result.data.environmentIntensity).toBeCloseTo(0.3);
  });

  test('underwater returns deep blue-green tint', () => {
    const result = getIndoorTint('underwater');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (result.data === null) return;
    expect(result.data.ambientColor?.b).toBeGreaterThan(result.data.ambientColor?.r ?? 0);
    expect(result.data.ambientColor?.g).toBeGreaterThan(result.data.ambientColor?.r ?? 0);
    expect(result.data.sunIntensity).toBe(0);
    expect(result.data.moonIntensity).toBe(0);
    expect(result.data.environmentIntensity).toBeCloseTo(0.15);
  });

  test('custom returns null (no tint without config)', () => {
    const result = getIndoorTint('custom');
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });
});

// =============================================================================
// Extended API — setSpeed, getSpeed, setEnabled, isEnabled
// =============================================================================

describe('setSpeed / getSpeed', () => {
  test('setSpeed changes cycle speed', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 1 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const setResult = setSpeed(result.data, 5);
    expect(setResult.ok).toBeTruthy();

    const getResult = getSpeed(result.data);
    expect(getResult.ok).toBeTruthy();
    if (!getResult.ok) return;
    expect(getResult.data).toBe(5);
  });

  test('getSpeed returns initial speed', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 3 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const getResult = getSpeed(result.data);
    expect(getResult.ok).toBeTruthy();
    if (!getResult.ok) return;
    expect(getResult.data).toBe(3);
  });
});

describe('setEnabled / isEnabled', () => {
  test('setEnabled(false) pauses the cycle', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 1 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const setResult = setEnabled(result.data, false);
    expect(setResult.ok).toBeTruthy();

    const checkResult = isEnabled(result.data);
    expect(checkResult.ok).toBeTruthy();
    if (!checkResult.ok) return;
    expect(checkResult.data).toBe(false);
  });

  test('setEnabled(true) resumes the cycle', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 1 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    setEnabled(result.data, false);
    setEnabled(result.data, true);

    const checkResult = isEnabled(result.data);
    expect(checkResult.ok).toBeTruthy();
    if (!checkResult.ok) return;
    expect(checkResult.data).toBe(true);
  });

  test('isEnabled returns true for new cycle', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 12, speed: 1 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const checkResult = isEnabled(result.data);
    expect(checkResult.ok).toBeTruthy();
    if (!checkResult.ok) return;
    expect(checkResult.data).toBe(true);
  });
});

// =============================================================================
// Event Callbacks
// =============================================================================

describe('event callbacks', () => {
  test('onHourChange fires when integer hour changes', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 11.9, speed: 0 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const hours: number[] = [];
    result.data.onHourChange = (hour) => {
      hours.push(hour);
    };

    setTimeOfDay(result.data, 12.1);
    fireCallbacks(result.data, 11.9);
    expect(hours).toContain(12);
  });

  test('onPhaseChange fires when phase transitions', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 5, speed: 0 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    const phases: string[] = [];
    result.data.onPhaseChange = (phase) => {
      phases.push(phase);
    };

    setTimeOfDay(result.data, 8);
    fireCallbacks(result.data, 5);
    expect(phases.length).toBeGreaterThan(0);
  });

  test('onSunrise fires when crossing sunrise', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: {
        enabled: true,
        timeOfDay: 5.5,
        speed: 0,
        sunPath: { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 },
      },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    let sunriseFired = false;
    result.data.onSunrise = () => {
      sunriseFired = true;
    };

    setTimeOfDay(result.data, 6.5);
    fireCallbacks(result.data, 5.5);
    expect(sunriseFired).toBe(true);
  });

  test('onSunset fires when crossing sunset', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: {
        enabled: true,
        timeOfDay: 17.5,
        speed: 0,
        sunPath: { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 },
      },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    let sunsetFired = false;
    result.data.onSunset = () => {
      sunsetFired = true;
    };

    setTimeOfDay(result.data, 18.5);
    fireCallbacks(result.data, 17.5);
    expect(sunsetFired).toBe(true);
  });

  test('callbacks are optional — no error when unset', () => {
    const result = createDayNightCycle({
      scene: instance.scene,
      config: { enabled: true, timeOfDay: 5, speed: 0 },
      managedLights: [],
    });
    if (!result.ok) throw new Error('Failed to create cycle');

    expect(() => fireCallbacks(result.data, 3)).not.toThrow();
  });
});

// =============================================================================
// Interpolation with easing + moon phase
// =============================================================================

describe('interpolateKeyframes with easing', () => {
  test('smooth easing at midpoint equals linear (smoothstep(0.5) = 0.5)', () => {
    const keyframes = [
      { time: 6, sunIntensity: 0 },
      { time: 12, sunIntensity: 1 },
    ];
    const smooth = interpolateKeyframes(keyframes, 9, 'smooth');
    expect(smooth.ok).toBeTruthy();
    if (!smooth.ok) return;
    expect(smooth.data.sunIntensity).toBeCloseTo(0.5, 2);
  });

  test('easeIn at quarter point produces lower value than linear', () => {
    const keyframes = [
      { time: 0, sunIntensity: 0 },
      { time: 12, sunIntensity: 1 },
    ];
    const linear = interpolateKeyframes(keyframes, 3, 'linear');
    const easeIn = interpolateKeyframes(keyframes, 3, 'easeIn');
    expect(linear.ok).toBeTruthy();
    expect(easeIn.ok).toBeTruthy();
    if (!linear.ok || !easeIn.ok) return;
    expect(easeIn.data.sunIntensity).toBeLessThan(linear.data.sunIntensity ?? 1);
  });
});

describe('moon phase multiplier on interpolated values', () => {
  test('new moon zeroes out moonIntensity', () => {
    const keyframes = [
      { time: 0, moonIntensity: 0.5 },
      { time: 12, moonIntensity: 0.5 },
    ];
    const result = interpolateKeyframes(keyframes, 6, 'linear', 0);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.moonIntensity).toBeCloseTo(0, 5);
  });

  test('full moon preserves moonIntensity', () => {
    const keyframes = [
      { time: 0, moonIntensity: 0.5 },
      { time: 12, moonIntensity: 0.5 },
    ];
    const result = interpolateKeyframes(keyframes, 6, 'linear', 4);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.moonIntensity).toBeCloseTo(0.5, 5);
  });
});

// =============================================================================
// Post-FX keyframe interpolation
// =============================================================================

describe('post-FX keyframe interpolation', () => {
  test('exposure is interpolated between keyframes', () => {
    const keyframes = [
      { time: 0, exposure: 0.5 },
      { time: 12, exposure: 1.5 },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.exposure).toBeCloseTo(1.0, 2);
  });

  test('bloomWeight is interpolated between keyframes', () => {
    const keyframes = [
      { time: 0, bloomWeight: 0.2 },
      { time: 12, bloomWeight: 0.8 },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.bloomWeight).toBeCloseTo(0.5, 2);
  });

  test('contrast is interpolated between keyframes', () => {
    const keyframes = [
      { time: 0, contrast: 0.8 },
      { time: 12, contrast: 1.2 },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.contrast).toBeCloseTo(1.0, 2);
  });
});

// =============================================================================
// Test helper for creating a cycle with a sun light
// =============================================================================

const SUN_CONFIG = {
  id: 'sun',
  type: 'directional' as const,
  enabled: true,
  intensity: 1,
  diffuse: { r: 1, g: 1, b: 1, a: 1 },
  specular: { r: 1, g: 1, b: 1, a: 1 },
  falloffType: 'default' as const,
  intensityMode: 'automatic' as const,
  direction: { x: 0, y: -1, z: 0 },
  position: { x: 0, y: 50, z: 0 },
  autoCalcShadowZBounds: true,
  shadowFrustumSize: 0,
  shadowOrthoScale: 0.1,
  autoUpdateExtends: true,
  shadowMinZ: 0,
  shadowMaxZ: 0,
  renderPriority: 0,
  layerMask: 268_435_455,
  lightmapMode: 'default' as const,
};

// =============================================================================
// jumpToTime
// =============================================================================

describe('jumpToTime', () => {
  test('sets time immediately without smooth option', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun' },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const jumpResult = jumpToTime(cycle, 18);
    expect(jumpResult.ok).toBeTruthy();
    expect(cycle.timeOfDay).toBeCloseTo(18, 1);

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });

  test('rejects invalid time values', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun' },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const jumpResult = jumpToTime(cycle, 25);
    expect(jumpResult.ok).toBeFalsy();

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });
});

// =============================================================================
// getCurrentPhase
// =============================================================================

describe('getCurrentPhase', () => {
  test('returns the current time phase from instance', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun', timeOfDay: 12 },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const phaseResult = getCurrentPhase(cycle);
    expect(phaseResult.ok).toBeTruthy();
    if (!phaseResult.ok) return;
    expect(phaseResult.data).toBe('noon');

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });
});

// =============================================================================
// setSeason / getSeason
// =============================================================================

describe('setSeason / getSeason', () => {
  test('sets and gets the season on config', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun' },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const setResult = setSeason(cycle, 'winter');
    expect(setResult.ok).toBeTruthy();

    const getResult = getSeason(cycle);
    expect(getResult.ok).toBeTruthy();
    if (!getResult.ok) return;
    expect(getResult.data).toBe('winter');

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });

  test('rejects invalid season names', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun' },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const setResult = setSeason(cycle, 'monsoon');
    expect(setResult.ok).toBeFalsy();

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });
});

// =============================================================================
// setIndoorMode / getIndoorMode
// =============================================================================

describe('setIndoorMode / getIndoorMode', () => {
  test('sets and gets the indoor mode on config', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun' },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const setResult = setIndoorMode(cycle, 'cave');
    expect(setResult.ok).toBeTruthy();

    const getResult = getIndoorMode(cycle);
    expect(getResult.ok).toBeTruthy();
    if (!getResult.ok) return;
    expect(getResult.data).toBe('cave');

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });

  test('rejects invalid indoor mode names', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0, -1, 0), scene);
    const lights: readonly ManagedLight[] = [
      {
        config: SUN_CONFIG,
        light: sunLight,
        shadowGenerator: null,
        flickerInstance: null,
        volumetricPostProcess: null,
        lensFlareSystem: null,
        lensFlareEmitter: null,
        distanceFadeObserver: null,
      },
    ];
    const result = createDayNightCycle({
      scene,
      config: { sunLightId: 'sun' },
      managedLights: lights,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const setResult = setIndoorMode(cycle, 'lava');
    expect(setResult.ok).toBeFalsy();

    disposeDayNightCycle({ scene, cycle });
    sunLight.dispose();
  });
});

// =============================================================================
// Sky Field Interpolation
// =============================================================================

describe('sky field interpolation', () => {
  test('interpolates skyColor between keyframes', () => {
    const keyframes = [
      { time: 0, skyColor: { r: 0, g: 0, b: 0.1, a: 1 } },
      { time: 12, skyColor: { r: 0.3, g: 0.5, b: 0.9, a: 1 } },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.skyColor?.r).toBeCloseTo(0.15, 2);
    expect(result.data.skyColor?.g).toBeCloseTo(0.25, 2);
    expect(result.data.skyColor?.b).toBeCloseTo(0.5, 2);
  });

  test('interpolates skyGradientTop and skyGradientBottom', () => {
    const keyframes = [
      {
        time: 0,
        skyGradientTop: { r: 0, g: 0, b: 0.1, a: 1 },
        skyGradientBottom: { r: 0, g: 0, b: 0.05, a: 1 },
      },
      {
        time: 12,
        skyGradientTop: { r: 0.3, g: 0.5, b: 0.9, a: 1 },
        skyGradientBottom: { r: 0.9, g: 0.9, b: 1, a: 1 },
      },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    // At time 6 (halfway), should be ~50% blend
    expect(result.data.skyGradientTop?.r).toBeCloseTo(0.15, 2);
    expect(result.data.skyGradientTop?.b).toBeCloseTo(0.5, 2);
    expect(result.data.skyGradientBottom?.r).toBeCloseTo(0.45, 2);
    expect(result.data.skyGradientBottom?.b).toBeCloseTo(0.525, 2);
  });

  test('fogSyncSky uses lower keyframe value (boolean, not interpolated)', () => {
    const keyframes = [
      { time: 0, fogSyncSky: true },
      { time: 12, fogSyncSky: false },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    // Boolean field — uses lower keyframe value
    expect(result.data.fogSyncSky).toBe(true);
  });

  test('fogSyncSky is undefined when not in both keyframes', () => {
    const keyframes = [
      { time: 0, sunIntensity: 1 },
      { time: 12, sunIntensity: 0.5 },
    ];
    const result = interpolateKeyframes(keyframes, 6);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.fogSyncSky).toBeUndefined();
  });

  test('default keyframes include skyGradientTop and skyGradientBottom', () => {
    const noon = DEFAULT_DAY_CYCLE_KEYFRAMES.find((kf) => kf.time === 12);
    expect(noon).toBeDefined();
    expect(noon?.skyGradientTop).toBeDefined();
    expect(noon?.skyGradientBottom).toBeDefined();
  });

  test('single keyframe with sky fields returns them directly', () => {
    const keyframes = [
      {
        time: 12,
        skyColor: { r: 0.5, g: 0.6, b: 0.8, a: 1 },
        skyGradientTop: { r: 0.3, g: 0.5, b: 0.9, a: 1 },
      },
    ];
    const result = interpolateKeyframes(keyframes, 12);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.skyColor?.r).toBeCloseTo(0.5, 2);
    expect(result.data.skyGradientTop?.b).toBeCloseTo(0.9, 2);
  });
});

// =============================================================================
// Time Source Logic (Task 6)
// =============================================================================

describe('time source logic', () => {
  test('manual time source does NOT advance time', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 1, timeSource: 'manual' },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    // Simulate a frame
    scene.render();
    // Time should NOT have changed
    expect(cycle.timeOfDay).toBe(12);

    disposeDayNightCycle({ cycle, scene });
  });

  test('accelerated with dayDurationSeconds computes correct speed', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const engine: BABYLON.NullEngine = scene.getEngine() as BABYLON.NullEngine;
    const originalGetDelta = engine.getDeltaTime.bind(engine);
    engine.getDeltaTime = () => 16; // 16ms = ~60fps
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        timeSource: 'accelerated',
        dayDurationSeconds: 24,
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;
    // speed = 24/24 = 1 game-hour per real second
    // dt = 16ms = 0.016s → time advances by 0.016 hours
    scene.render();
    expect(cycle.timeOfDay).toBeGreaterThan(12);

    engine.getDeltaTime = originalGetDelta;
    disposeDayNightCycle({ cycle, scene });
  });

  test('reverse: true makes time go backward', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const engine: BABYLON.NullEngine = scene.getEngine() as BABYLON.NullEngine;
    const originalGetDelta = engine.getDeltaTime.bind(engine);
    engine.getDeltaTime = () => 16;
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        speed: 10,
        timeSource: 'accelerated',
        reverse: true,
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    scene.render();
    // Time should have decreased
    expect(cycle.timeOfDay).toBeLessThan(12);

    engine.getDeltaTime = originalGetDelta;
    disposeDayNightCycle({ cycle, scene });
  });
});

// =============================================================================
// Indoor Mode haltTime (Task 9)
// =============================================================================

describe('indoor mode haltTime', () => {
  test('haltTime prevents time advancement', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        speed: 10,
        indoorMode: 'indoor',
        indoorModeConfig: { haltTime: true },
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    scene.render();
    // Time should NOT have advanced due to haltTime
    expect(cycle.timeOfDay).toBe(12);

    disposeDayNightCycle({ cycle, scene });
  });

  test('haltTime: false does not prevent advancement', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const engine: BABYLON.NullEngine = scene.getEngine() as BABYLON.NullEngine;
    const originalGetDelta = engine.getDeltaTime.bind(engine);
    engine.getDeltaTime = () => 16;
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        speed: 10,
        indoorMode: 'cave',
        indoorModeConfig: { haltTime: false },
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    scene.render();
    // With haltTime: false, time should advance normally
    // (indoor modes skip interpolation but time still advances)
    expect(cycle.timeOfDay).not.toBe(12);

    engine.getDeltaTime = originalGetDelta;
    disposeDayNightCycle({ cycle, scene });
  });
});

// =============================================================================
// Statistics API (Task 11)
// =============================================================================

describe('getDayNightStats', () => {
  test('returns all expected stat fields', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    const stats = getDayNightStats(cycle);
    expect(stats.ok).toBeTruthy();
    if (!stats.ok) return;

    expect(stats.data.currentTime).toBeDefined();
    expect(stats.data.currentPhase).toBeDefined();
    expect(stats.data.currentSeason).toBeDefined();
    expect(stats.data.currentDay).toBeDefined();
    expect(stats.data.sunElevation).toBeDefined();
    expect(stats.data.moonPhaseName).toBeDefined();
    expect(stats.data.effectiveSpeed).toBeDefined();
    expect(stats.data.framesRendered).toBeDefined();
    expect(stats.data.totalElapsedSeconds).toBeDefined();

    disposeDayNightCycle({ cycle, scene });
  });

  test('framesRendered increments with each render', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;

    scene.render();
    scene.render();
    scene.render();

    const stats = getDayNightStats(cycle);
    expect(stats.ok).toBeTruthy();
    if (!stats.ok) return;
    expect(stats.data.framesRendered).toBeGreaterThanOrEqual(3);

    disposeDayNightCycle({ cycle, scene });
  });

  test('currentTime is formatted as HH:MM', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 14.5, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const stats = getDayNightStats(result.data);
    expect(stats.ok).toBeTruthy();
    if (!stats.ok) return;
    expect(stats.data.currentTime).toMatch(/^\d{2}:\d{2}$/);

    disposeDayNightCycle({ cycle: result.data, scene });
  });

  test('daylightRemaining is non-null during daytime', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const stats = getDayNightStats(result.data);
    expect(stats.ok).toBeTruthy();
    if (!stats.ok) return;
    expect(stats.data.daylightRemaining).not.toBeNull();
    expect(stats.data.nighttimeRemaining).toBeNull();

    disposeDayNightCycle({ cycle: result.data, scene });
  });
});

// =============================================================================
// Smooth Jump (Task 12)
// =============================================================================

describe('smoothJumpToTime', () => {
  test('returns ok for valid target time', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const jumpResult = smoothJumpToTime(result.data, 18, 1000);
    expect(jumpResult.ok).toBeTruthy();

    disposeDayNightCycle({ cycle: result.data, scene });
  });

  test('rejects invalid target time', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const jumpResult = smoothJumpToTime(result.data, 25, 1000);
    expect(jumpResult.ok).toBeFalsy();

    disposeDayNightCycle({ cycle: result.data, scene });
  });

  test('sets jump target on instance', () => {
    const { scene } = instance;
    applySceneSetup(scene, {});
    const result = createDayNightCycle({
      scene,
      config: { enabled: true, timeOfDay: 12, speed: 0 },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    smoothJumpToTime(result.data, 18, 1000);
    expect(result.data._jumpTarget).toBe(18);

    disposeDayNightCycle({ cycle: result.data, scene });
  });
});

// =============================================================================
// computeRealMoonPhase (Task 8)
// =============================================================================

describe('computeRealMoonPhase', () => {
  test('returns integer phase [0, 7]', () => {
    const result = computeRealMoonPhase();
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeGreaterThanOrEqual(0);
    expect(result.data).toBeLessThanOrEqual(7);
    expect(Number.isInteger(result.data)).toBe(true);
  });

  test('known new moon epoch produces phase 0', () => {
    // Jan 6, 2000 is a known new moon
    const epoch = new Date(2000, 0, 6).getTime();
    const result = computeRealMoonPhase(epoch);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBe(0);
  });
});

// =============================================================================
// speed=0 pause with dayDurationSeconds
// =============================================================================

describe('speed=0 pause with dayDurationSeconds', () => {
  test('speed=0 prevents time advancement even with dayDurationSeconds set', () => {
    const { scene } = instance;
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const engine: BABYLON.NullEngine = scene.getEngine() as BABYLON.NullEngine;
    const originalGetDelta = engine.getDeltaTime.bind(engine);
    engine.getDeltaTime = () => 16;
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        speed: 0,
        dayDurationSeconds: 24,
        timeSource: 'accelerated',
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;
    scene.render();
    // Time should NOT advance because speed is explicitly 0 (paused)
    expect(cycle.timeOfDay).toBe(12);
    engine.getDeltaTime = originalGetDelta;
    disposeDayNightCycle({ cycle, scene });
  });

  test('initialSpeed derived from dayDurationSeconds when speed not set', () => {
    const { scene } = instance;
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        dayDurationSeconds: 24,
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;
    // speed = 24/24 = 1
    expect(cycle.speed).toBe(1);
    disposeDayNightCycle({ cycle, scene });
  });
});

// =============================================================================
// Season auto-cycling
// =============================================================================

describe('season auto-cycling', () => {
  test('season advances based on currentDay and seasonDurationDays', () => {
    const { scene } = instance;
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const engine: BABYLON.NullEngine = scene.getEngine() as BABYLON.NullEngine;
    const originalGetDelta = engine.getDeltaTime.bind(engine);
    engine.getDeltaTime = () => 16;
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        speed: 0,
        currentDay: 0,
        seasonDurationDays: 7,
        seasonOrder: ['spring', 'summer', 'autumn', 'winter'],
        timeSource: 'accelerated',
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;
    // Day 0, seasonDuration=7 → index = floor(0/7) % 4 = 0 → spring
    scene.render();
    expect(cycle.config.season).toBe('spring');

    // Manually advance currentDay to 7 → index = floor(7/7) % 4 = 1 → summer
    cycle._currentDay = 7 as Num;
    scene.render();
    expect(cycle.config.season).toBe('summer');

    // Day 14 → index = 2 → autumn
    cycle._currentDay = 14 as Num;
    scene.render();
    expect(cycle.config.season).toBe('autumn');

    // Day 21 → index = 3 → winter
    cycle._currentDay = 21 as Num;
    scene.render();
    expect(cycle.config.season).toBe('winter');

    // Day 28 → wraps back to spring
    cycle._currentDay = 28 as Num;
    scene.render();
    expect(cycle.config.season).toBe('spring');

    engine.getDeltaTime = originalGetDelta;
    disposeDayNightCycle({ cycle, scene });
  });
});

// =============================================================================
// getDayNightStats effectiveSpeed with speed=0
// =============================================================================

describe('getDayNightStats with speed=0', () => {
  test('effectiveSpeed is 0 when cycle speed is 0', () => {
    const { scene } = instance;
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        speed: 0,
        dayDurationSeconds: 24,
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;
    const stats = getDayNightStats(cycle);
    expect(stats.ok).toBeTruthy();
    if (!stats.ok) return;
    expect(stats.data.effectiveSpeed).toBe(0);
    disposeDayNightCycle({ cycle, scene });
  });

  test('effectiveSpeed is non-zero when cycle speed is non-zero', () => {
    const { scene } = instance;
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);
    const result = createDayNightCycle({
      scene,
      config: {
        enabled: true,
        timeOfDay: 12,
        dayDurationSeconds: 24,
      },
      managedLights: [],
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    const cycle = result.data;
    const stats = getDayNightStats(cycle);
    expect(stats.ok).toBeTruthy();
    if (!stats.ok) return;
    // speed = 24/24 = 1, so effectiveSpeed should be 1
    expect(stats.data.effectiveSpeed).toBe(1);
    disposeDayNightCycle({ cycle, scene });
  });
});
