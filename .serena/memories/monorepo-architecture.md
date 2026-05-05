# Monorepo Architecture — webforge / resist-js-private

> Captured 2026-05-05 from `pnpm -r ls` + serena `get_symbols_overview` on every package's primary entry-point files. Branch: `main`.

## Top-level layout

- **Root package**: `webforge` (`/`, private) — pnpm + turbo workspace orchestrator. Node ≥25, pnpm@10.30.2, type=module.
- **Workspace pattern**: `packages/**` (in `pnpm-workspace.yaml`).
- **Path aliases** (root `tsconfig.json` `paths`): `@/utils/*`, `@/schemas/*`, `@/locale/*`, `@/config/*`, `@/test-presets/*`, `@/ui[/*]`, `@/secrets/infisical[/*]`, `@/lint/*`, `@/config/tooling/{vite,svelte}`, `@/products/*`. Vitest mirrors these via `vite-tsconfig-paths` + explicit `sharedPathAliases` for Svelte test compile output (vitest.config.ts:17).
- **Path layers** (3 trees under `packages/`):
  - `packages/products/<product>/<module>` — shipped product apps.
  - `packages/products-template/{app,config}` — scaffolding templates for new products.
  - `packages/shared/{config,locale,schemas,secrets,ui,utils}/...` — reusable libraries.
- **Tooling**:
  - turbo.json — pipeline (build / dev / qa:test / qa:test:e2e / qa:test:coverage / qa:benchmark / qa:checks / clean / preview / svelte-kit:sync). Build inputs strip `*.test.*` / `*.spec.*` / `*.bench.*`.
  - vitest.config.ts (root) — defines a single shared vitest config with **24 `projects`** matching the package set; sets `__APP_VERSION__`, git defines for source-injected globals.
  - biome.jsonc + prettier (Svelte only). oxlint via `@/lint`.
  - tsgo (`@typescript/native-preview`) replaces stock `tsc`.
- **Key root files**: CLAUDE.md (behavioral rules + plan-binding hooks), webforge.code-workspace, `_INTEGRATE/` (large external scratch dir, excluded from tsconfig & tsconfig-paths).
- **Decisions**: `docs/decisions/` — only `0001-template.md` exists. Plans: `docs/plans/` (active) + `docs/plans-archive/`. Includes LINT-RULES.md, LENS-COMPONENTS.md, etc.

## Packages — full inventory (26)

Naming convention: `@/<area>/<sub>` for shared (most), `@<scope>/<name>` for products and special.

### 1. Products (shipped apps)

#### `@storylyne/editor` — `packages/products/storylyne/editor`
Storylyne RPG/scene editor. SvelteKit (^2.53) + Cloudflare adapter, bits-ui + tailwind-variants, perfume.js for vitals, ws + sharp, modern-screenshot, layerchart, embla-carousel, paneforge, formsnap, sveltekit-superforms.
- Entry: `src/hooks.client.ts` (analyticsTracker, source-map decoding, error capture); `src/hooks.server.ts` (handle, security headers PROD/BASE, error logger).
- Config: `vite.config.ts`, `svelte.config.ts`, `wrangler.jsonc`, `playwright.config.ts`, `components.json`.
- `src/lib/server/data/` — `createDataService` + `ServerProject`/`ServerScene`/`ServerUser` schemas + mock service.
- `src/lib/server/preview/` — Chrome DevTools Protocol screencast (`CdpScreencastProvider`), dirty-detector, scrcpy server (Android), `PreviewSessionManager`, vite-plugin-preview-ws, ios-preview-pool, screenshot-loop, adaptive-quality.
- `src/lib/server/simulator/` — iOS (`ios-pool` with `acquireSimulator`/`releaseSimulator`/`drainPool`, ios-simctl, ios-debug-proxy, ios-console-capture, ios-safe-area, ios-screenshot, ios-page-load, ios-navigate, ios-lifecycle, ios-accessibility) + Android (`android-pool` with `acquireEmulator`/`releaseEmulator`/`shutdownPool`, android-sdk, android-cdp, android-devices, android-screenshot, android-navigate, android-page-load, android-lifecycle, android-accessibility), device-frames, viewport-units.
- `src/lib/stores/` (Svelte 5 runes): `editor-state.svelte.ts` (`createEditorStore`, app/feature defaults, locale/theme/sidebar/subscription-plan/user setters, `STORAGE_KEY`), `i18n.svelte.ts` (locale loading), `debug-state.svelte.ts`, `keyboard-shortcuts-store.svelte.ts`, `lens-notifications.svelte.ts`.
- `src/lib/locales/` — de/en/es/fr/ja/ko/zh + schema.
- `src/lib/config/` — app-meta, devtools-config, keyboard-shortcuts, lens-categories(+icons-domain/icons), subscription-plans.
- `src/lib/schemas/` — debug-state, editor-state.
- `src/lib/components/` — ~80 Svelte 5 components (AppSidebar, DevToolbar*, NavScenes, ModeToggle, ThemeSwitcher, ErrorPage, EmptyScenes, HeaderUser, LanguageSwitcher, SiteHeader…).
- `src/routes/`:
  - Layouts: `+layout.svelte`, `(app)/+layout.{svelte,server.ts}`, `(testing)/+layout.{svelte,server.ts}`, `+error.svelte`, `(app)/+error.svelte`.
  - Public pages: `(app)/+page.svelte`; `(testing)/about|accessibility|browser-support|changelog|components|getting-started|icons|styling|support|tokens` + `components/[name]`, `components/category/[category]`, `isolate/[name]`.
  - API endpoints: `api/errors`, `api/vitals`, `api/lens/{bundle-sizes,changelog/[name],compile-standalone,screenshot}` (with sub-routes for android/ios devices, frames, status, stream, setup, devices/create).
  - Static: `manifest.webmanifest`, `robots.txt`, `.well-known/security.txt`.
  - Testing routes under `(app)/(testing)/test-error/{400,403,404,500,beacon,unexpected,validation,validation-client}`.
