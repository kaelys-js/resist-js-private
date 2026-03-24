# @/locale

Type-safe, validated locale template engine for Valibot. Define locale schemas with `messageTemplate()`, build raw strings into callable `(params?) => Result<Str>` functions, and manage multiple locales at runtime with an optional reactive Svelte adapter.

## Quick Start

```typescript
import * as v from 'valibot';
import { messageTemplate, buildLocale, type BuiltLocale } from '@/locale';
import { StrSchema, NonNegativeIntegerSchema } from '@/schemas/common';

// 1. Define a locale schema
const MySchema = v.strictObject({
  greeting: messageTemplate({ name: StrSchema }),
  farewell: messageTemplate(),
  files: messageTemplate({ count: NonNegativeIntegerSchema }),
});

// 2. Write raw locale strings (validated against the schema)
const en = {
  greeting: 'Hello, {name}!',
  farewell: 'Goodbye!',
  files: '{count, plural, one {# file} other {# files}}',
};

// 3. Build into callable locale object
const result = buildLocale(MySchema, en);
if (!result.ok) throw new Error('Build failed');

const t = result.data;
t.greeting({ name: 'Alice' }); // ok('Hello, Alice!')
t.farewell();                   // ok('Goodbye!')
t.files({ count: 1 });          // ok('1 file')
t.files({ count: 5 });          // ok('5 files')
```

## Source Files

This package has six source files at separate import paths. No barrel re-exports.

| File | Import Path | Description |
|------|-------------|-------------|
| `src/template.ts` | `@/locale` | Template engine — schemas, builder, renderer |
| `src/format.ts` | `@/locale/format` | Number, date/time, list, unit, duration formatting via `Intl` APIs |
| `src/direction.ts` | `@/locale/direction` | Text direction detection (LTR/RTL) |
| `src/registry.ts` | `@/locale/registry` | Locale registry — multi-locale management |
| `src/detect.ts` | `@/locale/detect` | Locale detection from browser, URL, cookie, header |
| `src/display.ts` | `@/locale/display` | Language display names for locale selectors |
| `src/og.ts` | `@/locale/og` | OpenGraph locale tag conversion |
| `src/svelte.svelte.ts` | `@/locale/svelte` | Svelte 5 reactive adapter |

## API Reference

### Template Engine (`@/locale`)

| Export | Kind | Description |
|--------|------|-------------|
| `messageTemplate()` | Function | Creates a Valibot schema for a locale template string |
| `messageTemplate(params)` | Function | Creates a parameterized template schema with placeholder validation |
| `buildLocale(schema, raw, context?, locale?, formatters?)` | Function | Transforms raw locale strings into callable locale object |
| `renderMessage(template, params, locale?, resolver?, formatters?)` | Function | Renders a template string with ICU message processing and placeholder substitution |
| `TemplateSchema<TParams>` | Type | Valibot string schema with attached param metadata |
| `BuiltLocale<TSchema>` | Type | Mapped type — transforms schema shape into function signatures |
| `FormatterMap` | Type | Map of formatter names to `(value: Str, locale: Str \| undefined) => Result<Str>` |

### Formatting (`@/locale/format`)

