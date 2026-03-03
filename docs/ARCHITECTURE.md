# WebForge Architecture

## Overview

WebForge RPG is a web-based RPG creation suite built on Babylon.js. The project uses a pnpm monorepo managed by Turborepo, with shared packages providing foundational utilities and product packages delivering the editor, runtime engine, and plugin API.

The runtime engine renders HD-2D tile-based worlds with a full visual pipeline: GPU data texture tilemap rendering (1 draw call per layer, unlimited map size via streaming), thin-instance object renderer, 16 camera presets, day/night cycle, 3-tier fog, post-processing (12 effects), screen transitions (53 types), screen shake (18 presets), sky/parallax backgrounds, and a complete lighting system with shadows, god rays, lens flares, and glow.

## Workspace Structure

```
webforge/
├── packages/
│   ├── shared/                           Foundational libraries
│   │   ├── schemas/common/               Valibot primitive types: Str, Num, Bool, Path
│   │   ├── schemas/result/               Result<T>, AppError, ERRORS registry
│   │   ├── schemas/function/             Function schema validation
│   │   ├── schemas/generic/              Generic schema factories
│   │   ├── utils/result/                 safeParse, combinators, format, breadcrumbs
│   │   ├── utils/core/                   Logger, signal, object, environment
│   │   ├── locale/                       i18n: template, format, registry, detect
│   │   └── config/test/                  Vitest presets + test harness
│   └── products/
│       └── webforge/
│           ├── editor/                   SvelteKit + shadcn-svelte editor UI
│           ├── runtime/                  Babylon.js HD-2D game engine
│           │   ├── src/
│           │   │   ├── schemas/          Valibot config schemas (11 files)
│           │   │   ├── core/             Engine, camera, shake, Perlin, perf monitor
│           │   │   └── rendering/        All visual systems (tilemap, lighting, fog, etc.)
│           │   └── dev/                  Dev harness (visual testing UI)
│           └── plugin-api/               Plugin SDK for third-party extensions
├── docs/                                 Unified documentation
│   ├── ARCHITECTURE.md                   This file
│   ├── runtime/                          Runtime engine docs
│   ├── dev-harness/                      Dev harness usage
│   └── shared/                           Shared packages docs
└── CLAUDE.md                             AI assistant instructions
```

## Module Dependency Graph

```
                            ┌─────────────┐
                            │   runtime    │
                            │  (runtime.ts)│
                            └──────┬───────┘
                                   │ orchestrates
                    ┌──────────────┼──────────────────┐
                    │              │                   │
              ┌─────▼─────┐ ┌─────▼──────┐  ┌────────▼────────┐
              │   engine   │ │   camera   │  │  scene-setup     │
              │ (core/)    │ │ controller │  │ (rendering/)     │
              └─────┬──────┘ └─────┬──────┘  └────────┬────────┘
                    │              │                   │
                    │              │         ┌─────────┼─────────┐
                    │              │         │         │         │
              ┌─────▼──────┐      │   ┌─────▼───┐ ┌───▼────┐ ┌─▼──────────┐
              │ performance│      │   │ tilemap  │ │lighting│ │post-process│
              │  monitor   │      │   │ renderer │ │manager │ │  pipeline  │
              └────────────┘      │   └─────┬────┘ └───┬────┘ └─────┬──────┘
                                  │         │          │            │
                    ┌─────────────┘    ┌────┴────┐  ┌──┴──────┐    │
                    │                  │  chunk  │  │day/night│    │
              ┌─────▼──────┐           │ builder │  │  cycle  │    │
              │  screen    │           └────┬────┘  └─────────┘    │
              │   shake    │                │                      │
              └────────────┘           ┌────┴──────────────────────┘
                                       │
                              ┌────────┼────────────────┐
                              │        │                │
                        ┌─────▼──┐ ┌───▼─────┐  ┌──────▼──────┐
                        │  fog   │ │  sky &   │  │ transitions │
                        │manager │ │parallax  │  │   manager   │
                        └────────┘ └─────────┘  └─────────────┘
```

## Core Patterns

### Result Pattern

Every function returns `Result<T>` — the codebase never throws exceptions in normal control flow. Errors propagate via `if (!result.ok) return result;`.

```typescript
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';

const result = safeParse(EngineConfigSchema, input);
if (!result.ok) return result;
const config = result.data;
```

### Schema-Driven Configuration

All runtime systems are configured via Valibot schemas with sensible defaults. An empty `{}` input produces a fully working configuration. Per-system overrides merge on top of preset bases.

The 11 schema files define 300+ configurable fields across engine, camera, scene setup, fog (77+ options), quality, lighting, post-processing (12 effects), screen shake, transitions (53 types), sky/parallax, and map data.

