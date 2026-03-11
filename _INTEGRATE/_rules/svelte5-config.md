# Svelte 5 Config Lint Rules

Implement the **Svelte 5 Configuration** lint rules (15 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/svelte5-config/`

File patterns: `svelte.config.js`, `svelte.config.ts`, `vite.config.ts`, `vite.config.js`

---

## Already Covered by Oxlint

Oxlint has **no Svelte-related rules** - it lacks any Svelte, SvelteKit, or Svelte config linting. All rules below are net-new.

---

## Rules to Implement

### 1. `svelte5-config/require-adapter`

**What it catches:** SvelteKit config without an adapter specified

**Why:** Without an adapter, `svelte-kit build` fails. Must explicitly choose target platform.

**Detection:** `svelte.config.js` export without `kit.adapter` property, or `kit.adapter` set to `undefined`

```javascript
// ❌ Bad - no adapter
export default {
  kit: {
    // Missing adapter!
  }
};

// ❌ Bad - undefined adapter
export default {
  kit: {
    adapter: undefined,
  }
};

// ❌ Bad - commented out
export default {
  kit: {
    // adapter: adapter(),
  }
};

// ✅ Good - Cloudflare adapter
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - Static adapter for Capacitor
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
  }
};
```

**Error message:** `SvelteKit config missing adapter - build will fail without one`

**Tip:** `Add adapter: import adapter from '@sveltejs/adapter-cloudflare'; then adapter: adapter()`

**Severity:** error

---

### 2. `svelte5-config/cloudflare-adapter-settings`

**What it catches:** Cloudflare adapter without recommended configuration

**Why:** Cloudflare adapter benefits from explicit routes config for optimal edge deployment

**Detection:** Import from `@sveltejs/adapter-cloudflare` but adapter called without `routes` option

```javascript
// ❌ Bad - missing routes config
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),  // No routes config
  }
};

// ❌ Bad - empty routes
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {},
    }),
  }
};

// ✅ Good - explicit routes configuration
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>'],  // Excludes static assets
      },
    }),
  }
};

// ✅ Good - workers routes for API
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
  kit: {
    adapter: adapter({
      config: 'wrangler.toml',
    }),
  }
};
```

**Error message:** `Cloudflare adapter should have explicit routes config for optimal deployment`

**Tip:** `Add routes: { include: ['/*'], exclude: ['<all>'] } to exclude static assets from Worker`

**Severity:** warning

---

### 3. `svelte5-config/static-adapter-for-capacitor`

**What it catches:** Non-static adapter in projects using Capacitor

**Why:** Capacitor requires static HTML output - server adapters won't work

**Detection:**
1. Check for `capacitor.config.ts` or `capacitor.config.json` in project
2. If found, ensure `svelte.config.js` uses `@sveltejs/adapter-static`

```javascript
// ❌ Bad - server adapter with Capacitor
// (when capacitor.config.ts exists in project)
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
  }
};

// ❌ Bad - auto adapter with Capacitor
import adapter from '@sveltejs/adapter-auto';

export default {
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - static adapter for Capacitor
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: 'index.html',  // Required for SPA routing
      strict: false,           // Allow dynamic routes
    }),
  }
};

// ✅ Good - static with prerendering
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: '200.html',
      pages: 'build',
      assets: 'build',
    }),
    prerender: {
      entries: ['*'],
    },
  }
};
```

**Error message:** `Capacitor project requires @sveltejs/adapter-static - current adapter '${adapterName}' won't work`

**Tip:** `Install and use: import adapter from '@sveltejs/adapter-static'; with fallback: 'index.html'`

**Severity:** error

---

### 4. `svelte5-config/no-node-adapter-cloudflare`

**What it catches:** Node.js adapter in Cloudflare-deployed projects

**Why:** Cloudflare Workers don't support Node.js - must use Cloudflare adapter

**Detection:**
1. Check for `wrangler.toml` or `wrangler.json` in project
2. If found, ensure not using `@sveltejs/adapter-node`

