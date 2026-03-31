# Day/Night Cycle Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the day/night cycle from a basic 9-keyframe interpolator to a full time-of-day engine with seasons, moon phases, indoor/outdoor modes, easing curves, post-FX coupling, event callbacks, and 12 time presets.

**Architecture:** Pure math functions (seasons, moon phase, easing, phase detection) are added alongside the existing `interpolateKeyframes`/`computeSunDirection`. The `DayNightCycleInstance` gains mutable fields for season, moonPhase, indoorMode, and callback slots. The per-frame observer applies moon phase multiplier, indoor mode overrides, and fires event callbacks. New API functions expose all state changes as `Result<T>`.

**Tech Stack:** TypeScript, Valibot schemas, Babylon.js (NullEngine for tests), Vitest, pnpm

---

## Key References

| File | Purpose | Key Lines |
|------|---------|-----------|
| `runtime/src/schemas/lighting-config.ts` | Schemas: TimeKeyframe (604–628), SunPathConfig (649–658), DayNightCycleConfig (682–699) | Schema additions go here |
| `runtime/src/rendering/day-night-cycle.ts` | Engine: types (40–64), defaults (75–164), interpolation (211–261), sun path (357–375), create (402–489), time control (656–669), dispose (687–694) | All new logic goes here |
| `runtime/src/rendering/day-night-cycle.test.ts` | Tests: 23 tests across 6 describe blocks (383 lines) | New tests added here |
| `runtime/src/index.ts` | Exports: day/night at lines 285–296 | New exports added here |
| `runtime/dev/dev.ts` | Dev harness: day/night section at lines 430–515 | New controls added here |
| `runtime/dev/index.html` | HTML: day/night section at lines 440–458 | New UI elements here |

### Import Pattern (all files)

```typescript
import * as v from 'valibot';
import type { Bool, Num, Str } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
```

### Test Pattern (all test files)

```typescript
expect(result.ok).toBeTruthy();
if (!result.ok) return;
// then assert on result.data
```

### QA Commands (run after every file edit)

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

### Test Command

```bash
cd packages/products/webforge/runtime && pnpm qa:test
```

---

## Task 1: Schema — Season, Moon Phase, Indoor Mode, Easing Enums + Config Fields

**Files:**
- Modify: `packages/products/webforge/runtime/src/schemas/lighting-config.ts:682-699`

**Step 1: Add new picklist schemas and config fields**

Before `DayNightCycleConfigSchema` (after line 661), add:

```typescript
/** Season preset affecting sun path parameters. */
export const SeasonSchema = v.picklist(['spring', 'summer', 'autumn', 'winter']);

/** Inferred season type. */
export type Season = v.InferOutput<typeof SeasonSchema>;

/** Moon phase [0=new, 4=full, 7=waning crescent]. */
export const MoonPhaseSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(7));

/** Indoor/outdoor mode controlling cycle visual application. */
export const IndoorModeSchema = v.picklist(['outdoor', 'indoor', 'cave']);

/** Inferred indoor mode type. */
export type IndoorMode = v.InferOutput<typeof IndoorModeSchema>;

/** Transition easing for keyframe interpolation. */
export const TransitionEasingSchema = v.picklist(['linear', 'smooth', 'easeIn', 'easeOut']);

/** Inferred transition easing type. */
export type TransitionEasing = v.InferOutput<typeof TransitionEasingSchema>;

/** Time-of-day phase names (auto-computed from sun path). */
export const TimePhaseSchema = v.picklist([
	'dawn', 'morning', 'noon', 'afternoon', 'dusk', 'twilight', 'night', 'midnight',
]);

/** Inferred time phase type. */
export type TimePhase = v.InferOutput<typeof TimePhaseSchema>;
```

Then add to `DayNightCycleConfigSchema` (inside the strictObject, after `keyframes`):

```typescript
	/** Season preset. Default: summer. */
	season: v.optional(SeasonSchema, 'summer'),
	/** Moon phase [0–7]. Default: 4 (full moon). */
	moonPhase: v.optional(MoonPhaseSchema, 4),
	/** Indoor/outdoor mode. Default: outdoor. */
	indoorMode: v.optional(IndoorModeSchema, 'outdoor'),
	/** Keyframe interpolation easing. Default: linear. */
	transitionEasing: v.optional(TransitionEasingSchema, 'linear'),
```

**Step 2: Add post-FX fields to TimeKeyframeSchema**

Add after `environmentIntensity` in `TimeKeyframeSchema` (line 627):

```typescript
	/** Auto-exposure shift [0, 4]. */
	exposure: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(4))),
	/** Bloom weight shift [0, 2]. */
	bloomWeight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2))),
	/** Contrast shift [0, 2]. */
	contrast: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2))),
```

**Step 3: Run QA**

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

**Step 4: Commit**

```bash
git add packages/products/webforge/runtime/src/schemas/lighting-config.ts
git commit -m "feat(schema): add season, moon phase, indoor mode, easing, post-FX keyframe fields"
```

