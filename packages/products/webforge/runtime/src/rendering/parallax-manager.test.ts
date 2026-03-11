/**
 * Parallax manager tests.
 *
 * Tests parallax layer creation, UV offset computation,
 * per-frame observer registration, and disposal.
 *
 * @module
 */

import type * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { ParallaxLayer } from '../schemas/sky-config';
import {
  createParallax,
  disposeParallax,
  computeParallaxOffset,
  mapBlendMode,
  addParallaxLayer,
  removeParallaxLayer,
  fadeLayerOpacity,
  getParallaxLayerCount,
  setParallaxLayerTint,
  PARALLAX_BG_RENDER_GROUP,
  PARALLAX_FG_RENDER_GROUP,
} from './parallax-manager';

let instance: BabylonEngineInstance;

beforeEach(() => {
  const result = createTestEngine();
  if (!result.ok) throw new Error('Failed to create test engine');
  instance = result.data;
});

afterEach(() => {
  disposeEngine(instance);
});

// =============================================================================
// computeParallaxOffset (pure math)
// =============================================================================

describe('computeParallaxOffset', () => {
  test('computes correct X offset for camera position', () => {
    const offset = computeParallaxOffset({
      cameraX: 10,
      cameraZ: 0,
      scrollSpeedX: 0.5,
      scrollSpeedY: 0,
    });
    expect(offset.x).toBeCloseTo(5);
    expect(offset.y).toBeCloseTo(0);
  });

  test('computes correct Y offset from Z movement', () => {
    const offset = computeParallaxOffset({
      cameraX: 0,
      cameraZ: 20,
      scrollSpeedX: 0,
      scrollSpeedY: 0.3,
    });
    expect(offset.x).toBeCloseTo(0);
    expect(offset.y).toBeCloseTo(6);
  });

  test('negative scroll speed reverses direction', () => {
    const offset = computeParallaxOffset({
      cameraX: 10,
      cameraZ: 0,
      scrollSpeedX: -0.5,
      scrollSpeedY: 0,
    });
    expect(offset.x).toBeCloseTo(-5);
  });

  test('zero speed produces zero offset', () => {
    const offset = computeParallaxOffset({
      cameraX: 100,
      cameraZ: 100,
      scrollSpeedX: 0,
      scrollSpeedY: 0,
    });
    expect(offset.x).toBeCloseTo(0);
    expect(offset.y).toBeCloseTo(0);
  });
});

// =============================================================================
// createParallax
// =============================================================================

describe('createParallax', () => {
  test('creates background layer per parallax config', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
      {
        imagePath: 'bg/clouds.png',
        scrollSpeedX: 0.5,
        scrollSpeedY: 0,
        offsetY: 5,
        opacity: 0.7,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers).toHaveLength(2);
  });

  test('applies opacity to layer color alpha', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/trees.png',
        scrollSpeedX: 0.4,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 0.6,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers[0]!.color.a).toBeCloseTo(0.6);
  });

  test('empty layers array creates empty instance', () => {
    const result = createParallax({
      scene: instance.scene,
      layers: [],
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers).toHaveLength(0);
  });

  test('registers onBeforeRender observer when layers exist', () => {
    const observerCountBefore = instance.scene.onBeforeRenderObservable.observers.length;
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/hills.png',
        scrollSpeedX: 0.5,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(instance.scene.onBeforeRenderObservable.observers.length).toBeGreaterThan(
      observerCountBefore,
    );
  });
});

// =============================================================================
// disposeParallax
// =============================================================================

describe('disposeParallax', () => {
  test('disposes all background layers', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const layerCountBefore = instance.scene.layers.length;
    const disposeResult = disposeParallax({ parallax: result.data });
    expect(disposeResult.ok).toBe(true);
    expect(instance.scene.layers.length).toBeLessThan(layerCountBefore);
  });

  test('removes onBeforeRender observer', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/hills.png',
        scrollSpeedX: 0.5,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify the observer exists before dispose
    expect(result.data.observer).not.toBeNull();
    disposeParallax({ parallax: result.data });
    // After dispose, the observer reference was removed from the observable
    // (Babylon.js sets the slot to null rather than shrinking the array)
    expect(
      instance.scene.onBeforeRenderObservable.hasObservers() === false ||
        instance.scene.onBeforeRenderObservable.observers.some(
          (o) => o === result.data.observer,
        ) === false,
    ).toBe(true);
  });

  test('handles empty parallax instance', () => {
    const result = createParallax({
      scene: instance.scene,
      layers: [],
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const disposeResult = disposeParallax({ parallax: result.data });
    expect(disposeResult.ok).toBe(true);
  });

  test('removes renderGroupObserver on dispose', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/hills.png',
        scrollSpeedX: 0.5,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.renderGroupObserver).not.toBeNull();
    disposeParallax({ parallax: result.data });
    expect(
      instance.scene.onAfterRenderingGroupObservable.hasObservers() === false ||
        instance.scene.onAfterRenderingGroupObservable.observers.some(
          (o) => o === result.data.renderGroupObserver,
        ) === false,
    ).toBe(true);
  });
});

