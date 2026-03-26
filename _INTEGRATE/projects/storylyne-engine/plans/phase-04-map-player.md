# Phase 4: Game Map + Player + Movement

**Status:** Not started
**Dependencies:** Phase 1 (renderer for map display), Phase 3 (data schemas for MapData, EventData)
**Estimated weeks:** 2

## Goal

Walk around a map. Collision works. Map transitions work. Events visible as sprites.

---

## Sub-phase 4.1: Game Map

- Load MapData, create collision grid
- Height-aware collision: walkable tiles based on height difference
- Region system: region IDs per tile for triggers/restrictions
- Terrain tags for footstep sounds, encounter rates
- Map scrolling (following player)
- Map wrapping (loop) modes

### Files

```
packages/products/webforge/runtime/src/objects/game-map.ts
packages/products/webforge/runtime/src/objects/game-collision-grid.ts
packages/products/webforge/runtime/src/objects/game-region.ts
```

### Acceptance Criteria

- MapData loads and produces a walkable collision grid
- Height-aware collision prevents walking up cliffs but allows ramps
- Region IDs are queryable per tile
- Map wrapping loops correctly in configured directions

---

## Sub-phase 4.2: Game Player + Game Character Base

- Character base class: position (float), direction, speed, animation frame
- 8-directional pixel movement with diagonal sprites
- Grid-snap mode toggle
- Custom collision shapes (circle, box, polygon)
- Smooth camera follow with configurable offset/speed
- Jump mechanics with height awareness
- Dash (hold Shift)
- Event interaction (Action button when facing event)

### Files

```
packages/products/webforge/runtime/src/objects/game-character-base.ts
packages/products/webforge/runtime/src/objects/game-player.ts
packages/products/webforge/runtime/src/objects/game-follower.ts           # Party followers
packages/products/webforge/runtime/src/core/input.ts                     # Keyboard + gamepad input
packages/products/webforge/runtime/src/sprites/sprite-character.ts       # Billboarded 2D sprite in 3D scene
```

### Acceptance Criteria

- Player moves in 8 directions with pixel-level precision
- Diagonal movement uses diagonal sprites
- Dash increases speed while held
- Camera follows player smoothly
- Action button triggers interaction with facing event

---

## Sub-phase 4.3: Game Event

- Event objects on map with pages, conditions, commands
- Self-switches and self-variables
- Event tags
- Custom collision shapes
- Parallel process events (autorun, parallel, action button, touch)
- Sprite display: character graphic, direction fix, stepping animation, through, priority
- Light attachment
- Particle attachment

### Files

```
packages/products/webforge/runtime/src/objects/game-event.ts
packages/products/webforge/runtime/src/objects/game-self-switches.ts
packages/products/webforge/runtime/src/objects/game-self-variables.ts
```

### Acceptance Criteria

- Events display correct sprite based on active page conditions
- Self-switches toggle and persist within the map session
- Autorun events execute immediately upon map load
- Touch-trigger events fire when the player steps on them
- Action-button events fire when the player presses the action key while facing them

---

## Sub-phase 4.4: Map Transitions

- Transfer Player command: target map, X, Y, direction, fade type
- Fade to black, fade from black (or custom transition)
- Map preloading for seamless transitions
- Retain party position/state across maps
- Persistent event positions (events remember location when you leave and return)

### Files

```
packages/products/webforge/runtime/src/core/scene-manager.ts
packages/products/webforge/runtime/src/scenes/scene-map.ts
packages/products/webforge/runtime/src/managers/transition-manager.ts
```

### Acceptance Criteria

- Walk around map with 8-directional pixel movement
- Collision with walls and height differences
- Transfer to another map with fade
- Events display as sprites
- Party state and event positions persist across map transfers

---

## Test Plan (Skeleton)

### Schema Tests

- CollisionGridSchema: validate grid dimensions match map dimensions, cell values are valid passability flags
- RegionSchema: validate region ID range (0-255), region grid dimensions match map
- CharacterBaseSchema: validate position as float pair, direction enum (8 directions), speed range
- PlayerSchema: validate player extends character base, dash speed multiplier, interaction range
- EventSchema: validate pages array is non-empty, each page has valid conditions and command list
- SelfSwitchSchema: validate switch key format (mapId-eventId-switchLetter), boolean values
- SelfVariableSchema: validate variable key format, numeric values
- TransferSchema: validate target map ID exists, target coordinates within target map bounds, direction enum, fade type enum

### Logic Tests

- Collision detection: player at position (x, y) moving in direction D, verify collision grid correctly blocks or allows movement
- Height-aware collision: adjacent tiles with height difference > threshold block movement; tiles with height difference <= threshold allow movement
- Ramp traversal: walking onto a slope tile smoothly interpolates the player's Y position
- 8-directional movement math: verify diagonal movement speed is normalized (not sqrt(2) faster than cardinal)
- Grid-snap mode: verify player position snaps to grid after movement ends
- Dash speed: verify dash multiplies base speed correctly and stops when key is released
- Jump arc: verify jump follows a parabolic arc and lands at the correct height-adjusted position
- Camera follow: verify camera position converges on player position at configured follow speed
- Camera offset: verify camera offset applies correctly in all 8 directions
- Map wrapping: player at edge of wrapping map appears on opposite edge; collision checks wrap correctly
- Flood fill pathfinding: verify a path exists from point A to point B on a test map with obstacles
- Event page selection: given multiple pages with conditions, verify the highest-priority valid page is selected
- Self-switch toggle: toggle a self-switch, verify the event's active page changes accordingly
- Touch trigger detection: player steps onto event tile, verify touch event fires exactly once
- Action button range: player faces event at distance 1, verify interaction triggers; at distance 2, verify it does not
- Follower pathfinding: leader moves along a path, verify followers trail behind with correct spacing
- Map transition state: transfer to a new map, verify player position, direction, and party state are correct on arrival

### Integration Tests

- Full movement loop: create a small map with NullEngine, place a player, issue movement inputs, verify position updates per frame
- Collision integration: create a map with walls, move player into wall, verify position does not pass through
- Map transfer integration: create two maps, trigger transfer command, verify scene switches and player spawns correctly
- Event lifecycle: create a map with an autorun event, load the map, verify the event's command list begins executing
- Sprite rendering: create a character with a sprite sheet reference, verify sprite-character creates a billboarded mesh in the scene

### Visual Verification

- Player sprite faces the correct direction for all 8 directions
- Diagonal walking animation plays the correct diagonal sprite frames
- Dash produces a visible speed increase
- Camera follows player without jitter or lag
- Map transition fade-to-black and fade-from-black are smooth
- Events display their correct sprite graphic based on the active page
- Follower characters trail behind the player with natural spacing
- Player cannot visually overlap with impassable tiles or cliff edges
- Jump arc looks natural and lands precisely on the target tile