### Chunk-Based Rendering

The tilemap uses a chunk-based merged geometry approach: the map is divided into 16x16 tile chunks, each becoming a single merged Babylon.js Mesh per layer. This yields one draw call per chunk per layer, with natural frustum culling and fast partial rebuilds.

## Runtime Systems

| System | Schema | Implementation | Docs |
|--------|--------|----------------|------|
| Engine | `engine-config.ts` | `core/engine.ts` | [engine.md](runtime/engine.md) |
| Camera | `camera-config.ts` | `core/camera-controller.ts` | [camera.md](runtime/camera.md) |
| Screen Shake | `screen-shake-config.ts` | `core/screen-shake.ts` | [screen-shake.md](runtime/screen-shake.md) |
| Tilemap | `map-data.ts` | `rendering/tilemap-renderer.ts` | [tilemap.md](runtime/tilemap.md) |
| Lighting | `lighting-config.ts` | `rendering/light-manager.ts` | [lighting.md](runtime/lighting.md) |
| Day/Night Cycle | `lighting-config.ts` | `rendering/day-night-cycle.ts` | [day-night-cycle.md](runtime/day-night-cycle.md) |
| Glow Layer | `lighting-config.ts` | `rendering/glow-manager.ts` | [glow-layer.md](runtime/glow-layer.md) |
| Fog | `fog-config.ts` | `rendering/fog-manager.ts` | [fog.md](runtime/fog.md) |
| Sky & Parallax | `sky-config.ts` | `rendering/sky-system.ts` | [sky-and-parallax.md](runtime/sky-and-parallax.md) |
| Post-Processing | `post-processing-config.ts` | `rendering/post-processing.ts` | [post-processing.md](runtime/post-processing.md) |
| Transitions | `transition-config.ts` | `rendering/transition-manager.ts` | [transitions.md](runtime/transitions.md) |
| Screen Effects | `scene-setup-config.ts` | `rendering/scene-setup.ts` | [screen-effects.md](runtime/screen-effects.md) |

## Shared Packages

| Package | Alias | Purpose |
|---------|-------|---------|
| `schemas/common` | `@/schemas/common` | Valibot primitive types (Str, Num, Bool, Path) |
| `schemas/result` | `@/schemas/result` | Result pattern, AppError, ERRORS registry |
| `schemas/function` | `@/schemas/function` | Function schema validation |
| `schemas/generic` | `@/schemas/generic` | Generic schema factories |
| `utils/result` | `@/utils/result` | safeParse, combinators, formatting |
| `utils/core` | `@/utils/core` | Logger, signal, object, environment |
| `locale` | `@/locale` | i18n template, format, registry, detect |
| `config/test` | `@/config/test` | Vitest presets + test harness |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict) |
| Schema Validation | Valibot |
| 3D Engine | Babylon.js (WebGPU / WebGL2) |
| Editor UI | SvelteKit + Svelte 5 + shadcn-svelte |
| Testing | Vitest |
| Linting | oxlint + Biome |
| Formatting | Biome (tabs, single quotes, semicolons) |
| Monorepo | pnpm workspaces + Turborepo |
| Node | >= 25 |

## Autotile System

The runtime supports RPG Maker A2-format autotiles for automatic terrain edge/corner transitions:

### Pipeline

1. **Source format:** 2×3 tile blocks (64×96px at 32px) — RPG Maker A2 terrain format
2. **Sub-tile grid:** Each source is a 4×6 grid of quarter-tiles (16×16px at 32px) containing center, edge, and corner sub-tile variants
3. **Expansion:** `FLOOR_AUTOTILE_TABLE` (48 entries) maps each shape to 4 sub-tile coordinates; `expandAutotileSource()` composes 48 full tiles from the sub-tile grid → outputs 8×6 grid (256×192px at 32px)
4. **Build-time CLI:** `expand-autotiles.ts` pre-expands all 2×3 source PNGs to 8×6 expanded PNGs; `split-a2-atlas.ts` splits RPG Maker A2 atlases into individual 2×3 sources
5. **Runtime detection:** `tileset-loader.ts` detects `autotileType: 'terrain_48'` with `columns: 2, rows: 3` and overrides UV computation to 8×6 grid
6. **Tile resolution:** `autotile-resolver.ts` converts 8-bit neighbor bitmasks → shape frame indices via `BITMASK_TO_FRAME`

### Key Modules

