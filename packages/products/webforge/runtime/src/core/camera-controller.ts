/**
 * HD-2D camera controller.
 *
 * Creates and manages a Babylon.js `ArcRotateCamera` configured for
 * HD-2D isometric-style rendering. Supports dual modes:
 *
 * - **Editor** — free orbit, XZ panning, zero inertia, full mouse control.
 * - **Gameplay** — locked rotation, no panning, momentum inertia, programmatic only.
 *
 * The smooth follow system uses frame-rate independent interpolation for
 * consistent camera movement regardless of FPS.
 *
 * @example
 * ```typescript
 * import { createHd2dCamera, updateCameraTarget } from './camera-controller';
 *
 * const result = createHd2dCamera(scene, { mode: 'editor' });
 * if (!result.ok) return result;
 *
 * // In render loop:
 * updateCameraTarget({
 *   camera: result.data,
 *   targetX: playerX,
 *   targetY: 0,
 *   targetZ: playerZ,
 *   deltaTimeMs,
 *   followSpeed: 0.05,
 * });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from './babylon-result';
import { CameraConfigSchema, type CameraConfig } from '../schemas/camera-config';

// =============================================================================
// Camera Creation
// =============================================================================

/**
 * Creates an ArcRotateCamera configured for HD-2D rendering.
 *
 * Validates config via {@link CameraConfigSchema}, then applies mode-dependent
 * defaults for fields that were not explicitly provided:
 *
 * | Property | Editor | Gameplay |
 * |----------|--------|----------|
 * | inertia | 0 | 0.7 |
 * | panningSensibility | 50 | 0 |
 * | alpha/beta limits | free orbit | locked |
 *
 * @param scene - The Babylon.js scene to attach the camera to.
 * @param config - Raw camera configuration (validated internally).
 * @returns Result containing the configured ArcRotateCamera.
 *
 * @example
 * ```typescript
 * const result = createHd2dCamera(scene, { mode: 'editor' });
 * if (!result.ok) return result;
 * const camera = result.data;
 * ```
 */
export function createHd2dCamera(
	scene: BABYLON.Scene,
	config: unknown,
): BabylonResult<BABYLON.ArcRotateCamera> {
	const parsed: Result<CameraConfig> = safeParse(CameraConfigSchema, config);
	if (!parsed.ok) return parsed;
	const cfg: CameraConfig = parsed.data;

	try {
		const target: BABYLON.Vector3 = new BABYLON.Vector3(cfg.targetX, cfg.targetY, cfg.targetZ);

		const camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'hd2d-camera',
			cfg.alpha,
			cfg.beta,
			cfg.radius,
			target,
			scene,
		);

		// Wheel zoom precision
		camera.wheelPrecision = cfg.wheelPrecision;

		// Panning axis — restrict to XZ plane by default
		camera.panningAxis = new BABYLON.Vector3(
			cfg.panningAxis.x,
			cfg.panningAxis.y,
			cfg.panningAxis.z,
		);

		// Apply mode-dependent defaults
		if (cfg.mode === 'editor') {
			applyEditorMode(camera, cfg);
		} else {
			applyGameplayMode(camera, cfg);
		}

		return okShallow(camera);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Applies editor mode defaults to the camera.
 *
 * Editor mode: free orbit, XZ panning enabled, zero inertia.
 *
 * @param camera - The ArcRotateCamera to configure.
 * @param cfg - The validated camera configuration.
 */
function applyEditorMode(camera: BABYLON.ArcRotateCamera, cfg: CameraConfig): void {
	// Beta limits (pitch clamp)
	camera.lowerBetaLimit = cfg.lowerBetaLimit;
	camera.upperBetaLimit = cfg.upperBetaLimit;

	// Radius limits (zoom clamp)
	camera.lowerRadiusLimit = cfg.lowerRadiusLimit;
	camera.upperRadiusLimit = cfg.upperRadiusLimit;

	// Free orbit — no alpha limits
	camera.lowerAlphaLimit = null;
	camera.upperAlphaLimit = null;

	// Mode defaults — explicit overrides win
	camera.inertia = cfg.inertia ?? 0;
	camera.panningSensibility = cfg.panningSensibility ?? 50;
}

/**
 * Applies gameplay mode defaults to the camera.
 *
 * Gameplay mode: locked rotation, no panning, momentum inertia.
 *
 * @param camera - The ArcRotateCamera to configure.
 * @param cfg - The validated camera configuration.
 */
function applyGameplayMode(camera: BABYLON.ArcRotateCamera, cfg: CameraConfig): void {
	// Lock alpha and beta to initial values
	camera.lowerAlphaLimit = cfg.alpha;
	camera.upperAlphaLimit = cfg.alpha;
	camera.lowerBetaLimit = cfg.beta;
	camera.upperBetaLimit = cfg.beta;

	// Radius limits still apply
	camera.lowerRadiusLimit = cfg.lowerRadiusLimit;
	camera.upperRadiusLimit = cfg.upperRadiusLimit;

	// Mode defaults — explicit overrides win
	camera.inertia = cfg.inertia ?? 0.7;
	camera.panningSensibility = cfg.panningSensibility ?? 0;
}

// =============================================================================
// Smooth Follow
// =============================================================================

/** Options for updating camera target with smooth interpolation. */
export type CameraTargetOptions = {
	/** The ArcRotateCamera to update. */
	readonly camera: BABYLON.ArcRotateCamera;
	/** Goal X position (world space). */
	readonly targetX: Num;
	/** Goal Y position (world space). */
	readonly targetY: Num;
	/** Goal Z position (world space). */
	readonly targetZ: Num;
	/** Time since last frame in milliseconds. */
	readonly deltaTimeMs: Num;
	/** Interpolation speed [0, 1]. 0 = no follow, 1 = instant. */
	readonly followSpeed: Num;
};

/**
 * Updates the camera target with frame-rate independent smooth interpolation.
 *
 * Uses the formula: `lerpFactor = 1 - (1 - speed) ** ((deltaTimeMs / 1000) * 60)`
 * This produces consistent follow behavior regardless of frame rate.
 *
 * @param options - Camera target update options.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * // In scene.registerBeforeRender:
 * updateCameraTarget({
 *   camera,
 *   targetX: player.x,
 *   targetY: 0,
 *   targetZ: player.z,
 *   deltaTimeMs: scene.deltaTime,
 *   followSpeed: 0.05,
 * });
 * ```
 */
export function updateCameraTarget(options: CameraTargetOptions): Result<Bool> {
	const { camera, targetX, targetY, targetZ, deltaTimeMs, followSpeed } = options;

	try {
		// Edge case: no movement when speed is 0
		if (followSpeed === 0) {
			return okUnchecked(true as Bool);
		}

		// Frame-rate independent lerp factor
		const lerpFactor: number = 1 - (1 - followSpeed) ** ((deltaTimeMs / 1000) * 60);

		const goal: BABYLON.Vector3 = new BABYLON.Vector3(targetX, targetY, targetZ);
		// eslint-disable-next-line new-cap -- Babylon.js static factory method
		camera.target = BABYLON.Vector3.Lerp(camera.target, goal, lerpFactor);

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