```javascript
// ❌ Bad - Node adapter with Cloudflare
// (when wrangler.toml exists in project)
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter(),
  }
};

// ❌ Bad - Node adapter with Cloudflare env detection
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      env: {
        host: 'CF_PAGES_URL',  // Cloudflare env var but wrong adapter!
      },
    }),
  }
};

// ✅ Good - Cloudflare adapter for Cloudflare deployment
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - Cloudflare Pages adapter
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
  kit: {
    adapter: adapter(),
  }
};
```

**Error message:** `Node.js adapter incompatible with Cloudflare Workers - use @sveltejs/adapter-cloudflare`

**Tip:** `Replace with: import adapter from '@sveltejs/adapter-cloudflare'`

**Severity:** error

---

### 5. `svelte5-config/kit-alias-consistency`

**What it catches:** SvelteKit aliases that don't match tsconfig paths

**Why:** Inconsistent aliases cause import resolution failures and TypeScript errors

**Detection:** Compare `kit.alias` in `svelte.config.js` with `compilerOptions.paths` in `tsconfig.json`

```javascript
// ❌ Bad - alias in svelte.config but not tsconfig
// svelte.config.js
export default {
  kit: {
    alias: {
      '$components': 'src/lib/components',
      '$utils': 'src/lib/utils',
    }
  }
};
// tsconfig.json missing these paths!

// ❌ Bad - mismatched paths
// svelte.config.js has: '$lib': 'src/lib'
// tsconfig.json has: "$lib/*": ["./src/library/*"]

// ✅ Good - matching aliases
// svelte.config.js
export default {
  kit: {
    alias: {
      '$components': 'src/lib/components',
      '$utils': 'src/lib/utils',
    }
  }
};

// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "$components/*": ["./src/lib/components/*"],
      "$utils/*": ["./src/lib/utils/*"],
      "$lib/*": ["./src/lib/*"]  // SvelteKit adds this automatically
    }
  }
}

// ✅ Good - rely on SvelteKit's automatic $lib alias
export default {
  kit: {
    // No custom aliases - $lib works automatically
  }
};
```

**Error message:** `Alias '${alias}' in svelte.config.js not found in tsconfig.json paths`

**Tip:** `Add to tsconfig.json paths: "${alias}/*": ["./${path}/*"]`

**Severity:** warning

---

### 6. `svelte5-config/require-runes-mode`

**What it catches:** Svelte 5 project without runes mode enabled

**Why:** Svelte 5 runes should be explicitly enabled for new projects; avoids legacy mode confusion

**Detection:** `svelte.config.js` without `compilerOptions.runes: true` or using legacy syntax

```javascript
// ❌ Bad - runes not explicitly enabled
export default {
  kit: {
    adapter: adapter(),
  }
};

// ❌ Bad - runes explicitly disabled
export default {
  compilerOptions: {
    runes: false,  // Why use Svelte 5 without runes?
  },
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - runes mode enabled
export default {
  compilerOptions: {
    runes: true,
  },
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - with other compiler options
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  compilerOptions: {
    runes: true,
    dev: process.env.NODE_ENV !== 'production',
  },
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  }
};
```

**Error message:** `Svelte 5 project should have compilerOptions.runes: true`

**Tip:** `Add compilerOptions: { runes: true } to enable Svelte 5 runes`

**Severity:** warning

---

### 7. `svelte5-config/no-deprecated-options`

**What it catches:** Deprecated Svelte 4 configuration options

**Why:** Svelte 5 removed or changed several config options

**Detection:** Presence of deprecated config properties

**Deprecated options:**
- `compilerOptions.css` (now handled differently)
- `compilerOptions.legacy` (removed in Svelte 5)
- `compilerOptions.hydratable` (always true now)
- `compilerOptions.immutable` (removed - use runes)
- `compilerOptions.accessors` (removed - use $props)
- `kit.browser.hydrate` (removed)
- `kit.browser.router` (use `kit.router` now)
- `kit.endpointExtensions` (removed)
- `kit.hydrate` (removed)
- `kit.package` (use svelte-package CLI)
- `kit.routes` (use route config in routes)
- `kit.vite` (use vite.config.js)

