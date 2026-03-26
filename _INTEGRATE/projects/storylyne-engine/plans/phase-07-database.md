# Phase 7: Database Editor

**Status:** Not started
**Dependencies:** Phase 6 (Event Editor)
**Estimated weeks:** 2 (Weeks 15-16)

## Goal

All database tabs editable. Damage sandbox works. Skill tree editor works. Trait overview works.

---

## Sub-phase 7.1: Database Shell

- Tab bar: Actors, Classes, Skills, Items, Weapons, Armors, Enemies, Troops, States, Animations, Tilesets, Common Events, System, Terms
- List panel (left) with search/filter/tag
- Detail panel (right) with all fields
- Copy/duplicate/delete entries
- Bulk tag operations

### Files

```
packages/products/webforge/editor/src/lib/components/database/DatabaseShell.svelte
packages/products/webforge/editor/src/lib/components/database/DatabaseList.svelte
packages/products/webforge/editor/src/lib/components/database/SearchFilterBar.svelte
```

### Acceptance Criteria

- Tab bar displays all database categories and switches between them
- List panel shows entries with search, filter, and tag support
- Detail panel renders all fields for the selected entry
- Copy, duplicate, and delete operations work on entries
- Bulk tag operations apply tags to multiple selected entries

---

## Sub-phase 7.2: Individual Database Tab Editors

- Actor: name, class, initial level, face/character/battler graphics, initial equipment, trait list, note
- Class: parameter curves (visual editor), skills learned, trait list, EXP curve
- Skill: MP/HP/TP/item cost, damage formula, scope, action sequence, cooldown, mastery config, skill tree position
- Item: type, effect list, price, categories, tags, craftable flag, socket count
- Weapon/Armor: parameter bonuses, traits, slot type, socket count, augment compatibility, set membership, durability
- Enemy: parameters (with level scaling formula), drop items (unlimited), action patterns (link to behavior tree), battler graphic
- Troop: enemy members + positions, battle events (turn conditions), BGM override
- State: icon, priority, restriction, removal conditions, state category, mutual exclusion, traits while active
- Animation: frame data, SE timing, screen flash (import from MV-format animation sheets)
- Tileset: mode (A/B/C/D/E assignment), passage, ladder, bush, counter, damage floor, terrain tag, 3D shape per tile, 3D height default per tile

### Files

```
packages/products/webforge/editor/src/lib/components/database/tabs/ActorEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/ClassEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/SkillEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/ItemEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/WeaponEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/ArmorEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/EnemyEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/TroopEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/StateEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/AnimationEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/TilesetEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/CommonEventEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/SystemEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/TermsEditor.svelte
```

### Acceptance Criteria

- Each tab editor renders all fields for its data type
- All fields are editable and changes persist to the project data
- Actor/Class/Skill/Item/Weapon/Armor/Enemy/Troop/State/Animation/Tileset editors all functional
- Common Event editor allows editing event command lists
- System editor configures global project settings
- Terms editor manages all user-facing text strings

---

## Sub-phase 7.3: Visual Parameter Curve Editor

- Drag-to-draw curves for stat progression
- Comparison view (overlay multiple actors/classes)
- Preset curves: linear, early bloom, late bloom, S-curve

### Files

```
packages/products/webforge/editor/src/lib/components/database/CurveEditor.svelte
```

### Acceptance Criteria

- Dragging on the curve canvas adjusts stat values at each level
- Comparison view overlays multiple curves with distinct colors
- Preset curves (linear, early bloom, late bloom, S-curve) generate correct progressions
- Curve data round-trips: editing and saving produces identical reload

---

## Sub-phase 7.4: Damage Formula Sandbox

- Input fields: attacker ATK/MAT/level, defender DEF/MDF/level
- Formula text field with syntax highlighting
- Live output: damage value, variance range, crit range
- Graph: damage vs. level curve

### Files

```
packages/products/webforge/editor/src/lib/components/database/DamageSandbox.svelte
```

### Acceptance Criteria

- Input fields accept attacker and defender stat values
- Formula field parses and evaluates damage expressions
- Live output updates damage value, variance range, and crit range as inputs change
- Graph plots damage vs. level curve from level 1 to max level
- Invalid formulas display a clear error message without crashing

---

## Sub-phase 7.5: Trait Overview Panel

- Select actor + equipment loadout to see all aggregated traits
- Shows which trait came from which source
- Warnings for conflicting traits

### Files

```
packages/products/webforge/editor/src/lib/components/database/TraitOverview.svelte
```

### Acceptance Criteria

- Selecting an actor and equipment loadout displays all aggregated traits
- Each trait shows its source (actor, class, weapon, armor, state)
- Conflicting traits display a warning indicator
- Adding/removing equipment updates the trait list in real-time

---