| Module | Purpose |
|--------|---------|
| `autotile-expander.ts` | Sub-tile composition: 2×3 source → 8×6 expanded grid |
| `autotile-resolver.ts` | Bitmask → frame index mapping (256 → 48 entries) |
| `tileset-loader.ts` | UV computation + compact autotile detection |
| `expand-autotiles.ts` | Build-time CLI for batch PNG expansion |
| `split-a2-atlas.ts` | Build-time CLI for splitting A2 atlases |

### Adding New Terrain Types

1. Place the 2×3 source PNG in `assets/tilesets/lpc-terrain/autotile/`
2. Run `expand-autotiles.ts` to generate the 8×6 expanded version
3. Add a tileset config with `autotileType: 'terrain_48'`, `columns: 2`, `rows: 3`
4. The tileset loader auto-adjusts UV grid to 8×6 at runtime

## Dev Harness Test Map

The dev harness (`dev/test-map.ts` + `dev/dev.ts`) includes a hand-crafted 32×32 RPG village test map with:

- **7 terrain zones:** Forest (NW), Village (CW), River (center column), Lake/Shore (SW), Cliff Plateau (NE), Ruins (on cliff), Meadow/Farm (SE)
- **14 tilesets:** 6 autotile terrain (grass, dark grass, dirt, cobble, water, sand — 48 tiles each via A2 expansion) + 8 decoration (plants, trees, cliffs, flowers, mushrooms, wildflowers, rocks, cliff rocks, tilled soil)
- **Multi-level height map:** Level 0 (water), Level 1 (ground), Level 2 (hillside), Level 3 (cliff top)
- **Procedural 3D props:** Babylon.js meshes (cottages, well, torch posts, bridge, boulders, barrels, crates, fences) placed at height-aware positions
- **Season switching:** Summer, Spring, Autumn, Winter — swaps autotile and decoration tileset image paths, disposes and re-renders tilemap
- **6 atmosphere presets:** Sunny Village, Dusk, Night Market, Foggy Forest, Cliff Panorama, Stormy — each adjusts time, fog, torches, and post-FX
- **Dev harness controls:** Test Map sidebar section with 3D Props toggle, Prop Shadows toggle, Torch Lights toggle, Torch Glow toggle, Prop Opacity slider, Season dropdown, Atmosphere dropdown

The test map showcases every rendering feature: fog, shadows, glow, height map, day/night cycle, point lights, volumetric lighting, and post-processing effects.

## Editor Debug / Developer Mode

The editor includes a full debug system activated via URL params (`?wf.debug=true`) or programmatically. When enabled, it provides:

| Feature | Description |
|---------|-------------|
| **Devtools API** | `window.__EDITOR_DEVTOOLS__` — state inspection, generic `set(path, value)`, convenience setters, extension registry |
| **State Logger** | Console logging of all store mutations with styled badges, old/new diffs, timestamps (requires logLevel `debug` or `trace`) |
| **URL Overrides** | `wf.*`-prefixed query params: `?wf.debug=true&wf.theme=midnight&wf.logLevel=trace&wf.ff.settings=false` |
| **Extension Registry** | `register(namespace, api)` / `unregister(namespace)` for custom devtools namespaces |
| **Welcome Banner** | Rich console output on activation: current state, feature flags, URL overrides, API reference |

### Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| `debug-state.ts` | `schemas/` | Valibot schemas for debug config (LogLevel, DebugState, UrlOverrides) |
| `url-params.ts` | `utils/` | Parse `wf.*` URL params, apply overrides to stores |
| `console-styles.ts` | `debug/` | CSS badge styles, timestamp formatting, snapshot diffing |
| `debug-state.svelte.ts` | `stores/` | Reactive debug store with localStorage persistence |
| `state-logger.svelte.ts` | `debug/` | `$effect`-based state change watcher with log level filtering |
| `devtools-api.svelte.ts` | `debug/` | Window global API factory with auto-discovered setters |
| `init.svelte.ts` | `debug/` | Orchestrator: activate/sync lifecycle for all debug services |

### Auto-Discovery

The debug system uses Valibot schema introspection (`Schema.entries`) to auto-discover state fields and feature flags. Adding new fields to `AppPreferencesSchema` or `FeatureFlagsSchema` requires **zero changes** to the debug system — URL overrides, devtools API, and state logging pick them up automatically.

## Testing

All modules have colocated `.test.ts` files (2563+ tests total). Pure math modules use logic tests; modules touching Babylon.js use NullEngine integration tests. Test harness from `@/config/test/harness` provides temp dirs, console capture, async helpers, and fake clock.

```bash
pnpm qa:test           # Run all tests
pnpm qa:type-check     # TypeScript type checking
pnpm -w run qa:lint    # oxlint + Biome linting
pnpm -w run qa:format:check  # Biome format check
```
