/**
 * Debug inspector tests.
 *
 * Tests the inspector show/hide toggle. Note: `@babylonjs/inspector` is
 * a devDep and loads lazily. In headless NullEngine tests, the debug layer
 * API is available but the full inspector UI will not render.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from './engine';
import { hideInspector } from './debug-inspector';

let instance: BabylonEngineInstance;

beforeEach(() => {
  const result = createTestEngine();
  if (!result.ok) throw new Error('Failed to create test engine');
  instance = result.data;
});

afterEach(() => {
  disposeEngine(instance);
});

describe('hideInspector', () => {
  test('returns ok Result when debug layer is not visible', () => {
    const result = hideInspector(instance.scene);
    expect(result.ok).toBeTruthy();
  });
});
