# CLAUDE.md

## Overview

**resist.js** — pnpm monorepo with Turborepo. All config flows from `resist.config.ts` through the sync tool, which renders Handlebars templates to generate root files (package.json, turbo.json, tsconfig.json, biome.json, lefthook.yml, .editorconfig, etc.).

**Stack:** TypeScript · Valibot · Svelte 5 · SvelteKit · Capacitor · Cloudflare (Workers, Pages, D1, KV, R2, Queues) · Pulumi · Infisical · PostHog · Vitest · Playwright

## Architecture

```
resist.config.ts → pnpm tool sync → generated config files
```

The sync tool reads `resist.config.ts`, validates against Valibot schemas, and renders 67 Handlebars templates to generate all derived config. Templates live at `packages/shared/utils/cli/src/tools/sync/template/`. Never edit generated files directly — edit `resist.config.ts` and re-run sync.

### Workspace Structure

```
packages/
├── tools/
│   └── admin/                    # Overseer — business ops dashboard
├── products-template/            # Boilerplate for new products (api, app, marketing, status, assets, config)
├── products/                     # Per-product packages (created via product-create tool)
└── shared/
    ├── config/core/              # Config loader + defaults (@/config)
    ├── config/test/              # Vitest presets + test harness (@/config/test)
    ├── extensions/               # Extension system
    ├── locale/                   # i18n engine with ICU MessageFormat (@/locale)
    ├── schemas/common/           # Primitive Valibot schemas — Str, Bool, Num, Port, Path, etc. (@/schemas/common)
    ├── schemas/core-config/      # Schemas for resist.config.ts (@/schemas/core-config)
    ├── schemas/function/         # Function schema validation (@/schemas/function)
    ├── schemas/generic/          # Generic schema factories (@/schemas/generic)
    ├── schemas/result/           # Result<T>, AppError, ERRORS registry (@/schemas/result)
    ├── schemas/template-literal/ # Template literal type inference (@/schemas/template-literal)
    ├── secrets/infisical/        # Infisical SDK — typed secret access (@resist/secrets-infisical)
    ├── ui/                       # Shared Svelte components
    ├── utils/cli/                # CLI framework + 14 built-in tools (@/cli)
    ├── utils/core/               # Shell, FS, process, network helpers (@/utils/core)
    └── utils/result/             # safeParse, combinators, formatters (@/utils/result)
```

**Import scope is `@/`** (not `@resist/`). Example: `import { safeParse } from '@/utils/result/safe'`

## CLI Tools

All tools invoked via `pnpm tool <name>`. Tool dispatcher: `packages/shared/utils/cli/src/utils/tool.ts`.

| Tool | Purpose |
|------|---------|
| `sync` | Render Handlebars templates from resist.config.ts → generated config files |
| `config` | Display/validate configuration (show, get, list, validate, path) |
| `format` | Multi-language formatter (67+ file types via Biome, Prettier, external tools) |
| `checks` | Version consistency validation across config, lockfile, mise, package.json (7 passes) |
| `dev-proxy` | Local HTTPS proxy with Caddy + mkcert (auto-TLS, CORS, health checks, hot-reload) |
| `devenv` | Local + remote dev environments (Docker, Coder, Hetzner VPS, k3s, Cloudflare Tunnel) |
| `onboard` | Developer setup wizard (prerequisite checks, sequential steps) |
| `product-create` | Create new product from template |
| `product-logs` | Tail Cloudflare Worker logs via wrangler |
| `secrets` | Infisical secrets management (14 actions: show/get/set/delete/list/search/doctor/migrate/rotate/sync/login/logout/whoami/validate) |
| `secrets-setup` | Infisical bootstrap (local Docker) or connect (remote VPS), with --reset teardown |
| `local-ci` | Run GitHub Actions / GitLab CI locally via act / gitlab-ci-local |
| `schema-updater` | Download and cache JSON schemas from remote URLs |
| `vscode-setup` | Install/uninstall VS Code extensions from extensions.json |

## Code Rules

