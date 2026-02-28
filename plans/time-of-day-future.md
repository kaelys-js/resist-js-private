# Time of Day — Future / Deferred Features

> Features researched during the Time of Day expansion (2026-02-27) that are **NOT being implemented now**. Saved here for future reference.

---

## 1. Full Weather System Integration

**Source:** Unreal Engine, Unity Enviro 3, CryEngine, Godot

- Weather presets tied to time of day (fog at dawn, rain at dusk)
- Cloud cover affecting sun intensity and shadow softness
- Dynamic cloud layers with wind simulation
- Precipitation particles (rain, snow, hail) tied to season
- Wet surface PBR materials during/after rain
- Thunder + lightning flashes with screen flash integration
- Wind speed/direction affecting particles, vegetation, water
- Weather transition curves (clear → overcast → rain over N minutes)
- Weather event scheduling (random or scripted)
- Temperature simulation affecting weather probabilities

**Related plan:** `phase-08-weather.md`

---

## 2. Calendar System

**Source:** Persona, Stardew Valley, Atelier series, Harvest Moon

- Named months and weekdays (customizable per game world)
- Calendar UI widget showing current date
- Day counter / total elapsed days
- Date-based event triggers (festivals, NPC schedules)
- Configurable year length (number of days per year)
- Leap year support (optional)
- Named holidays / special dates with visual overrides
- Season auto-advance based on calendar date (not just day counter)
- NPC schedule integration (different behavior per day-of-week)

---

## 3. HUD / On-Screen Time Display

**Source:** Persona 5, Stardew Valley, Animal Crossing, Minecraft

- Clock widget (analog/digital) overlaid on game screen
- Day/night icon indicator
- Season indicator with custom icons
- Mini calendar popup
- Time-skip UI (sleep, rest, wait)
- Speed control buttons in HUD (1x, 2x, 5x, pause)
- Phase-based background color on HUD elements

**Related plan:** `phase-12-menus-hud.md`

---

## 4. Step-Based / Turn-Based Time Progression

**Source:** Pokemon, Dragon Quest, traditional JRPGs, roguelikes

- Time advances per player step (N steps = 1 game minute)
- Time advances per battle turn
- Time advances per menu action
- Configurable step-to-time ratio
- Different step rates for indoor vs outdoor
- Event-driven time advancement (cutscene durations)

**Related plan:** `phase-04-map-player.md`

---

## 5. Blood Moon / Celestial Events

**Source:** Zelda: Breath of the Wild, Terraria, Don't Starve

- Blood moon event (red tint, enemy respawn)
- Solar/lunar eclipse events with darkening
- Shooting stars / meteor showers
- Comet appearances (multi-night events)
- Aurora borealis at high latitudes / cold seasons
- Supermoon (larger moon sprite, brighter moonlight)
- Custom celestial event system with callbacks

---

## 6. Ambient Sound / Music Integration

**Source:** Most open-world RPGs, Animal Crossing, Stardew Valley

- Different BGM tracks per time phase (dawn, day, dusk, night)
- Ambient sound layers (crickets at night, birds at dawn)
- Crossfade between tracks during phase transitions
- Indoor/outdoor ambient sound switching
- Season-specific ambient tracks
- Volume modulation based on time (quieter at night)

**Related plan:** `phase-19-music.md`

---

## 7. NPC / Gameplay Behavior by Time

**Source:** Persona, Stardew Valley, Elder Scrolls, Animal Crossing

- NPC schedules (different locations per time-of-day)
- Shop open/close hours
- Enemy spawn rate changes by time
- Different enemy types at night vs day
- Locked doors / areas by time
- Quest availability windows
- Dialogue changes by time of day
- NPC sleep cycles

**Related plan:** `phase-04-map-player.md`, `phase-17-dialogue.md`

---

## 8. Advanced Sun / Moon Rendering

**Source:** Unreal Engine, CryEngine, realistic outdoor renderers

- Sun disc sprite with size/color variation by altitude
- Moon texture with libration (slight wobble)
- Moon position calculation from phase + time
- Star field with seasonal constellations
- Milky Way band visibility at low light pollution
- Sun/moon rise and set animations (horizon glow)
- Latitude/longitude-based sun path calculation
- Axial tilt affecting day length per season

---

## 9. Modifier Volumes / Zone-Based Overrides

**Source:** Unreal Engine, Unity, CryEngine

- Trigger volumes that override time-of-day settings locally
- Per-zone time offset (different time in different areas)
- Per-zone time freeze (dungeon always midnight)
- Blending between zone overrides during transitions
- Priority-based volume stacking
- Post-processing volume overrides per time phase

---

## 10. Networking / Multiplayer Sync

**Source:** MMOs, multiplayer survival games

- Server-authoritative time synchronization
- Interpolation for smooth time across clients
- Time zone offsets per player
- Shared day/night cycle across all clients
- Instance-based time overrides (dungeons have own time)

---

## 11. Advanced Post-Processing by Time

**Source:** Unreal Engine, CryEngine, Unity HDRP

- Auto-exposure curves per time phase
- Color grading LUT blending by time
- Volumetric fog density tied to time
- Screen-space reflections intensity by time
- Motion blur intensity changes (dusk haze)
- Chromatic aberration at golden hour
- Film grain increase at night
- Custom post-processing profiles per time phase

> **Note:** Basic exposure/bloomWeight/contrast keyframe wiring IS being implemented now. This section covers the more advanced per-phase profile system.

---

## 12. Time Travel / Rewind Mechanics

**Source:** Braid, Prince of Persia, Chrono Trigger

- Rewind time to previous state
- Time freeze (stop all progression, player still moves)
- Fast-forward to specific time
- Time loop mechanics (Majora's Mask)
- Parallel timeline support

---

## 13. Vegetation / Environment Response

**Source:** Unreal Engine, CryEngine, detailed nature sims

- Flowers open/close by time
- Tree shadow length changes
- Grass color shift by season
- Leaf fall particles in autumn
- Snow accumulation in winter
- Water freeze in cold seasons
- Dynamic vegetation growth over game days

**Related plan:** `phase-27-vfx-particles.md`

---

## 14. Light Probe / GI Updates by Time

**Source:** Unreal Engine Lumen, Unity HDRP

- Real-time global illumination color shift by time
- Light probe updates as sun moves
- Reflection probe updates at major time transitions
- Indirect lighting color matching sky color
- Bounce light from colored surfaces changing with sun angle

---

## 15. Save/Load Time State

**Source:** All RPGs with persistent time

- Serialize full time state (time, day, season, moon phase)
- Resume exact time state on load
- Optionally advance time while game is closed (Tamagotchi-style)
- Time state included in save file metadata

**Related plan:** `phase-03-data.md`
