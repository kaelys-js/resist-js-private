# Phase 6: Event Editor

**Status:** Not started
**Dependencies:** Phase 5 (Event Interpreter + State Machine)
**Estimated weeks:** 2 (Weeks 13-14)

## Goal

Create and edit events in the editor. All commands accessible. Visual flow view works.

---

## Sub-phase 6.1: Event Editor Panel

- Double-click event on map to open event editor
- Page tabs with conditions per page
- Command list with add/edit/delete
- Command picker: categorized command browser with search
- Parameter forms for each command (typed inputs, dropdowns, file pickers)
- Drag to reorder commands

### Files

```
packages/products/webforge/editor/src/lib/components/event/EventEditor.svelte
packages/products/webforge/editor/src/lib/components/event/PageEditor.svelte
packages/products/webforge/editor/src/lib/components/event/PageConditions.svelte
packages/products/webforge/editor/src/lib/components/event/CommandList.svelte
packages/products/webforge/editor/src/lib/components/event/CommandPicker.svelte
packages/products/webforge/editor/src/lib/components/event/CommandForms/
packages/products/webforge/editor/src/lib/components/event/EventProperties.svelte
```

### Acceptance Criteria

- Double-clicking an event on the map opens the event editor panel
- Page tabs display and switch between event pages
- Commands can be added, edited, deleted, and reordered via drag
- Command picker shows all commands categorized with working search
- Parameter forms render typed inputs appropriate to each command
- Event properties (name, graphic, collision, tags) are editable

---

## Sub-phase 6.2: Visual Flow View

- Flowchart rendering of event logic
- Conditional branches as diamond nodes
- Loops as back-edges
- Labels as jump targets
- Zoom and pan
- Click node to select corresponding command

### Files

```
packages/products/webforge/editor/src/lib/components/event/FlowView.svelte
packages/products/webforge/editor/src/lib/components/event/FlowNode.svelte
packages/products/webforge/editor/src/lib/components/event/flow-renderer.ts
```

### Acceptance Criteria

- Event command lists render as a flowchart with correct topology
- Conditional branches display as diamond nodes with true/false edges
- Loops display as back-edges in the graph
- Labels appear as named jump targets
- Zoom and pan work smoothly
- Clicking a flow node selects the corresponding command in the command list

---

## Sub-phase 6.3: State Machine Editor

- Visual node graph: states as rectangles, transitions as arrows
- Click state to define enter/exit/update commands
- Click transition arrow to define conditions
- Templates: Patrol NPC, Shop Keeper, Enemy, Boss

### Files

```
packages/products/webforge/editor/src/lib/components/event/StateMachineEditor.svelte
packages/products/webforge/editor/src/lib/components/event/StateNode.svelte
packages/products/webforge/editor/src/lib/components/event/TransitionArrow.svelte
```

### Acceptance Criteria

- States render as rectangles in a node graph layout
- Transitions render as arrows between states
- Clicking a state opens enter/exit/update command editors
- Clicking a transition arrow opens condition editor
- Templates (Patrol NPC, Shop Keeper, Enemy, Boss) populate a working state machine

---

## Sub-phase 6.4: Prefab System

- Save event as prefab template
- Stamp prefab instances across maps
- Edit template and all instances update (live clone behavior)
- Prefab library browser

### Files

```
packages/products/webforge/editor/src/lib/components/event/PrefabLibrary.svelte
packages/products/webforge/editor/src/lib/io/prefab-manager.ts
```

### Acceptance Criteria

- An event can be saved as a prefab template
- Prefab instances can be stamped onto any map
- Editing the prefab template propagates changes to all instances
- Prefab library browser lists all templates with search/filter
- Instances can override specific properties without breaking the template link

---

## Sub-phase 6.5: Movement Route Editor

- Draw path directly on map canvas
- Waypoints as draggable handles
- Speed/wait per segment
- Preview playback
- Record mode: walk the route live, it records

### Files

```
packages/products/webforge/editor/src/lib/components/event/MovementRouteEditor.svelte
packages/products/webforge/editor/src/lib/components/event/route-recorder.ts
```

### Acceptance Criteria

- Clicking on the map canvas adds waypoints to the route
- Waypoints are draggable to adjust positions
- Speed and wait values are configurable per segment
- Preview playback animates the event along the route
- Record mode captures live movement as a route

---

## Sub-phase 6.6: Global Event Search

- Search across all maps by: command type, text content, variable/switch references, event name
- Results with map name, event name, page number, line number
- Click result to navigate to that event

### Files

```
packages/products/webforge/editor/src/lib/components/shared/GlobalSearch.svelte
packages/products/webforge/editor/src/lib/io/event-search-index.ts
```

### Acceptance Criteria

- Search by command type returns all events using that command
- Search by text content matches command parameters and text strings
- Search by variable/switch reference finds all usages across all maps
- Search by event name matches partial names
- Results display map name, event name, page number, and line number
- Clicking a result navigates to and selects the target event

---

## Test Plan (Skeleton)

### Schema Tests

- EventPage schema validates conditions, command arrays, and graphic references
- PrefabTemplate schema validates template metadata and command structure
- MovementRoute schema validates waypoint coordinates, speed, and wait values
- SearchQuery schema validates search type, query string, and filter options

### Logic Tests

- Flow renderer: linear command list produces a straight-line graph
- Flow renderer: conditional branch produces a diamond node with two outgoing edges
- Flow renderer: nested conditionals produce correct hierarchical diamond nodes
- Flow renderer: loop commands produce back-edges to the loop start
- Flow renderer: label/jump commands produce edges to named targets
- Prefab CRUD: creating a prefab stores the template with a unique ID
- Prefab CRUD: stamping a prefab creates an instance linked to the template ID
- Prefab CRUD: editing a template updates all linked instances
- Prefab CRUD: deleting a template warns about orphaned instances
- Search index: indexing a map registers all events, commands, and references
- Search index: querying by command type returns correct matches
- Search index: querying by variable reference finds all usages
- Search index: re-indexing after event edit updates results correctly
- Route recorder: recorded waypoints match the walked path within tolerance

### Integration Tests

- EventEditor + CommandPicker: selecting a command from picker adds it to the command list
- EventEditor + FlowView: selecting a flow node highlights the command in the list
- StateMachineEditor + runtime StateMachine: editor-created state machine runs in runtime
- PrefabLibrary + map canvas: stamping a prefab places a visible event on the map
- GlobalSearch + navigation: clicking a search result opens the correct map and selects the event

### Visual Verification

- Event editor panel renders with correct layout and page tabs
- Flow view renders a readable flowchart for a complex multi-branch event
- State machine editor displays states and transitions in a clear node graph
- Movement route editor draws a visible path with draggable waypoints on the map
- Command picker categories are readable and searchable
