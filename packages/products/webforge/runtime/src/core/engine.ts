/**
 * Babylon.js engine core.
 *
 * Provides engine creation (browser and headless test), render loop
 * management, resize handling, and disposal. Uses `NullEngine` for
 * headless testing in Vitest, and `Engine` / `EngineFactory` for
 * browser contexts with WebGL2/WebGPU auto-detection.
 *
 * All functions return `Result<T>` or `BabylonResult<T>` — never throws.
 *
 * @example
 * ```typescript
 * import { createTestEngine, startRenderLoop, disposeEngine } from './engine';
 *
 * const result = createTestEngine();
 * if (!result.ok) return result;
 *
 * startRenderLoop(result.data);
 * // ... render frames ...
 * disposeEngine(result.data);
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Str } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from './babylon-result';
import type { EngineConfig } from '../schemas/engine-config';

// =============================================================================
// Lazy Logger
// =============================================================================

/**
 * Fire-and-forget log call — does not block the caller.
 * Used for non-critical diagnostic messages. Lazily imports
 * the logger to avoid circular initialization issues in
 * `@/utils/core` (process -> terminal -> logger cycle).
 *
 * @param level - The log level to use ('debug', 'info', or 'warn').
 * @param message - The message to log.
 */
function fireLog(level: 'debug' | 'info' | 'warn', message: Str): void {
  // eslint-disable-next-line typescript/no-floating-promises -- Fire-and-forget async logging
  (async () => {
    try {
      const { log } = await import('@/utils/core/logger');
      log[level](message);
    } catch {
      // Silently swallow logger import failures — non-critical diagnostics
    }
  })();
}

// =============================================================================
// Types
// =============================================================================

/** Engine instance returned by create functions. */
export type BabylonEngineInstance = {
  /** The Babylon.js engine (Engine, WebGPUEngine, or NullEngine). */
  readonly engine: BABYLON.AbstractEngine;
  /** The active scene attached to the engine. */
  readonly scene: BABYLON.Scene;
  /** Whether the WebGPU backend was activated. */
  readonly isWebGPU: boolean;
};

// =============================================================================
// Test Engine
// =============================================================================

/**
 * Creates a headless Babylon.js engine for testing.
 *
 * Uses `NullEngine` — no canvas, no GPU, synchronous creation.
 * Suitable for Vitest integration tests.
 *
 * @returns BabylonResult containing the engine instance.
 *
 * @example
 * ```typescript
 * const result = createTestEngine();
 * if (!result.ok) return result;
 * result.data.scene.render(); // manual render for deterministic tests
 * disposeEngine(result.data);
 * ```
 */