| Export | Kind | Description |
|--------|------|-------------|
| `formatNumber(value, locale, options?)` | Function | Formats a number via `Intl.NumberFormat` |
| `formatCurrency(value, locale, currency)` | Function | Formats a number as currency |
| `formatDate(value, locale, style?, options?)` | Function | Formats a date via `Intl.DateTimeFormat` |
| `formatTime(value, locale, style?, options?)` | Function | Formats a time via `Intl.DateTimeFormat` |
| `formatRelativeTime(value, unit, locale, numeric?, style?)` | Function | Formats relative time via `Intl.RelativeTimeFormat` |
| `formatList(items, locale, type?, style?)` | Function | Formats a list of strings via `Intl.ListFormat` |
| `formatDateRange(start, end, locale, style?, options?)` | Function | Formats a date range via `Intl.DateTimeFormat.formatRange()` |
| `formatDisplayName(code, locale, type, style?)` | Function | Formats display names via `Intl.DisplayNames` |
| `formatPercent(value, locale, options?)` | Function | Formats a number as percentage |
| `formatUnit(value, unit, locale, unitDisplay?, options?)` | Function | Formats a number with unit via `Intl.NumberFormat` |
| `formatDuration(duration, locale, style?)` | Function | Formats a duration via `Intl.DurationFormat` (ES2025) |
| `DateTimeStyleSchema` | Schema | `v.picklist(['short', 'medium', 'long', 'full'])` |
| `DateTimeStyle` | Type | `'short' \| 'medium' \| 'long' \| 'full'` |
| `RelativeTimeUnitSchema` | Schema | `v.picklist(['second', 'minute', 'hour', ...])` |
| `RelativeTimeUnit` | Type | Time unit for relative formatting |
| `RelativeTimeNumericSchema` | Schema | `v.picklist(['always', 'auto'])` |
| `RelativeTimeNumeric` | Type | Relative time numeric display |
| `RelativeTimeStyleSchema` | Schema | `v.picklist(['long', 'short', 'narrow'])` |
| `RelativeTimeStyle` | Type | Relative time style |
| `ListFormatTypeSchema` | Schema | `v.picklist(['conjunction', 'disjunction', 'unit'])` |
| `ListFormatType` | Type | List conjunction type |
| `ListFormatStyleSchema` | Schema | `v.picklist(['long', 'short', 'narrow'])` |
| `ListFormatStyle` | Type | List format style |
| `DisplayNameTypeSchema` | Schema | `v.picklist(['language', 'region', 'script', 'currency', ...])` |
| `DisplayNameType` | Type | Display name category |
| `DisplayNameStyleSchema` | Schema | `v.picklist(['long', 'short', 'narrow'])` |
| `DisplayNameStyle` | Type | Display name style |
| `UnitDisplaySchema` | Schema | `v.picklist(['long', 'short', 'narrow'])` |
| `UnitDisplay` | Type | Unit display mode |
| `DurationStyleSchema` | Schema | `v.picklist(['long', 'short', 'narrow', 'digital'])` |
| `DurationStyle` | Type | Duration format style |
| `DurationInputSchema` | Schema | `v.strictObject({ hours?: Num, minutes?: Num, ... })` |
| `DurationInput` | Type | Duration input object |
| `parseNumberSkeleton(skeleton)` | Function | Parses ICU number skeleton → `Intl.NumberFormatOptions` |
| `parseDateTimeSkeleton(skeleton)` | Function | Parses ICU date/time skeleton → `Intl.DateTimeFormatOptions` |

### Registry (`@/locale/registry`)

| Export | Kind | Description |
|--------|------|-------------|
| `createLocaleRegistry(options)` | Function | Creates a locale registry from schema + raw strings |
| `LocaleRegistry<TSchema>` | Type | Registry instance with `active()`, `setActive()`, `list()`, `get()`, `has()`, `set()`, `t()`, `remove()` |
| `createNamespacedRegistry(options)` | Function | Creates namespaced registry with synchronized locale switching |
| `NamespacedRegistry` | Type | Namespace-scoped registry with `ns()`, `addNamespace()`, `setLocale()` |

### Detection (`@/locale/detect`)

| Export | Kind | Description |
|--------|------|-------------|
| `detectLocale(options)` | Function | Detects locale from configured sources in priority order |
| `matchLocale(tag, available)` | Function | BCP 47 tag matching with base language fallback |
| `detectFromNavigator(available)` | Function | Detects from `navigator.languages` |
| `detectFromAcceptLanguage(header, available)` | Function | Detects from `Accept-Language` header |
| `detectFromUrlPath(url, index, available)` | Function | Detects from URL path segment |
| `detectFromUrlQuery(url, param, available)` | Function | Detects from URL query parameter |
| `detectFromCookie(header, name, available)` | Function | Detects from cookie value |

### Direction (`@/locale/direction`)

| Export | Kind | Description |
|--------|------|-------------|
| `getTextDirection(locale)` | Function | Returns `'ltr'` or `'rtl'` for a locale |
| `TextDirectionSchema` | Schema | `v.picklist(['ltr', 'rtl'])` |
| `TextDirection` | Type | `'ltr' \| 'rtl'` |

### Display Names (`@/locale/display`)

| Export | Kind | Description |
|--------|------|-------------|
| `getLanguageDisplayName(locale, displayLocale?)` | Function | Get the display name of a language in a target locale |
| `getLanguageDisplayNames(locales, displayLocale?)` | Function | Get display names for multiple languages |
| `LanguageDisplayInfoSchema` | Schema | Schema for language display info (code, name, nativeName) |
| `LanguageDisplayInfo` | Type | Inferred language display info type |

