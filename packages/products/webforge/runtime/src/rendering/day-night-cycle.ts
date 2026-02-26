/**
 * Day/night cycle — time engine with keyframe interpolation and procedural sun path.
 *
 * Drives ambient color, sun/moon intensity, fog, clear color, and environment
 * intensity through time-of-day keyframes. Sun direction is computed
 * procedurally from elevation/azimuth rather than keyframed.
 *
 * All pure-math helpers (`interpolateKeyframes`, `computeSunDirection`) are
 * exported for unit testing without Babylon.js.
 *
 * @example
 * ```typescript
 * import { createDayNightCycle, disposeDayNightCycle } from './day-night-cycle';
 *
 * const result = createDayNightCycle({ scene, config, managedLights });
 * if (!result.ok) return result;
 * // Cycle animates automatically via scene observer
 * disposeDayNightCycle({ cycle: result.data, scene });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { DayNightCycleConfig, SunPathConfig, TimeKeyframe } from '../schemas/lighting-config';
import type { ColorRgba, Vector3 } from '../schemas/scene-setup-config';
import type { ManagedLight } from './light-manager';

// =============================================================================
// Types
// =============================================================================

/** A running day/night cycle instance. */
export type DayNightCycleInstance = {
	readonly observer: BABYLON.Observer<BABYLON.Scene>;
	readonly config: Partial<DayNightCycleConfig>;
	readonly keyframes: readonly TimeKeyframe[];
	readonly scene: BABYLON.Scene;
	readonly sunLight: BABYLON.DirectionalLight | null;
	readonly ambientLight: BABYLON.HemisphericLight | null;
	readonly moonLight: BABYLON.Light | null;
	timeOfDay: Num;
};

/** Interpolated values at a given time of day. */
export type InterpolatedValues = {
	readonly ambientColor?: ColorRgba;
	readonly ambientGroundColor?: ColorRgba;
	readonly sunColor?: ColorRgba;
	readonly sunIntensity?: Num;
	readonly moonColor?: ColorRgba;
	readonly moonIntensity?: Num;
	readonly clearColor?: ColorRgba;
	readonly fogColor?: ColorRgba;
	readonly fogDensity?: Num;
	readonly environmentIntensity?: Num;
};

// =============================================================================
// Default Keyframes
// =============================================================================

/**
 * Default 9-keyframe day/night cycle.
 *
 * Covers midnight → dawn → morning → noon → afternoon → dusk → night.
 */