---

## Task 2: Tests — Season Sun Path Overrides (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for season system**

Add new describe block after `DEFAULT_DAY_CYCLE_KEYFRAMES` tests (after line 382):

```typescript
// =============================================================================
// Season Sun Path — pure math
// =============================================================================

describe('getSeasonSunPath', () => {
	test('summer has earliest sunrise and latest sunset', () => {
		const result = getSeasonSunPath('summer');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.sunrise).toBe(5);
		expect(result.data.sunset).toBe(21);
		expect(result.data.maxElevation).toBe(75);
	});

	test('winter has latest sunrise and earliest sunset', () => {
		const result = getSeasonSunPath('winter');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.sunrise).toBe(7.5);
		expect(result.data.sunset).toBe(16.5);
		expect(result.data.maxElevation).toBe(35);
	});

	test('spring has moderate day length', () => {
		const result = getSeasonSunPath('spring');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.sunrise).toBe(6);
		expect(result.data.sunset).toBe(19);
		expect(result.data.maxElevation).toBe(65);
	});

	test('autumn has shorter days than spring', () => {
		const result = getSeasonSunPath('autumn');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.sunrise).toBe(6.5);
		expect(result.data.sunset).toBe(17.5);
		expect(result.data.maxElevation).toBe(55);
	});

	test('all seasons return valid SunPathConfig shape', () => {
		for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
			const result = getSeasonSunPath(season);
			expect(result.ok).toBeTruthy();
			if (!result.ok) return;
			expect(result.data.sunrise).toBeGreaterThanOrEqual(0);
			expect(result.data.sunset).toBeLessThanOrEqual(24);
			expect(result.data.sunrise).toBeLessThan(result.data.sunset);
			expect(result.data.maxElevation).toBeGreaterThan(0);
			expect(result.data.maxElevation).toBeLessThanOrEqual(90);
		}
	});
});
```

Update imports at top of file to include `getSeasonSunPath`:

```typescript
import {
	DEFAULT_DAY_CYCLE_KEYFRAMES,
	computeSunDirection,
	createDayNightCycle,
	disposeDayNightCycle,
	getTimeOfDay,
	interpolateKeyframes,
	setTimeOfDay,
	getSeasonSunPath,
} from './day-night-cycle';
```

**Step 2: Run test to verify it fails**

```bash
cd packages/products/webforge/runtime && pnpm qa:test
```

Expected: FAIL — `getSeasonSunPath` is not exported from `./day-night-cycle`

---

## Task 3: Implementation — getSeasonSunPath (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Add season sun path lookup**

After `DEFAULT_DAY_CYCLE_KEYFRAMES` (after line 164), add:

```typescript
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
 */
export function getSeasonSunPath(season: string): Result<SunPathConfig> {
	const path: SunPathConfig | undefined = SEASON_SUN_PATHS[season];
	if (path === undefined) {
		return err(ERRORS.VALIDATION.INVALID_VALUE, `Unknown season: ${season}`);
	}
	return okUnchecked(path);
}
```

**Step 2: Run tests**

```bash
cd packages/products/webforge/runtime && pnpm qa:test
```

Expected: All pass including new season tests.

**Step 3: Run QA**

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

**Step 4: Commit**

```bash
git add packages/products/webforge/runtime/src/rendering/day-night-cycle.ts packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts
git commit -m "feat: add getSeasonSunPath with spring/summer/autumn/winter presets"
```

---

## Task 4: Tests — Moon Phase Intensity (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for moon phase system**

```typescript
// =============================================================================
// Moon Phase — pure math
// =============================================================================

describe('getMoonPhaseInfo', () => {
	test('new moon (0) has zero intensity multiplier', () => {
		const result = getMoonPhaseInfo(0);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('New Moon');
		expect(result.data.intensityMultiplier).toBe(0);
	});

	test('full moon (4) has maximum intensity multiplier', () => {
		const result = getMoonPhaseInfo(4);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('Full Moon');
		expect(result.data.intensityMultiplier).toBe(1.0);
	});

	test('first quarter (2) has 0.35 intensity', () => {
		const result = getMoonPhaseInfo(2);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('First Quarter');
		expect(result.data.intensityMultiplier).toBe(0.35);
	});

	test('waxing gibbous (3) and waning gibbous (5) have same intensity', () => {
		const waxing = getMoonPhaseInfo(3);
		const waning = getMoonPhaseInfo(5);
		expect(waxing.ok).toBeTruthy();
		expect(waning.ok).toBeTruthy();
		if (!waxing.ok || !waning.ok) return;
		expect(waxing.data.intensityMultiplier).toBe(waning.data.intensityMultiplier);
		expect(waxing.data.intensityMultiplier).toBe(0.7);
	});

	test('waning crescent (7) has 0.15 intensity', () => {
		const result = getMoonPhaseInfo(7);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.name).toBe('Waning Crescent');
		expect(result.data.intensityMultiplier).toBe(0.15);
	});

	test('all 8 phases return valid info', () => {
		for (let phase = 0; phase <= 7; phase++) {
			const result = getMoonPhaseInfo(phase);
			expect(result.ok).toBeTruthy();
			if (!result.ok) return;
			expect(result.data.name).toBeTruthy();
			expect(result.data.intensityMultiplier).toBeGreaterThanOrEqual(0);
			expect(result.data.intensityMultiplier).toBeLessThanOrEqual(1);
			expect(result.data.phase).toBe(phase);
		}
	});

	test('invalid phase returns error', () => {
		const result = getMoonPhaseInfo(8);
		expect(result.ok).toBeFalsy();
	});
});
```

