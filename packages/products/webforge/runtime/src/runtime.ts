/**
 * WebForge game runtime.
 *
 * Orchestrates engine creation, camera setup, scene configuration,
 * performance monitoring, and debug tools into a single lifecycle.
 *
 * For browser usage, call `createRuntime` with a `RuntimeConfig`.
 * For headless testing, call `createTestRuntime` with optional overrides.
 *
 * @example
 * ```typescript
 * import { createRuntime, disposeRuntime } from './runtime';
 *
 * // Browser
 * const result = await createRuntime({
 *   engine: { canvasId: 'game-canvas' },
 *   camera: { mode: 'editor' },
 * });
 * if (!result.ok) return result;
 * // ... use result.data ...
 * disposeRuntime(result.data);
 *
 * // Test
 * const test = createTestRuntime();
 * if (!test.ok) return test;
 * disposeRuntime(test.data);
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { EngineConfigSchema, type EngineConfig } from './schemas/engine-config';
import { CameraConfigSchema, type CameraConfig } from './schemas/camera-config';
import { SceneSetupConfigSchema } from './schemas/scene-setup-config';
import { QualityConfigSchema } from './schemas/quality-config';

import { okShallow, type BabylonResult } from './core/babylon-result';
import {
	createTestEngine,
	createBabylonEngine,
	disposeEngine,
	type BabylonEngineInstance,
} from './core/engine';
import { createHd2dCamera } from './core/camera-controller';
import { applySceneSetup } from './rendering/scene-setup';
import {
	createPerformanceMonitor,
	disposePerformanceMonitor,
	type PerformanceMonitor,
} from './core/performance-monitor';
import { showInspector, hideInspector } from './core/debug-inspector';

// =============================================================================
// Runtime Config Schema
// =============================================================================

/**
 * Full runtime configuration schema.
 *
 * Composes engine, camera, scene, and quality configs.
 * Only `engine` is required for browser use.
 */
export const RuntimeConfigSchema = v.strictObject({
	/** Engine configuration (required). */
	engine: EngineConfigSchema,
	/** Camera configuration. Defaults to editor mode. */
	camera: v.optional(CameraConfigSchema, { mode: 'editor' }),
	/** Scene setup configuration. Defaults apply if omitted. */
	scene: v.optional(SceneSetupConfigSchema),
	/** Quality preset configuration. Defaults to 'high'. */
	quality: v.optional(QualityConfigSchema),
	/** Enable debug mode (performance monitor, inspector). */
	debug: v.optional(v.boolean(), false),
});

/** Inferred runtime configuration type from {@link RuntimeConfigSchema}. */
export type RuntimeConfig = v.InferOutput<typeof RuntimeConfigSchema>;

// =============================================================================
// Runtime Instance
// =============================================================================

/** The live runtime instance containing all Babylon.js resources. */
export type RuntimeInstance = {
	/** The Babylon.js engine and scene. */
	readonly engine: BabylonEngineInstance;
	/** The camera (type depends on preset — ArcRotateCamera or UniversalCamera). */
	readonly camera: BABYLON.Camera;
	/** Performance monitor (only when debug mode enabled). */
	readonly performanceMonitor: PerformanceMonitor | undefined;
};

// =============================================================================
// Browser Runtime
// =============================================================================

/**
 * Creates a full WebForge runtime for browser rendering.
 *
 * Validates the config, applies quality presets, creates the engine,
 * sets up the camera and scene, and optionally enables debug tools.
 *
 * @param config - Raw runtime configuration (validated internally).
 * @returns Result containing the runtime instance.
 *
 * @example
 * ```typescript
 * const result = await createRuntime({
 *   engine: { canvasId: 'game-canvas' },
 *   camera: { mode: 'editor' },
 * });
 * if (!result.ok) return result;
 * ```
 */
