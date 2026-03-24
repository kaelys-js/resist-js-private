# @/config/tooling/svelte

Shared SvelteKit configuration factory for all WebForge products.

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | `createSvelteConfig()` factory, tsconfig alias resolution, CSP, template paths |
| `src/templates/app-html.ts` | App HTML template generation with font preloads and meta tags |
| `src/templates/error-html.ts` | Error HTML template generation with styled error page |

## API

### index.ts

| Export | Kind | Description |
|--------|------|-------------|
| `createSvelteConfig` | function | Create a complete SvelteKit config with aliases, CSP, preprocessing, and git metadata |
| `CreateSvelteConfigOptionsSchema` | schema | Options: adapter, enableCsp, extraAliases, files, extraKit |
| `CreateSvelteConfigInput` | type | Inferred input type (allows omitting defaults) |
| `TEMPLATE_PATHS` | const | Resolved paths to app.html and error.html templates |

## Usage

```typescript
import adapter from '@sveltejs/adapter-cloudflare';
import { createSvelteConfig } from '@/config/tooling/svelte';

const config = createSvelteConfig({
  adapter: adapter({ platformProxy: { persist: true } }),
});

export default config;
```

## Features

- Reads `tsconfig.json` paths and generates SvelteKit `kit.alias` entries
- Configures CSP directives for script-src, style-src, connect-src
- Injects git commit hash into `kit.version.name`
- Configures `vitePreprocess()` for TypeScript support
- Resolves `app.html` and `error.html` template paths from workspace root
