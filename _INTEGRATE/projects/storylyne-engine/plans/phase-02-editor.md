# Phase 2: SvelteKit Editor Shell + Map Editor

**Status:** Not started
**Dependencies:** Phase 1 (renderer must be functional for live preview)
**Estimated weeks:** 3

## Goal

Working map editor. Create maps, paint tiles, adjust height, place lights, place doodads. Live HD-2D preview in editor canvas.

---

## Sub-phase 2.1: Editor Layout

- SvelteKit app with sidebar, toolbar, main canvas, properties panel
- Resizable panels (CSS grid + drag handles)
- Tab system for switching between Map, Event, Database, Audio, etc.
- Dark theme default with light mode option
- Keyboard shortcut system (Ctrl+Z undo, Ctrl+S save, etc.)

### Files

```
packages/products/webforge/editor/src/routes/+layout.svelte                   # Main editor layout
packages/products/webforge/editor/src/routes/+page.svelte                     # Dashboard / project selector
packages/products/webforge/editor/src/routes/editor/+page.svelte              # Main editor view
packages/products/webforge/editor/src/lib/components/shared/Sidebar.svelte
packages/products/webforge/editor/src/lib/components/shared/Toolbar.svelte
packages/products/webforge/editor/src/lib/components/shared/PropertiesPanel.svelte
packages/products/webforge/editor/src/lib/components/shared/TabBar.svelte
packages/products/webforge/editor/src/lib/components/shared/ResizablePanel.svelte
packages/products/webforge/editor/src/lib/components/shared/KeyboardShortcuts.svelte
packages/products/webforge/editor/src/lib/stores/editor.ts                    # Active tab, selected tool, selection state
packages/products/webforge/editor/src/lib/stores/prefs.ts                     # Theme, panel sizes, recent projects
```

### Acceptance Criteria

- Editor opens with resizable panels
- Dark theme
- Tab switching works
- Keyboard shortcuts registered

---

## Sub-phase 2.2: Babylon.js Viewport in Svelte

- Svelte component wrapping Babylon.js canvas
- Mount/unmount lifecycle management (no memory leaks)
- Two-way communication: editor state to renderer, renderer events to editor
- Editor camera controls (pan, zoom, rotate) separate from game camera
- Grid overlay toggle
- Selection highlight on hovered/selected tiles

### Files

```
packages/products/webforge/editor/src/lib/components/canvas/BabylonViewport.svelte
packages/products/webforge/editor/src/lib/components/canvas/EditorCamera.ts
packages/products/webforge/editor/src/lib/components/canvas/SelectionOverlay.ts
packages/products/webforge/editor/src/lib/components/canvas/GridOverlay.ts
```

### Acceptance Criteria

- Babylon.js renders inside Svelte component
- Editor camera navigates independently
- Grid visible
- Tile hover highlights

---

## Sub-phase 2.3: Tile Palette

- Load tileset image, display as selectable grid
- Single tile, rectangular selection, auto-tile brush
- Tileset tabs (A1-A5, B, C, D, E or custom)
- Visual autotile preview
- Recent tiles history
- Search by tileset name

### Files

```
packages/products/webforge/editor/src/lib/components/map/TilePalette.svelte
packages/products/webforge/editor/src/lib/components/map/TilesetSelector.svelte
packages/products/webforge/editor/src/lib/components/map/AutotilePreview.svelte
```

### Acceptance Criteria

- Click tile in palette and it becomes selected
- Paint on map canvas and tile appears in 3D scene
- Autotiles connect properly

---

## Sub-phase 2.4: Map Paint Tools

- Pencil (single tile), Rectangle fill, Flood fill, Circle brush
- Paint/Blend/Terrain
- Eraser
- Height brush: raise/lower terrain with adjustable radius and strength
- Layer selector: which layer to paint on
- Multi-select tools: lasso, rectangle select, magic wand
- Copy/paste/cut with clipboard (including cross-map)
- Right-click to sample tile from map

### Files

```
packages/products/webforge/editor/src/lib/components/map/MapToolbar.svelte
packages/products/webforge/editor/src/lib/components/map/tools/PencilTool.ts
packages/products/webforge/editor/src/lib/components/map/tools/RectangleTool.ts
packages/products/webforge/editor/src/lib/components/map/tools/FloodFillTool.ts
packages/products/webforge/editor/src/lib/components/map/tools/HeightBrush.ts
packages/products/webforge/editor/src/lib/components/map/tools/SelectionTool.ts
packages/products/webforge/editor/src/lib/components/map/tools/EraserTool.ts
packages/products/webforge/editor/src/lib/components/map/tools/EyedropperTool.ts
packages/products/webforge/editor/src/lib/components/map/LayerPanel.svelte
```

### Acceptance Criteria

- All paint tools work
- Height brush raises/lowers terrain visually in real-time
- Copy/paste works across maps

---

## Sub-phase 2.5: Doodad System

- Freeform placement layer (not grid-locked)
- Drag sprites/images onto map at any position
- Per-doodad properties: scale, rotation, z-offset, tint
- Doodad library browser
- Snap-to-grid toggle (hold Shift)

### Files

```
packages/products/webforge/editor/src/lib/components/map/DoodadPlacer.svelte
packages/products/webforge/editor/src/lib/components/map/DoodadLibrary.svelte
packages/products/webforge/editor/src/lib/components/map/DoodadProperties.svelte
```

### Acceptance Criteria

- Place decorations freely on map
- Scale/rotate per doodad
- Renders in 3D scene at correct position

---

