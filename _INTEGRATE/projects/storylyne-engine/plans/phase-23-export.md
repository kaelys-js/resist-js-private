# Phase 23: Export + Testing + Docs + Sample Game

**Status:** Not started
**Dependencies:** All prior phases (this is the final integration, polish, and delivery phase)
**Estimated weeks:** 2 (Weeks 46-47)

## Goal

Ship-ready export to web, desktop, and mobile targets. In-game debug tooling for development. Seamless editor-to-playtest workflow. A complete 30-minute sample RPG showcasing all engine features. Full documentation site with guides, reference, and tutorials.

---

## Sub-phase 23.1: Web / Desktop / Mobile Export

- Web exporter: bundle project as static HTML5 site with all assets inlined or chunked
- Desktop exporter: package as Electron or Tauri application with native file access
- Mobile exporter: package as Progressive Web App with offline support and installability

### Files

```
packages/products/webforge/editor/src/lib/io/web-exporter.ts
packages/products/webforge/editor/src/lib/io/desktop-exporter.ts
packages/products/webforge/editor/src/lib/io/mobile-exporter.ts
```

### Acceptance Criteria

- Web exporter produces a self-contained static site that runs in modern browsers without a server
- Web exporter bundles or chunks assets with correct references
- Desktop exporter produces a runnable Electron or Tauri application
- Desktop exporter provides native filesystem access for save/load
- Mobile exporter produces an installable PWA with service worker for offline play
- All exporters return Result<T> with progress reporting during build
- Exported builds include only assets referenced by the project (tree-shaking unused assets)

---

## Sub-phase 23.2: Debug Console + Overlay

- In-game debug console: browse and modify variables/switches, teleport to map, trigger events
- Debug overlay: FPS counter, draw call count, memory usage, active event count
- Toggle debug tools with hotkey (hidden in release builds)

### Files

```
packages/products/webforge/runtime/src/debug/debug-console.ts
packages/products/webforge/runtime/src/debug/debug-overlay.ts
```

### Acceptance Criteria

- Debug console opens with configurable hotkey
- Debug console lists and allows modification of game variables and switches
- Debug console supports teleport-to-map command with map ID and coordinates
- Debug console supports trigger-event command with event ID
- Debug overlay displays FPS, draw call count, memory usage, and active event count
- Debug overlay updates in real-time without significant performance impact
- Debug tools are stripped or disabled in release/export builds

---

## Sub-phase 23.3: Playtest from Editor

- Press F5 in editor to launch runtime in new tab or embedded panel
- Playtest starts from current map and player position
- Console output from runtime is visible in editor output panel
- Stop playtest returns to editor state without data loss

### Files

```
packages/products/webforge/editor/src/lib/components/shared/PlaytestLauncher.svelte
packages/products/webforge/editor/src/lib/io/playtest-bridge.ts
```

### Acceptance Criteria

- F5 keypress in editor launches runtime playtest
- Playtest starts on the currently open map at the player start position
- Runtime console output streams to editor output panel in real-time
- Stopping playtest returns to editor with all unsaved changes preserved
- Playtest session does not modify project files on disk

---

## Sub-phase 23.4: Sample Game

- Complete 30-minute RPG demo showcasing all engine features
- Multiple maps with HD-2D scenes (town, dungeon, overworld, interior)
- Turn-based and action battle system areas
- Quest system with branching objectives, crafting recipes, and skill trees
- Boss encounter with behavior tree AI and phase transitions
- Mini-game integration (fishing mini-game)
- Visual novel-style dialogue scenes with portraits and choices

### Files

```
packages/products/webforge/editor/sample-project/
```

### Acceptance Criteria

- Sample game loads and runs without errors from a fresh project open
- Player can traverse multiple maps with seamless transitions
- Turn-based battle system functions in designated areas
- Action battle system functions in designated areas
- Quest log tracks active and completed quests with branching objectives
- Crafting system produces items from recipes using gathered materials
- Skill tree allows unlocking and upgrading abilities
- Boss encounter transitions through AI phases with distinct behavior patterns
- Fishing mini-game is playable and awards items on success
- Visual novel dialogue scenes display portraits, text, and branching choices
- Sample game completes in approximately 30 minutes of gameplay

---

## Sub-phase 23.5: Documentation Site

- Full documentation site served from `/docs`
- Getting started guide: installation, first project, first playtest
- Feature reference: one page per major system (map, battle, events, database, etc.)
- Plugin API reference: generated from JSDoc with examples
- Tutorial: step-by-step guide to build a first game from scratch

### Files

```
docs/
```

### Acceptance Criteria

- Documentation site builds and serves from `/docs` route
- Getting started guide covers installation through first successful playtest
- Feature reference includes a page for each major subsystem
- Plugin API reference is generated from source JSDoc annotations
- Tutorial walks through building a complete (minimal) game from scratch
- All code examples in documentation are tested and functional

---

## Test Plan (Skeleton)

### Schema Tests

- ExportConfigSchema validates target platform, output path, and build options
- DebugCommandSchema validates command name, arguments, and argument types
- PlaytestConfigSchema validates start map, start position, and debug flags
- SampleProjectSchema validates project structure, asset references, and map linkage

### Logic Tests

- Export bundle integrity: exported web build contains all referenced assets with correct paths
- Export asset tree-shaking: unused assets are excluded from exported bundle
- Debug console command parsing: valid commands parse correctly, invalid commands return descriptive errors
- Debug console variable modification: setting a variable updates game state immediately
- Debug console teleport: teleport command changes current map and player position
- Playtest launch: editor state serializes, runtime initializes with serialized state
- Playtest stop: runtime shuts down cleanly, editor restores pre-playtest state
- Desktop exporter: produces valid Electron/Tauri project structure
- Mobile exporter: generates service worker with correct asset cache manifest

### Integration Tests

- Web export end-to-end: export project, serve static files, load in browser, verify gameplay
- Playtest launch/stop lifecycle: start playtest from editor, play briefly, stop, verify editor state intact
- Debug console during playtest: open console, modify variable, verify game state reflects change
- Sample game load/save: load sample project, play to a save point, save, reload, verify state
- Export and reimport: export project, reimport exported data, verify project integrity

### Visual Verification

- Web export renders identically to editor preview
- Desktop export window renders at correct resolution with native title bar
- Mobile export renders responsively and installs as PWA
- Debug overlay renders without obscuring gameplay content
- Debug console renders readable text at all supported resolutions
- Sample game HD-2D scenes render with correct lighting and parallax
- Documentation site renders with consistent styling and functional navigation
