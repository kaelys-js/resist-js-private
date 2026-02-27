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
	speed: Num;
	enabled: Bool;
	/** Callback fired when the sun crosses above the horizon. */
	onSunrise?: () => void;
	/** Callback fired when the sun crosses below the horizon. */
	onSunset?: () => void;
	/** Callback fired when the integer hour changes. */
	onHourChange?: (hour: Num) => void;
	/** Callback fired when the time phase changes. */
	onPhaseChange?: (phase: string) => void;
	/** Tracks previous time for callback edge detection. */
	_previousTime: Num;
	/** Tracks previous phase for phase change detection. */
	_previousPhase: string;
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
	readonly exposure?: Num;
	readonly bloomWeight?: Num;
	readonly contrast?: Num;
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
		exposure: 0.3,
		bloomWeight: 0.15,
		contrast: 0.8,
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
		exposure: 0.8,
		bloomWeight: 0.5,
		contrast: 0.9,
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
		exposure: 1.2,
		bloomWeight: 0.4,
		contrast: 1.0,
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
		exposure: 1.5,
		bloomWeight: 0.3,
		contrast: 1.1,
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
		exposure: 1.6,
		bloomWeight: 0.25,
		contrast: 1.15,
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
		exposure: 1.4,
		bloomWeight: 0.35,
		contrast: 1.1,
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
		exposure: 1.0,
		bloomWeight: 0.6,
		contrast: 0.95,
	},
	{
		time: 20,
		ambientColor: { r: 0.1, g: 0.08, b: 0.15, a: 1 },
		ambientGroundColor: { r: 0.04, g: 0.03, b: 0.06, a: 1 },
		moonIntensity: 0.2,
		clearColor: { r: 0.08, g: 0.06, b: 0.15, a: 1 },
		fogColor: { r: 0.1, g: 0.08, b: 0.12, a: 1 },
		environmentIntensity: 0.05,
		exposure: 0.5,
		bloomWeight: 0.3,
		contrast: 0.85,
	},
	{
		time: 22,
		ambientColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
		ambientGroundColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
		moonIntensity: 0.3,
		clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
		fogColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
		environmentIntensity: 0.02,
		exposure: 0.3,
		bloomWeight: 0.15,
		contrast: 0.8,
	},
];

// =============================================================================
// Season Sun Path
// =============================================================================

/** Sun path overrides per season. */
const SEASON_SUN_PATHS: Readonly<Record<string, SunPathConfig>> = {
	spring: { sunrise: 6, sunset: 19, maxElevation: 65, azimuthStart: 90 },
	summer: { sunrise: 5, sunset: 21, maxElevation: 75, azimuthStart: 90 },
	autumn: { sunrise: 6.5, sunset: 17.5, maxElevation: 55, azimuthStart: 90 },
	winter: { sunrise: 7.5, sunset: 16.5, maxElevation: 35, azimuthStart: 90 },
};

/**
 * Returns sun path parameters for a given season.
 *
 * @param season - The season name.
 * @returns Result containing the season's sun path config.
 *
 * @example
 * ```typescript
 * const result = getSeasonSunPath('winter');
 * if (!result.ok) return result;
 * // result.data.sunrise === 7.5, sunset === 16.5
 * ```
 */
export function getSeasonSunPath(season: string): Result<SunPathConfig> {
	const path: SunPathConfig | undefined = SEASON_SUN_PATHS[season];
	if (path === undefined) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Unknown season: ${season}`);
	}
	return okUnchecked(path);
}

// =============================================================================
// Moon Phase
// =============================================================================

/** Moon phase info returned by {@link getMoonPhaseInfo}. */
export type MoonPhaseInfo = {
	readonly phase: Num;
	readonly name: string;
	readonly intensityMultiplier: Num;
};

/** Moon phase lookup table: [name, intensityMultiplier]. */
const MOON_PHASES: ReadonlyArray<readonly [string, Num]> = [
	['New Moon', 0 as Num],
	['Waxing Crescent', 0.15 as Num],
	['First Quarter', 0.35 as Num],
	['Waxing Gibbous', 0.7 as Num],
	['Full Moon', 1.0 as Num],
	['Waning Gibbous', 0.7 as Num],
	['Last Quarter', 0.35 as Num],
	['Waning Crescent', 0.15 as Num],
];

/**
 * Returns moon phase info (name and intensity multiplier) for a phase value.
 *
 * @param phase - Moon phase [0–7].
 * @returns Result containing moon phase info.
 *
 * @example
 * ```typescript
 * const result = getMoonPhaseInfo(4); // Full Moon
 * if (!result.ok) return result;
 * // result.data.intensityMultiplier === 1.0
 * ```
 */
export function getMoonPhaseInfo(phase: number): Result<MoonPhaseInfo> {
	const entry: readonly [string, Num] | undefined = MOON_PHASES[phase];
	if (entry === undefined) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Invalid moon phase: ${phase}`);
	}
	const [name, intensityMultiplier]: readonly [string, Num] = entry;
	return okUnchecked({ phase: phase as Num, name, intensityMultiplier });
}

