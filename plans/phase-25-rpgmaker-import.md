# Phase 25: RPG Maker Import/Compatibility Layer

Full import pipeline for RPG Maker projects across all major versions: MV/MZ (JSON), VX Ace (Ruby Marshal/RGSS3), XP (RGSS1), and 2003 (binary LDB/LMU/LMT). Includes event command translation to WebForge's interpreter format and an import wizard UI in the editor.

**Package:** `@webforge/runtime` (format decoders, data mapping) + `@webforge/editor` (import wizard UI)

---

## 25.1 MV/MZ Importer

JSON-based formats — the most straightforward to parse.

### Files
- `packages/products/webforge/runtime/src/import/mv-mz/database-parser.ts` — Parse MV/MZ JSON database files (Actors.json, Items.json, etc.)
- `packages/products/webforge/runtime/src/import/mv-mz/map-parser.ts` — Parse MapXXX.json files (tile data, events, parallax)
- `packages/products/webforge/runtime/src/import/mv-mz/tileset-converter.ts` — Convert MV/MZ tileset format (A1-A5, B-E sheets) to WebForge tileset format
- `packages/products/webforge/runtime/src/import/mv-mz/asset-mapper.ts` — Map MV/MZ asset paths (img/, audio/) to WebForge asset structure
- `packages/products/webforge/runtime/src/import/mv-mz/*.test.ts` — Tests for each module

### Data Mapping
- **System.json** → WebForge project config (title, starting map, party, vehicles, etc.)
- **Actors.json** → Actor database entries
- **Classes.json** → Class database entries (parameters, learnings, traits)
- **Items.json / Weapons.json / Armors.json** → Item database entries with category mapping
- **Skills.json** → Skill database entries (scopes, damage formulas, effects)
- **Enemies.json / Troops.json** → Enemy database + encounter groups
- **States.json** → Status effect database
- **Tilesets.json** → Tileset configs (flags, terrain tags, passage)
- **MapInfos.json** → Map tree structure
- **MapXXX.json** → Map data (width, height, tile layers, events, parallax, BGM/BGS)
- **CommonEvents.json** → Shared event commands

