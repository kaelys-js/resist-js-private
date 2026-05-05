# `@/cli` tool anatomy — runner-tool patterns

> Captured 2026-05-05. Path: `packages/shared/utils/cli/src/tools/`. Establishes the per-tool runner pattern via 5 representative tools. Companion to `cli-framework` (framework + dispatch). Do NOT duplicate framework content.

## Per-tool directory shape (every tool except `generate-icons`)

```
<tool>/
  README.md          ← usage docs
  index.ts           ← entry point — default-exports a TaskRunner or Command
  flags/             ← per-tool FlagDefinition modules (auto-discovered via import.meta.glob)
  locales/           ← per-locale strings + schema.ts
  utils/             ← tool-private helpers (not exported externally)
  schemas/           ← tool-private Valibot schemas (some tools)
  formatters/        ← tool-private output renderers (some tools)
  template/          ← Handlebars templates (sync only)
  TODO.md            ← per-tool work-in-progress notes (some tools)
```

Not every tool has every subdirectory — the structure is opt-in.

The framework (`@/cli/utils`) discovers tools by directory name in `dispatchTool()` and dynamically imports their `index.ts`.

## 5 representative tools

### 1. `checks/` — version-consistency validator (Command)

**Files**: `README.md`, `index.ts`, `flags/`, `locales/`.

**Shape**: `createCommand(def: CommandDefinition)` from `@/cli/utils/command` — single-shot tool with subcommand-style entry. Not a file-iterator (so no `utils/` for batch logic).

**Index header**:
```ts
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { checkToolVersion } from '@/cli/utils/installer';
import { getConfig } from '@/config/loader';
import { TOOL_FLAG_DEFS } from '@/cli/tools/checks/flags';
import type { BuiltChecksStrings } from '@/cli/tools/checks/locales/schema';
```

**Flags**:
- `--fix`/`-f` (boolean) — auto-remediate
- `--dry-run`/`-n` (boolean) — preview commands
- `--verbose`/`-v` (boolean) — detailed output

**7 sequential validation passes** (each emits `pass | fail | warn | skip`):
1. Config vs lockfile (node tools).
2. Config vs package.json devDependencies.
3. Config vs mise.toml (system tools).
4. Config vs installed system tools (via `checkToolVersion`).
5. Schema versionCheck drift (vs upstream spec).
6. Schema metadata freshness.
7. Internal consistency (`.nvmrc` matches `packageManager`, no `volta` block, mise bootstrap present).

`fail` severity affects exit code. Used by root `pnpm qa:checks`.

### 2. `format/` — multi-language formatter (TaskRunner)

**Files**: `README.md`, `index.ts`, `flags/`, `formatters/`, `locales/`, `schemas/`, `utils/`.

**Shape**: `createRunner(def: TaskRunnerDefinitionBase)` — file-iterating pool runner.

**Index header**:
```ts
import { createRunner } from '@/cli/utils/runner';
import { TOOL_FLAG_DEFS } from '@/cli/tools/format/flags';
import { FormatterDefinitionSchema } from '@/cli/tools/format/schemas';
import { createBatches, executeBatch } from '@/cli/tools/format/utils/batch';
import { getAllFormatters, getFormatterForFile } from '@/cli/tools/format/utils/registry';
import { format, formatWithDiff } from '@/cli/tools/format/utils/runner';
```

**Subdirectory roles**:
- `formatters/` — pluggable formatter registry (Biome, Prettier, external CLI tools, custom transforms, noop pass-throughs).
- `schemas/` — `FormatterDefinitionSchema` Valibot type for per-formatter config.
- `utils/registry.ts` — `getAllFormatters()` + `getFormatterForFile(path)` (three-tier lookup: exact filename → glob pattern → extension).
- `utils/batch.ts` — `createBatches(files)` + `executeBatch(batch)` for parallel formatter invocations.
- `utils/runner.ts` — `format(file)` + `formatWithDiff(file)` per-file routines.

**Key flags**:
- `--check`/`-C` — verify only, exit 1 if unformatted.
- `--diff`/`-D` — print unified diff.
- `--list-formatters` — print all registered formatters by tool type.
- `--check-tools` — verify external formatter availability.
- `--install-tools` — install missing formatters with progress.
- `--list-ignored` — print `.formatignore` patterns.

**Flow**:
1. Discover files matching `**/*` (respects `.formatignore`).
2. Three-tier lookup per file: exact name → glob → extension.
3. Route to formatter; apply.
4. Per-file status indicators.

90+ file types supported.

### 3. `secrets/` — Infisical operations (Command)

**Files**: `README.md`, `index.ts`, `flags/`, `locales/`, `utils/`.

**Shape**: `createCommand` with positional `[action]` subcommand routing.

**Subcommands**: `show` (default), `get`, `set`, `delete`, `list`, `search`, `doctor` (8 diagnostic checks), `migrate` (.env → Infisical), `rotate` (jwt/api/database categories), `sync` (push to Cloudflare Workers), `login`, `logout`, `whoami`, `validate` (against `@/schemas/core-config/secret-schemas`).

**Dependencies**: `@infisical/sdk` v2 (used directly), plus shells out to `infisical` CLI for some operations the SDK doesn't expose.

### 4. `onboard/` — first-run setup (Command)

**Files**: `README.md`, `index.ts`, `locales/`, `utils/`. **No `flags/`** (just a few standard ones).

**Shape**: `createCommand`. Steps from `config.tooling.onboarding.steps` in `resist.config.ts`. Sets `RESIST_ONBOARDING=1` environment variable. Writes `.resist/.onboarded` marker on completion.

