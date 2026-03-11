# Svelte 5 Lint Rules

Implement the **Svelte 5 Runes** lint rules (18 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/svelte5/`

File patterns: `**/*.svelte` (parse script blocks)

---

## Rules

### 1. `svelte5/no-legacy-reactive-statements`

**What it catches:** `$:` reactive statements (Svelte 4 syntax)

**Why:** Svelte 5 uses `$derived` and `$effect` runes instead

**Detection:** Find `LabeledStatement` where label is `$`

```svelte
// ❌ Bad
$: doubled = count * 2;
$: console.log(count);
$: {
  console.log('count changed');
  doSomething(count);
}

// ✅ Good
let doubled = $derived(count * 2);

$effect(() => console.log(count));

$effect(() => {
  console.log('count changed');
  doSomething(count);
});
```

**Error message:** `Legacy reactive statement '$:' - use $derived or $effect instead`

**Tip:** `For computed values use $derived(), for side effects use $effect()`

---

### 2. `svelte5/no-legacy-props`

**What it catches:** `export let` for component props

**Why:** Svelte 5 uses `$props()` rune

**Detection:** Find `ExportNamedDeclaration` containing `VariableDeclaration` with `let`

```svelte
// ❌ Bad
<script>
  export let name;
  export let count = 0;
  export let items = [];
</script>

// ✅ Good
<script>
  let { name, count = 0, items = [] } = $props();
</script>
```

**Error message:** `Legacy prop declaration 'export let ${name}' - use $props() instead`

**Tip:** `Destructure props from $props(): let { ${name} } = $props();`

---

### 3. `svelte5/require-effect-cleanup`

**What it catches:** `$effect` containing event listeners, subscriptions, timers without cleanup return

**Why:** Prevents memory leaks

**Detection:** Find `$effect` CallExpression where callback body contains:
- `addEventListener` without corresponding `removeEventListener` in return
- `setInterval`/`setTimeout` without `clearInterval`/`clearTimeout` in return
- `subscribe` without `unsubscribe` in return
- `.on(` patterns without `.off(` in return

```svelte
// ❌ Bad
$effect(() => {
  window.addEventListener('resize', handler);
});

$effect(() => {
  const id = setInterval(tick, 1000);
});

$effect(() => {
  const unsub = store.subscribe(handler);
});

// ✅ Good
$effect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
});

$effect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});

$effect(() => {
  const unsub = store.subscribe(handler);
  return unsub;
});
```

**Error message:** `$effect contains '${operation}' but no cleanup function returned`

**Tip:** `Return a cleanup function: $effect(() => { ... return () => cleanup(); });`

---

### 4. `svelte5/no-effect-mutation`

**What it catches:** Mutating `$state` inside `$effect` without conditional guard

**Why:** Can cause infinite loops - effect runs, mutates state, triggers effect again

**Detection:** Find `$effect` CallExpression where callback body contains:
- Assignment to identifier that was declared with `$state`
- No `if` statement guarding the assignment

```svelte
// ❌ Bad - infinite loop
let count = $state(0);

$effect(() => {
  count = count + 1;
});

$effect(() => {
  count++;
});

// ✅ Good - guarded mutation
$effect(() => {
  if (shouldIncrement) {
    count++;
  }
});

// ✅ Good - no mutation, just reading
$effect(() => {
  console.log(count);
});

// ✅ Good - mutation based on other state
$effect(() => {
  if (trigger) {
    count = 0;  // Reset when trigger changes
  }
});
```

**Error message:** `Unguarded mutation of '$state' variable '${name}' inside $effect may cause infinite loop`

**Tip:** `Wrap mutation in a conditional: if (condition) { ${name} = newValue; }`

---

### 5. `svelte5/prefer-derived-over-effect`

**What it catches:** `$effect` that only exists to set a value based on other reactive state

**Why:** `$derived` is more efficient, declarative, and doesn't require cleanup

**Detection:** Find `$effect` where:
- Callback body is a single assignment statement
- Or callback body only contains an assignment (possibly with simple computation)
- The assigned variable is `$state`

```svelte
// ❌ Bad
let count = $state(0);
let doubled = $state(0);

$effect(() => {
  doubled = count * 2;
});

let fullName = $state('');
$effect(() => {
  fullName = `${firstName} ${lastName}`;
});

// ✅ Good
let count = $state(0);
let doubled = $derived(count * 2);

let fullName = $derived(`${firstName} ${lastName}`);
```

**Error message:** `$effect only sets '${name}' - use $derived instead`

**Tip:** `Replace with: let ${name} = $derived(${expression});`

---

### 6. `svelte5/require-bindable-for-bind`

**What it catches:** Props used with `bind:` directive but not declared with `$bindable()`

**Why:** Two-way binding requires explicit opt-in in Svelte 5 for clarity

**Detection:**
1. Find all `bind:propName` directives in template
2. Check if those props are destructured from `$props()` with `$bindable()`

```svelte
// ❌ Bad
<script>
  let { value } = $props();
</script>
<input bind:value />

<script>
  let { checked, disabled } = $props();
</script>
<input type="checkbox" bind:checked />

// ✅ Good
<script>
  let { value = $bindable() } = $props();
</script>
<input bind:value />

<script>
  let { checked = $bindable(false), disabled } = $props();
</script>
<input type="checkbox" bind:checked />
```

**Error message:** `Prop '${name}' used with bind: but not declared as $bindable()`

**Tip:** `Declare as: let { ${name} = $bindable() } = $props();`

---

### 7. `svelte5/no-legacy-event-handlers`

**What it catches:** `on:event` directive syntax (Svelte 4)

**Why:** Svelte 5 uses `onevent` attribute syntax

**Detection:** Find directive nodes with `on:` prefix

```svelte
// ❌ Bad
<button on:click={handler}>Click</button>
<button on:click|preventDefault={handler}>Click</button>
<button on:click|stopPropagation|preventDefault={handler}>Click</button>
<form on:submit|preventDefault={handleSubmit}>

// ✅ Good
<button onclick={handler}>Click</button>
<button onclick={(e) => { e.preventDefault(); handler(e); }}>Click</button>
<button onclick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  handler(e);
}}>Click</button>
<form onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
```

**Error message:** `Legacy event handler 'on:${event}' - use 'on${event}' attribute instead`

**Tip:** `Replace on:${event} with on${event}. For modifiers like |preventDefault, call e.preventDefault() in handler.`

---

### 8. `svelte5/no-create-event-dispatcher`

**What it catches:** `createEventDispatcher` import and usage

**Why:** Svelte 5 uses callback props instead of custom events

**Detection:**
- Import from 'svelte' including `createEventDispatcher`
- `createEventDispatcher()` calls
- `dispatch('eventName', data)` calls

```svelte
// ❌ Bad
<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('submit', { data: formData });
    dispatch('close');
  }
</script>

// ✅ Good
<script>
  let { onsubmit, onclose } = $props();

  function handleClick() {
    onsubmit?.({ data: formData });
    onclose?.();
  }
</script>
```

**Error message:** `createEventDispatcher is deprecated in Svelte 5 - use callback props instead`

**Tip:** `Accept callback props: let { on${eventName} } = $props(); then call on${eventName}?.(data);`

---

### 9. `svelte5/no-legacy-slots`

**What it catches:** `<slot>` elements and `$$slots` usage

**Why:** Svelte 5 uses snippets and `{@render}` for composition

**Detection:**
- `<slot>` or `<slot name="...">` elements
- `$$slots` identifier

```svelte
// ❌ Bad
<div class="card">
  <slot name="header" />
  <slot />
  <slot name="footer" />
</div>

{#if $$slots.footer}
  <footer>
    <slot name="footer" />
  </footer>
{/if}

// ✅ Good
<script>
  let { header, children, footer } = $props();
</script>

<div class="card">
  {@render header?.()}
  {@render children?.()}
  {@render footer?.()}
</div>

{#if footer}
  <footer>
    {@render footer()}
  </footer>
{/if}
```

**Error message (slot):** `<slot> is deprecated in Svelte 5 - use snippets with {@render}`

**Error message ($$slots):** `$$slots is deprecated in Svelte 5 - check snippet props directly`

**Tip:** `Accept snippet props and render with {@render snippetName?.()}`

---

### 10. `svelte5/require-snippet-typing`

**What it catches:** Snippet props without `Snippet` type annotation

**Why:** Type safety for render functions

**Detection:** Props destructured from `$props()` that are:
- Used with `{@render}` in template
- But not typed as `Snippet` or `Snippet<[...]>`

```svelte
// ❌ Bad
<script lang="ts">
  let { children, header } = $props();
</script>

{@render children?.()}
{@render header?.()}

// ✅ Good
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children, header }: {
    children: Snippet;
    header?: Snippet;
  } = $props();
</script>

{@render children()}
{@render header?.()}

// ✅ Also good - typed snippets with parameters
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    row: Snippet<[item: Item, index: number]>;
  }

  let { children, row }: Props = $props();
</script>
```

**Error message:** `Snippet prop '${name}' should be typed as Snippet or Snippet<[...]>`

**Tip:** `Import { Snippet } from 'svelte' and type as: ${name}: Snippet`

---

### 11. `svelte5/no-rest-props-misuse`

**What it catches:** `$$restProps` or `$$props` usage

**Why:** Svelte 5 uses rest destructuring with `$props()` instead

**Detection:** `$$restProps` or `$$props` identifiers

```svelte
// ❌ Bad
<input {...$$restProps} />
<div {...$$props} />

{#if $$props.class}
  <span class={$$props.class}>
{/if}

// ✅ Good
<script>
  let { type, value, ...rest } = $props();
</script>

<input {type} {value} {...rest} />

// ✅ For class specifically
<script>
  let { class: className, ...rest } = $props();
</script>

<div class={className} {...rest} />
```

**Error message:** `$$restProps is deprecated in Svelte 5 - use rest destructuring with $props()`

**Tip:** `Use: let { knownProp, ...rest } = $props(); then {...rest}`

---

### 12. `svelte5/prefer-derived-by`

**What it catches:** `$derived()` with complex multi-step logic

**Why:** `$derived.by()` is clearer for complex derivations with intermediate steps

**Detection:** `$derived()` where argument is:
- A function call chain (method chaining with 3+ methods)
- Contains multiple operations that would benefit from intermediate variables
- Has complex logic that's hard to read inline

```svelte
// ❌ Bad (complex inline)
let sorted = $derived(
  items
    .filter(x => x.active)
    .filter(x => x.category === selectedCategory)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)
);

let stats = $derived({
  total: items.reduce((a, b) => a + b.value, 0),
  average: items.reduce((a, b) => a + b.value, 0) / items.length,
  max: Math.max(...items.map(i => i.value))
});

// ✅ Good
let sorted = $derived.by(() => {
  const active = items.filter(x => x.active);
  const filtered = active.filter(x => x.category === selectedCategory);
  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
  return sorted.slice(0, 10);
});

let stats = $derived.by(() => {
  const total = items.reduce((a, b) => a + b.value, 0);
  const average = total / items.length;
  const max = Math.max(...items.map(i => i.value));
  return { total, average, max };
});

// ✅ Simple derivations are fine with $derived()
let doubled = $derived(count * 2);
let fullName = $derived(`${first} ${last}`);
```

**Error message:** `Complex derivation should use $derived.by() for clarity`

**Tip:** `Use $derived.by(() => { ...intermediate steps...; return result; })`

---

### 13. `svelte5/no-state-in-module-context`

**What it catches:** `$state` used in `<script context="module">`

**Why:** Module-level state is shared across ALL component instances (singleton) - usually a bug

**Detection:** `$state()` call inside script tag with `context="module"` attribute

```svelte
// ❌ Bad - shared across ALL instances!
<script context="module">
  let shared = $state(0);  // Every component sees same value!
  let users = $state([]);  // Mutations affect all instances!
</script>

<script>
  function increment() {
    shared++;  // Increments for ALL instances
  }
</script>

// ✅ Good - if you actually want shared state, be explicit
<script context="module">
  // Use a regular variable if truly intentional singleton
  let sharedCache = new Map();  // Clear it's not reactive per-instance
</script>

<script>
  // Instance-specific reactive state
  let count = $state(0);
</script>

// ✅ Good - module context for non-reactive exports
<script context="module">
  export const COMPONENT_VERSION = '1.0.0';
  export function helperFunction() { ... }
</script>
```

**Error message:** `$state in module context creates shared state across all component instances`

**Tip:** `Move $state to instance script, or use regular variable if shared state is intentional`

---

### 14. `svelte5/component-naming`

**What it catches:** Component files not in PascalCase

**Why:** Convention distinguishes components from regular modules

**Detection:** `.svelte` files where filename is not PascalCase

```
// ❌ Bad
user-card.svelte
userCard.svelte
user_card.svelte
USER_CARD.svelte

// ✅ Good
UserCard.svelte
Button.svelte
DataTable.svelte
```

**Error message:** `Component file should be PascalCase: '${current}' → '${suggested}'`

**Tip:** `Rename to ${suggestedName}.svelte`

---

### 15. `svelte5/no-inline-styles`

**What it catches:** `style=""` attributes with hardcoded values

**Why:** Prefer CSS classes, CSS variables, or `style:` directives for maintainability

**Detection:** HTML elements with `style` attribute containing literal string values

```svelte
// ❌ Bad
<div style="color: red; margin: 10px;">
<span style="font-weight: bold;">
<p style="display: flex; justify-content: center; align-items: center;">

// ✅ Good - CSS classes
<div class="error-text">
<span class="bold">
<p class="flex-center">

// ✅ Good - style directive with reactive values
<div style:color={textColor}>
<div style:--theme-color={themeColor}>

// ✅ Good - style directive for dynamic styles
<div style:transform="rotate({rotation}deg)">

// ✅ Exception - truly dynamic one-off styles
<div style:left="{x}px" style:top="{y}px">
```

**Error message:** `Avoid inline styles - use CSS classes or style: directives`

**Tip:** `Extract to CSS class or use style:property={value} for dynamic values`

---

### 16. `svelte5/require-each-key`

**What it catches:** `{#each}` blocks without keyed expression

**Why:** Keys prevent bugs with list reordering, animations, and component state

**Detection:** `{#each ... as ...}` without `(keyExpression)` part

```svelte
// ❌ Bad
{#each items as item}
  <Item {item} />
{/each}

{#each users as user, index}
  <UserCard {user} />
{/each}

// ✅ Good
{#each items as item (item.id)}
  <Item {item} />
{/each}

{#each users as user, index (user.id)}
  <UserCard {user} />
{/each}

// ✅ Good - index as key when items don't have IDs
{#each primitiveValues as value, index (index)}
  <span>{value}</span>
{/each}

// ✅ Good - compound key
{#each items as item (item.type + '-' + item.id)}
  <Item {item} />
{/each}
```

**Error message:** `{#each} block should have a key expression for stable identity`

**Tip:** `Add key: {#each items as item (item.id)}`

---

### 17. `svelte5/no-reactive-class-properties`

**What it catches:** `$state` used on class properties

**Why:** Class instances with `$state` are deeply reactive - might be unintended, has performance implications

**Detection:** `$state()` inside class body (property initializer or constructor)

```svelte
// ⚠️ Warning - ensure this is intentional
<script>
  class Todo {
    text = $state('');
    done = $state(false);
  }

  class Counter {
    count = $state(0);

    increment() {
      this.count++;
    }
  }
</script>

// ✅ If intentional, acknowledge with comment or type
<script>
  // Reactive class - all instances will be deeply reactive
  class Todo {
    text = $state('');
    done = $state(false);
  }
</script>

// ✅ Alternative - use plain class with external state
<script>
  class Todo {
    constructor(public text: string, public done: boolean) {}
  }

  let todos = $state<Todo[]>([]);
</script>
```

**Error message:** `$state in class property makes all instances deeply reactive - ensure this is intentional`

**Tip:** `Consider using plain classes with $state arrays/objects wrapping them instead`

**Severity:** `warning` (not error - sometimes intentional)

---

### 18. `svelte5/no-untrack-misuse`

**What it catches:** `untrack()` used on non-reactive values

**Why:** `untrack` only needed for reactive values you want to read without tracking

**Detection:** `untrack()` call where the returned expression:
- Is a literal value
- Is a non-reactive variable (not from `$state` or `$derived`)
- Is a pure function call with no reactive inputs

```svelte
// ❌ Bad - unnecessary untrack
<script>
  import { untrack } from 'svelte';

  const config = { theme: 'dark' };  // Not reactive

  $effect(() => {
    const x = untrack(() => 5);  // Literal, never reactive
    const y = untrack(() => config.theme);  // config is not $state
    const z = untrack(() => Math.random());  // Pure function
  });
</script>

// ✅ Good - untrack for intentionally untracked reactive reads
<script>
  import { untrack } from 'svelte';

  let count = $state(0);
  let previous = $state(0);

  $effect(() => {
    // Read count reactively, but read 'previous' without triggering on its change
    if (count !== untrack(() => previous)) {
      previous = count;
      console.log('count changed from', previous, 'to', count);
    }
  });
</script>

// ✅ Good - untrack to avoid circular dependency
<script>
  let a = $state(0);
  let b = $state(0);

  $effect(() => {
    // React to 'a' changes, update 'b', but don't react to 'b'
    b = untrack(() => b) + a;
  });
</script>
```

**Error message:** `untrack() used on non-reactive value '${expression}' - untrack is only needed for $state/$derived`

**Tip:** `Remove untrack() wrapper - the value is not reactive`

---

## Detection Helpers Needed

For Svelte files, the linter needs to:

1. **Parse `.svelte` files** - Extract `<script>` blocks and template
2. **Handle `<script context="module">`** - Distinguish from instance script
3. **Parse template syntax** - `{#each}`, `{@render}`, `bind:`, `on:`, etc.
4. **Track $state/$derived declarations** - Know which variables are reactive
5. **Detect rune calls** - `$state()`, `$derived()`, `$effect()`, `$props()`, `$bindable()`

### AST Node Types for Svelte

```typescript
// Additional visitor hooks needed for Svelte
visitor: {
  // Script parsing (standard TS AST)
  CallExpression,      // $state(), $derived(), $effect(), etc.
  LabeledStatement,    // $: reactive statements
  ExportNamedDeclaration,  // export let

  // Template parsing (Svelte-specific AST)
  SvelteElement,       // HTML elements
  SvelteDirective,     // on:click, bind:value, etc.
  SvelteEachBlock,     // {#each}
  SvelteSlot,          // <slot>
  SvelteRenderTag,     // {@render}
}
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `no-legacy-reactive-statements` | error | `$:` statements |
| `no-legacy-props` | error | `export let` |
| `require-effect-cleanup` | error | Memory leaks in $effect |
| `no-effect-mutation` | error | Infinite loops |
| `prefer-derived-over-effect` | warning | Misused $effect |
| `require-bindable-for-bind` | error | Missing $bindable |
| `no-legacy-event-handlers` | error | `on:event` syntax |
| `no-create-event-dispatcher` | error | Old event pattern |
| `no-legacy-slots` | error | `<slot>` elements |
| `require-snippet-typing` | warning | Untyped snippets |
| `no-rest-props-misuse` | error | `$$restProps` |
| `prefer-derived-by` | warning | Complex $derived |
| `no-state-in-module-context` | error | Shared state bug |
| `component-naming` | warning | File naming |
| `no-inline-styles` | warning | Hardcoded styles |
| `require-each-key` | error | Missing keys |
| `no-reactive-class-properties` | warning | Class reactivity |
| `no-untrack-misuse` | warning | Unnecessary untrack |

**Total: 18 rules**