- `e2e/` — 25 Playwright suites (accessibility, dev-toolbar, error-pages, feature-flags, head-meta, header-user, hydration-flash, icons, keyboard-navigation, language-switcher, layout, locale, manifest, nav-scenes, project-user-data, robots-txt, security-headers, security-txt, sidebar-{normal,collapsed,mobile}, subscription-plan, theme-mode, theme-switcher, tooltips, vitals).
- Vitest projects: `storylyne-editor` (jsdom + svelte) and `storylyne-editor-server` (node, runs `*.server.test.ts`).

#### `@/products` — `packages/products/package.json`
Folder-index package. Exposes `./*` and `./*.svelte` to give other packages a `@/products/<path>` namespace via tsconfig (mapped to `./packages/products/*`). No src.

### 2. Products template

#### `@{product}/app` — `packages/products-template/app`
SvelteKit + Capacitor (iOS+Android) starter for new products. `cap:sync|ios|android` scripts, `@capacitor/{cli,core,ios,android}`, `@sveltejs/adapter-static`, `vite`. Only `src/routes/+page.svelte`.

#### `packages/products-template/config/src/index.ts`
Has only `default` export — config scaffold. **No package.json** in `packages/products-template/config/` itself (the config is shipped via the parent template, not as a separate workspace package in the listing above).

### 3. Shared — config

#### `@/config` — `packages/shared/config/core`
Runtime product/workspace config loader.
- `src/loader.ts`: `defineConfig`, `defineProductConfig`, `loadConfig`, `getConfig`, `setConfig`, `resetConfig`, `configExists`. `DEFAULT_CONFIG_FILENAME`.
- `src/defaults.ts`, `src/defaults-init.ts`.
- Vitest project: `config-core`.

#### `@/test-presets` — `packages/shared/config/test`
Vitest preset generators.
- `src/presets/base.ts` — `baseTestConfig` constant.
- `src/presets/node.ts` — `createNodeTestConfig(NodeTestOptions)`.
- `src/presets/svelte.ts` — `createSvelteTestConfig(SvelteTestOptions)`.
- `src/presets/playwright.ts` — `createPlaywrightConfig(PlaywrightPresetOptions)`.
- `src/harness/` — ansi, async, clock, console, http, process, temp-dir test harness shims (each with .test.ts pair).
- `src/bench/data.ts`.
- Exports: `./base`, `./node`, `./svelte`, `./playwright`. Vitest project: `test-presets`.

#### `@/lint` — `packages/shared/config/tooling/lint`
Custom linter built on oxc-parser. Bin: `resist-lint` → `src/cli.ts`.
- `src/api.ts` — `lint`, `lintSource`, `LintApiResult`, `LintOptions`, `LintResultSummary`, `LintSource`. `SILENT_OUTPUT`.
- `src/cli.ts` — argv entry; reads stdin, calls runner, fatal-exit on crash.
- `src/cli-helpers.ts` — `parseCliArgs`, `runLinter`, `applyFixes`, `applyFileOps`, `collectFiles`, `collectPackageJsonFiles`, `getPackageMap`, `isBinaryFile`, `getGitChangedFiles`, `runPkgRules`, `processBailTasks`, `writeJsonSchema`, `applyRuleOptionsOverrides`, `buildHelpText`. Also has `WORKSPACE_RULE_DOMAINS`, `BINARY_EXTENSIONS`.
- `src/cli-run-linter-{1..5,stdin}.test.ts` — split test files for runner.
- `src/config/schema.ts` — `LintConfigSchema`, `OverrideSchema`, `RuleSeveritySchema`, `loadConfig`, `validateConfig`, `resolveRuleSeverity`, `isRuleEnabledAnywhere`, `generateJsonSchema`.
- `src/constants.ts` — `CONFIG_FILENAME`, `LINTER_NAME`, `SCHEMA_FILENAME`.
- `src/framework/`:
  - `types.ts` — `LintResult`, `LintFix`, `RealLintFix`, `NoOpFix` + `NO_OP_FIX`, `FileOpFix`, `FixableResultOpts`, `AstNode`/`AstVisitor`, `CommentInfo`, `ImportInfo`, `OptionsSchema`, `PackageJson*`, `Stage`, `TypeScriptRule`/`PackageJsonRule`/`WorkspaceRule`, `VisitorContext`, `createResult`/`createFixableResult`, `isFileOpFix`/`isTextFix`.
  - `cache.ts` — `LintCache` class (CACHE_VERSION, CACHE_FILENAME), `CacheEntry`, `ToolCacheEntry`.
  - `oxc-runner.ts` — `parseSync`, `runTypeScriptRules`, `walkNode`, `extractImports`, `extractCodeFences`, `extractScriptBlocks`, source-map offset bookkeeping.
  - `worker-pool.ts` — `WorkerPool` class for parallel rule execution.
  - `tool-orchestrator.ts` — `ToolRegistry` class, `findWorkspaceRoot`, `mapWithConcurrency`, `matchesPattern`.
  - `formatters.ts` — `formatResults` + `formatText`/`formatJson`/`formatCompact`/`formatSarif`/`formatGitHub`/`formatJunit`. `OutputFormat`.
  - `rule-loader.ts` — `loadAllRules`, `classifyRule`, rule discovery + caching.
  - Other: `comment-helpers`, `exec`, `file-fingerprint`, `missing-tool`, `rule-context`, `source-reader`, `svelte-template`, `worker-entry`.
