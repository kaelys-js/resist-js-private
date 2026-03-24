# @/config/tooling/vite

Shared Vite configuration factory for all WebForge products.

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | `createViteConfig()` factory, git metadata injection, JSON define helper |
| `src/vite-plugin-lazy.ts` | `createLazyPlugin()` — deferred SSR module loading for Vite dev server |
| `src/vite-plugin-template-html.ts` | HTML template processing with font injection, error pages |

## API

### index.ts

| Export | Kind | Description |
|--------|------|-------------|
| `createViteConfig` | function | Create a complete Vite config with git defines, SSR config, and server watch ignores |
| `CreateViteConfigOptionsSchema` | schema | Options: plugins, ssrNoExternal, extraDefines, extraConfig |
| `CreateViteConfigOptions` | type | Inferred output type |
| `CreateViteConfigInput` | type | Inferred input type (allows omitting optional fields) |

### vite-plugin-lazy.ts

| Export | Kind | Description |
|--------|------|-------------|
| `createLazyPlugin` | function | Create a Vite plugin that lazy-loads a module via SSR at dev time |
| `LazyPluginOptionsSchema` | schema | Options: name, modulePath, setupFn |

### vite-plugin-template-html.ts

| Export | Kind | Description |
|--------|------|-------------|
| `FontFaceEntrySchema` | schema | Font face entry: family, style, weight, src, display, unicodeRange |
| `FontFaceEntry` | type | Inferred font face entry |
| `FontFaceEntryArraySchema` | schema | Array of font face entries |
| `FontFaceEntryArray` | type | Inferred font face array |
| `ErrorHtmlConfigSchema` | schema | Error page config: appName, fontFaces, storagePrefix, serverError/goHome labels |
| `ErrorHtmlConfig` | type | Inferred error config |
| `AppHtmlConfigSchema` | schema | App HTML config: appName, fontFaces, themeColor, locale |
| `AppHtmlConfig` | type | Inferred app config |
| `generateFontFaceCss` | function | Generate @font-face CSS from font entries |
| `deriveErrorIdPrefix` | function | Extract error ID prefix from HTML template |
| `resolveErrorHtml` | function | Resolve error.html template with config values |
| `resolveAppHtml` | function | Resolve app.html template with config values |
| `templateErrorHtml` | function | Vite plugin that processes error.html at build time |
| `templateAppHtml` | function | Vite plugin that processes app.html at build time |

## Usage

```typescript
import { createViteConfig } from '@/config/tooling/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default createViteConfig({
  plugins: [sveltekit()],
});
```