### OpenGraph Locale (`@/locale/og`)

| Export | Kind | Description |
|--------|------|-------------|
| `toOgLocale(locale)` | Function | Convert BCP 47 locale tag to OpenGraph locale format (e.g., `en_US`) |
| `OgLocaleSchema` | Schema | Schema for OpenGraph locale strings (e.g., `en_US`, `ja_JP`) |

### Svelte Adapter (`@/locale/svelte`)

| Export | Kind | Description |
|--------|------|-------------|
| `createLocaleStore(registry)` | Function | Wraps a registry with Svelte 5 `$state` reactivity |
| `LocaleStore<TSchema>` | Type | Reactive store with `locale`, `t`, `setLocale()`, `list()`, `has()`, `set()`, `remove()` |

## Detailed API

### `messageTemplate()`

Creates a Valibot schema for a locale template string. Two overloads:

**Without params** — validates the value is a string with no `{placeholder}` tokens:

```typescript
const plain = messageTemplate();
// Validates: 'Hello!' ✓, 'Hello, {name}!' ✗
```

**With params** — validates that every declared param appears as `{paramName}` and no undeclared placeholders exist:

```typescript
const tmpl = messageTemplate({ count: NonNegativeIntegerSchema, path: StrSchema });
// Validates: '{count} files in {path}' ✓, '{count} files' ✗ (missing {path})
```

Param schemas are attached as metadata (via Symbol) so `buildLocale()` can retrieve them at runtime without external mapping.

**Returns:** `TemplateSchema<TParams>` — a Valibot string schema with param metadata.

### `buildLocale(schema, rawStrs, context?)`

Transforms raw locale strings into a callable locale object. For each key in the schema:

- **Nested object schema** → recurses into sub-object
- **`messageTemplate()` (no params)** → `() => Result<Str>`
- **`messageTemplate({ ... })` (with params)** → `(params) => Result<Str>` that validates each param via `safeParse` before rendering
- **Plain `v.string()`** → `() => Result<Str>` with optional context substitution
- **Array values** → context substitution applied to string fields in each element

```typescript
const built = buildLocale(SyncStringsSchema, en);
if (!built.ok) return built;

built.data.configNotFound({ configFilename: 'resist.config.ts' });
// ok('resist.config.ts not found, will create from defaults')

built.data.success();
// ok('Sync completed successfully!')
```

**Parameters:**
- `schema` — The Valibot locale schema (e.g., `SyncStringsSchema`)
- `rawStrs` — Raw locale strings object (e.g., imported `en`)
- `context` — Optional context values substituted into plain strings at build time

**Returns:** `Result<BuiltLocale<TSchema>>`

### `renderMessage(template, params, locale?, resolver?, formatters?)`

Renders a template string by substituting placeholders with param values. Processing pipeline: escape literals → message references (`@:key` / `@.modifier:key`) → `select` → `selectordinal` → `plural` → `range` → `number` (+ `::skeleton`) → `date`/`time` (+ `::skeleton`) → simple `{name}` / `{name|formatter}` → restore literals. Branches from select/plural/selectordinal/range are recursively processed (max depth: 10).

```typescript
renderMessage('Hello, {name}!', { name: 'Alice' });
// ok('Hello, Alice!')

renderMessage('{count, plural, one {# item} other {# items}}', { count: 3 }, 'en');
// ok('3 items')

renderMessage('{gender, select, male {He} female {She} other {They}} left.', { gender: 'female' });
// ok('She left.')

renderMessage('{pos, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}', { pos: 2 }, 'en');
// ok('2nd')

renderMessage('Total: {amount, number}', { amount: 1234567 }, 'de-DE');
// ok('Total: 1.234.567')

renderMessage('Date: {d, date, long}', { d: new Date('2026-02-23') }, 'en-US');
// ok('Date: February 23, 2026')
```

**Returns:** `Result<Str>`

### `createLocaleRegistry(options)`

Creates a locale registry that manages multiple locale string sets with an active locale selector. Validates and builds all provided locales eagerly on creation.