- `src/locale/registry.ts` — `LOCALE_REGISTRY`, `getAvailableLocales`, `resolveLocale`. `src/locale/schema.ts` — Lint*StringsSchemas (Cli/Debug/Error/Flag/ListRules/Output/Schema/Tool), `format`. `locales/` per-locale strings.
- `src/rules/` — **632 rule files** across 18 categories: `comments`, `complexity`, `directives`, `hygiene`, `imports` (no-barrel-files, no-js-extension, no-raw-json, no-raw-node-imports, no-reexport, no-relative-imports, require-import-groups), `jsdoc`, `naming` (camel-case-vars, constant-screaming-case, pascal-case-types, svelte-file-pascal-case, ts-file-kebab-case), `package`, `plans`, `primitives`, `result` (check-before-access, no-ignore-result, no-redundant-ok-guard, no-result-fallback, no-ternary-fallback, require-ok-return, require-result-type, validate-function-input), `svelte5` (component-naming, no-create-event-dispatcher, no-effect-mutation, no-inline-styles, no-legacy-event-handlers/props/reactive-statements/slots, no-reactive-class-properties, no-rest-props-misuse, no-state-in-module-context, no-untrack-misuse, prefer-derived-by, prefer-derived-over-effect, require-bindable-for-bind, require-each-key, require-effect-cleanup, require-snippet-typing), `svelte5-config`, `testing`, `typescript` (lint-embedded-strings, no-bare-as-cast, no-bare-data-types, no-builtin-types, no-default-params, no-empty-catch, no-generic-function-type, no-module-side-effects, no-throw, no-union-null, no-union-params, require-const-comment, require-function-schema, require-non-negative-integer, require-return-type, require-svelte-ts-extension, require-type-annotation), `valibot`, `vscode`, `workspace`.
- `src/tools/` — **115 external-linter wrappers** (registry.ts: `ALL_TOOLS`, `ALL_WORKSPACE_TOOLS`; tools include actionlint, ruff, mypy, ktlint, swiftlint, golangci-lint, knip, madge, dependency-cruiser, syncpack, publint, knip, oxlint, tsgo, svelte-check, etc.).
- Vitest project: `lint` (pool=threads).

#### `@/config/tooling/node` — `packages/shared/config/tooling/node`
Loader/registration shims. `src/index.ts` only exports two paths: `REGISTER_ALIASES_PATH`, `RESOLVE_ALIASES_PATH`. Provides `register-aliases.mjs` for Node `--import` flag. No tests.

#### `@/config/tooling/svelte` — `packages/shared/config/tooling/svelte`
SvelteKit factory. `createSvelteConfig`, `buildAliasesFromTsconfig`, `resolveTemplatePath`/`resolveTemplatePaths`. `CreateSvelteConfigOptions`, `CspConfig`, `CspSource`, `TemplatePaths`, `TsconfigJson`. `IS_PRODUCTION`, `PRODUCTION_CSP`, `TEMPLATE_PATHS`. Schemas for tsconfig + template. Vitest project: `config-tooling-svelte`.

#### `@/config/tooling/vite` — `packages/shared/config/tooling/vite`
Vite factory. `createViteConfig`, `jsonDefine`. `CreateViteConfigOptions`. Subpath exports: `./template-html` (vite-plugin-template-html.ts) and `./lazy-plugin` (vite-plugin-lazy.ts). Vitest project: `config-tooling-vite`.

#### `@resist/vscode` — `packages/shared/config/tooling/vscode`
Public-facing VS Code extension "Resist Tooling" (publisher: resist, preview, name `@resist/vscode` v0.0.1). 30+ commands, single tree view `resist.panel`, configuration namespace `resist.lint.*`. Build via `tsx scripts/generate-manifest.ts --fix && tsgo -p ./`.
- `src/extension.ts` — `activate`, `deactivate`, `mapToolState`, `lifecycle`, `outputChannelRef`.
- `src/lint/` — `code-actions`, `code-lens`, `commands`, `diagnostic-filter`, `diff-preview`, `fix-on-save`, `formatting-provider`, `hover`, `import-sorting`, `per-folder`, `provider`, `rules-viewer`, `stage-indicator`, `stale-cleanup`, `watcher`. (`index.ts` is empty.)
- `src/shared/`:
  - `lifecycle.ts` — `LifecycleManager` class, `ManagedDisposable`.
  - `state.ts` — `ToolStateManager` class, `ToolState`, `STATE_LABELS`, observer pattern.
  - `runner.ts` — `runTool`, `runToolJson`, `runToolText`, `ToolResult`.
  - `diagnostics.ts` — `applyMaxProblems`, `createDiagnosticFromEntry`, `mapSeverity`.
  - Other: `brand`, `command-registration`, `config`, `debounce`, `document-filter`, `errors`, `events`, `file-watcher`, `notifications`, `output`, `progress`, `status-bar`, `types`, `workspace`.
  - `panel/panel.ts` — `registerPanel`. Tree-data-provider, tree-items, menu-sync.
- `src/locale/` — i18n strings.
- `src/__mocks__/vscode.ts` — vitest test mock for vscode API.
- Vitest project: `config-tooling-vscode` (globals=true, alias `vscode` → mock).

### 4. Shared — schemas (Valibot)

