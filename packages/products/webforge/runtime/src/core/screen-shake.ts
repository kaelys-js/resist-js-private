/**
 * Trauma-based screen shake with Perlin noise, 3 channels, ASR envelope, and decay modes.
 *
 * Replaces the old `screenShake()` in camera-controller.ts (which used `Math.random()`
 * and linear-only decay) with a full trauma system:
 *
 * - **Trauma accumulation** — `addTrauma()` / `resetTrauma()` / `getTrauma()`
 * - **Per-channel control** — translation (XZ), rotation (roll via upVector), FOV offset
 * - **ASR envelope** — attack ramp, sustain hold, decay fade
 * - **3 decay modes** — linear, exponential, easeOut
 * - **Perlin noise** — deterministic, smooth randomisation via `perlin2d()`
 * - **Directional bias** — 70/30 bias along a specified XZ direction
 * - **Hit-freeze** — optional pause before the shake begins
 * - **Global controls** — master enable, global scale multiplier
 *
 * @example
 * ```typescript
 * import { screenShake, addTrauma, resetTrauma } from './screen-shake';
 *
 * addTrauma(0.5);
 * const result = screenShake({ scene, camera, intensity: 0.5 });
 * if (result.ok) {
 *   // Cancel early:
 *   result.data.dispose();
 * }
 * ```
 *
 * @module
 */

/* eslint-disable max-lines-per-function */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from './babylon-result';
import { perlin2d } from './perlin';
import {
	ScreenShakeConfigSchema,
	type DecayMode,
	type ScreenShakeConfig,
	type ShakeChannel,
	type ShakeEnvelope,
} from '../schemas/screen-shake-config';

// =============================================================================
// Types
// =============================================================================

/** Handle for a running screen shake effect. */
export type ShakeHandle = {
	/** Cancels the shake effect early and restores camera state. */
	readonly dispose: () => void;
};

/** Options for starting a screen shake. */
export type ScreenShakeOptions = {
	/** The Babylon.js scene. */
	readonly scene: BABYLON.Scene;
	/** The camera to shake. */
	readonly camera: BABYLON.Camera;
} & Partial<ScreenShakeConfig> & {
		/** Shake intensity (trauma input). Required. */
		readonly intensity: Num;
	};

// =============================================================================
// Module State
// =============================================================================

/** Current trauma level [0, 1]. */
let _trauma: Num = 0 as Num;

/** Global shake amplitude multiplier. */
let _globalScale: Num = 1.0 as Num;

/** Master on/off switch for all shakes. */
let _masterEnabled: Bool = true as Bool;

/** Active shake handles for bulk cancellation. */
let _activeHandles: Array<{ dispose: () => void }> = [];

// =============================================================================
// Trauma System
// =============================================================================

/**
 * Adds trauma to the global trauma accumulator, clamped at 1.0.
 *
 * @param amount - Trauma to add. Must be >= 0.
 *
 * @example
 * ```typescript
 * addTrauma(0.3); // light hit
 * addTrauma(0.7); // heavy hit — clamps total at 1.0
 * ```
 */
export function addTrauma(amount: Num): void {
	_trauma = Math.min(1, _trauma + amount) as Num;
}

/**
 * Returns the current trauma level [0, 1].
 *
 * @returns Current trauma value.
 *
 * @example
 * ```typescript
 * const trauma = getTrauma(); // 0.0 to 1.0
 * ```
 */
export function getTrauma(): Num {
	return _trauma;
}

/**
 * Resets trauma to 0.
 *
 * @example
 * ```typescript
 * resetTrauma(); // trauma = 0
 * ```
 */
export function resetTrauma(): void {
	_trauma = 0 as Num;
}

/**
 * Disposes all active shakes and resets trauma to 0.
 *
 * @example
 * ```typescript
 * stopAllShakes(); // all shakes cancelled, trauma = 0
 * ```
 */
export function stopAllShakes(): void {
	for (const handle of _activeHandles) {
		handle.dispose();
	}
	_activeHandles = [];
	_trauma = 0 as Num;
}

// =============================================================================
// Global Controls
// =============================================================================

