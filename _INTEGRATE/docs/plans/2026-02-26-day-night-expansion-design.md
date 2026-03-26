# Day/Night Cycle Expansion Design

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Full expansion of the day/night cycle system

---

## Current State

The day/night cycle system (Phase 1.5) has 23 tests, ~695 lines:

- 9-keyframe default cycle (midnight through dawn, noon, dusk, night)
- Sun path computation (sunrise/sunset, elevation arc, azimuth)
- Keyframe interpolation (ambient, sun, moon colors + intensities, clear/fog colors, environment intensity)
- Speed control (game-hours/sec), play/pause
- 4 time presets in dev harness (Morning, Noon, Sunset, Night)
- `setTimeOfDay` / `getTimeOfDay` API
- Light resolution by ID (sun, ambient, moon)

---

## New Features

### 1. Time Presets (4 → 12)

| Preset | Time | Description |
|--------|------|-------------|
| `dawn` | 5:00 | Pre-sunrise, blue hour |
| `goldenMorning` | 6:30 | Golden hour, warm low light |
| `morning` | 8:00 | Full morning daylight |
| `noon` | 12:00 | Peak brightness |
| `afternoon` | 15:00 | Warm afternoon |
| `goldenEvening` | 17:30 | Golden hour sunset |
| `dusk` | 19:00 | Post-sunset, blue hour |
| `twilight` | 20:30 | Civil twilight |
| `night` | 22:00 | Full night |
| `midnight` | 0:00 | Darkest point |
| `lateNight` | 2:00 | Deep night, slightly brighter moon |
| `predawn` | 4:00 | Pre-dawn, faintest light |

### 2. Time Phases (auto-computed)

System classifies current time into phases based on sun path:
`dawn` | `morning` | `noon` | `afternoon` | `dusk` | `twilight` | `night` | `midnight`

Phase boundaries derived from `sunPath.sunrise` and `sunPath.sunset`, not hardcoded hours. Seasons shift the boundaries.

### 3. Seasons

4 presets that modify sun path parameters:

| Season | Sunrise | Sunset | Day Length | Max Elevation |
|--------|---------|--------|------------|---------------|
| Spring | 6:00 | 19:00 | 13h | 65° |
| Summer | 5:00 | 21:00 | 16h | 75° |
| Autumn | 6:30 | 17:30 | 11h | 55° |
| Winter | 7:30 | 16:30 | 9h | 35° |

Season overrides `sunPath.sunrise`, `sunPath.sunset`, `sunPath.maxElevation`. Explicit `sunPath` config values take priority over season presets.

### 4. Moon Phase System

8 discrete phases (standard lunar cycle):

| Phase | Value | Intensity Multiplier |
|-------|-------|---------------------|
| New Moon | 0 | 0.0 |
| Waxing Crescent | 1 | 0.15 |
| First Quarter | 2 | 0.35 |
| Waxing Gibbous | 3 | 0.7 |
| Full Moon | 4 | 1.0 |
| Waning Gibbous | 5 | 0.7 |
| Last Quarter | 6 | 0.35 |
| Waning Crescent | 7 | 0.15 |

Moon phase multiplier scales `moonIntensity` from keyframes. Pure math, no new Babylon.js dependencies.

### 5. Post-FX Time Coupling

Three new optional fields on `TimeKeyframe`:

- `exposure` — Num [0, 4] — auto-exposure shift
- `bloomWeight` — Num [0, 2] — bloom intensity shift
- `contrast` — Num [0, 2] — contrast shift

Interpolated alongside colors. Applied to post-processing pipeline when present. Default keyframes gain sensible values for all 3 fields.

### 6. Indoor/Outdoor Mode

```
indoorMode: outdoor | indoor | cave
```

| Mode | Behavior |
|------|----------|
| `outdoor` | Normal cycle — all interpolation + sun path active |
| `indoor` | Cycle paused visually, fixed warm ambient tint, time still advances for callbacks |
| `cave` | Like indoor but darker, blue-tinted ambient, no sun/moon influence |

Switching modes at runtime applies a smooth tint transition.

### 7. Transition Easing

Configurable interpolation curves between keyframes:

| Easing | Effect |
|--------|--------|
| `linear` | Current behavior (default) |
| `smooth` | Hermite smoothstep |
| `easeIn` | Slow start, fast end |
| `easeOut` | Fast start, slow end |

Applied in `interpolateKeyframes` — affects all interpolated values uniformly.

### 8. Event Callbacks

Simple optional callbacks on the instance:

- `onSunrise` — fires when sun crosses above horizon
- `onSunset` — fires when sun crosses below horizon
- `onHourChange` — fires when integer hour changes
- `onPhaseChange` — fires when time phase changes

Triggered during per-frame observer when thresholds are crossed.

---

## Schema Changes

### DayNightCycleConfig additions

```
season           — picklist: spring | summer | autumn | winter (default: summer)
moonPhase        — Num [0, 7] integer (default: 4 = full moon)
indoorMode       — picklist: outdoor | indoor | cave (default: outdoor)
transitionEasing — picklist: linear | smooth | easeIn | easeOut (default: linear)
```

### TimeKeyframe additions

```
exposure    — optional Num [0, 4]
bloomWeight — optional Num [0, 2]
contrast    — optional Num [0, 2]
```

---

## New API Functions

```
setSpeed(instance, speed)         — set cycle speed (game-hours/sec)
getSpeed(instance)                — get current speed
setEnabled(instance, enabled)     — start/stop cycle observer
isEnabled(instance)               — check if running
jumpToTime(instance, time, opts?) — jump with optional smooth transition
getCurrentPhase(instance)         — returns current TimePhase
getMoonPhase(instance)            — returns moon phase info
setSeason(instance, season)       — change season at runtime
getSeason(instance)               — get current season
setIndoorMode(instance, mode)     — switch indoor/outdoor/cave
getIndoorMode(instance)           — get current mode
```

---

## Dev Harness Controls

| Control | Type | Section |
|---------|------|---------|
| Time presets dropdown (12 options) | Dropdown | Time of Day |
| Season picker | Dropdown (4) | Time of Day |
| Moon phase slider (0–7) with phase name | Range + label | Time of Day |
| Indoor mode toggle | Dropdown (3) | Time of Day |
| Transition easing | Dropdown (4) | Time of Day |
| Current phase display | Read-only label | Time of Day |
| Moon intensity display | Read-only label | Time of Day |
| Sunrise/sunset time display | Read-only HH:MM | Time of Day |
| Event log | Read-only text area | Time of Day |

---

## Files to Modify

| File | Changes |
|------|---------|
| `runtime/src/schemas/lighting-config.ts` | New schema fields, enums |
| `runtime/src/rendering/day-night-cycle.ts` | Seasons, moon phase, indoor mode, easing, callbacks, new API |
| `runtime/src/rendering/day-night-cycle.test.ts` | ~80-100 new tests (TDD) |
| `runtime/src/index.ts` | Export new functions and types |
| `runtime/dev/dev.ts` | New dev harness controls |
| `runtime/dev/index.html` | New UI elements |
| `docs/ARCHITECTURE.md` | Update with day/night section |

---

## Research Sources

Design informed by day/night systems in:
- Unreal Engine 5 Day Sequence plugin (sun/moon/stars, atmosphere, exposure)
- Unity day/night cycles (ambient gradients, Kelvin color temperature, skybox blending)
- Godot DynamicDayNightCycles (seasonal day length, star visibility)
- RPG Maker MZ plugins (indoor/outdoor tints, lighting presets, time-based events)
- Babylon.js forum discussions (environment texture sync, directional light color matching)
