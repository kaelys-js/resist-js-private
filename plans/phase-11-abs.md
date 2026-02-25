# Phase 11: ABS Mode

**Status:** Not started
**Dependencies:** Phase 9 (Battle System -- DTB + Action Sequences, specifically BattleCore and DamageCalculator), Phase 4 (Game Map + Player + Movement)
**Estimated weeks:** 3 (Weeks 24-26)

## Goal

Real-time combat on the game map. Hitboxes, combos, dodge rolls, enemy AI.

---

## Sub-phase 11.1: ABS Core

- Real-time action processing on Scene_Map
- Hitbox system: attack creates hitbox shape, checks overlap with enemies
- Damage application in real-time
- HP bars above enemies on map
- Death/despawn handling
- Toggle ABS on/off per map

### Files

```
packages/products/webforge/runtime/src/battle/systems/abs-core.ts
packages/products/webforge/runtime/src/battle/abs/hitbox-system.ts
packages/products/webforge/runtime/src/battle/abs/abs-damage-processor.ts
packages/products/webforge/runtime/src/battle/abs/abs-enemy-spawner.ts
packages/products/webforge/runtime/src/sprites/sprite-abs-gauge.ts
```

### Acceptance Criteria

- Real-time action processing runs on the game map scene
- Hitbox shapes spawn on attack and overlap-check against enemy collision areas
- Damage applies in real-time using the shared damage calculator
- HP bars render above enemies on the map
- Enemies despawn on death with appropriate handling
- ABS mode toggles on/off per map via map metadata

---

## Sub-phase 11.2: Player ABS Actions

- Attack combo chains with timing windows
- Dodge roll with i-frames
- Block/guard
- Skill hotbar (keyboard/gamepad mapped)
- Item hotbar
- Lock-on targeting
- Projectile attacks

### Files

```
packages/products/webforge/runtime/src/battle/abs/abs-player-controller.ts
packages/products/webforge/runtime/src/battle/abs/combo-system.ts
packages/products/webforge/runtime/src/battle/abs/dodge-system.ts
packages/products/webforge/runtime/src/battle/abs/hotbar.ts
packages/products/webforge/runtime/src/battle/abs/lock-on.ts
packages/products/webforge/runtime/src/battle/abs/projectile-system.ts
```

### Acceptance Criteria

- Attack combo chains execute with configurable timing windows between inputs
- Dodge roll grants invincibility frames during the roll animation
- Block/guard reduces incoming damage
- Skill hotbar maps skills to keyboard/gamepad inputs
- Item hotbar maps consumables to keyboard/gamepad inputs
- Lock-on targeting cycles between enemies and maintains focus
- Projectile attacks travel, collide, and apply damage on hit

---

## Sub-phase 11.3: ABS Enemy AI

- State machine: Idle, Patrol, Alert, Chase, Attack, Flee
- Configurable detection range, attack range, flee HP%
- Attack patterns: melee, ranged, area, telegraphed
- Boss enemy support: phase-based pattern changes

### Files

```
packages/products/webforge/runtime/src/battle/abs/abs-enemy-ai.ts
packages/products/webforge/runtime/src/battle/abs/abs-patrol-behavior.ts
packages/products/webforge/runtime/src/battle/abs/abs-chase-behavior.ts
packages/products/webforge/runtime/src/battle/abs/abs-attack-pattern.ts
```

### Acceptance Criteria

- Enemy AI state machine transitions correctly: Idle -> Patrol -> Alert -> Chase -> Attack -> Flee
- Detection range triggers Alert/Chase when player enters radius
- Attack range triggers Attack state when player is close enough
- Flee state activates when enemy HP falls below configured threshold
- Attack patterns (melee, ranged, area, telegraphed) execute correctly
- Boss enemies switch attack patterns based on HP phase thresholds

---

## Test Plan (Skeleton)

### Schema Tests

- HitboxSchema validates shape type (rect, circle, cone), dimensions, offset, duration
- ComboChainSchema validates combo step sequences with timing window ranges
- DodgeConfigSchema validates i-frame duration, cooldown, distance
- EnemyAIConfigSchema validates state machine transitions, detection/attack ranges, flee HP%
- AttackPatternSchema validates melee/ranged/area/telegraphed pattern definitions
- ABSMapConfigSchema validates ABS toggle flag and spawn point data per map

### Logic Tests

- Hitbox overlap detection: rect-rect, rect-circle, circle-circle intersection math
- Combo timing windows: input accepted within window, combo resets outside window
- Dodge i-frame logic: damage nullified during i-frame duration, damage applies after
- AI state transitions: verify each transition trigger (detection range, attack range, flee HP%)
- Projectile trajectory: travel distance, speed, collision detection
- Lock-on target cycling: next/previous target selection, target lost on death/out-of-range
- Spawn/despawn: enemies spawn at configured points, despawn on death with cooldown

### Integration Tests

- ABS combat loop: player attacks enemy, hitbox overlaps, damage applies, enemy dies
- Combo chain: full combo sequence executes with correct damage per hit
- Dodge vs. attack: dodge during enemy attack window, verify no damage taken
- Enemy AI patrol -> chase -> attack cycle on player approach
- Boss phase transition: HP threshold triggers pattern change mid-fight
- ABS toggle: switching ABS on/off per map enables/disables real-time combat

### Visual Verification

- Hitbox debug visualization (outline shapes during development)
- Combo chain animations play in sequence
- Dodge roll animation with visible i-frame indicator
- Enemy HP bars above map sprites
- Enemy AI state transitions visible through behavior changes
- Projectile travel and impact effects
- Lock-on targeting reticle display
