# @/schemas/common

General-purpose Valibot schemas reusable across any package. Every schema exports both a runtime validator (`*Schema`) and a TypeScript type inferred via `v.InferOutput`. All type annotations use Valibot-inferred types.

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | All schemas, types, and constants |

## Usage

```typescript
import { StrSchema, PathSchema, ExitCodeSchema } from '@/schemas/common';
import type { Str, Path, ExitCode } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';

const result = safeParse(PathSchema, '/usr/local/bin');
if (result.ok) {
  const p: Path = result.data;
}
```

## API

### Primitives

| Export | Kind | Description |
|--------|------|-------------|
| `StrSchema` | Schema | String schema |
| `Str` | Type | Inferred string type |
| `StrArraySchema` | Schema | String array schema |
| `StrArray` | Type | Inferred string array type |
| `NullableStrSchema` | Schema | `Str \| null` |
| `NullableStr` | Type | Nullable string type |
| `OptionalStrSchema` | Schema | `Str \| undefined` |
| `OptionalStr` | Type | Optional string type |
| `LocaleStringSchema` | Schema | Locale string (e.g., `en-US`) |
| `LocaleString` | Type | Locale string type |
| `BoolSchema` | Schema | Boolean schema |
| `Bool` | Type | Inferred boolean type |
| `NullableBoolSchema` | Schema | `Bool \| null` |
| `NullableBool` | Type | Nullable boolean type |
| `OptionalBoolSchema` | Schema | `Bool \| undefined` |
| `OptionalBool` | Type | Optional boolean type |
| `NumSchema` | Schema | Number schema |
| `Num` | Type | Inferred number type |
| `NullableNumSchema` | Schema | `Num \| null` |
| `NullableNum` | Type | Nullable number type |
| `OptionalNumSchema` | Schema | `Num \| undefined` |
| `OptionalNum` | Type | Optional number type |
| `NonNegativeIntegerSchema` | Schema | Integer >= 0 |
| `NonNegativeInteger` | Type | Non-negative integer type |
| `NonNegativeNumberSchema` | Schema | Number >= 0 (may be fractional) |
| `NonNegativeNumber` | Type | Non-negative number type |
| `PositiveIntegerSchema` | Schema | Integer > 0 |
| `PositiveInteger` | Type | Positive integer type |
| `VoidSchema` | Schema | Void schema |
| `Void` | Type | Void type |
| `NeverSchema` | Schema | Never schema |
| `Never` | Type | Never type |
| `UnitIntervalSchema` | Schema | Number in [0, 1] |
| `UnitInterval` | Type | Unit interval type |

### Constants

| Export | Kind | Description |
|--------|------|-------------|
| `DEFAULT_TERMINAL_WIDTH` | Const | Default terminal width: `80` |
| `DEFAULT_JSON_INDENT` | Const | Default JSON indent: `2` |
| `DEFAULT_PROGRESS_BAR_WIDTH` | Const | Default progress bar width: `20` |
| `DEFAULT_EXIT_CODE` | Const | Success exit code: `0` |
| `FAILURE_EXIT_CODE` | Const | Failure exit code: `1` |
| `DEFAULT_PLATFORM` | Const | Current platform |
| `DEFAULT_LOG_LEVEL` | Const | Default log level: `info` |
| `DEFAULT_OUTPUT_FORMAT` | Const | Default output format: `text` |
| `DEFAULT_PRINT_STREAM` | Const | Default print stream: `stdout` |
| `DEFAULT_STDIO_OPTION` | Const | Default stdio option: `pipe` |
| `DEFAULT_RUNTIME_KIND` | Const | Default runtime kind |

### File System & Paths