The onboarding gate: `requireOnboarding(strings)` (in `utils/core.ts`) checks for the marker. Every other tool calls this on entry; only `onboard` itself skips the check.

### 5. `sync/` — config-templating engine (Command)

**Files**: `README.md`, `index.ts`, `locales/`, `template/`, `utils/`.

**Shape**: `createCommand`. Generates config files across the monorepo from Handlebars templates rendered against `resist.config.ts`.

**Key utils**:
- `utils/config.ts` → `CONFIG` constant.
- `utils/helpers.ts` → `Handlebars`, `clearMissingVariables`, `getMissingVariables` (detects `{{var}}` references with no value in context).
- `utils/locale-validator.ts` → `validateLocaleFiles()`.
- `utils/mapping.ts` → `resolveOutputPath`, `shouldSkipTemplate` (PM-specific templates skipped if PM doesn't match), `getStaleConditionalOutputs` (orphan detection).
- `utils/transform.ts` → `transformConfigForTemplates(config) → TemplateContext` (flattens config for Handlebars).

**`template/` directory**: contains the actual `.hbs` source templates. Tree shape: `template/packages/...`, `template/packages/_partials/`, `template/packages/docs/`, plus root files like `CODE_OF_CONDUCT.md.hbs`, `CONTRIBUTING.md.hbs`, `LICENSE.hbs`, `README.md.hbs`, `SECURITY.md.hbs`, `docker-compose.infisical.yml.hbs`, `lefthook.yml.hbs`. The `template/packages/CONTRIBUTORS.md` is a plain (non-Hbs) file — copied as-is.

**Flow**:
1. Create `resist.config.ts` from defaults if missing.
2. Load + Valibot-validate the config.
3. Lockfile mismatch detection (warn).
4. Flatten config into template context.
5. Discover all `.hbs` templates in `template/`.
6. Render each, compare to current file, write only if changed.
7. Skip PM-specific templates that don't match the active PM.
8. **Validate Handlebars** — detect undefined variables/helpers BEFORE writing (prevents silent typos).
9. Detect stale outputs (files no longer corresponding to any template).

**Flags**: `--dry-run`/`-n` only (sync is intentionally narrow — full re-render every time).

## `generate-icons/` — exception (no index.ts)

The only "tool" without an `index.ts`. It's a single shell script `generate-icons.sh` invoked by storylyne editor's prebuild script. The dispatcher delegates to it directly via shell exec rather than through `dispatchTool`.

## How `dispatchTool()` routes to each tool

(Detail in `cli-framework`; recap here.)

1. `pnpm tool <name>` invokes `node --import tsx src/utils/tool.ts <name>`.
2. `tool.ts` calls `await dispatchTool()` (from `utils/core.ts`).
3. `dispatchTool()` reads `argv[2]` (the tool name), finds `src/tools/<name>/`, dynamically imports `index.ts`.
4. Calls the default export — either a `TaskRunner` (file-iterating; `runCore` orchestrates pool) or `Command` (single-shot).
5. Per-tool `flags/` modules are auto-merged with framework flags via `parseFlags`.

## Help / version generation

- `--help` and `--version` are handled by `handleStandardFlags(argv, def)` in `utils/core.ts` BEFORE the tool sees argv.
- Help output built by `buildHelpText(def, strings)` — uses tool's `description`, flag definitions, and locale strings.
- Version reads from the workspace `package.json`.

## List-files mode

Most tools support `--list-files` (one of the framework flags from `utils/flags/list-files.ts`) — instead of executing tasks, prints the discovered file list to stdout. Useful for downstream piping.

## JSON output

Framework flag `--json` (from `utils/flags/json.ts`) — switches output renderer to JSON (machine-readable). Combined with `--quiet` (auto-set as a side effect), suppresses progress lines.

## generate-icons.sh integration

Called by storylyne editor's `prebuild` script:
```jsonc
// packages/products/storylyne/editor/package.json
"scripts": {
  "prebuild": "pnpm tool generate-icons --product storylyne"
}
```

The script reads source SVGs from `branding/`, generates favicons + PWA icons + Apple Touch icons via ImageMagick/sharp, writes to `static/` (storylyne-specific paths).

## Shared dependency: `getConfig()` from `@/config/loader`

Every tool calls `getConfig()` to read the workspace `resist.config.ts`. That config is the source of truth for:
- Tool versions (used by `checks`).
- Onboarding steps (used by `onboard`).
- Template variables (used by `sync`).
- Format file patterns (used by `format`).
- Secret schemas (used by `secrets validate`).
- And more.

`config.tooling.<area>.<key>` is the canonical access path.

## How to add a new tool

1. Create `src/tools/<name>/`.
2. `README.md` with usage + flags table.
3. `flags/<flag>.ts` modules (one per flag, default-exports `readonly FlagDefinition[]`).
4. `locales/en.ts` + `locales/schema.ts`.
5. `utils/`, `schemas/`, `formatters/` as needed.
6. `index.ts` with `default export` of `TaskRunner` (file-iterating) or `Command` (subcommand-style).
7. **No registration needed** — `dispatchTool()` finds it by directory name.

## How to add a new framework-level flag

1. Create `src/utils/flags/<flag-name>.ts`.
2. `default` export `readonly FlagDefinition[]`.
3. Required: `name`, `long`, `short?`, `type` (`'boolean' | 'string' | 'number'`), `property` (camelCase result key), `scope` (`'command' | 'runner'`), `order` (sort key), `description`, `schema` (Valibot — required for value flags).
4. Optional: `default`, `defaultFromConfig` (reads `getConfig().<key>` at parse time), `repeatable`, `sideEffects`, `formatError`.
5. Auto-discovered via `import.meta.glob` in `flags/index.ts` — no manual registration.
