# WebForge RPG — Master Implementation Plan

## Session Rules

- **NEVER** read `PLAN.md` in full — it's 33K+ tokens and will blow the context window
- **Always** read this file first, then the specific `plans/phase-XX.md` for the current work
- **Each session:** this file + ONE phase file maximum
- **Two-stage workflow:** Extract (done) → Expand with research/questions → Implement with TDD
- **File naming:** kebab-case per CLAUDE.md (NOT PascalCase from original spec)
- **Path prefix:** `packages/products/webforge/` for editor, runtime

---

## Phase Status Tracker

### Phase 1: Babylon.js HD-2D Renderer — `phase-01-renderer.md`
- [ ] 1.1 Monorepo scaffold (DONE — already built)
- [x] 1.2 Babylon.js scene setup (engine, camera, render loop)
- [x] 1.3 Tilemap renderer (geometry, autotile, cliffs, instancing)
- [x] 1.4 Post-processing pipeline (bloom, DoF, color grading, SSAO)
- [x] 1.5 Lighting system (lights, shadows, day/night, flicker)

### Phase 2: SvelteKit Editor Shell + Map Editor — `phase-02-editor.md`
- [ ] 2.1 Editor layout (sidebar, toolbar, canvas, properties panel)
- [ ] 2.2 Babylon.js viewport in Svelte
- [ ] 2.3 Tile palette
- [ ] 2.4 Map paint tools
- [ ] 2.5 Doodad system
- [ ] 2.6 Light placement
- [ ] 2.7 Map properties panel
- [ ] 2.8 Map tree
- [ ] 2.9 Undo/redo system
- [ ] 2.10 Minimap

### Phase 3: Data Layer + Persistence — `phase-03-data.md`
- [ ] 3.1 Complete data schemas (Valibot)
- [ ] 3.2 DataManager + IndexedDB
- [ ] 3.3 Asset pipeline

### Phase 4: Game Map + Player + Movement — `phase-04-map-player.md`
- [ ] 4.1 Game_Map (collision, regions, terrain)
- [ ] 4.2 Game_Player + CharacterBase (8-dir pixel movement)
- [ ] 4.3 Game_Event (pages, conditions, self-switches)
- [ ] 4.4 Map transitions

### Phase 5: Event Interpreter + State Machine — `phase-05-interpreter.md`
- [ ] 5.1 Event command interpreter (stack-based VM)
- [ ] 5.2 State machine system
- [ ] 5.3 Movement system (A* pathfinding, sensors)

### Phase 6: Event Editor — `phase-06-event-editor.md`
- [ ] 6.1 Event editor panel
- [ ] 6.2 Visual flow view
- [ ] 6.3 State machine editor
- [ ] 6.4 Prefab system
- [ ] 6.5 Movement route editor
- [ ] 6.6 Global event search

### Phase 7: Database Editor — `phase-07-database.md`
- [ ] 7.1 Database shell
- [ ] 7.2 Individual tab editors (14 tabs)
- [ ] 7.3 Visual parameter curve editor
- [ ] 7.4 Damage formula sandbox
- [ ] 7.5 Trait overview panel
- [ ] 7.6 Skill tree editor
- [ ] 7.7 New database tabs (quests, recipes, achievements, etc.)

### Phase 8: Weather + Fog + Effects — `phase-08-weather.md`
- [ ] 8.1 Weather particle system
- [ ] 8.2 Fog-of-war
- [ ] 8.3 Screen-space effects

### Phase 9: Battle DTB + Action Sequences — `phase-09-battle-dtb.md`
- [ ] 9.1 Battle core (damage, elements, targeting)
- [ ] 9.2 DTB system (input, sprites, transitions)
- [ ] 9.3 Action sequence runtime
- [ ] 9.4 Action sequence editor
- [ ] 9.5 Victory aftermath

### Phase 10: Battle Systems — ATB/CTB/PTB/STB — `phase-10-battle-systems.md`
- [ ] 10.1 ATB (Active Time Battle)
- [ ] 10.2 CTB (Charge Turn Battle)
- [ ] 10.3 PTB (Press Turn Battle)
- [ ] 10.4 STB (Standard Turn Battle)

