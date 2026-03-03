/**
 * Camera controller.
 *
 * Creates and manages cameras for the WebForge runtime with 16 presets:
 *
 * | Preset | Camera | Description |
 * |--------|--------|-------------|
 * | `hd2d` | ArcRotateCamera | 45° iso tilt, locked rotation (default) |
 * | `topdown` | ArcRotateCamera | 90° overhead, no tilt |
 * | `sideview` | ArcRotateCamera | 0° pitch, pure side-on |
 * | `firstperson` | UniversalCamera | FPS with WASD + mouse |
 * | `cinematic` | ArcRotateCamera | Low angle, wide FOV, heavy inertia |
 * | `free` | ArcRotateCamera | Unrestricted orbit, editor-like |
 * | `isometric` | ArcRotateCamera | True isometric (35.264°), locked view |
 * | `tactical` | ArcRotateCamera | Steep overhead, pan-enabled (SRPG) |
 * | `thirdperson` | ArcRotateCamera | Close follow, free orbit |
 * | `rts` | ArcRotateCamera | High up, pan-enabled battlefield view |
 * | `dungeon` | ArcRotateCamera | Steep close overhead, locked |
 * | `platformer` | ArcRotateCamera | Side-on, tight framing, narrow FOV |
 * | `panoramic` | ArcRotateCamera | Far distance, ultra-wide FOV sweep |
 * | `orbit` | ArcRotateCamera | Auto-rotating model showcase |
 * | `editor` | ArcRotateCamera | Free orbit, zero inertia, panning |
 * | `mapeditor` | ArcRotateCamera | Orthographic top-down, RPG Maker-style |
 *
 * Backward compatibility: legacy `mode` ('editor' / 'gameplay') maps to
 * 'free' / 'hd2d' presets when `preset` is not explicitly set.
 *
 * @example
 * ```typescript
 * import { createCamera, updateCameraTarget } from './camera-controller';
 *
 * const result = createCamera(scene, { preset: 'hd2d' });
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
import {
	CameraConfigSchema,
	type CameraConfig,
	type CameraPreset,
	type RefocusConfig,
} from '../schemas/camera-config';

// =============================================================================
// Preset Resolution
// =============================================================================

/**
 * Resolves the effective camera preset from config.
 *
 * Priority: explicit `preset` > legacy `mode` mapping > default `'hd2d'`.
 *
 * @param cfg - Validated camera config.
 * @returns The resolved camera preset.
 */
function resolvePreset(cfg: CameraConfig): CameraPreset {
	// Explicit preset always wins
	if (cfg.preset !== 'hd2d' || cfg.mode === undefined) return cfg.preset;

	// Legacy mode mapping (only when preset is default 'hd2d' and mode is set)
	if (cfg.mode === 'editor') return 'free';
	if (cfg.mode === 'gameplay') return 'hd2d';

	return cfg.preset;
}

// =============================================================================
// Preset Defaults
// =============================================================================

/**
 * Per-preset default values for fields that are `undefined` in config.
 *
 * These defaults are applied by the camera controller, not the schema,
 * so that explicit user overrides always win.
 */
type PresetDefaults = {
	readonly alpha: Num;
	readonly beta: Num;
	readonly radius: Num;
	readonly lowerBetaLimit: Num;
	readonly upperBetaLimit: Num;
	readonly inertia: Num;
	readonly panningSensibility: Num;
	readonly fov: Num;
	readonly lockAlpha: Bool;
	readonly lockBeta: Bool;
	readonly orthographic: Bool;
	readonly autoRotate: Bool;
	readonly orthoSize: Num;
};

/** True isometric angle: atan(1/√2) ≈ 35.264° from vertical. */
const ISOMETRIC_BETA: Num = Math.atan(1 / Math.SQRT2) as Num;

