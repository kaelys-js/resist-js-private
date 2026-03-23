/**
 * Engine configuration schema tests.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { EngineConfigSchema, type EngineConfig } from './engine-config';

describe('EngineConfigSchema', () => {
  // =========================================================================
  // Valid configs
  // =========================================================================

  test('accepts minimal config with only required canvasId', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'game-canvas',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.canvasId).toBe('game-canvas');
  });

  test('fills all defaults when only canvasId provided', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'game-canvas',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.renderer).toBe('auto');
    expect(result.data.targetFps).toBe(60);
    expect(result.data.antialias).toBeTruthy();
    expect(result.data.adaptToDeviceRatio).toBeTruthy();
    expect(result.data.stencil).toBeTruthy();
    expect(result.data.preserveDrawingBuffer).toBeFalsy();
    expect(result.data.powerPreference).toBe('high-performance');
    expect(result.data.doNotHandleContextLost).toBeFalsy();
    expect(result.data.debug).toBeFalsy();
  });

  test('accepts full explicit config', () => {
    const input: Record<string, unknown> = {
      canvasId: 'my-canvas',
      renderer: 'webgpu',
      targetFps: 120,
      antialias: false,
      adaptToDeviceRatio: false,
      stencil: false,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
      doNotHandleContextLost: true,
      debug: true,
    };
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, input);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.canvasId).toBe('my-canvas');
    expect(result.data.renderer).toBe('webgpu');
    expect(result.data.targetFps).toBe(120);
    expect(result.data.antialias).toBeFalsy();
    expect(result.data.adaptToDeviceRatio).toBeFalsy();
    expect(result.data.stencil).toBeFalsy();
    expect(result.data.preserveDrawingBuffer).toBeTruthy();
    expect(result.data.powerPreference).toBe('low-power');
    expect(result.data.doNotHandleContextLost).toBeTruthy();
    expect(result.data.debug).toBeTruthy();
  });

  // =========================================================================
  // Renderer variants
  // =========================================================================

  test('accepts renderer "webgl2"', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      renderer: 'webgl2',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.renderer).toBe('webgl2');
  });

  test('accepts renderer "webgpu"', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      renderer: 'webgpu',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.renderer).toBe('webgpu');
  });

  test('accepts renderer "auto"', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      renderer: 'auto',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.renderer).toBe('auto');
  });

  // =========================================================================
  // Power preference variants
  // =========================================================================

  test('accepts powerPreference "default"', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      powerPreference: 'default',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.powerPreference).toBe('default');
  });

  test('accepts powerPreference "high-performance"', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      powerPreference: 'high-performance',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.powerPreference).toBe('high-performance');
  });

  test('accepts powerPreference "low-power"', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      powerPreference: 'low-power',
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.powerPreference).toBe('low-power');
  });

  // =========================================================================
  // Boundary values for targetFps
  // =========================================================================

  test('accepts targetFps at minimum (1)', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      targetFps: 1,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.targetFps).toBe(1);
  });

  test('accepts targetFps at maximum (240)', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      targetFps: 240,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.targetFps).toBe(240);
  });

  // =========================================================================
  // Rejection: missing required field
  // =========================================================================

  test('rejects missing canvasId', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {});
    expect(result.ok).toBeFalsy();
  });

  test('rejects empty canvasId', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: '',
    });
    expect(result.ok).toBeFalsy();
  });

  // =========================================================================
  // Rejection: invalid values
  // =========================================================================

  test('rejects invalid renderer value', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      renderer: 'vulkan',
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects invalid powerPreference value', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      powerPreference: 'turbo',
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects targetFps below minimum (0)', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      targetFps: 0,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects targetFps above maximum (241)', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      targetFps: 241,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects non-integer targetFps', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      targetFps: 59.5,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects negative targetFps', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      targetFps: -30,
    });
    expect(result.ok).toBeFalsy();
  });

  // =========================================================================
  // Rejection: wrong types
  // =========================================================================

  test('rejects canvasId as number', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 42,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects antialias as string', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      antialias: 'yes',
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects debug as number', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      debug: 1,
    });
    expect(result.ok).toBeFalsy();
  });

  // =========================================================================
  // Rejection: unknown properties (strictObject)
  // =========================================================================

  test('rejects unknown properties', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, {
      canvasId: 'c',
      unknownProp: 'should fail',
    });
    expect(result.ok).toBeFalsy();
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  test('rejects null input', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, null);
    expect(result.ok).toBeFalsy();
  });

  test('rejects undefined input', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, undefined);
    expect(result.ok).toBeFalsy();
  });

  test('rejects string input', () => {
    const result: Result<EngineConfig> = safeParse(EngineConfigSchema, 'not an object');
    expect(result.ok).toBeFalsy();
  });
});
