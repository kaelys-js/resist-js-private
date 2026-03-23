# Shared Packages

Foundational libraries used across all WebForge products. These packages provide type-safe schemas, error handling, logging, i18n, and test infrastructure.

## Package Overview

| Package | Alias | Purpose |
|---------|-------|---------|
| `schemas/common` | `@/schemas/common` | Valibot primitive types |
| `schemas/result` | `@/schemas/result` | Result pattern + error registry |
| `schemas/function` | `@/schemas/function` | Function schema validation |
| `schemas/generic` | `@/schemas/generic` | Generic schema factories |
| `utils/result` | `@/utils/result` | safeParse + Result combinators |
| `utils/core` | `@/utils/core` | Logger, signal, object, environment |
| `locale` | `@/locale` | i18n: template, format, registry |
| `config/test` | `@/test-presets` | Vitest presets + test harness |

## schemas/common

Valibot primitive type aliases used everywhere instead of TypeScript builtins:

| Type | Wraps | Description |
|------|-------|-------------|
| `Str` | `string` | String values |
| `Num` | `number` | Numeric values |
| `Bool` | `boolean` | Boolean values |
| `Path` | `string` | File system paths |

```typescript
import type { Str, Num, Bool, Path } from '@/schemas/common';
```

## schemas/result

The Result pattern — every function returns `Result<T>`, never throws:

| Export | Description |
|--------|-------------|
| `Result<T>` | `{ ok: true; data: T }` or `{ ok: false; error: AppError }` |
| `ok(schema, data)` | Create success Result (with re-validation) |
| `okUnchecked(data)` | Create success Result (skip validation) |
| `err(code, message)` | Create error Result |
| `ERRORS` | Error code registry (17 domains) |
| `AppError` | Error type with code, message, breadcrumbs |

### Error Domains

`VALIDATION`, `CONFIG`, `AUTH`, `DB`, `IO`, `HTTP`, `RUNTIME`, `RESOURCE`, `ENCODING`, `FUNCTION`, `LOCALE`, `TEMPLATE`, `SCENE`, `PLUGIN`, `PROJECT`, `ASSET`, `INTERNAL`

```typescript
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';

function loadAsset(path: Path): Result<AssetData> {
  const result = safeParse(AssetSchema, rawData);
  if (!result.ok) return result;
  return ok(AssetDataSchema, result.data);
}
```

## utils/result

Result manipulation utilities:

| Export | Description |
|--------|-------------|
| `safeParse(schema, data)` | Validate data and return `Result<T>` |
| `combine(results)` | Combine array of Results into one |
| `mapResult(result, fn)` | Transform success data |
| `flatMapResult(result, fn)` | Chain Result-returning functions |
| `formatError(error)` | Human-readable error formatting |

```typescript
import { safeParse } from '@/utils/result/safe';

const result = safeParse(MySchema, input);
if (!result.ok) return result;
```

## utils/core

Core utilities:

| Module | Exports | Description |
|--------|---------|-------------|
| `logger` | `setupLogging`, `log` | Structured logging (info/warn/error/debug/trace/json) |
| `signal` | `createSignal` | Reactive signal pattern |
| `object` | Object manipulation utilities | Deep clone, merge, etc. |
| `environment` | Environment detection | Node/browser/test detection |

```typescript
import { setupLogging, log } from '@/utils/core/logger';

setupLogging({ level: 'info' });
log.info('Scene loaded', { sceneId });
```

## locale

Internationalization system:

| Module | Description |
|--------|-------------|
| `template` | Message templates with interpolation |
| `format` | Number, date, currency formatting |
| `registry` | Locale string registry |
| `detect` | Locale detection from browser/env |
| `direction` | LTR/RTL text direction |

```typescript
import { messageTemplate } from '@/locale/template';
import { detectLocale } from '@/locale/detect';

const msg = strings.greeting({ name: 'Player' });
if (!msg.ok) return msg;
```

## config/test

Vitest testing infrastructure:

| Export | Description |
|--------|-------------|
| `base` preset | Base Vitest config |
| `node` preset | Node-specific config |
| `svelte` preset | Svelte component testing |
| `createTestHarness()` | Temp dirs, console capture, async helpers, fake clock |

```typescript
import { createTestHarness } from '@/test-presets/harness';

const harness = createTestHarness();
```

## Import Convention

Always use subpath imports — no barrel files:

```typescript
// Correct
import { safeParse } from '@/utils/result/safe';
import type { Str, Num } from '@/schemas/common';
import { log } from '@/utils/core/logger';

// Wrong — no barrel imports
import { safeParse } from '@/utils/result';
```