### Phase 11: ABS Mode — `phase-11-abs.md`
- [ ] 11.1 ABS core (hitboxes, real-time damage)
- [ ] 11.2 Player ABS actions (combos, dodge, hotbar)
- [ ] 11.3 ABS enemy AI (state machine, patterns)

### Phase 12: Menu System + HUD Editor — `phase-12-menus-hud.md`
- [ ] 12.1 Window system
- [ ] 12.2 Menu scenes (title, menu, item, skill, equip, etc.)
- [ ] 12.3 New menu scenes (quest, crafting, achievement, etc.)
- [ ] 12.4 HUD system
- [ ] 12.5 Visual HUD/menu editor
- [ ] 12.6 Save/load system

### Phase 13: Native Systems — `phase-13-systems.md`
- [ ] 13.1 Quest system
- [ ] 13.2 Crafting system
- [ ] 13.3 Relationship system
- [ ] 13.4 Achievement system
- [ ] 13.5 Difficulty system

### Phase 14: Equipment Enhancement — `phase-14-equipment.md`
- [ ] 14.1 Socket/augment system
- [ ] 14.2 Enhancement (+1/+2/+3)
- [ ] 14.3 Durability
- [ ] 14.4 Procedural item generation
- [ ] 14.5 Set bonuses
- [ ] 14.6 Disassembly

### Phase 15: Skill System — `phase-15-skills.md`
- [ ] 15.1 Skill tree manager
- [ ] 15.2 Cooldowns
- [ ] 15.3 Mastery
- [ ] 15.4 Stat allocation
- [ ] 15.5 TP modes

### Phase 16: AI + Enemy Scaling — `phase-16-ai.md`
- [ ] 16.1 Behavior tree runtime
- [ ] 16.2 Behavior tree editor
- [ ] 16.3 Enemy scaling + conditional drops

### Phase 17: Dialogue + VN Mode — `phase-17-dialogue.md`
- [ ] 17.1 Enhanced message window
- [ ] 17.2 Character busts
- [ ] 17.3 Dialogue history
- [ ] 17.4 Visual novel mode

### Phase 18: Character Gen + Animation + Particles — `phase-18-chargen.md`
- [ ] 18.1 Character generator
- [ ] 18.2 Animation editor
- [ ] 18.3 Particle editor + runtime

### Phase 19: Music Composer + Audio — `phase-19-music.md`
- [ ] 19.1 Piano roll sequencer
- [ ] 19.2 Instrument library + mixer
- [ ] 19.3 Spatial audio
- [ ] 19.4 Interactive/adaptive music

### Phase 20: Localization + Accessibility — `phase-20-i18n.md`
- [ ] 20.1 Localization manager
- [ ] 20.2 Accessibility manager
- [ ] 20.3 Locale import/export

### Phase 21: Mini-games + Physics — `phase-21-minigames.md`
- [ ] 21.1 Mini-game framework (fishing, rhythm, QTE, puzzle, cards, stealth)
- [ ] 21.2 Physics lite (pushable, projectile, conveyor, ice, wind, buoyancy)

### Phase 23: Export + Docs + Sample — `phase-23-export.md`
- [ ] 23.1 Web/desktop/mobile export
- [ ] 23.2 Debug console + overlay
- [ ] 23.3 Playtest from editor
- [ ] 23.4 Sample game
- [ ] 23.5 Documentation site

### Phase 24: Input System + Controller Support — `phase-24-input.md`
- [ ] 24.1 Input action map schema
- [ ] 24.2 Keyboard + mouse input provider
- [ ] 24.3 Gamepad input provider
- [ ] 24.4 Touch input provider (virtual joystick, gestures)
- [ ] 24.5 Input manager (context switching, action dispatch, input buffering)
- [ ] 24.6 Input settings persistence (rebindable controls, preset profiles)

