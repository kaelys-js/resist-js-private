# Phase 3: Data Layer + Persistence

**Status:** Not started
**Dependencies:** Phase 1 (schemas for renderer data), Phase 2 (editor needs data to save/load)
**Estimated weeks:** 1

## Goal

All data types defined. Save/load to IndexedDB. Import/export JSON files.

---

## Sub-phase 3.1: Complete Valibot Data Schemas

- Every data type as Valibot schema with `v.strictObject()` in `packages/shared/`
- MapData, EventData, EventPage, EventCommand
- Actor, Class, Skill, Item, Weapon, Armor, Enemy, Troop, State, Animation
- Tileset, CommonEvent, SystemData
- Quest, Recipe, Achievement, Relationship
- BehaviorTree, ActionSequence, SkillTree
- MiniGame, DifficultyPreset, LocaleStrings

### Files

```
packages/shared/schemas/map/map.ts
packages/shared/schemas/event/event.ts
packages/shared/schemas/database/database.ts          # Actors, classes, skills, items, weapons, armors
packages/shared/schemas/enemy/enemy.ts                # Enemy, Troop, BehaviorTree
packages/shared/schemas/battle/battle.ts              # ActionSequence, BattleSystem config
packages/shared/schemas/systems/systems.ts            # Quest, Recipe, Achievement, Relationship, Difficulty
packages/shared/schemas/ui/ui.ts                      # HUD layout, Menu layout, Window skin
packages/shared/schemas/audio/audio.ts                # MusicComposition, MixerConfig
packages/shared/schemas/project/project.ts            # ProjectData (root type containing everything)
```

### Acceptance Criteria

- All data structures have Valibot schemas with `v.strictObject()`
- No `any` types
- Full autocomplete in IDE
- `v.InferOutput` types used everywhere (no manual TypeScript interfaces for data)

---

## Sub-phase 3.2: DataManager + IndexedDB

- DataManager class: load, save, create new project
- IndexedDB via `idb` library for browser persistence
- Auto-save every N seconds with dirty tracking
- Export project as `.webforge` file (ZIP of all JSON + assets)
- Import project from `.webforge` file
- Recent projects list

### Files

```
packages/products/webforge/editor/src/lib/io/data-manager.ts
packages/products/webforge/editor/src/lib/io/indexed-db-store.ts
packages/products/webforge/editor/src/lib/io/project-exporter.ts
packages/products/webforge/editor/src/lib/io/project-importer.ts
packages/products/webforge/editor/src/lib/io/asset-manager.ts          # Image/audio file storage
packages/products/webforge/editor/src/lib/stores/project.ts            # Svelte writable store wrapping DataManager
```

### Acceptance Criteria

- Create project, save to IndexedDB, reload page, and project persists
- Export/import `.webforge` files work correctly

---

## Sub-phase 3.3: Asset Pipeline

- Import images (tilesets, character sprites, battlers, faces, pictures)
- Import audio (BGM, BGS, ME, SE)
- Import 3D models (GLTF/GLB)
- Asset browser in editor with preview
- Assets stored as blobs in IndexedDB

### Files

```
packages/products/webforge/editor/src/lib/components/shared/AssetBrowser.svelte
packages/products/webforge/editor/src/lib/components/shared/AssetImporter.svelte
packages/products/webforge/editor/src/lib/io/asset-storage.ts
```

### Acceptance Criteria

- Import image/audio/3D model assets into a project
- Asset browser displays all imported assets with previews
- Assets persist across page reloads via IndexedDB

---

## Test Plan (Skeleton)

### Schema Tests

- MapDataSchema: valid map with all required fields passes; missing fields, wrong types, extra keys all rejected
- EventDataSchema: valid event with pages array passes; empty pages array rejected; invalid command codes rejected
- ActorSchema: valid actor passes; stat values outside valid ranges rejected
- ClassSchema: valid class with learning list passes; duplicate skill IDs in learning list caught
- SkillSchema: valid skill passes; negative MP cost rejected
- ItemSchema: valid item passes; scope enum validated
- WeaponSchema / ArmorSchema: valid equipment passes; invalid trait codes rejected
- EnemySchema / TroopSchema: valid enemy passes; troop member references validated
- TilesetSchema: valid tileset passes; passage flags match tile count
- SystemDataSchema: valid system config passes; starting party references valid actor IDs
- ProjectDataSchema: full project round-trips through safeParse without data loss
- QuestSchema / RecipeSchema / AchievementSchema: valid entries pass; invalid reward references rejected

### Logic Tests

- DataManager dirty tracking: modify data, verify dirty flag is set; save, verify dirty flag is cleared
- Auto-save timer: set auto-save interval, modify data, verify save is called after interval elapses
- Project export: create a project with maps and assets, export to .webforge, verify ZIP contains correct JSON structure and asset blobs
- Project import: import a .webforge file, verify all data and assets are restored to IndexedDB
- Asset deduplication: import the same image twice, verify only one blob is stored
- Recent projects list: create multiple projects, verify recent list is ordered by last-modified and capped at max length

### Integration Tests (IndexedDB)

- Create a new project, save to IndexedDB, read back, verify all data matches via schema validation
- Update a map in a saved project, re-save, read back, verify only the changed map is different
- Delete a project from IndexedDB, verify it is no longer retrievable
- Import a .webforge file, verify the project appears in IndexedDB and the recent projects list
- Store an image blob as an asset, retrieve it, verify byte-level equality
- Store an audio blob as an asset, retrieve it, verify byte-level equality
- Concurrent saves: trigger two rapid saves, verify no data corruption or IndexedDB transaction conflicts

### Visual Verification

- Asset browser displays imported images at correct aspect ratios
- Asset browser plays audio preview when clicking an audio asset
- 3D model assets show a rotating preview in the asset browser
- Project export produces a downloadable .webforge file of reasonable size
- Reloading the page after saving shows the project exactly as it was left
