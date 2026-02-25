# Phase 14: Equipment Enhancement -- Sockets, Augments, Durability, Procedural

**Status:** Not started
**Dependencies:** Phase 5 (Event Interpreter + State Machine), Phase 7 (Database Editor)
**Estimated weeks:** 1.5 (Weeks 31-32)

## Goal

Full equipment enhancement pipeline. Socket/augment system for slotting gems and modifiers into gear. Enhancement levels (+1/+2/+3) with success/failure rates. Durability wear and repair mechanics. Procedural item generation for randomized loot (Diablo-style). Set bonus calculation across equipped items. Disassembly system to break down items into materials.

---

## Sub-phase 14.1: Socket and Augment System

- Socket slots on equipment (weapon, armor, accessory)
- Augment items that fit specific socket types (gem, rune, materia)
- Socket type matching validation (e.g., offensive socket only accepts offensive augments)
- Stat bonuses applied from socketed augments
- Augment removal with optional material cost

### Files

```
packages/products/webforge/runtime/src/systems/socket-system.ts
```

### Acceptance Criteria

- Equipment items define socket slots with typed categories
- Augments can only be inserted into matching socket types
- Socketed augments apply stat bonuses to the equipment's effective stats
- Augment removal returns the augment to inventory (with optional material cost)
- Empty sockets display correctly in equipment UI

---

## Sub-phase 14.2: Enhancement System

- Enhancement levels (+1 through configurable max)
- Success rate per enhancement level (decreasing at higher levels)
- Enhancement failure consequences (level reset, level decrease, item destruction)
- Material requirements per enhancement attempt
- Enhancement bonus scaling per level

### Files

```
packages/products/webforge/runtime/src/systems/enhancement-system.ts
```

### Acceptance Criteria

- Enhancement increases equipment level on success
- Success rate decreases at higher enhancement levels per configured curve
- Failed enhancement applies correct consequence (reset, decrease, or destroy)
- Material requirements are validated and consumed per attempt
- Enhancement bonuses scale correctly per level (+1 applies 1x bonus, +2 applies 2x, etc.)
- Enhancement level persists through save/load

---

## Sub-phase 14.3: Durability System

- Durability value that decreases with use (combat actions, skill usage)
- Durability thresholds that degrade equipment effectiveness
- Repair mechanics with material or gold cost
- Broken state when durability reaches zero (equipment provides no bonuses)
- Optional durability display in HUD and equipment menus

### Files

```
packages/products/webforge/runtime/src/systems/durability-system.ts
```

### Acceptance Criteria

- Durability decreases by configured amount per combat action
- Equipment effectiveness degrades at threshold breakpoints (e.g., 50% durability = 75% stats)
- Repair restores durability and consumes gold or materials
- Broken equipment (0 durability) provides no stat bonuses
- Durability degradation math applies correct multiplier at each threshold

---

## Sub-phase 14.4: Procedural Item Generation

- Random stat rolling within configured ranges per item tier
- Rarity system (common, uncommon, rare, epic, legendary) with stat multipliers
- Affix system (prefix + suffix) for named modifiers
- Stat weighting and exclusion rules (e.g., magic attack never on physical weapon)
- Seed-based generation for reproducible results

### Files

```
packages/products/webforge/runtime/src/systems/procedural-item-generator.ts
```

### Acceptance Criteria

- Generated items have stats within configured min/max ranges for their tier
- Rarity distribution matches configured probability weights
- Affixes apply named stat modifiers with correct values
- Stat exclusion rules prevent invalid stat combinations
- Same seed produces identical item output (reproducibility)
- Procedural stat distribution covers full range without clustering bias

---

## Sub-phase 14.5: Set Bonus System

- Equipment set definitions with member items
- Tiered set bonuses based on number of equipped set pieces
- Set bonus threshold activation (e.g., 2-piece bonus, 4-piece bonus)
- Dynamic recalculation on equip/unequip

### Files

```
packages/products/webforge/runtime/src/systems/set-bonus-system.ts
```

### Acceptance Criteria

- Set bonuses activate at correct piece-count thresholds
- Equipping additional set pieces activates higher-tier bonuses
- Unequipping a set piece deactivates bonuses below threshold
- Set bonuses stack with base equipment stats and enhancement bonuses
- Multiple partial sets can be active simultaneously

---

## Sub-phase 14.6: Disassembly System

- Break down equipment into component materials
- Material yield based on item rarity, enhancement level, and durability
- Augment recovery from socketed items during disassembly
- Confirmation UI to prevent accidental disassembly of valuable items

### Files

```
packages/products/webforge/runtime/src/systems/disassembly-system.ts
```

### Acceptance Criteria

- Disassembly produces correct materials based on item properties
- Higher rarity items yield rarer materials
- Enhanced items yield bonus materials proportional to enhancement level
- Socketed augments are returned to inventory on disassembly
- Disassembly is irreversible (item is consumed)

---

## Test Plan (Skeleton)

### Schema Tests

- SocketDefinitionSchema validates socket type, count, and category constraints per equipment slot
- EnhancementConfigSchema validates success rate curve, max level, and failure consequence definitions
- DurabilityConfigSchema validates threshold breakpoints, degradation rates, and repair costs
- ProceduralItemSchema validates stat ranges, rarity weights, affix pools, and exclusion rules
- SetBonusSchema validates set member lists, threshold tiers, and bonus stat definitions
- DisassemblySchema validates material yield tables and augment recovery rules

### Logic Tests

- Socket slot matching: augment type must match socket category or insertion is rejected
- Enhancement success rates: probability distribution matches configured curve over many trials
- Enhancement failure: correct consequence applied (reset to +0, decrease by 1, or destroy)
- Durability degradation math: stat effectiveness multiplier matches threshold breakpoints
- Durability repair: restores correct amount and deducts correct cost
- Procedural stat distribution: generated stats fall within configured ranges with expected distribution
- Procedural rarity weighting: rarity frequency matches configured probability over large sample
- Set bonus threshold activation: bonuses activate exactly at N-piece thresholds and deactivate below
- Disassembly yield: material output matches expected formula for rarity, enhancement, and durability

### Integration Tests

- Socket + battle: socketed augment bonuses apply to combat damage calculations
- Enhancement + save/load: enhanced equipment retains level through save/load cycle
- Durability + combat: durability decreases during battle and affects equipment stats
- Procedural generation + inventory: generated items integrate with inventory and equipment systems
- Set bonus + equip: equipping and unequipping set pieces updates active bonuses in real-time
- Disassembly + crafting: materials from disassembly can be used in crafting recipes

### Visual Verification

- Socket UI shows slot types and inserted augments on equipment detail screen
- Enhancement animation plays on success and failure
- Durability bar displays on equipment with color thresholds (green/yellow/red)
- Procedural items display rarity-colored names with affix labels
- Set bonus tooltip shows active and inactive tier bonuses with piece count
