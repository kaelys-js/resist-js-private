# SvelteKit Lint Rules

Comprehensive lint rules for SvelteKit routing, load functions, form actions, hooks, and runtime patterns.

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/sveltekit/`

File patterns: `+page.svelte`, `+page.ts`, `+page.server.ts`, `+layout.svelte`, `+layout.ts`, `+layout.server.ts`, `+server.ts`, `+error.svelte`, `hooks.server.ts`, `hooks.client.ts`, `params/*.ts`

---

## Already Covered

**By eslint-plugin-svelte (3 rules):**
- `no-export-load-in-svelte-module-in-kit-pages` - No load exports in .svelte module
- `no-navigation-without-resolve` - Navigation needs resolve()
- `valid-prop-names-in-kit-pages` - Only data/errors props in pages

**By svelte5-config.md (15 rules):**
- Adapter configuration
- Deprecated options
- CSP, prerender, env prefix config

---

## Rules to Implement

### 1. `sveltekit/load-return-type`

**What it catches:** Load functions without proper return type annotation

**Why:** TypeScript can't infer complex load return types; explicit types ensure data/errors props match

**Detection:** `load` function export in `+page.ts`, `+layout.ts`, `+page.server.ts`, `+layout.server.ts` without return type

```typescript
// ❌ Bad - no return type
// +page.ts
export const load = async ({ fetch }) => {
  const res = await fetch('/api/user');
  return { user: await res.json() };
};

// ❌ Bad - implicit any
export const load: PageLoad = async ({ fetch }) => {
  const data = await fetch('/api/user').then(r => r.json());
  return data;  // Returns unknown shape
};

// ✅ Good - explicit return type
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/user');
  const user: User = await res.json();
  return { user };
};

// ✅ Good - satisfies for inference + checking
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  return { user: locals.user };
}) satisfies PageServerLoad;
```

**Error message:** `Load function should have explicit return type via PageLoad/PageServerLoad`

**Tip:** `Import type from './$types' and annotate: export const load: PageLoad = ...`

**Severity:** warning

---

### 2. `sveltekit/no-throw-redirect-in-load`

**What it catches:** Using `throw redirect()` instead of returning it in load functions

**Why:** In SvelteKit 2+, `redirect()` returns a `Redirect` object - throwing is deprecated

**Detection:** `throw redirect(...)` or `throw error(...)` in load functions

```typescript
// ❌ Bad - throwing redirect (SvelteKit 1 pattern)
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');  // Deprecated!
  }
  return { user: locals.user };
};

// ❌ Bad - throwing error
export const load = async ({ params }) => {
  const post = await getPost(params.id);
  if (!post) {
    throw error(404, 'Not found');  // Deprecated!
  }
  return { post };
};

// ✅ Good - return redirect
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) {
    return redirect(303, '/login');
  }
  return { user: locals.user };
};

// ✅ Good - return error
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
  const post = await getPost(params.id);
  if (!post) {
    return error(404, 'Not found');
  }
  return { post };
};
```

**Error message:** `Use 'return redirect()' instead of 'throw redirect()' in SvelteKit 2+`

**Tip:** `Replace 'throw redirect(...)' with 'return redirect(...)'`

**Severity:** error

---

### 3. `sveltekit/no-fetch-in-server-load`

**What it catches:** Using `fetch` to call own API routes from server load functions

**Why:** Server load runs on server - call functions directly instead of HTTP roundtrip

**Detection:** `fetch('/api/...')` or `fetch(url)` where url starts with `/` in `+page.server.ts` or `+layout.server.ts`

```typescript
// ❌ Bad - HTTP call to own API from server
// +page.server.ts
export const load = async ({ fetch }) => {
  // Unnecessary network roundtrip!
  const res = await fetch('/api/users');
  return { users: await res.json() };
};

// ❌ Bad - constructing internal URL
export const load = async ({ fetch, url }) => {
  const apiUrl = `${url.origin}/api/data`;
  const res = await fetch(apiUrl);
  return { data: await res.json() };
};

// ✅ Good - call function directly
import { getUsers } from '$lib/server/db';

export const load = async () => {
  const users = await getUsers();
  return { users };
};

// ✅ Good - external API is fine
export const load = async ({ fetch }) => {
  const res = await fetch('https://api.external.com/data');
  return { external: await res.json() };
};

// ✅ Good - client load can use fetch
// +page.ts (not +page.server.ts)
export const load = async ({ fetch }) => {
  const res = await fetch('/api/users');
  return { users: await res.json() };
};
```

**Error message:** `Don't fetch own API routes from server load - call the function directly`

**Tip:** `Import and call the data function directly instead of fetch('/api/...')`

**Severity:** warning

---

### 4. `sveltekit/load-dependency-tracking`

**What it catches:** Load functions that access data without declaring dependencies

**Why:** SvelteKit invalidates load functions based on dependencies; missing deps cause stale data

**Detection:** Using `params`, `url.searchParams`, `cookies` without `depends()` for custom invalidation

```typescript
// ❌ Bad - external state without depends()
let cachedData: Data | null = null;

export const load = async () => {
  if (!cachedData) {
    cachedData = await fetchData();
  }
  return { data: cachedData };  // Won't re-run when it should!
};

// ❌ Bad - using parent() without understanding invalidation
export const load = async ({ parent }) => {
  const { user } = await parent();
  // If parent invalidates, this won't automatically
  return { profile: await getProfile(user.id) };
};

// ✅ Good - explicit dependency
export const load = async ({ depends }) => {
  depends('app:data');  // Custom invalidation key
  const data = await fetchData();
  return { data };
};

// ✅ Good - URL dependencies are automatic
export const load = async ({ url }) => {
  const page = url.searchParams.get('page') ?? '1';
  // Automatically re-runs when ?page changes
  return { items: await getItems(parseInt(page)) };
};

// ✅ Good - invalidate from actions
// In your action:
// return { success: true };
// In your page, data automatically reloads

// ✅ Good - manual invalidation
// import { invalidate } from '$app/navigation';
// invalidate('app:data');
```

**Error message:** `Load function uses external state without depends() - may return stale data`

**Tip:** `Add depends('app:your-key') and use invalidate('app:your-key') to refresh`

**Severity:** warning

---

### 5. `sveltekit/actions-return-validation`

**What it catches:** Form actions without proper return value validation

**Why:** Actions should return typed data for form feedback; untyped returns break form handling

**Detection:** Action functions returning raw objects without validation

```typescript
// ❌ Bad - unvalidated return
export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    await saveUser(data);
    return { success: true };  // No type safety
  }
};

// ❌ Bad - forgetting to return on validation error
export const actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const result = validate(data);
    if (!result.success) {
      // Missing return! Falls through
    }
    await create(result.data);
    return { success: true };
  }
};

// ❌ Bad - returning redirect incorrectly
export const actions = {
  login: async ({ request, cookies }) => {
    // ... auth logic
    throw redirect(303, '/dashboard');  // Should return
  }
};

// ✅ Good - typed action return with fail()
import { fail } from '@sveltejs/kit';
import * as v from 'valibot';

const CreateSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});

export const actions = {
  create: async ({ request }) => {
    const formData = await request.formData();
    const result = v.safeParse(CreateSchema, Object.fromEntries(formData));

    if (!result.success) {
      return fail(400, {
        errors: v.flatten(result.issues),
        values: Object.fromEntries(formData)
      });
    }

    await createUser(result.output);
    return { success: true as const };
  }
};

// ✅ Good - redirect from action
export const actions = {
  login: async ({ request, cookies }) => {
    // ... auth logic
    return redirect(303, '/dashboard');
  }
};
```

**Error message:** `Action should use fail() for errors and return typed success data`

**Tip:** `Use fail(400, { errors }) for validation errors, return { success: true } for success`

**Severity:** warning

---

### 6. `sveltekit/no-secrets-in-client-load`

**What it catches:** Accessing sensitive data in universal (+page.ts) load functions

**Why:** Universal load runs on client - secrets would be exposed in browser

**Detection:** Accessing `env.SECRET_*`, database connections, or private APIs in `+page.ts` or `+layout.ts`

```typescript
// ❌ Bad - secret in universal load (+page.ts)
import { SECRET_API_KEY } from '$env/static/private';  // Won't work!

export const load = async ({ fetch }) => {
  const res = await fetch('/api/data', {
    headers: { 'X-API-Key': SECRET_API_KEY }
  });
  return { data: await res.json() };
};

// ❌ Bad - database in universal load
import { db } from '$lib/server/db';  // Server-only!

export const load = async () => {
  return { users: await db.query('SELECT * FROM users') };
};

// ❌ Bad - private env in universal load
import { env } from '$env/dynamic/private';

export const load = async () => {
  return { key: env.DATABASE_URL };  // Exposed to client!
};

// ✅ Good - use server load for secrets (+page.server.ts)
import { SECRET_API_KEY } from '$env/static/private';

export const load = async ({ fetch }) => {
  const res = await fetch('https://api.example.com/data', {
    headers: { 'Authorization': `Bearer ${SECRET_API_KEY}` }
  });
  return { data: await res.json() };
};

// ✅ Good - public env in universal load
import { PUBLIC_API_URL } from '$env/static/public';

export const load = async ({ fetch }) => {
  const res = await fetch(`${PUBLIC_API_URL}/public-data`);
  return { data: await res.json() };
};
```

**Error message:** `Cannot access '$env/static/private' in universal load - use +page.server.ts`

**Tip:** `Move to +page.server.ts for server-only data, or use PUBLIC_ env vars`

**Severity:** error

---

### 7. `sveltekit/hooks-handle-chain`

**What it catches:** Hooks that don't properly chain or return responses

**Why:** `handle` hooks must call `resolve()` or return a Response; forgetting breaks the chain

**Detection:** `handle` function in `hooks.server.ts` without `resolve(event)` call or Response return

```typescript
// ❌ Bad - forgetting to resolve
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
  console.log(event.url.pathname);
  // Missing resolve! Request hangs
};

// ❌ Bad - conditional resolve without fallback
export const handle = async ({ event, resolve }) => {
  if (event.url.pathname === '/health') {
    return new Response('OK');
  }
  // Other paths don't resolve!
};

// ❌ Bad - not awaiting resolve
export const handle = async ({ event, resolve }) => {
  const response = resolve(event);  // Missing await!
  return response;
};

// ✅ Good - proper handle hook
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  console.log(`${event.url.pathname} took ${Date.now() - start}ms`);
  return response;
};

// ✅ Good - early return with fallback
export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === '/health') {
    return new Response('OK');
  }
  return await resolve(event);
};

// ✅ Good - sequence multiple hooks
import { sequence } from '@sveltejs/kit/hooks';

const auth: Handle = async ({ event, resolve }) => {
  event.locals.user = await getUser(event.cookies);
  return resolve(event);
};

const logger: Handle = async ({ event, resolve }) => {
  console.log(event.url.pathname);
  return resolve(event);
};

export const handle = sequence(auth, logger);
```

**Error message:** `Handle hook must call resolve(event) or return a Response`

**Tip:** `Always end with 'return await resolve(event)' or 'return new Response(...)'`

**Severity:** error

---

### 8. `sveltekit/hooks-error-handling`

**What it catches:** Missing or improper `handleError` hook implementation

**Why:** Unhandled errors expose stack traces; `handleError` provides safe error responses

**Detection:** Missing `handleError` export in `hooks.server.ts`, or `handleError` that exposes sensitive info

```typescript
// ❌ Bad - no handleError (exposes stack traces in prod)
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
  return resolve(event);
};
// Missing handleError!

// ❌ Bad - exposing error details
export const handleError = ({ error }) => {
  return {
    message: error.message,  // May contain sensitive info
    stack: error.stack,      // Never expose stack traces!
  };
};

// ❌ Bad - not logging the error
export const handleError = () => {
  return { message: 'An error occurred' };
  // Error silently swallowed - no logging!
};

// ✅ Good - proper error handling
import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();

  // Log full error server-side
  console.error(`Error ${errorId}:`, {
    error,
    url: event.url.pathname,
    status,
  });

  // Return safe error to client
  return {
    message: status === 404 ? 'Not found' : 'An unexpected error occurred',
    errorId,  // For support reference
  };
};

// ✅ Good - with error reporting service
export const handleError: HandleServerError = async ({ error, event, status }) => {
  const errorId = crypto.randomUUID();

  // Report to error tracking
  await reportError({
    error,
    errorId,
    url: event.url.href,
    userAgent: event.request.headers.get('user-agent'),
  });

  return {
    message: 'Something went wrong',
    errorId,
  };
};
```

**Error message:** `Add handleError hook to prevent exposing error details in production`

**Tip:** `Export handleError that logs errors and returns safe messages`

**Severity:** warning

---

### 9. `sveltekit/no-top-level-await-in-hooks`

**What it catches:** Top-level await in hooks files that blocks server startup

**Why:** Top-level await in hooks delays all requests until complete; move to lazy init

**Detection:** `await` at module level in `hooks.server.ts` or `hooks.client.ts`

```typescript
// ❌ Bad - top-level await blocks startup
// hooks.server.ts
const config = await loadConfig();  // Blocks ALL requests!
const db = await connectDatabase();

export const handle = async ({ event, resolve }) => {
  event.locals.db = db;
  return resolve(event);
};

// ❌ Bad - top-level fetch
const features = await fetch('https://api.example.com/features').then(r => r.json());

export const handle = async ({ event, resolve }) => {
  event.locals.features = features;
  return resolve(event);
};

// ✅ Good - lazy initialization
let db: Database | null = null;

async function getDb() {
  if (!db) {
    db = await connectDatabase();
  }
  return db;
}

export const handle = async ({ event, resolve }) => {
  event.locals.db = await getDb();
  return resolve(event);
};

// ✅ Good - initialize in handle
export const handle = async ({ event, resolve }) => {
  // Initialize per-request (or cache in closure)
  const config = await loadConfig();
  event.locals.config = config;
  return resolve(event);
};

// ✅ Good - use platform env instead of async config
export const handle = async ({ event, resolve }) => {
  // Cloudflare bindings available synchronously
  const db = event.platform?.env?.DB;
  event.locals.db = db;
  return resolve(event);
};
```

**Error message:** `Top-level await in hooks blocks server startup - use lazy initialization`

**Tip:** `Move async initialization inside handle() or use lazy getter pattern`

**Severity:** error

---

### 10. `sveltekit/server-only-imports`

**What it catches:** Importing server-only modules in client-accessible code

**Why:** Server modules (db, secrets) can't run in browser; causes runtime errors

**Detection:** Import from `$lib/server/*` or `$env/static/private` in `+page.svelte`, `+layout.svelte`, or `+page.ts`

```typescript
// ❌ Bad - server import in page component
// +page.svelte
<script>
  import { db } from '$lib/server/db';  // Server-only!
  import { SECRET_KEY } from '$env/static/private';  // Server-only!
</script>

// ❌ Bad - server import in universal load
// +page.ts
import { prisma } from '$lib/server/prisma';

export const load = async () => {
  return { users: await prisma.user.findMany() };
};

// ❌ Bad - importing from hooks in component
// +page.svelte
<script>
  import { auth } from '../hooks.server';  // Can't import hooks!
</script>

// ✅ Good - server imports in server files only
// +page.server.ts
import { db } from '$lib/server/db';
import { SECRET_KEY } from '$env/static/private';

export const load = async () => {
  return { users: await db.query('SELECT * FROM users') };
};

// ✅ Good - public imports anywhere
// +page.svelte
<script>
  import { PUBLIC_API_URL } from '$env/static/public';
  import { formatDate } from '$lib/utils';  // Not in $lib/server
</script>

// ✅ Good - receive server data via props
// +page.svelte
<script>
  let { data } = $props();
  // data.users comes from +page.server.ts load
</script>
```

**Error message:** `Cannot import '$lib/server/*' in client-accessible file`

**Tip:** `Move to +page.server.ts or +layout.server.ts for server-only code`

**Severity:** error

---

### 11. `sveltekit/route-file-naming`

**What it catches:** Incorrect SvelteKit route file naming conventions

**Why:** SvelteKit uses specific file names for routing; typos cause routes to not work

**Detection:** Files in `routes/` with almost-correct names

```
# ❌ Bad - incorrect file names
routes/
├── page.svelte          # Missing + prefix!
├── +Page.svelte         # Wrong case
├── +page.ts             # Should be +page.server.ts for server data
├── +layout.js           # Should be .ts in TypeScript project
├── +error.ts            # Should be +error.svelte
├── server.ts            # Missing + prefix
├── +api.ts              # Should be +server.ts
├── hooks.ts             # Should be in src/, not routes/
├── +page.svelte.ts      # Wrong extension combo
└── [slug]/
    └── +params.ts       # Should be in src/params/

# ✅ Good - correct file names
routes/
├── +page.svelte         # Page component
├── +page.ts             # Universal load (runs on client too)
├── +page.server.ts      # Server-only load
├── +layout.svelte       # Layout component
├── +layout.ts           # Layout universal load
├── +layout.server.ts    # Layout server load
├── +error.svelte        # Error page
├── +server.ts           # API endpoint
├── api/
│   └── users/
│       └── +server.ts   # API: /api/users
└── [slug]/
    ├── +page.svelte
    └── +page.server.ts

# ✅ Good - params in correct location
src/
├── params/
│   └── slug.ts          # Param matcher
└── routes/
    └── blog/[slug=slug]/
        └── +page.svelte
```

**Error message:** `Invalid route file name '${name}' - did you mean '${suggestion}'?`

**Tip:** `SvelteKit route files must start with + and use correct extensions`

**Severity:** error

---

### 12. `sveltekit/no-data-prop-mutation`

**What it catches:** Mutating the `data` prop in page/layout components

**Why:** `data` prop is reactive snapshot from load; mutations don't persist and cause bugs

**Detection:** Assignment to `data.property` or methods like `data.items.push()`

```svelte
<!-- ❌ Bad - mutating data prop -->
<script>
  let { data } = $props();

  function addItem() {
    data.items.push({ id: 1 });  // Mutation doesn't persist!
  }

  function updateUser() {
    data.user.name = 'New Name';  // Lost on navigation
  }
</script>

<!-- ❌ Bad - reassigning data properties -->
<script>
  let { data } = $props();

  $effect(() => {
    data.count = data.items.length;  // Don't mutate!
  });
</script>

<!-- ✅ Good - derive local state -->
<script>
  let { data } = $props();

  // Create local copy for mutations
  let items = $state([...data.items]);

  function addItem() {
    items.push({ id: crypto.randomUUID() });
  }
</script>

<!-- ✅ Good - use $derived for computed values -->
<script>
  let { data } = $props();

  let count = $derived(data.items.length);
  let sorted = $derived([...data.items].sort((a, b) => a.name.localeCompare(b.name)));
</script>

<!-- ✅ Good - use form actions for persistent changes -->
<script>
  let { data } = $props();
</script>

<form method="POST" action="?/addItem">
  <button>Add Item</button>
</form>
```

**Error message:** `Don't mutate data prop - create local state with $state([...data.items])`

**Tip:** `Use $state() for local mutations or form actions for persistent changes`

**Severity:** error

---

### 13. `sveltekit/await-parent-in-load`

**What it catches:** Missing `await` when calling `parent()` in load functions

**Why:** `parent()` returns a Promise; forgetting await causes data to be a Promise object

**Detection:** `parent()` call without `await` or `.then()` in load functions

```typescript
// ❌ Bad - forgetting await
export const load = async ({ parent }) => {
  const parentData = parent();  // Returns Promise, not data!
  return {
    user: parentData.user,  // undefined - parentData is a Promise
  };
};

// ❌ Bad - destructuring without await
export const load = async ({ parent }) => {
  const { user } = parent();  // TypeError: Cannot destructure Promise
  return { profile: await getProfile(user.id) };
};

// ❌ Bad - using in expression without await
export const load = async ({ parent }) => {
  return {
    isAdmin: parent().user?.role === 'admin',  // Always false
  };
};

// ✅ Good - await parent()
export const load = async ({ parent }) => {
  const { user } = await parent();
  return {
    profile: await getProfile(user.id),
  };
};

// ✅ Good - await in expression
export const load = async ({ parent }) => {
  const parentData = await parent();
  return {
    isAdmin: parentData.user?.role === 'admin',
  };
};

// ✅ Good - parallel with Promise.all
export const load = async ({ parent, fetch }) => {
  const [parentData, response] = await Promise.all([
    parent(),
    fetch('/api/extra'),
  ]);

  return {
    user: parentData.user,
    extra: await response.json(),
  };
};
```

**Error message:** `parent() returns a Promise - missing await`

**Tip:** `Use 'const { user } = await parent()' to get parent load data`

**Severity:** error

---

### 14. `sveltekit/form-action-method`

**What it catches:** Forms targeting actions without POST method

**Why:** SvelteKit form actions only respond to POST; GET forms won't trigger actions

**Detection:** `<form action="?/actionName">` without `method="POST"`

```svelte
<!-- ❌ Bad - missing method (defaults to GET) -->
<form action="?/create">
  <input name="title" />
  <button>Create</button>  <!-- Won't trigger action! -->
</form>

<!-- ❌ Bad - explicit GET with action -->
<form action="?/delete" method="GET">
  <button>Delete</button>  <!-- GET doesn't trigger actions -->
</form>

<!-- ❌ Bad - wrong method casing -->
<form action="?/update" method="post">  <!-- Should work but be explicit -->
  <button>Update</button>
</form>

<!-- ✅ Good - explicit POST -->
<form action="?/create" method="POST">
  <input name="title" />
  <button>Create</button>
</form>

<!-- ✅ Good - default action -->
<form method="POST">
  <input name="email" />
  <button>Subscribe</button>
</form>

<!-- ✅ Good - enhanced form -->
<script>
  import { enhance } from '$app/forms';
</script>

<form action="?/create" method="POST" use:enhance>
  <input name="title" />
  <button>Create</button>
</form>

<!-- ✅ Good - GET form for search (no action) -->
<form action="/search" method="GET">
  <input name="q" />
  <button>Search</button>
</form>
```

**Error message:** `Form with action="?/..." requires method="POST"`

**Tip:** `Add method="POST" to forms that target SvelteKit actions`

**Severity:** error

---

### 15. `sveltekit/enhance-callback-return`

**What it catches:** Form `enhance` callbacks that don't return properly

**Why:** `enhance` callbacks must return `update` function call or custom handler

**Detection:** `use:enhance` with callback that doesn't return or forgets `update()`

```svelte
<!-- ❌ Bad - callback without return -->
<script>
  import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance={() => {
  console.log('submitting');
  // Missing return! Form won't update properly
}}>

<!-- ❌ Bad - forgetting to call update -->
<form method="POST" use:enhance={() => {
  return async ({ result, update }) => {
    console.log(result);
    // Forgot to call update()!
  };
}}>

<!-- ❌ Bad - returning wrong thing -->
<form method="POST" use:enhance={() => {
  return { invalidateAll: true };  // Wrong format!
}}>

<!-- ✅ Good - return update call -->
<form method="POST" use:enhance={() => {
  return async ({ result, update }) => {
    if (result.type === 'success') {
      toast.success('Saved!');
    }
    await update();  // Apply form result
  };
}}>

<!-- ✅ Good - return update with options -->
<form method="POST" use:enhance={() => {
  return async ({ update }) => {
    await update({ reset: false });  // Don't reset form
  };
}}>

<!-- ✅ Good - custom handling without update -->
<form method="POST" use:enhance={() => {
  return async ({ result }) => {
    if (result.type === 'redirect') {
      goto(result.location);
    } else if (result.type === 'success') {
      // Handle success without page update
      modalOpen = false;
    }
    // Intentionally not calling update() for custom flow
  };
}}>

<!-- ✅ Good - simple enhance (no callback needed) -->
<form method="POST" use:enhance>
  <button>Submit</button>
</form>
```

**Error message:** `enhance callback must return async function that calls update() or handles result`

**Tip:** `Return async ({ update }) => { await update(); } from enhance callback`

**Severity:** warning

---

### 16. `sveltekit/prerender-dynamic-route`

**What it catches:** Prerender enabled on routes with dynamic data

**Why:** Prerendered pages are static; dynamic data (user-specific) won't work

**Detection:** `export const prerender = true` in routes that use `cookies`, `locals.user`, or session data

```typescript
// ❌ Bad - prerender with user data
// +page.server.ts
export const prerender = true;

export const load = async ({ locals }) => {
  return { user: locals.user };  // User-specific data!
};

// ❌ Bad - prerender with cookies
export const prerender = true;

export const load = async ({ cookies }) => {
  const session = cookies.get('session');
  return { theme: session?.theme };  // Cookie-dependent!
};

// ❌ Bad - prerender with request headers
export const prerender = true;

export const load = async ({ request }) => {
  const lang = request.headers.get('accept-language');
  return { language: lang };  // Request-dependent!
};

// ✅ Good - prerender static content
// +page.server.ts
export const prerender = true;

export const load = async () => {
  const posts = await getBlogPosts();  // Same for all users
  return { posts };
};

// ✅ Good - prerender with entries
export const prerender = true;

export const entries = () => {
  return [
    { slug: 'about' },
    { slug: 'contact' },
    { slug: 'pricing' },
  ];
};

export const load = async ({ params }) => {
  return { page: await getPage(params.slug) };
};

// ✅ Good - no prerender for dynamic routes
export const prerender = false;

export const load = async ({ locals }) => {
  return { user: locals.user };
};

// ✅ Good - SSR without prerender (default)
export const load = async ({ locals }) => {
  return { user: locals.user };
};
```

**Error message:** `Cannot prerender route that uses ${feature} - data varies per request`

**Tip:** `Remove 'export const prerender = true' or move dynamic data to client`

**Severity:** error

---

### 17. `sveltekit/csr-ssr-consistency`

**What it catches:** Inconsistent CSR/SSR configuration that causes hydration issues

**Why:** Disabling SSR but keeping CSR causes hydration mismatches; must be intentional

**Detection:** `ssr = false` without `csr = true`, or conflicting page options

```typescript
// ❌ Bad - SSR off but CSR default (unclear intent)
// +page.ts
export const ssr = false;
// csr is true by default - but is this intentional?

// ❌ Bad - both disabled (blank page!)
export const ssr = false;
export const csr = false;  // Page won't render at all!

// ❌ Bad - prerender with CSR off
export const prerender = true;
export const csr = false;  // Static page with no JS, ok but unusual

// ❌ Bad - conflicting layout and page options
// +layout.ts
export const ssr = true;

// +page.ts (child)
export const ssr = false;  // Conflicts with layout!

// ✅ Good - explicit SPA mode
export const ssr = false;
export const csr = true;  // Explicit: client-side only

// ✅ Good - static page (no JS)
export const prerender = true;
export const csr = false;  // Intentional: static HTML only

// ✅ Good - default SSR + CSR
// No exports needed - both true by default

// ✅ Good - API route (no rendering)
// +server.ts - ssr/csr don't apply

// ✅ Good - comments explain unusual config
// SPA mode for dashboard - needs client-side auth
export const ssr = false;
export const csr = true;
```

**Error message:** `ssr=false without explicit csr=true - add csr=true for SPA mode`

**Tip:** `Explicitly set both: export const ssr = false; export const csr = true;`

**Severity:** warning

---

### 18. `sveltekit/api-route-response`

**What it catches:** API routes (+server.ts) without proper Response returns

**Why:** All +server.ts handlers must return Response; forgetting causes runtime errors

**Detection:** Handler in +server.ts that doesn't return Response or json()

```typescript
// ❌ Bad - no return
// +server.ts
export const GET = async () => {
  const data = await getData();
  // Missing return!
};

// ❌ Bad - returning raw object
export const GET = async () => {
  return { users: [] };  // Must be Response!
};

// ❌ Bad - returning undefined conditionally
export const POST = async ({ request }) => {
  const body = await request.json();
  if (!body.name) {
    return new Response('Name required', { status: 400 });
  }
  await save(body);
  // Missing return for success case!
};

// ❌ Bad - throwing instead of returning error
export const DELETE = async ({ params }) => {
  const item = await getItem(params.id);
  if (!item) {
    throw new Error('Not found');  // Should return Response
  }
  await deleteItem(params.id);
  return new Response(null, { status: 204 });
};

// ✅ Good - return json()
import { json } from '@sveltejs/kit';

export const GET = async () => {
  const users = await getUsers();
  return json(users);
};

// ✅ Good - return Response
export const POST = async ({ request }) => {
  const body = await request.json();

  if (!body.name) {
    return json({ error: 'Name required' }, { status: 400 });
  }

  const user = await createUser(body);
  return json(user, { status: 201 });
};

// ✅ Good - all paths return
export const DELETE = async ({ params }) => {
  const item = await getItem(params.id);

  if (!item) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  await deleteItem(params.id);
  return new Response(null, { status: 204 });
};

// ✅ Good - error helper
import { error, json } from '@sveltejs/kit';

export const GET = async ({ params }) => {
  const item = await getItem(params.id);

  if (!item) {
    return error(404, 'Not found');
  }

  return json(item);
};
```

**Error message:** `API handler must return Response - use json() or new Response()`

**Tip:** `Return json(data) for JSON or new Response(body, { status }) for other formats`

**Severity:** error

---

### 19. `sveltekit/param-matcher-export`

**What it catches:** Param matchers without proper `match` export

**Why:** SvelteKit expects `match` function export from param matchers

**Detection:** Files in `src/params/` without `export const match` or wrong signature

```typescript
// ❌ Bad - wrong export name
// src/params/slug.ts
export const validate = (param: string) => {  // Wrong name!
  return /^[a-z0-9-]+$/.test(param);
};

// ❌ Bad - default export
export default (param: string) => {
  return /^[a-z0-9-]+$/.test(param);
};

// ❌ Bad - wrong return type
export const match = (param: string) => {
  return param;  // Should return boolean!
};

// ❌ Bad - async matcher (not supported)
export const match = async (param: string) => {
  const valid = await checkDatabase(param);
  return valid;
};

// ❌ Bad - missing type annotation
export const match = (param) => {  // param is any
  return /^\d+$/.test(param);
};

// ✅ Good - correct matcher
// src/params/slug.ts
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
  return /^[a-z0-9-]+$/.test(param);
};

// ✅ Good - integer matcher
export const match: ParamMatcher = (param) => {
  return /^\d+$/.test(param);
};

// ✅ Good - uuid matcher
export const match: ParamMatcher = (param) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(param);
};

// ✅ Good - enum matcher
const validTypes = ['post', 'page', 'product'] as const;

export const match: ParamMatcher = (param) => {
  return validTypes.includes(param as typeof validTypes[number]);
};
```

**Error message:** `Param matcher must export 'match' function with ParamMatcher type`

**Tip:** `Use: export const match: ParamMatcher = (param) => boolean`

**Severity:** error

---

### 20. `sveltekit/locals-type-safety`

**What it catches:** Using `locals` without proper type definition

**Why:** Untyped `locals` is `any`; type definition ensures safety across hooks/routes

**Detection:** Access to `event.locals` or `locals` without `App.Locals` interface defined

```typescript
// ❌ Bad - no App.Locals defined, locals is any
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
  event.locals.user = await getUser();  // user is any
  event.locals.anythingGoes = true;     // No type checking!
  return resolve(event);
};

// ❌ Bad - accessing undefined locals property
// +page.server.ts
export const load = async ({ locals }) => {
  return { user: locals.usr };  // Typo not caught!
};

// ❌ Bad - wrong type usage
export const load = async ({ locals }) => {
  const name = locals.user.name.toUpperCase();  // user might be null!
  return { name };
};

// ✅ Good - define App.Locals in app.d.ts
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      user: User | null;
      sessionId: string;
    }
    interface Error {
      message: string;
      errorId: string;
    }
    interface PageData {
      // Shared page data types
    }
    interface Platform {
      env?: {
        DB: D1Database;
        KV: KVNamespace;
      };
    }
  }
}

export {};

// ✅ Good - typed locals usage
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
  event.locals.user = await getUser(event.cookies);
  event.locals.sessionId = crypto.randomUUID();
  return resolve(event);
};

// ✅ Good - null-safe access
// +page.server.ts
export const load = async ({ locals }) => {
  if (!locals.user) {
    return redirect(303, '/login');
  }
  return { user: locals.user };  // TypeScript knows user is User
};
```

**Error message:** `Define App.Locals interface in src/app.d.ts for type-safe locals`

**Tip:** `Create src/app.d.ts with App.Locals interface declaration`

**Severity:** warning

---

### 21. `sveltekit/no-document-access-in-load`

**What it catches:** Accessing `document`, `window`, or browser APIs in load functions

**Why:** Load functions run on server during SSR; browser APIs don't exist

**Detection:** `document.`, `window.`, `localStorage.`, `sessionStorage.` in load functions

```typescript
// ❌ Bad - document in load
// +page.ts
export const load = async () => {
  const theme = document.documentElement.dataset.theme;  // Error on server!
  return { theme };
};

// ❌ Bad - window in load
export const load = async () => {
  const width = window.innerWidth;  // window is not defined
  return { isMobile: width < 768 };
};

// ❌ Bad - localStorage in load
export const load = async () => {
  const token = localStorage.getItem('token');  // Not on server!
  return { isLoggedIn: !!token };
};

// ❌ Bad - checking browser before access (still runs on server)
export const load = async () => {
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth };
  }
  return { width: 0 };  // SSR always returns 0 - hydration mismatch!
};

// ✅ Good - use cookies instead of localStorage
// +page.server.ts
export const load = async ({ cookies }) => {
  const theme = cookies.get('theme') ?? 'light';
  return { theme };
};

// ✅ Good - browser APIs in component
// +page.svelte
<script>
  import { browser } from '$app/environment';

  let width = $state(0);

  $effect(() => {
    if (browser) {
      width = window.innerWidth;
    }
  });
</script>

// ✅ Good - pass from client via form/action
// +page.svelte
<script>
  import { browser } from '$app/environment';
</script>

{#if browser}
  <form method="POST" action="?/setTimezone">
    <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
    <button>Save Timezone</button>
  </form>
{/if}
```

**Error message:** `Cannot access '${api}' in load function - runs on server during SSR`

**Tip:** `Use cookies for persistence or $app/environment browser check in components`

**Severity:** error

---

### 22. `sveltekit/goto-await`

**What it catches:** Calling `goto()` without `await` in async contexts

**Why:** `goto()` returns a Promise; without await, code continues executing

**Detection:** `goto()` call without `await` in async function

```typescript
// ❌ Bad - goto without await
async function handleLogin() {
  await login(credentials);
  goto('/dashboard');  // Doesn't wait!
  cleanup();           // Runs before navigation completes
}

// ❌ Bad - in event handler
async function onSubmit() {
  const result = await saveData();
  if (result.success) {
    goto('/success');
    showToast('Saved!');  // Toast shows then immediately navigates
  }
}

// ❌ Bad - conditional goto
async function checkAuth() {
  const user = await getUser();
  if (!user) {
    goto('/login');
    return;  // Might continue before navigation
  }
  // Code here might run before redirect!
  loadUserData();
}

// ✅ Good - await goto
import { goto } from '$app/navigation';

async function handleLogin() {
  await login(credentials);
  await goto('/dashboard');
}

// ✅ Good - return await goto
async function onSubmit() {
  const result = await saveData();
  if (result.success) {
    return await goto('/success');
  }
}

// ✅ Good - await with early return
async function checkAuth() {
  const user = await getUser();
  if (!user) {
    return await goto('/login');
  }
  loadUserData();
}

// ✅ Good - in non-async context (returns Promise)
function handleClick() {
  goto('/page');  // OK - caller doesn't need to wait
}
```

**Error message:** `await goto() to ensure navigation completes before continuing`

**Tip:** `Use 'await goto()' or 'return goto()' in async functions`

**Severity:** warning

---

### 23. `sveltekit/invalidate-url-type`

**What it catches:** Calling `invalidate()` with wrong argument type

**Why:** `invalidate()` accepts URL string, URL object, or custom predicate; wrong types fail silently

**Detection:** `invalidate()` called with non-string, non-URL, non-function argument

```typescript
// ❌ Bad - passing object instead of URL
import { invalidate } from '$app/navigation';

invalidate({ url: '/api/data' });  // Wrong type!

// ❌ Bad - passing array
invalidate(['/api/users', '/api/posts']);  // Use invalidateAll or multiple calls

// ❌ Bad - passing route not URL
invalidate('/users');  // Should be full URL or depends key

// ❌ Bad - undefined argument
const url = getUrl();
invalidate(url);  // url might be undefined!

// ✅ Good - URL string
invalidate('/api/users');  // Invalidates fetch('/api/users') calls

// ✅ Good - depends key
invalidate('app:user');  // Matches depends('app:user')

// ✅ Good - URL object
invalidate(new URL('/api/data', window.location.origin));

// ✅ Good - predicate function
invalidate((url) => url.pathname.startsWith('/api/'));

// ✅ Good - multiple invalidations
await Promise.all([
  invalidate('/api/users'),
  invalidate('/api/posts'),
]);

// ✅ Good - invalidateAll for everything
import { invalidateAll } from '$app/navigation';
await invalidateAll();

// ✅ Good - with depends()
// In load:
export const load = async ({ depends }) => {
  depends('app:posts');
  return { posts: await getPosts() };
};

// In component:
invalidate('app:posts');
```

**Error message:** `invalidate() expects string URL, URL object, or predicate function`

**Tip:** `Use invalidate('/api/path') or invalidate('custom:key')`

**Severity:** error

---

### 24. `sveltekit/page-store-subscription`

**What it catches:** Using `$page` store without proper subscription in Svelte 5

**Why:** In Svelte 5, store auto-subscription syntax changed; must use `$page` correctly

**Detection:** Incorrect `page` store usage patterns

```svelte
<!-- ❌ Bad - importing page instead of $page -->
<script>
  import { page } from '$app/stores';

  // page is a store, not the value!
  const url = page.url;  // undefined - page is store object
</script>

<!-- ❌ Bad - destructuring store (Svelte 4 pattern) -->
<script>
  import { page } from '$app/stores';

  $: ({ url, params } = $page);  // Svelte 4 reactive statement
</script>

<!-- ❌ Bad - $page in $effect without $state -->
<script>
  import { page } from '$app/stores';

  $effect(() => {
    console.log($page.url);  // Works but better patterns exist
  });
</script>

<!-- ✅ Good - $page reactive access -->
<script>
  import { page } from '$app/stores';
</script>

<p>Current path: {$page.url.pathname}</p>
<p>Param: {$page.params.slug}</p>

<!-- ✅ Good - derived from $page -->
<script>
  import { page } from '$app/stores';

  let isAdmin = $derived($page.data.user?.role === 'admin');
  let currentTab = $derived($page.url.searchParams.get('tab') ?? 'home');
</script>

<!-- ✅ Good - $effect with page store -->
<script>
  import { page } from '$app/stores';

  $effect(() => {
    // Track page changes
    analytics.track('pageview', { path: $page.url.pathname });
  });
</script>

<!-- ✅ Good - page in load function (not store) -->
// +page.ts
export const load = async ({ url, params }) => {
  // url and params available directly, no store needed
  return { slug: params.slug };
};
```

**Error message:** `Use $page to access store value, not page directly`

**Tip:** `Access with $page.url, $page.params, $page.data in templates`

**Severity:** error

---

### 25. `sveltekit/platform-env-access`

**What it catches:** Incorrect access to platform-specific bindings (Cloudflare, Vercel, etc.)

**Why:** Platform bindings are on `event.platform`; wrong access causes undefined errors

**Detection:** Accessing `event.env` instead of `event.platform.env` or missing null checks

```typescript
// ❌ Bad - wrong property path
// +page.server.ts
export const load = async ({ platform }) => {
  const db = platform.DB;  // Wrong! Should be platform.env.DB
  return { data: await db.prepare('SELECT * FROM users').all() };
};

// ❌ Bad - no null check
export const load = async ({ platform }) => {
  // platform is undefined in dev without wrangler!
  const kv = platform.env.KV;
  return { value: await kv.get('key') };
};

// ❌ Bad - accessing in universal load
// +page.ts (not +page.server.ts)
export const load = async ({ platform }) => {
  // platform only available in server load!
  const db = platform?.env?.DB;
  return { users: await db?.prepare('...').all() };
};

// ✅ Good - correct access with null check
// +page.server.ts
export const load = async ({ platform }) => {
  const db = platform?.env?.DB;

  if (!db) {
    // Running locally without wrangler
    return { users: [] };
  }

  const { results } = await db.prepare('SELECT * FROM users').all();
  return { users: results };
};

// ✅ Good - typed platform in app.d.ts
// src/app.d.ts
declare global {
  namespace App {
    interface Platform {
      env?: {
        DB: D1Database;
        KV: KVNamespace;
        BUCKET: R2Bucket;
      };
      context?: ExecutionContext;
      caches?: CacheStorage;
    }
  }
}

// ✅ Good - in hooks
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
  if (event.platform?.env?.DB) {
    event.locals.db = event.platform.env.DB;
  }
  return resolve(event);
};

// ✅ Good - in API route
// +server.ts
export const GET = async ({ platform }) => {
  const kv = platform?.env?.KV;
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 503 });
  }
  const value = await kv.get('config');
  return json({ value });
};
```

**Error message:** `Access platform bindings via platform?.env?.BINDING with null check`

**Tip:** `Use platform?.env?.DB and handle undefined case for local dev`

**Severity:** error

---

### 26. `sveltekit/cookie-options`

**What it catches:** Setting cookies without proper security options

**Why:** Cookies without httpOnly, secure, sameSite are vulnerable to XSS and CSRF

**Detection:** `cookies.set()` without security options in `+page.server.ts`, `+server.ts`, or `hooks.server.ts`

```typescript
// ❌ Bad - no options
export const load = async ({ cookies }) => {
  cookies.set('session', token);  // Insecure defaults!
  return {};
};

// ❌ Bad - missing httpOnly
cookies.set('session', token, {
  path: '/',
  secure: true,
  // Missing httpOnly - vulnerable to XSS!
});

// ❌ Bad - missing secure in production
cookies.set('session', token, {
  path: '/',
  httpOnly: true,
  // Missing secure - sent over HTTP!
});

// ❌ Bad - sameSite none without secure
cookies.set('session', token, {
  path: '/',
  httpOnly: true,
  sameSite: 'none',  // Requires secure: true!
});

// ❌ Bad - overly long maxAge
cookies.set('session', token, {
  path: '/',
  httpOnly: true,
  secure: true,
  maxAge: 60 * 60 * 24 * 365 * 10,  // 10 years - too long for session!
});

// ✅ Good - secure session cookie
cookies.set('session', token, {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7,  // 7 days
});

// ✅ Good - strict for sensitive operations
cookies.set('csrf', csrfToken, {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 60 * 60,  // 1 hour
});

// ✅ Good - readable cookie (non-sensitive)
cookies.set('theme', 'dark', {
  path: '/',
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,  // 1 year OK for preferences
  // httpOnly: false - OK for theme, needs JS access
});

// ✅ Good - deleting cookie
cookies.delete('session', { path: '/' });
```

**Error message:** `cookies.set() should include httpOnly, secure, and sameSite options`

**Tip:** `Add { path: '/', httpOnly: true, secure: true, sameSite: 'lax' }`

**Severity:** warning

---

### 27. `sveltekit/no-throw-in-layout-load`

**What it catches:** Throwing errors in layout load that break all child pages

**Why:** Layout load errors affect all child routes; prefer graceful degradation

**Detection:** `throw error()` in `+layout.server.ts` or `+layout.ts` without specific handling

```typescript
// ❌ Bad - throwing in layout breaks all child pages
// +layout.server.ts
export const load = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');  // ALL pages broken!
  }
  return { user: locals.user };
};

// ❌ Bad - throwing on optional data
export const load = async ({ fetch }) => {
  const res = await fetch('/api/notifications');
  if (!res.ok) {
    throw error(res.status, 'Failed to load notifications');
    // Child pages can't load just because notifications failed!
  }
  return { notifications: await res.json() };
};

// ✅ Good - redirect instead of error for auth
export const load = async ({ locals, url }) => {
  if (!locals.user) {
    return redirect(303, `/login?redirect=${url.pathname}`);
  }
  return { user: locals.user };
};

// ✅ Good - graceful degradation
export const load = async ({ fetch }) => {
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) {
      return { notifications: [], notificationsError: true };
    }
    return { notifications: await res.json() };
  } catch {
    return { notifications: [], notificationsError: true };
  }
};

// ✅ Good - optional data pattern
export const load = async ({ fetch }) => {
  const [userRes, notifRes] = await Promise.allSettled([
    fetch('/api/user'),
    fetch('/api/notifications'),
  ]);

  return {
    user: userRes.status === 'fulfilled' ? await userRes.value.json() : null,
    notifications: notifRes.status === 'fulfilled' ? await notifRes.value.json() : [],
  };
};

// ✅ Good - throw only for critical layout data
export const load = async ({ locals }) => {
  // Config is critical - without it, layout can't render
  const config = await getRequiredConfig();
  if (!config) {
    throw error(500, 'Configuration not available');
  }
  return { config };
};
```

**Error message:** `Avoid throwing errors in layout load - affects all child routes`

**Tip:** `Use redirect() for auth or return error state for graceful degradation`

**Severity:** warning

---

### 28. `sveltekit/reroute-return`

**What it catches:** `reroute` hook without proper return value

**Why:** `reroute` must return string URL or void; wrong return breaks routing

**Detection:** `reroute` in `hooks.ts` returning non-string or not returning in all paths

```typescript
// ❌ Bad - returning object
// hooks.ts
export const reroute = ({ url }) => {
  if (url.pathname === '/old') {
    return { pathname: '/new' };  // Wrong! Must be string
  }
};

// ❌ Bad - returning undefined explicitly
export const reroute = ({ url }) => {
  if (url.pathname === '/old') {
    return '/new';
  }
  return undefined;  // Should just not return
};

// ❌ Bad - async reroute
export const reroute = async ({ url }) => {  // Can't be async!
  const newPath = await lookupRedirect(url.pathname);
  return newPath;
};

// ❌ Bad - returning URL object
export const reroute = ({ url }) => {
  if (url.pathname === '/old') {
    return new URL('/new', url.origin);  // Must be string!
  }
};

// ✅ Good - return string or nothing
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
  if (url.pathname === '/old-path') {
    return '/new-path';
  }
  // No return = use original URL
};

// ✅ Good - locale prefix handling
export const reroute: Reroute = ({ url }) => {
  const locales = ['en', 'es', 'fr'];
  const [, locale, ...rest] = url.pathname.split('/');

  if (locales.includes(locale)) {
    return `/${rest.join('/')}` || '/';
  }
};

// ✅ Good - vanity URLs
const vanityUrls: Record<string, string> = {
  '/pricing': '/products/pricing',
  '/about': '/company/about',
};

export const reroute: Reroute = ({ url }) => {
  return vanityUrls[url.pathname];  // undefined if not found = no reroute
};
```

**Error message:** `reroute hook must return string URL or undefined (implicitly via no return)`

**Tip:** `Return '/new-path' string or don't return to keep original URL`

**Severity:** error

---

### 29. `sveltekit/snapshot-serializable`

**What it catches:** Returning non-serializable data from `snapshot.capture()`

**Why:** Snapshot data is serialized to history state; non-serializable values are lost

**Detection:** Snapshot capture returning functions, DOM nodes, classes, or circular references

```svelte
<!-- ❌ Bad - returning function -->
<script>
  import type { Snapshot } from './$types';

  export const snapshot: Snapshot = {
    capture: () => ({
      onClick: () => console.log('click'),  // Functions can't serialize!
    }),
    restore: (value) => { /* ... */ },
  };