## Sub-phase 7.6: Skill Tree Editor

- Visual node graph: skill nodes with connections
- Click node to configure: skill, point cost, prerequisites
- Multiple tree branches per class
- Preview: see tree as player would

### Files

```
packages/products/webforge/editor/src/lib/components/database/SkillTreeEditor.svelte
packages/products/webforge/editor/src/lib/components/database/SkillTreeNode.svelte
```

### Acceptance Criteria

- Skill nodes render in a visual graph layout with connections
- Clicking a node opens configuration for skill, point cost, and prerequisites
- Multiple branches per class are supported and visually distinguishable
- Preview mode renders the tree as the player would see it in-game

---

## Sub-phase 7.7: New Database Tabs

- **Quests:** title, description, objectives (array), rewards, giver, markers
- **Recipes:** ingredients (item + count), output, category, success rate, required crafting level, discovery method
- **Achievements:** title, description, icon, condition (formula), hidden flag
- **Difficulties:** name, multipliers (enemyHP, enemyATK, enemyDEF, EXP, gold, dropRate), toggles
- **Augments:** augment items with trait effects, compatible socket types
- **Set Bonuses:** set name, pieces required to trait bonuses
- **Locale Strings:** string key to per-language values table

### Files

```
packages/products/webforge/editor/src/lib/components/database/tabs/QuestEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/RecipeEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/AchievementEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/DifficultyEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/AugmentEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/SetBonusEditor.svelte
packages/products/webforge/editor/src/lib/components/database/tabs/LocaleEditor.svelte
```

### Acceptance Criteria

- Quest editor supports title, description, objective arrays, rewards, giver, and map markers
- Recipe editor supports ingredient lists, output item, category, success rate, crafting level, and discovery method
- Achievement editor supports title, description, icon, condition formula, and hidden flag
- Difficulty editor supports multiplier fields and toggle switches
- Augment editor supports trait effect lists and socket type compatibility
- Set Bonus editor supports set name, piece thresholds, and trait bonus lists
- Locale editor displays a string key to per-language value table with add/edit/delete

---

## Test Plan (Skeleton)

### Schema Tests

- Actor schema validates name, class ID, level range, graphic references, equipment slots, and trait list
- Class schema validates parameter curve arrays, skill learn list, and EXP curve data
- Skill schema validates cost fields, damage formula string, scope enum, and cooldown values
- Item schema validates type enum, effect list, price, categories, and socket count
- Weapon/Armor schema validates parameter bonuses, trait list, slot type, and set membership
- Enemy schema validates level scaling formula, drop item array, and action pattern references
- Quest schema validates objectives array shape, reward references, and giver ID
- Recipe schema validates ingredient array (item ID + count), output ID, and success rate range
- Difficulty schema validates multiplier fields are positive numbers
- Curve data schema validates level-to-value mapping arrays

### Logic Tests

- Curve editor math: linear preset generates evenly spaced values from min to max
- Curve editor math: early bloom preset front-loads stat growth
- Curve editor math: late bloom preset back-loads stat growth
- Curve editor math: S-curve preset produces sigmoid-shaped progression
- Curve editor math: interpolation between control points produces smooth values
- Damage formula evaluation: basic arithmetic (a.atk * 2 - b.def) computes correctly
- Damage formula evaluation: variable references resolve to provided stat values
- Damage formula evaluation: variance range calculation produces correct min/max
- Damage formula evaluation: crit multiplier applies correctly to base damage
- Damage formula evaluation: division by zero in formula returns error Result
- Trait aggregation: traits from actor + class + equipment merge correctly
- Trait aggregation: duplicate trait types stack or override per trait rules
- Trait aggregation: conflicting traits (e.g., element immunity + element weakness) produce warnings
- Trait aggregation: removing equipment removes its traits from the aggregate
- EXP curve calculation: total EXP per level matches the curve formula

### Integration Tests

- DatabaseShell + tab editors: switching tabs loads the correct editor component
- DatabaseList + detail panel: selecting an entry populates the detail panel
- CurveEditor + ClassEditor: editing a curve updates the class parameter data
- DamageSandbox + SkillEditor: sandbox formula matches the skill's damage formula
- TraitOverview + actor/equipment selection: changing equipment updates displayed traits
- SkillTreeEditor + ClassEditor: skill tree data persists with the class record
- Search/filter bar: filtering by tag shows only matching entries
- Bulk tag operations: tagging multiple entries updates all selected records

### Visual Verification

- Database shell renders with tab bar, list panel, and detail panel in correct layout
- Curve editor draws smooth curves and responds to drag input
- Damage sandbox graph plots a readable damage vs. level chart
- Trait overview panel displays trait sources with clear attribution
- Skill tree editor renders nodes and connections in a readable graph layout
- All 21 tab editors render their fields without overflow or layout breaks
