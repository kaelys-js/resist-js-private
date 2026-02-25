# Phase 22: Plugin API + Marketplace

**Status:** Not started
**Dependencies:** All prior phases (this is the extension layer that hooks into every subsystem)
**Estimated weeks:** 2 (Weeks 44-45)

## Goal

Stable plugin SDK with lifecycle management, hook-based extensibility into all runtime and editor subsystems, sandboxed execution, dependency resolution, and a marketplace client for browsing, downloading, and rating community plugins.

---

## Sub-phase 22.1: Plugin Base Class + Hooks

- Base class for all plugins with standard lifecycle (load, unload, enable, disable)
- Lifecycle hooks for runtime events (onMapLoad, onBattleStart, onSave, onLoad, etc.)
- Hook registration with priority ordering and cancellation support
- Plugin manifest schema: name, version, author, dependencies, compatibility range

### Files

```
packages/products/webforge/plugin-api/src/plugin-base.ts
packages/products/webforge/plugin-api/src/plugin-hooks.ts
packages/products/webforge/plugin-api/src/plugin-manifest.ts
```

### Acceptance Criteria

- Plugin base class provides load, unload, enable, and disable lifecycle methods
- Hooks fire at correct runtime events (onMapLoad, onBattleStart, onSave, onLoad)
- Hook registration supports priority ordering (lower number = earlier execution)
- Hooks support cancellation to prevent default behavior
- Plugin manifest schema validates name, version, author, dependencies, and compatibility fields

---

## Sub-phase 22.2: UI Extensions

- Plugins can add custom fields to database editors
- Plugins can register custom menu commands in the editor
- Extension points for custom tool panels and inspector sections

### Files

```
packages/products/webforge/plugin-api/src/plugin-ui-extension.ts
```

### Acceptance Criteria

- Plugins can register custom fields that appear in database editor forms
- Plugins can add menu commands to the editor menu bar
- Custom tool panels render in the editor sidebar
- Custom inspector sections render in the property inspector
- UI extensions unregister cleanly when plugin is disabled or unloaded

---

## Sub-phase 22.3: Plugin Manager

- Load plugins from manifest, resolve dependency graph, detect conflicts
- Sandboxed execution environment to isolate plugin code
- Enable/disable plugins at runtime without restart
- Error isolation: plugin crash does not take down host application

### Files

```
packages/products/webforge/runtime/src/managers/plugin-manager.ts
```

### Acceptance Criteria

- Plugin manager loads plugins from manifest files
- Dependency graph resolves correctly and loads plugins in dependency order
- Circular dependencies are detected and reported as errors
- Conflicting plugins (same hook, incompatible versions) are detected and reported
- Sandboxed execution prevents plugins from accessing host globals directly
- Plugin can be enabled and disabled at runtime without application restart
- Plugin crash is caught and isolated; host application continues running
- Plugin manager returns Result<T> for all operations

---

## Sub-phase 22.4: Marketplace Client + Editor UI

- Browse, search, and filter community plugins
- Download and install plugins from marketplace
- Rate and review plugins
- Editor UI: plugin browser panel and per-plugin configuration panel

### Files

```
packages/products/webforge/editor/src/lib/io/marketplace-client.ts
packages/products/webforge/editor/src/lib/components/shared/PluginBrowser.svelte
packages/products/webforge/editor/src/lib/components/shared/PluginConfig.svelte
```

### Acceptance Criteria

- Marketplace client fetches plugin listings with search and filter support
- Plugin download installs to local project plugin directory
- Plugin ratings and reviews can be submitted
- PluginBrowser component displays available plugins with install/update/remove actions
- PluginConfig component displays per-plugin settings and allows runtime configuration changes
- All marketplace API calls return Result<T> with proper error handling for network failures

---

## Test Plan (Skeleton)

### Schema Tests

- PluginManifestSchema validates required fields (name, version, author)
- PluginManifestSchema validates dependency version ranges
- PluginManifestSchema rejects invalid compatibility ranges
- UIExtensionSchema validates field type, label, and target editor section
- MarketplaceListingSchema validates listing metadata (name, description, rating, download count)

### Logic Tests

- Plugin lifecycle: load -> enable -> disable -> unload transitions in correct order
- Hook registration: hooks fire in priority order (lowest number first)
- Hook cancellation: cancelled hook prevents subsequent hooks and default behavior
- Dependency resolution: plugins load in topological order of dependency graph
- Circular dependency detection: returns error for A -> B -> A cycles
- Conflict detection: two plugins registering incompatible hooks on same event return error
- Sandboxed execution: plugin code cannot access host process globals or filesystem
- Error isolation: thrown error in plugin hook is caught, logged, and does not propagate to host
- Manifest validation: missing required fields return validation error with field path
- Enable/disable at runtime: plugin state toggles without affecting other loaded plugins

### Integration Tests

- Plugin lifecycle end-to-end: install from marketplace, load, enable, trigger hook, disable, unload, remove
- UI extension rendering: plugin registers custom database field, field appears in editor, value persists in project data
- Marketplace API mocking: browse, search, download, rate operations succeed against mock API
- Multi-plugin interaction: two plugins register hooks on same event, both fire in priority order
- Plugin error recovery: plugin throws during hook, host logs error, other plugins continue

### Visual Verification

- PluginBrowser displays plugin cards with name, description, rating, and install button
- PluginConfig renders plugin-specific settings form
- Installed plugin indicator (badge/icon) distinguishes installed from available plugins
- Plugin enable/disable toggle reflects current state in UI
- Marketplace search results update as filter criteria change