| Export | Kind | Description |
|--------|------|-------------|
| `PathSchema` | Schema | Non-empty file system path |
| `Path` | Type | Path type |
| `PathArraySchema` | Schema | Array of paths |
| `PathArray` | Type | Path array type |
| `AbsolutePathSchema` | Schema | Absolute path (starts with `/`) |
| `AbsolutePath` | Type | Absolute path type |
| `RelativePathSchema` | Schema | Relative path (no leading `/`) |
| `RelativePath` | Type | Relative path type |
| `FilenameSchema` | Schema | Non-empty filename |
| `Filename` | Type | Filename type |
| `FileExtensionSchema` | Schema | File extension (e.g., `.ts`) |
| `FileExtension` | Type | File extension type |
| `GlobPatternSchema` | Schema | Glob pattern string |
| `GlobPattern` | Type | Glob pattern type |
| `NullablePathSchema` | Schema | `Path \| null` |
| `NullablePath` | Type | Nullable path type |
| `OptionalPathSchema` | Schema | `Path \| undefined` |
| `OptionalPath` | Type | Optional path type |

### Network & URLs

| Export | Kind | Description |
|--------|------|-------------|
| `UrlStringSchema` | Schema | Valid URL string |
| `UrlString` | Type | URL string type |
| `HttpsUrlSchema` | Schema | HTTPS URL |
| `HttpsUrl` | Type | HTTPS URL type |
| `RelativeUrlSchema` | Schema | Relative URL |
| `RelativeUrl` | Type | Relative URL type |
| `CanonicalUrlSchema` | Schema | Canonical URL |
| `CanonicalUrl` | Type | Canonical URL type |
| `DataUriSchema` | Schema | Data URI string |
| `DataUri` | Type | Data URI type |
| `PortSchema` | Schema | Port number (1-65535) |
| `Port` | Type | Port type |
| `HostnameSchema` | Schema | Hostname string |
| `Hostname` | Type | Hostname type |
| `Ipv4AddressArraySchema` | Schema | Array of IPv4 addresses |
| `Ipv4AddressArray` | Type | IPv4 address array type |
| `HttpMethodSchema` | Schema | HTTP method (`GET`, `POST`, etc.) |
| `HttpMethod` | Type | HTTP method type |
| `HttpStatusCodeSchema` | Schema | HTTP status code (100-599) |
| `HttpStatusCode` | Type | HTTP status code type |
| `MimeTypeSchema` | Schema | MIME type string |
| `MimeType` | Type | MIME type type |
| `BearerTokenSchema` | Schema | Bearer token string |
| `BearerToken` | Type | Bearer token type |

### Identifiers & Naming

| Export | Kind | Description |
|--------|------|-------------|
| `UuidSchema` | Schema | UUID string |
| `Uuid` | Type | UUID type |
| `CorrelationIdSchema` | Schema | Correlation ID |
| `CorrelationId` | Type | Correlation ID type |
| `KebabCaseIdSchema` | Schema | Kebab-case identifier |
| `KebabCaseId` | Type | Kebab-case ID type |
| `CamelCaseStringSchema` | Schema | camelCase string |
| `CamelCaseString` | Type | camelCase string type |
| `NameSchema` | Schema | Non-empty name string |
| `Name` | Type | Name type |
| `ProductNameSchema` | Schema | Product name |
| `ProductName` | Type | Product name type |
| `ProductNameArraySchema` | Schema | Array of product names |
| `ProductNameArray` | Type | Product name array type |
| `SlugSchema` | Schema | URL-safe slug |
| `Slug` | Type | Slug type |
| `TagSchema` | Schema | Tag string |
| `Tag` | Type | Tag type |
| `FeatureFlagSchema` | Schema | Feature flag name |
| `FeatureFlag` | Type | Feature flag type |
| `SymbolNameSchema` | Schema | Symbol name |
| `SymbolName` | Type | Symbol name type |
| `StyleNameSchema` | Schema | Style name |
| `StyleName` | Type | Style name type |
| `TranslationKeySchema` | Schema | Translation key |
| `TranslationKey` | Type | Translation key type |

### Git