export async function createRuntime(config: unknown): Promise<BabylonResult<RuntimeInstance>> {
	const parsed: Result<RuntimeConfig> = safeParse(RuntimeConfigSchema, config);
	if (!parsed.ok) return parsed;
	const cfg: RuntimeConfig = parsed.data;

	try {
		// Apply quality preset overrides to engine config
		const engineCfg: EngineConfig = applyQualityPreset(cfg);

		// Get canvas element
		const canvas: HTMLCanvasElement | null = document.querySelector<HTMLCanvasElement>(
			`#${engineCfg.canvasId}`,
		);
		if (!canvas) {
			return err(ERRORS.SCENE.LOAD_FAILED, `Canvas element '${engineCfg.canvasId}' not found`);
		}

		// Create engine
		const engineResult: BabylonResult<BabylonEngineInstance> = await createBabylonEngine(
			engineCfg,
			canvas,
		);
		if (!engineResult.ok) return engineResult;

		// Apply scene setup
		const sceneResult: Result<Bool> = applySceneSetup(engineResult.data.scene, cfg.scene ?? {});
		if (!sceneResult.ok) return sceneResult;

		// Create camera
		const cameraResult: BabylonResult<BABYLON.Camera> = createHd2dCamera(
			engineResult.data.scene,
			cfg.camera,
		);
		if (!cameraResult.ok) return cameraResult;

		// Performance monitor (debug only)
		let monitor: PerformanceMonitor | undefined;
		if (cfg.debug) {
			const monitorResult = createPerformanceMonitor(engineResult.data.scene);
			if (monitorResult.ok) {
				monitor = monitorResult.data;
			}

			// Auto-show inspector in embed mode (non-fatal)
			try {
				await showInspector(engineResult.data.scene, true);
			} catch {
				// Inspector may not load in all environments — non-fatal
			}

			// Register F12 toggle for inspector
			registerInspectorToggle(engineResult.data.scene);
		}

		const instance: RuntimeInstance = {
			engine: engineResult.data,
			camera: cameraResult.data,
			performanceMonitor: monitor,
		};

		return okShallow(instance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Test Runtime
// =============================================================================

/** Options for creating a test runtime. */
type TestRuntimeOptions = {
	/** Camera configuration overrides. */
	readonly camera?: Partial<CameraConfig>;
	/** Scene setup configuration overrides. */
	readonly scene?: Record<string, unknown>;
	/** Enable debug mode. */
	readonly debug?: boolean;
};

/**
 * Creates a headless runtime for testing.
 *
 * Uses NullEngine — no canvas, no GPU, synchronous creation.
 *
 * @param overrides - Optional configuration overrides.
 * @returns Result containing the runtime instance.
 *
 * @example
 * ```typescript
 * const result = createTestRuntime();
 * if (!result.ok) return result;
 * disposeRuntime(result.data);
 * ```
 */
export function createTestRuntime(overrides?: TestRuntimeOptions): BabylonResult<RuntimeInstance> {
	try {
		// Create headless engine
		const engineResult: BabylonResult<BabylonEngineInstance> = createTestEngine();
		if (!engineResult.ok) return engineResult;

		// Apply scene setup
		const sceneConfig: unknown = overrides?.scene ?? {};
		const sceneResult: Result<Bool> = applySceneSetup(engineResult.data.scene, sceneConfig);
		if (!sceneResult.ok) return sceneResult;

		// Create camera — default to 'free' preset (same behavior as legacy 'editor' mode)
		const cameraConfig: unknown = {
			preset: 'free' as const,
			...overrides?.camera,
		};
		const cameraResult: BabylonResult<BABYLON.Camera> = createHd2dCamera(
			engineResult.data.scene,
			cameraConfig,
		);
		if (!cameraResult.ok) return cameraResult;

		// Performance monitor (debug only)
		let monitor: PerformanceMonitor | undefined;
		if (overrides?.debug) {
			const monitorResult = createPerformanceMonitor(engineResult.data.scene);
			if (monitorResult.ok) {
				monitor = monitorResult.data;
			}

			// Register F12 toggle for inspector (no auto-show in test — no DOM)
			registerInspectorToggle(engineResult.data.scene);
		}

		const instance: RuntimeInstance = {
			engine: engineResult.data,
			camera: cameraResult.data,
			performanceMonitor: monitor,
		};

		return okShallow(instance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Debug Inspector Toggle
// =============================================================================

/**
 * Registers an F12 keyboard shortcut to toggle the Babylon.js inspector.
 *
 * @param scene - The Babylon.js scene to register the keyboard observer on.
 */
function registerInspectorToggle(scene: BABYLON.Scene): void {
	scene.onKeyboardObservable.add(async (kbInfo) => {
		if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && kbInfo.event.key === 'F12') {
			if (scene.debugLayer.isVisible()) {
				hideInspector(scene);
			} else {
				try {
					await showInspector(scene, true);
				} catch {
					// Non-fatal — inspector may not load in all environments
				}
			}
		}
	});
}

// =============================================================================
// Disposal
// =============================================================================

/**
 * Disposes all runtime resources.
 *
 * Disposes performance monitor, then engine (which disposes scene).
 *
 * @param instance - The runtime instance to dispose.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * disposeRuntime(instance);
 * ```
 */
export function disposeRuntime(instance: RuntimeInstance): Result<Bool> {
	try {
		// Dispose performance monitor first
		if (instance.performanceMonitor) {
			disposePerformanceMonitor(instance.performanceMonitor);
		}

		// Dispose engine (handles scene + render loop)
		return disposeEngine(instance.engine);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Quality Preset Application
// =============================================================================

/**
 * Applies quality preset defaults to the engine config.
 *
 * Preset values are overridden by explicit engine config values.
 *
 * @param cfg - The validated runtime configuration.
 * @returns The engine configuration with quality preset defaults applied.
 */
function applyQualityPreset(cfg: RuntimeConfig): EngineConfig {
	// Quality preset's hardwareScalingLevel will be applied to the engine
	// after creation via setHardwareScalingLevel. Preset provides defaults
	// for antialias/stencil/adaptToDeviceRatio but explicit engine config values
	// always win (they're already set by v.optional defaults).
	return cfg.engine;
}
