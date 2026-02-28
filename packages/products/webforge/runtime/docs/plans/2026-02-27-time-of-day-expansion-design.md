# Time of Day Expansion — Design Document

## Goal

Expand the existing day/night cycle system with configurable time sources, season duration & auto-cycling, real system time integration, additional indoor modes & easings, debug statistics, orphaned post-FX/sky keyframe wiring, and smooth time jumps.

## Architecture

The expansion builds on the existing `DayNightCycleConfig` schema and `createDayNightCycle` runtime engine. New fields are added to the Valibot schema, new logic is added to the cycle observer, and the dev harness gets new controls for every field. No new files are created — changes are in `lighting-config.ts`, `day-night-cycle.ts`, `day-night-cycle.test.ts`, and `dev/dev.ts`.

## Files to Modify

| File | Changes |
|------|---------|
| `src/schemas/lighting-config.ts` | New schema fields, new enums, new sub-schemas |
| `src/rendering/day-night-cycle.ts` | Time source logic, season cycling, real-time sync, new indoor tints, new easings, post-FX/sky wiring, stats, smooth jump |
| `src/rendering/day-night-cycle.test.ts` | Tests for all new features |
| `dev/dev.ts` | Dev harness controls for all new fields |
| `dev/index.html` | New HTML containers for expanded controls |

All paths relative to `packages/products/webforge/runtime/`.

---

## Group 1: Time Source & Progression

### Schema Changes

Add `TimeSourceSchema` enum and new fields to `DayNightCycleConfigSchema`:

```
TimeSourceSchema = picklist(['accelerated', 'realtime', 'manual'])
```

- `timeSource` — `optional(TimeSourceSchema, 'accelerated')` — How time progresses
  - `accelerated` — Current behavior: `speed` game-hours per real second
  - `realtime` — Sync to system clock (Date.now), respecting `timezoneOffset`
  - `manual` — Time does NOT advance automatically; only changes via `setTimeOfDay`/`jumpToTime`
- `dayDurationSeconds` — `optional(pipe(number(), minValue(1), maxValue(86400)), 1440)` — How many real seconds = 1 game day (24 game-hours). Default: 1440 (1 game-minute per real second). This replaces `speed` as the primary time configuration when `timeSource === 'accelerated'`. The `speed` field is auto-derived: `speed = 24 / dayDurationSeconds`.
- `reverse` — `optional(boolean(), false)` — If true, time runs backward
- `timezoneOffset` — `optional(pipe(number(), minValue(-12), maxValue(14)), 0)` — Hour offset for `realtime` mode

### Implementation

In the `onBeforeRenderObservable` callback:

```
if timeSource === 'accelerated':
    effectiveSpeed = 24 / dayDurationSeconds  (or use speed if dayDurationSeconds not set)
    if reverse: effectiveSpeed = -effectiveSpeed
    advance time as before using effectiveSpeed

if timeSource === 'realtime':
    systemTime = new Date()
    gameHour = systemTime.getHours() + timezoneOffset + systemTime.getMinutes() / 60
    set timeOfDay to (gameHour + 24) % 24

if timeSource === 'manual':
    do NOT advance time at all (skip dt calculation)
```

### Dev Harness

- Dropdown: "Time Source" — accelerated / realtime / manual
- Slider: "Day Duration" — 10s to 3600s (step 10), only visible when accelerated
- Toggle: "Reverse" — on/off, only visible when accelerated
- Slider: "Timezone Offset" — -12 to +14 (step 0.5), only visible when realtime

---

## Group 2: Season Duration & Auto-Cycling

### Schema Changes

Add to `DayNightCycleConfigSchema`:

- `seasonDurationDays` — `optional(pipe(number(), minValue(1), maxValue(365)), 7)` — How many game-days = 1 season
- `seasonOrder` — `optional(array(SeasonSchema), ['spring', 'summer', 'autumn', 'winter'])` — Season rotation order
- `seasonTransition` — `optional(pipe(number(), minValue(0), maxValue(1)), 0)` — Fraction of season spent cross-fading to next season's sun path (0 = instant switch)
- `currentDay` — `optional(pipe(number(), minValue(0)), 0)` — Elapsed game-days (fractional). Drives season auto-advance.
- `autoAdvanceMoonPhase` — `optional(boolean(), false)` — If true, moon phase advances 1 step per `moonCycleDays` game-days
- `moonCycleDays` — `optional(pipe(number(), minValue(1), maxValue(365)), 3.69)` — Game-days per moon phase step (29.5 / 8 ≈ 3.69)

