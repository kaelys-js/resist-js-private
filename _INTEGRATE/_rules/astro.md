# Astro Lint Rules

Implement the **Astro Framework** lint rules (15 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/astro/`

File patterns: `**/*.astro`, `astro.config.mjs`, `astro.config.ts`

---

## Already Covered by Oxlint

As of 2025, oxlint v1.0+ supports linting `.astro` files and Biome v2.3+ provides formatting for Astro. However, **Astro-specific semantic rules are not implemented** - only general JS/TS rules run on the script section.

The rules below are Astro-specific patterns that require understanding of Astro's component model.

---

## Rules to Implement

### 1. `astro/require-frontmatter-fence`

**What it catches:** Astro components without proper `---` frontmatter delimiters

**Why:** The frontmatter fence is required for component scripts; missing it causes template-only rendering

**Detection:** `.astro` file without `---` at start, or with only one `---`

```astro
// ❌ Bad - no frontmatter fence
<div>Hello {name}</div>

// ❌ Bad - only opening fence
---
const name = 'World';
<div>Hello {name}</div>

// ❌ Bad - content before fence
<div>Header</div>
---
const name = 'World';
---

// ✅ Good - proper frontmatter
---
const name = 'World';
---
<div>Hello {name}</div>

// ✅ Good - empty frontmatter is OK
---
---
<div>Static content</div>

// ✅ Good - template-only when intentional (with comment)
<!-- No script needed for this component -->
<div class="divider"></div>
```

**Error message:** `Astro component missing frontmatter fence (---)`

**Tip:** `Add frontmatter delimiters: --- at start and end of script section`

**Severity:** warning

---

### 2. `astro/no-script-in-template`

**What it catches:** JavaScript logic written in template section instead of frontmatter

**Why:** Template section should only contain expressions, not statements; causes confusion and errors

**Detection:** Template section containing:
- Variable declarations (`const`, `let`, `var`)
- Function definitions
- Import statements
- Control flow statements (`if`, `for`, `while`)

```astro
// ❌ Bad - logic in template
---
---
<div>
  const items = ['a', 'b', 'c'];
  {items.map(i => <span>{i}</span>)}
</div>

// ❌ Bad - import in template
---
---
import Component from './Component.astro';
<Component />

// ❌ Bad - function definition in template
---
---
<div>
  function format(str) { return str.toUpperCase(); }
  {format('hello')}
</div>

// ✅ Good - logic in frontmatter
---
const items = ['a', 'b', 'c'];
function format(str: string) {
  return str.toUpperCase();
}
---
<div>
  {items.map(i => <span>{i}</span>)}
  {format('hello')}
</div>

// ✅ Good - inline expressions in template
---
const name = 'World';
---
<div>{name.toUpperCase()}</div>
```

**Error message:** `JavaScript ${statementType} should be in frontmatter, not template`

**Tip:** `Move ${statement} inside the --- frontmatter fence`

**Severity:** error

---

### 3. `astro/client-directive-on-astro-component`

**What it catches:** `client:*` directives on Astro components

**Why:** Astro components are server-only; client directives have no effect

**Detection:** `client:load`, `client:idle`, `client:visible`, `client:media`, `client:only` on `.astro` component

```astro
// ❌ Bad - client directive on Astro component
---
import Header from './Header.astro';
---
<Header client:load />

// ❌ Bad - any client directive
---
import Card from './Card.astro';
---
<Card client:visible />
<Card client:idle />
<Card client:only="react" />

// ✅ Good - no client directive on Astro components
---
import Header from './Header.astro';
---
<Header />

// ✅ Good - client directive on framework components
---
import ReactCounter from './Counter.jsx';
import SvelteToggle from './Toggle.svelte';
---
<ReactCounter client:load />
<SvelteToggle client:visible />
```

**Error message:** `client:${directive} has no effect on Astro components - they are server-only`

**Tip:** `Remove client: directive, or convert to framework component if interactivity needed`

**Severity:** error

---

### 4. `astro/require-client-directive`

**What it catches:** Framework components without `client:*` directive

**Why:** Framework components without client directive render static HTML only - no interactivity

**Detection:** Component from `.jsx`, `.tsx`, `.vue`, `.svelte` without any `client:` directive

```astro
// ❌ Bad - React component without client directive
---
import Counter from './Counter.jsx';
---
<Counter />  // Renders static HTML, no click handlers work!

// ❌ Bad - Svelte component without hydration
---
import Toggle from './Toggle.svelte';
---
<Toggle on:change={handler} />  // Event handler won't work!

// ❌ Bad - Vue component
---
import Form from './Form.vue';
---
<Form />

// ✅ Good - with client directive
---
import Counter from './Counter.jsx';
---
<Counter client:load />
<Counter client:visible />
<Counter client:idle />

// ✅ Good - static render intentional (comment)
---
import Icon from './Icon.jsx';  // SVG icon, no JS needed
---
{/* Static render - no interactivity needed */}
<Icon name="star" />