```typescript
import { createLocaleRegistry } from '@/locale/registry';

const registry = createLocaleRegistry({
  schema: MySchema,
  defaultLocale: 'en',
  locales: { en, es },
});
if (!registry.ok) return registry;

registry.data.active();             // ok('en')
registry.data.list();               // ok(['en', 'es'])
registry.data.setActive('es');      // ok(undefined)
registry.data.t();                  // ok(BuiltLocale for active locale)
```

**Options:**
- `schema` — Valibot schema defining the locale string structure
- `defaultLocale` — Default locale code (must exist in `locales`)
- `locales` — Map of locale code → raw locale strings
- `context` — Optional context values substituted at build time
- `fallbackLocales` — Locale fallback chain. Missing keys are filled from this chain. Defaults to `[defaultLocale]`
- `strict` — When `false`, non-default locales skip schema validation and missing keys are filled from fallback chain. Default: `true`

**Registry methods** (all return `Result<T>`):

| Method | Signature | Description |
|--------|-----------|-------------|
| `active()` | `() => Result<Str>` | Returns active locale code |
| `setActive(code)` | `(Str) => Result<Void>` | Sets active locale |
| `list()` | `() => Result<StrArray>` | Returns all locale codes |
| `get(code)` | `(Str) => Result<BuiltLocale<TSchema>>` | Returns built strings for a locale |
| `has(code)` | `(Str) => Result<Bool>` | Checks if locale exists |
| `set(code, raw)` | `(Str, RawLocaleStrings) => Result<Void>` | Adds or replaces a locale |
| `t()` | `() => Result<BuiltLocale<TSchema>>` | Returns built strings for active locale |
| `remove(code)` | `(Str) => Result<Void>` | Removes a locale (cannot remove active or default) |

### `createLocaleStore(registry)`

Wraps a `LocaleRegistry` with Svelte 5 `$state` reactivity. Reading `store.locale` or `store.t` in a Svelte component creates a reactive dependency — when the locale changes via `setLocale()`, dependent components re-render.

```typescript
// In $lib/i18n.svelte.ts:
import { createLocaleRegistry } from '@/locale/registry';
import { createLocaleStore } from '@/locale/svelte';

const registryResult = createLocaleRegistry({
  schema: MySchema,
  defaultLocale: 'en',
  locales: { en, es },
});
if (!registryResult.ok) throw new Error('Registry failed');

const storeResult = createLocaleStore(registryResult.data);
if (!storeResult.ok) throw new Error('Store failed');

export const localeStore = storeResult.data;
```

```svelte
<script lang="ts">
  import { localeStore } from '$lib/i18n';

  // Reactive — re-renders when locale changes
  const greeting = $derived(localeStore.t.greeting({ name: 'Alice' }));
</script>

<p>{greeting.ok ? greeting.data : 'Error'}</p>

<button onclick={() => localeStore.setLocale('es')}>Español</button>
```

**Store properties and methods:**

| Member | Type | Description |
|--------|------|-------------|
| `locale` | `Str` (reactive getter) | Current active locale code |
| `t` | `BuiltLocale<TSchema>` (reactive getter) | Built strings for active locale |
| `setLocale(code)` | `(Str) => Result<Void>` | Sets locale and triggers reactivity |
| `list()` | `() => Result<StrArray>` | Returns all locale codes |
| `has(code)` | `(Str) => Result<Bool>` | Checks if locale exists |
| `set(code, raw)` | `(Str, RawLocaleStrings) => Result<Void>` | Adds/replaces a locale |
| `remove(code)` | `(Str) => Result<Void>` | Removes a locale (cannot remove active/default) |

## Concepts

### Two-Phase Design

The locale system operates in two phases:

| Phase | What happens | When | Validation |
|-------|-------------|------|------------|
| **Schema** | `messageTemplate()` creates Valibot schemas | Import time | Placeholder presence/absence in raw strings |
| **Build** | `buildLocale()` transforms strings into functions | Load time | Schema validation + callable wrapping |
| **Render** | Built functions validate params and interpolate | Call time | Per-param `safeParse` + string rendering |

### `BuiltLocale<TSchema>` Type Mapping

The `BuiltLocale` mapped type recursively transforms a Valibot schema into function signatures:

```typescript
const Schema = v.strictObject({
  errors: v.strictObject({
    timeout: messageTemplate({ file: StrSchema, ms: NonNegativeIntegerSchema }),
  }),
  success: messageTemplate(),
  count: messageTemplate({ n: NonNegativeIntegerSchema }),
});

type Built = BuiltLocale<typeof Schema>;
// {
//   errors: {
//     timeout: (params: { file: Str; ms: NonNegativeInteger }) => Result<Str>;
//   };
//   success: () => Result<Str>;
//   count: (params: { n: NonNegativeInteger }) => Result<Str>;
// }
```

Handles `v.strictObject`, `v.object`, `v.looseObject`, `v.intersect`, `v.pipe`, arrays, optionals, and records.

### ICU Message Syntax

The template engine supports a comprehensive ICU MessageFormat subset with nesting, escaped literals, and message references:

#### Plural (`{name, plural, ...}`)

Cardinal plural with `Intl.PluralRules` for locale-correct keyword selection:

```typescript
'{count, plural, =0 {No files} one {# file} other {# files}}'

// Resolution: exact match (=0, =1, =N) → Intl.PluralRules keyword → other fallback
// Keywords: zero, one, two, few, many, other (language-dependent)
// # is replaced with the count value
```

#### Select (`{name, select, ...}`)

Gender/variant selection by exact string match:

```typescript
'{gender, select, male {He} female {She} other {They}} went.'
// { gender: 'female' } → 'She went.'
```

#### Select Ordinal (`{name, selectordinal, ...}`)

Ordinal plural with `Intl.PluralRules` `{ type: 'ordinal' }`:

```typescript
'{pos, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
// { pos: 1 } → '1st', { pos: 2 } → '2nd', { pos: 3 } → '3rd', { pos: 4 } → '4th'
```

#### Number (`{name, number}`)

Locale-aware number formatting via `Intl.NumberFormat`:

```typescript
'Total: {amount, number}'
// { amount: 1234567 } with locale 'de-DE' → 'Total: 1.234.567'
```

#### Date / Time (`{name, date, style}` / `{name, time, style}`)

Locale-aware date/time formatting via `Intl.DateTimeFormat`:

```typescript
'{d, date, long}'      // February 23, 2026
'{d, date, short}'     // 2/23/2026
'{t, time, short}'     // 2:30 PM
'{t, time, long}'      // 2:30:00 PM EST
```

Styles: `short`, `medium`, `long`, `full`. Omitting style uses the default format.

#### Escaped Literals (`'...'`)

ICU MessageFormat uses single quotes for escaping:

```typescript
"It''s {count, plural, one {# o''clock} other {# o''clocks}}"
// '' → single quote: "It's 1 o'clock"

"Syntax: '{name}' is a placeholder"
// '{name}' → literal text: "Syntax: {name} is a placeholder"
```

#### Plural Offset (`offset:N`)

Subtract an offset before plural selection — useful for "you and N others" patterns:

```typescript
'{guests, plural, offset:1 =0 {Nobody is coming} =1 {Just {host}} one {{host} and # other} other {{host} and # others}}'
// { guests: 0, host: 'Alice' } → 'Nobody is coming'
// { guests: 1, host: 'Alice' } → 'Just Alice'
// { guests: 2, host: 'Alice' } → 'Alice and 1 other'
// { guests: 5, host: 'Alice' } → 'Alice and 4 others'
```

#### Number Styles (`{name, number, style}`)

Locale-aware number formatting with style variants:

```typescript
'{rate, number, percent}'      // 0.25 → '25%'
'{n, number, compact}'         // 1234567 → '1.2M'
'{n, number, scientific}'      // 1234567 → '1.235E6'
'{n, number, engineering}'     // 1234567 → '1.235E6'
```

#### Formatter Pipeline (`{name|formatter}`)

Built-in case modifiers and custom formatter chaining:

```typescript
// Built-in formatters: upper, lower, capitalize, title
'{name|upper}'                  // 'alice' → 'ALICE'
'{name|lower}'                  // 'ALICE' → 'alice'
'{name|capitalize}'             // 'alice' → 'Alice'
'{name|title}'                  // 'hello world' → 'Hello World'

// Chaining: left-to-right
'{name|lower|capitalize}'       // 'HELLO WORLD' → 'Hello world'
```

#### Message Reference Modifiers (`@.modifier:key`)

Apply formatters to resolved message references:

```typescript
const en = {
  brandName: 'acme corp',
  title: '@.title:brandName Dashboard',  // → 'Acme Corp Dashboard'
  shout: '@.upper:brandName!',           // → 'ACME CORP!'
};
```