</script>

<!-- ❌ Bad - returning DOM element -->
<script>
  let inputRef: HTMLInputElement;

  export const snapshot: Snapshot = {
    capture: () => ({
      element: inputRef,  // DOM nodes can't serialize!
    }),
    restore: () => {},
  };
</script>

<!-- ❌ Bad - returning class instance -->
<script>
  class FormState {
    constructor(public values: Record<string, string>) {}
  }

  let state = new FormState({});

  export const snapshot: Snapshot = {
    capture: () => state,  // Class instances lose prototype!
    restore: (value) => { state = value; },
  };
</script>

<!-- ❌ Bad - circular reference -->
<script>
  const obj: any = { name: 'test' };
  obj.self = obj;  // Circular!

  export const snapshot: Snapshot = {
    capture: () => obj,  // Will fail
    restore: () => {},
  };
</script>

<!-- ✅ Good - plain serializable data -->
<script>
  import type { Snapshot } from './$types';

  let formData = $state({ name: '', email: '' });
  let scrollY = $state(0);

  export const snapshot: Snapshot<{ form: typeof formData; scroll: number }> = {
    capture: () => ({
      form: { ...formData },  // Plain object copy
      scroll: scrollY,
    }),
    restore: (value) => {
      formData = value.form;
      scrollY = value.scroll;
    },
  };
