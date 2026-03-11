/**
 * Screen shake module tests.
 *
 * Tests the trauma-based screen shake system with Perlin noise,
 * 3 channels (translation, rotation, FOV), ASR envelope, and
 * multiple decay modes.
 *
 * Groups:
 * 1. Trauma system — addTrauma, getTrauma, resetTrauma
 * 2. screenShake function — creation, handle, disposal, validation
 * 3. computeEnvelopeMultiplier — pure function envelope math
 * 4. applyDecay — pure function decay curves
 * 5. Channel computation — disabled channels produce no offset
 * 6. stopAllShakes — cancellation and cleanup
 * 7. Global controls — globalScale, masterEnabled
 *
 * @module
 */

/* eslint-disable max-lines-per-function */

import type * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from './engine';
import { createCamera } from './camera-controller';
import {
  addTrauma,
  getTrauma,
  resetTrauma,
  stopAllShakes,
  screenShake,
  computeEnvelopeMultiplier,
  applyDecay,
  setGlobalScale,
  getGlobalScale,
  setMasterEnabled,
  getMasterEnabled,
} from './screen-shake';

let instance: BabylonEngineInstance;

beforeEach(() => {
  const result = createTestEngine();
  if (!result.ok) throw new Error('Failed to create test engine');
  instance = result.data;
  resetTrauma();
  setGlobalScale(1.0);
  setMasterEnabled(true);
});

afterEach(() => {
  stopAllShakes();
  disposeEngine(instance);
});

// =============================================================================
// Group 1 — Trauma system
// =============================================================================

describe('Trauma system', () => {
  test('getTrauma returns 0 initially', () => {
    expect(getTrauma()).toBe(0);
  });

  test('addTrauma increases current trauma', () => {
    addTrauma(0.3);
    expect(getTrauma()).toBeCloseTo(0.3);
  });

  test('addTrauma clamps at 1.0', () => {
    addTrauma(1.5);
    expect(getTrauma()).toBe(1.0);
  });

  test('multiple addTrauma calls accumulate', () => {
    addTrauma(0.3);
    addTrauma(0.4);
    expect(getTrauma()).toBeCloseTo(0.7);
  });

  test('multiple addTrauma calls accumulate but clamp at 1.0', () => {
    addTrauma(0.6);
    addTrauma(0.6);
    expect(getTrauma()).toBe(1.0);
  });

  test('resetTrauma sets trauma to 0', () => {
    addTrauma(0.8);
    resetTrauma();
    expect(getTrauma()).toBe(0);
  });
});

// =============================================================================
// Group 2 — screenShake function
// =============================================================================

describe('screenShake function', () => {
  test('returns ok BabylonResult with ShakeHandle', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 0.5,
    });
    expect(result.ok).toBeTruthy();
  });

  test('returned handle has dispose function', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 0.5,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(typeof result.data.dispose).toBe('function');
  });

  test('dispose does not throw when called multiple times', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 0.5,
    });
    if (!result.ok) throw new Error('Failed to create shake');

    expect(() => {
      result.data.dispose();
      result.data.dispose();
      result.data.dispose();
    }).not.toThrow();
  });

  test('accepts minimal config (intensity + scene + camera only)', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 0.5,
    });
    expect(result.ok).toBeTruthy();
    if (result.ok) result.data.dispose();
  });

  test('rejects invalid config (negative intensity)', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: -1,
    });
    expect(result.ok).toBeFalsy();
  });
});

// =============================================================================
// Group 3 — computeEnvelopeMultiplier (pure function)
// =============================================================================

