# Phase 13: Native Systems -- Quests, Crafting, Relationships, Achievements, Difficulty

**Status:** Not started
**Dependencies:** Phase 5 (Event Interpreter + State Machine)
**Estimated weeks:** 2 (Weeks 29-30)

## Goal

All native gameplay systems implemented as runtime managers. Quest state machine drives multi-step quest progression. Crafting validates recipes against inventory. Relationship system tracks NPC affinity scores. Achievement system evaluates unlock conditions. Difficulty system applies global multipliers to game parameters.

---

## Sub-phase 13.1: Quest System Runtime

- Quest state machine with states: inactive, active, completed, failed
- Multi-step objective tracking (kill count, item collection, location visit, dialogue choice)
- Branching quest paths based on player decisions
- Quest log integration with UI

### Files

```
packages/products/webforge/runtime/src/systems/quest-manager.ts
packages/products/webforge/runtime/src/systems/quest-tracker.ts
```

### Acceptance Criteria

- Quest state machine transitions between inactive, active, completed, and failed states
- Objectives track progress for kill count, item collection, location visit, and dialogue choice types
- Branching paths activate correct follow-up quests based on player decisions
- Quest tracker updates objective progress in real-time
- Completed quests cannot revert to active state
- Failed quests can be retried if configured as retriable

---

## Sub-phase 13.2: Crafting System Runtime

- Recipe validation against inventory ingredients
- Crafting success/failure with optional probability
- Material consumption on successful craft
- Recipe discovery and unlock progression

### Files

```
packages/products/webforge/runtime/src/systems/crafting-manager.ts
packages/products/webforge/runtime/src/scenes/scene-crafting.ts
```

### Acceptance Criteria

- Crafting validates that all required ingredients exist in inventory with sufficient quantity
- Successful craft consumes materials and produces output item
- Failed craft (when probability-based) consumes materials without producing output
- Recipe list filters to only show recipes with discoverable/unlocked status
- Crafting scene displays available recipes, required materials, and success chance

---

## Sub-phase 13.3: Relationship System Runtime

- NPC affinity score tracking (friendship, romance, rivalry)
- Score modification from dialogue choices, gifts, and quest outcomes
- Relationship thresholds that unlock content (dialogue, quests, scenes)
- Relationship decay over time (optional per-NPC configuration)

### Files

```
packages/products/webforge/runtime/src/systems/relationship-manager.ts
```

### Acceptance Criteria

- Relationship scores initialize and persist per NPC
- Score modifies correctly from dialogue choices, gift giving, and quest completion
- Threshold crossings trigger unlock callbacks (new dialogue, quests, scenes)
- Relationship decay applies per configured interval when enabled
- Scores clamp within configured min/max bounds

---

## Sub-phase 13.4: Achievement System Runtime

- Achievement condition evaluation against game state
- Condition types: stat threshold, quest completion, item collection, event flag, composite (AND/OR)
- Achievement popup notification on unlock
- Achievement persistence across save/load

### Files

```
packages/products/webforge/runtime/src/systems/achievement-manager.ts
packages/products/webforge/runtime/src/ui/achievement-popup.ts
```

### Acceptance Criteria

- Achievement conditions evaluate correctly for all condition types (stat, quest, item, flag, composite)
- Composite conditions support AND/OR logic with nested sub-conditions
- Achievement popup displays on unlock with icon, title, and description
- Unlocked achievements persist through save/load cycle
- Already-unlocked achievements do not re-trigger popup
- Achievement progress tracks partial completion for multi-step conditions

---

## Sub-phase 13.5: Difficulty System Runtime

- Global difficulty multipliers for enemy stats, XP gain, gold drops, damage
- Preset difficulty levels (easy, normal, hard, custom)
- Per-parameter multiplier overrides for custom difficulty
- Runtime difficulty switching with immediate effect

### Files

```
packages/products/webforge/runtime/src/systems/difficulty-manager.ts
```

### Acceptance Criteria

- Preset difficulty levels apply correct multiplier sets to all parameters
- Custom difficulty allows per-parameter multiplier overrides
- Difficulty switch applies immediately to all active game calculations
- Multipliers affect enemy stats, XP gain, gold drops, and damage calculations
- Difficulty setting persists through save/load cycle

---

## Test Plan (Skeleton)

### Schema Tests

- QuestSchema validates quest definition with objectives, branching paths, and state transitions
- RecipeSchema validates ingredient list, output item, and success probability
- RelationshipSchema validates NPC affinity bounds, decay rate, and threshold definitions
- AchievementSchema validates condition tree with supported condition types
- DifficultySchema validates multiplier ranges and preset configurations

### Logic Tests

- Quest state machine: transitions follow valid paths (inactive -> active -> completed/failed)
- Quest tracker: objective counters increment and detect completion thresholds
- Recipe ingredient validation: rejects craft when inventory lacks required materials
- Crafting probability: success/failure rates match configured probability over many iterations
- Relationship score math: additions, subtractions, and decay produce correct values within bounds
- Relationship threshold crossing: callbacks fire exactly once when score crosses threshold in either direction
- Achievement condition evaluation: single conditions and composite AND/OR trees resolve correctly
- Difficulty multiplier application: enemy stat * multiplier produces expected scaled value for each parameter

### Integration Tests

- Quest + event interpreter: event commands advance quest objectives and trigger state transitions
- Crafting + inventory: successful craft removes materials from and adds product to inventory
- Relationship + dialogue: dialogue choices modify relationship scores and unlock threshold content
- Achievement + quest: quest completion triggers achievement unlock when conditions met
- Difficulty + battle: difficulty multipliers affect actual damage and XP calculations in combat

### Visual Verification

- Quest tracker HUD widget updates objective text and progress indicators
- Crafting scene displays recipe list with material availability indicators
- Achievement popup animates in and out with correct icon and text
- Difficulty selection menu shows preset options and custom parameter sliders