### MV vs MZ Differences
- MZ uses `effekseer` for particle effects (map to WebForge VFX)
- MZ has `TextManager` customization (map to WebForge locale)
- MZ event commands are mostly identical to MV with minor additions
- MZ has additional plugin commands format (`PluginCommand` vs MV's plugin command string)

---

## 25.2 VX Ace Importer

Ruby Marshal binary format decoder for RGSS3 data.

### Files
- `packages/products/webforge/runtime/src/import/vx-ace/marshal-decoder.ts` — Ruby Marshal binary format parser
- `packages/products/webforge/runtime/src/import/vx-ace/rgss3-types.ts` — Type definitions for RPG Maker VX Ace Ruby objects
- `packages/products/webforge/runtime/src/import/vx-ace/database-parser.ts` — Parse .rvdata2 database files
- `packages/products/webforge/runtime/src/import/vx-ace/map-parser.ts` — Parse MapXXX.rvdata2
- `packages/products/webforge/runtime/src/import/vx-ace/tileset-converter.ts` — VX Ace tileset format (A1-A5, B-E, different autotile layout than MV)
- `packages/products/webforge/runtime/src/import/vx-ace/*.test.ts`

### Ruby Marshal Format
- Binary format: type tags + data
- Types: nil, true, false, Fixnum, Float, String, Symbol, Array, Hash, Object (instance variables), UserDef, Data
- RPG Maker objects stored as Ruby `RPG::Actor`, `RPG::Map`, etc. with `@instance_variable` naming
- Need to map Ruby class names to WebForge schemas
- Handle encoding: Ruby strings can be UTF-8, Shift_JIS, or ASCII-8BIT

### VX Ace Specifics
- 3-layer tile map (same as MV/MZ)
- Different autotile layout from MV (A1 water tiles differ)
- Ace-specific features: Vocab customization, vehicles, airship
- RGSS3 script system → not imported (too Ruby-specific), but script-created data can be detected

---

## 25.3 XP Importer

RGSS1 data structures with 3-layer tilemap and 4-direction sprites.

### Files
- `packages/products/webforge/runtime/src/import/xp/database-parser.ts` — Parse .rxdata files (uses same Marshal format as VX Ace)
- `packages/products/webforge/runtime/src/import/xp/map-parser.ts` — Parse MapXXX.rxdata
- `packages/products/webforge/runtime/src/import/xp/tileset-converter.ts` — XP tileset format (single-sheet tilesets, different from MV/VX)
- `packages/products/webforge/runtime/src/import/xp/sprite-converter.ts` — 4-direction to 8-direction sprite sheet conversion
- `packages/products/webforge/runtime/src/import/xp/*.test.ts`

### XP Specifics
- **Tileset format:** Single-sheet tilesets (not A1-E split). Top rows are autotiles, bottom is regular tiles.
- **Map layers:** 3 tile layers (same concept, different encoding)
- **Sprites:** 4-direction only (down, left, right, up) × 4 frames. Need to generate 8-direction from 4-direction (interpolation or duplication for diagonals).
- **Events:** Similar command structure to MV but with differences in command codes and parameters
- **Audio:** MIDI support for BGM (WebForge uses Web Audio — need to note MIDI files can't be imported, only WAV/OGG/MP3)

---

## 25.4 2003 Importer

LDB/LMU/LMT binary format decoder for RPG Maker 2003 projects.

### Files
- `packages/products/webforge/runtime/src/import/rm2k3/ldb-decoder.ts` — LDB (database) binary format parser
- `packages/products/webforge/runtime/src/import/rm2k3/lmu-decoder.ts` — LMU (map) binary format parser
- `packages/products/webforge/runtime/src/import/rm2k3/lmt-decoder.ts` — LMT (map tree) binary format parser
- `packages/products/webforge/runtime/src/import/rm2k3/chipset-converter.ts` — Chipset to tileset conversion
- `packages/products/webforge/runtime/src/import/rm2k3/charset-converter.ts` — CharSet sprite sheet conversion
- `packages/products/webforge/runtime/src/import/rm2k3/*.test.ts`

### Binary Format
- **LDB:** Variable-length integer encoding (7-bit chunks), nested chunks with type + size headers
- **LMU:** Similar chunk-based format for map data (tile layers, events, parallax)
- **LMT:** Map tree structure with parent/child relationships, map ordering
- All use a custom binary serialization — NOT Ruby Marshal
- Encoding: Shift_JIS for Japanese projects, varies for international versions

### 2003 Specifics
- **Chipsets:** 480×256 tilesets with autotile in top section, regular tiles below. Very different layout from MV.
- **CharSets:** 288×256 sprite sheets, 8 characters per sheet, 3 frames × 4 directions
- **Events:** Different command code numbering from MV/XP. Many 2003-specific commands (vehicle commands, battle events, etc.)
- **Battle system:** Front-view (2003) vs side-view (Ace/MV). Import as front-view config.
- **Panorama/Fog:** Background parallax + fog layers per map

---

## 25.5 Event Command Translator

Maps RPG Maker event commands to WebForge interpreter commands (Phase 5).

### Files
- `packages/products/webforge/runtime/src/import/command-translator.ts` — Core translation engine
- `packages/products/webforge/runtime/src/import/command-maps/mv-mz-commands.ts` — MV/MZ command code mapping
- `packages/products/webforge/runtime/src/import/command-maps/xp-commands.ts` — XP command code mapping
- `packages/products/webforge/runtime/src/import/command-maps/rm2k3-commands.ts` — 2003 command code mapping
- `packages/products/webforge/runtime/src/import/command-translator.test.ts`

### Translation Approach
- Each RPG Maker version has numbered command codes (e.g., MV code 101 = Show Text)
- Build a mapping table per version: `{ code: number, translator: (params, context) => WebForgeCommand[] }`
- Some commands map 1:1, some expand (e.g., Show Choices → multiple WebForge commands)
- Some commands have no equivalent → generate a comment/placeholder command with original data preserved
- Conditional branches, loops, and label/goto need scope tracking during translation

### Command Categories
- **Message:** Show Text, Show Choices, Input Number, Select Item → WebForge dialogue commands
- **Flow:** Conditional Branch, Loop, Break, Label, Goto → WebForge control flow
- **Game:** Change Gold, Change Items, Change Party → WebForge state mutation commands
- **Character:** Set Move Route, Transfer Player, Change Transparency → WebForge character commands
- **Picture:** Show/Move/Erase Picture → WebForge picture commands
- **Audio:** Play BGM/BGS/ME/SE, Fade → WebForge audio commands
- **Scene:** Battle Processing, Shop Processing, Name Input → WebForge scene commands
- **System:** Change Window Skin, Change Battle BGM → WebForge config commands
- **Plugin:** Plugin commands → preserved as metadata, user maps manually

### Unsupported Commands
- Ruby script calls (Ace `Script:` command) → preserved as comments with original code
- Engine-specific commands with no WebForge equivalent → placeholder with warning

---

## 25.6 Import Wizard UI

SvelteKit import flow in the editor.

### Files
- `packages/products/webforge/editor/src/routes/import/+page.svelte` — Import wizard page
- `packages/products/webforge/editor/src/lib/components/import/FormatDetector.svelte` — Auto-detect project format
- `packages/products/webforge/editor/src/lib/components/import/ImportPreview.svelte` — Preview what will be imported
- `packages/products/webforge/editor/src/lib/components/import/ConflictResolver.svelte` — Handle naming conflicts, missing assets
- `packages/products/webforge/editor/src/lib/components/import/ImportProgress.svelte` — Progress bar + log

### Wizard Steps
1. **Select project** — File picker or drag-and-drop a project folder
2. **Format detection** — Auto-detect version (MV/MZ by package.json/System.json, Ace by .rvproj2, XP by .rxproj, 2003 by RPG_RT.ldb)
3. **Preview** — Show what will be imported: map count, actor count, item count, asset file count, estimated size
4. **Configuration** — Options: import all vs selective, asset quality settings, name conflict strategy (rename, overwrite, skip)
5. **Import** — Progress bar, per-file status, warnings/errors log
6. **Summary** — What was imported, what failed, what needs manual attention

---

## Dependencies

- **Requires:** Phase 3 (data schemas — target format for imported data), Phase 5 (interpreter — target for event command translation), Phase 2 (editor — for import wizard UI)
- **Consumed by:** End users importing existing RPG Maker projects

## Testing Strategy

1. **Schema tests** — Import config validation, format detection schema
2. **Logic tests** — Binary format decoding (Marshal, LDB/LMU), tileset coordinate math, command code translation mapping, sprite sheet geometry calculations
3. **Integration tests** — Parse sample project files (create minimal test fixtures for each format), verify round-trip: RPG Maker data → WebForge schema → valid output
4. **Visual verification** — Import a sample RPG Maker MV project in the editor, verify maps render correctly with converted tilesets