### Implementation

Track `currentDay` as mutable on the instance. When time wraps past 24 → 0, increment `currentDay` by 1.

Season auto-cycling:
```
currentSeasonIndex = floor(currentDay / seasonDurationDays) % seasonOrder.length
nextSeasonIndex = (currentSeasonIndex + 1) % seasonOrder.length
season = seasonOrder[currentSeasonIndex]
```

Season transition blending (sun path only):
```
fractionInSeason = (currentDay % seasonDurationDays) / seasonDurationDays
if fractionInSeason > (1 - seasonTransition):
    blendT = (fractionInSeason - (1 - seasonTransition)) / seasonTransition
    lerp between currentSunPath and nextSunPath
```

Moon phase auto-advance:
```
autoMoonPhase = floor(currentDay / moonCycleDays) % 8
```

### Dev Harness

- Slider: "Season Duration" — 1 to 30 game-days (step 1)
- Slider: "Current Day" — 0 to 365 (step 0.1)
- Slider: "Season Transition" — 0 to 1 (step 0.05)
- Toggle: "Auto Moon Phase"
- Slider: "Moon Cycle" — 1 to 30 days (step 0.5)
- Read-only: "Current Season" (auto-computed)
- Read-only: "Current Day" (live counter)

---

## Group 3: Real System Time Integration

### Schema Changes

Add to `DayNightCycleConfigSchema`:

- `realTimeSeasonMap` — `optional(strictObject({ ... }))` — Maps real months (1-12) to seasons for `realtime` mode:
  ```
  { month3: 'spring', month6: 'summer', month9: 'autumn', month12: 'winter' }
  ```
  Default: Northern hemisphere mapping (Mar=spring, Jun=summer, Sep=autumn, Dec=winter)
- `realtimeMoonSync` — `optional(boolean(), false)` — If true, compute moon phase from real lunar cycle

### Implementation

When `timeSource === 'realtime'`:
- Auto-set season from `realTimeSeasonMap` based on current real month
- If `realtimeMoonSync`, compute moon phase using:
  ```
  known new moon epoch: Jan 6 2000
  daysSinceEpoch = (Date.now() - epoch) / 86400000
  lunationPhase = (daysSinceEpoch % 29.53) / 29.53
  moonPhase = floor(lunationPhase * 8) % 8
  ```

### Dev Harness

- Toggle: "Sync Season to Real Month"
- Toggle: "Sync Moon to Real Lunar Cycle"
- Read-only: "Real Time" (HH:MM:SS live)

---

## Group 4: Indoor Modes

### Schema Changes

Expand `IndoorModeSchema`:

```
picklist(['outdoor', 'indoor', 'cave', 'firelit', 'dungeon', 'temple', 'underwater', 'custom'])
```

Add `IndoorModeConfigSchema` for per-mode settings:

- `haltTime` — `optional(boolean(), false)` — If true, time progression stops in this indoor mode
- `customTint` — `optional(ColorRgbaSchema)` — Custom ambient tint for `custom` mode

### Implementation

Add new indoor tint entries to `getIndoorTint`:

```
firelit: warm orange-red tint, flickering ambient, no sun/moon, envIntensity 0.25
dungeon: cold gray-blue, very dim, no sun/moon, envIntensity 0.05
temple: soft gold, moderate ambient, no sun/moon, envIntensity 0.3
underwater: deep blue-green, moderate ambient, no sun/moon, envIntensity 0.15
custom: user-provided customTint values
```

When `haltTime === true` for the active indoor mode, skip time advancement in the observer.

### Dev Harness

- Add new options to Indoor Mode dropdown
- Toggle: "Halt Time" — appears when indoor mode is not `outdoor`

