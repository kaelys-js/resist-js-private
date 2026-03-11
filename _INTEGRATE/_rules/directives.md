# Directive Suppression Lint Rules

Implement the **Directive Suppression** lint rules (12 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/directives/`

File patterns: `**/*.ts`, `**/*.tsx`, `**/*.mts`, `**/*.cts`, `**/*.svelte`, `**/*.js`, `**/*.jsx`

---

## Philosophy

Suppression directives are escape hatches that bypass safety checks. This codebase enforces:

1. **No third-party linter directives** - We use our own linting system. ESLint, Prettier, Biome, Oxlint directives are not allowed.
2. **TypeScript directives require justification** - `@ts-expect-error` must explain why.
3. **No blanket suppressions** - `@ts-ignore` and `@ts-nocheck` are banned.
4. **Limit suppression density** - Too many suppressions = fix the root cause.

---

## Rules

### 1. `directives/no-ts-ignore`

**What it catches:** `@ts-ignore` comments

**Why:** `@ts-ignore` silently suppresses errors forever. Use `@ts-expect-error` which fails when the error is fixed.

**Detection:** Comments containing `@ts-ignore`

```typescript
// ❌ Bad
// @ts-ignore
const value = unsafeOperation();

// @ts-ignore next line has issues
doSomething(badArg);

/* @ts-ignore */
problematicCode();

// ✅ Good - use @ts-expect-error with reason
// @ts-expect-error - Legacy API returns untyped response, tracked in JIRA-123
const value = unsafeOperation();

// ✅ Better - fix the actual type issue
const value: ExpectedType = safeOperation();
```

**Error message:** `@ts-ignore is banned - use @ts-expect-error with explanation, or fix the type error`

**Tip:** `Replace with: // @ts-expect-error - [explanation of why this is needed]`

---

### 2. `directives/no-ts-nocheck`

**What it catches:** `@ts-nocheck` comments

**Why:** Disables type-checking for entire file - completely defeats the purpose of TypeScript

**Detection:** Comments containing `@ts-nocheck`

```typescript
// ❌ Bad
// @ts-nocheck
// This file has too many errors, I'll fix them later...

export function doStuff(x) {
  return x.foo.bar.baz;  // No type safety!
}

// ✅ Good - fix the types or use targeted @ts-expect-error
export function doStuff(x: Input): Output {
  // @ts-expect-error - Legacy code migration, see MIGRATION.md
  return x.foo.bar.baz;
}

// ✅ Better - properly type everything
export function doStuff(x: Input): Output {
  return x.foo.bar.baz;
}
```

**Error message:** `@ts-nocheck is banned - file must have type-checking enabled`

**Tip:** `Remove @ts-nocheck and fix type errors individually, or use targeted @ts-expect-error with explanations`

---

### 3. `directives/require-ts-expect-error-reason`

**What it catches:** `@ts-expect-error` without explanation

**Why:** Future developers (including you) need to know why the suppression exists

**Detection:** `@ts-expect-error` not followed by ` - ` and explanation text

```typescript
// ❌ Bad - no explanation
// @ts-expect-error
const x = badCode();

// @ts-expect-error TODO fix later
const y = moreBadCode();

// @ts-expect-error ???
mystery();

// ✅ Good - clear explanation
// @ts-expect-error - Third-party library has incorrect types, PR submitted: github.com/lib/lib/pull/123
const x = badCode();

// @ts-expect-error - Svelte compiler transforms this, TS doesn't understand runes yet
let count = $state(0);

// @ts-expect-error - Intentional type narrowing test, value is actually string at runtime
expect(typeof value).toBe('string');
```

**Error message:** `@ts-expect-error requires explanation: // @ts-expect-error - [reason]`

**Tip:** `Add explanation: // @ts-expect-error - [why this suppression is needed]`

**Validation:** Reason must be at least 10 characters after ` - `

---

### 4. `directives/no-ts-expect-error-on-any`

**What it catches:** `@ts-expect-error` used to suppress errors on `any` typed code

**Why:** If the code is `any` typed, fix the type instead of suppressing errors

**Detection:** `@ts-expect-error` where the next line:
- Has a variable typed as `any`
- Calls a function returning `any`
- Accesses property on `any`

```typescript
// ❌ Bad - suppressing error on any
const data: any = fetchData();
// @ts-expect-error - data might not have this property
console.log(data.user.name);

function process(input: any) {
  // @ts-expect-error - input could be anything
  return input.transform();
}

// ✅ Good - fix the type
interface Data {
  user: { name: string };
}
const data: Data = fetchData();
console.log(data.user.name);  // No suppression needed

function process(input: Transformable) {
  return input.transform();  // No suppression needed
}

// ✅ Good - use unknown and narrow
const data: unknown = fetchData();
if (isValidData(data)) {
  console.log(data.user.name);  // Type narrowed
}
```

**Error message:** `@ts-expect-error on 'any' typed code - fix the type instead of suppressing`

**Tip:** `Replace 'any' with proper type, or use 'unknown' with type narrowing`

---

### 5. `directives/no-eslint-disable`

**What it catches:** Any `eslint-disable` comment (all forms)

**Why:** We don't use ESLint - we use our own linting system

**Detection:** Comments containing:
- `eslint-disable`
- `eslint-disable-next-line`
- `eslint-disable-line`
- `eslint-enable`

```typescript
// ❌ Bad - ESLint directives not used in this codebase
/* eslint-disable */
/* eslint-disable no-console */
// eslint-disable-next-line no-unused-vars
// eslint-disable-line

// ✅ Good - remove ESLint directives entirely
// If the code triggers our linter, either:
// 1. Fix the code
// 2. Use @ts-expect-error for type issues
// 3. Request a rule change if the rule is wrong
```

**Error message:** `ESLint directives are not used in this codebase - remove '${directive}'`

**Tip:** `Remove the ESLint directive. If code needs fixing, fix it. If rule is wrong, discuss changing it.`

---

### 6. `directives/no-prettier-ignore`

**What it catches:** Any `prettier-ignore` comment

**Why:** We don't use Prettier - we use Biome for formatting (and don't allow ignoring it)