</script>

<!-- ✅ Good - serialize class to plain object -->
<script>
  class FormState {
    values: Record<string, string> = {};

    toJSON() {
      return { values: this.values };
    }

    static fromJSON(data: { values: Record<string, string> }) {
      const state = new FormState();
      state.values = data.values;
      return state;
    }
  }

  let state = new FormState();

  export const snapshot: Snapshot = {
    capture: () => state.toJSON(),
    restore: (value) => { state = FormState.fromJSON(value); },
  };
</script>
```

**Error message:** `snapshot.capture() must return JSON-serializable data`

**Tip:** `Return plain objects, arrays, strings, numbers, booleans, null only`

**Severity:** error

---

### 30. `sveltekit/event-getClientAddress`

**What it catches:** Using `event.getClientAddress()` without adapter support

**Why:** Not all adapters support `getClientAddress()`; may throw or return wrong value

**Detection:** `event.getClientAddress()` or `getClientAddress()` call without try-catch

```typescript
// ❌ Bad - no error handling
// +page.server.ts
export const load = async ({ getClientAddress }) => {
  const ip = getClientAddress();  // May throw!
  await logVisit(ip);
  return {};
};

// ❌ Bad - assuming format
export const load = async ({ getClientAddress }) => {
  const ip = getClientAddress();
  const [a, b, c, d] = ip.split('.');  // Might be IPv6!
  return { country: lookupCountry(ip) };
};

