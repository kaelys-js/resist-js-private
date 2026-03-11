/**
 * Performance monitor tests.
 *
 * Tests SceneInstrumentation wrapper creation, metric capture
 * after rendering, and disposal.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from './engine';
import {
  createPerformanceMonitor,
  getMetrics,
  disposePerformanceMonitor,
} from './performance-monitor';

let instance: BabylonEngineInstance;

beforeEach(() => {
  const result = createTestEngine();
  if (!result.ok) throw new Error('Failed to create test engine');
  instance = result.data;

  // Add a camera so scene.render() works
  // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
  new BABYLON.ArcRotateCamera(
    'test-camera',
    0,
    Math.PI / 4,
    10,
    new BABYLON.Vector3(0, 0, 0),
    instance.scene,
  );
});

afterEach(() => {
  disposeEngine(instance);
});

describe('createPerformanceMonitor', () => {
  test('returns ok Result with monitor', () => {
    const result = createPerformanceMonitor(instance.scene);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data).toBeDefined();
    expect(result.data.instrumentation).toBeDefined();
  });

  test('enables frame time capture', () => {
    const result = createPerformanceMonitor(instance.scene);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.instrumentation.captureFrameTime).toBeTruthy();
  });

  test('enables inter-frame time capture', () => {
    const result = createPerformanceMonitor(instance.scene);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.instrumentation.captureInterFrameTime).toBeTruthy();
  });
});

describe('getMetrics', () => {
  test('returns metrics after scene render', () => {
    const monitorResult = createPerformanceMonitor(instance.scene);
    if (!monitorResult.ok) throw new Error('Failed to create monitor');

    // Render a frame to populate metrics
    instance.scene.render();

    const result = getMetrics(monitorResult.data);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.fps).toBeDefined();
    expect(typeof result.data.frameTimeMs).toBe('number');
    expect(typeof result.data.drawCalls).toBe('number');
  });

  test('returns zero-like metrics before first render', () => {
    const monitorResult = createPerformanceMonitor(instance.scene);
    if (!monitorResult.ok) throw new Error('Failed to create monitor');

    const result = getMetrics(monitorResult.data);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    // Before first render, metrics should be defined but may be 0
    expect(typeof result.data.fps).toBe('number');
  });
});

describe('disposePerformanceMonitor', () => {
  test('disposes instrumentation', () => {
    const monitorResult = createPerformanceMonitor(instance.scene);
    if (!monitorResult.ok) throw new Error('Failed to create monitor');

    const result = disposePerformanceMonitor(monitorResult.data);
    expect(result.ok).toBeTruthy();
  });
});
