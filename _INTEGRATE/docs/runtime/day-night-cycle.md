# Day/Night Cycle

Time-of-day lighting system that interpolates ambient, sun, moon, fog, and clear colors across keyframes. Supports seasons, moon phases, indoor/cave modes, transition easing, post-FX coupling, and event callbacks.

## Overview

The day/night cycle drives continuous lighting changes by interpolating between color/intensity keyframes as game time advances. It runs on a per-frame observer and can optionally control post-processing exposure, bloom, and contrast.

## Architecture

```
DayNightCycleConfig
  -> 9 default keyframes (midnight through dawn, noon, dusk, night)
  -> Per-frame observer:
      -> Find bracketing keyframes for current time
      -> Apply easing to interpolation factor
      -> Interpolate all color/intensity fields
      -> Apply season sun path overrides
      -> Apply moon phase intensity multiplier
      -> Apply indoor/cave mode tint override
      -> Fire edge-detected callbacks (sunrise, sunset, hour, phase)
```

## Configuration Reference

### Core

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `enabled` | Bool | `false` | -- | Enable day/night cycle |
| `speed` | Num | `1` | 0--100 | Game-hours per real second |
| `startTime` | Num | `12` | 0--24 | Initial time of day |
| `easing` | Enum | `'linear'` | `'linear'`, `'smooth'`, `'easeIn'`, `'easeOut'` | Interpolation easing |

### Sun Path

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `sunPath.sunrise` | Num | `6` | 0--12 | Sunrise hour |
| `sunPath.sunset` | Num | `18` | 12--24 | Sunset hour |
| `sunPath.maxElevation` | Num | `1.2` | 0--PI/2 | Peak sun elevation (radians) |

### Moon

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `moonPhase` | Num | `0` | 0--7 | Moon phase index |
| `moonIntensity` | Num | `0.3` | 0--1 | Base moon light intensity |

### Indoor Mode

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `indoorMode` | Enum | `'none'` | `'none'`, `'indoor'`, `'cave'` |

- `indoor`: warm amber ambient, time still advances for callbacks
- `cave`: dark blue-tinted ambient, time still advances

### Season

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `season` | Enum | `'summer'` | `'spring'`, `'summer'`, `'autumn'`, `'winter'` |

Season presets override `sunPath.sunrise`, `sunPath.sunset`, and `sunPath.maxElevation`:

| Season | Sunrise | Sunset | Max Elevation |
|--------|---------|--------|---------------|
| Spring | 5:30 | 19:30 | 1.2 |
| Summer | 4:30 | 21:00 | 1.4 |
| Autumn | 6:30 | 17:30 | 1.0 |
| Winter | 7:30 | 16:30 | 0.7 |

Explicit `sunPath` config values take priority over season presets.

## Keyframes

9 default keyframes define color/intensity snapshots:

| Hour | Phase | Description |
|------|-------|-------------|
| 0:00 | Midnight | Deep blue ambient, low moon |
| 4:00 | Pre-dawn | Slight warming |
| 5:30 | Dawn | Orange/pink horizon |
| 7:00 | Morning | Warm golden light |
| 12:00 | Noon | Bright white sun, blue sky |
| 16:00 | Afternoon | Slight warm shift |
| 18:30 | Dusk | Orange/red sunset |
| 20:00 | Twilight | Deep blue transition |
| 22:00 | Night | Dark blue ambient, moon |

Each keyframe can specify: ambient color, sun color, sun intensity, moon color, moon intensity, fog color, fog density, clear color, exposure, bloom weight, and contrast.

## Moon Phases

8 discrete phases with intensity multiplier:

| Phase | Index | Intensity |
|-------|-------|-----------|
| New Moon | 0 | 0.0 |
| Waxing Crescent | 1 | 0.25 |
| First Quarter | 2 | 0.5 |
| Waxing Gibbous | 3 | 0.75 |
| Full Moon | 4 | 1.0 |
| Waning Gibbous | 5 | 0.75 |
| Last Quarter | 6 | 0.5 |
| Waning Crescent | 7 | 0.25 |

## Time Phases

8 auto-computed phases derived from sun path (not hardcoded hours):

`dawn`, `morning`, `noon`, `afternoon`, `dusk`, `twilight`, `night`, `midnight`

## Event Callbacks

Edge-detected callbacks fired during the per-frame observer:

| Callback | Trigger |
|----------|---------|
| `onSunrise` | Sun crosses sunrise threshold |
| `onSunset` | Sun crosses sunset threshold |
| `onHourChange` | Integer hour changes |
| `onPhaseChange` | Time phase transitions |

## API

| Function | Description |
|----------|-------------|
| `createDayNightCycle` | Create cycle with observer, lights, config |
| `setTimeOfDay` / `getTimeOfDay` | Set/get current time [0, 24) |
| `setSpeed` / `getSpeed` | Set/get cycle speed |
| `setEnabled` / `isEnabled` | Start/stop observer |
| `jumpToTime` | Jump to specific time |
| `getCurrentPhase` | Get current time phase |
| `setSeason` / `getSeason` | Change/read season at runtime |
| `setIndoorMode` / `getIndoorMode` | Change/read indoor mode |
| `interpolateKeyframes` | Pure math interpolation (testable without Babylon) |
| `computeSunDirection` | Sun position from time + sun path |
| `getSeasonSunPath` | Sun path overrides for a season |
| `getMoonPhaseInfo` | Moon phase name + intensity multiplier |
| `applyEasing` | Apply easing curve to interpolation factor |
| `computeTimePhase` | Classify time into phase |
| `getIndoorTint` | Fixed tint values for indoor/cave |
| `fireCallbacks` | Edge-detect and fire event callbacks |
| `disposeDayNightCycle` | Clean up observer and references |

## Files

| File | Purpose |
|------|---------|
| `schemas/lighting-config.ts` | DayNightCycleConfigSchema, TimeKeyframeSchema, SeasonSchema |
| `rendering/day-night-cycle.ts` | Controller (15+ API functions) |