// ✅ Good - using client:only for client-side only
---
import BrowserOnly from './BrowserOnly.jsx';
---
<BrowserOnly client:only="react" />
```

**Error message:** `Framework component '${name}' without client: directive renders as static HTML`

**Tip:** `Add client:load for immediate hydration, client:visible for lazy, or comment if static is intended`

**Severity:** warning

---

### 5. `astro/no-dynamic-slot-name`

**What it catches:** Attempting to use dynamic slot names

**Why:** Astro doesn't support dynamic slot names - they must be static strings

**Detection:** `slot={variable}` or `slot={expression}` instead of `slot="string"`

```astro
// ❌ Bad - dynamic slot name
---
const slotName = 'header';
---
<Component>
  <div slot={slotName}>Content</div>
</Component>

// ❌ Bad - template literal slot
---
const section = 'main';
---
<Layout>
  <div slot={`${section}-content`}>Content</div>
</Layout>

// ❌ Bad - conditional slot name
<Component>
  <div slot={isHeader ? 'header' : 'footer'}>Content</div>
</Component>

// ✅ Good - static slot names
<Component>
  <div slot="header">Header Content</div>
  <div slot="footer">Footer Content</div>
</Component>

// ✅ Good - conditional rendering to different slots
{isHeader ? (
  <div slot="header">Content</div>
) : (
  <div slot="footer">Content</div>
)}

// ✅ Good - default slot (no name)
<Component>
  <div>Default slot content</div>
</Component>
```

**Error message:** `Dynamic slot names are not supported in Astro - use static string`

**Tip:** `Use conditional rendering with static slot names instead`

**Severity:** error

---

### 6. `astro/no-unused-defined-slot`

**What it catches:** Named slots defined in component but never filled by parent

**Why:** Indicates potential dead code or missing content

**Detection:** `<slot name="x" />` in component where no usage passes `slot="x"`

Note: This requires cross-file analysis.

```astro
// Component.astro
// ❌ Bad - slot defined but never used anywhere
---
---
<div>
  <slot name="header" />
  <slot />  <!-- default slot -->
  <slot name="sidebar" />  <!-- Never filled by any parent! -->
</div>

// Usage in other files only fills header and default:
// <Component>
//   <h1 slot="header">Title</h1>
//   <p>Content</p>
// </Component>

// ✅ Good - all slots used somewhere
// Component.astro
---
---
<div>
  <slot name="header" />
  <slot />
</div>

// ✅ Good - fallback content for optional slots
---
---
<div>
  <slot name="sidebar">
    <nav>Default navigation</nav>
  </slot>
</div>
```

**Error message:** `Slot '${name}' is defined but never filled by any parent component`

**Tip:** `Remove unused slot or add fallback content if optional`

**Severity:** warning

---

### 7. `astro/define-vars-type`

**What it catches:** `define:vars` with non-serializable values

**Why:** `define:vars` serializes values to strings; objects/functions won't work as expected

**Detection:** `define:vars={{ }}` containing functions, symbols, or complex objects

```astro
// ❌ Bad - function in define:vars
---
const handler = () => console.log('click');
---
<script define:vars={{ handler }}>
  document.addEventListener('click', handler);  // handler is "[object Object]"!
</script>

// ❌ Bad - object loses methods
---
const user = {
  name: 'Alice',
  greet() { return `Hi, ${this.name}`; }
};
---
<script define:vars={{ user }}>
  console.log(user.greet());  // Error! greet is not a function
</script>

// ❌ Bad - circular reference
---
const obj = {};
obj.self = obj;
---
<script define:vars={{ obj }}>
  // Serialization error
</script>

// ✅ Good - primitive values
---
const name = 'Alice';
const count = 42;
const enabled = true;
---
<script define:vars={{ name, count, enabled }}>
  console.log(`${name}: ${count}`);
</script>

// ✅ Good - simple serializable objects
---
const config = { theme: 'dark', lang: 'en' };
---
<script define:vars={{ config }}>
  console.log(config.theme);
</script>

// ✅ Good - use data attributes for complex data
---
const items = [1, 2, 3];
---
<div id="app" data-items={JSON.stringify(items)}></div>
<script>
  const el = document.getElementById('app');
  const items = JSON.parse(el.dataset.items);