describe('computeEnvelopeMultiplier', () => {
  test('returns 0 at t=0 with attack > 0', () => {
    const result = computeEnvelopeMultiplier(
      0,
      { attackMs: 100, sustainMs: 0, decayMs: 300 },
      'linear',
    );
    expect(result).toBe(0);
  });

  test('returns 1 during sustain phase', () => {
    // attackMs=100, sustainMs=200 => sustain from 100..300
    const result = computeEnvelopeMultiplier(
      200,
      { attackMs: 100, sustainMs: 200, decayMs: 300 },
      'linear',
    );
    expect(result).toBe(1);
  });

  test('returns 0 at end (elapsed >= total duration)', () => {
    // total = 100 + 200 + 300 = 600
    const result = computeEnvelopeMultiplier(
      600,
      { attackMs: 100, sustainMs: 200, decayMs: 300 },
      'linear',
    );
    expect(result).toBe(0);
  });

  test('returns 0 past end (elapsed > total duration)', () => {
    const result = computeEnvelopeMultiplier(
      1000,
      { attackMs: 100, sustainMs: 200, decayMs: 300 },
      'linear',
    );
    expect(result).toBe(0);
  });

  test('linear decay is ~0.5 at midpoint', () => {
    // attackMs=0, sustainMs=0, decayMs=300 => decay 0..300
    // midpoint = 150
    const result = computeEnvelopeMultiplier(
      150,
      { attackMs: 0, sustainMs: 0, decayMs: 300 },
      'linear',
    );
    expect(result).toBeCloseTo(0.5, 1);
  });

  test('exponential decay drops faster initially than linear', () => {
    const expResult = computeEnvelopeMultiplier(
      75,
      { attackMs: 0, sustainMs: 0, decayMs: 300 },
      'exponential',
    );
    const linearResult = computeEnvelopeMultiplier(
      75,
      { attackMs: 0, sustainMs: 0, decayMs: 300 },
      'linear',
    );
    // Exponential drops faster at early times -> lower value at t=0.25
    expect(expResult).toBeLessThan(linearResult);
  });

  test('easeOut is smoother — returns more than linear at midpoint', () => {
    const easeOutResult = computeEnvelopeMultiplier(
      150,
      { attackMs: 0, sustainMs: 0, decayMs: 300 },
      'easeOut',
    );
    const linearResult = computeEnvelopeMultiplier(
      150,
      { attackMs: 0, sustainMs: 0, decayMs: 300 },
      'linear',
    );
    // easeOut decays slower at early times -> higher value at midpoint
    expect(easeOutResult).toBeGreaterThan(linearResult);
  });

  test('returns 1 when attackMs=0 and sustainMs > 0 at elapsed=0', () => {
    // No attack, straight to sustain at t=0
    const result = computeEnvelopeMultiplier(
      0,
      { attackMs: 0, sustainMs: 200, decayMs: 300 },
      'linear',
    );
    expect(result).toBe(1);
  });

  test('attack ramp produces ~0.5 at midpoint of attack', () => {
    // attackMs=100 => midpoint at 50
    const result = computeEnvelopeMultiplier(
      50,
      { attackMs: 100, sustainMs: 0, decayMs: 300 },
      'linear',
    );
    expect(result).toBeCloseTo(0.5, 1);
  });
});

// =============================================================================
// Group 4 — applyDecay (pure function)
// =============================================================================

describe('applyDecay', () => {
  test('linear returns 0.5 at t=0.5', () => {
    expect(applyDecay(0.5, 'linear')).toBeCloseTo(0.5);
  });

  test('exponential returns less than 0.5 at t=0.5', () => {
    expect(applyDecay(0.5, 'exponential')).toBeLessThan(0.5);
  });

  test('easeOut returns 0.75 at t=0.5 (since 1 - 0.5^2 = 0.75)', () => {
    expect(applyDecay(0.5, 'easeOut')).toBeCloseTo(0.75);
  });

  test('all modes return 1 at t=0', () => {
    expect(applyDecay(0, 'linear')).toBe(1);
    expect(applyDecay(0, 'exponential')).toBe(1);
    expect(applyDecay(0, 'easeOut')).toBe(1);
  });

  test('all modes return ~0 at t=1 (exponential uses closeTo)', () => {
    expect(applyDecay(1, 'linear')).toBe(0);
    expect(applyDecay(1, 'exponential')).toBeCloseTo(0, 1);
    expect(applyDecay(1, 'easeOut')).toBe(0);
  });
});