---

## Group 5: Transition Easings

### Schema Changes

Expand `TransitionEasingSchema`:

```
picklist(['linear', 'smooth', 'easeIn', 'easeOut', 'easeInOut', 'sine', 'cubic', 'step'])
```

### Implementation

Add to `applyEasing`:

```
easeInOut: 2t² for t<0.5, 1-(-2t+2)²/2 for t≥0.5
sine: 0.5 * (1 - cos(πt))
cubic: t³
step: floor(t + 0.5) — snaps to 0 or 1 at midpoint
```

### Dev Harness

- Add new options to Easing dropdown

---

## Group 6: Statistics & Debug Info

### New Instance Fields

Add to `DayNightCycleInstance`:

```
_frameCount: Num
_lastFrameTime: Num
_totalElapsedSeconds: Num
_dayCount: Num
_sunriseCount: Num
_sunsetCount: Num
```

### Statistics Computation

Expose via exported function `getDayNightStats(instance)`:

```
Return:
  currentTime: formatted "HH:MM:SS"
  currentPhase: phase string
  currentSeason: season string
  currentDay: day counter
  sunAngle: computed elevation angle in degrees
  moonPhaseName: resolved name
  daylightRemaining: hours until sunset (or "N/A" if night)
  nighttimeRemaining: hours until sunrise (or "N/A" if day)
  totalElapsed: total real seconds since creation
  framesRendered: total frames
```

### Dev Harness

Add "Statistics" sub-section in Day/Night panel with 10 read-only displays, updated per-frame:
- Current Time (HH:MM:SS)
- Phase
- Season + Day counter
- Sun Elevation (degrees)
- Moon Phase Name + Intensity
- Daylight / Nighttime Remaining
- Total Elapsed (real seconds)
- Frames Rendered
- Effective Speed (game-hours/sec)

---

## Group 7: Wire Orphaned Post-FX & Sky Keyframe Values

### Problem

`interpolateKeyframes` computes `exposure`, `bloomWeight`, `contrast`, `skyColor`, `skyGradientTop`, `skyGradientBottom`, and `fogSyncSky` every frame, but `applyInterpolatedValues` never applies them to the post-processing pipeline or sky system.

### Implementation

Add post-processing and sky references to `DayNightCycleInstance`:

```
postProcessingPipeline: BABYLON.DefaultRenderingPipeline | null
skyInstance: SkyInstance | null
skyType: string
```

These are passed in via `CreateDayNightCycleOptions`.

In `applyInterpolatedValues`, add:

```
// Post-FX
if pipeline && exposure !== undefined:
    pipeline.imageProcessing.exposure = exposure
if pipeline && bloomWeight !== undefined:
    pipeline.bloomWeight = bloomWeight
if pipeline && contrast !== undefined:
    pipeline.imageProcessing.contrast = contrast

// Sky
if skyInstance && (skyColor || skyGradientTop || skyGradientBottom || fogSyncSky):
    updateSkyFromDayNight({ sky: skyInstance, skyColor, skyGradientTop, skyGradientBottom, fogSyncSky, skyType })
```

### Dev Harness

No new controls — this is a bug fix / wiring. The existing post-FX controls already reflect the values. Add a toggle: "Day/Night Controls Post-FX" (default: on) that enables/disables post-FX application by the cycle.

---

## Group 8: Smooth Time Jump

### New Export

```
export function smoothJumpToTime(
    instance: DayNightCycleInstance,
    targetTime: Num,
    durationMs: Num,
): Result<Bool>
```

### Implementation

Store animation state on instance:
```
_jumpTarget: Num | null
_jumpStartTime: Num
_jumpDuration: Num
_jumpStartValue: Num
```

In the observer, if `_jumpTarget !== null`:
- Compute `progress = (elapsed - _jumpStartTime) / _jumpDuration`
- If `progress >= 1`: set time to target, clear jump state
- Otherwise: lerp from start to target with easeInOut

The jump takes the shortest path around the 24h clock.

### Dev Harness

- Button: "Smooth Jump" + input field for target time + slider for duration (500ms–5000ms)