// =============================================================================
// Transition Easing
// =============================================================================

/**
 * Applies an easing curve to an interpolation factor.
 *
 * @param t - Input factor [0, 1].
 * @param easing - Easing type: linear, smooth, easeIn, easeOut.
 * @returns Result containing eased factor [0, 1].
 *
 * @example
 * ```typescript
 * const result = applyEasing(0.5, 'smooth');
 * if (!result.ok) return result;
 * // result.data ≈ 0.5 (smoothstep is symmetric)
 * ```
 */
export function applyEasing(t: number, easing: string): Result<Num> {
	switch (easing) {
		case 'linear': {
			return okUnchecked(t as Num);
		}
		case 'smooth': {
			// Hermite smoothstep: 3t² - 2t³
			return okUnchecked((t * t * (3 - 2 * t)) as Num);
		}
		case 'easeIn': {
			// Quadratic ease-in: t²
			return okUnchecked((t * t) as Num);
		}
		case 'easeOut': {
			// Quadratic ease-out: 1 - (1-t)²
			return okUnchecked((1 - (1 - t) * (1 - t)) as Num);
		}
		default: {
			return okUnchecked(t as Num);
		}
	}
}

// =============================================================================
// Time Phase Detection
// =============================================================================

/**
 * Computes the current time phase from time of day and sun path.
 *
 * Phase boundaries are derived from sunrise/sunset, not hardcoded hours.
 * Seasons shift the boundaries automatically.
 *
 * @param time - Current time [0, 24).
 * @param sunPath - Sun path config with sunrise/sunset.
 * @returns Result containing the time phase name.
 *
 * @example
 * ```typescript
 * const result = computeTimePhase(12, { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 });
 * if (!result.ok) return result;
 * // result.data === 'noon'
 * ```
 */
// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns -- false positive: @param and @returns are present above
export function computeTimePhase(time: Num, sunPath: SunPathConfig): Result<string> {
	const { sunrise, sunset } = sunPath;
	const dawnStart: number = sunrise - 1;
	const morningStart: number = sunrise + 0.5;
	const noonStart: number = (sunrise + sunset) / 2 - 1;
	const noonEnd: number = (sunrise + sunset) / 2 + 1;
	const duskStart: number = sunset - 1;
	const twilightStart: number = sunset;
	const nightStart: number = sunset + 1.5;
	const midnightStart: number = sunset + 4;

	if (time >= midnightStart || time < dawnStart) return okUnchecked('midnight');
	if (time >= dawnStart && time < morningStart) return okUnchecked('dawn');
	if (time >= morningStart && time < noonStart) return okUnchecked('morning');
	if (time >= noonStart && time < noonEnd) return okUnchecked('noon');
	if (time >= noonEnd && time < duskStart) return okUnchecked('afternoon');
	if (time >= duskStart && time < twilightStart) return okUnchecked('dusk');
	if (time >= twilightStart && time < nightStart) return okUnchecked('twilight');
	if (time >= nightStart && time < midnightStart) return okUnchecked('night');
	return okUnchecked('midnight');
}

// =============================================================================
// Indoor Mode
// =============================================================================

/**
 * Returns visual override values for indoor/cave modes, or null for outdoor.
 *
 * Indoor: warm ambient, no sun/moon. Cave: dark blue, minimal light.
 *
 * @param mode - Indoor mode: outdoor, indoor, cave.
 * @returns Result containing override values or null for outdoor.
 *
 * @example
 * ```typescript
 * const result = getIndoorTint('indoor');
 * if (!result.ok) return result;
 * // result.data has warm amber ambient tint
 * ```
 */