Add `getMoonPhaseInfo` to imports.

**Step 2: Run test to verify it fails**

Expected: FAIL — `getMoonPhaseInfo` not exported.

---

## Task 5: Implementation — getMoonPhaseInfo (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Add moon phase types and lookup**

After `getSeasonSunPath`, add:

```typescript
// =============================================================================
// Moon Phase
// =============================================================================

/** Moon phase info returned by getMoonPhaseInfo. */
export type MoonPhaseInfo = {
	readonly phase: Num;
	readonly name: string;
	readonly intensityMultiplier: Num;
};

/** Moon phase lookup table: [name, intensityMultiplier]. */
const MOON_PHASES: readonly (readonly [string, Num])[] = [
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
 */
export function getMoonPhaseInfo(phase: number): Result<MoonPhaseInfo> {
	const entry: readonly [string, Num] | undefined = MOON_PHASES[phase];
	if (entry === undefined) {
		return err(ERRORS.VALIDATION.INVALID_VALUE, `Invalid moon phase: ${phase}`);
	}
	const [name, intensityMultiplier]: readonly [string, Num] = entry;
	return okUnchecked({ phase: phase as Num, name, intensityMultiplier });
}
```

**Step 2: Run tests, QA, commit**

```bash
git commit -m "feat: add getMoonPhaseInfo with 8 lunar phase definitions"
```

---

## Task 6: Tests — Transition Easing (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for easing functions**

```typescript
// =============================================================================
// Transition Easing — pure math
// =============================================================================

describe('applyEasing', () => {
	test('linear easing returns input unchanged', () => {
		const result = applyEasing(0.5, 'linear');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(0.5);
	});

	test('smooth easing at 0 returns 0', () => {
		const result = applyEasing(0, 'smooth');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	test('smooth easing at 1 returns 1', () => {
		const result = applyEasing(1, 'smooth');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe(1);
	});

	test('smooth easing at 0.5 returns 0.5 (symmetric)', () => {
		const result = applyEasing(0.5, 'smooth');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeCloseTo(0.5, 5);
	});

	test('easeIn at 0.5 returns value less than 0.5', () => {
		const result = applyEasing(0.5, 'easeIn');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeLessThan(0.5);
	});

	test('easeOut at 0.5 returns value greater than 0.5', () => {
		const result = applyEasing(0.5, 'easeOut');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeGreaterThan(0.5);
	});

	test('all easings return 0 at t=0 and 1 at t=1', () => {
		for (const easing of ['linear', 'smooth', 'easeIn', 'easeOut'] as const) {
			const at0 = applyEasing(0, easing);
			const at1 = applyEasing(1, easing);
			expect(at0.ok).toBeTruthy();
			expect(at1.ok).toBeTruthy();
			if (!at0.ok || !at1.ok) return;
			expect(at0.data).toBeCloseTo(0, 5);
			expect(at1.data).toBeCloseTo(1, 5);
		}
	});
});
```

Add `applyEasing` to imports.

**Step 2: Verify fails, then implement**

---

## Task 7: Implementation — applyEasing (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Add easing functions**

After moon phase section, add:

```typescript
// =============================================================================
// Transition Easing
// =============================================================================

/**
 * Applies an easing curve to an interpolation factor.
 *
 * @param t - Input factor [0, 1].
 * @param easing - Easing type.
 * @returns Result containing eased factor [0, 1].
 */
export function applyEasing(t: number, easing: string): Result<Num> {
	switch (easing) {
		case 'linear':
			return okUnchecked(t as Num);
		case 'smooth':
			// Hermite smoothstep: 3t² - 2t³
			return okUnchecked((t * t * (3 - 2 * t)) as Num);
		case 'easeIn':
			// Quadratic ease-in: t²
			return okUnchecked((t * t) as Num);
		case 'easeOut':
			// Quadratic ease-out: 1 - (1-t)²
			return okUnchecked((1 - (1 - t) * (1 - t)) as Num);
		default:
			return okUnchecked(t as Num);
	}
}
```

**Step 2: Run tests, QA, commit**

```bash
git commit -m "feat: add applyEasing with linear/smooth/easeIn/easeOut curves"
```

---

## Task 8: Tests — Time Phase Detection (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for phase detection**