export const DEFAULT_DAY_CYCLE_KEYFRAMES: readonly TimeKeyframe[] = [
	{
		time: 0,
		ambientColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
		ambientGroundColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
		moonIntensity: 0.3,
		clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
		fogColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
		environmentIntensity: 0.02,
	},
	{
		time: 5,
		ambientColor: { r: 0.15, g: 0.1, b: 0.15, a: 1 },
		ambientGroundColor: { r: 0.05, g: 0.03, b: 0.08, a: 1 },
		sunColor: { r: 0.8, g: 0.4, b: 0.2, a: 1 },
		sunIntensity: 0.1,
		moonIntensity: 0.1,
		clearColor: { r: 0.3, g: 0.15, b: 0.1, a: 1 },
		fogColor: { r: 0.2, g: 0.12, b: 0.1, a: 1 },
		environmentIntensity: 0.05,
	},
	{
		time: 7,
		ambientColor: { r: 0.4, g: 0.35, b: 0.3, a: 1 },
		ambientGroundColor: { r: 0.15, g: 0.12, b: 0.1, a: 1 },
		sunColor: { r: 1, g: 0.85, b: 0.7, a: 1 },
		sunIntensity: 0.6,
		clearColor: { r: 0.5, g: 0.6, b: 0.75, a: 1 },
		fogColor: { r: 0.4, g: 0.4, b: 0.5, a: 1 },
		environmentIntensity: 0.3,
	},
	{
		time: 10,
		ambientColor: { r: 0.5, g: 0.5, b: 0.45, a: 1 },
		ambientGroundColor: { r: 0.2, g: 0.2, b: 0.18, a: 1 },
		sunColor: { r: 1, g: 0.95, b: 0.9, a: 1 },
		sunIntensity: 0.9,
		clearColor: { r: 0.4, g: 0.55, b: 0.8, a: 1 },
		fogColor: { r: 0.6, g: 0.6, b: 0.7, a: 1 },
		environmentIntensity: 0.5,
	},
	{
		time: 12,
		ambientColor: { r: 0.55, g: 0.55, b: 0.5, a: 1 },
		ambientGroundColor: { r: 0.25, g: 0.25, b: 0.22, a: 1 },
		sunColor: { r: 1, g: 1, b: 0.95, a: 1 },
		sunIntensity: 1.0,
		clearColor: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
		fogColor: { r: 0.65, g: 0.65, b: 0.75, a: 1 },
		environmentIntensity: 0.6,
	},
	{
		time: 15,
		ambientColor: { r: 0.5, g: 0.45, b: 0.35, a: 1 },
		ambientGroundColor: { r: 0.2, g: 0.18, b: 0.15, a: 1 },
		sunColor: { r: 1, g: 0.9, b: 0.75, a: 1 },
		sunIntensity: 0.85,
		clearColor: { r: 0.5, g: 0.55, b: 0.75, a: 1 },
		fogColor: { r: 0.55, g: 0.55, b: 0.6, a: 1 },
		environmentIntensity: 0.5,
	},
	{
		time: 18,
		ambientColor: { r: 0.35, g: 0.25, b: 0.2, a: 1 },
		ambientGroundColor: { r: 0.1, g: 0.08, b: 0.06, a: 1 },
		sunColor: { r: 0.9, g: 0.5, b: 0.3, a: 1 },
		sunIntensity: 0.3,
		clearColor: { r: 0.6, g: 0.3, b: 0.2, a: 1 },
		fogColor: { r: 0.3, g: 0.2, b: 0.15, a: 1 },
		environmentIntensity: 0.2,
	},
	{
		time: 20,
		ambientColor: { r: 0.1, g: 0.08, b: 0.15, a: 1 },
		ambientGroundColor: { r: 0.04, g: 0.03, b: 0.06, a: 1 },
		moonIntensity: 0.2,
		clearColor: { r: 0.08, g: 0.06, b: 0.15, a: 1 },
		fogColor: { r: 0.1, g: 0.08, b: 0.12, a: 1 },
		environmentIntensity: 0.05,
	},
	{
		time: 22,
		ambientColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
		ambientGroundColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
		moonIntensity: 0.3,
		clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
		fogColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
		environmentIntensity: 0.02,
	},
];

// =============================================================================
// Pure Math — interpolateKeyframes
// =============================================================================

/**
 * Linearly interpolates a single numeric value.
 *
 * @param a - Start value.
 * @param b - End value.
 * @param t - Interpolation factor [0, 1].
 * @returns Interpolated value.
 */
function lerpNum(a: Num, b: Num, t: Num): Num {
	return a + (b - a) * t;
}

/**
 * Linearly interpolates two RGBA colors component-wise.
 *
 * @param a - Start color.
 * @param b - End color.
 * @param t - Interpolation factor [0, 1].
 * @returns Interpolated color.
 */
function lerpColor(a: ColorRgba, b: ColorRgba, t: Num): ColorRgba {
	return {
		r: lerpNum(a.r, b.r, t),
		g: lerpNum(a.g, b.g, t),
		b: lerpNum(a.b, b.b, t),
		a: lerpNum(a.a, b.a, t),
	};
}

/**
 * Interpolates between surrounding keyframes at a given time.
 *
 * Finds the two keyframes bracketing the given time, computes the interpolation
 * factor, and linearly interpolates all fields present in BOTH keyframes.
 * Handles midnight wrap-around for cyclic time.
 *
 * @param keyframes - Sorted array of time keyframes.
 * @param time - Current time of day [0, 24).
 * @returns Result containing interpolated values.
 */
