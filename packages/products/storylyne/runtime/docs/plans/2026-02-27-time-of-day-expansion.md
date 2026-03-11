# Time of Day Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the day/night cycle with configurable time sources, season auto-cycling, real-time sync, new indoor modes/easings, debug stats, post-FX wiring, and smooth time jumps.

**Architecture:** Extend existing schema + cycle engine + dev harness. No new files.

**Tech Stack:** TypeScript, Valibot, Babylon.js, Vitest

---

## Task 1: Schema — Time Source & Day Duration Fields

**Files:**
- Modify: `src/schemas/lighting-config.ts` (add TimeSourceSchema + 4 new fields)

**Step 1: Write failing tests**

In `src/schemas/lighting-config.test.ts` (or create if needed), add tests:
- `TimeSourceSchema` accepts `'accelerated'`, `'realtime'`, `'manual'`; rejects `'turbo'`
- `DayNightCycleConfigSchema` accepts `timeSource: 'realtime'`
- `DayNightCycleConfigSchema` accepts `dayDurationSeconds: 600`
- `DayNightCycleConfigSchema` rejects `dayDurationSeconds: 0` (min 1)
- `DayNightCycleConfigSchema` rejects `dayDurationSeconds: 100000` (max 86400)
- `DayNightCycleConfigSchema` accepts `reverse: true`
- `DayNightCycleConfigSchema` accepts `timezoneOffset: -5`
- `DayNightCycleConfigSchema` rejects `timezoneOffset: 15` (max 14)
- Defaults: `timeSource` defaults to `'accelerated'`, `dayDurationSeconds` to `1440`, `reverse` to `false`, `timezoneOffset` to `0`

**Step 2: Run tests — expect FAIL**

**Step 3: Implement schema changes**

Add `TimeSourceSchema` picklist. Add 4 optional fields to `DayNightCycleConfigSchema` with proper pipes and defaults.

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

`pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 2: Schema — Season Duration & Auto-Cycling Fields

**Files:**
- Modify: `src/schemas/lighting-config.ts`

**Step 1: Write failing tests**

- `DayNightCycleConfigSchema` accepts `seasonDurationDays: 7`
- Rejects `seasonDurationDays: 0` (min 1), rejects `366` (max 365)
- Accepts `seasonOrder: ['winter', 'spring', 'summer', 'autumn']`
- Rejects `seasonOrder: ['invalid']`
- Accepts `seasonTransition: 0.2`
- Rejects `seasonTransition: 1.5` (max 1)
- Accepts `currentDay: 42.5`
- Rejects `currentDay: -1` (min 0)
- Accepts `autoAdvanceMoonPhase: true`
- Accepts `moonCycleDays: 3.69`
- Rejects `moonCycleDays: 0` (min 1)
- Defaults: `seasonDurationDays: 7`, `seasonOrder: ['spring','summer','autumn','winter']`, `seasonTransition: 0`, `currentDay: 0`, `autoAdvanceMoonPhase: false`, `moonCycleDays: 3.69`

**Step 2: Run tests — expect FAIL**

**Step 3: Implement schema changes**

Add 6 optional fields to `DayNightCycleConfigSchema`.

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 3: Schema — Real Time Season Map, Indoor Modes, Easings

**Files:**
- Modify: `src/schemas/lighting-config.ts`

**Step 1: Write failing tests**

Real Time Season Map:
- Accepts `realTimeSeasonMap: { month3: 'spring', month6: 'summer', month9: 'autumn', month12: 'winter' }`
- Accepts `realtimeMoonSync: true`
- Defaults: `realtimeMoonSync: false`

Indoor Modes:
- `IndoorModeSchema` accepts `'firelit'`, `'dungeon'`, `'temple'`, `'underwater'`, `'custom'`
- Still accepts `'outdoor'`, `'indoor'`, `'cave'`
- Rejects `'lava'`

Easings:
- `TransitionEasingSchema` accepts `'easeInOut'`, `'sine'`, `'cubic'`, `'step'`
- Still accepts `'linear'`, `'smooth'`, `'easeIn'`, `'easeOut'`
- Rejects `'bounce'`

Indoor Config:
- Accepts `indoorModeConfig: { haltTime: true }`
- Accepts `indoorModeConfig: { haltTime: true, customTint: { r: 1, g: 0, b: 0, a: 1 } }`

**Step 2: Run tests — expect FAIL**

**Step 3: Implement schema changes**

Add `RealTimeSeasonMapSchema`, expand `IndoorModeSchema`, expand `TransitionEasingSchema`, add `IndoorModeConfigSchema`, add new fields.

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 4: New Indoor Tints

**Files:**
- Modify: `src/rendering/day-night-cycle.ts` (expand `getIndoorTint`)
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- `getIndoorTint('firelit')` returns warm orange-red values: `ambientColor ≈ {r: 0.5, g: 0.3, b: 0.15}`, `sunIntensity: 0`, `moonIntensity: 0`, `environmentIntensity: 0.25`
- `getIndoorTint('dungeon')` returns cold gray-blue: `ambientColor ≈ {r: 0.08, g: 0.08, b: 0.12}`, `environmentIntensity: 0.05`
- `getIndoorTint('temple')` returns soft gold: `ambientColor ≈ {r: 0.4, g: 0.35, b: 0.2}`, `environmentIntensity: 0.3`
- `getIndoorTint('underwater')` returns deep blue-green: `ambientColor ≈ {r: 0.1, g: 0.2, b: 0.25}`, `environmentIntensity: 0.15`
- `getIndoorTint('custom')` returns `null` (no tint without config)
- All new modes return `sunIntensity: 0`, `moonIntensity: 0`
- Update `VALID_INDOOR_MODES` set to include new modes

**Step 2: Run tests — expect FAIL**

**Step 3: Implement new cases in `getIndoorTint` switch + update `VALID_INDOOR_MODES`**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 5: New Easings

**Files:**
- Modify: `src/rendering/day-night-cycle.ts` (expand `applyEasing`)
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- `applyEasing(0.5, 'easeInOut')` returns `≈ 0.5` (symmetric midpoint)
- `applyEasing(0, 'easeInOut')` returns `0`
- `applyEasing(1, 'easeInOut')` returns `1`
- `applyEasing(0.25, 'easeInOut')` returns value < 0.25 (slow start)
- `applyEasing(0.5, 'sine')` returns `≈ 0.5` (symmetric)
- `applyEasing(0, 'sine')` returns `0`
- `applyEasing(1, 'sine')` returns `≈ 1`
- `applyEasing(0.5, 'cubic')` returns `0.125`
- `applyEasing(1, 'cubic')` returns `1`
- `applyEasing(0.3, 'step')` returns `0`
- `applyEasing(0.5, 'step')` returns `1`
- `applyEasing(0.7, 'step')` returns `1`

**Step 2: Run tests — expect FAIL**

**Step 3: Implement new easing cases**

```
easeInOut: t < 0.5 ? 2*t*t : 1 - (-2*t+2)^2 / 2
sine: 0.5 * (1 - cos(PI * t))
cubic: t * t * t
step: t >= 0.5 ? 1 : 0
```

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 6: Time Source Logic in Observer

**Files:**
- Modify: `src/rendering/day-night-cycle.ts` (observer callback + instance type)
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

Test `createDayNightCycle` with different time sources:
- `timeSource: 'manual'` — time does NOT advance after dt
- `timeSource: 'accelerated'` with `dayDurationSeconds: 2400` — speed = 24/2400 = 0.01
- `reverse: true` — time decreases
- `timeSource: 'realtime'` — time matches system clock (within tolerance)
- `timezoneOffset: 5` — time offset by 5 hours from system

Note: These tests need to mock `scene.getEngine().getDeltaTime()` and `Date` (for realtime).

**Step 2: Run tests — expect FAIL**

**Step 3: Implement time source branching in observer**

Add `timeSource`, `dayDurationSeconds`, `reverse`, `timezoneOffset` to instance state. Branch on `timeSource` in observer callback.

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 7: Season Auto-Cycling & Moon Auto-Advance

**Files:**
- Modify: `src/rendering/day-night-cycle.ts`
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- When `currentDay` is 0 and `seasonDurationDays` is 7, season is `seasonOrder[0]`
- When `currentDay` is 7, season is `seasonOrder[1]`
- When `currentDay` is 28, season wraps to `seasonOrder[0]` (with 4 seasons)
- `seasonTransition: 0.2` — when in last 20% of season, sun path lerps toward next season
- `autoAdvanceMoonPhase: true` + `moonCycleDays: 3.69` — at `currentDay: 3.69`, moon phase is 1; at `currentDay: 7.38`, moon phase is 2
- Day counter increments when time wraps past 24 → 0

**Step 2: Run tests — expect FAIL**

**Step 3: Implement season cycling + moon advance + day counter in observer**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 8: Real System Time Integration

**Files:**
- Modify: `src/rendering/day-night-cycle.ts`
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- When `timeSource: 'realtime'` and `realtimeMoonSync: true`, moon phase computed from lunar cycle
- Real moon sync: known new moon date Jan 6 2000 → compute expected phase for test date
- When `realTimeSeasonMap` provided with `timeSource: 'realtime'`, season auto-set from current month
- Default `realTimeSeasonMap` maps Mar→spring, Jun→summer, Sep→autumn, Dec→winter

**Step 2: Run tests — expect FAIL**

**Step 3: Implement real-time season + moon sync**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 9: Indoor Mode haltTime

**Files:**
- Modify: `src/rendering/day-night-cycle.ts`
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- When `indoorMode: 'indoor'` and `indoorModeConfig.haltTime: true`, time does NOT advance
- When `indoorMode: 'outdoor'`, time advances normally regardless of `haltTime`
- When `indoorMode: 'cave'` and `haltTime: false`, time still advances

**Step 2: Run tests — expect FAIL**

**Step 3: Add haltTime check before time advancement in observer**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 10: Wire Orphaned Post-FX & Sky Values

**Files:**
- Modify: `src/rendering/day-night-cycle.ts` (expand `applyInterpolatedValues` + instance type + options)
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- When cycle has `postProcessingPipeline` and interpolated values include `exposure`, pipeline's `imageProcessing.exposure` is set
- When `bloomWeight` interpolated, `pipeline.bloomWeight` is set
- When `contrast` interpolated, pipeline's `imageProcessing.contrast` is set
- When cycle has `skyInstance` and `skyColor` interpolated, `updateSkyFromDayNight` is called
- When `dayNightControlsPostFx: false`, post-FX values are NOT applied
- When no pipeline/sky provided, no errors (null checks)

**Step 2: Run tests — expect FAIL**

**Step 3: Expand `applyInterpolatedValues` signature + add pipeline/sky logic. Add `postProcessingPipeline`, `skyInstance`, `skyType`, `dayNightControlsPostFx` to instance type and creation options.**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 11: Statistics API

**Files:**
- Modify: `src/rendering/day-night-cycle.ts` (add `getDayNightStats` + instance fields)
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- `getDayNightStats(instance)` returns object with: `currentTime` (formatted), `currentPhase`, `currentSeason`, `currentDay`, `sunElevation`, `moonPhaseName`, `daylightRemaining`, `nighttimeRemaining`, `totalElapsedSeconds`, `framesRendered`, `effectiveSpeed`
- `sunElevation` is computed from current sun direction
- `daylightRemaining` is hours until sunset when it's daytime, `null` otherwise
- `nighttimeRemaining` is hours until sunrise when it's nighttime, `null` otherwise
- `framesRendered` increments with each observer call
- `totalElapsedSeconds` accumulates real elapsed time

**Step 2: Run tests — expect FAIL**

**Step 3: Add counter fields to instance, increment in observer, implement `getDayNightStats`**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 12: Smooth Time Jump

**Files:**
- Modify: `src/rendering/day-night-cycle.ts` (add `smoothJumpToTime`)
- Modify: `src/rendering/day-night-cycle.test.ts`

**Step 1: Write failing tests**

- `smoothJumpToTime(instance, 18, 1000)` returns ok
- During jump, time interpolates from current toward target
- Jump takes shortest path (e.g., from 23 to 1 goes forward 2h, not backward 22h)
- Jump completes after `durationMs` milliseconds
- After completion, `instance.timeOfDay === targetTime`
- Calling `smoothJumpToTime` during an active jump cancels the previous one
- Invalid target time (<0 or >=24) returns error

**Step 2: Run tests — expect FAIL**

**Step 3: Add jump state to instance, implement `smoothJumpToTime`, add jump logic to observer**

**Step 4: Run tests — expect PASS**

**Step 5: Run QA**

---

## Task 13: Dev Harness — Time Source Controls

**Files:**
- Modify: `dev/index.html` (add containers)
- Modify: `dev/dev.ts` (add controls)

**Step 1: Add HTML containers** for time source dropdown, day duration slider, reverse toggle, timezone slider

**Step 2: Wire controls in `dev.ts`**

- Time Source dropdown → sets `config.timeSource`
- Day Duration slider (10–3600, step 10, default 1440) → sets `config.dayDurationSeconds`
- Reverse toggle → sets `config.reverse`
- Timezone Offset slider (-12 to +14, step 0.5) → sets `config.timezoneOffset`
- Show/hide day duration + reverse when source is `accelerated`
- Show/hide timezone when source is `realtime`

**Step 3: Visual verify via Playwright MCP**

**Step 4: Run QA**

---

## Task 14: Dev Harness — Season & Moon Controls

**Files:**
- Modify: `dev/index.html`
- Modify: `dev/dev.ts`

**Step 1: Add HTML containers** for season duration, current day, season transition, auto moon phase, moon cycle days

**Step 2: Wire controls in `dev.ts`**

- Season Duration slider (1–30, step 1, default 7) → sets `config.seasonDurationDays`
- Current Day slider (0–365, step 0.1) → sets `config.currentDay`
- Season Transition slider (0–1, step 0.05) → sets `config.seasonTransition`
- Auto Moon Phase toggle → sets `config.autoAdvanceMoonPhase`
- Moon Cycle Days slider (1–30, step 0.5, default 3.69) → sets `config.moonCycleDays`
- Read-only: auto-computed current season display
- Read-only: live current day counter

**Step 3: Visual verify via Playwright MCP**

**Step 4: Run QA**

---

## Task 15: Dev Harness — Real Time, Indoor, Easing, Stats Controls

**Files:**
- Modify: `dev/index.html`
- Modify: `dev/dev.ts`

**Step 1: Add remaining controls**

Real Time:
- Toggle: "Sync Season to Real Month" → sets using `realTimeSeasonMap`
- Toggle: "Sync Moon to Real Lunar Cycle" → sets `realtimeMoonSync`
- Read-only: "Real Time" (live HH:MM:SS)

Indoor Mode:
- Add `'firelit'`, `'dungeon'`, `'temple'`, `'underwater'`, `'custom'` to indoor mode dropdown
- Toggle: "Halt Time" → sets `indoorModeConfig.haltTime`

Easing:
- Add `'easeInOut'`, `'sine'`, `'cubic'`, `'step'` to easing dropdown

Statistics:
- Add 10 read-only stat displays, updated per frame via `getDayNightStats`

Post-FX:
- Toggle: "Day/Night Controls Post-FX" (default on) → sets `dayNightControlsPostFx`

Smooth Jump:
- Input + slider + button: target time, duration, "Jump" button → calls `smoothJumpToTime`

**Step 2: Wire all controls, register afterRender callbacks for live updates**

**Step 3: Visual verify via Playwright MCP**

**Step 4: Run QA**

---

## Implementation Order

1. Tasks 1–3: Schema changes (all in lighting-config.ts)
2. Tasks 4–5: Indoor tints + easings (pure functions, no Babylon deps)
3. Tasks 6–9: Observer logic (time source, season cycling, real-time, haltTime)
4. Task 10: Post-FX/sky wiring
5. Tasks 11–12: Stats + smooth jump
6. Tasks 13–15: Dev harness controls

---

## Verification

After all tasks:
1. `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`
2. `pnpm qa:test` — all tests pass
3. Visual verification via Playwright MCP:
   - Switch time source to realtime → time matches system clock
   - Switch to manual → time freezes
   - Switch to accelerated + set day duration to 60s → fast cycle
   - Enable reverse → time runs backward
   - Set timezone offset → time shifts
   - Change season duration to 2 → watch seasons auto-cycle quickly
   - Enable auto moon phase → moon advances with days
   - Switch indoor mode to firelit → warm orange scene
   - Switch to dungeon → cold dark scene
   - Switch to temple → golden scene
   - Switch to underwater → blue-green scene
   - Set easing to step → hard cuts between keyframes
   - Set easing to sine → smooth sine curve
   - Check statistics panel → all 10 stats updating live
   - Click smooth jump button → time animates to target
   - Enable "Day/Night Controls Post-FX" → exposure/bloom change with time
