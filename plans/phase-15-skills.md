# Phase 15: Skill System -- Trees, Cooldowns, Mastery

**Status:** Not started
**Dependencies:** Phase 5 (Event Interpreter + State Machine), Phase 9 (Battle System -- DTB + Action Sequences)
**Estimated weeks:** 1.5 (Weeks 32-33)

## Goal

Full skill progression system. Skill trees with prerequisite-gated node unlocks. Per-skill cooldown tracking during and across battles. Use-based skill mastery that improves skills through repeated use. Point-buy stat allocation with optional respec. Configurable TP gain modes (damage dealt, damage taken, healing, turn count, custom formula).

---

## Sub-phase 15.1: Skill Tree Manager

- Skill tree node graph with prerequisite edges
- Node unlock requires prerequisite nodes completed and skill points available
- Multiple skill trees per actor class
- Skill point acquisition on level up (configurable points per level)
- Respec option to refund all spent skill points

### Files

```
packages/products/webforge/runtime/src/systems/skill-tree-manager.ts
```

### Acceptance Criteria

- Skill tree renders as a directed graph with nodes and prerequisite edges
- Node unlock validates all prerequisite nodes are already unlocked
- Node unlock validates sufficient skill points are available and deducts them
- Multiple skill trees per actor class function independently
- Skill points are awarded on level up per configured rate
- Respec refunds all spent points and re-locks all non-base nodes
- Skill tree prerequisite validation rejects unlock attempts with unmet prerequisites

---

## Sub-phase 15.2: Skill Cooldown Manager

- Per-skill cooldown counter (turns remaining)
- Cooldown starts after skill use
- Cooldown reduction from equipment, buffs, and passives
- Cooldown persistence across battles (optional per-skill configuration)
- Global cooldown option for skill categories

### Files

```
packages/products/webforge/runtime/src/systems/skill-cooldown-manager.ts
```

### Acceptance Criteria

- Skill becomes unavailable for configured number of turns after use
- Cooldown counter decrements by one each turn
- Skill becomes available again when cooldown reaches zero
- Cooldown reduction modifiers apply correctly (equipment, buffs, passives)
- Cross-battle cooldown persistence works when enabled per skill
- Global cooldown prevents same-category skills from being used in sequence
- Cooldown timer accuracy: remaining turns match expected count after N turns pass

---

## Sub-phase 15.3: Skill Mastery Manager

- Use-based skill improvement (skill XP gained per use)
- Mastery levels with configurable XP thresholds (exponential curve)
- Mastery bonuses per level (damage increase, cost reduction, cooldown reduction)
- Mastery cap per skill
- Mastery progress display in skill menu

### Files

```
packages/products/webforge/runtime/src/systems/skill-mastery-manager.ts
```

### Acceptance Criteria

- Skill XP increments on each use by configured amount
- Mastery level increases when XP exceeds threshold for current level
- XP thresholds follow configured exponential curve
- Mastery bonuses apply correctly per level (damage, cost, cooldown modifiers)
- Mastery cannot exceed configured cap per skill
- Mastery XP curve: required XP per level matches exponential formula

---

## Sub-phase 15.4: Stat Allocation Manager

- Point-buy stat allocation (STR, DEX, INT, etc.)
- Stat points awarded on level up (configurable per level)
- Allocation preview showing stat effect before confirming
- Respec option to refund all allocated stat points
- Diminishing returns at high stat values (optional)

### Files

```
packages/products/webforge/runtime/src/systems/stat-allocation-manager.ts
```

### Acceptance Criteria

- Stat points are awarded on level up per configured rate
- Points can be allocated to any stat that has not reached its cap
- Allocation deducts available points and increases target stat
- Respec refunds all allocated points and resets stats to base values
- Diminishing returns apply correct reduced benefit at high stat values when enabled
- Stat point allocation and reset produce correct final stat totals

---

## Sub-phase 15.5: TP Mode Manager

- Configurable TP gain modes per actor/class
- Built-in modes: damage dealt, damage taken, healing performed, turn count, kill count
- Custom formula mode using expression evaluator
- TP gain rate multipliers from equipment and buffs
- TP cap and overflow behavior configuration

### Files

```
packages/products/webforge/runtime/src/systems/tp-mode-manager.ts
```

### Acceptance Criteria

- Each built-in TP mode calculates correct gain amount per trigger event
- Damage dealt mode: TP gained proportional to damage output
- Damage taken mode: TP gained proportional to damage received
- Healing mode: TP gained proportional to HP restored
- Turn count mode: flat TP gained per turn
- Kill count mode: TP gained per enemy defeated
- Custom formula mode evaluates user-defined expression with battle context variables
- TP gain rate multipliers from equipment and buffs stack correctly
- TP caps at configured maximum and overflow behavior applies (discard, wrap, carry)
- TP gain mode formulas produce expected values for known inputs

---

## Test Plan (Skeleton)

### Schema Tests

- SkillTreeSchema validates node definitions, prerequisite edges, and skill point cost per node
- SkillCooldownSchema validates cooldown duration, reduction sources, and persistence settings
- SkillMasterySchema validates XP curve parameters, mastery cap, and bonus definitions per level
- StatAllocationSchema validates stat names, point costs, caps, and diminishing return configuration
- TPModeSchema validates mode type, formula expression, gain rate, cap, and overflow behavior

### Logic Tests

- Skill tree prerequisite validation: node unlock rejected when prerequisites not met, accepted when met
- Skill tree respec: all nodes re-lock and all spent points refund to correct total
- Cooldown timer accuracy: cooldown of N turns reaches zero after exactly N turn-end events
- Cooldown reduction: base cooldown minus reduction modifiers produces correct remaining turns (minimum 0)
- Mastery XP curve: XP threshold for level L matches configured exponential formula (base * multiplier^L)
- Mastery bonus stacking: damage/cost/cooldown modifiers at mastery level L match expected values
- Stat point allocation: allocating P points to a stat increases it by P (or adjusted amount with diminishing returns)
- Stat point reset: reset returns all allocated points and reverts stats to base values
- TP gain mode formulas: each built-in mode produces correct TP for given damage/healing/turn input values
- TP custom formula: expression evaluator produces correct TP from battle context variables
- TP cap behavior: TP at max discards/wraps/carries overflow per configuration

### Integration Tests

- Skill tree + battle: unlocked skills become available in battle command menu
- Cooldown + battle flow: used skill grays out for correct number of turns then re-enables
- Mastery + repeated use: skill used N times in battle gains correct cumulative mastery XP
- Stat allocation + combat: allocated stats affect damage, defense, and speed calculations in battle
- TP mode + battle: TP gain triggers on correct battle events and accumulates per mode rules

### Visual Verification

- Skill tree node graph renders with correct connections and unlock state indicators
- Locked nodes display prerequisite requirements
- Cooldown counter displays remaining turns on skill icon during battle
- Mastery progress bar shows current XP toward next mastery level
- Stat allocation screen shows available points, current stats, and preview of changes
- TP gauge fills at rate consistent with active TP mode