```javascript
// ❌ Bad - deprecated Svelte 4 options
export default {
  compilerOptions: {
    hydratable: true,    // Deprecated - always true in Svelte 5
    immutable: true,     // Deprecated - use $state for reactivity
    accessors: true,     // Deprecated - use $props
    legacy: true,        // Deprecated - no legacy mode
  },
  kit: {
    browser: {
      hydrate: true,     // Deprecated
      router: true,      // Use kit.router instead
    },
    vite: {              // Deprecated - use vite.config.js
      plugins: [],
    },
    package: {           // Deprecated - use svelte-package CLI
      dir: 'package',
    },
  }
};

// ✅ Good - Svelte 5 config
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  compilerOptions: {
    runes: true,
  },
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  }
};
```

**Error message:** `Deprecated config option '${option}' - ${reason}`

**Tip:** `Remove '${option}': ${migrationGuide}`

**Severity:** error

---

### 8. `svelte5-config/prerender-config`

**What it catches:** Missing or incorrect prerender configuration for static/hybrid apps

**Why:** Prerendering improves performance and is required for static hosting

**Detection:**
- Static adapter without `prerender` config
- Prerender entries missing for known static routes
- Conflicting prerender settings

```javascript
// ❌ Bad - static adapter without prerender config
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter(),
    // Missing prerender config!
  }
};

// ❌ Bad - prerender with handleHttpError not configured
export default {
  kit: {
    adapter: adapter(),
    prerender: {
      entries: ['*'],
      // Missing handleHttpError - 404s will fail build!
    },
  }
};

// ✅ Good - complete prerender config for static
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: '404.html',
    }),
    prerender: {
      entries: ['*'],
      handleHttpError: ({ path, referrer, message }) => {
        // Ignore 404s for dynamic routes
        if (path.startsWith('/api/')) {
          return;
        }
        throw new Error(message);
      },
      handleMissingId: 'warn',
    },
  }
};

// ✅ Good - hybrid with selective prerendering
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
    prerender: {
      entries: [
        '/',
        '/about',
        '/pricing',
        '/blog',
      ],
      crawl: true,
    },
  }
};
```

**Error message:** `Static adapter requires prerender configuration`

**Tip:** `Add prerender: { entries: ['*'], handleHttpError: 'warn' }`

**Severity:** warning

---

### 9. `svelte5-config/csp-headers`

**What it catches:** Missing Content Security Policy configuration

**Why:** CSP headers protect against XSS and other injection attacks

**Detection:** `svelte.config.js` without `kit.csp` when project appears production-ready

```javascript
// ❌ Bad - no CSP configuration
export default {
  kit: {
    adapter: adapter(),
  }
};

// ❌ Bad - CSP without script-src
export default {
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        'default-src': ['self'],
        // Missing script-src!
      },
    },
  }
};

// ✅ Good - basic CSP configuration
export default {
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],  // Svelte needs this
        'img-src': ['self', 'data:', 'https:'],
        'font-src': ['self'],
        'connect-src': ['self', 'https://api.example.com'],
      },
    },
  }
};

// ✅ Good - CSP with nonces for inline scripts
export default {
  kit: {
    adapter: adapter(),
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
      },
    },
  }
};

// ✅ Good - report-only mode for testing
export default {
  kit: {
    adapter: adapter(),
    csp: {
      mode: 'auto',
      reportOnly: {
        'default-src': ['self'],
        'script-src': ['self'],
        'report-uri': ['/api/csp-report'],
      },
    },
  }
};
```

**Error message:** `Consider adding CSP configuration for security`

**Tip:** `Add csp: { directives: { 'default-src': ['self'], 'script-src': ['self'] } }`

**Severity:** warning

---

### 10. `svelte5-config/env-prefix-consistency`

**What it catches:** Environment variable prefix configuration issues

**Why:** SvelteKit exposes `PUBLIC_` prefixed env vars to client - must be intentional

**Detection:**
- `kit.env.publicPrefix` set to empty string (exposes all vars!)
- Inconsistent with actual env var naming in project
- Private vars accidentally prefixed with PUBLIC_