#### ICU Number Skeletons (`{n, number, ::skeleton}`)

ICU number skeleton syntax for fine-grained number formatting:

```typescript
'{price, number, ::currency/EUR}'            // 1234.56 → '€1,234.56'
'{n, number, ::compact-short}'               // 1234567 → '1.2M'
'{rate, number, ::percent .00}'              // 0.256 → '25.60%'
'{n, number, ::sign-always}'                 // 42 → '+42'
'{n, number, ::currency/USD compact-short}'  // 1234567 → '$1.2M'
```

#### ICU Date/Time Skeletons (`{d, date, ::skeleton}`)

ICU date/time skeleton syntax for precise date/time formatting:

```typescript
'{d, date, ::yyyyMMMd}'      // → 'Feb 23, 2026'
'{d, date, ::EEEEMMMMd}'     // → 'Monday, February 23'
'{t, time, ::Hms}'           // → '14:30:00'
'{t, time, ::hmz}'           // → '2:30 PM EST'
```

#### Range Plurals (`{count, range, ...}`)

Interval-based matching with exact values and ranges:

```typescript
'{count, range, (0){No items} (1){# item} (2-5){A few items} (6-inf){Many items}}'
// { count: 0 } → 'No items'
// { count: 1 } → '1 item'
// { count: 3 } → 'A few items'
// { count: 100 } → 'Many items'
```

#### Nested ICU Messages

Blocks can be nested — a select branch can contain a plural, a plural branch can contain a select:

```typescript
'{gender, select, male {{count, plural, one {He has # item} other {He has # items}}} female {{count, plural, one {She has # item} other {She has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}'
// { gender: 'female', count: 3 } → 'She has 3 items'
```

Maximum nesting depth: 10 levels (prevents infinite recursion from malicious input).

#### Message References (`@:key`)

Embed one translation inside another to avoid duplication:

```typescript
// en.ts
const en = {
  brandName: 'Acme Corp',
  welcome: 'Welcome to @:brandName!',
  settings: {
    title: '@:brandName Settings',
  },
};
// welcome() → ok('Welcome to Acme Corp!')
// settings.title() → ok('Acme Corp Settings')
```

Supports dot-separated paths for nested keys: `@:group.subkey`.
References are resolved before ICU blocks, so referenced strings can contain `{placeholder}` syntax.

### Fallback Chains

Non-strict mode allows partial locale files with fallback:

```typescript
const registry = createLocaleRegistry({
  schema: MySchema,
  defaultLocale: 'en',
  locales: {
    en: { greeting: 'Hello', farewell: 'Goodbye' },
    es: { greeting: 'Hola' }, // Missing farewell — filled from en
  },
  fallbackLocales: ['en'],
  strict: false,
});
```

### Locale Detection

Detect the user's preferred locale from multiple sources:

```typescript
import { detectLocale } from '@/locale/detect';

const result = detectLocale({
  available: ['en', 'fr', 'de'],
  fallback: 'en',
  sources: [
    { kind: 'url-query', key: 'lang' },
    { kind: 'cookie', key: 'locale' },
    { kind: 'navigator' },
    { kind: 'header', value: request.headers.get('Accept-Language') ?? '' },
  ],
});
```

Sources are tried in order. Detection source types: `navigator`, `url-path`, `url-query`, `cookie`, `header`, `storage`.

### Number and Date Formatting

Standalone formatting functions for use outside templates:

```typescript
import { formatNumber, formatCurrency, formatDate, formatTime } from '@/locale/format';

formatNumber(1234567.89, 'en-US', undefined);   // ok('1,234,567.89')
formatCurrency(1234.56, 'en-US', 'USD');         // ok('$1,234.56')
formatDate(new Date(), 'en-US', 'long', undefined); // ok('February 23, 2026')
formatTime(new Date(), 'en-US', 'short');         // ok('2:30 PM')
```

### Relative Time Formatting

```typescript
import { formatRelativeTime } from '@/locale/format';

formatRelativeTime(-3, 'day', 'en', undefined, undefined);   // ok('3 days ago')
formatRelativeTime(2, 'hour', 'en', undefined, undefined);   // ok('in 2 hours')
formatRelativeTime(-1, 'day', 'en', 'auto', undefined);      // ok('yesterday')
```

### List Formatting