// =============================================================================
// Group 5 — Channel computation (test via screenShake behavior)
// =============================================================================

describe('Channel computation', () => {
  test('disabled channels do not affect camera', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    const originalTargetX: number = arc.target.x;
    const originalTargetZ: number = arc.target.z;
    const originalFov: number = arc.fov;
    const originalUpX: number = arc.upVector.x;
    const originalUpY: number = arc.upVector.y;
    const originalUpZ: number = arc.upVector.z;

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 1.0,
      translation: { enabled: false, amplitude: 0.5, frequency: 25 },
      rotation: { enabled: false, amplitude: 0.05, frequency: 20 },
      fov: { enabled: false, amplitude: 0.03, frequency: 15 },
      envelope: { attackMs: 0, sustainMs: 0, decayMs: 300 },
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // Render a frame to trigger the observer
    instance.scene.render();

    // Camera should not have moved since all channels are disabled
    expect(arc.target.x).toBeCloseTo(originalTargetX);
    expect(arc.target.z).toBeCloseTo(originalTargetZ);
    expect(arc.fov).toBeCloseTo(originalFov);
    expect(arc.upVector.x).toBeCloseTo(originalUpX);
    expect(arc.upVector.y).toBeCloseTo(originalUpY);
    expect(arc.upVector.z).toBeCloseTo(originalUpZ);

    result.data.dispose();
  });
});

// =============================================================================
// Group 6 — stopAllShakes
// =============================================================================

describe('stopAllShakes', () => {
  test('stopAllShakes cancels active shake (dispose called)', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 0.5,
      envelope: { attackMs: 0, sustainMs: 0, decayMs: 3000 },
    });
    expect(result.ok).toBeTruthy();

    // stopAllShakes should not throw
    expect(() => stopAllShakes()).not.toThrow();

    // After stopping, calling dispose again on the handle should be safe
    if (result.ok) {
      expect(() => result.data.dispose()).not.toThrow();
    }
  });

  test('stopAllShakes resets trauma to 0', () => {
    addTrauma(0.8);
    expect(getTrauma()).toBeCloseTo(0.8);
    stopAllShakes();
    expect(getTrauma()).toBe(0);
  });
});

// =============================================================================
// Group 7 — Global controls
// =============================================================================

describe('Global controls', () => {
  test('setGlobalScale changes the scale', () => {
    setGlobalScale(2.0);
    expect(getGlobalScale()).toBe(2.0);
  });

  test('getGlobalScale returns current scale', () => {
    expect(getGlobalScale()).toBe(1.0);
    setGlobalScale(0.5);
    expect(getGlobalScale()).toBe(0.5);
  });

  test('setMasterEnabled/getMasterEnabled work', () => {
    expect(getMasterEnabled()).toBe(true);
    setMasterEnabled(false);
    expect(getMasterEnabled()).toBe(false);
    setMasterEnabled(true);
    expect(getMasterEnabled()).toBe(true);
  });

  test('masterEnabled=false prevents shake from taking effect', () => {
    const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
    if (!cameraResult.ok) throw new Error('Failed to create camera');
    const arc = cameraResult.data as BABYLON.ArcRotateCamera;

    const originalTargetX: number = arc.target.x;
    const originalTargetZ: number = arc.target.z;
    const originalFov: number = arc.fov;

    setMasterEnabled(false);

    const result = screenShake({
      scene: instance.scene,
      camera: cameraResult.data,
      intensity: 1.0,
      envelope: { attackMs: 0, sustainMs: 0, decayMs: 300 },
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    // Render a frame
    instance.scene.render();

    // Camera should not have moved since master is disabled
    expect(arc.target.x).toBeCloseTo(originalTargetX);
    expect(arc.target.z).toBeCloseTo(originalTargetZ);
    expect(arc.fov).toBeCloseTo(originalFov);

    result.data.dispose();
  });
});

/* eslint-enable max-lines-per-function */