### Phase 25: RPG Maker Import/Compatibility Layer — `phase-25-rpgmaker-import.md`
- [ ] 25.1 MV/MZ importer (JSON database/maps, tileset conversion, asset mapping)
- [ ] 25.2 VX Ace importer (Ruby Marshal decoder, RGSS3 data mapping)
- [ ] 25.3 XP importer (RGSS1 data, 4-dir to 8-dir sprite conversion)
- [ ] 25.4 2003 importer (LDB/LMU/LMT binary decoder, chipset conversion)
- [ ] 25.5 Event command translator (RPG Maker → WebForge interpreter commands)
- [ ] 25.6 Import wizard UI (format detection, preview, conflict resolution)

### Phase 26: Desktop + Mobile Application (Capacitor) — `phase-26-desktop-mobile.md`
- [ ] 26.1 Capacitor project setup (config, native platforms, build pipeline)
- [ ] 26.2 Desktop shell — Electron (native menus, window management, dialogs)
- [ ] 26.3 Mobile shell — iOS + Android (touch UI, safe areas, orientation)
- [ ] 26.4 Native file system (project open/save, file watcher, auto-save)
- [ ] 26.5 Auto-updater + distribution (code signing, packaging, app stores)
- [ ] 26.6 Game export targets (standalone desktop/mobile apps for players)

### Phase 27: VFX + Particle Engine — `phase-27-vfx-particles.md`
- [ ] 27.1 GPU particle system core (compute shaders, emitter shapes, lifetime modules)
- [ ] 27.2 Sprite sheet animation (atlas, blend modes, billboard modes)
- [ ] 27.3 Spell/skill effects (effect sequencing, pre-built templates)
- [ ] 27.4 Screen effects (shake, flash, fade, chromatic aberration, radial blur)
- [ ] 27.5 Trail renderer (ribbon, tube, fading trails)
- [ ] 27.6 Environmental particles (dust motes, fireflies, leaves, embers, bubbles)

---

## Dependency Graph

```
Phase 1 (Renderer) ──────────────────────────────────────┐
    │                                                     │
Phase 24 (Input System) ◄── Phase 1                      │
    │                                                     │
Phase 2 (Editor Shell) ──── Phase 6 (Event Editor) ──────┤
    │                           │                         │
Phase 3 (Data Layer) ────── Phase 7 (Database Editor) ────┤
    │                                                     │
Phase 4 (Map + Player) ◄── Phase 24 (Input)              │
    │                                                     │
Phase 4 ──── Phase 5 (Interpreter) ──────────────────────┤
    │                           │                         │
    │                       Phase 8 (Weather/Fog) ◄── 27  │
    │                                                     │
    └── Phase 9 (Battle DTB) ── Phase 10 (ATB/CTB/PTB) ──┤
            │                                             │
            └── Phase 11 (ABS) ───────────────────────────┤
                                                          │
Phase 12 (Menus/HUD) ────────────────────────────────────┤
Phase 13-21 (all need Phase 5) ──────────────────────────┤
Phase 22 (Plugin API) ───────────────────────────────────┤
                                                          │
Phase 23 (Export/Docs/Sample) ◄───────────────────────────┤
                                                          │
Phase 25 (RPG Maker Import) ◄── Phase 3 + 5 + 2          │
Phase 26 (Desktop/Mobile) ◄── Phase 2 + 23               │
Phase 27 (VFX/Particles) ◄── Phase 1                     │
```

**Critical path:** Phase 1 → 24 (Input) → 4 → 5 → 9 → 11

**Can start early (parallel):**
- Phase 2 (Editor Shell) alongside Phase 1
- Phase 3 (Data Layer) alongside Phase 1
- Phase 24 (Input System) once Phase 1 done (blocks Phase 4)
- Phase 27 (VFX/Particles) once Phase 1 done
- Phase 6 (Event Editor) once Phase 2 done
- Phase 7 (Database Editor) once Phase 2 done
- Phases 12-21 once Phase 5 done
- Phase 25 (RPG Maker Import) once Phases 2, 3, 5 done
- Phase 26 (Desktop/Mobile) once Phase 2 done, 26.6 needs Phase 23

---

## File Naming Conventions

- **kebab-case** for all `.ts` files: `engine.ts`, `camera-controller.ts`, `tile-geometry.ts`
- **PascalCase** for Svelte components: `MapCanvas.svelte`, `TilePalette.svelte`
- **camelCase** for variables and functions
- **SCREAMING_SNAKE_CASE** for constants
- **PascalCase** for types derived from Valibot schemas

