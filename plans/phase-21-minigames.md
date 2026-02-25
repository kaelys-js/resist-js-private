# Phase 21: Mini-games + Physics Lite

**Status:** Not started
**Dependencies:** Phase 5 (Interpreter -- mini-game triggers via event commands), Phase 4 (Game Map + Player -- on-map physics objects and player interaction)
**Estimated weeks:** 2 (Weeks 42-43)

## Goal

Full mini-game framework with pluggable game types (fishing, rhythm, QTE, puzzle, cards, stealth) and a lightweight physics layer for pushable objects, projectiles, conveyor belts, ice surfaces, wind zones, and buoyancy.

---

## Sub-phase 21.1: Mini-Game Framework

- Base mini-game manager with state machine (idle, active, paused, complete)
- Fishing game: cast, wait, hook, reel with timing windows
- Rhythm game: note lanes, timing grades (perfect, great, good, miss)
- QTE game: timed button prompts with configurable input sequences
- Puzzle templates: push block, switch plate, pipe rotation, sliding tile
- Card game: deck building, hand management, turn-based play
- Stealth game: vision cones, alert states (unaware, suspicious, alert), patrol routes

### Files

```
packages/products/webforge/runtime/src/minigames/mini-game-manager.ts
packages/products/webforge/runtime/src/minigames/fishing-game.ts
packages/products/webforge/runtime/src/minigames/rhythm-game.ts
packages/products/webforge/runtime/src/minigames/qte-game.ts
packages/products/webforge/runtime/src/minigames/puzzle-templates.ts
packages/products/webforge/runtime/src/minigames/card-game.ts
packages/products/webforge/runtime/src/minigames/stealth-game.ts
```

### Acceptance Criteria

- Mini-game manager transitions through state machine states (idle -> active -> paused -> complete)
- Fishing game responds to cast, wait, hook, and reel phases with timing-based feedback
- Rhythm game renders note lanes and grades input timing (perfect, great, good, miss)
- QTE game displays timed button prompts and validates input sequences within configurable windows
- Puzzle templates support push block, switch plate, pipe rotation, and sliding tile mechanics
- Card game manages deck construction, hand drawing, and turn-based play flow
- Stealth game renders vision cones, transitions alert states (unaware -> suspicious -> alert), and follows patrol routes
- All mini-games return Result<T> on completion with score/outcome data

---

## Sub-phase 21.2: Physics Lite

- Babylon.js physics wrapper with simplified API for RPG use cases
- Pushable objects: collision-driven movement on grid or free-form
- Projectiles: parabolic and linear trajectories with collision callbacks
- Conveyor belts: directional velocity applied to entities in zone
- Ice physics: reduced friction coefficient, momentum-based sliding
- Wind zones: directional force applied to entities and projectiles
- Buoyancy: water surface detection, floating and sinking behavior

### Files

```
packages/products/webforge/runtime/src/physics/physics-manager.ts
packages/products/webforge/runtime/src/physics/pushable-object.ts
packages/products/webforge/runtime/src/physics/projectile.ts
packages/products/webforge/runtime/src/physics/conveyor-belt.ts
packages/products/webforge/runtime/src/physics/ice-physics.ts
packages/products/webforge/runtime/src/physics/wind-zone.ts
packages/products/webforge/runtime/src/physics/buoyancy.ts
```

### Acceptance Criteria

- Physics manager initializes and wraps Babylon.js physics engine
- Pushable objects respond to player collision and move in the push direction
- Pushable objects stop at walls and other solid objects
- Projectiles follow parabolic or linear trajectories based on configuration
- Projectiles trigger collision callbacks on impact
- Conveyor belts apply directional velocity to all entities within their zone
- Ice physics reduces friction coefficient and preserves entity momentum
- Wind zones apply directional force to entities and deflect projectiles
- Buoyancy detects water surfaces and applies floating/sinking behavior to entities

---

## Test Plan (Skeleton)

### Schema Tests

- MiniGameConfigSchema validates game type, difficulty, timing parameters, and reward data
- PuzzleGridSchema validates grid dimensions, tile types, and solution state
- PhysicsObjectSchema validates mass, friction, restitution, and collision layer
- ProjectileSchema validates trajectory type (parabolic/linear), speed, gravity, and collision mask
- ConveyorBeltSchema validates direction vector and velocity magnitude
- WindZoneSchema validates force vector, area bounds, and affected entity types

### Logic Tests

- Mini-game state machine: transitions idle -> active -> paused -> active -> complete
- QTE timing windows: input accepted within window, rejected outside, grace period at boundaries
- Puzzle grid validation: solution state detected when all blocks on target plates
- Fishing hook timing: successful hook within timing window returns catch, miss returns empty
- Rhythm scoring: timing grades assigned correctly based on input offset from beat
- Push physics collision: pushable stops at walls, chains pushable-to-pushable contact
- Projectile trajectory: parabolic arc matches expected height and distance for given velocity and gravity
- Conveyor velocity: entity position changes at expected rate while on belt
- Ice friction coefficient: entity slides expected distance based on initial velocity and friction
- Wind force application: entity displacement matches expected value for force magnitude and duration
- Buoyancy equilibrium: floating object stabilizes at correct depth based on mass and water density

### Integration Tests

- Mini-game launch from event command: interpreter triggers mini-game, manager activates, result returns to event
- Puzzle completion triggers event: all blocks on plates fires completion callback, event system processes reward
- Physics interaction chain: player pushes block onto conveyor, conveyor moves block onto ice, block slides to target
- Projectile-wind interaction: projectile trajectory deflected by wind zone force
- Stealth detection: player enters vision cone, alert state escalates, patrol route changes

### Visual Verification

- Fishing game cast animation and reel-in feedback
- Rhythm game note lanes and timing grade indicators
- QTE button prompt display and success/failure feedback
- Puzzle block push animation and snap-to-grid behavior
- Vision cone rendering and alert state color transitions
- Projectile arc rendering with trail effect
- Conveyor belt directional animation
- Ice surface slide animation with momentum trail
- Wind zone particle effect indicating direction and force
- Buoyancy bobbing animation on water surface
