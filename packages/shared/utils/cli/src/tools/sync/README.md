# sync

Sync generated config files across the monorepo by rendering Handlebars templates against `resist.config.ts`.

## Usage

```
pnpm tool sync [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--dry-run` | `-n` | `boolean` | Preview what would change without writing files |

## How It Works

1. **Creates config** — Creates `resist.config.ts` from defaults if it doesn't exist
2. **Validates config** — Loads and validates the config with Valibot schemas
3. **Lockfile check** — Detects package manager lock file mismatches and warns
4. **Template context** — Transforms the nested config into a flattened Handlebars template context
5. **Template discovery** — Discovers all `.hbs` templates in the templates directory
6. **Rendering** — Renders each template, compares to the existing file, and writes only if changed
7. **PM filtering** — Skips package-manager-specific templates that don't match the active PM (e.g., `pnpm-workspace.yaml` is skipped unless PM is pnpm)
8. **Validation** — Detects undefined Handlebars variables and helpers before writing, preventing silent failures from typos
9. **Stale detection** — Identifies output files that no longer correspond to any template (stale conditionals)

### Template Location

Templates live at `packages/shared/utils/cli/src/tools/sync/template/packages/` and mirror the workspace root structure. Output path = template path with `.hbs` stripped.

### Template Context

The config is flattened into dot-notation keys available in templates:

| Prefix | Examples |
|--------|----------|
| `business.*` | `business.company`, `business.domain`, `business.supportEmail` |
| `repo.*` | `repo.description`, `repo.urls.repo`, `repo.urls.bugs` |
| `versions.*` | `versions.node`, `versions.packageManager` |
| `pm.*` | `pm.name`, `pm.run`, `pm.exec`, `pm.install`, `pm.lockfile`, `pm.isPnpm`, ... |
| `format.*` | `format.global.indent_style`, `format.global.line_length` |
| `tooling.*` | `tooling.devProxy.port`, `tooling.formatting.useTabs`, `tooling.paths.*` |
| `paths.*` | `paths.productsDir`, `paths.configFilename` |

Plus raw collections: `config`, `products`, `locales`, `defaultLocale`.

### Custom Handlebars Helpers

| Helper | Description |
|--------|-------------|
| `{{json value}}` | Serialize as JSON (default tab indent) |
| `{{jsonPretty value 2}}` | Pretty JSON with N-space indent |
| `{{#ifPm "pnpm"}}` | Conditional on package manager |
| `{{#ifEquals a b}}` | Equality check |
| `{{kebabCase str}}` | String to kebab-case |
| `{{snakeCase str}}` | String to snake_case |
| `{{capitalize str}}` | Capitalize first letter |
| `{{join array ","}}` | Join array with separator |
| `{{add a b}}` | Add two numbers |
| `{{hasKeys obj}}` | Check if object has any keys |
| `{{year}}` | Current year |
| `{{schemaPath "tooling/biome"}}` | Relative path to a schema file |
| `{{syncHeader "#"}}` | `@generated` comment block (line comments) |
| `{{syncHeaderBlock "<!--" "-->"}}` | `@generated` comment block (block comments) |

### Missing Variable Detection

Before writing any files, the tool detects undefined Handlebars variables and helpers. If any are found, it throws an error listing them all — preventing silent failures from typos.

## Architecture

```
sync/
├── index.ts          # Command definition + orchestration
├── locales/
│   ├── schema.ts     # Valibot schema for locale strings
│   └── locales/
│       └── en.ts     # English strings
├── template/         # Handlebars templates mirroring workspace root
│   └── packages/
│       ├── .devcontainer/    # DevContainer templates
│       ├── .coder/           # Coder workspace templates
│       ├── .github/          # GitHub workflow templates
│       └── ...               # Other config file templates
└── utils/
    ├── config.ts     # Sync configuration
    ├── mapping.ts    # Template mapping rules
    ├── transform.ts  # Config flattener
    └── helpers.ts    # Handlebars helper registration
```

## Examples

```sh
pnpm tool sync                # Render all templates and write changed files
pnpm tool sync --dry-run      # Preview changes without writing
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All templates synced successfully |
| `1` | Template rendering failed or missing variables detected |
| `2` | Invalid usage or config validation error |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