export function getIndoorTint(mode: string): Result<InterpolatedValues | null> {
	switch (mode) {
		case 'outdoor': {
			return okUnchecked(null);
		}
		case 'indoor': {
			return okUnchecked({
				ambientColor: { r: 0.45, g: 0.35, b: 0.25, a: 1 },
				ambientGroundColor: { r: 0.2, g: 0.15, b: 0.1, a: 1 },
				sunIntensity: 0 as Num,
				moonIntensity: 0 as Num,
				environmentIntensity: 0.15 as Num,
				clearColor: { r: 0.15, g: 0.12, b: 0.1, a: 1 },
			});
		}
		case 'cave': {
			return okUnchecked({
				ambientColor: { r: 0.05, g: 0.05, b: 0.12, a: 1 },
				ambientGroundColor: { r: 0.02, g: 0.02, b: 0.06, a: 1 },
				sunIntensity: 0 as Num,
				moonIntensity: 0 as Num,
				environmentIntensity: 0.02 as Num,
				clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
			});
		}
		default: {
			return okUnchecked(null);
		}
	}
}

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
 * @param [easing] - Optional easing curve name.
 * @param [moonPhase] - Optional moon phase [0–7] for intensity scaling.
 * @returns Result containing interpolated values.
 */
/* eslint-disable jsdoc/require-param, jsdoc/require-returns -- false positive: optional @param and @returns tags present above */
export function interpolateKeyframes(
	keyframes: readonly TimeKeyframe[],
	time: Num,
	easing?: string,
	moonPhase?: number,
): Result<InterpolatedValues> {
	/* eslint-enable jsdoc/require-param, jsdoc/require-returns */
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

	// Apply easing curve
	let easedT: Num = t as Num;
	if (easing !== undefined && easing !== 'linear') {
		const easingResult: Result<Num> = applyEasing(t, easing);
		if (easingResult.ok) easedT = easingResult.data;
	}

	const values: InterpolatedValues = interpolateValues(before, after, easedT);

	// Apply moon phase multiplier to moonIntensity
	if (moonPhase !== undefined && values.moonIntensity !== undefined) {
		const phaseInfo: Result<MoonPhaseInfo> = getMoonPhaseInfo(moonPhase);
		if (phaseInfo.ok) {
			(values as Record<string, unknown>)['moonIntensity'] = (values.moonIntensity *
				phaseInfo.data.intensityMultiplier) as Num;
		}
	}

	return okUnchecked(values);
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
	if (kf.exposure !== undefined) values['exposure'] = kf.exposure;
	if (kf.bloomWeight !== undefined) values['bloomWeight'] = kf.bloomWeight;
	if (kf.contrast !== undefined) values['contrast'] = kf.contrast;

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
	'exposure',
	'bloomWeight',
	'contrast',
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

		const initialSpeed: Num = (config.speed ?? 0) as Num;
		const defaultSunPath: SunPathConfig = {
			sunrise: 6,
			sunset: 18,
			maxElevation: 75,
			azimuthStart: 90,
		};

		/**
		 * Resolves the effective sun path: explicit config > season override > default.
		 *
		 * @returns The effective sun path for the current season/config.
		 */
		const resolveEffectiveSunPath = (): SunPathConfig => {
			if (config.sunPath) return config.sunPath;
			const season: string | undefined = config.season as string | undefined;
			if (season) {
				const seasonResult: Result<SunPathConfig> = getSeasonSunPath(season);
				if (seasonResult.ok) return seasonResult.data;
			}
			return defaultSunPath;
		};

		const initialTime: Num = (config.timeOfDay ?? 12) as Num;

		// Build instance first so the observer reads mutable state from it
		// (observer is assigned immediately after via onBeforeRenderObservable.add)
		// Compute initial phase
		const initialSunPath: SunPathConfig = resolveEffectiveSunPath();
		const initialPhaseResult: Result<string> = computeTimePhase(initialTime, initialSunPath);
		const initialPhase: string = initialPhaseResult.ok ? initialPhaseResult.data : 'noon';

		const cycleInstance: DayNightCycleInstance = {
			observer: null as unknown as BABYLON.Observer<BABYLON.Scene>,
			config,
			keyframes,
			scene,
			sunLight,
			ambientLight,
			moonLight,
			timeOfDay: initialTime,
			speed: initialSpeed,
			enabled: true as Bool,
			_previousTime: initialTime,
			_previousPhase: initialPhase,
		};

		const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
			if (!cycleInstance.enabled) return;

			const dt: number = scene.getEngine().getDeltaTime() / 1000;
			const prevTime: Num = cycleInstance.timeOfDay;

			// Advance time — reads speed and timeOfDay from instance so external
			// callers (setTimeOfDay, setSpeed) take effect immediately.
			if (cycleInstance.speed > 0) {
				cycleInstance.timeOfDay = ((cycleInstance.timeOfDay + dt * cycleInstance.speed) %
					24) as Num;
			}

			// Get easing and moon phase from config
			const easingType: string = (config.transitionEasing as string | undefined) ?? 'linear';
			const moonPhaseVal: number | undefined = config.moonPhase as number | undefined;

			// Check indoor mode — if indoor/cave, apply fixed tint instead of interpolation
			const indoorMode: string = (config.indoorMode as string | undefined) ?? 'outdoor';
			const indoorTintResult: Result<InterpolatedValues | null> = getIndoorTint(indoorMode);
			if (indoorTintResult.ok && indoorTintResult.data !== null) {
				applyInterpolatedValues(scene, indoorTintResult.data, sunLight, ambientLight, moonLight);
				fireCallbacks(cycleInstance, prevTime);
				return;
			}

			// Interpolate keyframes with easing and moon phase
			const interpResult: Result<InterpolatedValues> = interpolateKeyframes(
				keyframes,
				cycleInstance.timeOfDay,
				easingType,
				moonPhaseVal,
			);
			if (!interpResult.ok) return;

			// Apply interpolated values
			applyInterpolatedValues(scene, interpResult.data, sunLight, ambientLight, moonLight);

			// Fire event callbacks
			fireCallbacks(cycleInstance, prevTime);

			// Compute and apply sun direction using season-aware sun path
			if (sunLight !== null) {
				const effectiveSunPath: SunPathConfig = resolveEffectiveSunPath();
				const dirResult: Result<Vector3> = computeSunDirection(
					cycleInstance.timeOfDay,
					effectiveSunPath,
				);
				if (dirResult.ok) {
					const dir: Vector3 = dirResult.data;
					// Only update direction when sun is above horizon
					if (dir.x !== 0 || dir.y !== 0 || dir.z !== 0) {
						sunLight.direction = new BABYLON.Vector3(dir.x, dir.y, dir.z);
					}
				}
			}
		});

		// Assign the real observer now that it's created
		(cycleInstance as { observer: BABYLON.Observer<BABYLON.Scene> }).observer = observer;

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