---

## Testing Strategy

Every phase uses TDD with four test categories:
1. **Schema tests** — Valibot schema validation (valid/invalid inputs)
2. **Logic tests** — Pure function math/algorithms
3. **Integration tests** — Headless Babylon.js (NullEngine) or Svelte component tests where applicable
4. **Visual verification** — Dev server for rendering checks (not automated)

---

## Resource Strategy

Development and testing require real game resources. All must be CC0 or CC-BY-SA (open source, redistributable). Store in `assets/` at repo root.

### Directory Structure
```
assets/
├── tilesets/          # Map tilesets (ground, walls, interiors, exteriors)
├── characters/        # Character sprite sheets (walk, idle, action)
├── battlers/          # Sideview battler sprites + enemy graphics
├── icons/             # Item, skill, status effect, equipment icons
├── ui/                # Window skins, cursors, buttons, gauges
├── audio/
│   ├── bgm/           # Background music (town, battle, dungeon, menu)
│   ├── bgs/           # Background sounds (rain, wind, crowd)
│   ├── me/            # Music effects (victory, level up, game over)
│   └── se/            # Sound effects (sword, magic, UI click, footstep)
├── fonts/             # Pixel fonts + UI fonts
├── particles/         # Particle textures (smoke, fire, sparkle, rain)
├── models/            # 3D GLTF/GLB models (trees, rocks, props)
└── LICENSES.md        # Attribution tracking for all assets
```

### Tilesets & Sprites

**Primary: LPC (Liberated Pixel Cup)** — CC-BY-SA 3.0 + GPL 3.0
- Tilesets, characters, monsters, items — one consistent art style
- Character generator: https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
- Base assets: https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles
- Curated collection: https://github.com/ElizaWy/LPC
- **Use as default "starter pack" shipped with WebForge**

**Secondary: finalbossblues OpenRTP** — Unrestricted
- RPG Maker 2K/3-style chipset format for compatibility testing
- https://finalbossblues.itch.io/openrtp-tiles

**Supplementary: CC0 packs**
- https://itch.io/game-assets/assets-cc0/free/tag-rpgmaker
- https://opengameart.org/content/cc0-resources

### Icons (Items, Skills, Status Effects)

- **OpenGameArt RPG Icons** — https://opengameart.org/content/rpg-icons-set (245 icons, 64x64)
- **OpenGameArt Pixel Items** — https://opengameart.org/content/rpg-items-pixel-art
- **itch.io CC0 Icons** — https://itch.io/game-assets/assets-cc0/tag-icons

### Audio (SFX + Music)

**Sound Effects:**
- **RPG Sound Pack (CC0)** — https://opengameart.org/content/rpg-sound-pack (sword, magic, UI, etc.)
- **50 RPG Sound Effects** — https://opengameart.org/content/50-rpg-sound-effects
- **SONNISS GameAudioGDC** — https://sonniss.com/gameaudiogdc/ (thousands of royalty-free SFX)
- **Kenney Audio** — CC0 UI audio, RPG audio, music jingles

**Music:**
- **itch.io CC0 Music** — https://itch.io/game-assets/assets-cc0/tag-music
- **OpenGameArt CC0 Music** — https://opengameart.org/content/cc0-music-0
- **EUFLUKA** — https://youfulca.com/en/music_assets/ (town, dungeon, battle BGM)
- **Pixabay RPG Music** — https://pixabay.com/music/search/rpg/ (royalty-free)

### Fonts

- **Public Pixel Font (CC0)** — https://ggbot.itch.io/public-pixel-font (8x8 bitmap, multi-language)
- **Good Neighbors (CC0)** — https://opengameart.org/content/good-neighbors-pixel-font (crisp pixel scaling)
- **OpenGameArt CC0 Fonts** — https://opengameart.org/content/cc0-fonts
- **itch.io Pixel Fonts** — https://itch.io/game-assets/tag-pixel-font

### 3D Models (for GLTF/GLB import testing)