```typescript
// =============================================================================
// Time Phase Detection — pure math
// =============================================================================

describe('computeTimePhase', () => {
	const defaultPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 };

	test('midnight (0:00) returns midnight phase', () => {
		const result = computeTimePhase(0, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('midnight');
	});

	test('3:00 AM returns midnight phase', () => {
		const result = computeTimePhase(3, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('midnight');
	});

	test('just before sunrise (5:30) returns dawn', () => {
		const result = computeTimePhase(5.5, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('dawn');
	});

	test('after sunrise (7:00) returns morning', () => {
		const result = computeTimePhase(7, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('morning');
	});

	test('noon (12:00) returns noon', () => {
		const result = computeTimePhase(12, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('noon');
	});

	test('3pm returns afternoon', () => {
		const result = computeTimePhase(15, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('afternoon');
	});

	test('just before sunset returns dusk', () => {
		const result = computeTimePhase(17.5, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('dusk');
	});

	test('after sunset (19:00) returns twilight', () => {
		const result = computeTimePhase(19, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('twilight');
	});

	test('late evening (21:00) returns night', () => {
		const result = computeTimePhase(21, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('night');
	});

	test('winter sunrise shifts dawn later', () => {
		const winterPath = { sunrise: 7.5, sunset: 16.5, maxElevation: 35, azimuthStart: 90 };
		// 6:30 AM in winter should still be midnight (dawn doesn't start until ~6.5)
		const result = computeTimePhase(6, winterPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBe('midnight');
	});
});
```

Add `computeTimePhase` to imports.

---

## Task 9: Implementation — computeTimePhase (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Implement phase detection**

```typescript
// =============================================================================
// Time Phase Detection
// =============================================================================

/**
 * Computes the current time phase from time of day and sun path.
 *
 * Phase boundaries are derived from sunrise/sunset, not hardcoded hours.
 * This means seasons shift the boundaries automatically.
 *
 * @param time - Current time [0, 24).
 * @param sunPath - Sun path config with sunrise/sunset.
 * @returns Result containing the time phase name.
 */
export function computeTimePhase(time: Num, sunPath: SunPathConfig): Result<string> {
	const { sunrise, sunset } = sunPath;
	const dawnStart: number = sunrise - 1;
	const morningStart: number = sunrise + 0.5;
	const noonStart: number = (sunrise + sunset) / 2 - 1;
	const noonEnd: number = (sunrise + sunset) / 2 + 1;
	const duskStart: number = sunset - 1;
	const twilightStart: number = sunset;
	const nightStart: number = sunset + 1.5;

	if (time >= nightStart || time < dawnStart) return okUnchecked('midnight');
	if (time >= dawnStart && time < morningStart) return okUnchecked('dawn');
	if (time >= morningStart && time < noonStart) return okUnchecked('morning');
	if (time >= noonStart && time < noonEnd) return okUnchecked('noon');
	if (time >= noonEnd && time < duskStart) return okUnchecked('afternoon');
	if (time >= duskStart && time < twilightStart) return okUnchecked('dusk');
	if (time >= twilightStart && time < nightStart) return okUnchecked('twilight');
	return okUnchecked('night');
}
```

**Step 2: Run tests, QA, commit**

```bash
git commit -m "feat: add computeTimePhase with sun path-relative phase detection"
```

---

## Task 10: Tests — Indoor Mode Tint (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for indoor mode**

```typescript
// =============================================================================
// Indoor Mode — pure math
// =============================================================================

describe('getIndoorTint', () => {
	test('outdoor returns null (no override)', () => {
		const result = getIndoorTint('outdoor');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});

	test('indoor returns warm amber tint', () => {
		const result = getIndoorTint('indoor');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (result.data === null) return;
		expect(result.data.ambientColor?.r).toBeGreaterThan(0.3);
		expect(result.data.ambientColor?.g).toBeGreaterThan(0.2);
	});

	test('cave returns dark blue tint', () => {
		const result = getIndoorTint('cave');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (result.data === null) return;
		expect(result.data.ambientColor?.b).toBeGreaterThan(result.data.ambientColor?.r ?? 0);
		expect(result.data.environmentIntensity).toBeLessThan(0.1);
	});

	test('indoor has no sun or moon influence', () => {
		const result = getIndoorTint('indoor');
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		if (result.data === null) return;
		expect(result.data.sunIntensity).toBe(0);
		expect(result.data.moonIntensity).toBe(0);
	});
});
```

Add `getIndoorTint` to imports.

---

## Task 11: Implementation — getIndoorTint (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Implement indoor tint lookup**