```javascript
// ❌ Bad - empty public prefix exposes ALL env vars to client!
export default {
  kit: {
    adapter: adapter(),
    env: {
      publicPrefix: '',  // DANGEROUS - exposes everything!
    },
  }
};

// ❌ Bad - confusing custom prefix
export default {
  kit: {
    adapter: adapter(),
    env: {
      publicPrefix: 'NEXT_PUBLIC_',  // Wrong framework convention
    },
  }
};

// ❌ Bad - private prefix matches public
export default {
  kit: {
    adapter: adapter(),
    env: {
      publicPrefix: 'APP_',
      privatePrefix: 'APP_',  // Same prefix - confusing!
    },
  }
};

// ✅ Good - default prefix (PUBLIC_)
export default {
  kit: {
    adapter: adapter(),
    // Uses default PUBLIC_ prefix
  }
};

// ✅ Good - explicit custom prefix
export default {
  kit: {
    adapter: adapter(),
    env: {
      publicPrefix: 'PUBLIC_',
      privatePrefix: '',
      dir: '.',
    },
  }
};

// ✅ Good - Vite-style prefix if migrating from Vite
export default {
  kit: {
    adapter: adapter(),
    env: {
      publicPrefix: 'VITE_',
    },
  }
};
```

**Error message:** `Empty publicPrefix exposes all environment variables to the client`

**Tip:** `Use the default PUBLIC_ prefix or set a non-empty publicPrefix`

**Severity:** error

---

### 11. `svelte5-config/output-directory`

**What it catches:** Output directory conflicts with common conventions

**Why:** Output directory should not conflict with source or other tool outputs

**Detection:**
- `kit.outDir` set to `src/`, `lib/`, or source directories
- Output directory matches another tool's output (`.next/`, `dist/`, etc.)
- Static adapter `pages`/`assets` pointing to source directories

```javascript
// ❌ Bad - output to source directory
export default {
  kit: {
    adapter: adapter(),
    outDir: './src',  // Overwrites source!
  }
};

// ❌ Bad - conflict with other tools
export default {
  kit: {
    adapter: adapter({
      pages: 'dist',    // Might conflict with Vite's default
      assets: 'dist',
    }),
  }
};

// ❌ Bad - output to root
export default {
  kit: {
    adapter: adapter({
      pages: '.',
      assets: '.',
    }),
  }
};

// ✅ Good - explicit build directory
export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
    }),
    outDir: '.svelte-kit',
  }
};

// ✅ Good - Cloudflare convention
export default {
  kit: {
    adapter: adapter(),
    outDir: '.svelte-kit',
  }
};

// ✅ Good - Capacitor convention
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
    }),
  }
};
```

**Error message:** `Output directory '${dir}' conflicts with ${conflict}`

**Tip:** `Use 'build' or '.svelte-kit' for output directories`

**Severity:** error

---

### 12. `svelte5-config/version-skew-handling`

**What it catches:** Missing version configuration for production deployments

**Why:** Version config helps handle deployment updates gracefully

**Detection:**
- Production build without `kit.version` configuration
- Missing `version.pollInterval` for long-lived apps

```javascript
// ❌ Bad - no version handling
export default {
  kit: {
    adapter: adapter(),
  }
};

// ❌ Bad - version without poll interval (stale clients)
export default {
  kit: {
    adapter: adapter(),
    version: {
      name: process.env.CF_PAGES_COMMIT_SHA,
      // No pollInterval - clients won't know about updates
    },
  }
};

// ✅ Good - version with polling
export default {
  kit: {
    adapter: adapter(),
    version: {
      name: process.env.CF_PAGES_COMMIT_SHA || Date.now().toString(),
      pollInterval: 60000,  // Check every minute
    },
  }
};

// ✅ Good - version with custom name
export default {
  kit: {
    adapter: adapter(),
    version: {
      name: process.env.npm_package_version,
      pollInterval: 300000,  // Check every 5 minutes
    },
  }
};

// ✅ Good - using $app/stores for version updates
// In your app code:
// import { updated } from '$app/stores';
// $effect(() => {
//   if ($updated) {
//     // Prompt user to refresh
//   }
// });
```

**Error message:** `Consider adding version config for deployment updates`

