/**
 * Performance monitor.
 *
 * Wraps Babylon.js `SceneInstrumentation` to expose frame timing metrics.
 * Opt-in: only created when debug mode is enabled.
 *
 * @example
 * ```typescript
 * import { createPerformanceMonitor, getMetrics, disposePerformanceMonitor } from './performance-monitor';
 *
 * const result = createPerformanceMonitor(scene);
 * if (!result.ok) return result;
 *
 * // After rendering:
 * const metrics = getMetrics(result.data);
 * if (metrics.ok) console.log(metrics.data.fps);
 *
 * disposePerformanceMonitor(result.data);
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from './babylon-result';

// =============================================================================
// Types
// =============================================================================

/** Performance monitor wrapper around SceneInstrumentation. */
export type PerformanceMonitor = {
	/** The underlying Babylon.js scene instrumentation. */
	readonly instrumentation: BABYLON.SceneInstrumentation;
};

/** Snapshot of performance metrics from a single frame. */
export type PerformanceMetrics = {
	/** Current frames per second. */
	readonly fps: number;
	/** Frame render time in milliseconds. */
	readonly frameTimeMs: number;
	/** Time between frames in milliseconds. */
	readonly interFrameTimeMs: number;
	/** Active meshes evaluation time in milliseconds. */
	readonly activeMeshesEvaluationTimeMs: number;
	/** Total render time in milliseconds. */
	readonly renderTimeMs: number;
	/** Number of draw calls this frame. */
	readonly drawCalls: number;
};

// =============================================================================
// Creation
// =============================================================================

/**
 * Creates a performance monitor for the given scene.
 *
 * Enables frame time and inter-frame time capture on the
 * `SceneInstrumentation` instance.
 *
 * @param scene - The Babylon.js scene to instrument.
 * @returns Result containing the performance monitor.
 *
 * @example
 * ```typescript
 * const result = createPerformanceMonitor(scene);
 * if (!result.ok) return result;
 * ```
 */
export function createPerformanceMonitor(scene: BABYLON.Scene): BabylonResult<PerformanceMonitor> {
	try {
		const instrumentation: BABYLON.SceneInstrumentation = new BABYLON.SceneInstrumentation(scene);

		instrumentation.captureFrameTime = true;
		instrumentation.captureInterFrameTime = true;
		instrumentation.captureActiveMeshesEvaluationTime = true;
		instrumentation.captureRenderTime = true;

		const monitor: PerformanceMonitor = { instrumentation };

		return okShallow(monitor);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Metrics
// =============================================================================

/**
 * Reads the current performance metrics from the monitor.
 *
 * Should be called after `scene.render()` for accurate data.
 * Before the first render, values will be zero or undefined.
 *
 * @param monitor - The performance monitor to read from.
 * @returns Result containing the metrics snapshot.
 *
 * @example
 * ```typescript
 * scene.render();
 * const metrics = getMetrics(monitor);
 * if (metrics.ok) console.log(`FPS: ${metrics.data.fps}`);
 * ```
 */
export function getMetrics(monitor: PerformanceMonitor): Result<PerformanceMetrics> {
	try {
		const instr: BABYLON.SceneInstrumentation = monitor.instrumentation;
		const { scene } = instr;

		const engine: BABYLON.AbstractEngine = scene.getEngine();
		const drawCallsProp: unknown = 'drawCalls' in engine ? engine.drawCalls : 0;
		const drawCalls: number = typeof drawCallsProp === 'number' ? drawCallsProp : 0;

		const metrics: PerformanceMetrics = {
			fps: engine.getFps(),
			frameTimeMs: instr.frameTimeCounter.current,
			interFrameTimeMs: instr.interFrameTimeCounter.current,
			activeMeshesEvaluationTimeMs: instr.activeMeshesEvaluationTimeCounter.current,
			renderTimeMs: instr.renderTimeCounter.current,
			drawCalls,
		};

		return okUnchecked(metrics);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Disposal
// =============================================================================

/**
 * Disposes the performance monitor and stops instrumentation.
 *
 * @param monitor - The performance monitor to dispose.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * disposePerformanceMonitor(monitor);
 * ```
 */
export function disposePerformanceMonitor(monitor: PerformanceMonitor): Result<Bool> {
	try {
		monitor.instrumentation.dispose();
		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}
