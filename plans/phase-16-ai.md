# Phase 16: AI Behavior Tree + Enemy Scaling

**Status:** Not started
**Dependencies:** Phase 9 (Battle System -- DTB + Action Sequences)
**Estimated weeks:** 1.5 (Weeks 34-35)

## Goal

Enemy AI driven by behavior trees with a visual editor. Behavior tree runtime evaluates sequence, selector, and condition nodes to determine enemy actions. Boss phase manager transitions enemy behavior at HP thresholds. Group tactics enable cross-enemy coordination. Enemy scaling formulas adjust parameters by level. Conditional drops use formula-based probability.

---

## Sub-phase 16.1: Behavior Tree Runtime

- Behavior tree evaluation engine with tick-based traversal
- Node types: sequence (run children in order, fail on first failure), selector (run children in order, succeed on first success), condition (evaluate predicate), action (execute battle command)
- Decorator nodes: inverter, repeater, cooldown gate
- Boss phase manager with HP-threshold phase transitions (e.g., phase 2 at 50% HP, phase 3 at 25% HP)
- Group tactics for cross-enemy coordination (focus fire, protect healer, flanking)
- Blackboard data sharing between nodes within a tree

### Files

```
packages/products/webforge/runtime/src/ai/behavior-tree.ts
packages/products/webforge/runtime/src/ai/behavior-nodes.ts
packages/products/webforge/runtime/src/ai/boss-phase-manager.ts
packages/products/webforge/runtime/src/ai/group-tactics.ts
```

### Acceptance Criteria

- Sequence node runs children left-to-right, returns failure on first child failure, success when all succeed
- Selector node runs children left-to-right, returns success on first child success, failure when all fail
- Condition node evaluates a predicate against battle state and returns success/failure
- Action node executes a battle command (attack, skill, item, guard, flee)
- Decorator nodes modify child behavior (inverter flips result, repeater loops, cooldown gates execution)
- Blackboard stores and retrieves key-value data shared across nodes in a single tree
- Boss phase manager detects HP threshold crossings and swaps active behavior tree
- Boss phase HP threshold transitions fire at correct percentages (e.g., exactly at 50%, 25%)
- Group tactics coordination: focus fire targets the same enemy, protect healer prioritizes healing ally defense
- Tree traversal produces correct node evaluation order for nested sequence/selector/condition trees

---

## Sub-phase 16.2: Behavior Tree Editor (Editor)

- Visual node graph editor for composing behavior trees
- Drag-and-drop node creation from palette (sequence, selector, condition, action, decorator)
- Node connection via drag between ports
- Condition picker with battle state predicates (HP%, status effect, turn count, etc.)
- Action picker with available battle commands
- Tree validation (no cycles, all leaves are action/condition nodes)
- Export/import behavior tree as JSON data

### Files

```
packages/products/webforge/editor/src/lib/components/battle/BehaviorTreeEditor.svelte
packages/products/webforge/editor/src/lib/components/battle/BTNode.svelte
packages/products/webforge/editor/src/lib/components/battle/BTConditionPicker.svelte
packages/products/webforge/editor/src/lib/components/battle/BTActionPicker.svelte
```

### Acceptance Criteria

- Node graph editor renders behavior tree with visual connections between parent and child nodes
- Nodes can be created by dragging from a palette onto the canvas
- Nodes can be connected by dragging from output port to input port
- Condition picker lists all available battle state predicates with parameter configuration
- Action picker lists all available battle commands with parameter configuration
- Tree validation rejects cycles and non-leaf internal nodes
- Behavior tree exports to JSON and imports from JSON without data loss

---

## Sub-phase 16.3: Enemy Scaling

- Level-based parameter scaling formulas for enemy stats (HP, ATK, DEF, etc.)
- Configurable scaling curves (linear, polynomial, exponential)
- Per-enemy scaling overrides for bosses and special enemies
- Conditional drop probability using formula-based calculation
- Drop tables with level-adjusted rarity weights

### Files

```
packages/products/webforge/runtime/src/ai/enemy-scaling.ts
packages/products/webforge/runtime/src/ai/conditional-drops.ts
```

### Acceptance Criteria

- Enemy stats scale by level using configured curve formula
- Linear, polynomial, and exponential scaling curves produce correct stat values for given levels
- Per-enemy overrides replace default scaling with custom formula for specific enemies
- Level-based parameter scaling curves produce expected stat values at level 1, 10, 50, 99
- Conditional drop probability evaluates formula against battle context (enemy level, overkill damage, party size)
- Drop probability clamps between 0% and 100%
- Drop tables adjust rarity weights by enemy level
- Conditional drop probability produces expected rates for known input values

---

## Test Plan (Skeleton)

### Schema Tests

- BehaviorTreeSchema validates tree structure with node types, connections, and no cycles
- BehaviorNodeSchema validates node type, parameters, and child references
- BossPhaseSchema validates HP threshold list, phase behavior tree references, and transition order
- GroupTacticsSchema validates tactic type, target selection criteria, and coordination rules
- EnemyScalingSchema validates curve type, base stats, growth parameters, and level range
- ConditionalDropSchema validates drop formula expression, item reference, and probability bounds

### Logic Tests

- Tree traversal -- sequence: children evaluated left-to-right, stops and returns failure on first failure
- Tree traversal -- selector: children evaluated left-to-right, stops and returns success on first success
- Tree traversal -- condition: predicate evaluates against current battle state and returns correct result
- Tree traversal -- decorator: inverter flips child result, repeater re-evaluates child N times
- Boss phase HP threshold transitions: phase change fires when HP crosses threshold from above
- Boss phase ordering: multiple thresholds transition in correct descending order (75% -> 50% -> 25%)
- Group tactics coordination: focus fire selects same target across all coordinated enemies
- Group tactics protect: healer-adjacent enemies prioritize guarding the healer when HP is low
- Level-based parameter scaling curves: stat = base + (growth * level^exponent) produces expected values
- Linear scaling: stat at level L equals base + growth * L
- Polynomial scaling: stat at level L equals base + growth * L^power
- Exponential scaling: stat at level L equals base * growth^L
- Conditional drop probability: formula evaluation with overkill bonus produces correct percentage
- Drop rarity weights: higher-level enemies shift weight toward rarer drops per configured curve

### Integration Tests

- Behavior tree + battle: enemy AI selects actions by evaluating behavior tree each turn
- Boss phase + battle: boss behavior changes at HP threshold during combat
- Group tactics + multi-enemy battle: coordinated enemies execute complementary actions
- Enemy scaling + encounter: spawned enemies have stats matching their level and scaling curve
- Conditional drops + battle end: loot dropped matches probability formula evaluation for battle context
- Behavior tree editor + runtime: tree created in editor loads and executes correctly in runtime

### Visual Verification

- Behavior tree editor renders node graph with clear parent-child connections
- Node palette displays available node types with icons
- Condition picker shows predicate options with parameter fields
- Action picker shows battle command options with parameter fields
- Boss phase transitions show visual indicator (animation, color shift) during battle
- Enemy stat scaling produces visually balanced difficulty progression across level ranges