**Detection:** Comments containing:
- `prettier-ignore`
- `prettier-ignore-start`
- `prettier-ignore-end`

```typescript
// ❌ Bad - Prettier directives not used in this codebase
// prettier-ignore
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/* prettier-ignore-start */
const config = {a:1,b:2,c:3};
/* prettier-ignore-end */

// ✅ Good - let the formatter do its job
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// Formatter will handle this appropriately
const config = { a: 1, b: 2, c: 3 };
```

**Error message:** `Prettier directives are not used in this codebase - remove '${directive}'`

**Tip:** `Remove the Prettier directive. Formatting is handled by Biome and should be consistent.`

---

### 7. `directives/no-biome-ignore`

**What it catches:** Any `biome-ignore` comment

**Why:** We don't allow bypassing Biome rules - fix the code or change the rule

**Detection:** Comments containing `biome-ignore`

```typescript
// ❌ Bad - Biome directives not allowed
// biome-ignore lint/complexity/noForEach: I prefer forEach
array.forEach(item => process(item));

// biome-ignore format: keep this formatting
const x={a:1,b:2};

// ✅ Good - follow Biome rules
for (const item of array) {
  process(item);
}

const x = { a: 1, b: 2 };

// If a Biome rule is genuinely wrong for the codebase,
// change it in biome.json, don't suppress per-file
```

**Error message:** `Biome ignore directives are not allowed - fix the code or adjust biome.json`

**Tip:** `Fix the code to satisfy Biome, or if the rule is wrong for this codebase, update biome.json`

---

### 8. `directives/no-oxlint-ignore`

**What it catches:** Any `oxlint-ignore` or `oxlint-disable` comment

**Why:** We don't allow bypassing Oxlint rules - fix the code or change the rule