```typescript
// =============================================================================
// Indoor Mode
// =============================================================================

/**
 * Returns visual override values for indoor/cave modes, or null for outdoor.
 *
 * Indoor: warm ambient, no sun/moon. Cave: dark blue, minimal light.
 *
 * @param mode - Indoor mode.
 * @returns Result containing override values or null for outdoor.
 */
export function getIndoorTint(mode: string): Result<InterpolatedValues | null> {
	switch (mode) {
		case 'outdoor':
			return okUnchecked(null);
		case 'indoor':
			return okUnchecked({
				ambientColor: { r: 0.45, g: 0.35, b: 0.25, a: 1 },
				ambientGroundColor: { r: 0.2, g: 0.15, b: 0.1, a: 1 },
				sunIntensity: 0 as Num,
				moonIntensity: 0 as Num,
				environmentIntensity: 0.15 as Num,
				clearColor: { r: 0.15, g: 0.12, b: 0.1, a: 1 },
			});
		case 'cave':
			return okUnchecked({
				ambientColor: { r: 0.05, g: 0.05, b: 0.12, a: 1 },
				ambientGroundColor: { r: 0.02, g: 0.02, b: 0.06, a: 1 },
				sunIntensity: 0 as Num,
				moonIntensity: 0 as Num,
				environmentIntensity: 0.02 as Num,
				clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
			});
		default:
			return okUnchecked(null);
	}
}
```

**Step 2: Run tests, QA, commit**

```bash
git commit -m "feat: add getIndoorTint with outdoor/indoor/cave mode overrides"
```

---

## Task 12: Tests — New API Functions (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for setSpeed, getSpeed, setEnabled, isEnabled**

```typescript
// =============================================================================
// Extended API — setSpeed, getSpeed, setEnabled, isEnabled
// =============================================================================

describe('setSpeed / getSpeed', () => {
	test('setSpeed changes cycle speed', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 1 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const setResult = setSpeed(result.data, 5);
		expect(setResult.ok).toBeTruthy();

		const getResult = getSpeed(result.data);
		expect(getResult.ok).toBeTruthy();
		if (!getResult.ok) return;
		expect(getResult.data).toBe(5);
	});

	test('getSpeed returns initial speed', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 3 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const getResult = getSpeed(result.data);
		expect(getResult.ok).toBeTruthy();
		if (!getResult.ok) return;
		expect(getResult.data).toBe(3);
	});
});

describe('setEnabled / isEnabled', () => {
	test('setEnabled(false) pauses the cycle', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 1 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const setResult = setEnabled(result.data, false);
		expect(setResult.ok).toBeTruthy();

		const checkResult = isEnabled(result.data);
		expect(checkResult.ok).toBeTruthy();
		if (!checkResult.ok) return;
		expect(checkResult.data).toBe(false);
	});

	test('setEnabled(true) resumes the cycle', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 1 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		setEnabled(result.data, false);
		setEnabled(result.data, true);

		const checkResult = isEnabled(result.data);
		expect(checkResult.ok).toBeTruthy();
		if (!checkResult.ok) return;
		expect(checkResult.data).toBe(true);
	});

	test('isEnabled returns true for new cycle', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 1 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const checkResult = isEnabled(result.data);
		expect(checkResult.ok).toBeTruthy();
		if (!checkResult.ok) return;
		expect(checkResult.data).toBe(true);
	});
});
```

Add `setSpeed, getSpeed, setEnabled, isEnabled` to imports.

---

## Task 13: Implementation — setSpeed, getSpeed, setEnabled, isEnabled (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Add `enabled` field to DayNightCycleInstance**

Add to the instance type (line 49):

```typescript
	enabled: Bool;
```

Initialize in `createDayNightCycle` as `true as Bool`.

Update the observer to check `cycleInstance.enabled` before advancing time.

**Step 2: Add API functions**

After `getTimeOfDay`, add:

```typescript
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
```

**Step 3: Run tests, QA, commit**

```bash
git commit -m "feat: add setSpeed/getSpeed/setEnabled/isEnabled API"
```

---

## Task 14: Tests — Event Callbacks (RED)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests for callbacks on instance**

```typescript
// =============================================================================
// Event Callbacks
// =============================================================================

describe('event callbacks', () => {
	test('onHourChange fires when integer hour changes', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 11.9, speed: 0 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const hours: number[] = [];
		result.data.onHourChange = (hour: Num) => { hours.push(hour); };

		// Jump from 11.9 to 12.1 — should fire onHourChange(12)
		setTimeOfDay(result.data, 12.1);
		fireCallbacks(result.data, 11.9);
		expect(hours).toContain(12);
	});

	test('onPhaseChange fires when phase transitions', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 5, speed: 0 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const phases: string[] = [];
		result.data.onPhaseChange = (phase: string) => { phases.push(phase); };

		// Jump from dawn to morning
		setTimeOfDay(result.data, 8);
		fireCallbacks(result.data, 5);
		expect(phases.length).toBeGreaterThan(0);
	});

	test('onSunrise fires when crossing sunrise', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 5.5, speed: 0, sunPath: { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 } },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		let sunriseFired = false;
		result.data.onSunrise = () => { sunriseFired = true; };

		setTimeOfDay(result.data, 6.5);
		fireCallbacks(result.data, 5.5);
		expect(sunriseFired).toBe(true);
	});

	test('onSunset fires when crossing sunset', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 17.5, speed: 0, sunPath: { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 } },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		let sunsetFired = false;
		result.data.onSunset = () => { sunsetFired = true; };

		setTimeOfDay(result.data, 18.5);
		fireCallbacks(result.data, 17.5);
		expect(sunsetFired).toBe(true);
	});

	test('callbacks are optional — no error when unset', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 5, speed: 0 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		// Should not throw when no callbacks set
		expect(() => fireCallbacks(result.data, 3)).not.toThrow();
	});
});
```