</script>
```

**Error message:** `define:vars cannot serialize ${type} - use primitives or plain objects`

**Tip:** `Use data attributes with JSON.stringify for complex data`

**Severity:** error

---

### 8. `astro/no-unsanitized-html`

**What it catches:** `set:html` with unsanitized user input

**Why:** XSS vulnerability - `set:html` renders raw HTML

**Detection:** `set:html={variable}` where variable comes from:
- User input (query params, form data)
- External API response
- Database content
- Any untracked source

```astro
// ❌ Bad - user input in set:html
---
const userContent = Astro.url.searchParams.get('content');
---
<div set:html={userContent} />  <!-- XSS! -->

// ❌ Bad - API response without sanitization
---
const response = await fetch('/api/content');
const { html } = await response.json();
---
<div set:html={html} />  <!-- Untrusted source -->

// ❌ Bad - database content
---
const post = await db.getPost(id);
---
<article set:html={post.body} />  <!-- Could contain malicious HTML -->

// ✅ Good - sanitize HTML
---
import DOMPurify from 'isomorphic-dompurify';
const userContent = Astro.url.searchParams.get('content') ?? '';
const sanitized = DOMPurify.sanitize(userContent);
---
<div set:html={sanitized} />

// ✅ Good - trusted static content
---
const staticHtml = '<strong>Bold text</strong>';  // Hardcoded, safe
---
<div set:html={staticHtml} />

// ✅ Good - markdown rendering with sanitization
---
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
const html = DOMPurify.sanitize(marked.parse(content));
---
<div set:html={html} />

// ✅ Good - use text content when possible
---
const userName = Astro.url.searchParams.get('name') ?? '';
---
<div>{userName}</div>  <!-- Auto-escaped -->
```

**Error message:** `set:html with potentially unsanitized content - XSS risk`

**Tip:** `Sanitize with DOMPurify: DOMPurify.sanitize(content)`

**Severity:** error

---

### 9. `astro/prefer-class-list`

**What it catches:** Complex class string concatenation

**Why:** `class:list` is cleaner for conditional classes

**Detection:** `class={...}` with template literals containing conditionals or arrays

```astro
// ❌ Bad - template literal conditionals
---
const isActive = true;
const isLarge = false;
---
<div class={`btn ${isActive ? 'active' : ''} ${isLarge ? 'large' : ''}`} />

// ❌ Bad - array join
---
const classes = ['btn'];
if (isActive) classes.push('active');
---
<div class={classes.join(' ')} />

// ❌ Bad - complex ternary
<div class={`${baseClass} ${variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-default'}`} />

// ✅ Good - class:list directive
---
const isActive = true;
const isLarge = false;
---
<div class:list={['btn', { active: isActive, large: isLarge }]} />

// ✅ Good - class:list with variants
<div class:list={[
  'btn',
  {
    'btn-primary': variant === 'primary',
    'btn-secondary': variant === 'secondary',
    'btn-default': !variant || variant === 'default',
  }
]} />

// ✅ Good - simple static class is fine
<div class="btn primary" />

// ✅ Good - single dynamic class
<div class={buttonClass} />
```

**Error message:** `Complex class concatenation - use class:list directive`

**Tip:** `Use class:list={['base', { conditional: bool }]}`

**Severity:** warning

---

### 10. `astro/no-unfiltered-props-spread`

**What it catches:** Spreading `Astro.props` without filtering known props

**Why:** May pass unexpected props, cause HTML attribute warnings, or leak internal props

**Detection:** `{...Astro.props}` without destructuring known props first

```astro
// ❌ Bad - spreading all props
---
interface Props {
  title: string;
  variant: 'primary' | 'secondary';
}
---
<div {...Astro.props}>  <!-- Spreads title and variant as HTML attributes! -->
  {Astro.props.title}
</div>

// ❌ Bad - internal props leaked to DOM
---
const { internalFlag, ...rest } = Astro.props;
---
<div {...Astro.props}>  <!-- Still spreads internalFlag! -->

// ✅ Good - destructure and spread rest
---
interface Props {
  title: string;
  variant: 'primary' | 'secondary';
  class?: string;
}
const { title, variant, ...htmlProps } = Astro.props;
---
<div {...htmlProps}>
  {title}
</div>

// ✅ Good - explicit props only
---
interface Props extends HTMLAttributes<'div'> {
  title: string;
}
const { title, class: className, ...rest } = Astro.props;
---
<div class={className} {...rest}>
  {title}
</div>