- **Kenney Assets (CC0)** — https://kenney.nl/ (nature, castle, furniture, hundreds of low-poly props)
- **Poly Pizza (CC0)** — https://poly.pizza/ (thousands of low-poly models)
- **glTF Sample Models** — https://github.com/KhronosGroup/glTF-Sample-Models (format testing)
- **OpenGameArt 3D Low Poly** — https://opengameart.org/content/cc0-assets-3d-low-poly

### Particle Textures

- Source from Kenney particle pack (CC0) or generate procedurally
- Simple shapes (circle, star, smoke puff) can be created as part of Phase 18

### Acquisition Timing

| Phase | Assets Needed | Source |
|-------|--------------|--------|
| 1.3 Tilemap Renderer | Tilesets (ground, walls, cliffs) | LPC + OpenRTP |
| 1.4 Post-Processing | HDR environment map | Poly Haven |
| 1.5 Lighting | — (uses engine defaults) | — |
| 2.1 Editor Shell | UI font | Public Pixel Font |
| 4.2 Game_Player | Character sprite sheets (8-dir) | LPC |
| 8.1 Weather | Particle textures (rain, snow) | Kenney / procedural |
| 9.2 DTB Battle | Battler sprites, battle BGM, SFX | LPC + OpenGameArt audio |
| 12.1 Window System | Window skin, UI cursors | LPC / CC0 UI packs |
| 17.1 Dialogue | Character bust/portrait art | LPC generator |
| 19.1 Music Composer | Instrument samples | Kenney / SONNISS |

---

## Cross-Cutting Concerns

These apply across all phases and should be addressed as they come up:

### Git Branching Strategy
- One branch per phase: `phase-01-renderer`, `phase-02-editor`, etc.
- Commit per sub-phase (e.g., commit after 1.2, another after 1.3)
- Merge to `main` when all sub-phases in a phase pass verification
- Never commit failing code to main

### Data Schema Bootstrapping
Phase 1.3 (Tilemap Renderer) needs MapData/TileData schemas, but Phase 3 officially creates all data schemas. Resolution: create **minimal bootstrap schemas** during Phase 1 for what the renderer needs (MapData, TileData, TilesetConfig). Phase 3 will expand these into the full data layer. This avoids blocking Phase 1 on Phase 3.

### Runtime Visual Test Harness
The runtime (Babylon.js) needs a standalone HTML page for visual verification — separate from the SvelteKit editor. Create a simple `packages/products/webforge/runtime/dev/index.html` + `dev.ts` that:
- Loads a test map JSON
- Renders with the Babylon.js engine
- Has basic camera controls
- Serves via a simple Vite dev server config

### Error Domains (Already Done)
All 17 error domains exist in `packages/shared/schemas/result/src/result.ts`:
VALIDATION, CONFIG, AUTH, DB, IO, HTTP, RUNTIME, RESOURCE, ENCODING, FUNCTION, LOCALE, TEMPLATE, SCENE, PLUGIN, PROJECT, ASSET, INTERNAL.
New error codes can be added to existing domains as needed — no setup required.

### Svelte 5 State Management Pattern
The editor has zero state management currently. When Phase 2 begins:
- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for component-local state
- Use **class-based stores with runes** for shared editor state (project, selection, tools, history)
- Do NOT use legacy Svelte 4 `writable`/`readable` stores
- Decision to finalize during Phase 2 expansion

### Babylon.js Version
Runtime has `@babylonjs/core@8.52.1` installed. During Phase 1 expansion, verify this is still latest and check for NullEngine headless testing support.

---

## Per-Phase Completion Checklist

After implementation of each phase, ALWAYS:

1. **Tests pass:** `pnpm qa:test`
2. **Types clean:** `pnpm -w run qa:lint --tools`
3. **Lint clean:** `pnpm qa:lint`
4. **Format clean:** `pnpm qa:format:check`
5. **Architecture README:** Write a README in the phase's primary package directory documenting:
   - What was built and why
   - Architecture overview (modules, data flow, key abstractions)
   - Public API surface (exported functions, schemas, types)
   - Usage examples
   - Testing approach and how to run tests
   - Known limitations or future work
6. **Update master.md:** Check off completed sub-phases in the status tracker
