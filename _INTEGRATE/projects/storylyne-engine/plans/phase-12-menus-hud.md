# Phase 12: Menu System + HUD Editor

**Status:** Not started
**Dependencies:** Phase 7 (Database Editor -- data to display in menus), Phase 9 (Battle System -- battle-related menu windows), Phase 4 (Game Map -- on-map HUD rendering)
**Estimated weeks:** 2 (Weeks 27-28)

## Goal

All menu screens working. Visual HUD editor in editor. Save/load game working.

---

## Sub-phase 12.1: Window System

- Base window class with skinning
- Text rendering with formatting codes
- Scrollable list, selectable list
- Multiple window skin support

### Files

```
packages/products/webforge/runtime/src/windows/window-base.ts
packages/products/webforge/runtime/src/windows/window-selectable.ts
packages/products/webforge/runtime/src/windows/window-scroll-text.ts
packages/products/webforge/runtime/src/windows/window-skin-manager.ts
```

### Acceptance Criteria

- Base window renders with configurable skin
- Text rendering supports formatting codes (color, size, icon, variable insertion)
- Scrollable list scrolls smoothly through items exceeding visible area
- Selectable list highlights current selection and responds to input
- Multiple window skins can be loaded and switched at runtime

---

## Sub-phase 12.2: Menu Scenes

- Title screen, main menu, item, skill, equip, status, options, save, load, game end
- All screens customizable via UI layout data
- Keyboard + gamepad + touch navigation

### Files

```
packages/products/webforge/runtime/src/scenes/scene-title.ts
packages/products/webforge/runtime/src/scenes/scene-menu.ts
packages/products/webforge/runtime/src/scenes/scene-item.ts
packages/products/webforge/runtime/src/scenes/scene-skill.ts
packages/products/webforge/runtime/src/scenes/scene-equip.ts
packages/products/webforge/runtime/src/scenes/scene-status.ts
packages/products/webforge/runtime/src/scenes/scene-options.ts
packages/products/webforge/runtime/src/scenes/scene-save.ts
packages/products/webforge/runtime/src/scenes/scene-load.ts
packages/products/webforge/runtime/src/scenes/scene-game-end.ts
```

### Acceptance Criteria

- All ten menu scenes render and function (title, menu, item, skill, equip, status, options, save, load, game end)
- Each screen layout is driven by UI layout data and customizable
- Keyboard navigation works across all menus
- Gamepad navigation works across all menus
- Touch navigation works across all menus

---

## Sub-phase 12.3: New Menu Scenes

### Files

```
packages/products/webforge/runtime/src/scenes/scene-quest.ts
packages/products/webforge/runtime/src/scenes/scene-crafting.ts
packages/products/webforge/runtime/src/scenes/scene-achievement.ts
packages/products/webforge/runtime/src/scenes/scene-relationship.ts
packages/products/webforge/runtime/src/scenes/scene-skill-tree.ts
packages/products/webforge/runtime/src/scenes/scene-cg-gallery.ts
```

### Acceptance Criteria

- Quest scene displays active/completed quests with objectives
- Crafting scene lists recipes and available materials
- Achievement scene shows earned and locked achievements
- Relationship scene displays NPC affinity levels
- Skill tree scene renders node graph with unlock status
- CG gallery scene displays collected CG images

---

## Sub-phase 12.4: HUD System

- On-map HUD rendering (HP bars, minimap, quest tracker, gold)
- HUD layout loaded from data
- Widgets: gauge, text, icon, minimap, variable display

### Files

```
packages/products/webforge/runtime/src/ui/hud-renderer.ts
packages/products/webforge/runtime/src/ui/hud-widget.ts
packages/products/webforge/runtime/src/ui/minimap-widget.ts
packages/products/webforge/runtime/src/ui/quest-tracker-widget.ts
```

### Acceptance Criteria

- HUD renders on top of the game map
- HUD layout loads from data configuration
- Gauge widgets display and update (HP, MP, etc.)
- Text widgets display dynamic values (gold, level, etc.)
- Icon widgets render item/status icons
- Minimap widget shows current map area with player position
- Quest tracker widget shows active quest objectives
- Variable display widget shows game variables

---

## Sub-phase 12.5: Visual HUD/Menu Editor (Editor)

- WYSIWYG drag-and-drop for HUD widgets and menu layouts
- Bind widget to game data (actor HP, variable, etc.)
- Per-screen layout customization
- Theme/skin selection per element

### Files

```
packages/products/webforge/editor/src/lib/components/ui/HUDEditor.svelte
packages/products/webforge/editor/src/lib/components/ui/MenuLayoutEditor.svelte
packages/products/webforge/editor/src/lib/components/ui/WidgetPalette.svelte
packages/products/webforge/editor/src/lib/components/ui/WidgetProperties.svelte
packages/products/webforge/editor/src/lib/components/ui/ThemeEditor.svelte
```

### Acceptance Criteria

- WYSIWYG editor allows drag-and-drop placement of HUD widgets
- Widgets can be bound to game data sources (actor HP, variable, etc.)
- Per-screen layout customization saves and loads correctly
- Theme/skin selection applies per element and previews in editor
- Menu layouts can be customized per scene type

---

## Sub-phase 12.6: Save/Load System

- Save to IndexedDB (web) or filesystem (desktop export)
- Save screenshot thumbnail
- Autosave on map transfer and at configurable triggers
- New Game+ configuration

### Files

```
packages/products/webforge/runtime/src/managers/save-manager.ts
packages/products/webforge/runtime/src/managers/screenshot-manager.ts
```

### Acceptance Criteria

- Game state serializes and saves to IndexedDB in web mode
- Game state serializes and saves to filesystem in desktop export mode
- Save file includes screenshot thumbnail
- Autosave triggers on map transfer
- Autosave triggers at configurable custom trigger points
- Load restores full game state from save file
- New Game+ configuration carries over specified data to a new playthrough

---

## Test Plan (Skeleton)

### Schema Tests

- WindowSkinSchema validates skin asset references and nine-patch configuration
- MenuLayoutSchema validates per-scene widget placement and binding data
- HUDLayoutSchema validates widget type, position, size, data binding
- SaveDataSchema validates full game state serialization structure
- WidgetBindingSchema validates data source references (actor index, variable ID, etc.)

### Logic Tests

- Window rendering: base window draws with correct skin, padding, and dimensions
- Scroll behavior: list scrolls to keep selection visible, clamps at boundaries
- Save/load serialization: full game state round-trips through serialize/deserialize without data loss
- HUD widget binding: widget value updates when bound game data changes
- Autosave trigger: save fires on map transfer and custom trigger events
- New Game+ data carry-over: specified fields persist, others reset
- Text formatting codes: parse and render color, size, icon, variable codes

### Integration Tests

- Menu navigation flow: title -> new game -> map -> menu -> item -> back -> map
- Save/load cycle: play game, save, modify state, load, verify restored state matches save
- HUD updates during gameplay: HP changes reflected in gauge widget in real-time
- Editor HUD layout: create layout in editor, export, load in runtime, verify rendering
- All menu scenes accessible and functional with keyboard, gamepad, and touch

### Visual Verification

- Window skin rendering with different skins applied
- Scrollable list smooth scroll animation
- All ten standard menu scenes render with correct layout
- Six new menu scenes render with correct layout
- HUD widgets render on map without obscuring gameplay
- Minimap shows accurate map representation
- Save file screenshot thumbnails display in load screen
- HUD editor WYSIWYG preview matches runtime rendering
- Theme/skin changes preview correctly in editor