// =============================================================================
// Rendering group constants
// =============================================================================

describe('rendering group constants', () => {
  test('PARALLAX_BG_RENDER_GROUP is 1', () => {
    expect(PARALLAX_BG_RENDER_GROUP).toBe(1);
  });

  test('PARALLAX_FG_RENDER_GROUP is 3', () => {
    expect(PARALLAX_FG_RENDER_GROUP).toBe(3);
  });
});

// =============================================================================
// renderOnlyInRenderTargetTextures
// =============================================================================

describe('background layer rendering suppression', () => {
  test('background layers have renderOnlyInRenderTargetTextures = true', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.bgLayers[0]!.renderOnlyInRenderTargetTextures).toBe(true);
    disposeParallax({ parallax: result.data });
  });

  test('foreground layers do NOT have renderOnlyInRenderTargetTextures', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'foreground',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.bgLayers[0]!.renderOnlyInRenderTargetTextures).toBe(false);
    disposeParallax({ parallax: result.data });
  });

  test('registers renderGroupObserver for background layers', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.renderGroupObserver).not.toBeNull();
    disposeParallax({ parallax: result.data });
  });

  test('no renderGroupObserver for foreground-only layers', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'foreground',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.renderGroupObserver).toBeNull();
    disposeParallax({ parallax: result.data });
  });
});

// =============================================================================
// mapBlendMode
// =============================================================================

describe('mapBlendMode', () => {
  test('maps all 8 blend modes correctly', () => {
    expect(mapBlendMode('alpha')).toBe(2);
    expect(mapBlendMode('additive')).toBe(1);
    expect(mapBlendMode('multiply')).toBe(4);
    expect(mapBlendMode('subtract')).toBe(3);
    expect(mapBlendMode('screen')).toBe(10);
    expect(mapBlendMode('maximized')).toBe(5);
    expect(mapBlendMode('oneone')).toBe(6);
    expect(mapBlendMode('premultiplied')).toBe(7);
  });

  test('defaults unknown mode to alpha (2)', () => {
    expect(mapBlendMode('unknown')).toBe(2);
  });
});

// =============================================================================
// Blend mode application
// =============================================================================

describe('blend mode application', () => {
  test('applies additive blend mode to created layer', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/glow.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'additive',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers[0]!.alphaBlendingMode).toBe(1);
  });

  test('applies multiply blend mode to created layer', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/overlay.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'multiply',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers[0]!.alphaBlendingMode).toBe(4);
  });
});

// =============================================================================
// Tint application
// =============================================================================

describe('tint application', () => {
  test('applies tint color with opacity to layer color', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/trees.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 0.8,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 0.5, b: 0.5, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { color } = result.data.bgLayers[0]!;
    expect(color.r).toBeCloseTo(1);
    expect(color.g).toBeCloseTo(0.5);
    expect(color.b).toBeCloseTo(0.5);
    expect(color.a).toBeCloseTo(0.8);
  });

  test('white tint with full opacity preserves default appearance', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/hills.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { color } = result.data.bgLayers[0]!;
    expect(color.r).toBeCloseTo(1);
    expect(color.g).toBeCloseTo(1);
    expect(color.b).toBeCloseTo(1);
    expect(color.a).toBeCloseTo(1);
  });
});

// =============================================================================
// Foreground layer
// =============================================================================

describe('foreground layer', () => {
  test('foreground layer has isBackground === false', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'fg/overlay.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'foreground',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers[0]!.isBackground).toBe(false);
  });

  test('background layer has isBackground === true', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/mountains.png',
        scrollSpeedX: 0.3,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bgLayers[0]!.isBackground).toBe(true);
  });
});

// =============================================================================
// Depth sorting
// =============================================================================

describe('depth sorting', () => {
  test('layers are sorted by depth (lower depth first)', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/foreground.png',
        scrollSpeedX: 0.8,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 10,
      },
      {
        imagePath: 'bg/far-back.png',
        scrollSpeedX: 0.1,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: -5,
      },
      {
        imagePath: 'bg/middle.png',
        scrollSpeedX: 0.5,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The sorted layers should be stored in the instance
    expect(result.data.layers[0]!.depth).toBe(-5);
    expect(result.data.layers[1]!.depth).toBe(0);
    expect(result.data.layers[2]!.depth).toBe(10);

    // bgLayers correspond to sorted order — verify via image path in name
    expect(result.data.bgLayers[0]!.name).toContain('parallax-0');
    expect(result.data.bgLayers[1]!.name).toContain('parallax-1');
    expect(result.data.bgLayers[2]!.name).toContain('parallax-2');
  });
});