| Export | Kind | Description |
|--------|------|-------------|
| `GitCommitShortSchema` | Schema | Short git commit hash (7 chars) |
| `GitCommitShort` | Type | Short commit hash type |
| `GitCommitFullSchema` | Schema | Full git commit hash (40 chars) |
| `GitCommitFull` | Type | Full commit hash type |
| `GitBranchSchema` | Schema | Git branch name |
| `GitBranch` | Type | Git branch type |

### Date & Time

| Export | Kind | Description |
|--------|------|-------------|
| `IsoTimestampSchema` | Schema | ISO 8601 timestamp |
| `IsoTimestamp` | Type | ISO timestamp type |
| `DateOnlySchema` | Schema | Date only (`YYYY-MM-DD`) |
| `DateOnly` | Type | Date only type |
| `TimeOnlySchema` | Schema | Time only string |
| `TimeOnly` | Type | Time only type |
| `TimezoneSchema` | Schema | IANA timezone |
| `Timezone` | Type | Timezone type |
| `DurationSchema` | Schema | Duration string |
| `Duration` | Type | Duration type |
| `UnixTimestampSchema` | Schema | Unix timestamp (seconds) |
| `UnixTimestamp` | Type | Unix timestamp type |
| `MillisecondTimestampSchema` | Schema | Millisecond timestamp |
| `MillisecondTimestamp` | Type | Millisecond timestamp type |
| `YearSchema` | Schema | Year number |
| `Year` | Type | Year type |
| `CronExpressionSchema` | Schema | Cron expression (5-field) |
| `CronExpression` | Type | Cron expression type |

### Text Content

| Export | Kind | Description |
|--------|------|-------------|
| `TitleSchema` | Schema | Title string |
| `Title` | Type | Title type |
| `MetaTitleSchema` | Schema | Meta title (SEO) |
| `MetaTitle` | Type | Meta title type |
| `SummarySchema` | Schema | Summary string |
| `Summary` | Type | Summary type |
| `DescriptionSchema` | Schema | Description string |
| `Description` | Type | Description type |
| `MetaDescriptionSchema` | Schema | Meta description (SEO) |
| `MetaDescription` | Type | Meta description type |
| `ContentSchema` | Schema | Content string |
| `Content` | Type | Content type |
| `CommentSchema` | Schema | Comment string |
| `Comment` | Type | Comment type |
| `SearchQuerySchema` | Schema | Search query string |
| `SearchQuery` | Type | Search query type |
| `MessageSchema` | Schema | Message string |
| `Message` | Type | Message type |
| `LogMessageSchema` | Schema | Log message string |
| `LogMessage` | Type | Log message type |

### Encoding & Hashing

| Export | Kind | Description |
|--------|------|-------------|
| `EmailSchema` | Schema | Email address |
| `Email` | Type | Email type |
| `JsonStringSchema` | Schema | Valid JSON string |
| `JsonString` | Type | JSON string type |
| `Base64Schema` | Schema | Base64-encoded string |
| `Base64` | Type | Base64 type |
| `Sha256Schema` | Schema | SHA-256 hash |
| `Sha256` | Type | SHA-256 type |
| `Sha512Schema` | Schema | SHA-512 hash |
| `Sha512` | Type | SHA-512 type |
| `Md5Schema` | Schema | MD5 hash |
| `Md5` | Type | MD5 type |
| `JwtSchema` | Schema | JSON Web Token |
| `Jwt` | Type | JWT type |
| `HexColorSchema` | Schema | Hex color code |
| `HexColor` | Type | Hex color type |
| `HslColorSchema` | Schema | HSL color |
| `HslColor` | Type | HSL color type |
| `PasswordSchema` | Schema | Password string |
| `Password` | Type | Password type |
| `RegexPatternSchema` | Schema | Valid regex pattern |
| `RegexPattern` | Type | Regex pattern type |

### Internationalization

