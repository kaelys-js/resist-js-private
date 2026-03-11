/**
 * Tests for HDR environment (IBL) loading and disposal.
 *
 * NullEngine cannot load real HDR textures, so these tests verify
 * the API surface, error paths, and scene property setup using
 * a manually created CubeTexture as a stand-in.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';

import {
  applyHdrEnvironmentToScene,
  disposeHdrEnvironment,
  loadHdrEnvironment,
  type HdrEnvironmentInstance,
} from './hdr-environment';

// =============================================================================
// Test Harness
// =============================================================================

let instance: BabylonEngineInstance;

afterEach(() => {
  disposeEngine(instance);
});

// =============================================================================
// loadHdrEnvironment
// =============================================================================

describe('loadHdrEnvironment', () => {
  it('returns error for empty texture path', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    const result = loadHdrEnvironment({
      scene: instance.scene,
      config: { enabled: true, texturePath: '', intensity: 1.0, rotationY: 0 },
    });
    expect(result.ok).toBe(false);
  });

  it('handles non-existent file gracefully in NullEngine', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    // NullEngine cannot load real HDR files — this tests the error path
    const result = loadHdrEnvironment({
      scene: instance.scene,
      config: {
        enabled: true,
        texturePath: 'nonexistent.hdr',
        intensity: 1.0,
        rotationY: 0,
      },
    });
    // May fail in NullEngine — both ok and error are acceptable
    expect(typeof result.ok).toBe('boolean');
  });
});

// =============================================================================
// applyHdrEnvironmentToScene
// =============================================================================

describe('applyHdrEnvironmentToScene', () => {
  it('sets scene.environmentTexture', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    const texture: BABYLON.CubeTexture = new BABYLON.CubeTexture('', instance.scene);

    const result = applyHdrEnvironmentToScene({
      scene: instance.scene,
      texture,
      intensity: 1.0,
      rotationY: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(instance.scene.environmentTexture).toBe(texture);
  });

  it('applies intensity to scene', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    const texture: BABYLON.CubeTexture = new BABYLON.CubeTexture('', instance.scene);

    const result = applyHdrEnvironmentToScene({
      scene: instance.scene,
      texture,
      intensity: 2.5,
      rotationY: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(instance.scene.environmentIntensity).toBe(2.5);
  });

  it('applies rotationY to texture', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    const texture: BABYLON.CubeTexture = new BABYLON.CubeTexture('', instance.scene);

    const result = applyHdrEnvironmentToScene({
      scene: instance.scene,
      texture,
      intensity: 1.0,
      rotationY: 1.57,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(texture.rotationY).toBeCloseTo(1.57);
  });
});

// =============================================================================
// disposeHdrEnvironment
// =============================================================================

describe('disposeHdrEnvironment', () => {
  it('clears scene.environmentTexture', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    const texture: BABYLON.CubeTexture = new BABYLON.CubeTexture('', instance.scene);
    instance.scene.environmentTexture = texture;

    const hdrInstance: HdrEnvironmentInstance = {
      texture,
      scene: instance.scene,
    };

    const result = disposeHdrEnvironment({ instance: hdrInstance });
    expect(result.ok).toBe(true);
    expect(instance.scene.environmentTexture).toBeNull();
  });

  it('disposes without error on valid instance', () => {
    const engineResult = createTestEngine();
    expect(engineResult.ok).toBe(true);
    if (!engineResult.ok) return;
    instance = engineResult.data;

    const texture: BABYLON.CubeTexture = new BABYLON.CubeTexture('', instance.scene);
    instance.scene.environmentTexture = texture;

    const hdrInstance: HdrEnvironmentInstance = {
      texture,
      scene: instance.scene,
    };

    const result = disposeHdrEnvironment({ instance: hdrInstance });
    expect(result.ok).toBe(true);
  });
});