/**
 * Sets the global shake amplitude multiplier.
 *
 * @param scale - New global scale value.
 *
 * @example
 * ```typescript
 * setGlobalScale(2.0); // double all shake amplitudes
 * ```
 */
export function setGlobalScale(scale: Num): void {
	_globalScale = scale as Num;
}

/**
 * Returns the current global shake scale.
 *
 * @returns Current global scale value.
 *
 * @example
 * ```typescript
 * const scale = getGlobalScale(); // 1.0 by default
 * ```
 */
export function getGlobalScale(): Num {
	return _globalScale;
}

/**
 * Sets the master shake enable flag.
 *
 * @param enabled - Whether shakes should be active.
 *
 * @example
 * ```typescript
 * setMasterEnabled(false); // suppress all shakes
 * ```
 */
export function setMasterEnabled(enabled: Bool): void {
	_masterEnabled = enabled as Bool;
}

/**
 * Returns the master shake enable flag.
 *
 * @returns Whether shake is globally enabled.
 *
 * @example
 * ```typescript
 * const enabled = getMasterEnabled(); // true by default
 * ```
 */
export function getMasterEnabled(): Bool {
	return _masterEnabled;
}

// =============================================================================
// Pure Functions — Decay
// =============================================================================

/**
 * Applies a decay curve to a normalised progress value.
 *
 * - `linear`: `1 - t`
 * - `exponential`: `exp(-5 * t)` (fast initial drop, slow tail)
 * - `easeOut`: `1 - t^2` (smooth deceleration)
 *
 * @param t - Progress through the decay phase [0, 1]. 0 = start, 1 = end.
 * @param mode - Decay curve shape.
 * @returns Amplitude multiplier [~0, 1].
 *
 * @example
 * ```typescript
 * applyDecay(0.5, 'linear');      // 0.5
 * applyDecay(0.5, 'exponential'); // ~0.082
 * applyDecay(0.5, 'easeOut');     // 0.75
 * ```
 */
export function applyDecay(t: number, mode: DecayMode): number {
	if (mode === 'exponential') {
		return Math.exp(-5 * t);
	}
	if (mode === 'easeOut') {
		return 1 - t * t;
	}
	// linear
	return 1 - t;
}

// =============================================================================
// Pure Functions — Envelope
// =============================================================================

/**
 * Computes the envelope amplitude multiplier for a given elapsed time.
 *
 * The envelope has three phases:
 * 1. **Attack** — linear ramp from 0 to 1 over `attackMs`
 * 2. **Sustain** — holds at 1 for `sustainMs`
 * 3. **Decay** — applies the decay curve from 1 to ~0 over `decayMs`
 *
 * Returns 0 when elapsed >= total duration (attack + sustain + decay).
 *
 * @param elapsedMs - Time since the shake started, in milliseconds.
 * @param envelope - ASR envelope timing.
 * @param decayMode - Decay curve shape for the decay phase.
 * @returns Amplitude multiplier [0, 1].
 *
 * @example
 * ```typescript
 * const mult = computeEnvelopeMultiplier(
 *   150,
 *   { attackMs: 0, sustainMs: 0, decayMs: 300 },
 *   'linear',
 * ); // 0.5
 * ```
 */
export function computeEnvelopeMultiplier(
	elapsedMs: number,
	envelope: ShakeEnvelope,
	decayMode: DecayMode,
): number {
	const { attackMs, sustainMs, decayMs } = envelope;
	const totalDuration: number = attackMs + sustainMs + decayMs;

	// Past the end
	if (elapsedMs >= totalDuration) {
		return 0;
	}

	// Attack phase
	if (elapsedMs < attackMs) {
		return attackMs > 0 ? elapsedMs / attackMs : 1;
	}

	// Sustain phase
	const afterAttack: number = elapsedMs - attackMs;
	if (afterAttack < sustainMs) {
		return 1;
	}

	// Decay phase
	const decayElapsed: number = afterAttack - sustainMs;
	const decayProgress: number = decayMs > 0 ? decayElapsed / decayMs : 1;
	return applyDecay(decayProgress, decayMode);
}