```typescript
import { formatList } from '@/locale/format';

formatList(['Alice', 'Bob', 'Charlie'], 'en', undefined, undefined);
// ok('Alice, Bob, and Charlie')

formatList(['Alice', 'Bob', 'Charlie'], 'en', 'disjunction', undefined);
// ok('Alice, Bob, or Charlie')
```

### Text Direction

```typescript
import { getTextDirection } from '@/locale/direction';

getTextDirection('ar');     // ok('rtl')
getTextDirection('en-US');  // ok('ltr')
getTextDirection('he');     // ok('rtl')
```

### Unit Formatting

```typescript
import { formatUnit } from '@/locale/format';

formatUnit(100, 'kilometer-per-hour', 'en', undefined, undefined);
// ok('100 km/h')

formatUnit(37.5, 'celsius', 'en', 'long', undefined);
// ok('37.5 degrees Celsius')
```

### Duration Formatting

Requires `Intl.DurationFormat` (ES2025 — Node 22.6+, Chrome 129+, Firefox 131+, Safari 16.4+).

```typescript
import { formatDuration } from '@/locale/format';

formatDuration({ hours: 1, minutes: 46, seconds: 40 }, 'en', 'short');
// ok('1 hr, 46 min, 40 sec')

formatDuration({ hours: 1, minutes: 46, seconds: 40 }, 'en', 'digital');
// ok('1:46:40')
```

### Context Substitution

Plain strings (non-template) support build-time context substitution:

```typescript
const raw = { welcome: 'Welcome to {appName}!' };
const context = { appName: 'MyApp' };

const built = buildLocale(schema, raw, context);
// built.welcome() → ok('Welcome to MyApp!')
```

Context does NOT apply to `messageTemplate()` strings — those use per-call params.

### Custom Formatters

Register custom formatters for pipe syntax and message reference modifiers:

```typescript
import { buildLocale, type FormatterMap } from '@/locale';
import { StrSchema, type Str } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

const customFormatters: FormatterMap = {
  reverse: (value: Str, _locale: Str | undefined): Result<Str> => {
    const valueResult: Result<Str> = safeParse(StrSchema, value);
    if (!valueResult.ok) return valueResult;
    return ok(StrSchema, valueResult.data.split('').reverse().join(''));
  },
};

const built = buildLocale(schema, en, undefined, 'en', customFormatters);
// Template: '{name|reverse}' + { name: 'hello' } → 'olleh'
```

### Namespaces

Group locale strings by domain with synchronized locale switching:

```typescript
import { createNamespacedRegistry } from '@/locale/registry';

const registry = createNamespacedRegistry({
  defaultLocale: 'en',
  namespaces: {
    common: { schema: CommonSchema, locales: { en: commonEn, es: commonEs } },
    auth: { schema: AuthSchema, locales: { en: authEn } },
  },
});
if (!registry.ok) return registry;

// Use a namespace
const commonResult = registry.data.ns('common');
if (!commonResult.ok) return commonResult;

// Lazy-load a namespace
const addResult = registry.data.addNamespace('settings', {
  schema: SettingsSchema,
  locales: { en: settingsEn },
});
if (!addResult.ok) return addResult;

// Add locale to existing namespace
const setResult = registry.data.setLocale('settings', 'es', settingsEs);
if (!setResult.ok) return setResult;

// Switch all namespaces
const switchResult = registry.data.setActive('es');
if (!switchResult.ok) return switchResult;
```

### Non-Reactive Core + Reactive Adapter

The core (`template.ts`, `registry.ts`) is plain objects and functions — no framework dependencies. The Svelte adapter (`svelte.svelte.ts`) wraps with `$state` runes for reactive UI. Other adapters (React, Solid) can follow the same pattern.

## Recipes

### CLI Tool Locale Schema

The most common pattern — used by all 14 CLI tools:

```typescript
// locales/schema.ts
import * as v from 'valibot';
import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { LocaleStringSchema, StrSchema } from '@/schemas/common';

export const MyToolStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    configNotFound: messageTemplate({ configFilename: StrSchema }),
    success: messageTemplate(),
  }),
]);

export type MyToolStrings = v.InferOutput<typeof MyToolStringsSchema>;
export type BuiltMyToolStrings = BuiltLocale<typeof MyToolStringsSchema>;
```

### Multi-Locale SvelteKit App

