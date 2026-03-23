# @/test-presets

Vitest presets, test harness utilities, and benchmark data generators.

## Exports

| Entry point | Description |
|-------------|-------------|
| `@/test-presets` | Barrel export of all presets |
| `@/test-presets/node` | Node.js preset |
| `@/test-presets/svelte` | Svelte preset |
| `@/test-presets/worker` | Cloudflare Worker preset |
| `@/test-presets/harness` | All harness utilities (barrel) |
| `@/test-presets/harness/ansi` | ANSI escape code stripping |
| `@/test-presets/harness/temp-dir` | Temporary directory lifecycle |
| `@/test-presets/harness/console` | Console output capture |
| `@/test-presets/harness/process` | `process.exit` spy and state snapshot |
| `@/test-presets/harness/async` | Async test helpers (`waitFor`, `retry`, `withTimeout`, `withAbort`) |
| `@/test-presets/harness/http` | Web `Request`/`Response` factories |
| `@/test-presets/harness/clock` | Fake timer management |
| `@/test-presets/bench` | Benchmark utilities (barrel) |
| `@/test-presets/bench/data` | Deterministic data generators |

## Presets

Each preset factory returns a Vitest `UserConfig`. Use in `vitest.config.ts`:

```typescript
import { createNodeTestConfig } from '@/test-presets';

export default createNodeTestConfig({
  alias: { '@/utils': resolve(__dirname, 'src/utils') },
});
```

### Preset Comparison

| Aspect | `createNodeTestConfig` | `createSvelteTestConfig` | `createWorkerTestConfig` |
|--------|----------------------|------------------------|------------------------|
| Environment | `node` | `jsdom` | Cloudflare workerd (via pool) |
| Pool | `threads` | `threads` | `@cloudflare/vitest-pool-workers` |
| Globals | `false` | `true` (required by Testing Library) | `false` |
| Vite plugin | none | `svelte({ hot: false })` | none |
| Coverage includes | `src/**/*.ts` | `src/**/*.ts`, `src/**/*.svelte` | `src/**/*.ts` |
| Extra option | - | `plugins` (additional Vite plugins) | `miniflare` (workerd config) |

### Shared Base Config

All presets extend `baseTestConfig` which sets:

- **Test files**: `src/**/*.test.ts` (colocated)
- **Coverage**: V8 provider, 80/75/80/80 thresholds (statements/branches/functions/lines)
- **Timeouts**: 10s for tests and hooks
- **Mocks**: `restoreMocks: true` (auto-restore after each test)
- **Benchmarks**: `src/**/*.bench.ts` (colocated)

## Harness Utilities

Most harness modules export two patterns:

- **`create*()`** - Manual lifecycle. Caller manages setup/teardown.
- **`use*()`** - Hook-based. Registers `beforeEach`/`afterEach` automatically. Call at `describe` level.

### ansi

```typescript
stripAnsi(text: string): string
ANSI_REGEX: RegExp
```

Strip ANSI escape codes from strings for assertion on CLI output.

### temp-dir

```typescript
createTempDir(prefix?: string): TempDir
useTempDir(hooks, prefix?): () => TempDir
```

`TempDir` provides `write()`, `read()`, `mkdir()`, `resolve()`, `exists()`, and `cleanup()`.

### console

```typescript
createConsoleSpy(vi, options?): ConsoleSpy
useConsoleSpy(hooks, options?): () => ConsoleSpy
```

Captures `console.log`, `.error`, `.warn` output. Options: `methods` (which to spy on), `passthrough` (also print to terminal). `ConsoleSpy` provides `.logs`, `.errors`, `.warns`, `.output`, `.clear()`, `.restore()`.

### process

```typescript
createExitSpy(vi): ExitSpy
useExitSpy(hooks): () => ExitSpy

snapshotProcess(options?): ProcessSnapshot
useProcessSnapshot(hooks, options?): void
```

- **Exit spy**: Captures `process.exit()` calls without terminating. Provides `.called`, `.code`, `.codes`.
- **Process snapshot**: Saves and restores `cwd`, `argv`, and/or `env`. Options: `{ cwd?: boolean, argv?: boolean, env?: boolean }`.

### async

```typescript
waitFor(callback, options?): Promise<void>       // Poll until callback succeeds (default: 1s timeout, 50ms interval)
retry<T>(fn, options?): Promise<T>               // Retry N times with optional delay (default: 3 attempts)
withTimeout<T>(promise, ms, message?): Promise<T> // Reject if promise doesn't resolve in time
withAbort<T>(promise, signal): Promise<T>         // Reject on AbortSignal
```

### http

```typescript
createRequest(method, url, options?): Request     // Web Request factory (auto-JSON-serializes body)
createResponse(body?, options?): Response          // Web Response factory
parseJson<T>(response): Promise<T>                // Extract typed JSON from Response
```

Compatible with Cloudflare Workers, jsdom, and Node.js 18+.

### clock

```typescript
createFakeClock(vi, now?): FakeClock
useFakeClock(hooks, now?): () => FakeClock
```

`FakeClock` provides `advance(ms)` and `runAll()` (both async to flush microtasks) and `restore()`.

## Benchmark Data Generators

All generators produce **deterministic** output for reproducible benchmarks.

```typescript
import { generateStrings, generateFilePaths, generateObjects, generatePayload, generateNestedObjects } from '@/test-presets/bench/data';
```

| Function | Description |
|----------|-------------|
| `generateStrings(count, length?)` | Deterministic strings (default 80 chars) |
| `generateFilePaths(count, options?)` | Realistic file paths with configurable extensions and depth |
| `generateObjects(count, factory)` | Custom objects via `(index) => T` factory |
| `generatePayload(bytes, pattern?)` | Large string of exact byte size for throughput benchmarks |
| `generateNestedObjects(depth, breadth?)` | Tree structure (`breadth^depth` leaf nodes, keep depth <= 8) |