/**
 * Sets the cycle speed (game-hours per second).
 *
 * @param instance - The cycle instance.
 * @param speed - New speed [0, 100].
 * @returns Result indicating success.
 */
export function setSpeed(instance: DayNightCycleInstance, speed: Num): Result<Bool> {
	instance.speed = Math.max(0, Math.min(100, speed)) as Num;
	return okUnchecked(true);
}

/**
 * Gets the current cycle speed.
 *
 * @param instance - The cycle instance.
 * @returns Result containing current speed.
 */
export function getSpeed(instance: DayNightCycleInstance): Result<Num> {
	return okUnchecked(instance.speed);
}

/**
 * Enables or disables the cycle observer.
 *
 * @param instance - The cycle instance.
 * @param enabled - Whether the cycle should run.
 * @returns Result indicating success.
 */
export function setEnabled(instance: DayNightCycleInstance, enabled: Bool): Result<Bool> {
	instance.enabled = enabled;
	return okUnchecked(true);
}

/**
 * Checks whether the cycle is enabled.
 *
 * @param instance - The cycle instance.
 * @returns Result containing enabled state.
 */
export function isEnabled(instance: DayNightCycleInstance): Result<Bool> {
	return okUnchecked(instance.enabled);
}

// =============================================================================
// Runtime Convenience API
// =============================================================================

/**
 * Jumps the cycle to a specific time.
 *
 * @param instance - The cycle instance.
 * @param time - Target time [0, 24).
 * @returns Result indicating success.
 */