// eslint-disable-next-line jsdoc/require-returns -- false positive: @returns is present above
export function interpolateKeyframes(
	keyframes: readonly TimeKeyframe[],
	time: Num,
): Result<InterpolatedValues> {
	if (keyframes.length === 0) {
		return okUnchecked({});
	}

	if (keyframes.length === 1) {
		const [first]: readonly TimeKeyframe[] = keyframes;
		if (first === undefined) return okUnchecked({});
		return okUnchecked(keyframeToValues(first));
	}

	// Find surrounding keyframes
	let beforeIdx = 0;
	let afterIdx = 0;

	// Find the last keyframe at or before `time`
	for (let i = 0; i < keyframes.length; i++) {
		const kf: TimeKeyframe | undefined = keyframes[i];
		if (kf !== undefined && kf.time <= time) {
			beforeIdx = i;
		}
	}

	// Find the first keyframe after `time`
	afterIdx = (beforeIdx + 1) % keyframes.length;

	const before: TimeKeyframe | undefined = keyframes[beforeIdx];
	const after: TimeKeyframe | undefined = keyframes[afterIdx];
	if (before === undefined || after === undefined) return okUnchecked({});

	// Compute interpolation factor
	let timeDiff: number;
	let elapsed: number;

	if (after.time > before.time) {
		// Normal case: after is later in the day
		timeDiff = after.time - before.time;
		elapsed = time - before.time;
	} else {
		// Wrap-around: after is next day (e.g., 22:00 → 0:00)
		timeDiff = 24 - before.time + after.time;
		elapsed = time >= before.time ? time - before.time : 24 - before.time + time;
	}

	const t: number = timeDiff === 0 ? 0 : Math.max(0, Math.min(1, elapsed / timeDiff));

	return okUnchecked(interpolateValues(before, after, t));
}

/**
 * Extracts interpolatable values from a keyframe.
 *
 * @param kf - The time keyframe.
 * @returns Interpolated values (only defined fields).
 */
function keyframeToValues(kf: TimeKeyframe): InterpolatedValues {
	const values: Record<string, ColorRgba | Num | undefined> = {};

	if (kf.ambientColor !== undefined) values['ambientColor'] = kf.ambientColor;
	if (kf.ambientGroundColor !== undefined) values['ambientGroundColor'] = kf.ambientGroundColor;
	if (kf.sunColor !== undefined) values['sunColor'] = kf.sunColor;
	if (kf.sunIntensity !== undefined) values['sunIntensity'] = kf.sunIntensity;
	if (kf.moonColor !== undefined) values['moonColor'] = kf.moonColor;
	if (kf.moonIntensity !== undefined) values['moonIntensity'] = kf.moonIntensity;
	if (kf.clearColor !== undefined) values['clearColor'] = kf.clearColor;
	if (kf.fogColor !== undefined) values['fogColor'] = kf.fogColor;
	if (kf.fogDensity !== undefined) values['fogDensity'] = kf.fogDensity;
	if (kf.environmentIntensity !== undefined) {
		values['environmentIntensity'] = kf.environmentIntensity;
	}

	return values;
}

/** Color field names for keyframe interpolation. */
const COLOR_FIELDS: readonly string[] = [
	'ambientColor',
	'ambientGroundColor',
	'sunColor',
	'moonColor',
	'clearColor',
	'fogColor',
];

/** Numeric field names for keyframe interpolation. */
const NUM_FIELDS: readonly string[] = [
	'sunIntensity',
	'moonIntensity',
	'fogDensity',
	'environmentIntensity',
];

/**
 * Interpolates values between two keyframes.
 *
 * Only fields present in BOTH keyframes are interpolated.
 *
 * @param before - Keyframe before current time.
 * @param after - Keyframe after current time.
 * @param t - Interpolation factor [0, 1].
 * @returns Interpolated values.
 */