export function createTestEngine(): BabylonResult<BabylonEngineInstance> {
  try {
    const engine: BABYLON.NullEngine = new BABYLON.NullEngine({
      renderWidth: 512,
      renderHeight: 256,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    const scene: BABYLON.Scene = new BABYLON.Scene(engine);

    const instance: BabylonEngineInstance = {
      engine,
      scene,
      isWebGPU: false,
    };

    fireLog('debug', 'Test engine created (NullEngine)' as Str);

    return okShallow(instance);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// Browser Engine
// =============================================================================

/**
 * Creates a Babylon.js engine for browser rendering.
 *
 * Supports three renderer modes:
 * - `'auto'` — uses `EngineFactory.CreateAsync` (WebGPU if available, else WebGL2).
 * - `'webgpu'` — forces WebGPU; falls back to WebGL2 if unsupported.
 * - `'webgl2'` — forces WebGL2.
 *
 * @param config - Validated engine configuration.
 * @param canvas - The target canvas element.
 * @returns BabylonResult containing the engine instance.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { EngineConfigSchema } from '../schemas/engine-config';
 *
 * const config = safeParse(EngineConfigSchema, { canvasId: 'game-canvas' });
 * if (!config.ok) return config;
 * const canvas = document.getElementById(config.data.canvasId);
 * const result = await createBabylonEngine(config.data, canvas);
 * ```
 */
export async function createBabylonEngine(
  config: EngineConfig,
  canvas: HTMLCanvasElement,
): Promise<BabylonResult<BabylonEngineInstance>> {
  const engineOptions: BABYLON.EngineOptions = {
    antialias: config.antialias,
    stencil: config.stencil,
    preserveDrawingBuffer: config.preserveDrawingBuffer,
    powerPreference: config.powerPreference,
    doNotHandleContextLost: config.doNotHandleContextLost,
  };

  try {
    let engine: BABYLON.AbstractEngine;
    let isWebGPU = false;

    if (config.renderer === 'auto') {
      // eslint-disable-next-line new-cap -- Babylon.js static factory method
      engine = await BABYLON.EngineFactory.CreateAsync(canvas, {
        ...engineOptions,
        adaptToDeviceRatio: config.adaptToDeviceRatio,
      });
      isWebGPU = engine.name === 'WebGPU';
    } else if (config.renderer === 'webgpu') {
      const supported: boolean = await BABYLON.WebGPUEngine.IsSupportedAsync;
      if (supported) {
        const gpuPower: GPUPowerPreference | undefined =
          config.powerPreference === 'default' ? undefined : config.powerPreference;
        const webgpuEngine: BABYLON.WebGPUEngine = new BABYLON.WebGPUEngine(canvas, {
          antialias: config.antialias,
          stencil: config.stencil,
          powerPreference: gpuPower,
          doNotHandleContextLost: config.doNotHandleContextLost,
        });
        await webgpuEngine.initAsync();
        engine = webgpuEngine;
        isWebGPU = true;
      } else {
        fireLog('warn', 'WebGPU not supported, falling back to WebGL2' as Str);
        engine = new BABYLON.Engine(
          canvas,
          config.antialias,
          engineOptions,
          config.adaptToDeviceRatio,
        );
      }
    } else {
      engine = new BABYLON.Engine(
        canvas,
        config.antialias,
        engineOptions,
        config.adaptToDeviceRatio,
      );
    }

    const scene: BABYLON.Scene = new BABYLON.Scene(engine);

    // Register context loss/restore handlers
    if (!config.doNotHandleContextLost) {
      engine.onContextLostObservable.add(() => {
        fireLog('warn', 'WebGL context lost' as Str);
      });
      engine.onContextRestoredObservable.add(() => {
        fireLog('info', 'WebGL context restored' as Str);
      });
    }

    const backend: Str = (isWebGPU ? 'WebGPU' : 'WebGL2') as Str;
    fireLog('info', `Engine created (${backend})` as Str);

    const instance: BabylonEngineInstance = {
      engine,
      scene,
      isWebGPU,
    };

    return okShallow(instance);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// Render Loop
// =============================================================================

/**
 * Starts the engine render loop.
 *
 * Guards against stacking — returns an error if a loop is already active.
 * Babylon.js `runRenderLoop` overwrites the previous loop, so this check
 * prevents silent replacement.
 *
 * @param instance - The engine instance to start rendering.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * const result = startRenderLoop(instance);
 * if (!result.ok) return result;
 * ```
 */
export function startRenderLoop(instance: BabylonEngineInstance): Result<Bool> {
  if (instance.engine.activeRenderLoops.length > 0) {
    return err(ERRORS.SCENE.RENDER_FAILED, 'Render loop already active');
  }

  try {
    instance.engine.runRenderLoop(() => {
      instance.scene.render();
    });
    return okUnchecked(true as Bool);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

/**
 * Stops the engine render loop.
 *
 * Safe to call even when no loop is running.
 *
 * @param instance - The engine instance to stop rendering.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * stopRenderLoop(instance);
 * ```
 */
export function stopRenderLoop(instance: BabylonEngineInstance): Result<Bool> {
  try {
    instance.engine.stopRenderLoop();
    return okUnchecked(true as Bool);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// Resize Handler
// =============================================================================

/**
 * Registers a `ResizeObserver` on the canvas parent to auto-resize the engine.
 *
 * @param instance - The engine instance.
 * @param canvas - The canvas element whose parent is observed.
 * @returns Result containing a cleanup function to disconnect the observer.
 *
 * @example
 * ```typescript
 * const result = registerResizeHandler(instance, canvas);
 * if (!result.ok) return result;
 * // Later: result.data(); // cleanup
 * ```
 */
export function registerResizeHandler(
  instance: BabylonEngineInstance,
  canvas: HTMLCanvasElement,
): Result<() => void> {
  try {
    const parent: HTMLElement | null = canvas.parentElement;
    if (!parent) {
      return err(ERRORS.SCENE.LOAD_FAILED, 'Canvas has no parent element for resize observer');
    }

    let needsResize: Bool = false;
    const observer: ResizeObserver = new ResizeObserver(() => {
      needsResize = true;
    });
    observer.observe(parent);

    // Resize inside the render loop so buffer clear + redraw happen in
    // the same frame, preventing the black flash caused by setting
    // canvas.width/height between frames.
    const resizeObs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> =
      instance.scene.onBeforeRenderObservable.add(() => {
        if (needsResize) {
          needsResize = false;
          instance.engine.resize();
        }
      });

    const cleanup = (): void => {
      observer.disconnect();
      if (resizeObs) instance.scene.onBeforeRenderObservable.remove(resizeObs);
    };

    return okUnchecked(cleanup);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// Disposal
// =============================================================================

/**
 * Disposes the engine and scene, stopping any active render loop first.
 *
 * Disposal order matters: scene first, then engine. Engine disposal does
 * NOT cascade to the scene automatically.
 *
 * @param instance - The engine instance to dispose.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * const result = disposeEngine(instance);
 * if (!result.ok) return result;
 * ```
 */
export function disposeEngine(instance: BabylonEngineInstance): Result<Bool> {
  try {
    // Stop any active render loop first
    instance.engine.stopRenderLoop();

    // Dispose scene THEN engine (order matters)
    instance.scene.dispose();
    instance.engine.dispose();

    fireLog('debug', 'Engine disposed' as Str);

    return okUnchecked(true as Bool);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
  }
}