// eslint-disable-next-line jsdoc/require-returns -- @returns tag present above
export function jumpToTime(instance: DayNightCycleInstance, time: Num): Result<Bool> {
	if (time < 0 || time >= 24) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Time must be in [0, 24), got ${String(time)}`);
	}
	instance.timeOfDay = time;
	return okUnchecked(true as Bool);
}

/**
 * Returns the current time phase for the instance.
 *
 * @param instance - The cycle instance.
 * @returns Result containing the current phase string.
 */
export function getCurrentPhase(instance: DayNightCycleInstance): Result<string> {
	const sunPath: SunPathConfig = (instance.config.sunPath as SunPathConfig | undefined) ?? {
		sunrise: 6,
		sunset: 18,
		maxElevation: 75,
		azimuthStart: 90,
	};
	return computeTimePhase(instance.timeOfDay, sunPath);
}

const VALID_SEASONS: ReadonlySet<string> = new Set(['spring', 'summer', 'autumn', 'winter']);

/**
 * Changes the season on the cycle config at runtime.
 *
 * @param instance - The cycle instance.
 * @param season - Season name (spring, summer, autumn, winter).
 * @returns Result indicating success.
 */
export function setSeason(instance: DayNightCycleInstance, season: string): Result<Bool> {
	if (!VALID_SEASONS.has(season)) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Unknown season: ${season}`);
	}
	(instance.config as Record<string, unknown>)['season'] = season;
	return okUnchecked(true as Bool);
}

/**
 * Gets the current season from the cycle config.
 *
 * @param instance - The cycle instance.
 * @returns Result containing the current season string.
 */
export function getSeason(instance: DayNightCycleInstance): Result<string> {
	const season: string = (instance.config.season as string | undefined) ?? 'summer';
	return okUnchecked(season);
}

const VALID_INDOOR_MODES: ReadonlySet<string> = new Set(['outdoor', 'indoor', 'cave']);

/**
 * Changes the indoor mode on the cycle config at runtime.
 *
 * @param instance - The cycle instance.
 * @param mode - Indoor mode (outdoor, indoor, cave).
 * @returns Result indicating success.
 */
export function setIndoorMode(instance: DayNightCycleInstance, mode: string): Result<Bool> {
	if (!VALID_INDOOR_MODES.has(mode)) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Unknown indoor mode: ${mode}`);
	}
	(instance.config as Record<string, unknown>)['indoorMode'] = mode;
	return okUnchecked(true as Bool);
}

/**
 * Gets the current indoor mode from the cycle config.
 *
 * @param instance - The cycle instance.
 * @returns Result containing the current indoor mode string.
 */
export function getIndoorMode(instance: DayNightCycleInstance): Result<string> {
	const mode: string = (instance.config.indoorMode as string | undefined) ?? 'outdoor';
	return okUnchecked(mode);
}

// =============================================================================
// Event Callbacks
// =============================================================================

/**
 * Fires event callbacks by comparing previous time to current time.
 *
 * Detects sunrise/sunset crossings, integer hour changes, and phase transitions.
 *
 * @param instance - The cycle instance with callback slots.
 * @param previousTime - The time before the latest update.
 */
export function fireCallbacks(instance: DayNightCycleInstance, previousTime: Num): void {
	const currentTime: Num = instance.timeOfDay;
	const sunPath: SunPathConfig = (instance.config.sunPath as SunPathConfig | undefined) ?? {
		sunrise: 6,
		sunset: 18,
		maxElevation: 75,
		azimuthStart: 90,
	};

	// Sunrise: previousTime < sunrise <= currentTime
	if (
		instance.onSunrise !== undefined &&
		previousTime < sunPath.sunrise &&
		currentTime >= sunPath.sunrise
	) {
		instance.onSunrise();
	}

	// Sunset: previousTime < sunset <= currentTime
	if (
		instance.onSunset !== undefined &&
		previousTime < sunPath.sunset &&
		currentTime >= sunPath.sunset
	) {
		instance.onSunset();
	}

	// Hour change: floor(previous) !== floor(current)
	if (instance.onHourChange !== undefined) {
		const prevHour: number = Math.floor(previousTime);
		const currHour: number = Math.floor(currentTime);
		if (prevHour !== currHour) {
			instance.onHourChange(currHour as Num);
		}
	}

	// Phase change
	if (instance.onPhaseChange !== undefined) {
		const phaseResult: Result<string> = computeTimePhase(currentTime, sunPath);
		if (phaseResult.ok && phaseResult.data !== instance._previousPhase) {
			instance._previousPhase = phaseResult.data;
			instance.onPhaseChange(phaseResult.data);
		}
	}
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
