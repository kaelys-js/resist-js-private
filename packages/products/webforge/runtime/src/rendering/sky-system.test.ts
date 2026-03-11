/**
 * Sky system tests.
 *
 * Tests sky creation (color, gradient, skybox, procedural),
 * scene.clearColor application, mesh creation, and disposal.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { SkyConfig } from '../schemas/sky-config';
import {
  computeStarOpacity,
  createSky,
  createStarField,
  disposeSky,
  generateGradientPixels,
  regenerateGradientTexture,
  updateSkyFromDayNight,
} from './sky-system';

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
// createSky — color type
// =============================================================================

describe('createSky — color type', () => {
  test('sets scene.clearColor from config color', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(instance.scene.clearColor.r).toBeCloseTo(0.1);
    expect(instance.scene.clearColor.g).toBeCloseTo(0.2);
    expect(instance.scene.clearColor.b).toBeCloseTo(0.3);
  });

  test('does not create skybox mesh for color type', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skyboxMesh).toBeNull();
  });
});

// =============================================================================
// createSky — gradient type
// =============================================================================

describe('createSky — gradient type', () => {
  test('sets scene.clearColor from first gradient stop', () => {
    const config: SkyConfig = {
      type: 'gradient',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      gradient: [
        { position: 0, color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } },
        { position: 1, color: { r: 0.8, g: 0.6, b: 0.3, a: 1 } },
      ],
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Gradient sets clearColor to first stop
    expect(instance.scene.clearColor.r).toBeCloseTo(0.1);
  });

  test('creates skybox mesh for gradient with 2+ stops', () => {
    const config: SkyConfig = {
      type: 'gradient',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      gradient: [
        { position: 0, color: { r: 0, g: 0, b: 0.5, a: 1 } },
        { position: 1, color: { r: 0.5, g: 0.5, b: 0, a: 1 } },
      ],
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skyboxMesh).not.toBeNull();
  });

  test('falls back to color sky for gradient with <2 stops', () => {
    const config: SkyConfig = {
      type: 'gradient',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      gradient: [{ position: 0, color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } }],
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Falls back to color (no mesh)
    expect(result.data.skyboxMesh).toBeNull();
  });
});

// =============================================================================
// createSky — skybox type
// =============================================================================

describe('createSky — skybox type', () => {
  test('creates skybox mesh with configured size', () => {
    const config: SkyConfig = {
      type: 'skybox',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      skyboxPath: 'skyboxes/day',
      skyboxSize: 2000,
      parallaxLayers: [],
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skyboxMesh).not.toBeNull();
  });
});

// =============================================================================
// createSky — procedural type
// =============================================================================

describe('createSky — procedural type', () => {
  test('creates skybox mesh for procedural sky', () => {
    const config: SkyConfig = {
      type: 'procedural',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skyboxMesh).not.toBeNull();
  });
});

// =============================================================================
// createSky — panorama type
// =============================================================================

describe('createSky — panorama type', () => {
  test('creates skybox mesh for panorama sky', () => {
    const config: SkyConfig = {
      type: 'panorama',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      panoramaPath: 'sky/sunset_equirect.jpg',
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skyboxMesh).not.toBeNull();
  });
});

// =============================================================================
// createSky — hdri type
// =============================================================================

describe('createSky — hdri type', () => {
  test('creates skybox mesh for hdri sky', () => {
    const config: SkyConfig = {
      type: 'hdri',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      hdriPath: 'sky/environment.hdr',
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const result = createSky({ scene: instance.scene, config });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skyboxMesh).not.toBeNull();
  });
});

// =============================================================================
// disposeSky
// =============================================================================

describe('disposeSky', () => {
  test('disposes skybox mesh and material', () => {
    const config: SkyConfig = {
      type: 'skybox',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      skyboxPath: 'skyboxes/day',
      skyboxSize: 1000,
      parallaxLayers: [],
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const meshCountBefore = instance.scene.meshes.length;
    const disposeResult = disposeSky({ sky: createResult.data });
    expect(disposeResult.ok).toBe(true);
    // Mesh should be removed from scene
    expect(instance.scene.meshes.length).toBeLessThan(meshCountBefore);
  });

  test('handles null skybox gracefully', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const disposeResult = disposeSky({ sky: createResult.data });
    expect(disposeResult.ok).toBe(true);
  });
});

// =============================================================================
// generateGradientPixels (pure math)
// =============================================================================

describe('generateGradientPixels', () => {
  test('generates 256-pixel RGBA array from 2 stops', () => {
    const pixels: Uint8Array = generateGradientPixels([
      { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
    ]);
    expect(pixels).toHaveLength(256 * 4);
    // First pixel = top = red
    expect(pixels[0]).toBe(255); // R
    expect(pixels[1]).toBe(0); // G
    expect(pixels[2]).toBe(0); // B
    expect(pixels[3]).toBe(255); // A
    // Last pixel = bottom = blue
    expect(pixels[255 * 4]).toBe(0); // R
    expect(pixels[255 * 4 + 2]).toBe(255); // B
  });

  test('interpolates mid-point correctly for 2 stops', () => {
    const pixels: Uint8Array = generateGradientPixels([
      { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
    ]);
    // Mid pixel (row 128) should be ~50% gray
    const midIdx: number = 128 * 4;
    expect(pixels[midIdx]).toBeGreaterThan(120);
    expect(pixels[midIdx]).toBeLessThan(136);
  });

  test('handles 3+ stops with intermediate positions', () => {
    const pixels: Uint8Array = generateGradientPixels([
      { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: 0.5, color: { r: 0, g: 1, b: 0, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
    ]);
    expect(pixels).toHaveLength(256 * 4);
    // At position ~0.5 (row 128): should be green
    const midIdx: number = 128 * 4;
    expect(pixels[midIdx]).toBeLessThan(30); // R low
    expect(pixels[midIdx + 1]).toBeGreaterThan(220); // G high
  });

  test('returns empty array for no stops', () => {
    const pixels: Uint8Array = generateGradientPixels([]);
    expect(pixels).toHaveLength(0);
  });

  test('single stop fills entire gradient with that color', () => {
    const pixels: Uint8Array = generateGradientPixels([
      { position: 0.5, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } },
    ]);
    expect(pixels).toHaveLength(256 * 4);
    // Every sampled pixel should be ~128 gray
    expect(pixels[0]).toBeGreaterThan(120);
    expect(pixels[0]).toBeLessThan(136);
    expect(pixels[500]).toBeGreaterThan(120);
    expect(pixels[500]).toBeLessThan(136);
  });
});

// =============================================================================
// regenerateGradientTexture
// =============================================================================

describe('regenerateGradientTexture', () => {
  test('returns ok for gradient sky with new top/bottom colors', () => {
    const config: SkyConfig = {
      type: 'gradient',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      gradient: [
        { position: 0, color: { r: 0, g: 0, b: 0.5, a: 1 } },
        { position: 1, color: { r: 0.5, g: 0.5, b: 0, a: 1 } },
      ],
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const result = regenerateGradientTexture({
      sky: createResult.data,
      topColor: { r: 1, g: 0, b: 0, a: 1 },
      bottomColor: { r: 0, g: 0, b: 1, a: 1 },
    });
    expect(result.ok).toBe(true);
  });

  test('returns error for non-gradient sky (no mesh)', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const result = regenerateGradientTexture({
      sky: createResult.data,
      topColor: { r: 1, g: 0, b: 0, a: 1 },
      bottomColor: { r: 0, g: 0, b: 1, a: 1 },
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// updateSkyFromDayNight
// =============================================================================

describe('updateSkyFromDayNight', () => {
  test('updates clearColor for color sky type', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const result = updateSkyFromDayNight({
      sky: createResult.data,
      skyType: 'color',
      skyColor: { r: 0.9, g: 0.1, b: 0.1, a: 1 },
    });
    expect(result.ok).toBe(true);
    expect(instance.scene.clearColor.r).toBeCloseTo(0.9);
  });

  test('sets fog color when fogSyncSky is true', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const result = updateSkyFromDayNight({
      sky: createResult.data,
      skyType: 'color',
      fogSyncSky: true,
      skyGradientBottom: { r: 0.3, g: 0.4, b: 0.5, a: 1 },
    });
    expect(result.ok).toBe(true);
    expect(instance.scene.fogColor.r).toBeCloseTo(0.3);
  });
});

// =============================================================================
// computeStarOpacity
// =============================================================================

describe('computeStarOpacity', () => {
  test('returns 0 during daytime (noon)', () => {
    const opacity = computeStarOpacity({
      timeOfDay: 12,
      maxOpacity: 0.8,
      fadeInTime: 18,
      fadeOutTime: 6,
      twinkleSpeed: 1,
      elapsedTime: 0,
    });
    expect(opacity).toBeCloseTo(0);
  });

  test('returns maxOpacity at midnight', () => {
    const opacity = computeStarOpacity({
      timeOfDay: 0,
      maxOpacity: 0.8,
      fadeInTime: 18,
      fadeOutTime: 6,
      twinkleSpeed: 0,
      elapsedTime: 0,
    });
    expect(opacity).toBeCloseTo(0.8);
  });

  test('returns partial opacity during fade-in', () => {
    const opacity = computeStarOpacity({
      timeOfDay: 21,
      maxOpacity: 1,
      fadeInTime: 18,
      fadeOutTime: 6,
      twinkleSpeed: 0,
      elapsedTime: 0,
    });
    expect(opacity).toBeGreaterThan(0.3);
    expect(opacity).toBeLessThan(0.7);
  });

  test('twinkle modulates opacity', () => {
    const o1 = computeStarOpacity({
      timeOfDay: 0,
      maxOpacity: 0.8,
      fadeInTime: 18,
      fadeOutTime: 6,
      twinkleSpeed: 1,
      elapsedTime: 0,
    });
    const o2 = computeStarOpacity({
      timeOfDay: 0,
      maxOpacity: 0.8,
      fadeInTime: 18,
      fadeOutTime: 6,
      twinkleSpeed: 1,
      elapsedTime: Math.PI / 2,
    });
    expect(Math.abs(o1 - o2)).toBeGreaterThan(0);
  });
});

// =============================================================================
// createStarField
// =============================================================================

describe('createStarField', () => {
  test('creates star layer on existing sky', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0, g: 0, b: 0.1, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const starResult = createStarField({
      sky: createResult.data,
      config: { texture: 'sky/stars.png', opacity: 0.8, twinkleSpeed: 1, scale: 2 },
      assetBasePath: '/assets/',
      getTimeOfDay: () => 0,
    });
    expect(starResult.ok).toBe(true);
    if (!starResult.ok) return;
    expect(starResult.data.starLayer).not.toBeNull();
    expect(starResult.data.starObserver).not.toBeNull();
  });

  test('disposes star layer with disposeSky', () => {
    const config: SkyConfig = {
      type: 'color',
      color: { r: 0, g: 0, b: 0.1, a: 1 },
      parallaxLayers: [],
      skyboxSize: 1000,
      turbidity: 10,
      rayleigh: 2,
      luminance: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49,
      azimuth: 0.25,
    };
    const createResult = createSky({ scene: instance.scene, config });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const starResult = createStarField({
      sky: createResult.data,
      config: { texture: 'sky/stars.png', opacity: 0.8, twinkleSpeed: 1, scale: 2 },
      assetBasePath: '/assets/',
      getTimeOfDay: () => 22,
    });
    expect(starResult.ok).toBe(true);
    if (!starResult.ok) return;

    const disposeResult = disposeSky({ sky: starResult.data });
    expect(disposeResult.ok).toBe(true);
  });
});