// ❌ Bad - in hooks without check
export const handle = async ({ event, resolve }) => {
  const ip = event.getClientAddress();  // May not be available
  event.locals.ip = ip;
  return resolve(event);
};

// ✅ Good - with try-catch
export const load = async ({ getClientAddress }) => {
  let ip: string | null = null;

  try {
    ip = getClientAddress();
  } catch {
    // Adapter doesn't support getClientAddress
    ip = null;
  }

  return { ip };
};

// ✅ Good - use request headers as fallback
export const load = async ({ getClientAddress, request }) => {
  let ip: string | null = null;

  try {
    ip = getClientAddress();
  } catch {
    // Fallback to header (common with proxies)
    ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  }

  return { ip };
};

// ✅ Good - Cloudflare-specific
export const load = async ({ request, platform }) => {
  // Cloudflare provides IP in CF-Connecting-IP header
  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? null;

  return { ip };
};
```

**Error message:** `getClientAddress() may throw - wrap in try-catch`

**Tip:** `Use try-catch and fallback to request headers for reliability`

**Severity:** warning

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `load-return-type` | warning | Missing load return type |
| `no-throw-redirect-in-load` | error | Deprecated throw redirect |
| `no-fetch-in-server-load` | warning | Unnecessary HTTP roundtrip |
| `load-dependency-tracking` | warning | Missing depends() for custom invalidation |
| `actions-return-validation` | warning | Untyped action returns |
| `no-secrets-in-client-load` | error | Private env in universal load |
| `hooks-handle-chain` | error | Missing resolve() in handle |
| `hooks-error-handling` | warning | Missing handleError hook |
| `no-top-level-await-in-hooks` | error | Blocking server startup |
| `server-only-imports` | error | Server imports in client code |
| `route-file-naming` | error | Wrong SvelteKit file names |
| `no-data-prop-mutation` | error | Mutating data prop |
| `await-parent-in-load` | error | Missing await on parent() |
| `form-action-method` | error | Form without POST method |
| `enhance-callback-return` | warning | enhance callback issues |
| `prerender-dynamic-route` | error | Prerender with dynamic data |
| `csr-ssr-consistency` | warning | Inconsistent CSR/SSR config |
| `api-route-response` | error | API without Response return |
| `param-matcher-export` | error | Wrong param matcher export |
| `locals-type-safety` | warning | Untyped locals access |
| `no-document-access-in-load` | error | Browser APIs in load |
| `goto-await` | warning | Missing await on goto() |
| `invalidate-url-type` | error | Wrong invalidate() argument |
| `page-store-subscription` | error | Wrong $page store usage |
| `platform-env-access` | error | Wrong platform binding access |
| `cookie-options` | warning | Insecure cookie settings |
| `no-throw-in-layout-load` | warning | Throwing in layout load |
| `reroute-return` | error | Wrong reroute hook return |
| `snapshot-serializable` | error | Non-serializable snapshot |
| `event-getClientAddress` | warning | Unsafe getClientAddress() |

**Total: 30 rules**