/** Preset default lookup table. */
const PRESET_DEFAULTS: Record<CameraPreset, PresetDefaults> = {
	hd2d: {
		alpha: Math.PI / 4,
		beta: Math.PI / 4,
		radius: 100,
		lowerBetaLimit: Math.PI / 6,
		upperBetaLimit: Math.PI / 2.5,
		inertia: 0.7,
		panningSensibility: 0,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	topdown: {
		alpha: 0,
		beta: 0.01,
		radius: 80,
		lowerBetaLimit: 0.01,
		upperBetaLimit: 0.01,
		inertia: 0.5,
		panningSensibility: 0,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: true,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	sideview: {
		alpha: Math.PI / 2,
		beta: Math.PI / 2,
		radius: 60,
		lowerBetaLimit: Math.PI / 2,
		upperBetaLimit: Math.PI / 2,
		inertia: 0.5,
		panningSensibility: 0,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: true,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	firstperson: {
		alpha: 0,
		beta: 0,
		radius: 0,
		lowerBetaLimit: 0,
		upperBetaLimit: 0,
		inertia: 0,
		panningSensibility: 0,
		fov: 1.2,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	cinematic: {
		alpha: Math.PI / 6,
		beta: Math.PI / 3,
		radius: 40,
		lowerBetaLimit: Math.PI / 8,
		upperBetaLimit: Math.PI / 2,
		inertia: 0.9,
		panningSensibility: 0,
		fov: 1.2,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	free: {
		alpha: Math.PI / 4,
		beta: Math.PI / 4,
		radius: 100,
		lowerBetaLimit: Math.PI / 6,
		upperBetaLimit: Math.PI / 2.5,
		inertia: 0,
		panningSensibility: 50,
		fov: 0.8,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	isometric: {
		alpha: Math.PI / 4,
		beta: ISOMETRIC_BETA,
		radius: 100,
		lowerBetaLimit: ISOMETRIC_BETA,
		upperBetaLimit: ISOMETRIC_BETA,
		inertia: 0.5,
		panningSensibility: 0,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: true,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	tactical: {
		alpha: Math.PI / 4,
		beta: Math.PI / 6,
		radius: 120,
		lowerBetaLimit: Math.PI / 8,
		upperBetaLimit: Math.PI / 4,
		inertia: 0.5,
		panningSensibility: 50,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	thirdperson: {
		alpha: 0,
		beta: Math.PI / 3,
		radius: 25,
		lowerBetaLimit: Math.PI / 6,
		upperBetaLimit: Math.PI / 2,
		inertia: 0.85,
		panningSensibility: 0,
		fov: 0.9,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	rts: {
		alpha: Math.PI / 4,
		beta: Math.PI / 5,
		radius: 150,
		lowerBetaLimit: Math.PI / 8,
		upperBetaLimit: Math.PI / 3,
		inertia: 0.3,
		panningSensibility: 50,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	dungeon: {
		alpha: Math.PI / 4,
		beta: Math.PI / 8,
		radius: 50,
		lowerBetaLimit: Math.PI / 8,
		upperBetaLimit: Math.PI / 8,
		inertia: 0.5,
		panningSensibility: 0,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: true,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	platformer: {
		alpha: Math.PI / 2,
		beta: Math.PI / 2,
		radius: 50,
		lowerBetaLimit: Math.PI / 2,
		upperBetaLimit: Math.PI / 2,
		inertia: 0.3,
		panningSensibility: 0,
		fov: 0.7,
		lockAlpha: true,
		lockBeta: true,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	panoramic: {
		alpha: 0,
		beta: Math.PI / 4,
		radius: 200,
		lowerBetaLimit: Math.PI / 8,
		upperBetaLimit: Math.PI / 2,
		inertia: 0.95,
		panningSensibility: 0,
		fov: 1.4,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	orbit: {
		alpha: 0,
		beta: Math.PI / 4,
		radius: 80,
		lowerBetaLimit: Math.PI / 8,
		upperBetaLimit: Math.PI / 2,
		inertia: 0.7,
		panningSensibility: 0,
		fov: 0.8,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: true,
		orthoSize: 20,
	},
	editor: {
		alpha: Math.PI / 4,
		beta: Math.PI / 4,
		radius: 100,
		lowerBetaLimit: Math.PI / 6,
		upperBetaLimit: Math.PI / 2.5,
		inertia: 0,
		panningSensibility: 50,
		fov: 0.8,
		lockAlpha: false,
		lockBeta: false,
		orthographic: false,
		autoRotate: false,
		orthoSize: 20,
	},
	mapeditor: {
		// Top-down orthographic. With alpha=0/beta=0.01 the screen axes are:
		// screen right = world +Z, screen up = world -X (axes swapped).
		// The dev harness accounts for this in scrollbar/zoom/keyboard code.
		alpha: 0,
		beta: 0.01,
		radius: 100,
		lowerBetaLimit: 0.01,
		upperBetaLimit: 0.01,
		inertia: 0,
		panningSensibility: 50,
		fov: 0.8,
		lockAlpha: true,
		lockBeta: true,
		orthographic: true,
		autoRotate: false,
		orthoSize: 20,
	},
};

// =============================================================================
// Camera Creation
// =============================================================================

/**
 * Creates a camera configured for the specified preset.
 *
 * Validates config via {@link CameraConfigSchema}, resolves the effective
 * preset (including legacy mode mapping), then creates the appropriate
 * camera type with preset-specific defaults. Explicit config values always
 * override preset defaults.
 *
 * @param scene - The Babylon.js scene to attach the camera to.
 * @param config - Raw camera configuration (validated internally).
 * @returns Result containing the configured Camera.
 *
 * @example
 * ```typescript
 * const result = createCamera(scene, { preset: 'topdown' });
 * if (!result.ok) return result;
 * const camera = result.data;
 * ```
 */
export function createCamera(scene: BABYLON.Scene, config: unknown): BabylonResult<BABYLON.Camera> {
	const parsed: Result<CameraConfig> = safeParse(CameraConfigSchema, config);
	if (!parsed.ok) return parsed;
	const cfg: CameraConfig = parsed.data;

	try {
		const preset: CameraPreset = resolvePreset(cfg);

		if (preset === 'firstperson') {
			return createFirstPersonCamera(scene, cfg);
		}

		return createArcRotateCamera(scene, cfg, preset);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Creates a legacy HD-2D camera (backward compatibility).
 *
 * @deprecated Use {@link createCamera} with `preset` field instead.
 * @param scene - The Babylon.js scene.
 * @param config - Raw camera configuration.
 * @returns Result containing the configured camera.
 */
export function createHd2dCamera(
	scene: BABYLON.Scene,
	config: unknown,
): BabylonResult<BABYLON.Camera> {
	return createCamera(scene, config);
}

// =============================================================================
// ArcRotateCamera presets
// =============================================================================

/**
 * Creates an ArcRotateCamera for orbit-based presets.
 *
 * @param scene - Babylon.js scene.
 * @param cfg - Validated camera config.
 * @param preset - Resolved camera preset.
 * @returns The configured ArcRotateCamera.
 */
function createArcRotateCamera(
	scene: BABYLON.Scene,
	cfg: CameraConfig,
	preset: CameraPreset,
): BabylonResult<BABYLON.Camera> {
	const defaults: PresetDefaults = PRESET_DEFAULTS[preset];
	const target: BABYLON.Vector3 = new BABYLON.Vector3(cfg.targetX, cfg.targetY, cfg.targetZ);

	// Resolve alpha/beta/radius — explicit overrides win, then preset defaults
	const alpha: Num = cfg.alpha ?? defaults.alpha;
	const beta: Num = cfg.beta ?? defaults.beta;
	const radius: Num = cfg.radius ?? defaults.radius;

	const camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
		`camera-${preset}`,
		alpha,
		beta,
		radius,
		target,
		scene,
	);

	// Wheel zoom precision
	camera.wheelPrecision = cfg.wheelPrecision;

	// Panning axis — restrict to XZ plane by default
	camera.panningAxis = new BABYLON.Vector3(cfg.panningAxis.x, cfg.panningAxis.y, cfg.panningAxis.z);

	// FOV
	camera.fov = defaults.fov;

	// Beta limits
	if (defaults.lockBeta) {
		camera.lowerBetaLimit = defaults.beta;
		camera.upperBetaLimit = defaults.beta;
	} else {
		camera.lowerBetaLimit = cfg.lowerBetaLimit;
		camera.upperBetaLimit = cfg.upperBetaLimit;
	}

	// Alpha limits — lock for presets that restrict rotation
	if (defaults.lockAlpha) {
		camera.lowerAlphaLimit = alpha;
		camera.upperAlphaLimit = alpha;
	} else {
		camera.lowerAlphaLimit = null;
		camera.upperAlphaLimit = null;
	}

	// Radius limits
	camera.lowerRadiusLimit = cfg.lowerRadiusLimit;
	camera.upperRadiusLimit = cfg.upperRadiusLimit;

	// Inertia — explicit override wins, then preset default
	camera.inertia = cfg.inertia ?? defaults.inertia;

	// Panning — explicit override wins, then preset default
	camera.panningSensibility = cfg.panningSensibility ?? defaults.panningSensibility;

	// Orthographic mode (mapeditor preset) — aspect-ratio-corrected
	if (defaults.orthographic) {
		camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
		const halfHeight: Num = cfg.orthoSize;
		const aspect: Num = scene.getEngine().getAspectRatio(camera);
		const halfWidth: Num = halfHeight * aspect;
		camera.orthoLeft = -halfWidth;
		camera.orthoRight = halfWidth;
		camera.orthoTop = halfHeight;
		camera.orthoBottom = -halfHeight;
	}

	// Auto-rotation behavior (orbit preset)
	camera.useAutoRotationBehavior = defaults.autoRotate;

	return okShallow(camera);
}

// =============================================================================
// UniversalCamera (firstperson)
// =============================================================================

/**
 * Creates a UniversalCamera for first-person preset.
 *
 * @param scene - Babylon.js scene.
 * @param cfg - Validated camera config.
 * @returns The configured UniversalCamera.
 */
function createFirstPersonCamera(
	scene: BABYLON.Scene,
	cfg: CameraConfig,
): BabylonResult<BABYLON.Camera> {
	const defaults: PresetDefaults = PRESET_DEFAULTS.firstperson;
	const position: BABYLON.Vector3 = new BABYLON.Vector3(cfg.targetX, cfg.targetY, cfg.targetZ);

	const camera: BABYLON.UniversalCamera = new BABYLON.UniversalCamera(
		'camera-firstperson',
		position,
		scene,
	);

	// WASD keys
	camera.keysUp = [87]; // W
	camera.keysDown = [83]; // S
	camera.keysLeft = [65]; // A
	camera.keysRight = [68]; // D

	// FOV
	camera.fov = defaults.fov;

	// Inertia — explicit override wins
	camera.inertia = cfg.inertia ?? defaults.inertia;

	return okShallow(camera);
}

// =============================================================================
// Smooth Follow
// =============================================================================

/** Options for updating camera target with smooth interpolation. */
export type CameraTargetOptions = {
	/** The camera to update. Must be an ArcRotateCamera for target lerp. */
	readonly camera: BABYLON.Camera;
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
 * For ArcRotateCamera presets, lerps the orbit target.
 * For UniversalCamera, lerps the position (first-person movement is external).
 *
 * @param options - Camera target update options.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
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

		if (camera instanceof BABYLON.ArcRotateCamera) {
			// eslint-disable-next-line new-cap -- Babylon.js static factory method
			camera.target = BABYLON.Vector3.Lerp(camera.target, goal, lerpFactor);
		} else {
			// UniversalCamera — lerp position
			// eslint-disable-next-line new-cap -- Babylon.js static factory method
			camera.position = BABYLON.Vector3.Lerp(camera.position, goal, lerpFactor);
		}

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// FF Tactics Rotation
// =============================================================================

/** Options for FF Tactics-style 4-angle rotation. */
export type RotateTacticsOptions = {
	/** The ArcRotateCamera to rotate. */
	readonly camera: BABYLON.ArcRotateCamera;
	/** Rotation direction: clockwise or counter-clockwise. */
	readonly direction: 'cw' | 'ccw';
};

/**
 * Snaps the camera alpha by ±90° (π/2 radians).
 *
 * FF Tactics-style 4-angle rotation for ArcRotateCamera presets.
 * Immediately sets the alpha to the new value (animation is handled
 * by the caller or via Babylon.js animation system).
 *
 * Also updates alpha limits when the camera has locked alpha (e.g., hd2d preset).
 *
 * @param options - Camera and rotation direction.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * rotateTactics({ camera: arcCamera, direction: 'cw' });
 * ```
 */
export function rotateTactics(options: RotateTacticsOptions): Result<Bool> {
	const { camera, direction } = options;

	try {
		const delta: number = direction === 'cw' ? Math.PI / 2 : -Math.PI / 2;
		const newAlpha: number = camera.alpha + delta;

		camera.alpha = newAlpha;

		// Update alpha limits if locked
		if (camera.lowerAlphaLimit !== null && camera.upperAlphaLimit !== null) {
			camera.lowerAlphaLimit = newAlpha;
			camera.upperAlphaLimit = newAlpha;
		}

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Switch Camera Preset
// =============================================================================

/** Handle for a running preset transition. */
export type PresetTransitionHandle = {
	/** Cancels the transition at its current interpolation point. */
	readonly dispose: () => void;
};

/** Options for switching camera preset with smooth transition. */
export type SwitchCameraPresetOptions = {
	/** The Babylon.js scene. */
	readonly scene: BABYLON.Scene;
	/** The ArcRotateCamera to transition. */
	readonly camera: BABYLON.ArcRotateCamera;
	/** Target preset to transition to. */
	readonly targetPreset: CameraPreset;
	/** Transition duration in milliseconds. 0 = instant. */
	readonly durationMs: Num;
	/** Easing function name. */
	readonly easing: 'linear' | 'easeInOutCubic' | 'easeOutBack' | 'easeInOutQuad';
};

/**
 * Easing functions for smooth transitions.
 *
 * @param t - Progress [0, 1].
 * @returns Eased value [0, 1].
 */
/** No-op dispose for instant transitions. */
const NOOP_DISPOSE = (): void => {
	/* no-op for instant transitions */
};

/**
 * Linear fallback easing when requested easing is not found.
 *
 * @param t - Progress value [0, 1].
 * @returns The same value unchanged.
 */
const LINEAR_FALLBACK = (t: Num): Num => t;

const EASING_FUNCTIONS: Record<string, (t: Num) => Num> = {
	linear: (t: Num): Num => t,
	easeInOutCubic: (t: Num): Num => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
	easeOutBack: (t: Num): Num => {
		const c1: Num = 1.701_58;
		const c3: Num = c1 + 1;
		return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
	},
	easeInOutQuad: (t: Num): Num => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};

/**
 * Smoothly transitions an ArcRotateCamera to a new preset.
 *
 * Interpolates alpha, beta, radius, fov, and inertia from current values
 * to the target preset defaults over the specified duration. Also updates
 * orbit limits (alpha/beta lock) and panning at transition end.
 *
 * When `durationMs` is 0, the preset is applied instantly.
 *
 * @param options - Scene, camera, target preset, duration, and easing.
 * @returns BabylonResult containing a handle to cancel the transition.
 *
 * @example
 * ```typescript
 * const result = switchCameraPreset({
 *   scene, camera: arcCamera, targetPreset: 'cinematic',
 *   durationMs: 500, easing: 'easeInOutCubic',
 * });
 * if (result.ok) result.data.dispose(); // cancel early
 * ```
 */
export function switchCameraPreset(
	options: SwitchCameraPresetOptions,
): BabylonResult<PresetTransitionHandle> {
	const { scene, camera, targetPreset, durationMs, easing } = options;

	try {
		const defaults: PresetDefaults = PRESET_DEFAULTS[targetPreset];
		const easeFn: (t: Num) => Num = EASING_FUNCTIONS[easing] ?? LINEAR_FALLBACK;

		// Snapshot starting values
		const startAlpha: Num = camera.alpha;
		const startBeta: Num = camera.beta;
		const startRadius: Num = camera.radius;
		const startFov: Num = camera.fov;
		const startInertia: Num = camera.inertia;

		// Target values
		const endAlpha: Num = defaults.alpha;
		const endBeta: Num = defaults.beta;
		const endRadius: Num = defaults.radius;
		const endFov: Num = defaults.fov;
		const endInertia: Num = defaults.inertia;

		const applyFinalPresetState = (): void => {
			camera.fov = endFov;
			camera.inertia = endInertia;
			camera.panningSensibility = defaults.panningSensibility;

			// Alpha limits
			if (defaults.lockAlpha) {
				camera.lowerAlphaLimit = endAlpha;
				camera.upperAlphaLimit = endAlpha;
			} else {
				camera.lowerAlphaLimit = null;
				camera.upperAlphaLimit = null;
			}

			// Beta limits
			if (defaults.lockBeta) {
				camera.lowerBetaLimit = endBeta;
				camera.upperBetaLimit = endBeta;
			} else {
				camera.lowerBetaLimit = Math.PI / 6;
				camera.upperBetaLimit = Math.PI / 2.5;
			}
		};

		// Instant transition
		if (durationMs <= 0) {
			camera.alpha = endAlpha;
			camera.beta = endBeta;
			camera.radius = endRadius;
			applyFinalPresetState();
			return okShallow({ dispose: NOOP_DISPOSE });
		}

		// Animated transition
		const startTime: Num = Date.now() as Num;
		let disposed = false;

		// Unlock limits during transition so interpolated values aren't clamped
		camera.lowerAlphaLimit = null;
		camera.upperAlphaLimit = null;
		camera.lowerBetaLimit = 0;
		camera.upperBetaLimit = Math.PI;

		const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
			if (disposed) return;

			const elapsed: Num = (Date.now() - startTime) as Num;
			const rawProgress: Num = Math.min(1, elapsed / durationMs) as Num;
			const t: Num = easeFn(rawProgress);

			// Interpolate camera properties
			camera.alpha = startAlpha + (endAlpha - startAlpha) * t;
			camera.beta = startBeta + (endBeta - startBeta) * t;
			camera.radius = startRadius + (endRadius - startRadius) * t;
			camera.fov = startFov + (endFov - startFov) * t;
			camera.inertia = startInertia + (endInertia - startInertia) * t;

			if (rawProgress >= 1) {
				applyFinalPresetState();
				disposed = true;
				scene.onBeforeRenderObservable.remove(observer);
			}
		});

		const handle: PresetTransitionHandle = {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				scene.onBeforeRenderObservable.remove(observer);
			},
		};

		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Reset Camera
// =============================================================================

/** Options for resetting a camera to preset defaults. */
export type ResetCameraOptions = {
	/** The Babylon.js scene. */
	readonly scene: BABYLON.Scene;
	/** The camera to reset. */
	readonly camera: BABYLON.Camera;
	/** Preset to reset to. */
	readonly preset: CameraPreset;
};

/**
 * Instantly resets a camera to preset defaults.
 *
 * Applies all preset default values (alpha, beta, radius, fov, inertia,
 * panning, limits) without animation. Works for both ArcRotateCamera and
 * UniversalCamera presets.
 *
 * @param options - Scene, camera, and target preset.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * resetCamera({ scene, camera, preset: 'hd2d' });
 * ```
 */
export function resetCamera(options: ResetCameraOptions): Result<Bool> {
	const { camera, preset } = options;

	try {
		const defaults: PresetDefaults = PRESET_DEFAULTS[preset];

		camera.fov = defaults.fov;
		camera.inertia = defaults.inertia;

		if (camera instanceof BABYLON.ArcRotateCamera) {
			camera.alpha = defaults.alpha;
			camera.beta = defaults.beta;
			camera.radius = defaults.radius;
			camera.panningSensibility = defaults.panningSensibility;

			// Alpha limits
			if (defaults.lockAlpha) {
				camera.lowerAlphaLimit = defaults.alpha;
				camera.upperAlphaLimit = defaults.alpha;
			} else {
				camera.lowerAlphaLimit = null;
				camera.upperAlphaLimit = null;
			}

			// Beta limits
			if (defaults.lockBeta) {
				camera.lowerBetaLimit = defaults.beta;
				camera.upperBetaLimit = defaults.beta;
			} else {
				camera.lowerBetaLimit = defaults.lowerBetaLimit;
				camera.upperBetaLimit = defaults.upperBetaLimit;
			}

			// Orthographic mode — aspect-ratio-corrected
			if (defaults.orthographic) {
				camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
				const scene: BABYLON.Scene | null = camera.getScene();
				if (scene) {
					const halfHeight: Num = defaults.orthoSize;
					const aspect: Num = scene.getEngine().getAspectRatio(camera);
					const halfWidth: Num = halfHeight * aspect;
					camera.orthoLeft = -halfWidth;
					camera.orthoRight = halfWidth;
					camera.orthoTop = halfHeight;
					camera.orthoBottom = -halfHeight;
				}
			} else {
				camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
			}

			// Auto-rotation
			camera.useAutoRotationBehavior = defaults.autoRotate;
		}

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Map-Aware Radius
// =============================================================================

/**
 * Computes the minimum camera radius to see an entire tilemap.
 *
 * Uses the map diagonal, the camera FOV, and a padding multiplier to
 * determine the distance the camera needs to be from the map center
 * so that every tile is visible.
 *
 * @param mapWidth - Map width in tiles.
 * @param mapHeight - Map height in tiles.
 * @param fov - Camera field-of-view in radians.
 * @param paddingScale - Extra padding multiplier (1.0 = exact fit). Default 1.15.
 * @returns The minimum radius needed.
 *
 * @example
 * ```typescript
 * const r = computeMinRadiusForMap(200, 200, 0.8);
 * camera.upperRadiusLimit = Math.max(camera.upperRadiusLimit ?? 300, r);
 * ```
 */
export function computeMinRadiusForMap(
	mapWidth: Num,
	mapHeight: Num,
	fov: Num,
	paddingScale: Num = 1.15 as Num,
): Num {
	const safeW: Num = Math.max(1, mapWidth) as Num;
	const safeH: Num = Math.max(1, mapHeight) as Num;
	const diagonal: Num = Math.hypot(safeW, safeH) as Num;
	const boundRadius: Num = (diagonal / 2) as Num;
	return ((boundRadius / Math.sin(fov / 2)) * paddingScale) as Num;
}

// =============================================================================
// Refocus On Tilemap
// =============================================================================

/** Options for refocusing the camera on the entire tilemap. */
export type RefocusOptions = {
	/** The Babylon.js scene. */
	readonly scene: BABYLON.Scene;
	/** The camera to refocus. Must be ArcRotateCamera for perspective presets. */
	readonly camera: BABYLON.Camera;
	/** Tilemap width in tiles. */
	readonly mapWidth: Num;
	/** Tilemap height in tiles. */
	readonly mapHeight: Num;
	/** Refocus configuration (animation, easing, padding). */
	readonly config: RefocusConfig;
	/** Current camera preset name (used to look up default alpha/beta). */
	readonly currentPreset: CameraPreset;
};

/**
 * Refocuses the camera to show the entire tilemap.
 *
 * Computes the ideal camera position from tilemap dimensions, camera FOV,
 * and padding scale, then smoothly animates the camera there. Works with
 * all ArcRotateCamera presets. Returns an error for UniversalCamera
 * (firstperson preset).
 *
 * @param options - Scene, camera, map dimensions, config, and current preset.
 * @returns BabylonResult containing a handle to cancel the animation.
 *
 * @example
 * ```typescript
 * import { refocusOnTilemap } from './camera-controller';
 * import { REFOCUS_DEFAULTS } from '../schemas/camera-config';
 *
 * const result = refocusOnTilemap({
 *   scene, camera: arcCamera,
 *   mapWidth: 32, mapHeight: 32,
 *   config: REFOCUS_DEFAULTS,
 *   currentPreset: 'hd2d',
 * });
 * if (result.ok) result.data.dispose(); // cancel early
 * ```
 */
export function refocusOnTilemap(options: RefocusOptions): BabylonResult<PresetTransitionHandle> {
	const { scene, camera, mapWidth, mapHeight, config, currentPreset } = options;

	try {
		if (!(camera instanceof BABYLON.ArcRotateCamera)) {
			return err(
				ERRORS.SCENE.RENDER_FAILED,
				'Refocus requires ArcRotateCamera (not available in firstperson mode)',
			);
		}

		const arc: BABYLON.ArcRotateCamera = camera;
		const defaults: PresetDefaults = PRESET_DEFAULTS[currentPreset];
		const easeFn: (t: Num) => Num = EASING_FUNCTIONS[config.easing] ?? LINEAR_FALLBACK;

		// Compute destination — safe minimum of 1 tile for zero-size maps
		const safeWidth: Num = Math.max(1, mapWidth) as Num;
		const safeHeight: Num = Math.max(1, mapHeight) as Num;
		const targetX: Num = (safeWidth / 2) as Num;
		const targetZ: Num = (safeHeight / 2) as Num;
		const idealRadius: Num = computeMinRadiusForMap(
			safeWidth,
			safeHeight,
			arc.fov,
			config.paddingScale as Num,
		);

		// Raise the zoom-out limit so the camera can actually reach the
		// distance needed to show the full map.  This also unblocks manual
		// scroll-zoom after the refocus completes.
		const currentUpper: Num = (arc.upperRadiusLimit ?? 10_000) as Num;
		if (idealRadius > currentUpper) {
			arc.upperRadiusLimit = idealRadius;
		}

		const endRadius: Num = Math.max(arc.lowerRadiusLimit ?? 1, idealRadius) as Num;
		const endBeta: Num = config.resetElevation ? defaults.beta : arc.beta;
		const endAlpha: Num = config.resetOrbit ? defaults.alpha : arc.alpha;

		// Instant mode — no animation
		if (!config.animated || config.durationMs <= 0) {
			arc.target.x = targetX;
			arc.target.y = 0;
			arc.target.z = targetZ;
			arc.radius = endRadius;
			if (config.resetElevation) arc.beta = endBeta;
			if (config.resetOrbit) arc.alpha = endAlpha;
			return okShallow({ dispose: NOOP_DISPOSE });
		}

		// Animated transition
		const startTarget: BABYLON.Vector3 = arc.target.clone();
		const startRadius: Num = arc.radius;
		const startAlpha: Num = arc.alpha;
		const startBeta: Num = arc.beta;
		const startTime: Num = Date.now() as Num;
		let disposed: boolean = false;

		// Temporarily unlock alpha/beta limits during animation
		const savedLowerAlpha: number | null = arc.lowerAlphaLimit;
		const savedUpperAlpha: number | null = arc.upperAlphaLimit;
		const savedLowerBeta: number | null = arc.lowerBetaLimit;
		const savedUpperBeta: number | null = arc.upperBetaLimit;
		arc.lowerAlphaLimit = null;
		arc.upperAlphaLimit = null;
		arc.lowerBetaLimit = 0;
		arc.upperBetaLimit = Math.PI;

		const restoreLimits = (): void => {
			arc.lowerAlphaLimit = savedLowerAlpha;
			arc.upperAlphaLimit = savedUpperAlpha;
			arc.lowerBetaLimit = savedLowerBeta;
			arc.upperBetaLimit = savedUpperBeta;
		};

		const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
			if (disposed) return;

			const elapsed: Num = (Date.now() - startTime) as Num;
			const rawProgress: Num = Math.min(1, elapsed / config.durationMs) as Num;
			const t: Num = easeFn(rawProgress);

			arc.target.x = startTarget.x + (targetX - startTarget.x) * t;
			arc.target.y = 0;
			arc.target.z = startTarget.z + (targetZ - startTarget.z) * t;
			arc.radius = startRadius + (endRadius - startRadius) * t;

			if (config.resetElevation) {
				arc.beta = startBeta + (endBeta - startBeta) * t;
			}
			if (config.resetOrbit) {
				arc.alpha = startAlpha + (endAlpha - startAlpha) * t;
			}

			if (rawProgress >= 1) {
				restoreLimits();
				disposed = true;
				scene.onBeforeRenderObservable.remove(observer);
			}
		});

		return okShallow({
			dispose: (): void => {
				if (disposed) return;
				disposed = true;
				restoreLimits();
				scene.onBeforeRenderObservable.remove(observer);
			},
		});
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