// ✅ Good - no spread needed
---
const { title, variant } = Astro.props;
---
<div class={variant}>
  {title}
</div>
```

**Error message:** `Spreading Astro.props may pass unexpected attributes to HTML`

**Tip:** `Destructure known props first: const { known, ...rest } = Astro.props`

**Severity:** warning

---

### 11. `astro/require-props-type`

**What it catches:** Astro components without Props interface

**Why:** Type safety and documentation for component API

**Detection:** `.astro` file using `Astro.props` without `interface Props` or `type Props`

```astro
// ❌ Bad - no Props type
---
const { title, count } = Astro.props;
---
<div>{title}: {count}</div>

// ❌ Bad - using any
---
const props: any = Astro.props;
---
<div>{props.title}</div>

// ✅ Good - Props interface
---
interface Props {
  title: string;
  count: number;
  variant?: 'primary' | 'secondary';
}

const { title, count, variant = 'primary' } = Astro.props;
---
<div class={variant}>{title}: {count}</div>

// ✅ Good - extending HTML attributes
---
import type { HTMLAttributes } from 'astro/types';

interface Props extends HTMLAttributes<'button'> {
  variant: 'primary' | 'secondary';
}

const { variant, ...attrs } = Astro.props;
---
<button class={variant} {...attrs}>
  <slot />
</button>

// ✅ Good - type alias
---
type Props = {
  items: string[];
  onSelect?: (item: string) => void;
};

const { items } = Astro.props;
---
```

**Error message:** `Astro component using props without Props interface`

**Tip:** `Add: interface Props { propName: type; }`

**Severity:** warning

---

### 12. `astro/no-async-in-template`

**What it catches:** Async operations (fetch, await) in template expressions

**Why:** Template expressions should be sync; async work belongs in frontmatter

**Detection:** `await` keyword or `fetch()` call inside `{}` template expressions

```astro
// ❌ Bad - await in template
---
---
<div>
  {await fetch('/api/data').then(r => r.json())}
</div>

// ❌ Bad - async IIFE in template
<div>
  {(async () => {
    const data = await getData();
    return data.name;
  })()}
</div>

// ❌ Bad - fetch in template
<ul>
  {fetch('/api/items')
    .then(r => r.json())
    .then(items => items.map(i => <li>{i}</li>))}
</ul>

// ✅ Good - async in frontmatter
---
const response = await fetch('/api/data');
const data = await response.json();
const items = await getItems();
---
<div>{data.name}</div>
<ul>
  {items.map(i => <li>{i}</li>)}
</ul>

// ✅ Good - use Astro.props from loader
---
// Data loaded in getStaticPaths or middleware
const { data } = Astro.props;
---
<div>{data.name}</div>
```

**Error message:** `Async operations should be in frontmatter, not template expressions`

**Tip:** `Move fetch/await to the --- frontmatter section`

**Severity:** error

---

### 13. `astro/integration-config`

**What it catches:** Common Astro integration misconfigurations

**Why:** Integrations require correct configuration to work properly

**Detection:** In `astro.config.mjs`:
- Missing required integration options
- Conflicting integrations
- Wrong order of integrations

```javascript
// ❌ Bad - Svelte without preprocessor config
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [svelte()],  // May need preprocess for TypeScript
});

// ❌ Bad - multiple CSS integrations conflicting
export default defineConfig({
  integrations: [
    tailwind(),
    unocss(),  // Conflicts with Tailwind!
  ],
});

// ❌ Bad - sitemap without site URL
export default defineConfig({
  integrations: [sitemap()],
  // Missing: site: 'https://example.com'
});

// ❌ Bad - SSR adapter missing for server output
export default defineConfig({
  output: 'server',
  // Missing adapter!
});

// ✅ Good - proper Svelte config
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  integrations: [
    svelte({
      preprocess: vitePreprocess(),
    }),
  ],
});

// ✅ Good - sitemap with site
export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap()],
});

// ✅ Good - SSR with adapter
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

**Error message:** `Integration '${name}' ${issue}`

**Tip:** `${specificFix}`

**Severity:** error

---

### 14. `astro/output-mode-consistency`

**What it catches:** Code patterns that don't match output mode

**Why:** Static (default) and server modes have different capabilities

**Detection:**
- `Astro.request`, `Astro.cookies`, `Astro.redirect()` in static mode
- Server endpoints (`.ts` in pages) without server/hybrid output
- `getStaticPaths` in server-rendered pages