```typescript
// $lib/i18n.svelte.ts
import * as v from 'valibot';
import { messageTemplate } from '@/locale';
import { createLocaleRegistry } from '@/locale/registry';
import { createLocaleStore } from '@/locale/svelte';
import { StrSchema } from '@/schemas/common';

const Schema = v.strictObject({
  nav: v.strictObject({
    home: messageTemplate(),
    settings: messageTemplate(),
  }),
  greeting: messageTemplate({ name: StrSchema }),
});

const en = {
  nav: { home: 'Home', settings: 'Settings' },
  greeting: 'Hello, {name}!',
};

const es = {
  nav: { home: 'Inicio', settings: 'Ajustes' },
  greeting: '¡Hola, {name}!',
};

const registry = createLocaleRegistry({
  schema: Schema,
  defaultLocale: 'en',
  locales: { en, es },
});
if (!registry.ok) throw new Error('Failed to create registry');

const store = createLocaleStore(registry.data);
if (!store.ok) throw new Error('Failed to create store');

export const i18n = store.data;
```

### Adding a Locale at Runtime

```typescript
const registry = createLocaleRegistry({
  schema: MySchema,
  defaultLocale: 'en',
  locales: { en },
});
if (!registry.ok) return registry;

// Fetch French strings from API
const fr = await fetchLocale('fr');

// Add to registry (validates + builds)
const addResult = registry.data.set('fr', fr);
if (!addResult.ok) return addResult;

// Switch to French
registry.data.setActive('fr');
```

## Type Safety

Type safety operates at three levels:

| Level | What's checked | When |
|-------|---------------|------|
| **IDE / Compile time** | `BuiltLocale<TSchema>` maps `messageTemplate({ name: StrSchema })` → `(params: { name: Str }) => Result<Str>`. Missing params, wrong types, extra params — all TS errors with full autocomplete. | Editing |
| **Schema validation** | `messageTemplate()` creates a `v.check()` pipeline validating raw strings contain exactly the declared `{placeholder}` tokens. Missing or extra placeholders fail `safeParse()`. | Locale load time |
| **Runtime** | `buildLocale()` wraps each parameterized template in a function that `safeParse`s every param against its Valibot schema before rendering. | Every function call |

## Integration

This package integrates with:

- **`@/schemas/common`** — `LocaleStringSchema`, `RawLocaleStringsSchema`, `StrSchema`, `NumSchema`, and Valibot types (`Str`, `Num`, `Bool`, etc.)
- **`@/schemas/result`** — `Result<T>`, `ERRORS.LOCALE.*`, `ERRORS.TEMPLATE.*`, `ERRORS.INTERNAL.*` error codes
- **`@/utils/result`** — `safeParse()` for all input validation
- **`@/cli`** — CLI's locale resolution pipeline (`locales.ts`) imports `buildLocale` from this package. All 14 tool locale schemas import `messageTemplate` and `BuiltLocale` from here.

## Tree-Shaking

Each file is a separate import path — only what you import gets bundled:

```typescript
// Template engine only — no registry or Svelte code
import { messageTemplate, buildLocale, type BuiltLocale, type FormatterMap } from '@/locale';

// Number/date formatting
import { formatNumber, formatCurrency, formatDate, formatTime } from '@/locale/format';

// Extended formatting (relative time, list, unit, duration, etc.)
import { formatRelativeTime, formatList, formatUnit, formatDuration } from '@/locale/format';
import { formatDateRange, formatDisplayName, formatPercent } from '@/locale/format';

// Skeleton parsers
import { parseNumberSkeleton, parseDateTimeSkeleton } from '@/locale/format';

// Text direction detection
import { getTextDirection } from '@/locale/direction';
import type { TextDirection } from '@/locale/direction';

// Registry (includes template engine as dependency)
import { createLocaleRegistry } from '@/locale/registry';

// Namespaced registry
import { createNamespacedRegistry, type NamespacedRegistry } from '@/locale/registry';

// Locale detection
import { detectLocale, matchLocale } from '@/locale/detect';

// Svelte adapter (includes registry types)
import { createLocaleStore } from '@/locale/svelte';

// Types only — zero runtime
import type { BuiltLocale, TemplateSchema } from '@/locale';
import type { LocaleRegistry } from '@/locale/registry';
import type { LocaleStore } from '@/locale/svelte';
import type { DateTimeStyle } from '@/locale/format';
```