| Export | Kind | Description |
|--------|------|-------------|
| `CountryCodeSchema` | Schema | ISO 3166 country code |
| `CountryCode` | Type | Country code type |
| `LanguageCodeSchema` | Schema | ISO 639 language code |
| `LanguageCode` | Type | Language code type |
| `CurrencyCodeSchema` | Schema | ISO 4217 currency code |
| `CurrencyCode` | Type | Currency code type |
| `BCP47TagSchema` | Schema | BCP 47 language tag |
| `BCP47Tag` | Type | BCP 47 tag type |
| `PluralCategorySchema` | Schema | CLDR plural category |
| `PluralCategory` | Type | Plural category type |
| `RawLocaleStringsSchema` | Schema | Raw locale string record |
| `RawLocaleStrings` | Type | Raw locale strings type |

### CSS

| Export | Kind | Description |
|--------|------|-------------|
| `CssFontWeightSchema` | Schema | CSS font weight |
| `CssFontWeight` | Type | CSS font weight type |
| `CssFontFamilySchema` | Schema | CSS font family |
| `CssFontFamily` | Type | CSS font family type |
| `CssLengthSchema` | Schema | CSS length value |
| `CssLength` | Type | CSS length type |
| `CssClassListSchema` | Schema | CSS class list string |
| `CssClassList` | Type | CSS class list type |

### Docker & Infrastructure

| Export | Kind | Description |
|--------|------|-------------|
| `DockerImageTagSchema` | Schema | Docker image tag |
| `DockerImageTag` | Type | Docker image tag type |

### SEO & Web

| Export | Kind | Description |
|--------|------|-------------|
| `OpenGraphTypeSchema` | Schema | OpenGraph type |
| `OpenGraphType` | Type | OpenGraph type type |
| `RobotsDirectiveSchema` | Schema | Robots directive |
| `RobotsDirective` | Type | Robots directive type |

### Versioning

| Export | Kind | Description |
|--------|------|-------------|
| `SemverSchema` | Schema | Semantic version string |
| `Semver` | Type | Semver type |

### Environment & Variables

| Export | Kind | Description |
|--------|------|-------------|
| `EnvVarNameSchema` | Schema | Environment variable name |
| `EnvVarName` | Type | Env var name type |
| `EnvironmentSchema` | Schema | Environment (`development`, `production`, etc.) |
| `Environment` | Type | Environment type |
| `EnvRecordSchema` | Schema | `Record<string, string>` for env vars |
| `EnvRecord` | Type | Env record type |
| `EnvRecordWithUndefinedSchema` | Schema | Env record with optional values |
| `EnvRecordWithUndefined` | Type | Env record with undefined type |
| `OptionalEnvRecordSchema` | Schema | Optional env record |
| `OptionalEnvRecord` | Type | Optional env record type |

### Process & Exit Codes

| Export | Kind | Description |
|--------|------|-------------|
| `ExitCodeSchema` | Schema | Exit code (0-255) |
| `ExitCode` | Type | Exit code type |
| `OptionalExitCodeSchema` | Schema | `ExitCode \| undefined` |
| `OptionalExitCode` | Type | Optional exit code type |
| `NullableExitCodeSchema` | Schema | `ExitCode \| null` |
| `NullableExitCode` | Type | Nullable exit code type |
| `PlatformSchema` | Schema | Node.js platform identifier |
| `Platform` | Type | Platform type |
| `FatalExitOptionsSchema` | Schema | Options for `fatalExit` |
| `FatalExitOptions` | Type | Fatal exit options type |

### Logging

| Export | Kind | Description |
|--------|------|-------------|
| `LogLevelSchema` | Schema | Log level (`debug`, `info`, `warn`, `error`) |
| `LogLevel` | Type | Log level type |
| `OutputFormatSchema` | Schema | Output format (`text`, `json`) |
| `OutputFormat` | Type | Output format type |
| `PrintStreamSchema` | Schema | Print stream (`stdout`, `stderr`) |
| `PrintStream` | Type | Print stream type |
| `PrintOptionsSchema` | Schema | Print options |
| `PrintOptions` | Type | Print options type |
| `LogContextSchema` | Schema | Log context metadata |
| `LogContext` | Type | Log context type |
| `LogEntrySchema` | Schema | Log entry |
| `LogEntry` | Type | Log entry type |
| `ColorLevelSchema` | Schema | Terminal color support level |
| `ColorLevel` | Type | Color level type |
| `ConsoleLogFnSchema` | Schema | `console.log`/`console.error` function |
| `ConsoleLogFn` | Type | Console log function type |

