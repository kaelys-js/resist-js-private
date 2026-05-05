# `@/utils/core` — packages/shared/utils/core

The cross-cutting utilities library. Process/environment/path/network primitives + structured logger + terminal styling.

## Package
- **Name**: `@/utils/core` (private)
- **Vitest project**: `utils-core` (with vitest `define` for `__APP_VERSION__`/`__GIT_*`/`__BUILD_TIMESTAMP__` globals)
- **Internal deps**: `@/schemas/common`, `@/schemas/result` (transitive)

## File structure (`src/`)
```
index.ts              ← main barrel (selective re-export — see below)
agent.ts              ← detectAgent, AGENTS
async.ts              ← withTimeout
build-info.ts         ← getBuildInfo
build-info-schema.ts  ← BuildInfo Valibot schema
build-globals.d.ts    ← ambient types for vite/vitest define globals
environment.ts        ← runtime detection
format.ts             ← formatDuration, escapeXml
fs.ts                 ← file-system helpers (Node-gated via node-imports)
fs.schemas.ts         ← shape validation for fs results
git.ts                ← getGit{Branch,CommitFull,CommitShort,Dirty,Info}, getPackageVersion
logger.ts             ← structured logger (transports, redaction, sampling, etc.)
network.ts            ← findAvailablePort, hostname/IPs
node-imports.ts       ← lazy + type-erased Node std-lib imports
object.ts             ← deepFreeze, deepMerge, safeStringify
output-context.ts     ← getOutputFormat (machine vs human)
path.ts               ← cwd, path manipulation
pool.ts + .test.ts    ← (likely a worker/connection pool — not in arch memory; investigate if used)
preference-cookie.ts + .test.ts ← (likely cookie-based user-preference reader — not in arch memory)
process.ts            ← process.env, argv, exit, stdin/stderr/stdout, terminal columns
provider.ts           ← detectProvider, PROVIDERS
runtime-guards.test.ts ← (test-only — runtime-detection guards)
shell.ts + .test.ts   ← (likely shell-exec helper — not in arch memory; investigate)
signal.ts             ← global error handlers, abort signals, teardown
signal-runtime.test.ts ← runtime-specific signal tests
string.ts             ← padRight, stripAnsi, toCamelCase, truncateLine
terminal.ts           ← styled output, spinners, progress bar, ANSI/CSS conversion
url-params.ts + .test.ts ← (URL query helpers — not in arch memory)
workspace.ts + .test.ts ← (workspace detection — not in arch memory; investigate)
```

## Barrel pattern (`index.ts`)
The barrel uses **selective re-exports** to avoid name collisions:
- Full re-export: `agent`, `async`, `environment`, `format`, `node-imports`, `object`, `output-context`, `path`, `process`, `provider`, `signal`
- From `logger`: all named exports + `log as baseLog` (avoids colliding with `terminal.log`)
- From `string`: only `padRight` + `toCamelCase` (avoids `terminal.truncateLine` collision)
- From `terminal`: full re-export (`log`, `truncateLine` win)

Files NOT in the barrel (must import path directly): `build-info`, `build-info-schema`, `git`, `network`, `fs`, `fs.schemas`, `pool`, `preference-cookie`, `shell`, `url-params`, `workspace`, `logger.test` etc.

## Major API areas

### `logger.ts` — structured logger (huge surface)
- Levels: `setLogLevel`, `getLogLevel`, `shouldLog`, `LOG_LEVEL_ORDER`
- Context: `setContext`, `getContext`, `mergeContext`
- Transports: `addTransport`, `removeTransport`, `clearTransports`; `LogTransport`, `TransportConfig`
- Redaction: `setRedaction`, `RedactionConfig`, `DEFAULT_REDACT_PATHS`
- Sampling: `setSampling`, `clearSampling`, `SamplingConfig`
- Buffering: `enableBuffer`, `flushBuffer`, `disableBuffer`, `BufferConfig`
- Child loggers: `createChildLogger`, `ChildLogger`, `ChildLoggerOptions`
- Async context: `initAsyncContext`, `withContext`
- Setup: `setupLogging`, `LoggingOptions`
- JUnit reporter: `formatJUnit`, `JUnitTestCase`
- Timers: `startTimer`
- Env init: `initLogLevelFromEnv`, `withLogLevel`
- Helpers: `bufferEntry`, `dispatchToTransports`, `emitStructured`, `redactObject`, `escapeXml`
- Main: `log`

### `terminal.ts` — styled output
- Style: `applyStyle`, `style`, `codes`, `symbols`
- Spinners/progress: `progressBar`, `startSpinner`/`stopSpinner` (`spinnerFrames`)
- Groups: `startGroup`/`endGroup`, `emitGitHubCommand`, `emitCompact`
- Color level: `getColorLevel`/`setColorLevel`, `setColors`, `useColors`/`useUnicode` (runtime-detected)
- Formats: `getCurrentFormat`, `getTerminalWidth`, `truncateLine`
- ANSI conversion: `ansiToBrowserArgs`, `ansiToCss`, `renderMarkup`, `stripMarkup`
- `platformLog`, `log`

### `signal.ts` — global error + abort
- `setupGlobalErrorHandling(opts)` — top-level setup
- Per-runtime: `registerNodeHandlers`, `registerBunHandlers`, `registerDenoHandlers`, `registerBrowserHandlers`, `registerWorkerHandlers`
- Signals: `setupSignalHandlers`, `resetSignalHandlers`
- Listener mgmt: `addListener`, `removeAllListeners`
- Aborts: `getAbortSignal`
- Wrapping: `safeInvoke`, `wrapAsync`, `wrapFetchHandler`
- Browser: `captureWebSocketErrors`
- Reporting: `createCapturedError`, `reportError`
- Cleanup: `registerCleanupHandler`, `teardown`
- Types: `GlobalErrorHandlerOptions`

### `node-imports.ts` — runtime-safe Node std-lib
- `tryImport(name)` — returns `Result<Module, AppError>`
- `nodeFs`, `nodeOs`, `nodePath`, `nodeChildProcess`, `nodeNet`, `nodeUrl` — lazy getters
- Type-erased equivalents: `NodeFs`, `NodeOs`, ...
- `OptionalNodeFs`, `OptionalNodeOs`, ... (nullable)
- `hasNode()` — runtime check

### `process.ts` — process primitives
- `exit`, `fatalExit`, `setExitCode`
- `getArgv`, `getColumns`, `getEnvRecord`, `getEnvVar`, `getScriptPath`
- `isTTY`, `readStdin`
- `writeStderr`, `writeStdout`, `clearLine`, `cursorTo`
- Platform: `isLinux`, `isMacOS`, `isWindows`

### `git.ts`
- `getGitBranch`, `getGitCommitFull`, `getGitCommitShort`, `getGitDirty`, `getGitInfo`
- `getPackageVersion`
- `GitInfo` type

## Patterns
- **Cross-runtime**: every Node API call goes through `node-imports.ts` so the same code works in browser/Worker (returns Result.err if not Node)
- **All public APIs return `Result<...>`** — no throws
- **Selective barrel** — index.ts hand-picks names to avoid collisions
- **Runtime detection** — `terminal.useColors` etc. computed once at load
- **Init-time tests** — `runtime-guards.test.ts`, `signal-runtime.test.ts`, `loader-init.test.ts` style

## NOTE on uncovered files
The previous arch memory missed: `pool.ts`, `preference-cookie.ts`, `shell.ts`, `url-params.ts`, `workspace.ts`. These exist with paired test files. Investigate before depending on them.
