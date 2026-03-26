// @vitest-environment jsdom

/**
 * Transition manager tests.
 *
 * Tests the core transition engine including {@link playTransition},
 * {@link applyTransitionEasing}, and convenience wrappers
 * ({@link fadeToBlack}, {@link fadeToWhite}, {@link fadeToColor},
 * {@link screenFlash}, {@link screenTint}).
 *
 * Uses jsdom environment for Babylon.js PostProcess integration with
 * NullEngine.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { TransitionType } from '../schemas/transition-config';

import {
  applyTransitionEasing,
  fadeToBlack,
  fadeToColor,
  fadeToWhite,
  playTransition,
  screenFlash,
  screenTint,
} from './transition-manager';

// =============================================================================
// Setup / Teardown
// =============================================================================

let instance: BabylonEngineInstance;
let camera: BABYLON.FreeCamera;

beforeEach(() => {
  const result = createTestEngine();
  if (!result.ok) throw new Error('Failed to create test engine');
  instance = result.data;
  // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
  camera = new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), instance.scene);
});

afterEach(() => {
  disposeEngine(instance);
});

// =============================================================================
// playTransition
// =============================================================================

describe('playTransition', () => {
  test('returns ok with TransitionHandle', () => {
    const result = playTransition({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      config: { type: 'fade' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });

  test('dispose cleans up PostProcess from camera', () => {
    const ppCountBefore: number = camera._postProcesses.filter(Boolean).length;

    // Use reverse=true so PostProcess is attached immediately (no deferral).
    // "Out" transitions defer attachment until isReady() — not testable
    // synchronously in unit tests.
    const result = playTransition({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      config: { type: 'fade', reverse: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(camera._postProcesses.filter(Boolean).length).toBeGreaterThan(ppCountBefore);
    result.data.dispose();
    expect(camera._postProcesses.filter(Boolean).length).toBe(ppCountBefore);
  });

  test('accepts all 28 transition types without error', () => {
    const allTypes: readonly TransitionType[] = [
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
    ];

    for (const type of allTypes) {
      const result = playTransition({
        scene: instance.scene,
        camera,
        engine: instance.engine,
        config: { type },
      });
      expect(result.ok, `type '${type}' should succeed`).toBe(true);
      if (result.ok) {
        result.data.dispose();
      }
    }
  });

  test('double dispose is safe', () => {
    const result = playTransition({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      config: { type: 'fade' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    result.data.dispose();
    expect(() => result.data.dispose()).not.toThrow();
  });

  test('passes type-specific params (circleIris with center, easing, edgeSoftness)', () => {
    const result = playTransition({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      config: {
        type: 'circleIris',
        centerX: 0.3,
        centerY: 0.7,
        easing: 'easeOut',
        edgeSoftness: 0.1,
        durationMs: 500,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });

  test('returns error for invalid config', () => {
    const result = playTransition({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      config: { type: 'invalidType' },
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// applyTransitionEasing
// =============================================================================

describe('applyTransitionEasing', () => {
  test('linear returns input unchanged', () => {
    expect(applyTransitionEasing(0.5, 'linear')).toBe(0.5);
    expect(applyTransitionEasing(0, 'linear')).toBe(0);
    expect(applyTransitionEasing(1, 'linear')).toBe(1);
  });

  test('easeIn at 0 returns 0, at 1 returns ~1', () => {
    expect(applyTransitionEasing(0, 'easeIn')).toBe(0);
    expect(applyTransitionEasing(1, 'easeIn')).toBeCloseTo(1, 5);
  });

  test('easeOut at 0 returns 0, at 1 returns ~1', () => {
    expect(applyTransitionEasing(0, 'easeOut')).toBe(0);
    expect(applyTransitionEasing(1, 'easeOut')).toBeCloseTo(1, 5);
  });

  test('easeInOut at 0.5 returns ~0.5', () => {
    expect(applyTransitionEasing(0.5, 'easeInOut')).toBeCloseTo(0.5, 5);
  });

  test('easeOutBack overshoots (value at 0.4 > 0.4)', () => {
    const value: number = applyTransitionEasing(0.4, 'easeOutBack');
    expect(value).toBeGreaterThan(0.4);
  });

  test('easeInOutCubic at boundaries (0 returns 0, 1 returns ~1)', () => {
    expect(applyTransitionEasing(0, 'easeInOutCubic')).toBe(0);
    expect(applyTransitionEasing(1, 'easeInOutCubic')).toBeCloseTo(1, 5);
  });
});

// =============================================================================
// Convenience Wrappers
// =============================================================================

describe('fadeToBlack', () => {
  test('returns ok with handle and disposes cleanly', () => {
    const result = fadeToBlack({
      scene: instance.scene,
      camera,
      engine: instance.engine,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });
});

describe('fadeToWhite', () => {
  test('returns ok with handle and disposes cleanly', () => {
    const result = fadeToWhite({
      scene: instance.scene,
      camera,
      engine: instance.engine,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });
});

describe('fadeToColor', () => {
  test('returns ok with handle for red color and disposes cleanly', () => {
    const result = fadeToColor({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      color: { r: 1, g: 0, b: 0 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });
});

describe('screenFlash', () => {
  test('returns ok with handle and disposes cleanly', () => {
    const result = screenFlash({
      scene: instance.scene,
      camera,
      engine: instance.engine,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });
});

describe('screenTint', () => {
  test('returns ok with handle for red tint and disposes cleanly', () => {
    const result = screenTint({
      scene: instance.scene,
      camera,
      engine: instance.engine,
      color: { r: 1, g: 0, b: 0 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty('dispose');
    result.data.dispose();
  });
});
