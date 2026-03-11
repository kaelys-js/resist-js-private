# Common Bugs & Edge Cases Lint Rules

Implement the **Bugs & Edge Cases** lint rules (30 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/bugs/`

File patterns: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.mjs`

---

## Already Covered by Oxlint

The following bug-related rules are **already implemented by oxlint** - do NOT reimplement:

**Correctness:**
- `use-isnan` - Require `Number.isNaN()` instead of `=== NaN`
- `valid-typeof` - Enforce valid typeof comparisons
- `no-compare-neg-zero` - Disallow comparing against -0
- `no-constant-condition` - Disallow constant expressions in conditions
- `no-constant-binary-expression` - Disallow constant expressions that always evaluate the same
- `no-floating-promises` - Require handling of promises
- `no-misused-promises` - Disallow promises in places not designed to handle them
- `no-unsafe-optional-chaining` - Disallow unsafe usage of optional chaining
- `no-non-null-asserted-optional-chain` - Disallow non-null assertion after optional chain
- `no-loss-of-precision` - Disallow literal numbers that lose precision
- `no-sparse-arrays` - Disallow sparse arrays `[1,,3]`
- `require-array-sort-compare` - Require compare function in Array.sort()
- `no-for-in-array` - Disallow iterating over an array with a for-in loop
- `no-throw-literal` - Disallow throwing literals instead of Error objects
- `no-unsafe-finally` - Disallow control flow in finally blocks
- `no-self-assign` - Disallow self-assignment
- `no-cond-assign` - Disallow assignment in conditional expressions
- `strict-boolean-expressions` - Enforce strict boolean expressions (type-aware)
- `no-unnecessary-condition` - Disallow unnecessary conditionals (type-aware)
- `no-confusing-void-expression` - Disallow confusing void expressions (type-aware)
- `no-base-to-string` - Require `.toString()` only on objects with useful output
- `restrict-template-expressions` - Disallow non-string types in template literals
- `no-misused-spread` - Disallow spreading non-iterables
- `no-useless-spread` - Disallow unnecessary spread operators
- `no-await-in-promise-methods` - Disallow await inside Promise.all/race/etc
- `no-promise-in-callback` - Disallow returning promises in callback-based APIs
- `no-thenable` - Disallow objects with `.then` method that aren't Promises
- `no-array-delete` - Disallow using delete on arrays
- `bad-array-method-on-arguments` - Disallow array methods on arguments object
- `bad-comparison-sequence` - Disallow chained comparison operators `a < b < c`
- `bad-min-max-func` - Disallow incorrect min/max function usage
- `number-arg-out-of-range` - Disallow number arguments outside valid range

---

## Rules to Implement

### 1. `bugs/no-floating-point-equality`

**What it catches:** Direct equality comparison on floating point numbers

**Why:** Floating point arithmetic has precision issues - `0.1 + 0.2 !== 0.3`

**Detection:** `===` or `!==` where both sides are:
- Number literals with decimal points
- Results of arithmetic on floats
- Known float-returning functions (`Math.random()`, etc.)

```typescript
// ❌ Bad - floating point equality
if (0.1 + 0.2 === 0.3) { }  // false!

const price = 19.99;
const tax = 1.50;
if (price + tax === 21.49) { }  // Might fail!

if (Math.random() === 0.5) { }  // Almost never true

const ratio = width / height;
if (ratio === 1.777) { }  // Dangerous

// ✅ Good - epsilon comparison
const EPSILON = 0.0001;
if (Math.abs((0.1 + 0.2) - 0.3) < EPSILON) { }

if (Math.abs(price + tax - 21.49) < 0.01) { }

// ✅ Good - integer comparison (cents)
const priceCents = 1999;
const taxCents = 150;
if (priceCents + taxCents === 2149) { }

// ✅ Good - rounding for display
if (Math.round((price + tax) * 100) === 2149) { }
```

**Error message:** `Floating point equality comparison may fail due to precision - use epsilon comparison`

**Tip:** `Use Math.abs(a - b) < EPSILON instead of a === b`

**Severity:** warning

---

### 2. `bugs/no-array-index-as-key`

**What it catches:** Using array index as key in Svelte `{#each}` or React lists

**Why:** Index keys cause bugs when list items are reordered, inserted, or removed

**Detection:**
- `{#each items as item, index (index)}` - index as key
- `key={index}` or `key={i}` in JSX loops

```svelte
// ❌ Bad - index as key
{#each items as item, index (index)}
  <Item {item} />
{/each}

{#each users as user, i (i)}
  <UserCard {user} />
{/each}

// In JSX:
{items.map((item, index) => (
  <Item key={index} item={item} />
))}

// ❌ Bad - template literal with just index
{#each items as item, index (`item-${index}`)}
  <Item {item} />
{/each}

// ✅ Good - unique ID as key
{#each items as item (item.id)}
  <Item {item} />
{/each}

{#each users as user (user.email)}
  <UserCard {user} />
{/each}

// ✅ Good - compound key
{#each items as item, index (`${item.type}-${item.id}`)}
  <Item {item} />
{/each}

// ✅ Exception - truly static list (display only, no reorder)
{#each STATIC_MENU_ITEMS as item, index (index)}
  <MenuItem {item} />
{/each}
```

**Error message:** `Array index as key causes bugs when list changes - use unique identifier`

**Tip:** `Use item.id or other unique property: {#each items as item (item.id)}`

**Severity:** warning

---

### 3. `bugs/no-object-as-key`

**What it catches:** Using objects as Map keys or checking object presence in Set

**Why:** Objects are compared by reference, not value - identical-looking objects are different keys

**Detection:**
- `map.set(obj, ...)` where `obj` is an object literal
- `map.get({...})` with inline object
- `set.has({...})` with inline object
- `set.add(obj)` then `set.has(differentRef)`

```typescript
// ❌ Bad - object literal as Map key
const cache = new Map();
cache.set({ userId: 1 }, 'data');
cache.get({ userId: 1 });  // undefined! Different reference

// ❌ Bad - object literal in Set
const seen = new Set();
seen.add({ x: 1, y: 2 });
seen.has({ x: 1, y: 2 });  // false!

// ❌ Bad - array as key (arrays are objects)
const map = new Map();
map.set([1, 2], 'value');
map.get([1, 2]);  // undefined!

// ✅ Good - use primitive keys
const cache = new Map<number, string>();
cache.set(1, 'data');
cache.get(1);  // 'data'

// ✅ Good - serialize to string key
const cache = new Map<string, string>();
cache.set(JSON.stringify({ userId: 1 }), 'data');
cache.get(JSON.stringify({ userId: 1 }));  // 'data'

// ✅ Good - use same reference
const key = { userId: 1 };
cache.set(key, 'data');
cache.get(key);  // 'data'

// ✅ Good - custom key function
function makeKey(obj: { userId: number }) {
  return `user:${obj.userId}`;
}
cache.set(makeKey({ userId: 1 }), 'data');

// ✅ Good - WeakMap for object keys (when appropriate)
const metadata = new WeakMap<object, string>();
const obj = { userId: 1 };
metadata.set(obj, 'data');
```

**Error message:** `Object literal as Map/Set key - objects are compared by reference, not value`

**Tip:** `Use primitive key, serialize with JSON.stringify, or keep reference`

**Severity:** error

---

### 4. `bugs/no-async-array-callback`

**What it catches:** Async callbacks in array methods that don't await

**Why:** `.map()`, `.filter()`, `.forEach()`, `.some()`, `.every()` don't await - returns Promise[]

**Detection:** Async arrow function or function passed to array method

```typescript
// ❌ Bad - async map returns Promise[], not resolved values
const results = items.map(async (item) => {
  return await fetchData(item.id);
});
// results is Promise<Data>[], not Data[]!

// ❌ Bad - filter with async doesn't work
const filtered = items.filter(async (item) => {
  const isValid = await validate(item);
  return isValid;
});
// All items pass! Promises are truthy

// ❌ Bad - forEach doesn't await
items.forEach(async (item) => {
  await processItem(item);  // Not awaited by forEach!
});
console.log('Done');  // Runs immediately, not after processing

// ❌ Bad - some/every with async
const hasValid = items.some(async (item) => {
  return await checkValidity(item);
});
// Always true! Promises are truthy

// ✅ Good - Promise.all with map
const results = await Promise.all(
  items.map(async (item) => {
    return await fetchData(item.id);
  })
);

// ✅ Good - sequential processing with for...of
for (const item of items) {
  await processItem(item);
}
console.log('Done');  // Runs after all items processed

// ✅ Good - filter with async (two steps)
const validityChecks = await Promise.all(
  items.map(async (item) => ({
    item,
    isValid: await validate(item),
  }))
);
const filtered = validityChecks
  .filter(({ isValid }) => isValid)
  .map(({ item }) => item);

// ✅ Good - use p-filter or similar library
import pFilter from 'p-filter';
const filtered = await pFilter(items, async (item) => {
  return await validate(item);
});
```

**Error message:** `Async callback in ${method}() - array methods don't await callbacks`

**Tip:** `Use Promise.all(items.map(...)) or for...of loop for async iteration`

**Severity:** error

---

### 5. `bugs/no-mutation-during-iteration`

**What it catches:** Modifying an array while iterating over it

**Why:** Causes skipped items or infinite loops

**Detection:**
- `.push()`, `.pop()`, `.shift()`, `.unshift()`, `.splice()` inside for loop over same array
- Same pattern in `.forEach()`, `for...of` loops

```typescript
// ❌ Bad - push during iteration (can cause infinite loop)
for (const item of items) {
  if (item.needsClone) {
    items.push({ ...item, cloned: true });  // Infinite loop!
  }
}

// ❌ Bad - splice during for loop (skips items)
for (let i = 0; i < items.length; i++) {
  if (items[i].invalid) {
    items.splice(i, 1);  // Next item shifts to i, but i++ skips it
  }
}

// ❌ Bad - shift during forEach
items.forEach((item, index) => {
  if (item.duplicate) {
    items.shift();  // Messes up iteration
  }
});

// ✅ Good - iterate backwards for removal
for (let i = items.length - 1; i >= 0; i--) {
  if (items[i].invalid) {
    items.splice(i, 1);  // Safe - earlier indices unaffected
  }
}

// ✅ Good - filter to new array
const validItems = items.filter(item => !item.invalid);

// ✅ Good - collect then modify
const toAdd: Item[] = [];
for (const item of items) {
  if (item.needsClone) {
    toAdd.push({ ...item, cloned: true });
  }
}
items.push(...toAdd);

// ✅ Good - use while loop with explicit control
let i = 0;
while (i < items.length) {
  if (items[i].invalid) {
    items.splice(i, 1);
    // Don't increment i - next item is now at current index
  } else {
    i++;
  }
}
```

**Error message:** `Mutating array '${name}' while iterating over it - may skip items or loop infinitely`

**Tip:** `Iterate backwards, filter to new array, or collect changes then apply`

**Severity:** error

---

### 6. `bugs/no-await-in-loop`

**What it catches:** Await inside loops when parallel execution is possible

**Why:** Sequential awaits are slow - `Promise.all` is typically faster

**Detection:** `await` expression inside `for`, `for...of`, `for...in`, `while`, `do...while`

```typescript
// ❌ Bad - sequential awaits (slow)
const results = [];
for (const url of urls) {
  const data = await fetch(url);  // One at a time!
  results.push(await data.json());
}
// Takes: N * latency

// ❌ Bad - await in for...of
for (const userId of userIds) {
  const user = await getUser(userId);
  await sendEmail(user);
}

// ✅ Good - parallel with Promise.all
const results = await Promise.all(
  urls.map(async (url) => {
    const data = await fetch(url);
    return data.json();
  })
);
// Takes: max(latencies)

// ✅ Good - Promise.allSettled for error tolerance
const results = await Promise.allSettled(
  urls.map(url => fetch(url).then(r => r.json()))
);

// ✅ Good - batched parallel (rate limiting)
import pLimit from 'p-limit';
const limit = pLimit(5);  // Max 5 concurrent

const results = await Promise.all(
  urls.map(url => limit(() => fetch(url).then(r => r.json())))
);

// ✅ Exception - when order matters AND depends on previous
for (const migration of migrations) {
  await runMigration(migration);  // Must be sequential
}

// ✅ Exception - when processing stream
for await (const chunk of stream) {
  await processChunk(chunk);  // Stream-based, fine
}
```

**Error message:** `Await in loop - consider Promise.all for parallel execution`

**Tip:** `Use Promise.all(items.map(async ...)) for parallel, or add // sequential-ok comment if intentional`

**Severity:** warning

---

### 7. `bugs/no-promise-executor-return`

**What it catches:** Return statements in Promise executor function

**Why:** Return value of executor is ignored - use `resolve()` instead

**Detection:** Return statement (not `return undefined/void`) inside `new Promise((resolve, reject) => { ... })`

```typescript
// ❌ Bad - return value ignored
const promise = new Promise((resolve, reject) => {
  return fetchData();  // Ignored! Promise never resolves
});

// ❌ Bad - conditional return
const promise = new Promise((resolve, reject) => {
  if (cached) {
    return cachedValue;  // Ignored!
  }
  fetchData().then(resolve);
});

// ❌ Bad - return in arrow function body
const promise = new Promise((resolve, reject) =>
  fetchData()  // Returns Promise, but outer Promise ignores it
);

// ✅ Good - use resolve
const promise = new Promise((resolve, reject) => {
  resolve(fetchData());
});

// ✅ Good - conditional resolve
const promise = new Promise((resolve, reject) => {
  if (cached) {
    resolve(cachedValue);
    return;  // return; (no value) is OK for control flow
  }
  fetchData().then(resolve);
});

// ✅ Good - just don't use Promise constructor
const promise = fetchData();  // Already a Promise

// ✅ Good - async function instead
async function getData() {
  if (cached) return cachedValue;
  return fetchData();
}
```

**Error message:** `Return value in Promise executor is ignored - use resolve() instead`

**Tip:** `Call resolve(value) instead of return value`

**Severity:** error

---

### 8. `bugs/no-unhandled-rejection-pattern`

**What it catches:** Promise chains without error handling

**Why:** Unhandled rejections crash Node.js and cause silent failures

**Detection:**
- Promise chain ending without `.catch()` or in try/catch
- Async function call without await in try/catch or .catch()
- Fire-and-forget promises without error handling

```typescript
// ❌ Bad - no catch
fetchData()
  .then(process)
  .then(save);  // Rejection goes unhandled

// ❌ Bad - fire and forget async
async function saveInBackground() {
  await db.save(data);  // Could throw
}
saveInBackground();  // No error handling!

// ❌ Bad - partial handling
try {
  const data = await fetchData();
} catch {
  // Handle fetch error
}
await processData(data);  // This can still throw!

// ✅ Good - .catch() at end
fetchData()
  .then(process)
  .then(save)
  .catch(handleError);

// ✅ Good - try/catch wrapping entire operation
try {
  const data = await fetchData();
  await processData(data);
  await save(data);
} catch (error) {
  handleError(error);
}

// ✅ Good - void operator with catch for fire-and-forget
void saveInBackground().catch(console.error);

// ✅ Good - Promise.allSettled for partial failures
const results = await Promise.allSettled([
  fetchA(),
  fetchB(),
  fetchC(),
]);
// Handle individual failures from results

// ✅ Good - explicit ignore with comment
saveInBackground().catch(() => {
  // Intentionally ignoring - best effort save
});
```

**Error message:** `Promise chain without error handling - add .catch() or try/catch`

**Tip:** `Add .catch(handleError) or wrap in try/catch`

**Severity:** warning

---

### 9. `bugs/no-typeof-undefined-comparison`

**What it catches:** Problematic `typeof x === "undefined"` patterns

**Why:** Several edge cases exist; `x === undefined` is usually clearer

**Detection:**
- `typeof x === "undefined"` when `x` is definitely declared
- Using typeof check when variable is in scope

```typescript
// ❌ Bad - variable is definitely declared
let value: string | undefined;
if (typeof value === "undefined") { }  // Just use === undefined

// ❌ Bad - parameter is declared
function fn(param?: string) {
  if (typeof param === "undefined") { }  // Just use === undefined
}

// ❌ Bad - property access (typeof won't prevent error)
const obj: { prop?: string } = {};
if (typeof obj.deepProp.value === "undefined") { }  // Still throws!

// ✅ Good - direct comparison for declared variables
let value: string | undefined;
if (value === undefined) { }

// ✅ Good - typeof for potentially undeclared globals
if (typeof someGlobalThatMightNotExist === "undefined") { }

// ✅ Good - typeof for checking global existence
if (typeof window !== "undefined") {
  // We're in browser
}

// ✅ Good - optional chaining for deep access
if (obj.deepProp?.value === undefined) { }

// ✅ Good - nullish coalescing
const result = value ?? defaultValue;
```

**Error message:** `typeof ${name} === "undefined" - use ${name} === undefined for declared variables`

**Tip:** `Use direct comparison: ${name} === undefined`

**Severity:** warning

---

### 10. `bugs/no-hasOwnProperty-call`

**What it catches:** Direct `.hasOwnProperty()` calls on objects

**Why:** Objects can override `hasOwnProperty`, use `Object.hasOwn()` instead

**Detection:** `obj.hasOwnProperty(key)` call expression

```typescript
// ❌ Bad - can be overridden
const obj = { hasOwnProperty: () => true };
obj.hasOwnProperty('foo');  // Always true!

// ❌ Bad - prototype lookup
const obj = { prop: 1 };
obj.hasOwnProperty('prop');

// ❌ Bad - null prototype objects
const obj = Object.create(null);
obj.hasOwnProperty('prop');  // TypeError!

// ✅ Good - Object.hasOwn (ES2022)
const obj = { prop: 1 };
Object.hasOwn(obj, 'prop');  // true

// ✅ Good - Object.prototype.hasOwnProperty.call (older environments)
Object.prototype.hasOwnProperty.call(obj, 'prop');

// ✅ Good - in operator (if checking prototype chain is OK)
if ('prop' in obj) { }

// ✅ Good - undefined check for simple cases
if (obj.prop !== undefined) { }
```

**Error message:** `Don't call .hasOwnProperty() directly - use Object.hasOwn()`

**Tip:** `Use Object.hasOwn(obj, key) instead of obj.hasOwnProperty(key)`

**Severity:** error

---

### 11. `bugs/no-in-operator-array-methods`

**What it catches:** Using `in` operator to check for array methods or properties

**Why:** `in` checks property existence, not value inclusion - common confusion

**Detection:** `'prop' in array` where `prop` is a string like 'length', 'map', 'filter', etc.

```typescript
// ❌ Bad - always true (checking property, not value)
const arr = [1, 2, 3];
if ('length' in arr) { }  // Always true
if ('map' in arr) { }     // Always true

// ❌ Bad - checking for value existence (wrong!)
const items = ['apple', 'banana'];
if ('apple' in items) { }  // false! 'apple' is not an index

// ❌ Bad - numeric string checks index, not value
const items = [10, 20, 30];
if ('0' in items) { }  // true - checks if index 0 exists
if (0 in items) { }    // true - same thing

// ✅ Good - use .includes() for value check
const items = ['apple', 'banana'];
if (items.includes('apple')) { }

// ✅ Good - use Array.isArray() for type check
if (Array.isArray(arr)) { }

// ✅ Good - use .length for emptiness check
if (arr.length > 0) { }

// ✅ Good - in operator is valid for objects
const obj = { apple: true, banana: true };
if ('apple' in obj) { }  // Correct usage
```

**Error message:** `'${prop}' in array - 'in' checks property names, not values. Use .includes() for value check`

**Tip:** `Use array.includes(value) to check if value exists in array`

**Severity:** error

---

### 12. `bugs/no-array-constructor-single-arg`

**What it catches:** `new Array(n)` with single numeric argument

**Why:** Creates sparse array of length n, not array with n as element

**Detection:** `new Array(numericLiteral)` or `Array(numericLiteral)`

```typescript
// ❌ Bad - creates sparse array
const arr = new Array(5);  // [empty × 5], not [5]
arr.map(x => x * 2);  // Returns [empty × 5], not [10]!

// ❌ Bad - Array() without new
const arr = Array(10);  // Same problem

// ❌ Bad - variable (might be number)
const size = getSize();
const arr = new Array(size);  // Sparse if size is number

// ✅ Good - use Array.from for filled arrays
const arr = Array.from({ length: 5 }, (_, i) => i);  // [0, 1, 2, 3, 4]

// ✅ Good - use Array.from with fill value
const arr = Array.from({ length: 5 }, () => 0);  // [0, 0, 0, 0, 0]

// ✅ Good - use fill after creating
const arr = new Array(5).fill(0);  // [0, 0, 0, 0, 0]

// ✅ Good - array literal for known values
const arr = [5];  // Array containing 5

// ✅ Good - spread for ranges
const arr = [...Array(5).keys()];  // [0, 1, 2, 3, 4]

// ✅ Exception - explicit sparse array (rare, with comment)
const sparse = new Array(1000);  // Intentionally sparse for memory
```

**Error message:** `new Array(${n}) creates sparse array of length ${n}, not [${n}]`

**Tip:** `Use Array.from({ length: ${n} }, () => value) or [${n}] for single element`

**Severity:** warning

---

### 13. `bugs/no-json-stringify-circular`

**What it catches:** JSON.stringify on potentially circular structures

**Why:** Throws "Converting circular structure to JSON" at runtime

**Detection:**
- JSON.stringify on objects that reference themselves
- JSON.stringify on DOM nodes, Error objects, etc.
- Missing replacer for known circular types

```typescript
// ❌ Bad - circular reference
const obj: any = { name: 'test' };
obj.self = obj;
JSON.stringify(obj);  // Throws!

// ❌ Bad - parent/child circular
const parent = { children: [] as any[] };
const child = { parent };
parent.children.push(child);
JSON.stringify(parent);  // Throws!

// ❌ Bad - DOM nodes have circular refs
const element = document.getElementById('app');
JSON.stringify(element);  // Throws!

// ❌ Bad - Error objects have issues
const error = new Error('test');
JSON.stringify(error);  // Returns "{}" - not useful!

// ✅ Good - use replacer for safe serialization
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

// ✅ Good - use library
import { stringify } from 'safe-stable-stringify';
stringify(circularObj);

// ✅ Good - serialize Error properly
JSON.stringify({
  name: error.name,
  message: error.message,
  stack: error.stack,
});

// ✅ Good - structuredClone for deep copy (handles circular)
const clone = structuredClone(circularObj);  // Works with circular refs
```

**Error message:** `JSON.stringify may throw on circular reference`

**Tip:** `Use a replacer function to handle circular references`

**Severity:** warning

---

### 14. `bugs/no-date-mutation`

**What it catches:** Date methods that mutate and using return value

**Why:** Date setters mutate in place AND return timestamp - confusing

**Detection:** Using return value of Date setter methods

```typescript
// ❌ Bad - setDate returns timestamp, not Date
const tomorrow = today.setDate(today.getDate() + 1);
console.log(tomorrow.toISOString());  // Error! tomorrow is number

// ❌ Bad - mutates original unexpectedly
function getNextWeek(date: Date): Date {
  return date.setDate(date.getDate() + 7);  // Mutates input AND returns number!
}
const meeting = new Date();
const reminder = getNextWeek(meeting);  // meeting is now mutated!

// ❌ Bad - chaining setters (each returns number)
const date = new Date()
  .setHours(12)
  .setMinutes(30);  // Error! setHours returns number

// ✅ Good - clone before mutating
function getNextWeek(date: Date): Date {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + 7);
  return clone;
}

// ✅ Good - mutate then use object
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
console.log(tomorrow.toISOString());

// ✅ Good - use temporal proposal or date-fns
import { addDays } from 'date-fns';
const tomorrow = addDays(today, 1);  // Returns new Date

// ✅ Good - fluent date library
import dayjs from 'dayjs';
const tomorrow = dayjs(today).add(1, 'day').toDate();
```

**Error message:** `Date.${method}() mutates the date AND returns timestamp number, not Date`

**Tip:** `Clone the date first: const clone = new Date(original); then mutate clone`

**Severity:** error

---

### 15. `bugs/no-regex-in-loop`

**What it catches:** RegExp literal or constructor inside loop body

**Why:** Creates new RegExp object each iteration - wasteful and resets lastIndex

**Detection:** `/pattern/` literal or `new RegExp()` inside for/while/forEach body

```typescript
// ❌ Bad - creates regex each iteration
for (const text of texts) {
  const match = text.match(/pattern/g);  // New regex each time
}

// ❌ Bad - RegExp constructor in loop
for (const item of items) {
  const regex = new RegExp(item.pattern, 'g');
  // lastIndex resets each iteration anyway
}

// ❌ Bad - affects stateful regex (with /g flag)
for (const text of texts) {
  const regex = /\d+/g;  // New regex, lastIndex always 0
  while (regex.exec(text)) {
    // Works, but wasteful
  }
}

// ✅ Good - define regex outside loop
const regex = /pattern/g;
for (const text of texts) {
  regex.lastIndex = 0;  // Reset if using /g
  const match = text.match(regex);
}

// ✅ Good - non-global regex is fine to recreate (simpler)
for (const text of texts) {
  const match = text.match(/pattern/);  // No /g, no state
}

// ✅ Good - dynamic patterns cached
const regexCache = new Map<string, RegExp>();
function getRegex(pattern: string): RegExp {
  if (!regexCache.has(pattern)) {
    regexCache.set(pattern, new RegExp(pattern, 'g'));
  }
  return regexCache.get(pattern)!;
}

for (const item of items) {
  const regex = getRegex(item.pattern);
  regex.lastIndex = 0;
  // ...
}
```

**Error message:** `RegExp created inside loop - define outside for better performance`

**Tip:** `Move regex definition outside the loop`

**Severity:** warning

---

### 16. `bugs/no-implicit-coercion-falsy`

**What it catches:** Implicit falsy coercion that catches unexpected values

**Why:** `0`, `''`, `NaN` are falsy but often valid values

**Detection:** `if (value)` where value type includes `number`, `string`, or union with `0`/`''`

```typescript
// ❌ Bad - 0 is valid but falsy
function divide(a: number, b: number): number {
  if (!b) {  // Catches 0, but also NaN
    throw new Error('Invalid divisor');
  }
  return a / b;
}
divide(10, 0);  // Works, but...
divide(10, NaN);  // Also throws - is that intended?

// ❌ Bad - empty string might be valid
function greet(name: string) {
  if (name) {  // Empty string is falsy
    return `Hello, ${name}!`;
  }
  return 'Hello!';
}
greet('');  // Returns 'Hello!' - is empty string invalid?

// ❌ Bad - 0 is valid count
function process(count: number) {
  if (count) {
    console.log(`Processing ${count} items`);
  }
}
process(0);  // Silently does nothing!

// ✅ Good - explicit checks
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  if (Number.isNaN(b)) {
    throw new Error('Invalid divisor');
  }
  return a / b;
}

// ✅ Good - explicit empty check
function greet(name: string) {
  if (name !== '') {
    return `Hello, ${name}!`;
  }
  return 'Hello!';
}

// ✅ Good - nullish coalescing for default values
function process(count: number | undefined) {
  const actualCount = count ?? 10;  // Only nullish, not 0
  console.log(`Processing ${actualCount} items`);
}

// ✅ Good - explicit type narrowing
function processValue(value: string | null | undefined) {
  if (value != null) {  // Checks null AND undefined
    console.log(value.toUpperCase());
  }
}
```

**Error message:** `Implicit falsy check on ${type} - ${values} are falsy but may be valid`

**Tip:** `Use explicit comparison: value !== 0, value !== '', or value != null`

**Severity:** warning

---

### 17. `bugs/no-parseint-without-radix`

**What it catches:** `parseInt()` called without radix parameter

**Why:** Without radix, parseInt guesses based on string prefix (legacy octal!)

**Detection:** `parseInt(str)` call with only one argument

```typescript
// ❌ Bad - no radix
parseInt('10');     // 10, but fragile
parseInt('010');    // 10 in modern JS, but was 8 in old JS!
parseInt('0x10');   // 16 - hex prefix still works

// ❌ Bad - user input might have leading zeros
const value = parseInt(userInput);  // '08' could be problematic

// ❌ Bad - variable might have unexpected format
const value = parseInt(config.port);

// ✅ Good - always specify radix
parseInt('10', 10);   // 10
parseInt('010', 10);  // 10
parseInt('0x10', 16); // 16

// ✅ Good - use Number() for simpler cases
Number('10');    // 10
Number('010');   // 10
Number('0x10');  // 16

// ✅ Good - unary plus (same as Number)
const value = +userInput;

// ✅ Good - Number.parseInt (same behavior, but reads better)
Number.parseInt('10', 10);

// ✅ Good - for binary/octal/hex, be explicit
parseInt('1010', 2);   // 10 (binary)
parseInt('777', 8);    // 511 (octal)
parseInt('FF', 16);    // 255 (hex)
```

**Error message:** `parseInt without radix may parse numbers incorrectly`

**Tip:** `Add radix parameter: parseInt(str, 10)`

**Severity:** error

---

### 18. `bugs/no-string-coerced-includes`

**What it catches:** Calling `.includes()` with a value that will be coerced to string

**Why:** `arr.includes(0)` on string array coerces to `arr.includes('0')`

**Detection:** `.includes(numericLiteral)` on string array or string

```typescript
// ❌ Bad - number coerced to string
const items = ['apple', 'banana', '0'];
items.includes(0);  // true! 0 becomes '0'

// ❌ Bad - string includes with number
const text = 'Price: $100';
text.includes(100);  // true! 100 becomes '100'

// ❌ Bad - boolean coerced
const values = ['true', 'false'];
values.includes(true);  // true! true becomes 'true'

// ❌ Bad - object coerced
const items = ['[object Object]', 'test'];
items.includes({});  // true! {} becomes '[object Object]'

// ✅ Good - same type
const items = ['apple', 'banana', '0'];
items.includes('0');  // true, explicit string

// ✅ Good - typed array prevents this
const items: string[] = ['apple', 'banana'];
items.includes(0);  // TypeScript error!

// ✅ Good - explicit conversion when intended
const text = 'Price: $100';
text.includes(String(price));  // Explicit

// ✅ Good - number array for numbers
const counts = [0, 1, 2, 3];
counts.includes(0);  // Correct, no coercion
```

**Error message:** `${type} passed to .includes() on string ${arrayOrString} - will be coerced to string`

**Tip:** `Use .includes(String(value)) if coercion is intended, or fix the type mismatch`

**Severity:** error

---

### 19. `bugs/no-sort-default-compare`

**What it catches:** Array.sort() on non-string arrays without compare function

**Why:** Default sort converts to strings - `[10, 2].sort()` gives `[10, 2]` not `[2, 10]`

**Detection:** `.sort()` call on array of numbers/objects without compare function

Note: Oxlint has `require-array-sort-compare` but may not catch all cases.

```typescript
// ❌ Bad - numbers sorted as strings
const nums = [10, 2, 30, 4];
nums.sort();  // [10, 2, 30, 4] - wrong!

// ❌ Bad - objects sorted incorrectly
const items = [{ id: 10 }, { id: 2 }];
items.sort();  // '[object Object]' comparison - random order

// ❌ Bad - dates sorted as strings
const dates = [new Date('2024-01-01'), new Date('2023-06-15')];
dates.sort();  // String comparison of date strings

// ❌ Bad - bigints sorted as strings
const bigNums = [10n, 2n, 30n];
bigNums.sort();  // [10n, 2n, 30n] - wrong!

// ✅ Good - numeric sort
const nums = [10, 2, 30, 4];
nums.sort((a, b) => a - b);  // [2, 4, 10, 30]

// ✅ Good - descending
nums.sort((a, b) => b - a);  // [30, 10, 4, 2]

// ✅ Good - object property sort
const items = [{ id: 10 }, { id: 2 }];
items.sort((a, b) => a.id - b.id);

// ✅ Good - date sort
const dates = [new Date('2024-01-01'), new Date('2023-06-15')];
dates.sort((a, b) => a.getTime() - b.getTime());

// ✅ Good - localeCompare for strings
const names = ['Émile', 'Andre', 'Zoë'];
names.sort((a, b) => a.localeCompare(b));

// ✅ Exception - string array is OK
const strings = ['banana', 'apple', 'cherry'];
strings.sort();  // ['apple', 'banana', 'cherry'] - correct
```

**Error message:** `sort() on ${type} array without compare function - uses string comparison`

**Tip:** `Add compare function: .sort((a, b) => a - b) for numbers`

**Severity:** error

---

### 20. `bugs/no-reduce-without-initializer`

**What it catches:** Array.reduce() without initial value

**Why:** Throws on empty array, types incorrectly on heterogeneous reduction

**Detection:** `.reduce(callback)` with only callback, no second argument

```typescript
// ❌ Bad - throws on empty array
const nums: number[] = [];
const sum = nums.reduce((acc, n) => acc + n);  // TypeError!

// ❌ Bad - first element used as accumulator
const nums = [1, 2, 3];
const doubled = nums.reduce((acc, n) => [...acc, n * 2]);
// acc is 1 (number), not array! TypeError on spread

// ❌ Bad - object reduction
const items = [{ value: 1 }, { value: 2 }];
const total = items.reduce((acc, item) => acc + item.value);
// acc is first object, not number!

// ✅ Good - always provide initial value
const nums: number[] = [];
const sum = nums.reduce((acc, n) => acc + n, 0);  // 0, no throw

// ✅ Good - explicit accumulator type
const doubled = nums.reduce<number[]>((acc, n) => [...acc, n * 2], []);

// ✅ Good - object reduction
const items = [{ value: 1 }, { value: 2 }];
const total = items.reduce((acc, item) => acc + item.value, 0);  // 3

// ✅ Good - building object
const arr = [['a', 1], ['b', 2]] as const;
const obj = arr.reduce<Record<string, number>>((acc, [key, val]) => {
  acc[key] = val;
  return acc;
}, {});

// ✅ Exception - when first element is valid accumulator (rare)
// Add comment explaining why initial value is omitted
```

**Error message:** `reduce() without initial value throws on empty array`

**Tip:** `Add initial value: .reduce((acc, item) => ..., initialValue)`

**Severity:** error

---

### 21. `bugs/no-object-spread-overwrite`

**What it catches:** Object spread where later properties definitely overwrite earlier ones

**Why:** Usually a mistake - property set then immediately overwritten

**Detection:** Same property key appearing multiple times in object spread

```typescript
// ❌ Bad - duplicate key in same object
const config = {
  timeout: 5000,
  retries: 3,
  timeout: 10000,  // Overwrites previous!
};

// ❌ Bad - spread overwrites explicit property
const user = {
  name: 'Alice',
  age: 30,
  ...defaults,  // defaults.name overwrites 'Alice'!
};

// ❌ Bad - later spread overwrites earlier
const merged = {
  ...userSettings,
  ...defaultSettings,  // Overwrites user settings!
};

// ❌ Bad - property after spread that includes same key
const data = {
  ...response,
  id: 123,  // response.id is overwritten - intentional?
  ...response,  // Now id is response.id again!
};

// ✅ Good - spread first, then overrides
const user = {
  ...defaults,
  name: 'Alice',  // Intentional override
  age: 30,
};

// ✅ Good - clear override order
const merged = {
  ...defaultSettings,
  ...userSettings,  // User settings take precedence
};

// ✅ Good - no duplicate keys
const config = {
  timeout: 10000,
  retries: 3,
};

// ✅ Good - explicit omit before spread
const { id, ...rest } = response;
const data = {
  ...rest,
  id: 123,  // Clearly intentional
};
```

**Error message:** `Property '${key}' is overwritten by spread/later property`

**Tip:** `Remove duplicate or reorder spreads: put defaults first, overrides last`

**Severity:** warning

---

### 22. `bugs/no-catch-shadow`

**What it catches:** Catch parameter that shadows an outer variable

**Why:** Can accidentally use wrong variable inside catch block

**Detection:** Catch clause parameter name matches variable in outer scope

```typescript
// ❌ Bad - shadows outer error
let error: Error | null = null;

try {
  doSomething();
} catch (error) {  // Shadows outer 'error'
  console.log(error);
}

console.log(error);  // Still null! Catch's error is different

// ❌ Bad - shadows meaningful variable
const err = new CustomError();

try {
  risky();
} catch (err) {  // Shadows 'err'
  // Did we mean to use outer err?
}

// ❌ Bad - common mistake with 'e'
const e = document.getElementById('app');

try {
  process();
} catch (e) {  // Shadows element 'e'
  console.log(e.message);  // Wanted error, but shadows element
}

// ✅ Good - unique catch parameter name
let error: Error | null = null;

try {
  doSomething();
} catch (caughtError) {
  error = caughtError;  // Assign to outer variable
}

// ✅ Good - descriptive names
const element = document.getElementById('app');

try {
  process();
} catch (error) {  // No conflict
  console.log(error.message);
}

// ✅ Good - typed catch
try {
  risky();
} catch (unknownError) {
  if (unknownError instanceof MyError) {
    handleMyError(unknownError);
  }
}
```

**Error message:** `Catch parameter '${name}' shadows variable from outer scope`

**Tip:** `Rename catch parameter to avoid shadowing`

**Severity:** warning

---

### 23. `bugs/no-async-constructor`

**What it catches:** Async operations in constructor without proper handling

**Why:** Constructors can't be async - common source of race conditions

**Detection:**
- `await` inside constructor body (error)
- Async IIFE in constructor (warning)
- `.then()` calls on promises in constructor without storing/handling

```typescript
// ❌ Bad - await in constructor (syntax error)
class Service {
  data: Data;

  constructor() {
    this.data = await fetchData();  // SyntaxError!
  }
}

// ❌ Bad - async IIFE that sets instance property
class Service {
  data: Data | null = null;

  constructor() {
    (async () => {
      this.data = await fetchData();  // Race condition!
    })();
  }
}

const service = new Service();
console.log(service.data);  // null! Async not finished

// ❌ Bad - unhandled promise in constructor
class Service {
  constructor() {
    this.init();  // Returns promise but ignored
  }

  async init() {
    this.data = await fetchData();
  }
}

// ✅ Good - factory pattern
class Service {
  private constructor(private data: Data) {}

  static async create(): Promise<Service> {
    const data = await fetchData();
    return new Service(data);
  }
}

const service = await Service.create();

// ✅ Good - init method with explicit call
class Service {
  data: Data | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    this.data = await fetchData();
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }
}

const service = new Service();
await service.ready();  // Explicit wait

// ✅ Good - lazy initialization
class Service {
  private dataPromise: Promise<Data> | null = null;

  async getData(): Promise<Data> {
    if (!this.dataPromise) {
      this.dataPromise = fetchData();
    }
    return this.dataPromise;
  }
}
```

**Error message:** `Async operation in constructor - use factory pattern or explicit init method`

**Tip:** `Use static async factory: static async create() { return new Class(await data); }`

**Severity:** error

---

### 24. `bugs/no-promise-type-mismatch`

**What it catches:** resolve/reject called with wrong types

**Why:** TypeScript might not catch when Promise generic doesn't match actual resolution

**Detection:**
- `resolve()` called with value that doesn't match Promise type
- `reject()` called with non-Error

```typescript
// ❌ Bad - resolve with wrong type
const promise = new Promise<string>((resolve) => {
  resolve(123);  // Number, not string!
});

// ❌ Bad - resolve with undefined when not allowed
const promise = new Promise<User>((resolve) => {
  if (!valid) {
    resolve(undefined);  // undefined is not User!
  }
});

// ❌ Bad - reject with string instead of Error
const promise = new Promise<User>((resolve, reject) => {
  reject('Something went wrong');  // String, not Error!
});

// ❌ Bad - reject with non-Error value
promise.catch(reject => {
  throw 'error';  // String, not Error!
});

// ✅ Good - correct types
const promise = new Promise<string>((resolve) => {
  resolve('hello');
});

// ✅ Good - union type for nullable
const promise = new Promise<User | null>((resolve) => {
  if (!valid) {
    resolve(null);
  }
});

// ✅ Good - reject with Error
const promise = new Promise<User>((resolve, reject) => {
  reject(new Error('Something went wrong'));
});

// ✅ Good - custom error types
class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

const promise = new Promise<User>((resolve, reject) => {
  reject(new ValidationError('email', 'Invalid email'));
});
```

**Error message:** `Promise<${expected}> resolved with ${actual}`

**Tip:** `Ensure resolve/reject types match Promise generic`

**Severity:** error

---

### 25. `bugs/no-settimeout-string`

**What it catches:** `setTimeout`/`setInterval` with string argument

**Why:** String argument is `eval()`d - security risk and worse performance

**Detection:** First argument to `setTimeout`/`setInterval` is string literal or string variable

```typescript
// ❌ Bad - string is eval'd
setTimeout('alert("Hello")', 1000);

// ❌ Bad - string with variable reference
const code = 'doSomething()';
setTimeout(code, 1000);

// ❌ Bad - template literal (still string)
setTimeout(`console.log(${value})`, 1000);

// ❌ Bad - setInterval with string
setInterval('tick()', 100);

// ✅ Good - function reference
setTimeout(doSomething, 1000);

// ✅ Good - arrow function
setTimeout(() => {
  doSomething();
}, 1000);

// ✅ Good - arrow function with arguments
setTimeout(() => {
  doSomething(value);
}, 1000);

// ✅ Good - bind for fixed arguments
setTimeout(doSomething.bind(null, arg1, arg2), 1000);

// ✅ Good - third+ arguments pass to function
setTimeout(doSomething, 1000, arg1, arg2);
```

**Error message:** `setTimeout/setInterval with string argument uses eval()`

**Tip:** `Use function reference or arrow function: setTimeout(() => fn(), delay)`

**Severity:** error

---

### 26. `bugs/no-nan-arithmetic`

**What it catches:** Arithmetic operations that will definitely produce NaN

**Why:** NaN propagates through calculations silently

**Detection:**
- Division by expression that's definitely 0
- Operations on NaN literal
- `undefined` in arithmetic
- Non-numeric string in arithmetic

```typescript
// ❌ Bad - NaN from undefined
let value: number | undefined;
const result = value + 10;  // NaN if undefined

// ❌ Bad - NaN from string arithmetic
const str = 'hello';
const result = str * 2;  // NaN (implicit coercion)

// ❌ Bad - NaN propagation
const a = NaN;
const b = a + 10;  // Still NaN
const c = Math.sqrt(b);  // Still NaN

// ❌ Bad - parseInt failure
const result = parseInt('hello') + 10;  // NaN + 10 = NaN

// ❌ Bad - potential division by zero producing Infinity
const ratio = count / 0;  // Infinity (not NaN, but also bad)

// ✅ Good - guard against undefined
const value: number | undefined = getValue();
const result = (value ?? 0) + 10;

// ✅ Good - validate before arithmetic
const parsed = parseInt(userInput, 10);
if (Number.isNaN(parsed)) {
  throw new Error('Invalid number');
}
const result = parsed + 10;

// ✅ Good - type narrowing
function calculate(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  return value + 10;
}

// ✅ Good - Number.isFinite check
const ratio = a / b;
if (!Number.isFinite(ratio)) {
  throw new Error('Invalid calculation');
}
```

**Error message:** `Operation will produce NaN: ${expression}`

**Tip:** `Add null check, validate input, or use ?? operator`

**Severity:** error

---

### 27. `bugs/no-readonly-mutation`

**What it catches:** Attempting to mutate readonly/frozen objects

**Why:** Fails silently in non-strict mode, throws in strict mode

**Detection:**
- Property assignment on `Object.freeze()` result
- Property assignment on `as const` object
- Array mutation methods on readonly array
- Property assignment on `Readonly<T>` typed object

```typescript
// ❌ Bad - mutating frozen object
const config = Object.freeze({ timeout: 1000 });
config.timeout = 2000;  // Silently fails or throws!

// ❌ Bad - mutating as const
const COLORS = ['red', 'green', 'blue'] as const;
COLORS.push('yellow');  // TypeScript error, runtime error

// ❌ Bad - mutating Readonly type
interface Config { timeout: number; }
const config: Readonly<Config> = { timeout: 1000 };
config.timeout = 2000;  // TypeScript error

// ❌ Bad - mutating const enum-like
const STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  DONE: 2,
} as const;
STATUS.PENDING = 5;  // TypeScript error, runtime error if frozen

// ✅ Good - create new object
const config = Object.freeze({ timeout: 1000 });
const newConfig = { ...config, timeout: 2000 };

// ✅ Good - mutable copy
const mutableColors = [...COLORS];
mutableColors.push('yellow');

// ✅ Good - use immer for complex updates
import { produce } from 'immer';
const newConfig = produce(config, draft => {
  draft.timeout = 2000;
});

// ✅ Good - separate mutable state
let timeout = 1000;  // let for mutable
const config = { timeout };  // Object can be reassigned
```

**Error message:** `Attempting to mutate readonly ${type}`

**Tip:** `Create a new object with spread: { ...obj, key: newValue }`

**Severity:** error

---

### 28. `bugs/no-array-fill-reference`

**What it catches:** Array.fill() with object/array reference

**Why:** All slots reference the same object - mutation affects all

**Detection:** `.fill(objectLiteral)` or `.fill(arrayLiteral)` or `.fill(variable)` where variable is object

```typescript
// ❌ Bad - all elements are same reference
const grid = new Array(3).fill([]);
grid[0].push(1);
console.log(grid);  // [[1], [1], [1]] - all same array!

// ❌ Bad - all elements share same object
const users = new Array(5).fill({ name: '', active: false });
users[0].name = 'Alice';
console.log(users[1].name);  // 'Alice' - all same object!

// ❌ Bad - even with variable
const defaultRow: number[] = [];
const matrix = new Array(3).fill(defaultRow);

// ✅ Good - Array.from with initializer
const grid = Array.from({ length: 3 }, () => []);
grid[0].push(1);
console.log(grid);  // [[1], [], []] - separate arrays

// ✅ Good - map after fill for objects
const users = new Array(5).fill(null).map(() => ({
  name: '',
  active: false,
}));

// ✅ Good - Array.from for objects
const users = Array.from({ length: 5 }, () => ({
  name: '',
  active: false,
}));

// ✅ Good - fill with primitives is fine
const zeros = new Array(5).fill(0);  // [0, 0, 0, 0, 0]
const empty = new Array(5).fill('');  // Safe
```

**Error message:** `Array.fill(${type}) - all elements will reference same ${type}`

**Tip:** `Use Array.from({ length: n }, () => ({})) for unique objects per slot`

**Severity:** error

---

### 29. `bugs/no-foreach-await`

**What it catches:** Using `.forEach()` with async callback expecting sequential execution

**Why:** forEach doesn't await callbacks - they all start simultaneously

**Detection:** `forEach(async ...)` pattern

```typescript
// ❌ Bad - callbacks not awaited
const files = ['a.txt', 'b.txt', 'c.txt'];
files.forEach(async (file) => {
  const content = await readFile(file);
  await processContent(content);
});
console.log('Done');  // Runs immediately!

// ❌ Bad - expecting order
let count = 0;
items.forEach(async (item) => {
  count++;
  await saveItem(item, count);
});
// All items get same count!

// ✅ Good - for...of for sequential
for (const file of files) {
  const content = await readFile(file);
  await processContent(content);
}
console.log('Done');  // Runs after all files

// ✅ Good - Promise.all for parallel
await Promise.all(
  files.map(async (file) => {
    const content = await readFile(file);
    await processContent(content);
  })
);
console.log('Done');

// ✅ Good - for...of with index if needed
for (const [index, item] of items.entries()) {
  await saveItem(item, index);
}

// ✅ Good - reduce for sequential with result
const results = await files.reduce(async (accPromise, file) => {
  const acc = await accPromise;
  const content = await readFile(file);
  return [...acc, content];
}, Promise.resolve([] as string[]));
```

**Error message:** `forEach with async callback - callbacks run in parallel, not sequentially`

**Tip:** `Use for...of for sequential or Promise.all(arr.map(async ...)) for parallel`

**Severity:** error

---

### 30. `bugs/no-spread-string`

**What it catches:** Spreading a string into array or function args

**Why:** Splits string into individual characters - usually unintended

**Detection:** `[...stringVariable]` or `fn(...stringVariable)`

```typescript
// ❌ Bad - spreads to characters
const name = 'Alice';
const arr = [...name];  // ['A', 'l', 'i', 'c', 'e']

// ❌ Bad - function arguments
const word = 'hello';
console.log(...word);  // h e l l o (5 separate arguments)

// ❌ Bad - unintended in array concat
const items = ['a', 'b'];
const more = 'cd';
const all = [...items, ...more];  // ['a', 'b', 'c', 'd'] not ['a', 'b', 'cd']

// ❌ Bad - concat strings via spread
const greeting = [...'Hello', ' ', ...'World'];  // Individual chars

// ✅ Good - array of strings
const names = ['Alice', 'Bob'];
const all = [...names, 'Charlie'];  // ['Alice', 'Bob', 'Charlie']

// ✅ Good - explicit split when intended
const chars = 'hello'.split('');  // Explicit intent

// ✅ Good - Array.from for intentional character array
const chars = Array.from('hello');  // Explicit

// ✅ Good - string concatenation
const all = items.join('') + more;

// ✅ Good - template literal for string building
const greeting = `Hello World`;
```

**Error message:** `Spreading string '${name}' produces array of characters`

**Tip:** `Use .split('') if intentional, or [str] to wrap string in array`

**Severity:** warning

---

## Detection Helpers

For bug detection, the linter needs:

1. **Type tracking** - Know if variable is number, string, array, object
2. **Value tracking** - Track literal values through assignments
3. **Loop detection** - Identify for, while, forEach, map bodies
4. **Async context** - Know if we're in async function/callback
5. **Reference tracking** - Same variable used multiple places
6. **Method call tracking** - Know what methods are called on what types

### Common Patterns

```typescript
// Pattern: Detect array method with async callback
CallExpression where:
  callee.property.name in ['map', 'filter', 'forEach', 'some', 'every']
  arguments[0] is ArrowFunctionExpression with async: true

// Pattern: Detect mutation in loop
ForStatement/ForOfStatement where:
  body contains CallExpression on same array being iterated

// Pattern: Detect floating point literal
NumericLiteral where:
  raw contains '.' (decimal point)
  OR value !== Math.floor(value)
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `no-floating-point-equality` | warning | Float === comparison |
| `no-array-index-as-key` | warning | Index as list key |
| `no-object-as-key` | error | Object literal as Map/Set key |
| `no-async-array-callback` | error | Async in map/filter/forEach |
| `no-mutation-during-iteration` | error | Mutating array while looping |
| `no-await-in-loop` | warning | Sequential awaits |
| `no-promise-executor-return` | error | Return in Promise executor |
| `no-unhandled-rejection-pattern` | warning | Missing .catch() |
| `no-typeof-undefined-comparison` | warning | Unnecessary typeof |
| `no-hasOwnProperty-call` | error | Direct .hasOwnProperty() |
| `no-in-operator-array-methods` | error | 'length' in array |
| `no-array-constructor-single-arg` | warning | new Array(5) sparse |
| `no-json-stringify-circular` | warning | Circular reference |
| `no-date-mutation` | error | Date setter return value |
| `no-regex-in-loop` | warning | RegExp in loop |
| `no-implicit-coercion-falsy` | warning | if(0) falsy edge case |
| `no-parseint-without-radix` | error | parseInt without radix |
| `no-string-coerced-includes` | error | .includes(0) on string |
| `no-sort-default-compare` | error | sort() without compare |
| `no-reduce-without-initializer` | error | reduce() no initial |
| `no-object-spread-overwrite` | warning | Duplicate spread keys |
| `no-catch-shadow` | warning | Catch shadows outer var |
| `no-async-constructor` | error | Async in constructor |
| `no-promise-type-mismatch` | error | Wrong resolve/reject type |
| `no-settimeout-string` | error | setTimeout('code') |
| `no-nan-arithmetic` | error | Operations producing NaN |
| `no-readonly-mutation` | error | Mutating frozen/readonly |
| `no-array-fill-reference` | error | fill() with object |
| `no-foreach-await` | error | forEach with async |
| `no-spread-string` | warning | [...'string'] |

**Total: 30 rules**