## Sub-phase 2.6: Light Placement

- Drag-and-drop lights onto map from toolbar
- Light gizmo shows range/cone in editor
- Properties panel for selected light: type, color, intensity, range, cone angle, flicker, shadow on/off
- Day/night preview scrubber

### Files

```
packages/products/webforge/editor/src/lib/components/map/LightPlacer.svelte
packages/products/webforge/editor/src/lib/components/map/LightGizmo.ts
packages/products/webforge/editor/src/lib/components/map/LightProperties.svelte
packages/products/webforge/editor/src/lib/components/map/DayNightScrubber.svelte
```

### Acceptance Criteria

- Place point light and see light and shadow in scene
- Adjust color/intensity and see updates live
- Day/night scrubber changes ambient

---

## Sub-phase 2.7: Map Properties Panel

- Map name, display name, width, height, tileset assignment
- BGM, BGS selection with preview play
- Encounter list (enemy troop + rate)
- Parallax background settings
- Post-processing overrides per map
- Fog settings (color, near, far, density)
- Battle system override per map (can force ABS on specific maps)
- Scroll type (none, loop horizontal, loop vertical, both)

### Files

```
packages/products/webforge/editor/src/lib/components/map/MapProperties.svelte
packages/products/webforge/editor/src/lib/components/map/EncounterList.svelte
packages/products/webforge/editor/src/lib/components/map/ParallaxSettings.svelte
packages/products/webforge/editor/src/lib/components/map/PostProcessOverrides.svelte
```

### Acceptance Criteria

- All map properties editable
- Changes reflected in real-time preview

---

## Sub-phase 2.8: Map Tree

- Hierarchical map list
- Create, delete, duplicate, reorder maps
- Map groups/folders
- Right-click context menu
- Map preview thumbnails

### Files

```
packages/products/webforge/editor/src/lib/components/map/MapTree.svelte
packages/products/webforge/editor/src/lib/components/map/MapTreeNode.svelte
```

### Acceptance Criteria

- Navigate between maps
- Create new maps
- Reorder via drag

---

## Sub-phase 2.9: Undo/Redo System

- Command pattern: every editor action produces an undoable command
- Unlimited undo stack (configurable max)
- Action history panel showing named actions
- Group actions (e.g., multi-tile paint = one undo step)

### Files

```
packages/products/webforge/editor/src/lib/stores/history.ts               # Undo/redo stack with command pattern
packages/products/webforge/editor/src/lib/components/shared/HistoryPanel.svelte
```

### Acceptance Criteria

- Ctrl+Z undoes any action
- Ctrl+Y redoes
- History panel shows all actions

---

## Sub-phase 2.10: Minimap

- Small overview of entire map in corner of editor
- Click to navigate
- Shows player spawn point, events, regions

### Files

```
packages/products/webforge/editor/src/lib/components/map/EditorMinimap.svelte
```

### Acceptance Criteria

- Minimap shows overview of entire map
- Click to navigate to a location
- Spawn point, events, and regions visible

---

## Test Plan (Skeleton)

### Schema Tests

- EditorStateSchema: validate active tab enum, selected tool enum, current map ID
- PreferencesSchema: validate theme enum (dark/light), panel size bounds, recent projects array
- HistoryCommandSchema: validate command type, payload shape, inverse operation

### Logic Tests

- Flood fill algorithm: given a tile grid, fill from a start point and verify boundary stops
- Rectangle tool: given two corner coordinates, verify all enclosed tiles are modified
- Height brush falloff: given a radius and strength, verify height values taper correctly at edges
- Eyedropper sampling: given a click position and layer, verify the correct tile ID is returned
- Undo/redo stack: push commands, undo N steps, redo M steps, verify state at each point
- Command grouping: multi-tile paint produces a single undo entry that reverts all tiles
- Map tree reorder: move a node within the hierarchy and verify parent/child relationships update

### Component Tests (Svelte)

- Sidebar: renders with correct tabs, clicking a tab emits the correct event
- Toolbar: renders tool buttons, selecting a tool updates editor store
- ResizablePanel: drag handle adjusts panel width/height within min/max bounds
- TabBar: switching tabs updates active tab state
- TilePalette: clicking a tile selects it, rectangular selection returns correct tile IDs
- TilesetSelector: switching tileset tab loads correct tileset image
- LayerPanel: toggling layer visibility emits correct event
- MapTree: creating/deleting/duplicating maps updates tree state
- MapTreeNode: expand/collapse works, context menu opens on right-click
- HistoryPanel: displays action names in chronological order, clicking an entry jumps to that state
- DayNightScrubber: dragging slider updates time-of-day value within 0.0-24.0

### Store Tests

- editor store: setting active tab, selected tool, selection rectangle
- prefs store: toggling theme, persisting panel sizes
- history store: push/undo/redo/clear operations, max stack size enforcement

### Integration Tests

- BabylonViewport mount/unmount: verify no WebGL context leaks after multiple mount/unmount cycles
- Editor camera vs. game camera: verify editor camera changes do not affect stored game camera config
- Tile paint to renderer: paint a tile via PencilTool, verify the tilemap-renderer mesh updates

### Visual Verification

- Resizable panels resize smoothly without layout jitter
- Dark theme has correct contrast and readability
- Tile palette displays tileset image with correct grid alignment
- Height brush raises terrain visually in the 3D viewport
- Light gizmo shows accurate range/cone representation
- Grid overlay aligns with tile boundaries in the 3D scene
- Map tree drag-and-drop reordering animates smoothly
- Minimap accurately reflects the full map layout