**Tip:** `Add version: { name: process.env.COMMIT_SHA, pollInterval: 60000 }`

**Severity:** warning

---

### 13. `svelte5-config/trailing-slash-consistency`

**What it catches:** Inconsistent trailing slash handling

**Why:** Inconsistent trailing slashes cause SEO issues and routing confusion

**Detection:**
- `kit.trailingSlash` not explicitly set
- Adapter settings conflict with trailing slash setting
- Prerender settings conflict

```javascript
// ❌ Bad - no explicit trailing slash setting
export default {
  kit: {
    adapter: adapter(),
    // trailingSlash is 'never' by default but not explicit
  }
};

// ❌ Bad - static adapter often needs 'always' for directory indexes
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter(),
    trailingSlash: 'never',  // May break static hosting!
  }
};

// ✅ Good - explicit setting
export default {
  kit: {
    adapter: adapter(),
    trailingSlash: 'never',
  }
};

// ✅ Good - static hosting often needs trailing slashes
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
    }),
    trailingSlash: 'always',
    prerender: {
      entries: ['*'],
    },
  }
};

// ✅ Good - ignore for flexibility
export default {
  kit: {
    adapter: adapter(),
    trailingSlash: 'ignore',
  }
};
```

**Error message:** `Trailing slash handling not explicitly configured`

**Tip:** `Add trailingSlash: 'never' | 'always' | 'ignore' for consistent URL handling`

**Severity:** warning

---

### 14. `svelte5-config/no-inline-preprocess`

**What it catches:** Complex inline preprocessor functions

**Why:** Preprocessors should be extracted for maintainability and reusability

**Detection:** `preprocess` array containing inline arrow functions with complex logic

```javascript
// ❌ Bad - complex inline preprocessor
export default {
  preprocess: [
    {
      markup: ({ content, filename }) => {
        // 50 lines of transformation logic...
        const transformed = content
          .replace(/something/g, 'else')
          .replace(/another/g, 'thing');
        // ... more complex logic
        return { code: transformed };
      },
      script: ({ content }) => {
        // More complex logic...
        return { code: content };
      },
    },
  ],
  kit: {
    adapter: adapter(),
  }
};

// ❌ Bad - mixing preprocessors and inline logic
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: [
    vitePreprocess(),
    {
      script: ({ content, filename }) => {
        if (filename.endsWith('.svelte')) {
          return {
            code: content.replace(/__DEV__/g, 'import.meta.env.DEV'),
          };
        }
      },
    },
  ],
};

// ✅ Good - use established preprocessors
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - extract custom preprocessor to separate file
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { myCustomPreprocessor } from './config/preprocessors.js';

export default {
  preprocess: [vitePreprocess(), myCustomPreprocessor()],
  kit: {
    adapter: adapter(),
  }
};

// ✅ Good - simple inline is OK
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess({
    postcss: true,
  }),
  kit: {
    adapter: adapter(),
  }
};
```

**Error message:** `Complex inline preprocessor should be extracted to a separate module`

**Tip:** `Create preprocessor in config/preprocessors.js and import it`

**Severity:** warning

---

### 15. `svelte5-config/vite-optimizeDeps`

**What it catches:** Missing or incorrect Vite dependency optimization for Svelte

**Why:** Some Svelte-related packages need explicit optimization configuration

**Detection:** In `vite.config.ts`, missing `optimizeDeps` for known problematic packages

**Packages often needing optimization:**
- `esm-env`
- `@sveltejs/kit`
- Svelte component libraries
- Packages with Svelte exports

```typescript
// ❌ Bad - missing optimization for known packages (vite.config.ts)
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Missing optimizeDeps!
});

// ❌ Bad - excluding packages that should be optimized
export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ['svelte', '@sveltejs/kit'],  // Don't exclude these!
  },
});

// ✅ Good - proper optimization config
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: [
      'esm-env',
      // Add any problematic dependencies here
    ],
  },
});

// ✅ Good - with SSR noExternal for Cloudflare
export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['esm-env'],
  },
  ssr: {
    noExternal: ['@your-org/*'],  // Bundle these for Workers
  },
});

// ✅ Good - handling specific library issues
export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['esm-env', 'devalue'],
    exclude: [],  // Empty, not excluding Svelte packages
  },
  resolve: {
    dedupe: ['svelte'],
  },
});
```