**Detection:** Comments containing:
- `oxlint-ignore`
- `oxlint-disable`
- `oxlint-disable-next-line`
- `oxlint-enable`

```typescript
// ❌ Bad - Oxlint directives not allowed
// oxlint-ignore-next-line
const unused = 'value';

/* oxlint-disable no-console */
console.log('debug');
/* oxlint-enable no-console */

// ✅ Good - follow Oxlint rules or configure globally
// Remove unused variables
// Use proper logging instead of console.log

// If an Oxlint rule is genuinely wrong for the codebase,
// change it in oxlint.json, don't suppress per-file
```

**Error message:** `Oxlint directives are not allowed - fix the code or adjust oxlint.json`

**Tip:** `Fix the code to satisfy Oxlint, or if the rule is wrong for this codebase, update oxlint.json`

---

### 9. `directives/no-type-assertion-chain`

**What it catches:** `as unknown as Type` double assertion pattern

**Why:** This is a dangerous escape hatch that bypasses all type safety

**Detection:** `as unknown as` or `as any as` in code

```typescript
// ❌ Bad - double assertion bypasses type system
const user = data as unknown as User;
const config = response as any as Config;

function cast<T>(value: unknown): T {
  return value as unknown as T;  // Dangerous!
}

// ✅ Good - use type guards
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}

if (isUser(data)) {
  const user = data;  // Properly narrowed
}

// ✅ Good - use Valibot for runtime validation
const result = v.safeParse(UserSchema, data);
if (result.success) {
  const user = result.output;  // Properly typed
}

// ✅ Acceptable - single assertion with comment when truly needed
// Type is guaranteed by external contract (API schema)
const user = data as User;
```

**Error message:** `Double type assertion 'as unknown as' bypasses type safety - use type guards or runtime validation`

**Tip:** `Use Valibot schema validation or type guard function instead of double assertion`

---

### 10. `directives/max-suppressions-per-file`

**What it catches:** Files with too many `@ts-expect-error` directives

**Why:** Many suppressions indicate the file needs refactoring, not more suppressions

**Detection:** Count `@ts-expect-error` comments in file, error if > threshold

**Threshold:** 3 per file (configurable)

```typescript
// ❌ Bad - too many suppressions (4+)
// @ts-expect-error - reason 1
code1();
// @ts-expect-error - reason 2
code2();
// @ts-expect-error - reason 3
code3();
// @ts-expect-error - reason 4
code4();  // This one triggers the rule

// ✅ Good - refactor to reduce suppressions
// Consider:
// 1. Fix the underlying type issues
// 2. Create proper type definitions
// 3. Use runtime validation instead of suppressions
// 4. Split file if dealing with multiple untyped libraries
```

**Error message:** `File has ${count} @ts-expect-error directives (max: 3) - refactor to reduce suppressions`

**Tip:** `Too many suppressions indicate deeper issues. Fix types, add proper definitions, or refactor.`

---

### 11. `directives/no-suppression-in-new-code`

**What it catches:** `@ts-expect-error` in recently added/modified code

**Why:** New code should be properly typed from the start

**Detection:** `@ts-expect-error` where git blame shows line added within last N days (configurable, default 7)

**Note:** This rule requires git integration

```typescript
// ❌ Bad - adding suppression to new code
// (file created today)
export function newFeature() {
  // @ts-expect-error - I don't know what type this should be
  return mysteryFunction();
}

// ✅ Good - new code should have proper types
export function newFeature(): FeatureResult {
  return typedFunction();
}

// ✅ Acceptable - suppression in legacy code being gradually fixed
// (file last modified 6 months ago, suppression was already there)
// @ts-expect-error - Legacy API, migration tracked in JIRA-456
legacyCode();
```

**Error message:** `New code should not have @ts-expect-error - properly type the code instead`

**Tip:** `This code was recently written. Take the time to add proper types instead of suppressing errors.`

**Note:** Can be disabled for migration branches with config

---