Add `fireCallbacks` to imports.

---

## Task 15: Implementation — Event Callbacks (GREEN)

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`

**Step 1: Add callback fields to DayNightCycleInstance**

Add to the instance type:

```typescript
	onSunrise?: () => void;
	onSunset?: () => void;
	onHourChange?: (hour: Num) => void;
	onPhaseChange?: (phase: string) => void;
	/** Tracks previous time for callback edge detection. */
	_previousTime: Num;
	/** Tracks previous phase for phase change detection. */
	_previousPhase: string;
```

**Step 2: Implement fireCallbacks**

```typescript
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
	const sunPath: SunPathConfig = instance.config.sunPath ?? {
		sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90,
	};

	// Sunrise: previousTime < sunrise <= currentTime
	if (instance.onSunrise !== undefined) {
		if (previousTime < sunPath.sunrise && currentTime >= sunPath.sunrise) {
			instance.onSunrise();
		}
	}

	// Sunset: previousTime < sunset <= currentTime
	if (instance.onSunset !== undefined) {
		if (previousTime < sunPath.sunset && currentTime >= sunPath.sunset) {
			instance.onSunset();
		}
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
		const phaseResult = computeTimePhase(currentTime, sunPath);
		if (phaseResult.ok && phaseResult.data !== instance._previousPhase) {
			instance._previousPhase = phaseResult.data;
			instance.onPhaseChange(phaseResult.data);
		}
	}
}
```

**Step 3: Wire fireCallbacks into the observer**

In the `onBeforeRenderObservable` callback inside `createDayNightCycle`, add:

```typescript
const prevTime: Num = cycleInstance.timeOfDay;
// ... (existing time advance code) ...
fireCallbacks(cycleInstance, prevTime);
```

**Step 4: Run tests, QA, commit**

```bash
git commit -m "feat: add event callbacks (onSunrise, onSunset, onHourChange, onPhaseChange)"
```

---

## Task 16: Wire Easing + Moon Phase + Indoor Mode into Interpolation

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Write integration tests**

```typescript
describe('interpolateKeyframes with easing', () => {
	test('smooth easing produces different midpoint than linear', () => {
		const keyframes = [
			{ time: 6, sunIntensity: 0 },
			{ time: 12, sunIntensity: 1 },
		];
		const linear = interpolateKeyframes(keyframes, 9, 'linear');
		const smooth = interpolateKeyframes(keyframes, 9, 'smooth');
		expect(linear.ok).toBeTruthy();
		expect(smooth.ok).toBeTruthy();
		if (!linear.ok || !smooth.ok) return;
		// At t=0.5, smooth should equal linear (smoothstep is 0.5 at midpoint)
		expect(smooth.data.sunIntensity).toBeCloseTo(0.5, 2);
	});

	test('easeIn at quarter point produces lower value than linear', () => {
		const keyframes = [
			{ time: 0, sunIntensity: 0 },
			{ time: 12, sunIntensity: 1 },
		];
		const linear = interpolateKeyframes(keyframes, 3, 'linear');
		const easeIn = interpolateKeyframes(keyframes, 3, 'easeIn');
		expect(linear.ok).toBeTruthy();
		expect(easeIn.ok).toBeTruthy();
		if (!linear.ok || !easeIn.ok) return;
		expect(easeIn.data.sunIntensity).toBeLessThan(linear.data.sunIntensity ?? 1);
	});
});