### Shell & Commands

| Export | Kind | Description |
|--------|------|-------------|
| `CommandSchema` | Schema | Shell command string |
| `Command` | Type | Command type |
| `StdioOptionSchema` | Schema | Stdio option (`pipe`, `inherit`, etc.) |
| `StdioOption` | Type | Stdio option type |
| `SpawnProcessOptionsSchema` | Schema | Options for spawning processes |
| `SpawnProcessOptions` | Type | Spawn process options type |

### Workspace

| Export | Kind | Description |
|--------|------|-------------|
| `EnsureCommandResultSchema` | Schema | Result of `ensureCommand` |
| `EnsureCommandResult` | Type | Ensure command result type |
| `EnsureMiseResultSchema` | Schema | Result of `ensureMise` |
| `EnsureMiseResult` | Type | Ensure mise result type |
| `EnsureWorkspaceRootResultSchema` | Schema | Result of `ensureWorkspaceRoot` |
| `EnsureWorkspaceRootResult` | Type | Ensure workspace root result type |

### Runtime & CI Detection

| Export | Kind | Description |
|--------|------|-------------|
| `NodeMajorVersionSchema` | Schema | Node.js major version |
| `ProviderKindSchema` | Schema | CI provider kind |
| `ProviderKind` | Type | Provider kind type |
| `ProviderEnvCheckSchema` | Schema | CI provider env check |
| `ProviderEnvCheck` | Type | Provider env check type |
| `ProviderPRCheckSchema` | Schema | CI provider PR check |
| `ProviderPRCheck` | Type | Provider PR check type |
| `ProviderInfoSchema` | Schema | CI provider info |
| `ProviderInfo` | Type | Provider info type |
| `ProviderDefinitionSchema` | Schema | CI provider definition |
| `ProviderDefinition` | Type | Provider definition type |
| `AgentKindSchema` | Schema | CI agent kind |
| `AgentKind` | Type | Agent kind type |
| `AgentInfoSchema` | Schema | CI agent info |
| `AgentInfo` | Type | Agent info type |
| `AgentDefinitionSchema` | Schema | CI agent definition |
| `AgentDefinition` | Type | Agent definition type |
| `RuntimeKindSchema` | Schema | Runtime kind (`node-tty`, `browser`, etc.) |
| `RuntimeKind` | Type | Runtime kind type |
| `RuntimeInfoSchema` | Schema | Runtime info (kind + version) |
| `RuntimeInfo` | Type | Runtime info type |
| `RequiredRuntimeSchema` | Schema | Required runtime specification |
| `RequiredRuntime` | Type | Required runtime type |
| `SupportedRuntimesSchema` | Schema | Supported runtimes array |
| `SupportedRuntimes` | Type | Supported runtimes type |
| `EnvironmentConfigSchema` | Schema | Full environment configuration |
| `EnvironmentConfig` | Type | Environment config type |

### Error & Signals

| Export | Kind | Description |
|--------|------|-------------|
| `ErrorCodeSchema` | Schema | Error code string |
| `ErrorCode` | Type | Error code type |
| `ErrorMetaSchema` | Schema | Error context metadata |
| `ErrorMeta` | Type | Error meta type |
| `AbortSignalSchema` | Schema | AbortSignal validator |
| `AbortSignalType` | Type | AbortSignal type |
| `InterruptHandlerSchema` | Schema | Interrupt handler callback |
| `InterruptHandler` | Type | Interrupt handler type |
| `CleanupCallbackSchema` | Schema | Cleanup callback |
| `CleanupCallback` | Type | Cleanup callback type |
| `TeardownFnSchema` | Schema | Teardown function |
| `TeardownFn` | Type | Teardown function type |

