# @/config

Loads, validates, and caches `resist.config.ts` as a frozen singleton. All fallible functions return `Result<T>`.

## Files

| File | Exports |
|------|---------|
| `src/loader.ts` | `loadConfig`, `getConfig`, `configExists`, `defineConfig`, `defineProductConfig`, `resetConfig`, `setConfig` |
| `src/defaults.ts` | `defaults` |

## API

| Function | Signature | Description |
|----------|-----------|-------------|
| `loadConfig` | `() => Promise<Result<DeepReadonly<CoreConfig>>>` | Find workspace root, load config file, merge over defaults, validate, freeze, cache. Warns and uses defaults when the file is missing. No-op when already cached. |
| `getConfig` | `() => Result<DeepReadonly<CoreConfig>>` | Return cached config. Errors if `loadConfig()` has not run. |
| `configExists` | `() => Result<boolean>` | Check if the config file exists at the workspace root. |
| `defineConfig` | `(config: Partial<CoreConfig>) => Partial<CoreConfig>` | Identity helper for type-safe config files. Validates against schema. |
| `defineProductConfig` | `(config: ProductConfig) => ProductConfig` | Identity helper for per-product config files. Validates against ProductConfigSchema. |
| `setConfig` | `(config: Partial<CoreConfig>) => Result<DeepReadonly<CoreConfig>>` | Merge partial config over current, validate, freeze, cache. |
| `resetConfig` | `() => void` | Clear the singleton. Testing only. |
| `defaults` | `CoreConfig` | Default config values. Exported from `src/defaults.ts`. |

## Bootstrap

`dispatchTool()` in `@/cli/utils/core` calls `await loadConfig()` before dispatching any tool. After that, every `getConfig()` call returns `{ ok: true }`.

## Usage

```typescript
import { getConfig } from '@/config/loader';

const result = getConfig();
if (!result.ok) throw new Error(result.error.message);
const config = result.data;
```

```typescript
// resist.config.ts
import { defineConfig } from '@/config/loader';

export default defineConfig({
  company: { name: 'Acme', domain: 'acme.com' },
  products: [{ id: 'app', name: 'Acme App' }],
});
```

## Error Codes

| Code | When |
|------|------|
| `CONFIG.NOT_FOUND` | Workspace root not found, or `getConfig()` called before `loadConfig()` |
| `CONFIG.LOAD_FAILED` | Dynamic `import()` threw |
| `CONFIG.INVALID` | Merged config failed schema validation |