function interpolateValues(before: TimeKeyframe, after: TimeKeyframe, t: Num): InterpolatedValues {
	const result: Record<string, ColorRgba | Num> = {};
	const beforeRecord = before as unknown as Record<string, ColorRgba | Num | undefined>;
	const afterRecord = after as unknown as Record<string, ColorRgba | Num | undefined>;

	// Interpolate color fields
	for (const field of COLOR_FIELDS) {
		const bVal: ColorRgba | Num | undefined = beforeRecord[field];
		const aVal: ColorRgba | Num | undefined = afterRecord[field];
		if (bVal !== undefined && aVal !== undefined) {
			result[field] = lerpColor(bVal as ColorRgba, aVal as ColorRgba, t);
		}
	}

	// Interpolate numeric fields
	for (const field of NUM_FIELDS) {
		const bVal: ColorRgba | Num | undefined = beforeRecord[field];
		const aVal: ColorRgba | Num | undefined = afterRecord[field];
		if (bVal !== undefined && aVal !== undefined) {
			result[field] = lerpNum(bVal as Num, aVal as Num, t);
		}
	}

	return result;
}

// =============================================================================
// Pure Math — computeSunDirection
// =============================================================================

/**
 * Computes sun direction vector from time of day and sun path config.
 *
 * Uses a sinusoidal elevation arc and linear azimuth sweep.
 * Returns `{0, 0, 0}` when the sun is below the horizon (before sunrise or after sunset).
 *
 * @param time - Current time of day [0, 24).
 * @param sunPath - Sun path configuration (sunrise, sunset, elevation, azimuth).
 * @returns Result containing the computed direction vector.
 */
// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns -- false positive: @param and @returns are present above
export function computeSunDirection(time: Num, sunPath: SunPathConfig): Result<Vector3> {
	const { sunrise, sunset, maxElevation, azimuthStart } = sunPath;

	// Sun below horizon
	if (time <= sunrise || time >= sunset) {
		return okUnchecked({ x: 0, y: 0, z: 0 });
	}

	const progress: number = (time - sunrise) / (sunset - sunrise);
	const elevationRad: number = Math.sin(progress * Math.PI) * maxElevation * (Math.PI / 180);
	const azimuthRad: number = (azimuthStart + 180 * progress) * (Math.PI / 180);

	// Direction points FROM sun TO origin (light direction in Babylon.js)
	const x: number = -Math.cos(azimuthRad) * Math.cos(elevationRad);
	const y: number = -Math.sin(elevationRad);
	const z: number = -Math.sin(azimuthRad) * Math.cos(elevationRad);

	return okUnchecked({ x, y, z });
}

// =============================================================================
// Babylon.js Integration — createDayNightCycle
// =============================================================================

/** Options for creating a day/night cycle. */
type CreateDayNightCycleOptions = {
	readonly scene: BABYLON.Scene;
	readonly config: Partial<DayNightCycleConfig>;
	readonly managedLights: readonly ManagedLight[];
};

/**
 * Creates a day/night cycle with per-frame time advancement and keyframe interpolation.
 *
 * Registers a `scene.onBeforeRenderObservable` observer that advances time,
 * interpolates keyframes, computes sun direction, and applies values to
 * scene and lights.
 *
 * @param options - Scene, cycle config, and managed lights for ID resolution.
 * @returns BabylonResult containing the cycle instance.
 * @example
 * ```typescript
 * const result = createDayNightCycle({ scene, config, managedLights });
 * ```
 */