// =============================================================================
// Perlin Noise Sampling (multi-octave)
// =============================================================================

/**
 * Samples multi-octave Perlin noise.
 *
 * @param seedOffset - Offset added to the seed for channel separation.
 * @param time - Elapsed time in seconds.
 * @param frequency - Base sampling frequency in Hz.
 * @param seed - Base noise seed.
 * @param octaves - Number of noise octaves.
 * @returns Noise value (not normalised, varies with octaves).
 */
function sampleNoise(
	seedOffset: number,
	time: number,
	frequency: number,
	seed: number,
	octaves: number,
): number {
	let value = 0;
	let amp = 1;
	let freq: number = frequency;
	for (let i = 0; i < octaves; i++) {
		value += perlin2d(seed + seedOffset + i * 31.7, time * freq) * amp;
		amp *= 0.5;
		freq *= 2;
	}
	return value;
}

// =============================================================================
// Channel Application
// =============================================================================

/**
 * Computes the offset for a single shake channel.
 *
 * @param channel - Channel config (enabled, amplitude, frequency).
 * @param seedOffset - Seed offset for this channel.
 * @param timeSec - Elapsed time in seconds.
 * @param seed - Base noise seed.
 * @param octaves - Number of noise octaves.
 * @param shakeAmount - Combined trauma^power * envelope * globalScale.
 * @returns Channel offset value, or 0 if channel is disabled.
 */
function computeChannelOffset(
	channel: ShakeChannel,
	seedOffset: number,
	timeSec: number,
	seed: number,
	octaves: number,
	shakeAmount: number,
): number {
	if (!channel.enabled) return 0;
	const noise: number = sampleNoise(seedOffset, timeSec, channel.frequency, seed, octaves);
	return noise * channel.amplitude * shakeAmount;
}

// =============================================================================
// Main Screen Shake
// =============================================================================

/**
 * Starts a trauma-based screen shake effect.
 *
 * Validates config via {@link ScreenShakeConfigSchema}, sets the global trauma level
 * from the intensity, optionally pauses for a hit-freeze, then registers a per-frame
 * observer that samples Perlin noise for each enabled channel (translation, rotation, FOV).
 *
 * For ArcRotateCamera, shakes `camera.target` (orbit computation overwrites position).
 * For other cameras, shakes `camera.position`.
 *
 * Returns a handle for early cancellation. Automatically cleans up after the
 * envelope duration (attack + sustain + decay) completes.
 *
 * @param options - Scene, camera, and shake configuration.
 * @returns BabylonResult containing a ShakeHandle with `dispose()`.
 *
 * @example
 * ```typescript
 * const result = screenShake({
 *   scene,
 *   camera,
 *   intensity: 0.5,
 *   envelope: { attackMs: 50, sustainMs: 100, decayMs: 500 },
 *   decayMode: 'exponential',
 * });
 * if (result.ok) {
 *   // Cancel early if needed:
 *   result.data.dispose();
 * }
 * ```
 */
