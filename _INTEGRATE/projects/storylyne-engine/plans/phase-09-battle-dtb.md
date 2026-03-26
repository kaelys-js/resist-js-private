# Phase 9: Battle System -- DTB + Action Sequences

**Status:** Not started
**Dependencies:** Phase 7 (Database Editor -- actor/enemy/skill/item data), Phase 8 (Lighting + Day/Night -- rendering pipeline maturity)
**Estimated weeks:** 3 (Weeks 18-21)

## Goal

Default Turn-Based battle fully functional with action sequence editor.

---

## Sub-phase 9.1: Battle Core

- Scene_Battle: party vs. troop
- Turn management: input phase -> action phase -> end phase
- Battler objects: Game_Actor, Game_Enemy extending Game_Battler
- Damage calculation engine with formula evaluation
- State application, buff/debuff stacking
- Element system (absorb/reflect/amplify/null)
- Target selection with custom scopes (row, AoE, line, random N)
- Escape formula
- Victory/defeat handling
- Battle rewards: EXP, gold, drops, level-up processing

### Files

```
packages/products/webforge/runtime/src/battle/battle-manager.ts
packages/products/webforge/runtime/src/battle/battle-core.ts
packages/products/webforge/runtime/src/objects/game-battler.ts
packages/products/webforge/runtime/src/objects/game-actor.ts          (battle extensions)
packages/products/webforge/runtime/src/objects/game-enemy.ts          (battle extensions)
packages/products/webforge/runtime/src/battle/damage-calculator.ts
packages/products/webforge/runtime/src/battle/element-system.ts
packages/products/webforge/runtime/src/battle/target-selector.ts
packages/products/webforge/runtime/src/battle/battle-rewards.ts
packages/products/webforge/runtime/src/scenes/scene-battle.ts
```

### Acceptance Criteria

- Party vs. troop battle runs to completion (victory or defeat)
- Damage formulas evaluate correctly with actor/enemy stats
- Element interactions (absorb, reflect, amplify, null) apply properly
- Target selection supports all scope types (single, row, AoE, line, random N)
- State application and buff/debuff stacking function correctly
- Escape formula calculates and resolves
- Battle rewards (EXP, gold, drops) distribute on victory
- Level-up processing triggers when EXP thresholds are met

---

## Sub-phase 9.2: DTB (Default Turn-Based)

- Command input: Attack, Skill, Item, Guard, Escape
- All party members input -> all actions resolve
- Speed-based action order
- Sideview battler sprites with motions (walk, attack, cast, damage, victory, etc.)
- HD-2D battle background (3D environment behind 2D sprites)
- Battle transition effects (wipe, shatter, dissolve)

### Files

```
packages/products/webforge/runtime/src/battle/systems/dtb-system.ts
packages/products/webforge/runtime/src/sprites/sprite-battler.ts
packages/products/webforge/runtime/src/sprites/sprite-battle-background.ts
packages/products/webforge/runtime/src/battle/battle-transition.ts
packages/products/webforge/runtime/src/windows/window-battle-command.ts
packages/products/webforge/runtime/src/windows/window-battle-status.ts
packages/products/webforge/runtime/src/windows/window-battle-skill.ts
packages/products/webforge/runtime/src/windows/window-battle-item.ts
```

### Acceptance Criteria

- All five commands (Attack, Skill, Item, Guard, Escape) function
- All party members input before any actions resolve
- Actions resolve in speed-based order
- Sideview battler sprites display correct motions for each action type
- HD-2D battle backgrounds render (3D environment behind 2D sprites)
- Battle transitions (wipe, shatter, dissolve) play on encounter

---

## Sub-phase 9.3: Action Sequence Runtime

- ActionSequence: array of timed actions (move, animate, shake, SE, apply damage, wait)
- Default sequences per skill type (physical, magical, healing)
- Custom sequences per skill (defined in database)

### Files

```
packages/products/webforge/runtime/src/battle/action-sequence-player.ts
packages/products/webforge/runtime/src/battle/action-sequence-commands.ts   # Move, Animate, Shake, Flash, SE, Damage, Wait, etc.
```

### Acceptance Criteria

- Timed action sequences execute in correct order with proper timing
- Default sequences play for physical, magical, and healing skill types
- Custom per-skill sequences load from database and execute
- All command types (move, animate, shake, flash, SE, damage, wait) function

---

## Sub-phase 9.4: Action Sequence Editor (Editor)

- Visual timeline: tracks per action type
- Drag-and-drop action blocks
- Preview playback in editor
- Keyframe timing

### Files

```
packages/products/webforge/editor/src/lib/components/battle/ActionSequenceEditor.svelte
packages/products/webforge/editor/src/lib/components/battle/SequenceTimeline.svelte
packages/products/webforge/editor/src/lib/components/battle/ActionBlock.svelte
packages/products/webforge/editor/src/lib/components/battle/SequencePreview.svelte
```

### Acceptance Criteria

- Visual timeline renders tracks per action type
- Action blocks can be dragged and dropped onto tracks
- Preview playback shows the sequence in the editor
- Keyframe timing is editable and reflected in preview
- Edited sequences serialize back to database format

---

## Sub-phase 9.5: Victory Aftermath

- EXP bar animation per actor
- Level-up display with new skills learned
- Drop items display
- Gold received
- Quest progress notification if applicable

### Files

```
packages/products/webforge/runtime/src/battle/victory-aftermath.ts
packages/products/webforge/runtime/src/windows/window-victory-exp.ts
packages/products/webforge/runtime/src/windows/window-victory-drops.ts
```

### Acceptance Criteria

- EXP bars animate per actor after victory
- Level-up triggers and displays newly learned skills
- Drop items display with names and quantities
- Gold received amount displays
- Quest progress notifications fire when applicable

---

## Test Plan (Skeleton)

### Schema Tests

- BattlerSchema validates actor/enemy stat blocks
- DamageFormulaSchema validates formula strings and evaluation context
- ElementInteractionSchema validates absorb/reflect/amplify/null entries
- TargetScopeSchema validates scope types (single, row, AoE, line, random N)
- ActionSequenceSchema validates timed action arrays with command types
- BattleRewardSchema validates EXP, gold, drop table entries

### Logic Tests

- Damage formula calculation: verify arithmetic with varying ATK/DEF/modifiers
- Element interaction tables: absorb heals, reflect returns, amplify multiplies, null zeroes
- Target selection: correct battlers selected for each scope (single, row, AoE, line, random N)
- Action sequence timing: commands execute in order with correct delays
- Battle rewards math: EXP split across party, gold accumulation, drop rate rolls
- Speed-based action order: verify sorting by speed stat with tie-breaking
- Escape formula: success rate calculated from party agility vs. troop agility
- Buff/debuff stacking: cap enforcement, turn countdown, removal

### Integration Tests

- Full battle loop: encounter -> input -> resolve -> victory/defeat
- DTB command flow: all party members input, then actions resolve in speed order
- Action sequence player: sequence loads from database, plays with correct timing
- Victory aftermath: EXP distributes, level-ups trigger, drops and gold display
- Battle transition: scene changes from map to battle with transition effect

### Visual Verification

- Sideview battler sprite motions (walk, attack, cast, damage, victory)
- HD-2D battle background rendering (3D environment behind 2D sprites)
- Battle transition effects (wipe, shatter, dissolve)
- Action sequence preview playback in editor
- EXP bar animation during victory aftermath
- Battle command/status/skill/item windows render correctly
