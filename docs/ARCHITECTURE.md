# WebForge Architecture

## Overview

WebForge RPG is a web-based RPG creation suite built on Babylon.js. The project uses a pnpm monorepo managed by Turborepo, with shared packages providing foundational utilities and product packages delivering the editor, runtime engine, and plugin API.

The runtime engine renders HD-2D tile-based worlds with a full visual pipeline: chunked tilemap rendering, 16 camera presets, day/night cycle, 3-tier fog, post-processing (12 effects), screen transitions (53 types), screen shake (18 presets), sky/parallax backgrounds, and a complete lighting system with shadows, god rays, lens flares, and glow.

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

## Testing

All modules have colocated `.test.ts` files (1741+ tests total). Pure math modules use logic tests; modules touching Babylon.js use NullEngine integration tests. Test harness from `@/config/test/harness` provides temp dirs, console capture, async helpers, and fake clock.

```bash
pnpm qa:test           # Run all tests
pnpm qa:type-check     # TypeScript type checking
pnpm -w run qa:lint    # oxlint + Biome linting
pnpm -w run qa:format:check  # Biome format check
```
