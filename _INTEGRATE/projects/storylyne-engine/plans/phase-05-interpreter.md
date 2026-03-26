# Phase 5: Event Interpreter + State Machine

**Status:** Not started
**Dependencies:** Phase 4 (Game Map + Player + Movement)
**Estimated weeks:** 3 (Weeks 10-12)

## Goal

All event commands functional. State machine drives event behavior. Full game logic possible.

---

## Sub-phase 5.1: Event Command Interpreter

- Stack-based VM executing EventCommand arrays
- All standard MV commands implemented
- All new commands implemented
- Async-aware: non-blocking waits, parallel event execution
- Variable/switch system with formula support
- Conditional branch with compound AND/OR/NOT
- Script command execution (sandboxed eval)

### Files

```
packages/products/webforge/runtime/src/interpreter/game-interpreter.ts
packages/products/webforge/runtime/src/interpreter/command-handlers.ts
packages/products/webforge/runtime/src/interpreter/condition-evaluator.ts
packages/products/webforge/runtime/src/interpreter/formula-engine.ts
packages/products/webforge/runtime/src/objects/game-switches.ts
packages/products/webforge/runtime/src/objects/game-variables.ts
packages/products/webforge/runtime/src/objects/game-timers.ts
packages/products/webforge/runtime/src/objects/game-global-signals.ts
```

### Acceptance Criteria

- Stack-based VM executes EventCommand arrays to completion
- All standard MV commands and new commands produce correct results
- Async waits do not block the main thread; parallel events execute concurrently
- Variable/switch reads and writes work with formula expressions
- Conditional branches evaluate compound AND/OR/NOT correctly
- Sandboxed script commands execute without escaping the sandbox

---

## Sub-phase 5.2: State Machine System

- StateMachine class: states, transitions, conditions
- Attach to any event as alternative to page-based logic
- States: Idle, Patrol, Chase, Attack, Flee, Cutscene, Dead, Custom
- Transition conditions: distance to player, HP%, timer, signal received, variable check
- States can reference other events' states

### Files

```
packages/products/webforge/runtime/src/interpreter/state-machine.ts
packages/products/webforge/runtime/src/interpreter/state-machine-runner.ts
```

### Acceptance Criteria

- State machines drive enemy patrol/chase behavior
- Transitions fire when conditions are met (distance, HP%, timer, signal, variable)
- States can reference other events' states without circular deadlocks
- Custom states are definable and behave identically to built-in states

---

## Sub-phase 5.3: Movement System

- A* pathfinding
- Follow target movement mode
- Custom movement routes with visual path
- Movement sensors: detect player velocity, direction
- Line of sight: raycast check for wall blocking
- Facing direction sensor

### Files

```
packages/products/webforge/runtime/src/objects/game-pathfinding.ts
packages/products/webforge/runtime/src/objects/game-movement-sensor.ts
packages/products/webforge/runtime/src/objects/game-line-of-sight.ts
```

### Acceptance Criteria

- A* pathfinding routes around obstacles correctly
- Follow-target mode tracks a moving target with re-pathing
- Custom movement routes play back with correct speed and waits per segment
- Movement sensors report player velocity and direction accurately
- Line of sight raycasts detect wall blocking between two points
- Facing direction sensor reports correct cardinal/diagonal direction

---

## Test Plan (Skeleton)

### Schema Tests

- EventCommand schema validates command code, parameters, and indent level
- StateMachine schema validates states array, transitions, and condition shapes
- MovementRoute schema validates waypoint coordinates, speed, and wait values
- FormulaEngine expression schema rejects unsafe tokens (eval, Function, import)

### Logic Tests

- VM execution: sequential commands execute in order and update game state
- VM execution: async wait commands yield and resume after timeout
- VM execution: parallel event execution runs multiple command lists concurrently
- Condition evaluation: AND/OR/NOT compound conditions produce correct boolean results
- Condition evaluation: nested compound conditions (AND inside OR) evaluate correctly
- Formula engine: arithmetic expressions (+, -, *, /, %) compute correct values
- Formula engine: variable references (v[1], s[2]) resolve to current game state
- Formula engine: division by zero returns error Result, not NaN or Infinity
- State machine transitions: distance-based condition fires at correct threshold
- State machine transitions: HP% condition fires when health drops below threshold
- State machine transitions: timer condition fires after elapsed time
- State machine transitions: signal condition fires when global signal is broadcast
- A* pathfinding: finds shortest path on open grid
- A* pathfinding: routes around L-shaped obstacles
- A* pathfinding: returns error Result when no path exists (fully blocked)
- A* pathfinding: handles diagonal movement cost correctly
- Line of sight: raycast returns true when path is clear
- Line of sight: raycast returns false when wall blocks the path
- Line of sight: edge case where target is on a wall tile

### Integration Tests

- VM + switches/variables: command sets variable, conditional branch reads it
- State machine + movement: patrol state drives pathfinding between waypoints
- State machine + signals: signal broadcast triggers state transition on receiving event
- Timers: named timers count down independently and fire callbacks

### Visual Verification

- Event with patrol state machine visibly walks between waypoints
- Chase state machine causes NPC to follow the player in real-time
- A* pathfinding visibly routes NPC around placed obstacles
- Movement route preview draws the planned path on the map