#### `@/schemas/common` — `packages/shared/schemas/common`
Largest schema barrel — single `src/index.ts` (~50K tokens) re-exporting hundreds of schemas (Path/AbsolutePath/RelativePath, Email, UUID, JWT, Hostname, Port, IPv4, HexColor/HslColor, BCP47Tag, LanguageCode/CountryCode/CurrencyCode, Semver, KebabCase/CamelCase/Slug, GitBranch/GitCommit{Short,Full}, NpmPackageName, MimeType/FileExtension, Hash variants Md5/Sha256/Sha512, AgentDefinition/AgentInfo/AgentKind, Provider* (Definition/Info/Kind/EnvCheck/PRCheck), RuntimeInfo/RuntimeKind, EnvRecord variants, LogContext/LogEntry/LogLevel/LogMessage, ProductName/Description/Title/Comment/Summary/Content/Tag, FeatureFlag, NumSchema/Int/NonNegative/Positive/UnitInterval, Bool/Str/Path/StrArray nullable+optional families, JsonString/JsonData, OutputFormat/PrintStream/StdioOption, ErrorCode/ErrorMeta, FatalExit/Cleanup/Interrupt/Teardown handlers, HttpMethod/HttpStatusCode, OpenGraphType/RobotsDirective, RegexPattern/GlobPattern, KEBAB_CASE_REGEX/SEMVER_REGEX, DEFAULT_* constants for CLI defaults). Vitest project: `schemas-common`.

#### `@/schemas/core-config` — `packages/shared/schemas/core-config`
Workspace/product config schemas.
- `config.ts` — `CoreConfig`/`CoreConfigInput`, root composition.
- `business.ts` — `Business`, `Company`, `CompanyDomains`, `CompanyEmails`, `Domain`, `Locale`, `Product`, `SpdxLicense`.
- `environment.ts` — `Environment`, `EnvironmentName`, `FeatureBranch`, `StandardEnvironment`.
- `product.ts` — `ProductConfig`, `ProductLayers`, `ProductToolingOverrides`.
- `git.ts` — `Git`, `GitBranch`.
- `format.ts` — `Format`, `FormatAlternate`, `FormatGlobal`.
- `repo.ts` — `Repo`, `RepoUrls`.
- `secret-schemas.ts` — split into `GLOBAL_SECRET_SCHEMAS` + `PRODUCT_SECRET_SCHEMAS`. Subgroups: All/Analytics/Auth/Cloudflare/Database/DevEnv/Email/GitHub/GitLab/Global/Payment/Product/RevenueCat/Status/Storage/Turbo. `ApiKeySchema`, `DatabaseUrlSchema`, `DurationStringSchema`, `NonEmptyStringSchema`, `SecretKeySchema`, `UrlStringSchema`.
- `tooling.ts` — `Ci`, `Coder`/`CoderIde`/`CoderResources`, `ContainerRegistry`, `Cpu/Memory/DiskGb`, `DevContainer`, `DevProxy`, `DockerImage`, `Formatting`, `GitProvider`/`GitProviderType`, `HetznerLocation`/`HetznerServerType`, `Infisical`/`InfisicalAuth`/`InfisicalAuthMethod`/`InfisicalDocker`/`InfisicalEnvironments`/`InfisicalMachineIdentity`/`InfisicalProvision`, `LocalTld`, `Onboarding`, `PackageManager`/`Type`, `Paths`, `PortIncrement`/`PortOffset`, `RegistryAuthMethod`, `ServiceName`/`ServiceOffsets`, `Tooling`, `WorkspaceArch`. `DEFAULT_CONFIG_FILENAME`, `DEFAULT_GIT_PROVIDER`, `DEFAULT_PACKAGE_MANAGER`, `PROVIDER_CI_IDENTITY`.
- `versions.ts` — `Versions`, `NodeToolVersions`, `SystemToolVersions`, `PinnedVersion`.
- Vitest project: `schemas-core-config`.

#### `@/schemas/function` — `packages/shared/schemas/function`
Function-as-schema framework.
- `function.ts` — `functionSchema`, `isAsyncFunction`, `_emptyAsync`, `AsyncFunction`.
- `args.ts` — `args(...)`, `arity.ts` — `arity(...)`, `returns.ts` — `returns(...)` (combinator factories).
- `implement.ts` — `implement(...)`.
- `wrapper-utils.ts` — `createWrapper`, `getWrapperMeta`, `validateArgs`, `validateReturn`, `WRAPPER_SYMBOL`, `_toBaseSchema`, `_toFnType`, `isResult`.
- `types.ts` — `ArityConstraint`, `CallTimeOptions`, `ErrorMode`, `FnType`, `WrapperMeta` schemas.
- Vitest project: `schemas-function`.

#### `@/schemas/generic` — `packages/shared/schemas/generic`
- `generic.ts` — `generic(...)`, `_toGenericSchema`, `isGenericSchema`.
- `types.ts` — `GenericSchema`, `GenericSchemaFactory`, `GenericSchemaMeta`.
- Vitest project: `schemas-generic`.

#### `@/schemas/result` — `packages/shared/schemas/result`
Result/AppError schemas (these are the *Valibot definitions*; runtime uses `@/utils/result`).
- `result.ts` — `ok`, `err`, `okUnchecked`, `OkSchema`, `ErrSchema`, `AppError`, `AppErrorSchema`, `Result`, `ErrResult`, `DeepReadonly`, `ErrOptions`, `FlattenErrors`, `KnownErrorCode`, `ValidationDetail`, `RetryInfo`, `ERRORS`, `ERROR_DEFAULTS`, `ERROR_MESSAGES`. `ErrorCode`, `ErrorDomain`, `ErrorHelpLink`, `ErrorMeta`, `ErrorSeverity`, `ErrorSource`, `ErrorTags`. `_captureCallerStack`, `_deepFreeze`, `_okResult`.
- `captured-error.ts` — `CapturedError`, `CapturedErrorType`, `Breadcrumb`, `BreadcrumbLevel`, `ErrorContexts`, `ErrorFingerprint`, `ErrorUserContext`, `_RuntimeKindSchema`.
- Vitest project: `schemas-result`.