### Result Pattern (CRITICAL)

Every function returns `Result<T>` — never throws. No exceptions.

```typescript
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';

// Validate input
const result: Result<Config> = safeParse(ConfigSchema, input);
if (!result.ok) return result;  // propagate error
const config: Config = result.data;

// Return success
return ok(VoidSchema, undefined);

// Return pre-validated data (skip re-validation)
return okUnchecked(result.data);
```

**Rules:**
- **NEVER** use `v.parse()` — it throws, bypassing Result
- **NEVER** use `v.safeParse()` directly — returns Valibot's format, not `Result<T>`
- **ALWAYS** use `safeParse` from `@/utils/result/safe` — returns `Result<T>`
- **ALWAYS** check `.ok` before using `.data` — `if (!result.ok) return result;`
- **NEVER** use ternary fallbacks — `result.ok ? result.data : fallback` silently swallows errors
- **NEVER** `throw` or `exitWithError` in normal control flow — return `err()`
- Use `okUnchecked<T>(data)` when returning already-validated `.data`
- Every function input/parameter must be validated with a Valibot schema
- Every function output must return `Result<T>` — ALL callers must check `.ok`

### Valibot Types (CRITICAL)

Use Valibot types everywhere. Never use TypeScript builtins.

```typescript
// CORRECT
import { type Str, type Bool, type Num, type Void, type Port, type Path } from '@/schemas/common';

function process(name: Str, port: Port, verbose: Bool): Result<Void> { ... }

// WRONG — never do this
function process(name: string, port: number, verbose: boolean): Result<void> { ... }
```

**Rules:**
- **NEVER** use TypeScript builtins (`string`, `number`, `boolean`, `void`)
- **NEVER** use TypeScript `type` or `interface` — use Valibot schemas (`v.strictObject` + `v.InferOutput`)
- **ALWAYS** use `v.strictObject()` (never `v.object()`)
- **ALWAYS** add type annotations to every declaration — no exceptions
- **ALWAYS** validate function inputs with `safeParse` if a Valibot schema exists
- **ALWAYS** use strict AND specific schemas — prefer existing shared schemas from `@/schemas/common` or create new ones
- **NEVER** use `as` casts — no exceptions
- Import Valibot as namespace: `import * as v from 'valibot'`

### Imports

```typescript
// 1. External packages
import * as v from 'valibot';

// 2. Workspace packages (canonical sources — NEVER re-export)
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { Str, Bool, Void } from '@/schemas/common';

// 3. Relative imports
import { validateRequest } from '../utils';
```

**Rules:**
- **NEVER** re-export — always import from canonical source. No barrel files.
- Use `type` imports where appropriate: `import type { ... }`

### JSDoc

Every public function must have complete JSDoc with `@param` and `@returns`. Examples must be TypeScript. When modifying code, update every JSDoc block to match reality and add any that are missing.

### READMEs

Update the relevant README.md when adding or modifying tools, packages, or public APIs. Each CLI tool and shared package should have a README.

### File Naming

- **kebab-case** for files: `user-service.ts`
- **PascalCase** for Svelte components: `Button.svelte`
- **camelCase** for variables/functions
- **SCREAMING_SNAKE_CASE** for constants

### Workflow Rules

- **ALWAYS** check for and use the most relevant available skills and MCP tools before responding
- **ALWAYS** include a detailed CHANGELOG at the end of every plan
- **ALWAYS** show full code changes/diff in plans for every file — no exceptions
- **NEVER** dismiss or remove user TODOs without explicit permission — present each TODO and proposed resolution, then wait for approval

## Key Patterns

### CLI Tool Structure

```
tools/<tool-name>/
├── index.ts          # createCommand() with handler
├── flags/
│   ├── index.ts      # Auto-discovery via import.meta.glob
│   └── <flag>.ts     # Per-flag definition (passive: handle returns okUnchecked(null))
├── locales/
│   ├── schema.ts     # Valibot schema for locale strings
│   └── locales/
│       └── en.ts     # English strings
├── utils/
│   └── <helpers>.ts  # Business logic
└── README.md
```

