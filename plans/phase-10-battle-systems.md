# Phase 10: Battle Systems -- ATB + CTB + PTB + STB

**Status:** Not started
**Dependencies:** Phase 9 (Battle System -- DTB + Action Sequences, specifically BattleCore)
**Estimated weeks:** 2 (Weeks 22-23)

## Goal

Each system extends BattleCore with different turn management.

---

## Sub-phase 10.1: ATB (Active Time Battle)

- Time gauges fill in real-time
- When gauge full -> input commands
- Configurable: wait when menu open, or active
- Visual ATB gauge per battler

### Files

```
packages/products/webforge/runtime/src/battle/systems/atb-system.ts
packages/products/webforge/runtime/src/sprites/sprite-atb-gauge.ts
```

### Acceptance Criteria

- ATB gauges fill in real-time based on battler speed
- Command input activates when gauge reaches full
- Wait mode pauses other gauges while menu is open
- Active mode continues filling gauges while menu is open
- Visual ATB gauge displays per battler with smooth fill animation

---

## Sub-phase 10.2: CTB (Charge Turn Battle)

- Speed-based turn order displayed as portrait queue
- Skills have cast time affecting next turn position
- Visual turn order bar at top of screen

### Files

```
packages/products/webforge/runtime/src/battle/systems/ctb-system.ts
packages/products/webforge/runtime/src/sprites/sprite-turn-order.ts
```

### Acceptance Criteria

- Turn order queue displays battler portraits in speed-sorted order
- Skill cast time affects the acting battler's next turn position
- Visual turn order bar renders at top of screen
- Turn order updates dynamically as actions are taken

---

## Sub-phase 10.3: PTB (Press Turn Battle)

- Party gets N action points per turn
- Hitting weakness = bonus action
- Missing/reflected = lose actions
- Visual action point icons

### Files

```
packages/products/webforge/runtime/src/battle/systems/ptb-system.ts
packages/products/webforge/runtime/src/sprites/sprite-action-points.ts
```

### Acceptance Criteria

- Party receives correct number of action points at turn start
- Hitting an elemental weakness grants a bonus action point
- Missing an attack or having it reflected costs extra action points
- Visual action point icons display and update correctly
- Turn ends when all action points are consumed

---

## Sub-phase 10.4: STB (Standard Turn Battle)

- All party members act -> all enemies act
- Simplest system for beginners
- No speed calculations

### Files

```
packages/products/webforge/runtime/src/battle/systems/stb-system.ts
```

### Acceptance Criteria

- All party members act before any enemies
- All enemies act after the party finishes
- No speed-based ordering within party or enemy groups
- System functions as the simplest battle mode with no configuration required

---

## Test Plan (Skeleton)

### Schema Tests

- ATBConfigSchema validates wait/active mode flag and gauge fill rate multiplier
- CTBConfigSchema validates cast time values and turn order queue length
- PTBConfigSchema validates action point counts, bonus/penalty rules
- STBConfigSchema validates basic turn phase configuration
- BattleSystemTypeSchema validates system type enum (DTB, ATB, CTB, PTB, STB)

### Logic Tests

- ATB gauge fill rate math: verify gauge increments per tick based on speed stat
- ATB wait vs. active mode: gauge pause/continue behavior during menu
- CTB turn order calculation: verify portrait queue sorting by speed and cast time offsets
- CTB cast time: verify skill cast time shifts battler's next turn position correctly
- PTB action point arithmetic: initial count, bonus on weakness, penalty on miss/reflect
- PTB turn boundary: turn ends exactly when action points reach zero
- STB turn flow: party phase completes fully before enemy phase begins

### Integration Tests

- ATB full battle: gauges fill, commands input, actions resolve in real-time
- CTB full battle: turn order queue drives action order, cast times shift positions
- PTB full battle: action points consumed per action, weakness/miss modifiers apply
- STB full battle: party phase -> enemy phase cycle runs to victory/defeat
- System switching: battle core loads correct system based on project configuration

### Visual Verification

- ATB gauge smooth fill animation per battler
- CTB turn order portrait bar at top of screen
- PTB action point icons display and animate on gain/loss
- All four systems render battle windows and sprite motions correctly