#### `@/schemas/template-literal` — `packages/shared/schemas/template-literal`
- `template-literal.ts` — `templateLiteral(...)`.
- `types.ts` — `TemplateLiteralPart`, `TemplateLiteralSchema`, `TemplateLiteralIssue`, `templateLiteralReference`.
- `regex.ts` — `schemaToRegex`, `buildRegex`, `buildExpects`, `escapeRegex`, `_introspectPipe`. Pre-built patterns: BIGINT, BOOLEAN, CUID2, DECIMAL, HEXADECIMAL, INTEGER, IPV4, NANOID, NUMBER, OCTAL, SLUG, STRING, ULID, UUID.
- `infer.ts` — `InferTemplateLiteralParts`, `SchemaToTemplateLiteralString` (type-level helpers).
- Vitest project: `schemas-template-literal`.

### 5. Shared — locale

#### `@/locale` — `packages/shared/locale`
- `t.ts` — `t(...)` template function, `LocaleFn`.
- `registry.ts` — `createLocaleRegistry`, `createNamespacedRegistry`, `mergeLocaleKeys`. `LocaleRegistry`, `LocaleRegistryOptions`, `NamespaceDefinition`, `NamespacedRegistry`/`Options`.
- `svelte.svelte.ts` — `createLocaleStore`, `LocaleStore`. Subpath export `@/locale/svelte`.
- `format.ts` — Intl wrappers: `formatCurrency`, `formatDate`, `formatDateRange`, `formatDisplayName`, `formatDuration`, `formatList`, `formatNumber`, `formatPercent`, `formatRelativeTime`, `formatTime`, `formatUnit`, `parseDateTimeSkeleton`, `parseNumberSkeleton`, `styleToOptions`, `toDate`. Many *Style/*Type/*Options schemas.
- `detect.ts` — `detectLocale`, `detectFromAcceptLanguage`/`Cookie`/`Navigator`/`UrlPath`/`UrlQuery`, `matchLocale`. `DetectLocaleOptions`, `QualityEntry`. Schemas for each detection source.
- `direction.ts` — `getTextDirection`. `RTL_LANGUAGES`, `RTL_SCRIPTS`, `TextInfoSchema`.
- `display.ts` — `getLanguageDisplayName(s)`, `LanguageDisplayInfo`.
- `og.ts` — `toOgLocale`, `OgLocaleSchema`, `MaximizedLocaleData`.
- `template.ts` — ICU MessageFormat-style template engine: `messageTemplate`, `renderMessage`, `buildLocale`, `buildLocaleEntries`, `extractPlaceholders`, plural/range/select resolvers, escape handling. `TEMPLATE_PARAMS`, `MAX_ICU_DEPTH`, `EscapeResult`, `BuiltLocale`, `FormatterMap`.
- Vitest projects: `locale` (node) + `locale-svelte` (jsdom + svelte).

### 6. Shared — secrets

#### `@/secrets/infisical` — `packages/shared/secrets/infisical`
Wraps `@infisical/sdk` v2.
- `client.ts` — `createClient`, `getClient`, `clearClient`, `isAuthenticated`, `getAuthMethod`, `resolveOptions`. `ClientOptions`, `ResolvedOptions`, `ENV_VARS`.
- `secrets.ts` — `getSecret`, `getSecrets`, `getSecretsByKeys`, `getAllSecrets`, `getProductSecrets`, `getGlobalSecrets`, `hasSecret`, `loadSecretsToEnv`. Options schemas.
- `cloudflare.ts` — `createSecretsProxy`, `getEnvSecret`/`OrDefault`, `hasEnvSecret`/`hasRequiredSecrets`, `validateWorkerEnv`, `withValidatedEnv`.
- `environments.ts` — `detectEnvironment`, `validateEnvironment`, `canAccessEnvironment`, `getParentEnvironment`, `getChildEnvironments`, `getEnvironmentFromBranch`. `DEFAULT_BRANCH_MAPPING`, `ENVIRONMENT_HIERARCHY`.
- Vitest project: `secrets-infisical`.

### 7. Shared — UI

#### `@/ui` — `packages/shared/ui`
Massive component library. **867 component subdirectories** under `src/`. Each is a folder with `index.ts` + `*.svelte` (no source-tree overview is feasible — too large). `src/index.ts` is a slim barrel exporting only `./utils.ts`. Deps: bits-ui ^2.16, lucide-svelte, paneforge, vaul-svelte, shiki, tailwind-merge, tailwind-variants, modern-screenshot, svelte-sonner. Examples of component folders: about-dialog, accordion, action-sheet, address-autocomplete, ai-chat, alert, avatar, button, calendar, card, carousel, chart, chat-bubble, color-picker, combobox, command, dialog, dropdown-menu, form, input, navigation-menu, popover, sheet, slider, switch, table, tabs, textarea, toast, toggle, tooltip, plus hundreds of dashboard/marketing/specialty patterns. `RULES.md` documents authoring conventions. Vitest projects: `ui` (node) + `ui-svelte` (jsdom + svelte + svelteTesting; deps inlined for `@lucide/svelte`, `bits-ui`, `mode-watcher`, `runed`, `svelte-toolbelt`).

### 8. Shared — utils

#### `@/utils/core` — `packages/shared/utils/core`
Cross-cutting utilities.
- `index.ts` — Barrel; re-exports `agent`/`async`/`environment`/`format`/`node-imports`/`object`/`output-context`/`path`/`process`/`provider`/`signal`. From `logger`: hand-picks all named exports + `log as baseLog` (avoiding `terminal.log` collision); from `string`: `padRight` + `toCamelCase` only (avoiding `terminal.truncateLine`); from `terminal`: full re-export (`log`, `truncateLine` win the barrel).
- `agent.ts` — `detectAgent`, `AGENTS`.
- `async.ts` — `withTimeout`.
- `build-info.ts` — `getBuildInfo`. `build-info-schema.ts` — `BuildInfo` valibot schema.
- `environment.ts` — `detectEnvironment`, `detectRuntime`, `detectRuntimeInfo`, `detectColorLevel`, `getProcess`, `hasBrowserGlobals`, `hasNodeProcess`, `requireRuntime`.
- `format.ts` — `formatDuration`, `escapeXml`.
- `fs.ts` — `copyDir`, `deleteFile`, `ensureDir`, `getFileMtimeMs`, `isDirectory`, `mkdirRecursive`, `parseJsonWithComments`, `readDir`, `readFile`, `writeFile`. `fs.schemas.ts` for shape validation.
- `git.ts` — `getGitBranch/CommitFull/CommitShort/Dirty/Info`, `getPackageVersion`. `GitInfo`.
- `logger.ts` — Structured logger. `setLogLevel`, `getLogLevel`, `shouldLog`, `setContext`, `getContext`, `mergeContext`, transports (`addTransport`/`removeTransport`/`clearTransports`/`LogTransport`/`TransportConfig`), redaction (`setRedaction`/`RedactionConfig`/`DEFAULT_REDACT_PATHS`), sampling (`setSampling`/`clearSampling`/`SamplingConfig`), buffering (`enableBuffer`/`flushBuffer`/`disableBuffer`/`BufferConfig`), child loggers (`createChildLogger`/`ChildLogger`/`ChildLoggerOptions`), `startTimer`, `initLogLevelFromEnv`, `withLogLevel`, async context (`initAsyncContext`/`withContext`), JUnit (`formatJUnit`/`JUnitTestCase`), `setupLogging`/`LoggingOptions`, `log`, `LOG_LEVEL_ORDER`. Helpers: `bufferEntry`, `dispatchToTransports`, `emitStructured`, `redactObject`, `escapeXml`.
- `network.ts` — `findAvailablePort`, `isPortAvailable`/Sync, `getLocalHostname`, `getLocalIpAddresses`. `NetworkInterfacesMap`.
- `node-imports.ts` — `tryImport`, `nodeFs/Os/Path/ChildProcess/Net/Url`, `NodeFs/...` types, `OptionalNodeFs/...`, `hasNode`. Lazy-load Node std lib with type erasure for cross-runtime.
- `object.ts` — `deepFreeze`, `deepMerge`, `safeStringify`, `_isPlainObject`, `DeepReadonly`.
- `output-context.ts` — `getOutputFormat`, `setOutputFormat`, `isMachineReadable`.
- `path.ts` — `cwd`, `getBasename`, `getDirFromImportMeta`, `getDirname`, `getFileExtension`, `getFileUrl`, `getHomedir`, `getTempDir`, `joinPath`, `pathExists`, `resolvePath`, `toRelativePath`.
- `process.ts` — `exit`, `fatalExit`, `getArgv`, `getColumns`, `getEnvRecord`, `getEnvVar`, `getScriptPath`, `isTTY`, `readStdin`, `setExitCode`, `writeStderr`, `writeStdout`, `clearLine`, `cursorTo`. Platform constants (`isLinux`/`isMacOS`/`isWindows`).
- `provider.ts` — `detectProvider`, `PROVIDERS`.
- `signal.ts` — Global error handler & abort signal infra: `setupGlobalErrorHandling`, `registerNodeHandlers`/`Bun`/`Deno`/`Browser`/`Worker`, `setupSignalHandlers`/`resetSignalHandlers`, `addListener`/`removeAllListeners`, `getAbortSignal`, `safeInvoke`, `wrapAsync`, `wrapFetchHandler`, `captureWebSocketErrors`, `createCapturedError`, `reportError`, `registerCleanupHandler`, `teardown`. `GlobalErrorHandlerOptions`.
- `string.ts` — `padRight`, `stripAnsi`, `toCamelCase`, `truncateLine`.
- `terminal.ts` — Styled terminal output. `applyStyle`, `style`, `codes`, `symbols`, `progressBar`, `startSpinner`/`stopSpinner` (`spinnerFrames`), `startGroup`/`endGroup`, `emitGitHubCommand`, `emitCompact`, `getColorLevel`/`setColorLevel`, `setColors`, `getCurrentFormat`, `getTerminalWidth`, `truncateLine`, `ansiToBrowserArgs`, `ansiToCss`, `renderMarkup`, `stripMarkup`, `platformLog`, `log`. Runtime-detected `useColors`/`useUnicode`.
- `build-globals.d.ts` — type-only globals injected by vitest define / vite define.
- Vitest project: `utils-core` (with Vitest define for `__APP_VERSION__`/`__GIT_*`/`__BUILD_TIMESTAMP__`).

#### `@/utils/result` — `packages/shared/utils/result`
Result runtime utilities.
- `safe.ts` — `safeParse`, `fromUnknownError`, `_okResult`, `_deepFreeze`.
- `combinators.ts` — `andThen`, `combine`, `combineWithAllErrors`, `fromAsyncThrowable`, `fromThrowable`, `map`, `mapErr`, `match`, `orElse`, `tap`, `tapErr`, `unwrapOr`.
- `error-utils.ts` — `findInCauseChain`, `getCauseChain`, `getDomain`, `getRootCause`, `getSeverity`, `hasAnyCode`, `hasCode`, `isAppError`, `isInDomain`, `isResult`, `isRetryable`.
- `breadcrumbs.ts` — `addBreadcrumb`, `clearBreadcrumbs`, `drainBreadcrumbs`, `getBreadcrumbs`, `MAX_BREADCRUMBS`.
- `format.ts` — `formatErrorDebug`/`Display`/`Json`/`Safe`, `toHttpResponse`, `toRfc9457`. `ProblemDetails`.
- Vitest project: `utils-result`.

#### `@/utils/beacon` — `packages/shared/utils/beacon`
Error beacon client (browser-side reporter).
- `beacon.ts` — `beaconError`.
- `beacon-payload.ts` — `BeaconPayload`, `toBeaconPayload`.
- `breadcrumbs.ts` — `initFetchBreadcrumbs`, `teardownFetchBreadcrumbs`, `addNavigationBreadcrumb`, `extractMethod`, `extractUrl`. Patches `fetch`.
- Vitest project: `utils-beacon`.

#### `@/utils/devtools` — `packages/shared/utils/devtools`
Dev/debug toolbar runtime.
- `devtools-api.svelte.ts` — `createDevtoolsAPI`, `getDevtoolsKey`, `getBuildKey`, `BUILD_INFO`, `buildInfoResult`, `DevtoolsAPI`, `DevtoolsPerf`, `BeaconStatus`. Help formatting helpers.
- `init.svelte.ts` — `activateDebugServices`, `syncDebugServices`, `logWelcomeBanner`, `buildKVBlock`, `isRecognizedOverrideKey`. Badges (`BADGE_API/BUILD/FLAGS/OVERRIDES/STATE`), `FF_PREFIX`, `DebugServicesHandle`.
- `debug-state-store.svelte.ts` — `createDebugStore`, `DEBUG_DEFAULTS`. Persists to localStorage; URL overrides via `applyUrlOverrides`.
- `debug-state-schema.ts` — `DebugStateSchema`, `LogLevelSchema`, `LOG_LEVELS`.
- `dev-toolbar-registry.ts` — `discoverAppPreferences`, `discoverDebugFields`, `discoverFeatureFlags`, `generateDebugUrl`, `humanizeKey`, `humanizeOption`, `introspectEntry`. `FieldDescriptor`, `FlagDescriptor`. `OPTION_LABELS`.
- `state-logger.svelte.ts` — `createStateLogger`, `createWatcher`, `logChange`, `LOG_LEVEL_PRIORITY`.
- `console-styles.ts` — `diffSnapshot`, `formatTimestamp`, `SnapshotDiff`, `styles`.
- `url-params.ts` — `parseDebugParams`, `applyUrlOverrides`, `buildSetterMap`, `isValidAppKey`, `isValidFeatureFlag`. `FF_PREFIX`.
- `types.ts` — `AppStoreContract`, `DebugState`, `DebugStoreContract`, `DevtoolsConfig`, `LogLevel`. `LOG_LEVELS`.
- Vitest project: `utils-devtools` (jsdom + define).

#### `@/utils/web-vitals` — `packages/shared/utils/web-vitals`
Web Vitals client wrapper around `perfume.js`.
- `perfume.ts` — `setupPerfume`. `AnalyticsTrackerFn`, `AnalyticsTrackerOptions`, `NavigatorInfo`, `VitalsScore`.
- `vitals-payload.ts` — `toVitalsPayload`, `stripUrlParams`. `VitalsBeaconPayload`, `VitalsDevice`, `VitalsMetric`.
- `vitals-beacon.ts` — `setupVitalsBeacon`, `queueVital`, `flushVitals`, `getBeaconStatus`, `setDeviceInfo`, `resetBeacon`. `BEACON_URL`, `MAX_QUEUE_SIZE`.
- `connection.svelte.ts` — `getConnectionQuality`, `getConnectionSnapshot`, `getDeviceMemory`, `getDownlink`, `getEffectiveType`, `getHardwareConcurrency`, `getIsLowEndDevice`/`Experience`, `getRtt`, `getSaveData`, `initConnection`, `readFromConnection`, `resetConnection`, `updateFromNavigatorInfo`, `deriveQuality`. `ConnectionQuality`, `ConnectionSnapshot`, `NetworkInformation`, `ValidatedNavigatorInfo`. `EFFECTIVE_TYPE_REGEX`, `SLOW_TYPES`, `SW_STATUS_REGEX`.
- `vitals-diagnostics.ts` — `collectDiagnostics`, `setupDiagnosticObservers`, `resetDiagnostics`. `diagnoseCLS/FCP/INP/LCP/TBT/TTFB`. `THRESHOLDS`, `COLLECTORS`, `getThresholds`, `formatThresholds`, `describeElement`/`describeNode`, `shortenUrl`, attribution + entry types.
- `vitals-logger.ts` — `logVital`, `printDiagnosticDetails`, `setVitalsLoggerAppName`. Console styling constants.
- `vitals-panel-store.svelte.ts` — `getVitalsPanelMetrics`, `reportVitalToPanel`, `resetPanelMetrics`. `PanelMetric`.
- Vitest project: `utils-web-vitals` (jsdom + svelte plugin).

#### `@/cli` — `packages/shared/utils/cli`
Public-published CLI framework (`"private": false`, v0.0.1) — task runner around Valibot. Exposes `pnpm tool` script (`node --import tsx src/utils/tool.ts`).
- `src/utils/`:
  - `tool.ts` — entry; `MODULE` constant routes to specific tools.
  - `core.ts` — `initializeCli`, `dispatchTool`, `handleStandardFlags`, `setupCliSignalHandlers`, `requireOnboarding`, `checkRuntimeSupport`, `fatalError`. `CliDefinition`, `InitializeCliResult`.
  - `runner.ts` — `createRunner`, `runCore`, `discoverFiles`, `readStdin`, `calculateSummary`. `TaskOptionsRecord`, `NullableFileDuration`. Schemas + helpers.
  - `installer.ts` — Tool installation: `checkPrerequisite`, `checkToolVersion`, `installTool`/`Async`, `getToolInstallCommands`, `getPrerequisite`, `getToolPrerequisite`, `lookupInstallDef`, `lookupToolVersion`, `isToolAvailable`, `clearToolCache`, `getExtraToolPaths`, `getPmRootAddDevCmd`, `waitForBrewLock`. `MISE_BACKENDS`, `NODE_TOOL_BINARY_MAP`. `VersionCheckResult`.
  - `command.ts` — `createCommand`.
  - `views.ts` — Output formatting: `printCompactResults`/`Detailed`/`Diff`/`Grouped`/`Junit`/`Summary`/`TaskResult`. `buildJunitXml`, `buildRunOutput`, `formatCompact`, `formatCounter`.
  - `flags/` — 30+ flag modules: `color`, `concurrency`, `cwd`, `debug`, `dry-run`, `fail-fast`, `filter`, `format`, `github-actions`, `group`, `help`, `ignore`, `index`, `json`, `list-files`, `locale`, `log-level`, `no-header`, `output`, `progress`, `quiet`, `serial`, `silent`, `slow-threshold`, `stats`, `stdin`, `stdin-filepath`, `summary-only`, `timeout`, `timing`, `verbose` + `shared/`.
- `src/locale/` — schema + `locales/`.
- `src/schemas/index.ts`.
- `src/tools/` — **15 tools**, each with `index.ts` + `flags/` + `locales/` + sometimes `utils/`/`schemas/`/`formatters/`/`template/`:
  - `checks` — workspace-wide check runner.
  - `config` — config tool.
  - `dev-proxy`.
  - `devenv` — dev environment setup.
  - `format`.
  - `generate-icons` (with `generate-icons.sh`, called by storylyne editor's prebuild).
  - `local-ci`.
  - `onboard` — onboarding flow.
  - `product-create`, `product-logs` — product scaffolding/logs.
  - `schema-updater`.
  - `secrets`, `secrets-setup`.
  - `sync` — has `template/` containing literally a copy of `packages/shared/utils/cli/tools/...` (template scaffolding for new products).
  - `vscode-setup`.
- Tests run via local `vitest run` (NOT routed through root vitest projects). `qa:test` filter list excludes `@/cli` from the root `pnpm qa:test` chain.

## Dependency graph (high-level)

Foundation tier (no internal deps or only on each other):
- `@/schemas/common` (root primitives)
- `@/schemas/result` (uses common)
- `@/schemas/function` (uses result)
- `@/schemas/generic` / `@/schemas/template-literal` (independent)
- `@/utils/result` (uses schemas/result)
- `@/utils/core` (uses common + result)

Mid tier:
- `@/utils/beacon` → core, result, schemas/result
- `@/utils/web-vitals` → utils/core, beacon
- `@/utils/devtools` → utils/core, schemas/result
- `@/locale` → utils/core, schemas/common
- `@/secrets/infisical` → utils/core, schemas/core-config
- `@/schemas/core-config` → schemas/common
- `@/config` (loader) → schemas/core-config, utils/core
- `@/test-presets` → vitest only
- `@/config/tooling/{node,svelte,vite}` → utils/core, schemas/common

Top tier (consumers):
- `@/lint` → utils/core, schemas/result, schemas/function (rules), oxc-parser
- `@resist/vscode` → @/lint
- `@/ui` → utils/core, locale, schemas/common
- `@/cli` → all of the above
- `@storylyne/editor` → @/ui, @/locale, @/utils/{core,beacon,devtools,web-vitals,result}, @/schemas/{common,result}, @/secrets/infisical, @/config/tooling/svelte+vite, @/test-presets

`@{product}/app` is template scaffolding; `@/products` is a path-mapping shim.

## Test infrastructure

Single root `vitest.config.ts` with **24 vitest projects** (one per testable package, with `@storylyne/editor` and `@/locale`/`@/ui` each split into `node` + `svelte` / `*-svelte` companion projects, and storylyne split into `storylyne-editor` + `storylyne-editor-server`). Coverage thresholds: 90% statements/lines, 78% branches, 91% functions. Source-injected globals via `define`: `__APP_VERSION__`, `__GIT_COMMIT__`/`_FULL`, `__GIT_BRANCH__`, `__GIT_DIRTY__`, `__BUILD_TIMESTAMP__`. `@/cli` runs its OWN vitest, excluded from root's `qa:test`.

## Build/lint/run entrypoints

- `pnpm dev` / `build` / `clean` — turbo passthrough.
- `pnpm qa:test` — turbo qa:test (filtered to skip `@/cli`).
- `pnpm qa:test:e2e` — turbo qa:test:e2e (Playwright in storylyne).
- `pnpm qa:format` / `qa:format:check` — biome + prettier (Svelte only).
- `pnpm qa:lint` — runs `@/lint` CLI under `node --import register-aliases.mjs`, then `qa:hooks:cached`.
- `pnpm qa:hooks` — runs `bash .claude/hooks/hooks.test.sh` and stamps a cache file.

## Notes on what's NOT covered (next session)

See companion entry "monorepo-architecture-uncovered" for the full list of files/areas this onboarding pass did not deeply traverse.