Flags auto-discovered via `import.meta.glob(['./*.ts', '!./index.ts'], { eager: true })`.

Locale strings return `Result<Str>` — always check `.ok`.

### Error Domains

21 domains in `ERRORS` registry: VALIDATION, CONFIG, AUTH, DB, IO, HTTP, NETWORK, RUNTIME, CLI, FUNCTION, LOCALE, TEMPLATE, WORKSPACE, SIGNAL, PROCESS, RATE_LIMIT, RESOURCE, ENCODING, QUEUE, CACHE, INTERNAL.

Error code format: `DOMAIN.SPECIFIC_CODE` (e.g., `AUTH.INVALID_TOKEN`, `IO.EXEC_FAILED`).

### Locale System

ICU MessageFormat with two-phase validation (build-time + render-time). All built locale functions are callable `(params?) => Result<Str>`.

```typescript
const msg: Result<Str> = strings.header({ count: itemCount });
if (!msg.ok) return msg;
```

### Config Lifecycle

```
resist.config.ts (user edits this)
       ↓
@/schemas/core-config (Valibot validation)
       ↓
@/config (loader — loadConfig() → getConfig() singleton)
       ↓
pnpm tool sync (67 Handlebars templates)
       ↓
Generated: package.json, turbo.json, tsconfig.json, biome.json,
           lefthook.yml, .editorconfig, .devcontainer/, .coder/,
           .github/workflows/, etc.
```

Never edit generated files. Edit `resist.config.ts` and re-run `pnpm tool sync`.

### Sync Tool Helpers

PM helpers abstract over package managers: `pm.run`, `pm.filter`, `pm.exec`, `pm.dlx`, `pm.installFrozen`.

Template helpers: `{{json}}`, `{{jsonPretty}}`, `{{#ifPm "pnpm"}}`, `{{kebabCase}}`, `{{syncHeader}}`, `{{year}}`, `{{schemaPath}}`.

## Formatting

- **Tabs** (not spaces)
- **Single quotes**
- **Semicolons**
- **100 character** line width
- Biome for TS/JS/JSON/CSS; Prettier for Markdown/YAML/HTML/Svelte; external formatters for 40+ other languages

## Testing

- **Vitest** for unit/integration tests — colocated (`*.test.ts`)
- **Playwright** for web E2E — in `tests/e2e/`
- **Maestro** for mobile E2E
- Presets in `@/config/test` (node, svelte, worker)
- Test harness: temp dirs, console capture, process spy, async helpers, fake clock, benchmark generators

## Gotchas

- **Generated files** — turbo.json, package.json, tsconfig.json, lefthook.yml, biome.json, .editorconfig are ALL generated by sync. Edit `resist.config.ts`, not these files.
- **`turbo.json` is pure JSON** — no comments allowed. JSONC not supported.
- **`$TURBO_DEFAULT$`** preserves Turbo's built-in input defaults — more maintainable than explicit file lists.
- **`globalPassThroughEnv`** for env vars available without busting Turbo cache (CI, NODE_ENV, VITE_*, etc.).
- **Locale files load at module scope** — can't return Result directly; use fallback pattern for Result-returning calls.
- **D1 migrations are forward-only** — no automatic rollback. Design migrations to be additive.
- **Strict env mode** (Turborepo 2.x default) — undeclared env vars not available to tasks.
- **Boundaries config** exists but no packages have `tags` yet — per-package turbo.json files needed.
- **Phantom tasks** — `qa:checks`/`qa:format` are root-level CLI tools, not per-package Turbo tasks.

## Known Issues (Feb 2026)

- No product template has `deploy:staging/prod/preview`, `dev:ios/android/desktop`, `qa:test:e2e` scripts
- `ci`/`ci:local` scripts missing `qa:benchmark`, `qa:test:coverage`, `qa:boundaries`; have duplicate `qa:test` + `qa:test:unit`
- Boundaries config enabled but per-package `tags` not yet applied
