# Primitives Lint Rules

Implement the **Numbers/Math/Primitives** lint rules (32 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/primitives/`

File patterns: `**/*.ts`, `**/*.tsx`, `**/*.mts`, `**/*.cts`, `**/*.svelte`

---

## Already Covered by Oxlint

The following are **already handled by oxlint** (do not implement):

- ❌ `no-compare-neg-zero` - Comparisons to `-0`
- ❌ `radix` - parseInt radix parameter
- ❌ `no-loss-of-precision` - Numeric precision issues
- ❌ `eqeqeq` - `===` vs `==`
- ❌ `no-implicit-coercion` - `+str`, `!!val`, etc.
- ❌ `no-eq-null` - `== null` comparisons
- ❌ `use-isnan` - `Number.isNaN()` vs `isNaN()`
- ❌ `no-wrapper-object-types` - `new Number()`, `new String()`, `new Boolean()`
- ❌ `no-bitwise` - Bitwise operators (configurable)
- ❌ `valid-typeof` - typeof validation

---

## Rules to Implement

### Number Precision & Safety

#### 1. `primitives/no-unsafe-integer`

**What it catches:** Numbers larger than `Number.MAX_SAFE_INTEGER` (9007199254740991)

**Why:** JavaScript loses precision silently for integers > 2^53 - 1

**Detection:**
- Numeric literals > 9007199254740991
- Variables compared/assigned to values that could exceed safe integer

```typescript
// ❌ Bad
const id = 9007199254740992;  // Already lost precision!
const timestamp = 1234567890123456789;  // Too large

const response = await fetch('/api');
const data = await response.json();
const userId = data.id;  // If ID > MAX_SAFE_INTEGER, it's wrong

// ✅ Good
const id = 9007199254740991n;  // BigInt
const id = "9007199254740992";  // String for transport

// For JSON with large IDs, parse with reviver
const data = JSON.parse(text, (key, value) => {
  if (key === 'id') return BigInt(value);
  return value;
});
```

**Error message:** `Number ${value} exceeds MAX_SAFE_INTEGER - use BigInt or string`

**Tip:** `Use BigInt (${value}n) or keep as string to preserve precision`

---

#### 2. `primitives/no-float-equality`

**What it catches:** Direct equality comparison of floating-point numbers

**Why:** `0.1 + 0.2 !== 0.3` due to IEEE 754 representation

**Detection:** `===` or `!==` where either operand is:
- A float literal (contains `.`)
- Result of division
- Result of arithmetic that could produce float

```typescript
// ❌ Bad
if (0.1 + 0.2 === 0.3) { ... }  // false!
if (total === 19.99) { ... }
if (percentage === 0.5) { ... }

const ratio = a / b;
if (ratio === 0.75) { ... }  // Dangerous

// ✅ Good - epsilon comparison
const EPSILON = Number.EPSILON;
if (Math.abs((0.1 + 0.2) - 0.3) < EPSILON) { ... }

// ✅ Good - use integers for currency
const totalCents = 1999;
if (totalCents === 1999) { ... }  // Safe integer comparison

// ✅ Good - explicit tolerance
function floatEquals(a: number, b: number, tolerance = 1e-10): boolean {
  return Math.abs(a - b) < tolerance;
}
```

**Error message:** `Avoid direct equality comparison of floats - use epsilon comparison or integers`

**Tip:** `Use Math.abs(a - b) < Number.EPSILON or work with integers`

---

#### 3. `primitives/no-infinity-arithmetic`

**What it catches:** Arithmetic operations that could result in `Infinity` without handling

**Why:** `Infinity` propagates through calculations silently

**Detection:**
- Division where divisor could be zero (see also `division-by-zero`)
- `Math.pow` or `**` with large exponents
- Exponential growth in loops without bounds checking

```typescript
// ❌ Bad
const rate = amount / time;  // What if time is 0?
const growth = Math.pow(base, years);  // Could be Infinity
const result = x ** y;  // Unbounded

// ❌ Bad - no check for Infinity result
function calculate(x: number): number {
  return 1 / x;  // Returns Infinity when x = 0
}

// ✅ Good - handle edge cases
function calculate(x: number): number {
  if (x === 0) throw new Error('Division by zero');
  const result = 1 / x;
  if (!Number.isFinite(result)) throw new Error('Result is infinite');
  return result;
}

// ✅ Good - explicit bounds
const MAX_EXPONENT = 100;
if (years > MAX_EXPONENT) throw new Error('Exponent too large');
const growth = Math.pow(base, years);
```

**Error message:** `Operation may result in Infinity - add bounds checking or handle edge case`

**Tip:** `Check for zero divisor or use Number.isFinite() on result`

---

#### 4. `primitives/use-number-is-finite`

**What it catches:** Global `isFinite()` function

**Why:** Global `isFinite()` coerces argument to number first (`isFinite("123")` is true)

**Detection:** `isFinite()` call (not `Number.isFinite()`)

```typescript
// ❌ Bad
if (isFinite(value)) { ... }
if (isFinite("123")) { ... }  // true! (coerces to 123)
if (isFinite("")) { ... }     // true! (coerces to 0)
if (isFinite(null)) { ... }   // true! (coerces to 0)

// ✅ Good
if (Number.isFinite(value)) { ... }
if (Number.isFinite("123")) { ... }  // false (no coercion)
if (Number.isFinite("")) { ... }     // false
if (Number.isFinite(null)) { ... }   // false
```

**Error message:** `Use Number.isFinite() instead of isFinite() to avoid type coercion`

**Tip:** `Replace isFinite(x) with Number.isFinite(x)`

**Autofix:** Yes

---

#### 5. `primitives/use-number-is-integer`

**What it catches:** Manual integer checks

**Why:** `Number.isInteger()` is clearer and handles edge cases

**Detection:** Patterns like:
- `x % 1 === 0`
- `Math.floor(x) === x`
- `Math.round(x) === x`
- `parseInt(x, 10) === x`

```typescript
// ❌ Bad
if (x % 1 === 0) { ... }
if (Math.floor(x) === x) { ... }
if (Math.round(x) === x) { ... }
if (Number(x) === parseInt(x, 10)) { ... }

// ✅ Good
if (Number.isInteger(x)) { ... }

// Note: Number.isInteger also returns false for Infinity, NaN
Number.isInteger(Infinity);  // false
Number.isInteger(NaN);       // false
Number.isInteger(1.0);       // true (1.0 === 1)
```

**Error message:** `Use Number.isInteger() instead of manual integer check`

**Tip:** `Replace with Number.isInteger(x)`

**Autofix:** Yes

---

#### 6. `primitives/no-toFixed-rounding`

**What it catches:** `.toFixed()` used for precise financial/decimal rounding

**Why:** `toFixed()` uses "round half away from zero" inconsistently across browsers

**Detection:** `.toFixed()` calls, especially in financial contexts (variables named price, amount, total, etc.)

```typescript
// ❌ Bad - inconsistent rounding
const price = (19.995).toFixed(2);  // "20.00" or "19.99" depending on browser!
const tax = (amount * 0.0725).toFixed(2);

// ❌ Bad - returns string, not number
const rounded = value.toFixed(2);
const result = rounded + 1;  // "1.231" string concatenation!

// ✅ Good - use proper decimal library for money
import Decimal from 'decimal.js';
const price = new Decimal(19.995).toFixed(2);  // Consistent

// ✅ Good - use integers for currency (cents)
const priceCents = 1999;
const displayPrice = (priceCents / 100).toLocaleString('en-US', {
  style: 'currency',
  currency: 'USD',
});

// ✅ Good - explicit rounding then toFixed for display only
const rounded = Math.round(value * 100) / 100;
const display = rounded.toFixed(2);
```

**Error message:** `toFixed() has inconsistent rounding - use decimal library for precision or integers for currency`

**Tip:** `For currency, use integers (cents). For display, round explicitly first.`

---

### BigInt

#### 7. `primitives/prefer-bigint-for-ids`

**What it catches:** Database IDs or external IDs stored as `number` that could exceed safe integer

**Why:** Database auto-increment IDs and external system IDs often exceed 2^53

**Detection:**
- Variables named `*Id`, `*ID`, `id` typed as `number`
- JSON parsing of `id` fields without BigInt handling
- Number type for fields that could be large identifiers

```typescript
// ❌ Bad
interface User {
  id: number;  // Could exceed MAX_SAFE_INTEGER
  twitterId: number;  // Twitter IDs are > 2^53
  discordId: number;  // Discord IDs are snowflakes (64-bit)
}

const userId: number = data.id;

// ✅ Good - use string or bigint for IDs
interface User {
  id: string;  // Safe for JSON transport
  twitterId: bigint;  // If doing math with it
  discordId: string;  // String is safest for external IDs
}

// ✅ Good - Valibot schema with bigint coercion
const UserSchema = v.object({
  id: v.pipe(v.string(), v.transform(BigInt)),
});
```

**Error message:** `ID field '${name}' as number may lose precision - use string or bigint`

**Tip:** `Use string for IDs in JSON, or bigint if doing arithmetic`

**Severity:** warning

---

#### 8. `primitives/no-bigint-number-mix`

**What it catches:** Operations mixing `bigint` and `number` types

**Why:** `bigint + number` throws TypeError at runtime

**Detection:** Binary operations where one operand is bigint and other is number

```typescript
// ❌ Bad - TypeError at runtime
const big = 123n;
const num = 456;
const sum = big + num;  // TypeError!
const product = big * 2;  // TypeError! (2 is number)

// ❌ Bad - comparison works but is confusing
if (big > num) { ... }  // Works but easy to make mistakes

// ✅ Good - explicit conversion
const sum = big + BigInt(num);
const product = big * 2n;

// ✅ Good - consistent types
const big1 = 123n;
const big2 = 456n;
const sum = big1 + big2;
```

**Error message:** `Cannot mix bigint and number in operation - explicitly convert types`

**Tip:** `Use BigInt(number) or Number(bigint) for explicit conversion`

---

### Math Operations

#### 9. `primitives/no-math-random-crypto`

**What it catches:** `Math.random()` used in security-sensitive contexts

**Why:** `Math.random()` is not cryptographically secure

**Detection:** `Math.random()` in:
- Files with "auth", "token", "secret", "password", "key" in path/name
- Functions named generate*Token, create*Key, etc.
- Contexts generating IDs, tokens, or secrets

```typescript
// ❌ Bad - predictable "random" values
function generateToken(): string {
  return Math.random().toString(36).substring(2);
}

function generateId(): string {
  return `id-${Math.random()}`;
}

const sessionId = Math.random().toString();

// ✅ Good - crypto API
function generateToken(): string {
  return crypto.randomUUID();
}

function generateSecureRandom(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ✅ OK - Math.random for non-security (games, UI)
const randomColor = colors[Math.floor(Math.random() * colors.length)];
```

**Error message:** `Math.random() is not cryptographically secure - use crypto.randomUUID() or crypto.getRandomValues()`

**Tip:** `Use crypto.randomUUID() for IDs or crypto.getRandomValues() for random bytes`

---

#### 10. `primitives/division-by-zero`

**What it catches:** Division where divisor could be zero

**Why:** Returns `Infinity` or `NaN` silently instead of throwing

**Detection:**
- Division by variable without zero check
- Division by expression that could evaluate to zero

```typescript
// ❌ Bad
function average(total: number, count: number): number {
  return total / count;  // What if count is 0?
}

const rate = transactions / days;
const percentage = (part / whole) * 100;

// ✅ Good - explicit check
function average(total: number, count: number): number {
  if (count === 0) {
    throw new Error('Cannot calculate average of zero items');
  }
  return total / count;
}

// ✅ Good - return default/sentinel
function safeAverage(total: number, count: number): number | null {
  if (count === 0) return null;
  return total / count;
}

// ✅ Good - guard clause with Result type
function average(total: number, count: number): Result<number, 'DIVISION_BY_ZERO'> {
  if (count === 0) return err('DIVISION_BY_ZERO');
  return ok(total / count);
}
```

**Error message:** `Potential division by zero - add check for zero divisor`

**Tip:** `Check divisor: if (divisor === 0) throw/return before dividing`

---

#### 11. `primitives/no-modulo-negative`

**What it catches:** Modulo operator `%` with potentially negative dividend

**Why:** JavaScript `%` is remainder, not modulo - `-5 % 3 === -2` not `1`

**Detection:** `%` operator where left operand could be negative

```typescript
// ❌ Bad - unexpected results with negative numbers
function getIndex(offset: number, length: number): number {
  return offset % length;  // -1 % 5 === -1, not 4!
}

const position = index % arrayLength;  // Negative if index < 0

// ✅ Good - proper mathematical modulo
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function getIndex(offset: number, length: number): number {
  return mod(offset, length);
}

// ✅ Good - ensure non-negative input
function getIndex(offset: number, length: number): number {
  if (offset < 0) throw new Error('Offset must be non-negative');
  return offset % length;
}
```

**Error message:** `% operator with potentially negative number - JavaScript % is remainder, not modulo`

**Tip:** `Use ((n % m) + m) % m for true modulo, or ensure non-negative input`

---

#### 12. `primitives/prefer-math-trunc`

**What it catches:** `Math.floor()` used for truncation toward zero

**Why:** `Math.floor(-2.5) === -3` but you might expect `-2`

**Detection:** `Math.floor()` on values that could be negative

```typescript
// ❌ Bad - floor goes toward negative infinity
const truncated = Math.floor(value);  // floor(-2.5) = -3

function getWholePart(n: number): number {
  return Math.floor(n);  // Wrong for negative!
}

// ✅ Good - trunc goes toward zero
const truncated = Math.trunc(value);  // trunc(-2.5) = -2

function getWholePart(n: number): number {
  return Math.trunc(n);  // Correct for all numbers
}

// ✅ Also good - if floor is intentional, comment it
// Intentionally floor (round toward -∞) for grid alignment
const gridRow = Math.floor(y / cellHeight);
```

**Error message:** `Math.floor() on potentially negative value - use Math.trunc() for consistent truncation toward zero`

**Tip:** `Use Math.trunc(x) if you want integer part, Math.floor(x) if you want toward -∞`

---

#### 13. `primitives/no-lossy-math-operation`

**What it catches:** Rounding patterns that lose precision for currency/decimals

**Why:** `Math.round(x * 100) / 100` accumulates floating-point errors

**Detection:**
- `Math.round(x * N) / N` patterns
- `Math.floor(x * N) / N` patterns
- Variables named price, amount, total, cost, etc. with these patterns

```typescript
// ❌ Bad - precision loss
const rounded = Math.round(price * 100) / 100;
const tax = Math.round(amount * 0.0725 * 100) / 100;

// Multiple operations compound the error
let total = 0;
for (const item of items) {
  total += Math.round(item.price * 100) / 100;
}

// ✅ Good - work in smallest unit (cents)
const priceCents = Math.round(price * 100);
const taxCents = Math.round(amountCents * 0.0725);

let totalCents = 0;
for (const item of items) {
  totalCents += item.priceCents;
}
const total = totalCents / 100;

// ✅ Good - use decimal library
import Decimal from 'decimal.js';
const tax = new Decimal(amount).times(0.0725).toDecimalPlaces(2);
```

**Error message:** `Lossy rounding pattern for decimal precision - use integers (cents) or decimal library`

**Tip:** `Work with integers (cents for currency) or use a decimal library like decimal.js`

---

### String Edge Cases

#### 14. `primitives/no-string-length-unicode`

**What it catches:** `.length` on strings that may contain emoji/unicode

**Why:** `"😀".length === 2` because of UTF-16 surrogate pairs

**Detection:**
- `.length` on user input strings
- `.length` on strings from external sources
- String length validation without considering unicode

```typescript
// ❌ Bad - wrong count for emoji
const len = username.length;  // "John😀".length === 6, not 5
if (bio.length > 280) { ... }  // Twitter-like limit broken by emoji

function truncate(str: string, max: number): string {
  return str.slice(0, max);  // May cut emoji in half!
}

// ✅ Good - use spread or Array.from for codepoints
const len = [...username].length;  // Correct: 5
if ([...bio].length > 280) { ... }

function truncate(str: string, max: number): string {
  const chars = [...str];
  return chars.slice(0, max).join('');
}

// ✅ Good - Intl.Segmenter for grapheme clusters (best)
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const graphemes = [...segmenter.segment(str)];
const len = graphemes.length;  // Handles combined emoji like 👨‍👩‍👧
```

**Error message:** `String .length counts UTF-16 code units, not characters - use [...str].length for unicode`

**Tip:** `Use [...str].length for codepoints or Intl.Segmenter for grapheme clusters`

---

#### 15. `primitives/no-string-index-unicode`

**What it catches:** `str[i]` or `str.charAt(i)` on unicode strings

**Why:** May return half of a surrogate pair for emoji

**Detection:**
- Bracket notation on strings `str[index]`
- `.charAt()` calls
- Iteration with index instead of `for...of`

```typescript
// ❌ Bad - gets surrogate pair halves
const first = str[0];  // "😀"[0] === "\uD83D" (garbage)
const char = str.charAt(0);  // Same problem

for (let i = 0; i < str.length; i++) {
  console.log(str[i]);  // Broken for emoji
}

// ✅ Good - use codePointAt or spread
const first = str.codePointAt(0);
const firstChar = String.fromCodePoint(str.codePointAt(0)!);

// ✅ Good - iterate with for...of
for (const char of str) {
  console.log(char);  // Works for emoji
}

// ✅ Good - spread to array
const chars = [...str];
const first = chars[0];
```

**Error message:** `String indexing may split unicode characters - use [...str] or for...of`

**Tip:** `Use [...str][i] for character access or for...of for iteration`

---

#### 16. `primitives/prefer-normalize-comparison`

**What it catches:** String comparison without `.normalize()`

**Why:** Same visual character can have multiple unicode representations

**Detection:** String equality comparison on user input or external data

```typescript
// ❌ Bad - may fail for same-looking strings
if (name1 === name2) { ... }  // "café" !== "café" (different encodings!)
const unique = [...new Set(names)];  // May have "duplicates"

// "é" can be:
// U+00E9 (single codepoint)
// U+0065 U+0301 (e + combining accent)

// ✅ Good - normalize before comparison
if (name1.normalize() === name2.normalize()) { ... }

// ✅ Good - normalize for deduplication
const unique = [...new Set(names.map(n => n.normalize()))];

// ✅ Good - use localeCompare for sorting
names.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
```

**Error message:** `String comparison without normalize() - visually identical strings may have different encodings`

**Tip:** `Use str.normalize() before comparison or localeCompare() with options`

**Severity:** warning

---

#### 17. `primitives/no-regex-on-untrusted`

**What it catches:** `new RegExp()` with user-provided input

**Why:** ReDoS (Regular Expression Denial of Service) vulnerability

**Detection:**
- `new RegExp(variable)` where variable is from user input
- `new RegExp(param)` in functions
- Template literals in RegExp constructor

```typescript
// ❌ Bad - ReDoS vulnerability
function search(query: string, text: string): boolean {
  const regex = new RegExp(query);  // User can input "(a+)+$"
  return regex.test(text);
}

const pattern = new RegExp(userInput, 'i');
const filtered = items.filter(i => pattern.test(i.name));

// ✅ Good - escape special characters
import { escapeRegExp } from 'lodash';  // or implement yourself

function search(query: string, text: string): boolean {
  const escaped = escapeRegExp(query);
  const regex = new RegExp(escaped);
  return regex.test(text);
}

// ✅ Good - use string methods instead
function search(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

// ✅ Good - use safe regex library
import { RE2 } from 're2';  // Linear time matching
const pattern = new RE2(userInput);
```

**Error message:** `RegExp with user input is ReDoS vulnerability - escape input or use string methods`

**Tip:** `Use escapeRegExp(input) or string methods like includes(), startsWith()`

---

### Date/Time

#### 18. `primitives/no-new-date-string-parse`

**What it catches:** `new Date(string)` with date strings

**Why:** Date parsing is implementation-dependent and inconsistent

**Detection:** `new Date()` with string argument (not timestamp number)

```typescript
// ❌ Bad - inconsistent parsing
new Date("2024-01-15");         // Midnight UTC
new Date("01/15/2024");         // Midnight local (US format)
new Date("15/01/2024");         // Invalid or Jan 15 depending on browser
new Date("January 15, 2024");   // Varies by browser
new Date("2024-01-15T10:30");   // Local or UTC? Depends!

// ✅ Good - explicit parsing
new Date(2024, 0, 15);  // January 15, 2024 (month is 0-indexed!)
new Date(2024, 0, 15, 10, 30, 0);  // With time

// ✅ Good - ISO 8601 with timezone
new Date("2024-01-15T10:30:00Z");  // Explicit UTC
new Date("2024-01-15T10:30:00-05:00");  // Explicit timezone

// ✅ Good - use date library
import { parseISO } from 'date-fns';
const date = parseISO("2024-01-15");

// ✅ Good - Temporal API (when available)
const date = Temporal.PlainDate.from("2024-01-15");
```

**Error message:** `Date string parsing is inconsistent - use explicit constructor or date library`

**Tip:** `Use new Date(year, month, day) or ISO 8601 with timezone, or use date-fns`

---

#### 19. `primitives/no-date-mutation`

**What it catches:** Date mutation methods (setX methods)

**Why:** Mutates in place, confusing and error-prone

**Detection:** Calls to `setFullYear`, `setMonth`, `setDate`, `setHours`, `setMinutes`, `setSeconds`, `setMilliseconds`, `setTime`

```typescript
// ❌ Bad - mutation is confusing
const date = new Date();
date.setMonth(date.getMonth() + 1);  // Mutates in place!
console.log(date);  // Original variable changed

function addMonth(date: Date): Date {
  date.setMonth(date.getMonth() + 1);  // Mutates argument!
  return date;
}

// ❌ Bad - surprising behavior
const jan31 = new Date(2024, 0, 31);
jan31.setMonth(1);  // Becomes March 2! (Feb doesn't have 31 days)

// ✅ Good - create new dates
const date = new Date();
const nextMonth = new Date(date);
nextMonth.setMonth(nextMonth.getMonth() + 1);

// ✅ Good - use date library with immutable operations
import { addMonths } from 'date-fns';
const nextMonth = addMonths(date, 1);

// ✅ Good - Temporal API (immutable by design)
const date = Temporal.PlainDate.from("2024-01-31");
const nextMonth = date.add({ months: 1 });  // Returns new instance
```

**Error message:** `Date mutation methods are error-prone - create new Date or use date-fns`

**Tip:** `Use date-fns functions like addMonths() which return new instances`

---

#### 20. `primitives/no-date-arithmetic`

**What it catches:** Arithmetic operations directly on Date objects

**Why:** Returns milliseconds, easy to misinterpret

**Detection:**
- Subtraction of Date objects: `date1 - date2`
- Comparison without explicit method: `date1 < date2`

```typescript
// ❌ Bad - returns milliseconds, easy to misuse
const elapsed = endDate - startDate;  // Milliseconds!
const days = elapsed / 24 / 60 / 60 / 1000;  // Doesn't account for DST

if (date1 > date2) { ... }  // Works but implicit

// ❌ Bad - common mistake
const daysDiff = date1 - date2;  // Forgot to convert from ms!

// ✅ Good - explicit milliseconds
const elapsedMs = endDate.getTime() - startDate.getTime();
const elapsedSeconds = elapsedMs / 1000;

// ✅ Good - use date library
import { differenceInDays, isBefore } from 'date-fns';
const days = differenceInDays(endDate, startDate);
if (isBefore(date1, date2)) { ... }

// ✅ Good - explicit comparison
if (date1.getTime() > date2.getTime()) { ... }
```

**Error message:** `Date arithmetic returns milliseconds - use date-fns or explicit getTime()`

**Tip:** `Use differenceInDays/Hours/etc from date-fns, or explicitly use getTime()`

---

### JSON Edge Cases

#### 21. `primitives/no-json-bigint`

**What it catches:** JSON.parse on data containing large integers without reviver

**Why:** JSON has no BigInt - large numbers lose precision when parsed

**Detection:**
- `JSON.parse()` without reviver on API responses
- JSON fields named `*Id`, `*id` that could be large

```typescript
// ❌ Bad - loses precision for large IDs
const data = JSON.parse(response);
const userId = data.id;  // If > MAX_SAFE_INTEGER, it's wrong!

// Discord snowflake example:
// Original: 123456789012345678901
// After JSON.parse: 123456789012345680000 (wrong!)

// ✅ Good - use reviver for known large fields
const data = JSON.parse(response, (key, value) => {
  if (key === 'id' || key.endsWith('Id')) {
    return typeof value === 'number' ? BigInt(value) : value;
  }
  return value;
});

// ✅ Good - API returns string IDs
// Server: { "id": "123456789012345678901" }
const data = JSON.parse(response);  // id is string, safe

// ✅ Good - use json-bigint library
import JSONBig from 'json-bigint';
const data = JSONBig.parse(response);
```

**Error message:** `JSON.parse without reviver may lose precision on large integers`

**Tip:** `Use JSON.parse with reviver for BigInt fields, or use json-bigint library`

**Severity:** warning

---

#### 22. `primitives/no-json-undefined`

**What it catches:** JSON.stringify on objects with `undefined` values

**Why:** `undefined` is omitted from objects, converted to `null` in arrays

**Detection:**
- `JSON.stringify()` on objects that may have undefined
- No replacer function handling undefined

```typescript
// ❌ Bad - undefined disappears
const obj = { a: 1, b: undefined, c: 3 };
JSON.stringify(obj);  // '{"a":1,"c":3}' - b is gone!

const arr = [1, undefined, 3];
JSON.stringify(arr);  // '[1,null,3]' - undefined becomes null

// ❌ Bad - optional fields disappear
interface User {
  name: string;
  age?: number;
}
const user: User = { name: 'John', age: undefined };
JSON.stringify(user);  // '{"name":"John"}' - age gone

// ✅ Good - use null explicitly
const obj = { a: 1, b: null, c: 3 };
JSON.stringify(obj);  // '{"a":1,"b":null,"c":3}'

// ✅ Good - replacer function
JSON.stringify(obj, (key, value) =>
  value === undefined ? null : value
);

// ✅ Good - filter before stringify
const clean = Object.fromEntries(
  Object.entries(obj).filter(([_, v]) => v !== undefined)
);
```

**Error message:** `JSON.stringify omits undefined values - use null or replacer function`

**Tip:** `Use null instead of undefined, or provide replacer to convert undefined`

---

#### 23. `primitives/no-json-circular`

**What it catches:** JSON.stringify on potentially circular structures

**Why:** Throws `TypeError: Converting circular structure to JSON`

**Detection:**
- `JSON.stringify()` on objects with potential circular refs
- Objects with parent/child, node/tree, or self-referencing patterns

```typescript
// ❌ Bad - will throw
const obj: any = { name: 'root' };
obj.self = obj;  // Circular!
JSON.stringify(obj);  // TypeError!

const parent = { name: 'parent', children: [] };
const child = { name: 'child', parent };
parent.children.push(child);  // Circular!
JSON.stringify(parent);  // TypeError!

// ✅ Good - use safe-stringify library
import { stringify } from 'safe-stable-stringify';
stringify(obj);  // Handles circular refs

// ✅ Good - custom replacer to break cycles
const seen = new WeakSet();
JSON.stringify(obj, (key, value) => {
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
  }
  return value;
});

// ✅ Good - design without circular refs
interface TreeNode {
  name: string;
  children: TreeNode[];
  // No parent reference
}
```

**Error message:** `JSON.stringify may throw on circular structure - use safe-stringify or handle cycles`

**Tip:** `Use safe-stable-stringify library or implement circular reference handling`

---

#### 24. `primitives/no-json-nan-infinity`

**What it catches:** JSON.stringify on objects containing `NaN` or `Infinity`

**Why:** `NaN` and `Infinity` become `null` in JSON

**Detection:**
- `JSON.stringify()` on objects with number fields that could be NaN/Infinity
- No validation before stringifying

```typescript
// ❌ Bad - silently becomes null
JSON.stringify({ value: NaN });       // '{"value":null}'
JSON.stringify({ value: Infinity });  // '{"value":null}'
JSON.stringify({ value: -Infinity }); // '{"value":null}'

const ratio = a / b;  // Could be Infinity or NaN
JSON.stringify({ ratio });  // Might be null!

// ✅ Good - validate before stringify
function safeStringify(obj: object): string {
  const json = JSON.stringify(obj, (key, value) => {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) throw new Error(`NaN found at ${key}`);
      if (!Number.isFinite(value)) throw new Error(`Infinity found at ${key}`);
    }
    return value;
  });
  return json;
}

// ✅ Good - convert to string representation
JSON.stringify(obj, (key, value) => {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'Infinity';
    if (value === -Infinity) return '-Infinity';
  }
  return value;
});
```

**Error message:** `JSON.stringify converts NaN/Infinity to null - validate or use replacer`

**Tip:** `Validate numbers before stringify or use replacer to handle special values`

---

### Comparison Edge Cases

#### 25. `primitives/no-compare-different-types`

**What it catches:** Relational comparison (`<`, `>`, `<=`, `>=`) between different types

**Why:** Implicit coercion leads to surprising results

**Detection:** Relational operators where operand types differ

```typescript
// ❌ Bad - implicit coercion
if ("10" > 9) { ... }      // true (string coerced to number)
if ("10" > "9") { ... }    // false! (string comparison: "1" < "9")
if (null > 0) { ... }      // false
if (null >= 0) { ... }     // true! (null coerces to 0)
if (null == 0) { ... }     // false! (special case)

// ❌ Bad - comparing incompatible types
const arr = [1, 2, 3];
if (arr > 2) { ... }       // Coerces array to string/number

// ✅ Good - explicit types
if (Number("10") > 9) { ... }
if (parseInt(str, 10) > limit) { ... }

// ✅ Good - same types
if (count > 0) { ... }  // Both numbers
if (name > "A") { ... }  // Both strings (alphabetical comparison)
```

**Error message:** `Comparison between different types uses implicit coercion - convert explicitly`

**Tip:** `Ensure both operands are the same type, or convert explicitly`

---

#### 26. `primitives/no-relational-null-undefined`

**What it catches:** Relational comparison with `null` or `undefined`

**Why:** Produces counterintuitive results

**Detection:** `<`, `>`, `<=`, `>=` where one operand is null/undefined literal or variable

```typescript
// ❌ Bad - bizarre behavior
null > 0;   // false
null < 0;   // false
null >= 0;  // true (!)
null <= 0;  // true (!)
null == 0;  // false (!)

undefined > 0;  // false
undefined < 0;  // false
undefined >= 0; // false
undefined <= 0; // false

// ❌ Bad - variable could be null
function check(value: number | null) {
  if (value > 0) { ... }  // What if value is null?
}

// ✅ Good - explicit null check first
function check(value: number | null) {
  if (value !== null && value > 0) { ... }
}

// ✅ Good - nullish coalescing
function check(value: number | null) {
  if ((value ?? -1) > 0) { ... }
}
```

**Error message:** `Relational comparison with null/undefined has counterintuitive results`

**Tip:** `Check for null/undefined separately before relational comparison`

---

#### 27. `primitives/object-is-for-special`

**What it catches:** `===` comparison for `-0` or `NaN`

**Why:** `-0 === 0` is true, `NaN === NaN` is false - use `Object.is()` for these

**Detection:**
- Comparison where operand could be `-0` (division, Math.sign, etc.)
- Comparison where operand could be `NaN` (without Number.isNaN)

```typescript
// ❌ Bad - doesn't distinguish -0
const zero = -0;
zero === 0;  // true!
1 / zero;    // -Infinity (different from 1/0 which is Infinity)

// ❌ Bad - NaN is never equal to itself
const nan = NaN;
nan === NaN;  // false!
nan === nan;  // false!

// ✅ Good - Object.is for special values
Object.is(-0, 0);     // false (correctly distinguishes)
Object.is(NaN, NaN);  // true (correctly identifies)

// ✅ Good - Number.isNaN for NaN specifically
Number.isNaN(nan);  // true

// ✅ Good - explicit check for -0
function isNegativeZero(x: number): boolean {
  return x === 0 && 1 / x === -Infinity;
}
```

**Error message:** `Use Object.is() for -0 or NaN comparison, not ===`

**Tip:** `Use Object.is(a, b) for comparing special values, or Number.isNaN() for NaN`

---

### Array Edge Cases

#### 28. `primitives/no-array-hole`

**What it catches:** Sparse arrays with holes

**Why:** Holes behave differently from `undefined` - skipped by some methods

**Detection:**
- Array literals with elisions: `[1, , 3]`
- `delete arr[i]` on arrays
- `new Array(n)` without fill

```typescript
// ❌ Bad - holes vs undefined
const sparse = [1, , 3];
sparse.length;        // 3
sparse[1];            // undefined (but it's a hole!)
1 in sparse;          // false!
sparse.map(x => x);   // [1, empty, 3] - hole is skipped!
sparse.forEach(x => console.log(x));  // Only logs 1 and 3

// ❌ Bad - delete creates hole
const arr = [1, 2, 3];
delete arr[1];  // Creates hole, doesn't shift

// ❌ Bad - uninitialized array
const arr = new Array(5);  // [empty × 5]
arr.map(x => 1);  // [empty × 5] - nothing happens!

// ✅ Good - use undefined explicitly
const arr = [1, undefined, 3];
arr.map(x => x ?? 0);  // [1, 0, 3]

// ✅ Good - fill new arrays
const arr = new Array(5).fill(0);
const arr = Array.from({ length: 5 }, () => 0);

// ✅ Good - use splice instead of delete
arr.splice(1, 1);  // Actually removes element
```

**Error message:** `Array holes behave differently from undefined - use explicit undefined or remove element`

**Tip:** `Use explicit undefined values or Array.from/fill to avoid holes`

---

#### 29. `primitives/no-array-length-mutation`

**What it catches:** Direct mutation of `.length` property

**Why:** Truncates or extends array with holes, often unintentional

**Detection:** Assignment to `.length` property of array

```typescript
// ❌ Bad - truncation
const arr = [1, 2, 3, 4, 5];
arr.length = 2;  // arr is now [1, 2] - silently lost data!

// ❌ Bad - extension creates holes
const arr = [1, 2, 3];
arr.length = 5;  // arr is now [1, 2, 3, empty × 2]

// ❌ Bad - clearing with length
arr.length = 0;  // Works but unclear intent

// ✅ Good - use slice for truncation (immutable)
const truncated = arr.slice(0, 2);

// ✅ Good - use splice for in-place modification
arr.splice(2);  // Clear from index 2 onwards

// ✅ Good - reassign for clearing
arr = [];
// or
arr.splice(0, arr.length);

// ✅ Good - Array.from for extension with values
const extended = Array.from({ length: 5 }, (_, i) => arr[i] ?? 0);
```

**Error message:** `Direct .length mutation can lose data or create holes - use slice/splice`

**Tip:** `Use slice() for immutable truncation, splice() for in-place, or reassign for clear`

---

#### 30. `primitives/no-array-index-string`

**What it catches:** Array access with string that isn't numeric

**Why:** Adds property to array object, doesn't affect length

**Detection:** Array bracket access with non-numeric string

```typescript
// ❌ Bad - adds object property, not array element
const arr = [1, 2, 3];
arr["key"] = "value";  // arr is now [1, 2, 3, key: "value"]
arr.length;  // Still 3!
arr.forEach(x => console.log(x));  // 1, 2, 3 (no "value")

// ❌ Bad - common mistake
const arr = [];
arr["0"] = "a";  // Works (coerced to number)
arr["first"] = "b";  // Property, not element!

// ✅ Good - use object for string keys
const obj: Record<string, string> = {};
obj["key"] = "value";

// ✅ Good - use Map for mixed keys
const map = new Map<string | number, string>();
map.set("key", "value");
map.set(0, "first");
```

**Error message:** `String index on array creates object property, not array element`

**Tip:** `Use numeric indices for arrays, or use object/Map for string keys`

---

#### 31. `primitives/no-object-prototype-access`

**What it catches:** Direct prototype method calls on objects

**Why:** Can fail for objects created with `Object.create(null)`

**Detection:**
- `obj.hasOwnProperty(key)`
- `obj.propertyIsEnumerable(key)`
- `obj.isPrototypeOf(other)`

```typescript
// ❌ Bad - may fail
const obj = Object.create(null);  // No prototype
obj.hasOwnProperty("key");  // TypeError!

const obj = { hasOwnProperty: () => true };  // Shadowed!
obj.hasOwnProperty("anything");  // Always true

// ✅ Good - Object.hasOwn (ES2022)
Object.hasOwn(obj, "key");

// ✅ Good - call on prototype
Object.prototype.hasOwnProperty.call(obj, "key");

// ✅ Good - in operator with own check
"key" in obj && Object.hasOwn(obj, "key");
```

**Error message:** `Use Object.hasOwn() instead of obj.hasOwnProperty()`

**Tip:** `Use Object.hasOwn(obj, key) - works for all objects`

**Autofix:** Yes

---

#### 32. `primitives/no-in-operator-primitive`

**What it catches:** `in` operator on primitive values

**Why:** Throws TypeError on primitives

**Detection:** `in` operator where right side could be primitive

```typescript
// ❌ Bad - throws TypeError
"length" in "hello";  // TypeError!
0 in 123;  // TypeError!
"valueOf" in null;  // TypeError!

// ❌ Bad - runtime error if str is primitive
function check(obj: string | object) {
  if ("key" in obj) { ... }  // Throws if obj is string!
}

// ✅ Good - type check first
function check(obj: string | object) {
  if (typeof obj === "object" && obj !== null && "key" in obj) { ... }
}

// ✅ Good - use typeof for primitives
if (typeof str === "string") { ... }

// ✅ Good - use optional chaining for property check
if (obj?.key !== undefined) { ... }
```

**Error message:** `'in' operator throws on primitives - check type first or use optional chaining`

**Tip:** `Check typeof first: typeof obj === "object" && obj !== null && "key" in obj`

---

## Summary

| Rule | Severity | Category |
|------|----------|----------|
| `no-unsafe-integer` | error | Number Safety |
| `no-float-equality` | error | Number Safety |
| `no-infinity-arithmetic` | warning | Number Safety |
| `use-number-is-finite` | error | Number Safety |
| `use-number-is-integer` | warning | Number Safety |
| `no-toFixed-rounding` | warning | Number Safety |
| `prefer-bigint-for-ids` | warning | BigInt |
| `no-bigint-number-mix` | error | BigInt |
| `no-math-random-crypto` | error | Math |
| `division-by-zero` | error | Math |
| `no-modulo-negative` | warning | Math |
| `prefer-math-trunc` | warning | Math |
| `no-lossy-math-operation` | warning | Math |
| `no-string-length-unicode` | warning | String |
| `no-string-index-unicode` | warning | String |
| `prefer-normalize-comparison` | warning | String |
| `no-regex-on-untrusted` | error | String |
| `no-new-date-string-parse` | warning | Date |
| `no-date-mutation` | warning | Date |
| `no-date-arithmetic` | warning | Date |
| `no-json-bigint` | warning | JSON |
| `no-json-undefined` | warning | JSON |
| `no-json-circular` | error | JSON |
| `no-json-nan-infinity` | warning | JSON |
| `no-compare-different-types` | error | Comparison |
| `no-relational-null-undefined` | error | Comparison |
| `object-is-for-special` | warning | Comparison |
| `no-array-hole` | error | Array |
| `no-array-length-mutation` | warning | Array |
| `no-array-index-string` | error | Array |
| `no-object-prototype-access` | warning | Object |
| `no-in-operator-primitive` | error | Object |

**Total: 32 rules** (excluding oxlint-covered rules)