export function createDayNightCycle(
	options: CreateDayNightCycleOptions,
): BabylonResult<DayNightCycleInstance> {
	try {
		const { scene, config, managedLights } = options;

		// Resolve light references by ID
		const sunLight: BABYLON.DirectionalLight | null = resolveDirectionalLight(
			config.sunLightId,
			managedLights,
		);
		const ambientLight: BABYLON.HemisphericLight | null = resolveHemisphericLight(
			config.ambientLightId,
			managedLights,
		);
		const moonLight: BABYLON.Light | null = resolveLight(config.moonLightId, managedLights);

		// Use provided keyframes or default
		const keyframes: readonly TimeKeyframe[] = config.keyframes ?? DEFAULT_DAY_CYCLE_KEYFRAMES;

		const speed: number = config.speed ?? 0;
		const sunPathConfig: SunPathConfig = config.sunPath ?? {
			sunrise: 6,
			sunset: 18,
			maxElevation: 75,
			azimuthStart: 90,
		};

		let timeOfDay: number = config.timeOfDay ?? 12;

		const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
			const dt: number = scene.getEngine().getDeltaTime() / 1000;

			// Advance time
			if (speed > 0) {
				timeOfDay = (timeOfDay + dt * speed) % 24;
				cycleInstance.timeOfDay = timeOfDay;
			}

			// Interpolate keyframes
			const interpResult: Result<InterpolatedValues> = interpolateKeyframes(keyframes, timeOfDay);
			if (!interpResult.ok) return;

			// Apply interpolated values
			applyInterpolatedValues(scene, interpResult.data, sunLight, ambientLight, moonLight);

			// Compute and apply sun direction
			if (sunLight !== null) {
				const dirResult: Result<Vector3> = computeSunDirection(timeOfDay, sunPathConfig);
				if (dirResult.ok) {
					const dir: Vector3 = dirResult.data;
					// Only update direction when sun is above horizon
					if (dir.x !== 0 || dir.y !== 0 || dir.z !== 0) {
						sunLight.direction = new BABYLON.Vector3(dir.x, dir.y, dir.z);
					}
				}
			}
		});

		const cycleInstance: DayNightCycleInstance = {
			observer,
			config,
			keyframes,
			scene,
			sunLight,
			ambientLight,
			moonLight,
			timeOfDay,
		};

		return okShallow(cycleInstance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Light Resolution Helpers
// =============================================================================

/**
 * Resolves a DirectionalLight from managed lights by ID.
 *
 * @param lightId - Light ID to find.
 * @param managedLights - Array of managed lights.
 * @returns The DirectionalLight or null if not found or wrong type.
 */
function resolveDirectionalLight(
	lightId: string | undefined,
	managedLights: readonly ManagedLight[],
): BABYLON.DirectionalLight | null {
	if (lightId === undefined) return null;
	const managed: ManagedLight | undefined = managedLights.find(
		(m: ManagedLight) => m.config.id === lightId,
	);
	if (managed === undefined) return null;
	if (managed.light instanceof BABYLON.DirectionalLight) return managed.light;
	return null;
}

/**
 * Resolves a HemisphericLight from managed lights by ID.
 *
 * @param lightId - Light ID to find.
 * @param managedLights - Array of managed lights.
 * @returns The HemisphericLight or null if not found or wrong type.
 */
function resolveHemisphericLight(
	lightId: string | undefined,
	managedLights: readonly ManagedLight[],
): BABYLON.HemisphericLight | null {
	if (lightId === undefined) return null;
	const managed: ManagedLight | undefined = managedLights.find(
		(m: ManagedLight) => m.config.id === lightId,
	);
	if (managed === undefined) return null;
	if (managed.light instanceof BABYLON.HemisphericLight) return managed.light;
	return null;
}

/**
 * Resolves any light from managed lights by ID.
 *
 * @param lightId - Light ID to find.
 * @param managedLights - Array of managed lights.
 * @returns The light or null if not found.
 */
function resolveLight(
	lightId: string | undefined,
	managedLights: readonly ManagedLight[],
): BABYLON.Light | null {
	if (lightId === undefined) return null;
	const managed: ManagedLight | undefined = managedLights.find(
		(m: ManagedLight) => m.config.id === lightId,
	);
	if (managed === undefined) return null;
	return managed.light;
}

// =============================================================================
// Apply Values
// =============================================================================

/**
 * Applies interpolated values to scene, lights, and fog.
 *
 * @param scene - The Babylon.js scene.
 * @param values - Interpolated values from keyframes.
 * @param sunLight - The sun DirectionalLight (or null).
 * @param ambientLight - The ambient HemisphericLight (or null).
 * @param moonLight - The moon light (or null).
 */
function applyInterpolatedValues(
	scene: BABYLON.Scene,
	values: InterpolatedValues,
	sunLight: BABYLON.DirectionalLight | null,
	ambientLight: BABYLON.HemisphericLight | null,
	moonLight: BABYLON.Light | null,
): void {
	// Scene clear color
	if (values.clearColor !== undefined) {
		scene.clearColor = new BABYLON.Color4(
			values.clearColor.r,
			values.clearColor.g,
			values.clearColor.b,
			values.clearColor.a,
		);
	}

	// Fog
	if (values.fogColor !== undefined) {
		scene.fogColor = new BABYLON.Color3(values.fogColor.r, values.fogColor.g, values.fogColor.b);
	}
	if (values.fogDensity !== undefined) {
		scene.fogDensity = values.fogDensity;
	}

	// Environment intensity
	if (values.environmentIntensity !== undefined) {
		scene.environmentIntensity = values.environmentIntensity;
	}

	// Ambient light
	if (ambientLight !== null) {
		if (values.ambientColor !== undefined) {
			ambientLight.diffuse = new BABYLON.Color3(
				values.ambientColor.r,
				values.ambientColor.g,
				values.ambientColor.b,
			);
		}
		if (values.ambientGroundColor !== undefined) {
			ambientLight.groundColor = new BABYLON.Color3(
				values.ambientGroundColor.r,
				values.ambientGroundColor.g,
				values.ambientGroundColor.b,
			);
		}
	}

	// Sun light
	if (sunLight !== null) {
		if (values.sunColor !== undefined) {
			sunLight.diffuse = new BABYLON.Color3(
				values.sunColor.r,
				values.sunColor.g,
				values.sunColor.b,
			);
		}
		if (values.sunIntensity !== undefined) {
			sunLight.intensity = values.sunIntensity;
		}
	}

	// Moon light
	if (moonLight !== null) {
		if (values.moonColor !== undefined) {
			moonLight.diffuse = new BABYLON.Color3(
				values.moonColor.r,
				values.moonColor.g,
				values.moonColor.b,
			);
		}
		if (values.moonIntensity !== undefined) {
			moonLight.intensity = values.moonIntensity;
		}
	}
}

// =============================================================================
// Time Control
// =============================================================================

/**
 * Instantly sets the time of day on a cycle instance.
 *
 * @param instance - The cycle instance.
 * @param time - New time of day [0, 24).
 * @returns Result indicating success.
 */
// eslint-disable-next-line jsdoc/require-returns -- false positive: @returns is present above
export function setTimeOfDay(instance: DayNightCycleInstance, time: Num): Result<Bool> {
	instance.timeOfDay = time % 24;
	return okUnchecked(true);
}

/**
 * Gets the current time of day from a cycle instance.
 *
 * @param instance - The cycle instance.
 * @returns Result containing the current time of day.
 */
export function getTimeOfDay(instance: DayNightCycleInstance): Result<Num> {
	return okUnchecked(instance.timeOfDay);
}

// =============================================================================
// Dispose
// =============================================================================

/** Options for disposing a day/night cycle. */
type DisposeDayNightCycleOptions = {
	readonly cycle: DayNightCycleInstance;
	readonly scene: BABYLON.Scene;
};

/**
 * Disposes a day/night cycle and removes its observer.
 *
 * @param options - The cycle instance and scene.
 * @returns BabylonResult indicating success.
 */
export function disposeDayNightCycle(options: DisposeDayNightCycleOptions): BabylonResult<Bool> {
	try {
		options.scene.onBeforeRenderObservable.remove(options.cycle.observer);
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}