// =============================================================================
// Auto-scroll
// =============================================================================

describe('auto-scroll', () => {
  test('auto-scroll offsets texture UV over time', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/clouds.png',
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0.5,
        autoScrollY: 0.2,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({
      scene: instance.scene,
      layers,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const bgLayer = result.data.bgLayers[0]!;
    const tex = bgLayer.texture;
    expect(tex).toBeDefined();

    // Simulate a frame by running the observer callback
    // getDeltaTime returns ms, so 16ms = 0.016s
    const engine = instance.scene.getEngine();
    const originalGetDelta = engine.getDeltaTime.bind(engine);
    engine.getDeltaTime = () => 16; // 16ms = ~60fps

    // Capture initial offset (should be 0 from camera at origin)
    const uBefore = (tex as BABYLON.Texture).uOffset;
    const vBefore = (tex as BABYLON.Texture).vOffset;

    // Fire the onBeforeRender observer
    instance.scene.onBeforeRenderObservable.notifyObservers(instance.scene);

    const uAfter = (tex as BABYLON.Texture).uOffset;
    const vAfter = (tex as BABYLON.Texture).vOffset;

    // autoScrollX = 0.5, dt = 0.016 → uOffset should change by 0.5 * 0.016 = 0.008
    expect(uAfter - uBefore).toBeCloseTo(0.008, 4);
    // autoScrollY = 0.2, dt = 0.016 → vOffset should change by 0.2 * 0.016 = 0.0032
    expect(vAfter - vBefore).toBeCloseTo(0.0032, 4);

    engine.getDeltaTime = originalGetDelta;
  });
});

// =============================================================================
// Runtime layer management
// =============================================================================

describe('runtime layer management', () => {
  test('getParallaxLayerCount returns correct count', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/a.png',
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const countResult = getParallaxLayerCount({ parallax: result.data });
    expect(countResult.ok).toBe(true);
    if (!countResult.ok) return;
    expect(countResult.data).toBe(1);
  });

  test('addParallaxLayer adds a new layer', () => {
    const result = createParallax({ scene: instance.scene, layers: [], assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const addResult = addParallaxLayer({
      parallax: result.data,
      layer: {
        imagePath: 'bg/new.png',
        scrollSpeedX: 0.5,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 0.8,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
      assetBasePath: '/',
    });
    expect(addResult.ok).toBe(true);
    expect(result.data.bgLayers).toHaveLength(1);
    expect(result.data.layers).toHaveLength(1);
  });

  test('removeParallaxLayer removes by index', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/a.png',
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
      {
        imagePath: 'bg/b.png',
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 1,
      },
    ];
    const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const removeResult = removeParallaxLayer({ parallax: result.data, index: 0 });
    expect(removeResult.ok).toBe(true);
    expect(result.data.bgLayers).toHaveLength(1);
    expect(result.data.layers).toHaveLength(1);
  });

  test('removeParallaxLayer returns error for out-of-bounds index', () => {
    const result = createParallax({ scene: instance.scene, layers: [], assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const removeResult = removeParallaxLayer({ parallax: result.data, index: 5 });
    expect(removeResult.ok).toBe(false);
  });

  test('setParallaxLayerTint updates layer color', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/a.png',
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tintResult = setParallaxLayerTint({
      parallax: result.data,
      index: 0,
      tint: { r: 1, g: 0, b: 0, a: 1 },
    });
    expect(tintResult.ok).toBe(true);
    const [firstLayer] = result.data.bgLayers;
    if (!firstLayer) return;
    expect(firstLayer.color.r).toBeCloseTo(1);
    expect(firstLayer.color.g).toBeCloseTo(0);
  });

  test('fadeLayerOpacity returns handle with dispose', () => {
    const layers: readonly ParallaxLayer[] = [
      {
        imagePath: 'bg/a.png',
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        offsetY: 0,
        opacity: 1,
        tileX: true,
        tileY: false,
        scale: 1,
        autoScrollX: 0,
        autoScrollY: 0,
        layerType: 'background',
        blendMode: 'alpha',
        tint: { r: 1, g: 1, b: 1, a: 1 },
        depth: 0,
      },
    ];
    const result = createParallax({ scene: instance.scene, layers, assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fadeResult = fadeLayerOpacity({
      parallax: result.data,
      index: 0,
      target: 0,
      durationMs: 1000,
    });
    expect(fadeResult.ok).toBe(true);
    if (!fadeResult.ok) return;
    expect(typeof fadeResult.data.dispose).toBe('function');
    fadeResult.data.dispose();
  });

  test('fadeLayerOpacity returns error for out-of-bounds index', () => {
    const result = createParallax({ scene: instance.scene, layers: [], assetBasePath: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fadeResult = fadeLayerOpacity({
      parallax: result.data,
      index: 5,
      target: 0,
      durationMs: 1000,
    });
    expect(fadeResult.ok).toBe(false);
  });
});