### 12. `directives/no-generic-any-assertion`

**What it catches:** Type assertions to `any` - `as any`

**Why:** `as any` defeats type safety; use proper types or `unknown` with narrowing

**Detection:** `as any` in code (not comments)

```typescript
// ❌ Bad - asserting to any
const value = getData() as any;
element.addEventListener('click', handler as any);
return response.json() as any;

function process(input: SomeType) {
  (input as any).secretMethod();  // Bypassing type system
}

// ✅ Good - use proper types
const value: ExpectedType = getData();

// ✅ Good - use unknown and narrow
const value: unknown = getData();
if (isExpectedType(value)) {
  // Use value with proper type
}

// ✅ Good - extend types properly
interface ExtendedInput extends SomeType {
  secretMethod(): void;
}
function process(input: ExtendedInput) {
  input.secretMethod();  // Properly typed
}

// ✅ Acceptable edge case - test mocking (with explanation)
// @ts-expect-error - Mocking internal method for test
jest.spyOn(service as any, '_privateMethod');
```

**Error message:** `'as any' assertion defeats type safety - use proper types or 'unknown' with type guards`

**Tip:** `Replace 'as any' with proper type, or use 'unknown' with runtime type narrowing`

---

## Detection Implementation

### Comment Parsing

```typescript
// Match patterns in comments
const DIRECTIVE_PATTERNS = {
  tsIgnore: /@ts-ignore/,
  tsNoCheck: /@ts-nocheck/,
  tsExpectError: /@ts-expect-error/,
  tsExpectErrorWithReason: /@ts-expect-error\s+-\s+.{10,}/,  // Has explanation (10+ chars)

  eslintDisable: /eslint-disable(?:-next-line|-line)?/,
  eslintEnable: /eslint-enable/,

  prettierIgnore: /prettier-ignore(?:-start|-end)?/,

  biomeIgnore: /biome-ignore/,

  oxlintIgnore: /oxlint-(?:ignore|disable)(?:-next-line)?/,
  oxlintEnable: /oxlint-enable/,
};

// Match patterns in code
const CODE_PATTERNS = {
  asUnknownAs: /as\s+unknown\s+as\s+/,
  asAnyAs: /as\s+any\s+as\s+/,
  asAny: /as\s+any(?:\s|;|,|\)|\])/,
};
```

### Visitor Hooks Needed

```typescript
visitor: {
  // For comment-based directives
  Program(node: AstNode, context: VisitorContext): LintResult[] {
    // Parse all comments in file
    // Check against directive patterns
  },

  // For code-based patterns (type assertions)
  TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
    // Check for 'as any' and 'as unknown as'
  },
}
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `no-ts-ignore` | error | `@ts-ignore` (use `@ts-expect-error`) |
| `no-ts-nocheck` | error | `@ts-nocheck` (file-level disable) |
| `require-ts-expect-error-reason` | error | `@ts-expect-error` without explanation |
| `no-ts-expect-error-on-any` | warning | Suppression on `any` typed code |
| `no-eslint-disable` | error | All ESLint directives |
| `no-prettier-ignore` | error | All Prettier directives |
| `no-biome-ignore` | error | All Biome directives |
| `no-oxlint-ignore` | error | All Oxlint directives |
| `no-type-assertion-chain` | error | `as unknown as Type` |
| `max-suppressions-per-file` | warning | >3 suppressions per file |
| `no-suppression-in-new-code` | warning | Suppressions in recent code |
| `no-generic-any-assertion` | error | `as any` assertions |

**Total: 12 rules**

---

## Configuration

```typescript
// Rule configuration options
interface DirectivesConfig {
  // max-suppressions-per-file
  maxSuppressionsPerFile: number;  // Default: 3

  // no-suppression-in-new-code
  newCodeDaysThreshold: number;    // Default: 7
  enableGitIntegration: boolean;   // Default: true

  // Patterns to allow (escape hatch for truly exceptional cases)
  allowedPatterns: string[];       // Default: []
}
```