export function screenShake(options: ScreenShakeOptions): BabylonResult<ShakeHandle> {
	const { scene, camera, ...configInput } = options;

	// Validate config via schema
	const parsed = safeParse(ScreenShakeConfigSchema, configInput);
	if (!parsed.ok) return parsed;
	const config: ScreenShakeConfig = parsed.data;

	try {
		// Set trauma from intensity (clamped at 1.0)
		_trauma = Math.min(1, config.intensity) as Num;

		const isArcRotate: boolean = camera instanceof BABYLON.ArcRotateCamera;

		// Save original camera state for restoration
		const originalTarget: BABYLON.Vector3 = isArcRotate
			? (camera as BABYLON.ArcRotateCamera).target.clone()
			: camera.position.clone();
		const originalUpVector: BABYLON.Vector3 = camera.upVector.clone();
		const originalFov: number = camera.fov;

		let disposed = false;
		let observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
		let freezeTimeout: ReturnType<typeof setTimeout> | null = null;

		const restoreCamera = (): void => {
			if (isArcRotate) {
				(camera as BABYLON.ArcRotateCamera).target.copyFrom(originalTarget);
			} else {
				camera.position.copyFrom(originalTarget);
			}
			camera.upVector.copyFrom(originalUpVector);
			camera.fov = originalFov;
		};

		const cleanup = (): void => {
			if (disposed) return;
			disposed = true;
			if (freezeTimeout !== null) {
				clearTimeout(freezeTimeout);
				freezeTimeout = null;
			}
			restoreCamera();
			if (observer) {
				scene.onBeforeRenderObservable.remove(observer);
				observer = null;
			}
			// Remove from active handles
			_activeHandles = _activeHandles.filter((h) => h !== handle);
		};

		const handle: ShakeHandle = { dispose: cleanup };
		_activeHandles.push(handle);

		const startShake = (): void => {
			if (disposed) return;

			const startTime: number = Date.now();
			const { envelope } = config;
			const totalDuration: number = envelope.attackMs + envelope.sustainMs + envelope.decayMs;
			const { seed } = config.noise;
			const { octaves } = config.noise;
			const { traumaPower, direction } = config;

			observer = scene.onBeforeRenderObservable.add(() => {
				if (disposed) return;

				const elapsed: number = Date.now() - startTime;

				// Shake complete
				if (elapsed >= totalDuration) {
					cleanup();
					return;
				}

				// If master is disabled, skip computation but keep running
				if (!_masterEnabled) return;

				const envelopeMult: number = computeEnvelopeMultiplier(elapsed, envelope, config.decayMode);
				const shakeAmount: number = _trauma ** traumaPower * envelopeMult * _globalScale;

				const timeSec: number = elapsed / 1000;

				// Channel offsets
				let transX: number = computeChannelOffset(
					config.translation,
					0,
					timeSec,
					seed,
					octaves,
					shakeAmount,
				);
				let transZ: number = computeChannelOffset(
					config.translation,
					100,
					timeSec,
					seed,
					octaves,
					shakeAmount,
				);
				const roll: number = computeChannelOffset(
					config.rotation,
					200,
					timeSec,
					seed,
					octaves,
					shakeAmount,
				);
				const fovOffset: number = computeChannelOffset(
					config.fov,
					300,
					timeSec,
					seed,
					octaves,
					shakeAmount,
				);

				// Directional bias: 70% along direction, 30% perpendicular
				if (direction !== null) {
					const len: number = Math.hypot(direction.x, direction.z);
					if (len > 0) {
						const dirX: number = direction.x / len;
						const dirZ: number = direction.z / len;

						// Project onto direction and perpendicular
						const alongDir: number = transX * dirX + transZ * dirZ;
						const perpDir: number = -transX * dirZ + transZ * dirX;

						// Reconstruct with bias
						transX = alongDir * 0.7 * dirX + perpDir * 0.3 * -dirZ;
						transZ = alongDir * 0.7 * dirZ + perpDir * 0.3 * dirX;
					}
				}

				// Apply translation
				if (isArcRotate) {
					const arc = camera as BABYLON.ArcRotateCamera;
					arc.target.x = originalTarget.x + transX;
					arc.target.z = originalTarget.z + transZ;
				} else {
					camera.position.x = originalTarget.x + transX;
					camera.position.z = originalTarget.z + transZ;
				}

				// Apply rotation (roll) via upVector rotation around forward axis
				if (roll === 0) {
					camera.upVector.copyFrom(originalUpVector);
				} else {
					const forward: BABYLON.Vector3 = camera.getForwardRay().direction;
					const rotationQuat: BABYLON.Quaternion = BABYLON.Quaternion.RotationAxis(forward, roll);
					const rotatedUp: BABYLON.Vector3 = originalUpVector.clone();
					rotatedUp.rotateByQuaternionToRef(rotationQuat, rotatedUp);
					camera.upVector.copyFrom(rotatedUp);
				}

				// Apply FOV offset
				camera.fov = originalFov + fovOffset;
			});
		};

		// Hit-freeze: delay start
		if (config.freezeMs > 0) {
			freezeTimeout = setTimeout(startShake, config.freezeMs);
		} else {
			startShake();
		}

		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

/* eslint-enable max-lines-per-function */