describe('moon phase multiplier on interpolated values', () => {
	test('new moon zeroes out moonIntensity', () => {
		const keyframes = [
			{ time: 0, moonIntensity: 0.5 },
			{ time: 12, moonIntensity: 0.5 },
		];
		const result = interpolateKeyframes(keyframes, 6, 'linear', 0);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.moonIntensity).toBeCloseTo(0, 5);
	});

	test('full moon preserves moonIntensity', () => {
		const keyframes = [
			{ time: 0, moonIntensity: 0.5 },
			{ time: 12, moonIntensity: 0.5 },
		];
		const result = interpolateKeyframes(keyframes, 6, 'linear', 4);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.moonIntensity).toBeCloseTo(0.5, 5);
	});
});
```

**Step 2: Update `interpolateKeyframes` signature**

Add optional `easing` and `moonPhase` parameters:

```typescript
export function interpolateKeyframes(
	keyframes: readonly TimeKeyframe[],
	time: Num,
	easing?: string,
	moonPhase?: number,
): Result<InterpolatedValues> {
```

Apply easing to `t` before interpolation:

```typescript
	let easedT: Num = t as Num;
	if (easing !== undefined && easing !== 'linear') {
		const easingResult = applyEasing(t, easing);
		if (easingResult.ok) easedT = easingResult.data;
	}

	const values = interpolateValues(before, after, easedT);
```

After interpolation, apply moon phase multiplier to `moonIntensity`:

```typescript
	if (moonPhase !== undefined && values.moonIntensity !== undefined) {
		const phaseInfo = getMoonPhaseInfo(moonPhase);
		if (phaseInfo.ok) {
			(values as Record<string, unknown>).moonIntensity =
				(values.moonIntensity * phaseInfo.data.intensityMultiplier) as Num;
		}
	}
```

**Step 3: Update observer in `createDayNightCycle` to pass easing and moonPhase**

Read `config.transitionEasing` and `config.moonPhase` and pass them to `interpolateKeyframes`.

**Step 4: Run tests, QA, commit**

```bash
git commit -m "feat: wire easing + moon phase into keyframe interpolation"
```

---

## Task 17: Update InterpolatedValues with Post-FX Fields

**Files:**
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.ts`
- Modify: `packages/products/webforge/runtime/src/rendering/day-night-cycle.test.ts`

**Step 1: Add to InterpolatedValues type**

```typescript
	readonly exposure?: Num;
	readonly bloomWeight?: Num;
	readonly contrast?: Num;
```

**Step 2: Add to NUM_FIELDS array**

```typescript
const NUM_FIELDS: readonly string[] = [
	'sunIntensity',
	'moonIntensity',
	'fogDensity',
	'environmentIntensity',
	'exposure',
	'bloomWeight',
	'contrast',
];
```

**Step 3: Update keyframeToValues**

Add extraction for exposure, bloomWeight, contrast.

**Step 4: Add post-FX values to DEFAULT_DAY_CYCLE_KEYFRAMES**

Update all 9 keyframes with appropriate values:

| Time | exposure | bloomWeight | contrast |
|------|----------|-------------|----------|
| 0:00 | 0.3 | 0.15 | 0.8 |
| 5:00 | 0.8 | 0.5 | 0.9 |
| 7:00 | 1.2 | 0.4 | 1.0 |
| 10:00 | 1.5 | 0.3 | 1.1 |
| 12:00 | 1.6 | 0.25 | 1.15 |
| 15:00 | 1.4 | 0.35 | 1.1 |
| 18:00 | 1.0 | 0.6 | 0.95 |
| 20:00 | 0.5 | 0.3 | 0.85 |
| 22:00 | 0.3 | 0.15 | 0.8 |

**Step 5: Write tests for post-FX interpolation**

```typescript
describe('post-FX keyframe interpolation', () => {
	test('exposure is interpolated between keyframes', () => {
		const keyframes = [
			{ time: 0, exposure: 0.5 },
			{ time: 12, exposure: 1.5 },
		];
		const result = interpolateKeyframes(keyframes, 6);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.exposure).toBeCloseTo(1.0, 2);
	});

	test('bloomWeight is interpolated between keyframes', () => {
		const keyframes = [
			{ time: 0, bloomWeight: 0.2 },
			{ time: 12, bloomWeight: 0.8 },
		];
		const result = interpolateKeyframes(keyframes, 6);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.bloomWeight).toBeCloseTo(0.5, 2);
	});

	test('contrast is interpolated between keyframes', () => {
		const keyframes = [
			{ time: 0, contrast: 0.8 },
			{ time: 12, contrast: 1.2 },
		];
		const result = interpolateKeyframes(keyframes, 6);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.contrast).toBeCloseTo(1.0, 2);
	});

	test('default keyframes include post-FX values', () => {
		const noon = DEFAULT_DAY_CYCLE_KEYFRAMES.find((kf) => kf.time === 12);
		expect(noon).toBeDefined();
		expect(noon?.exposure).toBeDefined();
		expect(noon?.bloomWeight).toBeDefined();
		expect(noon?.contrast).toBeDefined();
	});
});
```

**Step 6: Run tests, QA, commit**

```bash
git commit -m "feat: add post-FX fields (exposure, bloomWeight, contrast) to keyframes"
```

---

## Task 18: Update Exports in index.ts

**Files:**
- Modify: `packages/products/webforge/runtime/src/index.ts:285-296`

**Step 1: Add all new exports**

Update the day/night cycle export block:

```typescript
export {
	createDayNightCycle,
	interpolateKeyframes,
	computeSunDirection,
	setTimeOfDay,
	getTimeOfDay,
	setSpeed,
	getSpeed,
	setEnabled,
	isEnabled,
	getSeasonSunPath,
	getMoonPhaseInfo,
	applyEasing,
	computeTimePhase,
	getIndoorTint,
	fireCallbacks,
	disposeDayNightCycle,
	DEFAULT_DAY_CYCLE_KEYFRAMES,
	type DayNightCycleInstance,
	type InterpolatedValues,
	type MoonPhaseInfo,
} from './rendering/day-night-cycle';
```

Add schema exports:

```typescript
export {
	SeasonSchema,
	MoonPhaseSchema,
	IndoorModeSchema,
	TransitionEasingSchema,
	TimePhaseSchema,
	type Season,
	type IndoorMode,
	type TransitionEasing,
	type TimePhase,
} from './schemas/lighting-config';
```

**Step 2: Run QA, commit**

```bash
git commit -m "feat: export all new day/night API functions and schema types"
```

---

## Task 19: Dev Harness — HTML Controls

**Files:**
- Modify: `packages/products/webforge/runtime/dev/index.html:440-458`

**Step 1: Expand the Time of Day section**

Replace the existing day/night section content (inside `section-daynight`) with:

- Time slider (existing, keep)
- Speed slider (existing, keep)
- Time presets dropdown (expand from 4 → 12 options)
- Play/Pause button (existing, keep)
- **NEW:** Season dropdown (4 options)
- **NEW:** Moon phase slider (0–7) with phase name label
- **NEW:** Indoor mode dropdown (3 options)
- **NEW:** Transition easing dropdown (4 options)
- **NEW:** Read-only status row: current phase, moon intensity, sunrise/sunset times
- **NEW:** Event log textarea (small, shows last 5 events)

Each new control gets a unique `id` and `data-control` attribute following the existing pattern.

**Step 2: Run QA, commit**

```bash
git commit -m "feat(dev): add season, moon phase, indoor mode, easing controls to HTML"
```

---

## Task 20: Dev Harness — TypeScript Wiring

**Files:**
- Modify: `packages/products/webforge/runtime/dev/dev.ts:430-515`

**Step 1: Wire new controls**

For each new control, add event listeners following the existing pattern:

- **Season dropdown:** On select → call `getSeasonSunPath(season)`, apply to cycle's sunPath config, update sunrise/sunset display
- **Moon phase slider:** On input → update `cycle.config.moonPhase`, update phase name label
- **Indoor mode dropdown:** On select → update `cycle.config.indoorMode`, visual indicator
- **Easing dropdown:** On select → update `cycle.config.transitionEasing`
- **Time presets:** Expand to 12 options with descriptive labels (Dawn (5:00), Golden Morning (6:30), etc.)
- **Status display:** In the periodic update loop, show current phase from `computeTimePhase`, moon phase name, sunrise/sunset from season
- **Event log:** Wire callbacks on cycle instance to append to a textarea

**Step 2: Add imports for new functions**

```typescript
import {
	getSeasonSunPath,
	getMoonPhaseInfo,
	computeTimePhase,
	setSpeed,
	getSpeed,
	setEnabled,
	isEnabled,
} from '../src/index';
```

**Step 3: Run QA, commit**

```bash
git commit -m "feat(dev): wire season, moon, indoor, easing controls in dev harness"
```

---

## Task 21: Update Architecture Docs

**Files:**
- Modify: `docs/ARCHITECTURE.md`

**Step 1: Add day/night cycle section**

Add after the camera system section:

- Overview of the expanded system
- Feature table (seasons, moon phases, indoor mode, easing, callbacks, post-FX)
- Time phase diagram
- Season presets table
- Moon phase table
- API function reference
- File structure

**Step 2: Commit**

```bash
git commit -m "docs: add day/night cycle expansion to architecture docs"
```

---

## Task 22: Visual Verification

**Step 1: Start dev server**

```bash
cd packages/products/webforge/runtime && pnpm dev
```

**Step 2: Verify all controls**

- [ ] Time slider moves through 24 hours with visible lighting changes
- [ ] All 12 time presets jump to correct times
- [ ] Season dropdown changes sunrise/sunset display
- [ ] Summer has longest day, winter has shortest
- [ ] Moon phase slider shows phase name and affects night brightness
- [ ] New moon = very dark nights, full moon = bright nights
- [ ] Indoor mode switches to warm amber tint
- [ ] Cave mode switches to dark blue tint
- [ ] Outdoor mode restores normal cycle
- [ ] Easing dropdown changes interpolation curve (visible at faster speeds)
- [ ] Play/pause works correctly
- [ ] Speed slider works 0–10x
- [ ] Event log shows sunrise/sunset/hour/phase events when cycle runs
- [ ] Current phase display updates in real-time
- [ ] No console errors

**Step 3: Commit any fixes**

---

## Task 23: Final QA + Commit

**Step 1: Run full QA suite**

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && cd packages/products/webforge/runtime && pnpm qa:test
```

**Step 2: Verify test count increased by ~80-100**

**Step 3: Final commit if any remaining changes**

```bash
git commit -m "chore: final QA pass for day/night expansion"
```