```astro
// ❌ Bad - server APIs in static mode
// astro.config.mjs: output: 'static' (default)
---
const cookie = Astro.cookies.get('session');  // Only works in server mode!
const ip = Astro.request.headers.get('x-forwarded-for');
---

// ❌ Bad - redirect in static page
---
if (!user) {
  return Astro.redirect('/login');  // Only works in server mode!
}
---

// ❌ Bad - API endpoint in static mode
// src/pages/api/data.ts in static project
export async function POST({ request }) {
  // This won't work in static mode!
}

// ✅ Good - server mode for dynamic features
// astro.config.mjs: output: 'server'
---
const cookie = Astro.cookies.get('session');
if (!cookie) {
  return Astro.redirect('/login');
}
---

// ✅ Good - hybrid mode for selective SSR
// astro.config.mjs: output: 'hybrid'
// This page:
export const prerender = false;  // Server-render this page
---
const session = Astro.cookies.get('session');
---

// ✅ Good - static with client-side handling
---
// No server APIs used
---
<div id="app"></div>
<script>
  // Handle auth client-side
  const session = document.cookie;
</script>
```

**Error message:** `${feature} requires output: 'server' or 'hybrid' mode`

**Tip:** `Set output: 'server' in astro.config.mjs, or use prerender: false for hybrid`

**Severity:** error

---

### 15. `astro/no-top-level-await-side-effects`

**What it catches:** Top-level await with side effects in components

**Why:** Components may be rendered multiple times; side effects shouldn't repeat

**Detection:** `await` in frontmatter that performs writes, mutations, or non-idempotent operations

```astro
// ❌ Bad - side effect in component
---
await db.incrementViewCount(postId);  // Runs every render!
const post = await db.getPost(postId);
---

// ❌ Bad - sending notifications
---
await sendEmail(user, 'You viewed this page');  // Sends on every render!
---

// ❌ Bad - logging/analytics that shouldn't duplicate
---
await analytics.track('page_view', { page: Astro.url.pathname });
---

// ✅ Good - read-only operations
---
const post = await db.getPost(postId);
const user = await getUser(Astro.cookies.get('session'));
const data = await fetch('/api/data').then(r => r.json());
---

// ✅ Good - side effects in API routes
// src/pages/api/view.ts
export async function POST({ params }) {
  await db.incrementViewCount(params.id);
  return new Response('ok');
}

// ✅ Good - client-side tracking
---
const post = await db.getPost(postId);
---
<article>{post.content}</article>
<script>
  // Track on client, not server
  fetch('/api/view', { method: 'POST' });
</script>

// ✅ Good - idempotent caching
---
import { getOrCreate } from '../cache';
const data = await getOrCreate(cacheKey, () => fetchExpensiveData());
---
```

**Error message:** `Side effect '${operation}' in component frontmatter runs on every render`

**Tip:** `Move side effects to API routes or client-side scripts`

**Severity:** warning

---

## Detection Helpers

For Astro files, the linter needs:

1. **Parse `.astro` files** - Separate frontmatter (`---`) from template
2. **Track component imports** - Know if import is `.astro`, `.jsx`, `.svelte`, etc.
3. **Detect directives** - `client:load`, `set:html`, `define:vars`, `class:list`
4. **Cross-file analysis** - Slot usage, component usage
5. **Config file parsing** - `astro.config.mjs` for output mode, integrations

### AST Patterns

```typescript
// Detect frontmatter fence
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;

// Detect client directives
const CLIENT_DIRECTIVES = ['client:load', 'client:idle', 'client:visible', 'client:media', 'client:only'];

// Framework component extensions
const FRAMEWORK_EXTENSIONS = ['.jsx', '.tsx', '.vue', '.svelte'];

// Astro component extension
const ASTRO_EXTENSION = '.astro';
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `require-frontmatter-fence` | warning | Missing `---` delimiters |
| `no-script-in-template` | error | Logic in template section |
| `client-directive-on-astro-component` | error | client: on .astro |
| `require-client-directive` | warning | Framework component without client: |
| `no-dynamic-slot-name` | error | Dynamic slot names |
| `no-unused-defined-slot` | warning | Slots never filled |
| `define-vars-type` | error | Non-serializable define:vars |
| `no-unsanitized-html` | error | XSS via set:html |
| `prefer-class-list` | warning | Complex class strings |
| `no-unfiltered-props-spread` | warning | Spreading all props |
| `require-props-type` | warning | Missing Props interface |
| `no-async-in-template` | error | Async in template expressions |
| `integration-config` | error | Misconfigured integrations |
| `output-mode-consistency` | error | Wrong mode for features |
| `no-top-level-await-side-effects` | warning | Side effects in frontmatter |

**Total: 15 rules**