### Nullable & Optional Composites

| Export | Kind | Description |
|--------|------|-------------|
| `NullableStrArraySchema` | Schema | `StrArray \| null` |
| `NullableStrArray` | Type | Nullable string array type |
| `DynamicModuleSchema` | Schema | Dynamic ES module |
| `DynamicModule` | Type | Dynamic module type |

### Platform Type Aliases

| Export | Kind | Description |
|--------|------|-------------|
| `OptionalNodeProcess` | Type | `NodeJS.Process \| undefined` |
| `NullableAbortController` | Type | `AbortController \| null` |
| `OptionalAbortSignal` | Type | `AbortSignal \| undefined` |
| `NullableAbortSignal` | Type | `AbortSignal \| null` |
| `NullableRegExpMatchArray` | Type | `RegExpMatchArray \| null` |
| `NullableRegExpExecArray` | Type | `RegExpExecArray \| null` |
| `NullableIntervalId` | Type | `NodeJS.Timeout \| null` |
| `JsonData` | Type | Recursive JSON data type |
| `HandlebarsValue` | Type | Handlebars helper value |
| `UntypedJson` | Type | Untyped JSON object |
| `UntypedParseResult` | Type | Untyped parse result |
| `CapacitorPlatformSchema` | Schema | Capacitor platform |
| `CapacitorPlatform` | Type | Capacitor platform type |

### Commerce & Pricing

| Export | Kind | Description |
|--------|------|-------------|
| `PriceSchema` | Schema | Non-negative price value |
| `Price` | Type | Inferred price type |
| `QuantitySchema` | Schema | Positive integer quantity |
| `Quantity` | Type | Inferred quantity type |
| `PercentageSchema` | Schema | Percentage 0-100 |
| `Percentage` | Type | Inferred percentage type |
| `DiscountPercentSchema` | Schema | Discount percentage 0-100 |
| `DiscountPercent` | Type | Inferred discount type |

### API & Pagination

| Export | Kind | Description |
|--------|------|-------------|
| `PaginationLimitSchema` | Schema | Page size 1-100 |
| `PaginationLimit` | Type | Inferred limit type |
| `PaginationOffsetSchema` | Schema | Non-negative offset |
| `PaginationOffset` | Type | Inferred offset type |
| `SortDirectionSchema` | Schema | Picklist: asc, desc |
| `SortDirection` | Type | Inferred direction type |
| `FilterOperatorSchema` | Schema | Picklist: eq, ne, gt, lt, gte, lte, in, contains |
| `FilterOperator` | Type | Inferred operator type |

### User & Identity

| Export | Kind | Description |
|--------|------|-------------|
| `PhoneSchema` | Schema | E.164 phone number |
| `Phone` | Type | Inferred phone type |
| `UsernameSchema` | Schema | Username 3-30 chars, alphanumeric |
| `Username` | Type | Inferred username type |

### Analytics & Events

| Export | Kind | Description |
|--------|------|-------------|
| `EventNameSchema` | Schema | Snake_case event name |
| `EventName` | Type | Inferred event name type |

### Package Management

| Export | Kind | Description |
|--------|------|-------------|
| `NpmPackageNameSchema` | Schema | Valid npm package name |
| `NpmPackageName` | Type | Inferred package name type |

### Networking (Single IP)

| Export | Kind | Description |
|--------|------|-------------|
| `Ipv4Schema` | Schema | Single IPv4 address |
| `Ipv4` | Type | Inferred IPv4 type |

### Conventions

Every schema follows the naming pattern:

- **Schema**: `FooSchema` (runtime Valibot validator)
- **Type**: `Foo` (TypeScript type via `v.InferOutput<typeof FooSchema>`)
- **Nullable**: `NullableFooSchema` / `NullableFoo` (`Foo | null`)
- **Optional**: `OptionalFooSchema` / `OptionalFoo` (`Foo | undefined`)
- **Default**: `DEFAULT_FOO` (validated constant)