**Error message:** `Package '${pkg}' may need optimizeDeps.include for proper bundling`

**Tip:** `Add to vite.config.ts: optimizeDeps: { include: ['${pkg}'] }`

**Severity:** warning

---

## Detection Helpers Needed

For Svelte config files, the linter needs to:

1. **Parse JS/TS config exports** - Handle `export default { ... }` and `module.exports`
2. **Resolve imports** - Track which adapter is imported
3. **Cross-file analysis** - Check for `capacitor.config.ts`, `wrangler.toml`, `tsconfig.json`
4. **Detect Vite config** - Parse `vite.config.ts` for optimization settings
5. **Track property access** - `kit.adapter`, `kit.csp.directives`, etc.
6. **Handle function calls** - `adapter()`, `vitePreprocess()`, etc.

### AST Node Types for Config Files

```typescript
// Config file parsing
visitor: {
  // ES Module exports
  ExportDefaultDeclaration,  // export default { ... }

  // CommonJS (legacy)
  AssignmentExpression,      // module.exports = { ... }

  // Property access
  ObjectExpression,          // { kit: { ... } }
  ObjectProperty,            // kit: adapter()

  // Function calls
  CallExpression,            // adapter(), vitePreprocess()

  // Imports
  ImportDeclaration,         // import adapter from '...'
}
```

### Known Adapters

```typescript
const ADAPTERS = {
  '@sveltejs/adapter-cloudflare': 'cloudflare',
  '@sveltejs/adapter-cloudflare-workers': 'cloudflare-workers',
  '@sveltejs/adapter-static': 'static',
  '@sveltejs/adapter-node': 'node',
  '@sveltejs/adapter-auto': 'auto',
  '@sveltejs/adapter-vercel': 'vercel',
  '@sveltejs/adapter-netlify': 'netlify',
};

const STATIC_ADAPTERS = [
  '@sveltejs/adapter-static',
];

const CLOUDFLARE_ADAPTERS = [
  '@sveltejs/adapter-cloudflare',
  '@sveltejs/adapter-cloudflare-workers',
];
```

### Deprecated Options Map

```typescript
const DEPRECATED_OPTIONS = {
  'compilerOptions.hydratable': 'Always true in Svelte 5',
  'compilerOptions.immutable': 'Use $state runes for reactivity',
  'compilerOptions.accessors': 'Use $props rune instead',
  'compilerOptions.legacy': 'No legacy mode in Svelte 5',
  'kit.browser.hydrate': 'Removed in SvelteKit 2',
  'kit.browser.router': 'Use kit.router.type instead',
  'kit.vite': 'Use vite.config.js instead',
  'kit.package': 'Use svelte-package CLI instead',
  'kit.endpointExtensions': 'Removed - use +server.js convention',
  'kit.hydrate': 'Removed in SvelteKit 2',
  'kit.routes': 'Use route-level config in +page.js instead',
};
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `require-adapter` | error | Missing adapter config |
| `cloudflare-adapter-settings` | warning | Missing routes config |
| `static-adapter-for-capacitor` | error | Wrong adapter for Capacitor |
| `no-node-adapter-cloudflare` | error | Node adapter on Cloudflare |
| `kit-alias-consistency` | warning | Mismatched path aliases |
| `require-runes-mode` | warning | Runes not enabled |
| `no-deprecated-options` | error | Svelte 4 deprecated config |
| `prerender-config` | warning | Missing prerender settings |
| `csp-headers` | warning | No CSP configuration |
| `env-prefix-consistency` | error | Dangerous env exposure |
| `output-directory` | error | Output directory conflicts |
| `version-skew-handling` | warning | Missing version config |
| `trailing-slash-consistency` | warning | Inconsistent trailing slash |
| `no-inline-preprocess` | warning | Complex inline preprocessors |
| `vite-optimizeDeps` | warning | Missing dependency optimization |

**Total: 15 rules**
