# Vite Configuration Lint Rules

Implement the **Vite Configuration** lint rules (87 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/vite-config/`

File patterns: `vite.config.ts`, `vite.config.js`, `vite.config.mjs`

**Parser:** oxc-parser (these are JS/TS files)

**Vite versions supported:** Vite 7.x and Vite 8.x

---

## Already Covered by Oxlint

General TypeScript/JavaScript rules apply. The rules below are **Vite-specific** configuration patterns.

---

## Part 1: Core Configuration

### 1. `vite-config/require-defineConfig`

**What it catches:** Vite config without `defineConfig` wrapper

**Why:** `defineConfig` provides type safety and IDE autocomplete

**Detection:** Export default object literal without `defineConfig()` call

```typescript
// ❌ Bad - no type safety
export default {
  plugins: [],
  build: {
    outDir: 'dist',
  },
};

// ❌ Bad - plain object
const config = {
  plugins: [],
};
export default config;

// ✅ Good - with defineConfig
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
  },
});

// ✅ Good - async config
export default defineConfig(async () => {
  return {
    plugins: [],
  };
});

// ✅ Good - conditional config
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [],
  };
});
```

**Error message:** `Vite config should use defineConfig() for type safety`

**Tip:** `Wrap config with: import { defineConfig } from 'vite'; export default defineConfig({ ... })`

**Severity:** warning

---

### 2. `vite-config/no-cjs-syntax`

**What it catches:** CommonJS syntax in Vite config

**Why:** Vite is ESM-first; CJS causes issues, especially in Vite 7+ (ESM-only distribution)

**Detection:** `require()`, `module.exports`, `__dirname`, `__filename`

```typescript
// ❌ Bad - CommonJS
const path = require('path');
module.exports = {
  resolve: {
    alias: {
      '@': __dirname + '/src',
    },
  },
};

// ❌ Bad - __dirname (CJS global)
import { defineConfig } from 'vite';
export default defineConfig({
  resolve: {
    alias: {
      '@': __dirname + '/src',  // __dirname not available in ESM
    },
  },
});

// ✅ Good - ESM
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

// ✅ Good - simpler alias
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',  // Relative to project root
    },
  },
});
```

**Error message:** `CommonJS syntax '${syntax}' not supported in Vite config`

**Tip:** `Use ESM: import instead of require, import.meta.url instead of __dirname`

**Severity:** error

---

### 3. `vite-config/export-default-required`

**What it catches:** Missing default export in Vite config

**Why:** Vite requires default export for configuration

**Detection:** No `export default` in vite.config.* file

```typescript
// ❌ Bad - named export
import { defineConfig } from 'vite';

export const config = defineConfig({
  plugins: [],
});

// ❌ Bad - no export
import { defineConfig } from 'vite';

const config = defineConfig({
  plugins: [],
});

// ✅ Good - default export
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
});
```

**Error message:** `Vite config must have default export`

**Tip:** `Use: export default defineConfig({ ... })`

**Severity:** error

---

### 4. `vite-config/valid-plugin-array`

**What it catches:** Plugins not in array format

**Why:** `plugins` must be an array

**Detection:** `plugins` property not an array

```typescript
// ❌ Bad - single plugin not in array
export default defineConfig({
  plugins: svelte(),  // Should be [svelte()]
});

// ❌ Bad - object
export default defineConfig({
  plugins: {
    svelte: svelte(),
  },
});

// ✅ Good - array
export default defineConfig({
  plugins: [svelte()],
});

// ✅ Good - multiple plugins
export default defineConfig({
  plugins: [
    svelte(),
    imageOptimizer(),
  ],
});

// ✅ Good - conditional plugins with filter
export default defineConfig({
  plugins: [
    svelte(),
    process.env.ANALYZE && visualizer(),
  ].filter(Boolean),
});
```

**Error message:** `plugins must be an array`

**Tip:** `Use: plugins: [plugin1(), plugin2()]`

**Severity:** error

---

### 5. `vite-config/no-duplicate-plugins`

**What it catches:** Same plugin added multiple times

**Why:** Duplicate plugins cause conflicts or double processing

**Detection:** Same plugin constructor called multiple times in plugins array

```typescript
// ❌ Bad - duplicate plugin
export default defineConfig({
  plugins: [
    svelte(),
    imageOptimizer(),
    svelte(),  // Duplicate!
  ],
});

// ❌ Bad - duplicate with different options (usually wrong)
export default defineConfig({
  plugins: [
    svelte({ compilerOptions: { dev: true } }),
    svelte({ compilerOptions: { dev: false } }),  // Won't work as expected
  ],
});

// ✅ Good - each plugin once
export default defineConfig({
  plugins: [
    svelte(),
    imageOptimizer(),
  ],
});
```

**Error message:** `Duplicate plugin '${name}' in plugins array`

**Tip:** `Remove duplicate plugin`

**Severity:** error

---

### 6. `vite-config/plugin-order`

**What it catches:** Framework plugins not first in array

**Why:** Framework plugins (Svelte, React, Vue) should come before other plugins

**Detection:** Framework plugin not at index 0 in plugins array

```typescript
// ❌ Bad - framework plugin not first
export default defineConfig({
  plugins: [
    imageOptimizer(),
    svelte(),  // Should be first
  ],
});

// ❌ Bad - sveltekit after other plugins
export default defineConfig({
  plugins: [
    visualizer(),
    sveltekit(),  // Should be first
  ],
});

// ✅ Good - framework first
export default defineConfig({
  plugins: [
    svelte(),
    imageOptimizer(),
  ],
});

// ✅ Good - sveltekit first
export default defineConfig({
  plugins: [
    sveltekit(),
    visualizer(),
  ],
});
```

**Error message:** `Framework plugin '${name}' should be first in plugins array`

**Tip:** `Move ${name} to the beginning of the plugins array`

**Severity:** warning

---

### 7. `vite-config/no-hardcoded-root`

**What it catches:** Hardcoded absolute path for root

**Why:** Absolute paths break portability across machines

**Detection:** `root` property with absolute path string literal

```typescript
// ❌ Bad - hardcoded absolute path
export default defineConfig({
  root: '/Users/john/projects/myapp/src',
});

// ❌ Bad - Windows absolute path
export default defineConfig({
  root: 'C:\\Users\\john\\projects\\myapp\\src',
});

// ✅ Good - relative path
export default defineConfig({
  root: 'src',
});

// ✅ Good - resolved path
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
});

// ✅ Good - process.cwd() based
export default defineConfig({
  root: process.cwd(),
});
```

**Error message:** `Hardcoded absolute path in root - use relative or resolved path`

**Tip:** `Use relative path or path.resolve()`

**Severity:** error

---

### 8. `vite-config/base-url-format`

**What it catches:** Invalid base URL format

**Why:** Base must start and end with `/` for absolute, or be full URL

**Detection:** `base` property not matching required format

```typescript
// ❌ Bad - missing leading slash
export default defineConfig({
  base: 'app/',
});

// ❌ Bad - missing trailing slash
export default defineConfig({
  base: '/app',
});

// ❌ Bad - no slashes
export default defineConfig({
  base: 'app',
});

// ✅ Good - root
export default defineConfig({
  base: '/',
});

// ✅ Good - subpath with slashes
export default defineConfig({
  base: '/app/',
});

// ✅ Good - full URL (for CDN)
export default defineConfig({
  base: 'https://cdn.example.com/assets/',
});

// ✅ Good - empty for relative (Vite 7+)
export default defineConfig({
  base: '',  // Relative paths
});
```

**Error message:** `base URL must start and end with / or be a full URL`

**Tip:** `Use format: '/path/' or 'https://cdn.example.com/'`

**Severity:** error

---

### 9. `vite-config/mode-specific-config`

**What it catches:** Incorrect conditional config patterns

**Why:** Mode-specific config should use function form or proper conditionals

**Detection:** Accessing `process.env.NODE_ENV` outside function config

```typescript
// ❌ Bad - NODE_ENV at module level (might not be set)
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  build: {
    sourcemap: !isProd,
  },
});

// ❌ Bad - command/mode not available
export default defineConfig({
  build: {
    minify: command === 'build',  // command is undefined!
  },
});

// ✅ Good - function form with mode
export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production';

  return {
    build: {
      sourcemap: !isProd,
      minify: command === 'build',
    },
  };
});

// ✅ Good - separate configs merged
export default defineConfig(({ mode }) => {
  const baseConfig = {
    plugins: [svelte()],
  };

  if (mode === 'production') {
    return {
      ...baseConfig,
      build: { sourcemap: false },
    };
  }

  return baseConfig;
});
```

**Error message:** `Use function form for mode-specific config: defineConfig(({ mode }) => ...)`

**Tip:** `Use defineConfig(({ command, mode }) => ({ ... }))`

**Severity:** warning

---

### 10. `vite-config/no-inline-config-override`

**What it catches:** Configs that override important CLI flags

**Why:** Some settings should be controlled by CLI, not hardcoded

**Detection:** Settings like `configFile`, `mode` set in config file

```typescript
// ❌ Bad - overriding config file location
export default defineConfig({
  configFile: './other-config.ts',  // Doesn't make sense in config
});

// ❌ Bad - hardcoding mode
export default defineConfig({
  mode: 'production',  // Should be CLI flag
});

// ✅ Good - use CLI flags instead
// vite build --mode production

// ✅ Good - mode in function parameter
export default defineConfig(({ mode }) => {
  // Use mode from CLI
  return {
    define: {
      __MODE__: JSON.stringify(mode),
    },
  };
});
```

**Error message:** `'${option}' should be set via CLI, not in config file`

**Tip:** `Use CLI flag: vite --${option}=value`

**Severity:** warning

---

## Part 2: Build Options

### 11. `vite-config/build-target-valid`

**What it catches:** Invalid build.target value

**Why:** Invalid target causes build failures

**Detection:** `build.target` with unrecognized value

**Valid targets:** `'modules'`, `'esnext'`, `'es2015'`-`'es2024'`, `'chrome'`/`'firefox'`/`'safari'`/`'edge'` + version, `'node'` + version, `'baseline-widely-available'` (Vite 7+)

```typescript
// ❌ Bad - invalid target
export default defineConfig({
  build: {
    target: 'es5',  // Too old, not supported
  },
});

// ❌ Bad - typo
export default defineConfig({
  build: {
    target: 'esnext2024',  // Invalid
  },
});

// ✅ Good - ES version
export default defineConfig({
  build: {
    target: 'es2022',
  },
});

// ✅ Good - browser targets
export default defineConfig({
  build: {
    target: ['chrome110', 'firefox114', 'safari16'],
  },
});

// ✅ Good - Vite 7+ baseline (recommended)
export default defineConfig({
  build: {
    target: 'baseline-widely-available',
  },
});
```

**Error message:** `Invalid build target '${target}'`

**Tip:** `Use: es2022, esnext, baseline-widely-available, or browser versions`

**Severity:** error

---

### 12. `vite-config/build-target-baseline`

**What it catches:** Not using baseline-widely-available in Vite 7+

**Why:** `baseline-widely-available` is the new default and recommended target

**Detection:** `build.target` set to old value when Vite 7+ detected

```typescript
// ⚠️ Warning (Vite 7+) - consider baseline
export default defineConfig({
  build: {
    target: 'modules',  // Old default
  },
});

// ✅ Good - Vite 7+ default
export default defineConfig({
  build: {
    target: 'baseline-widely-available',
  },
});

// ✅ Good - explicit modern browsers
export default defineConfig({
  build: {
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4'],
  },
});

// ✅ OK - intentionally targeting older browsers
export default defineConfig({
  build: {
    target: 'es2020',  // With comment explaining why
  },
});
```

**Error message:** `Consider using 'baseline-widely-available' target (Vite 7+ default)`

**Tip:** `Set target: 'baseline-widely-available' for modern browser support`

**Severity:** info

---

### 13. `vite-config/build-outDir-not-src`

**What it catches:** Output directory set to source directory

**Why:** Would overwrite source files

**Detection:** `build.outDir` pointing to src, source, lib, or root

```typescript
// ❌ Bad - output to source
export default defineConfig({
  build: {
    outDir: 'src',
  },
});

// ❌ Bad - output to root
export default defineConfig({
  build: {
    outDir: '.',
  },
});

// ❌ Bad - output to lib (might be source for libraries)
export default defineConfig({
  build: {
    outDir: 'lib',
  },
});

// ✅ Good - dedicated output directory
export default defineConfig({
  build: {
    outDir: 'dist',
  },
});

// ✅ Good - build directory
export default defineConfig({
  build: {
    outDir: 'build',
  },
});
```

**Error message:** `build.outDir '${dir}' would overwrite source files`

**Tip:** `Use dedicated output directory like 'dist' or 'build'`

**Severity:** error

---

### 14. `vite-config/build-sourcemap-production`

**What it catches:** Missing sourcemap consideration for production

**Why:** Sourcemaps affect debugging and bundle size

**Detection:** No `build.sourcemap` configuration

```typescript
// ⚠️ Info - consider sourcemap setting
export default defineConfig({
  build: {
    // No sourcemap config - defaults to false
  },
});

// ✅ Good - explicit sourcemap config
export default defineConfig({
  build: {
    sourcemap: true,  // Full sourcemaps
  },
});

// ✅ Good - hidden sourcemaps (uploaded to error tracking)
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
});

// ✅ Good - inline for dev
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode === 'development' ? 'inline' : 'hidden',
  },
}));
```

**Error message:** `Consider setting build.sourcemap for production debugging`

**Tip:** `Use sourcemap: 'hidden' for error tracking without exposing maps`

**Severity:** info

---

### 15. `vite-config/build-minify-valid`

**What it catches:** Invalid build.minify value

**Why:** Invalid minify value causes build failure

**Detection:** `build.minify` not boolean or valid string

**Valid values:** `true`, `false`, `'esbuild'`, `'terser'`

```typescript
// ❌ Bad - invalid value
export default defineConfig({
  build: {
    minify: 'uglify',  // Not supported
  },
});

// ❌ Bad - typo
export default defineConfig({
  build: {
    minify: 'tersser',
  },
});

// ✅ Good - boolean
export default defineConfig({
  build: {
    minify: true,
  },
});

// ✅ Good - explicit minifier
export default defineConfig({
  build: {
    minify: 'esbuild',  // Default, fastest
  },
});

// ✅ Good - terser for more control
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});
```

**Error message:** `Invalid build.minify value '${value}'`

**Tip:** `Use: true, false, 'esbuild', or 'terser'`

**Severity:** error

---

### 16. `vite-config/build-cssMinify-valid`

**What it catches:** Invalid build.cssMinify value

**Why:** Invalid value causes build failure

**Detection:** `build.cssMinify` not valid value

**Valid values:** `true`, `false`, `'esbuild'`, `'lightningcss'`

```typescript
// ❌ Bad - invalid value
export default defineConfig({
  build: {
    cssMinify: 'cssnano',  // Not supported directly
  },
});

// ✅ Good - default (esbuild)
export default defineConfig({
  build: {
    cssMinify: true,
  },
});

// ✅ Good - Lightning CSS (faster, Vite 8 default)
export default defineConfig({
  build: {
    cssMinify: 'lightningcss',
  },
});

// ✅ Good - disabled
export default defineConfig({
  build: {
    cssMinify: false,
  },
});
```

**Error message:** `Invalid build.cssMinify value '${value}'`

**Tip:** `Use: true, false, 'esbuild', or 'lightningcss'`

**Severity:** error

---

### 17. `vite-config/build-rollupOptions-deprecated`

**What it catches:** Using `build.rollupOptions` in Vite 8+

**Why:** Vite 8 uses Rolldown; option renamed to `build.rolldownOptions`

**Detection:** `build.rollupOptions` when Vite 8+ detected

```typescript
// ❌ Bad (Vite 8+) - deprecated
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {},
      },
    },
  },
});

// ✅ Good (Vite 8+) - use rolldownOptions
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        manualChunks: {},
      },
    },
  },
});

// ✅ Good (Vite 7) - rollupOptions still valid
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {},
      },
    },
  },
});
```

**Error message:** `build.rollupOptions is deprecated in Vite 8 - use build.rolldownOptions`

**Tip:** `Rename rollupOptions to rolldownOptions`

**Severity:** warning (Vite 8+)

---

### 18. `vite-config/build-manifest-spa`

**What it catches:** SPA without manifest for cache busting

**Why:** Manifest helps with cache invalidation strategies

**Detection:** SPA build without `build.manifest`

```typescript
// ⚠️ Info - consider manifest for SPAs
export default defineConfig({
  build: {
    // No manifest config
  },
});

// ✅ Good - manifest enabled
export default defineConfig({
  build: {
    manifest: true,
  },
});

// ✅ Good - custom manifest filename
export default defineConfig({
  build: {
    manifest: 'asset-manifest.json',
  },
});
```

**Error message:** `Consider build.manifest for SPA cache busting`

**Tip:** `Set manifest: true for asset manifest generation`

**Severity:** info

---

### 19. `vite-config/build-chunkSizeWarningLimit`

**What it catches:** Default chunk size limit causing noisy warnings

**Why:** Default 500KB limit may be too low for some apps

**Detection:** Large app without `chunkSizeWarningLimit` adjustment

```typescript
// ⚠️ Info - consider adjusting if getting warnings
export default defineConfig({
  build: {
    // Default 500KB limit
  },
});

// ✅ Good - adjusted limit
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,  // 1MB
  },
});

// ✅ Good - with manual chunks to reduce size
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

**Error message:** `Consider adjusting chunkSizeWarningLimit or using manualChunks`

**Tip:** `Set chunkSizeWarningLimit or configure manualChunks to split bundles`

**Severity:** info

---

### 20. `vite-config/build-emptyOutDir-safety`

**What it catches:** emptyOutDir with potentially dangerous outDir

**Why:** Could accidentally delete important files

**Detection:** `emptyOutDir: true` with outDir outside project root

```typescript
// ❌ Bad - dangerous empty
export default defineConfig({
  build: {
    outDir: '../shared-dist',
    emptyOutDir: true,  // Will delete files outside project!
  },
});

// ✅ Good - Vite warns and requires explicit flag
export default defineConfig({
  build: {
    outDir: '../shared-dist',
    emptyOutDir: false,  // Don't auto-delete
  },
});

// ✅ Good - outDir inside project
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,  // Safe
  },
});
```

**Error message:** `emptyOutDir with outDir outside project root may delete unintended files`

**Tip:** `Set emptyOutDir: false for outDir outside project root`

**Severity:** warning

---

### 21. `vite-config/build-lib-formats`

**What it catches:** Invalid library build formats

**Why:** Invalid formats cause build failure

**Detection:** `build.lib.formats` with invalid values

**Valid formats:** `'es'`, `'cjs'`, `'umd'`, `'iife'`

```typescript
// ❌ Bad - invalid format
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['esm'],  // Should be 'es'
    },
  },
});

// ✅ Good - valid formats
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyLib',
      formats: ['es', 'cjs'],
    },
  },
});

// ✅ Good - UMD for browser global
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyLib',
      formats: ['es', 'umd'],
      fileName: (format) => `my-lib.${format}.js`,
    },
  },
});
```

**Error message:** `Invalid library format '${format}'`

**Tip:** `Use: 'es', 'cjs', 'umd', or 'iife'`

**Severity:** error

---

### 22. `vite-config/build-lib-name-required`

**What it catches:** UMD/IIFE library without name

**Why:** UMD and IIFE formats require global name

**Detection:** `formats` includes 'umd' or 'iife' but no `name`

```typescript
// ❌ Bad - UMD without name
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'umd'],
      // Missing name!
    },
  },
});

// ✅ Good - name provided
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyLibrary',
      formats: ['es', 'umd'],
    },
  },
});

// ✅ Good - ES only doesn't need name
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
    },
  },
});
```

**Error message:** `UMD/IIFE library format requires 'name' option`

**Tip:** `Add name: 'YourLibraryName' for global variable`

**Severity:** error

---

## Part 3: Server Options

### 23. `vite-config/server-port-valid`

**What it catches:** Invalid server port

**Why:** Port must be valid number 1-65535

**Detection:** `server.port` outside valid range or not a number

```typescript
// ❌ Bad - invalid port
export default defineConfig({
  server: {
    port: 0,  // Invalid
  },
});

// ❌ Bad - string
export default defineConfig({
  server: {
    port: '3000',  // Should be number
  },
});

// ❌ Bad - too high
export default defineConfig({
  server: {
    port: 70000,  // Max is 65535
  },
});

// ✅ Good
export default defineConfig({
  server: {
    port: 3000,
  },
});

// ✅ Good - common alternatives
export default defineConfig({
  server: {
    port: 5173,  // Vite default
  },
});
```

**Error message:** `Invalid server port '${port}' - must be 1-65535`

**Tip:** `Use port number between 1 and 65535`

**Severity:** error

---

### 24. `vite-config/server-host-security`

**What it catches:** Exposing dev server to network

**Why:** `host: true` exposes server to all network interfaces - security risk

**Detection:** `server.host` set to `true` or `'0.0.0.0'`

```typescript
// ⚠️ Warning - exposes to network
export default defineConfig({
  server: {
    host: true,  // Accessible from any IP
  },
});

// ⚠️ Warning - same thing
export default defineConfig({
  server: {
    host: '0.0.0.0',
  },
});

// ✅ Good - localhost only (default)
export default defineConfig({
  server: {
    host: 'localhost',
  },
});

// ✅ Good - explicit about exposure with comment
export default defineConfig({
  server: {
    host: true,  // Intentionally exposed for mobile testing
  },
});
```

**Error message:** `server.host exposes dev server to network - verify intentional`

**Tip:** `Use host: 'localhost' unless network access is needed`

**Severity:** warning

---

### 25. `vite-config/server-https-config`

**What it catches:** HTTPS without proper certificate configuration

**Why:** HTTPS requires cert and key files

**Detection:** `server.https: true` without cert/key paths

```typescript
// ❌ Bad - https without certs
export default defineConfig({
  server: {
    https: true,  // Will fail without certs
  },
});

// ✅ Good - with certificate paths
export default defineConfig({
  server: {
    https: {
      key: './certs/localhost-key.pem',
      cert: './certs/localhost.pem',
    },
  },
});

// ✅ Good - using mkcert plugin
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [mkcert()],
  server: {
    https: true,  // Plugin handles certs
  },
});

// ✅ Good - using @vitejs/plugin-basic-ssl
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
  },
});
```

**Error message:** `server.https requires certificate configuration or SSL plugin`

**Tip:** `Provide cert/key paths or use vite-plugin-mkcert`

**Severity:** error

---

### 26. `vite-config/server-proxy-target`

**What it catches:** Invalid proxy target URL

**Why:** Proxy target must be valid URL

**Detection:** `server.proxy[path].target` not valid URL

```typescript
// ❌ Bad - invalid URL
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'api.example.com',  // Missing protocol
      },
    },
  },
});

// ❌ Bad - relative path
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: '/backend',  // Should be full URL
      },
    },
  },
});

// ✅ Good - full URL
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});

// ✅ Good - shorthand
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
```

**Error message:** `Invalid proxy target '${target}' - must be valid URL`

**Tip:** `Use full URL: http://localhost:8080`

**Severity:** error

---

### 27. `vite-config/server-fs-allow`

**What it catches:** Missing fs.allow for security

**Why:** Controls which files dev server can serve

**Detection:** Serving files outside project without explicit allow

```typescript
// ⚠️ Info - consider restricting file access
export default defineConfig({
  server: {
    // Default allows serving files from workspace root
  },
});

// ✅ Good - explicit allow list
export default defineConfig({
  server: {
    fs: {
      allow: [
        '.',  // Project root
        '../shared',  // Shared workspace package
      ],
    },
  },
});

// ✅ Good - strict mode
export default defineConfig({
  server: {
    fs: {
      strict: true,  // Only allow files in allowed directories
      allow: ['.'],
    },
  },
});
```

**Error message:** `Consider configuring server.fs.allow for security`

**Tip:** `Set fs.allow to restrict which directories can be served`

**Severity:** info

---

### 28. `vite-config/server-hmr-config`

**What it catches:** HMR configuration issues

**Why:** Misconfigured HMR causes connection failures

**Detection:** Inconsistent HMR settings

```typescript
// ❌ Bad - HMR port mismatch
export default defineConfig({
  server: {
    port: 3000,
    hmr: {
      port: 24678,
      // But no protocol or host specified
    },
  },
});

// ✅ Good - consistent HMR config
export default defineConfig({
  server: {
    port: 3000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
});

// ✅ Good - for Docker/proxy environments
export default defineConfig({
  server: {
    host: true,
    hmr: {
      clientPort: 443,  // If behind HTTPS proxy
    },
  },
});

// ✅ Good - disabled in certain environments
export default defineConfig({
  server: {
    hmr: process.env.DISABLE_HMR ? false : true,
  },
});
```

**Error message:** `HMR configuration may cause connection issues`

**Tip:** `Ensure HMR host/port match server configuration`

**Severity:** warning

---

### 29. `vite-config/server-watch-ignored`

**What it catches:** Not ignoring node_modules in watch

**Why:** Watching node_modules causes performance issues

**Detection:** `server.watch.ignored` not including node_modules

```typescript
// ⚠️ Info - node_modules watched by default in some setups
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/.git/**'],  // Missing node_modules
    },
  },
});

// ✅ Good - ignore node_modules
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
});

// ✅ Good - using chokidar options
export default defineConfig({
  server: {
    watch: {
      usePolling: true,  // For Docker/network filesystems
      interval: 100,
      ignored: ['**/node_modules/**'],
    },
  },
});
```

**Error message:** `Consider ignoring node_modules in server.watch`

**Tip:** `Add '**/node_modules/**' to watch.ignored`

**Severity:** info

---

### 30. `vite-config/server-cors-security`

**What it catches:** Overly permissive CORS in dev

**Why:** `cors: true` allows all origins

**Detection:** `server.cors: true` without explicit origin

```typescript
// ⚠️ Info - permissive CORS
export default defineConfig({
  server: {
    cors: true,  // Allows all origins
  },
});

// ✅ Good - explicit origin
export default defineConfig({
  server: {
    cors: {
      origin: 'http://localhost:3001',
    },
  },
});

// ✅ Good - multiple specific origins
export default defineConfig({
  server: {
    cors: {
      origin: ['http://localhost:3001', 'http://localhost:3002'],
    },
  },
});

// ✅ OK - dev environment with comment
export default defineConfig({
  server: {
    cors: true,  // Dev only - permissive for testing
  },
});
```

**Error message:** `server.cors: true allows all origins - consider restricting`

**Tip:** `Specify allowed origins: cors: { origin: 'http://...' }`

**Severity:** info

---

## Part 4: Dependency Optimization

### 31. `vite-config/optimizeDeps-include-known`

**What it catches:** Known problematic packages not pre-bundled

**Why:** Some packages need explicit inclusion for proper bundling

**Detection:** Using packages known to need optimizeDeps.include

**Known packages:** `esm-env`, `devalue`, packages with complex exports

```typescript
// ⚠️ Warning - known package needs include
export default defineConfig({
  // esm-env used but not in optimizeDeps.include
});

// ✅ Good - include problematic packages
export default defineConfig({
  optimizeDeps: {
    include: [
      'esm-env',
      'devalue',
    ],
  },
});

// ✅ Good - SvelteKit specific
export default defineConfig({
  optimizeDeps: {
    include: ['esm-env'],
  },
});
```

**Error message:** `Package '${pkg}' may need optimizeDeps.include for proper bundling`

**Tip:** `Add to optimizeDeps.include: ['${pkg}']`

**Severity:** warning

---

### 32. `vite-config/optimizeDeps-exclude-valid`

**What it catches:** Invalid exclude patterns

**Why:** Excluding framework packages causes issues

**Detection:** Excluding packages that should be bundled

```typescript
// ❌ Bad - excluding Svelte internals
export default defineConfig({
  optimizeDeps: {
    exclude: ['svelte', '@sveltejs/kit'],  // Don't exclude framework
  },
});

// ❌ Bad - excluding Vite internals
export default defineConfig({
  optimizeDeps: {
    exclude: ['vite'],
  },
});

// ✅ Good - exclude packages with native deps
export default defineConfig({
  optimizeDeps: {
    exclude: ['@node-rs/xxhash'],  // Native module
  },
});

// ✅ Good - exclude linked packages during dev
export default defineConfig({
  optimizeDeps: {
    exclude: ['@my-org/shared'],  // Linked workspace package
  },
});
```

**Error message:** `Don't exclude '${pkg}' from optimizeDeps`

**Tip:** `Remove '${pkg}' from exclude - it needs to be bundled`

**Severity:** error

---

### 33. `vite-config/optimizeDeps-esbuildOptions-deprecated`

**What it catches:** Using esbuildOptions in Vite 8+

**Why:** Vite 8 uses Rolldown instead of esbuild for optimization

**Detection:** `optimizeDeps.esbuildOptions` when Vite 8+ detected

```typescript
// ❌ Bad (Vite 8+) - deprecated
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
});

// ✅ Good (Vite 8+) - use rolldownOptions
export default defineConfig({
  optimizeDeps: {
    rolldownOptions: {
      // Rolldown-specific options
    },
  },
});

// ✅ Good (Vite 7) - esbuildOptions still valid
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
});
```

**Error message:** `optimizeDeps.esbuildOptions is deprecated in Vite 8 - use rolldownOptions`

**Tip:** `Migrate to optimizeDeps.rolldownOptions`

**Severity:** warning (Vite 8+)

---

### 34. `vite-config/optimizeDeps-force-dev-only`

**What it catches:** force: true in production config

**Why:** force re-bundles dependencies every time - slow for production

**Detection:** `optimizeDeps.force: true` outside dev-only context

```typescript
// ❌ Bad - force always on
export default defineConfig({
  optimizeDeps: {
    force: true,  // Slow, unnecessary for prod
  },
});

// ✅ Good - force only in specific situations
export default defineConfig(({ command }) => ({
  optimizeDeps: {
    force: command === 'serve' && process.env.FORCE_OPTIMIZE === 'true',
  },
}));

// ✅ Good - use CLI flag instead
// vite --force

// ✅ Good - temporary during debugging
export default defineConfig({
  optimizeDeps: {
    force: true,  // TODO: Remove after fixing dep issue
  },
});
```

**Error message:** `optimizeDeps.force should only be used temporarily for debugging`

**Tip:** `Use CLI flag 'vite --force' instead of config option`

**Severity:** warning

---

### 35. `vite-config/optimizeDeps-entries`

**What it catches:** Missing custom entries for complex setups

**Why:** Default entry detection may miss some imports

**Detection:** Non-standard project structure without custom entries

```typescript
// ⚠️ Info - consider custom entries if deps not optimized
export default defineConfig({
  optimizeDeps: {
    // Default uses index.html
  },
});

// ✅ Good - custom entries for library
export default defineConfig({
  optimizeDeps: {
    entries: [
      'src/**/*.ts',
      'src/**/*.vue',
    ],
  },
});

// ✅ Good - multiple HTML entry points
export default defineConfig({
  optimizeDeps: {
    entries: [
      'index.html',
      'admin/index.html',
    ],
  },
});
```

**Error message:** `Consider custom optimizeDeps.entries if dependencies not detected`

**Tip:** `Add entries for non-standard project structures`

**Severity:** info

---

### 36. `vite-config/optimizeDeps-needsInterop`

**What it catches:** Missing needsInterop for CJS packages

**Why:** Some packages need explicit interop configuration

**Detection:** Using known CJS packages without needsInterop

```typescript
// ⚠️ Warning - may need interop
export default defineConfig({
  // Using lodash but no interop configured
});

// ✅ Good - explicit interop
export default defineConfig({
  optimizeDeps: {
    needsInterop: ['lodash'],
  },
});
```

**Error message:** `Package '${pkg}' may need optimizeDeps.needsInterop`

**Tip:** `Add to needsInterop if you get CJS/ESM interop errors`

**Severity:** info

---

## Part 5: SSR Options

### 37. `vite-config/ssr-noExternal-cloudflare`

**What it catches:** Missing noExternal for Cloudflare Workers

**Why:** Cloudflare Workers need all dependencies bundled

**Detection:** Cloudflare adapter detected without proper noExternal

```typescript
// ❌ Bad - Cloudflare needs bundled deps
import cloudflare from '@sveltejs/adapter-cloudflare';

export default defineConfig({
  // No ssr.noExternal config
});

// ✅ Good - bundle all deps for Cloudflare
export default defineConfig({
  ssr: {
    noExternal: true,  // Bundle everything
  },
});

// ✅ Good - specific packages
export default defineConfig({
  ssr: {
    noExternal: ['@my-org/*', 'some-package'],
  },
});

// ✅ Good - with resolve for Cloudflare
export default defineConfig({
  ssr: {
    noExternal: true,
    target: 'webworker',
  },
  resolve: {
    conditions: ['workerd', 'worker', 'browser'],
  },
});
```

**Error message:** `Cloudflare Workers require ssr.noExternal for dependencies`

**Tip:** `Set ssr.noExternal: true or specific package patterns`

**Severity:** error

---

### 38. `vite-config/ssr-external-valid`

**What it catches:** Invalid SSR external patterns

**Why:** Invalid patterns cause SSR build failures

**Detection:** `ssr.external` with invalid glob or regex

```typescript
// ❌ Bad - invalid pattern
export default defineConfig({
  ssr: {
    external: ['**invalid**'],  // Invalid glob
  },
});

// ✅ Good - package names
export default defineConfig({
  ssr: {
    external: ['lodash', 'express'],
  },
});

// ✅ Good - glob pattern
export default defineConfig({
  ssr: {
    external: ['@my-org/*'],
  },
});

// ✅ Good - regex
export default defineConfig({
  ssr: {
    external: [/^@my-org\//],
  },
});
```

**Error message:** `Invalid ssr.external pattern '${pattern}'`

**Tip:** `Use package names, glob patterns, or RegExp`

**Severity:** error

---

### 39. `vite-config/ssr-target-valid`

**What it catches:** Invalid SSR target

**Why:** Only 'node' and 'webworker' are valid

**Detection:** `ssr.target` with invalid value

```typescript
// ❌ Bad - invalid target
export default defineConfig({
  ssr: {
    target: 'browser',  // Invalid
  },
});

// ✅ Good - Node.js target (default)
export default defineConfig({
  ssr: {
    target: 'node',
  },
});

// ✅ Good - Web Worker target (Cloudflare, Deno)
export default defineConfig({
  ssr: {
    target: 'webworker',
  },
});
```

**Error message:** `Invalid ssr.target '${target}'`

**Tip:** `Use: 'node' or 'webworker'`

**Severity:** error

---

### 40. `vite-config/ssr-resolve-conditions`

**What it catches:** Missing resolve conditions for SSR

**Why:** SSR may need different package entry points

**Detection:** SSR enabled without proper resolve conditions

```typescript
// ⚠️ Info - consider SSR resolve conditions
export default defineConfig({
  ssr: {
    target: 'webworker',
  },
  // No resolve.conditions for worker
});

// ✅ Good - Cloudflare Workers conditions
export default defineConfig({
  ssr: {
    target: 'webworker',
  },
  resolve: {
    conditions: ['workerd', 'worker', 'browser'],
  },
});

// ✅ Good - Node.js SSR conditions
export default defineConfig({
  ssr: {
    target: 'node',
  },
  resolve: {
    conditions: ['node', 'import'],
  },
});
```

**Error message:** `Consider resolve.conditions for SSR target '${target}'`

**Tip:** `Add resolve.conditions matching your SSR environment`

**Severity:** info

---

## Part 6: CSS Options

### 41. `vite-config/css-modules-scopeBehaviour`

**What it catches:** Invalid CSS modules scope behavior

**Why:** Invalid value causes CSS processing errors

**Detection:** `css.modules.scopeBehaviour` with invalid value

**Valid values:** `'global'`, `'local'`

```typescript
// ❌ Bad - invalid value
export default defineConfig({
  css: {
    modules: {
      scopeBehaviour: 'scoped',  // Invalid
    },
  },
});

// ✅ Good - local scope (default)
export default defineConfig({
  css: {
    modules: {
      scopeBehaviour: 'local',
    },
  },
});

// ✅ Good - global scope
export default defineConfig({
  css: {
    modules: {
      scopeBehaviour: 'global',
    },
  },
});
```

**Error message:** `Invalid css.modules.scopeBehaviour '${value}'`

**Tip:** `Use: 'global' or 'local'`

**Severity:** error

---

### 42. `vite-config/css-preprocessorOptions`

**What it catches:** Invalid CSS preprocessor options

**Why:** Wrong options cause CSS processing failures

**Detection:** Invalid options for preprocessor

```typescript
// ❌ Bad - wrong preprocessor key
export default defineConfig({
  css: {
    preprocessorOptions: {
      sass: {  // Should be 'scss'
        additionalData: `@use "@/styles/variables" as *;`,
      },
    },
  },
});

// ✅ Good - SCSS options
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;`,
        api: 'modern-compiler',  // Vite 7+ recommendation
      },
    },
  },
});

// ✅ Good - Less options
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        math: 'always',
        javascriptEnabled: true,
      },
    },
  },
});
```

**Error message:** `Invalid preprocessor key '${key}'`

**Tip:** `Use: 'scss', 'sass', 'less', or 'styl'`

**Severity:** error

---

### 43. `vite-config/css-devSourcemap`

**What it catches:** Missing CSS sourcemap config for dev

**Why:** CSS sourcemaps help debugging

**Detection:** No `css.devSourcemap` configuration

```typescript
// ⚠️ Info - consider CSS sourcemaps for debugging
export default defineConfig({
  css: {
    // devSourcemap defaults to false
  },
});

// ✅ Good - enable for dev
export default defineConfig({
  css: {
    devSourcemap: true,
  },
});
```

**Error message:** `Consider css.devSourcemap: true for CSS debugging`

**Tip:** `Set devSourcemap: true to see CSS source locations`

**Severity:** info

---

### 44. `vite-config/css-lightningcss`

**What it catches:** Missing Lightning CSS configuration in Vite 8

**Why:** Vite 8 defaults to Lightning CSS

**Detection:** CSS processing without Lightning CSS config in Vite 8+

```typescript
// ⚠️ Info (Vite 8+) - Lightning CSS is default
export default defineConfig({
  css: {
    // Lightning CSS is now default transformer
  },
});

// ✅ Good - Lightning CSS config
export default defineConfig({
  css: {
    lightningcss: {
      targets: {
        chrome: 111,
        firefox: 114,
        safari: 16,
      },
    },
  },
});

// ✅ Good - disable Lightning CSS (use PostCSS)
export default defineConfig({
  css: {
    transformer: 'postcss',
  },
});
```

**Error message:** `Consider configuring css.lightningcss for Vite 8`

**Tip:** `Configure Lightning CSS targets or use css.transformer: 'postcss'`

**Severity:** info

---

### 45. `vite-config/css-transformer-valid`

**What it catches:** Invalid CSS transformer

**Why:** Invalid transformer causes build failure

**Detection:** `css.transformer` with invalid value

**Valid values:** `'postcss'`, `'lightningcss'`

```typescript
// ❌ Bad - invalid transformer
export default defineConfig({
  css: {
    transformer: 'esbuild',  // Not a valid option
  },
});

// ✅ Good - PostCSS
export default defineConfig({
  css: {
    transformer: 'postcss',
  },
});

// ✅ Good - Lightning CSS
export default defineConfig({
  css: {
    transformer: 'lightningcss',
  },
});
```

**Error message:** `Invalid css.transformer '${value}'`

**Tip:** `Use: 'postcss' or 'lightningcss'`

**Severity:** error

---

## Part 7: Resolve Options

### 46. `vite-config/resolve-alias-format`

**What it catches:** Inconsistent alias format

**Why:** Different formats may cause resolution issues

**Detection:** Mix of string and object alias formats

```typescript
// ❌ Bad - mixed formats
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
      '~': { find: '~', replacement: '/src' },  // Inconsistent
    },
  },
});

// ✅ Good - object format
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
      '~': '/src/assets',
    },
  },
});

// ✅ Good - array format with find/replacement
export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: '/src' },
      { find: /^~(.*)$/, replacement: '/src/$1' },  // Regex
    ],
  },
});
```

**Error message:** `Use consistent alias format (all object or all array)`

**Tip:** `Use either object syntax or array with find/replacement`

**Severity:** warning

---

### 47. `vite-config/resolve-dedupe`

**What it catches:** Missing dedupe for monorepo

**Why:** Duplicate package instances cause issues

**Detection:** Monorepo without resolve.dedupe

```typescript
// ⚠️ Warning - monorepo may need dedupe
export default defineConfig({
  // No dedupe config in monorepo
});

// ✅ Good - dedupe framework packages
export default defineConfig({
  resolve: {
    dedupe: ['svelte', 'react', 'vue'],
  },
});

// ✅ Good - dedupe in monorepo
export default defineConfig({
  resolve: {
    dedupe: [
      'svelte',
      '@sveltejs/kit',
      'vite',
    ],
  },
});
```

**Error message:** `Consider resolve.dedupe for monorepo to prevent duplicate dependencies`

**Tip:** `Add framework packages to resolve.dedupe`

**Severity:** warning

---

### 48. `vite-config/resolve-conditions`

**What it catches:** Missing or invalid resolve conditions

**Why:** Conditions affect which package exports are used

**Detection:** Invalid condition strings

```typescript
// ❌ Bad - invalid condition
export default defineConfig({
  resolve: {
    conditions: ['esmodule'],  // Should be 'import'
  },
});

// ✅ Good - standard conditions
export default defineConfig({
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
  },
});

// ✅ Good - Cloudflare Workers
export default defineConfig({
  resolve: {
    conditions: ['workerd', 'worker', 'browser', 'import', 'default'],
  },
});

// ✅ Good - development condition
export default defineConfig(({ mode }) => ({
  resolve: {
    conditions: mode === 'development'
      ? ['development', 'import', 'module', 'browser', 'default']
      : ['import', 'module', 'browser', 'default'],
  },
}));
```

**Error message:** `Unknown resolve condition '${condition}'`

**Tip:** `Common conditions: import, require, browser, node, development, production`

**Severity:** warning

---

### 49. `vite-config/resolve-mainFields`

**What it catches:** Incorrect mainFields order

**Why:** Order affects which entry point is used

**Detection:** `mainFields` with unusual order

```typescript
// ⚠️ Warning - unusual order
export default defineConfig({
  resolve: {
    mainFields: ['main', 'module'],  // main before module
  },
});

// ✅ Good - ESM first
export default defineConfig({
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
  },
});

// ✅ Good - browser builds
export default defineConfig({
  resolve: {
    mainFields: ['browser', 'module', 'main'],
  },
});
```

**Error message:** `Consider 'module' before 'main' in mainFields for ESM priority`

**Tip:** `Use: ['module', 'jsnext:main', 'jsnext', 'main']`

**Severity:** info

---

### 50. `vite-config/resolve-extensions`

**What it catches:** Missing common extensions

**Why:** Missing extensions cause resolution failures

**Detection:** Custom `extensions` missing common types

```typescript
// ❌ Bad - missing .ts/.tsx
export default defineConfig({
  resolve: {
    extensions: ['.js', '.jsx'],  // Missing TypeScript
  },
});

// ✅ Good - include all relevant extensions
export default defineConfig({
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});

// ✅ Good - Svelte project
export default defineConfig({
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.svelte', '.json'],
  },
});
```

**Error message:** `resolve.extensions missing common extension '${ext}'`

**Tip:** `Include TypeScript extensions: .ts, .tsx, .mts`

**Severity:** warning

---

## Part 8: Worker Options

### 51. `vite-config/worker-format`

**What it catches:** Invalid worker format

**Why:** Invalid format causes worker build failure

**Detection:** `worker.format` with invalid value

**Valid values:** `'es'`, `'iife'`

```typescript
// ❌ Bad - invalid format
export default defineConfig({
  worker: {
    format: 'cjs',  // Not supported for workers
  },
});

// ✅ Good - ES modules (default)
export default defineConfig({
  worker: {
    format: 'es',
  },
});

// ✅ Good - IIFE for broader compatibility
export default defineConfig({
  worker: {
    format: 'iife',
  },
});
```

**Error message:** `Invalid worker.format '${format}'`

**Tip:** `Use: 'es' or 'iife'`

**Severity:** error

---

### 52. `vite-config/worker-plugins`

**What it catches:** Missing worker-specific plugins

**Why:** Workers may need separate plugin configuration

**Detection:** Worker build without dedicated plugins array

```typescript
// ⚠️ Info - consider worker-specific plugins
export default defineConfig({
  plugins: [svelte()],
  worker: {
    // Uses main plugins by default
  },
});

// ✅ Good - worker-specific plugins
export default defineConfig({
  plugins: [svelte()],
  worker: {
    plugins: () => [
      // Worker-specific plugins
    ],
  },
});
```

**Error message:** `Consider worker.plugins for worker-specific configuration`

**Tip:** `Use worker.plugins if workers need different plugin config`

**Severity:** info

---

### 53. `vite-config/worker-rollupOptions-deprecated`

**What it catches:** Using rollupOptions for workers in Vite 8+

**Why:** Renamed to rolldownOptions in Vite 8

**Detection:** `worker.rollupOptions` when Vite 8+ detected

```typescript
// ❌ Bad (Vite 8+) - deprecated
export default defineConfig({
  worker: {
    rollupOptions: {
      output: {
        entryFileNames: 'worker-[name].js',
      },
    },
  },
});

// ✅ Good (Vite 8+) - use rolldownOptions
export default defineConfig({
  worker: {
    rolldownOptions: {
      output: {
        entryFileNames: 'worker-[name].js',
      },
    },
  },
});
```

**Error message:** `worker.rollupOptions is deprecated in Vite 8 - use rolldownOptions`

**Tip:** `Rename rollupOptions to rolldownOptions`

**Severity:** warning (Vite 8+)

---

## Part 9: Environment Options (Vite 6+)

### 54. `vite-config/environments-config`

**What it catches:** Invalid environments configuration

**Why:** Environments API requires specific structure

**Detection:** Invalid environments object

```typescript
// ❌ Bad - invalid environment config
export default defineConfig({
  environments: {
    client: 'browser',  // Should be object
  },
});

// ✅ Good - environment configuration
export default defineConfig({
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
      },
    },
    server: {
      build: {
        outDir: 'dist/server',
        ssr: true,
      },
    },
  },
});
```

**Error message:** `Invalid environments configuration`

**Tip:** `Each environment must be an object with valid options`

**Severity:** error

---

### 55. `vite-config/environments-build`

**What it catches:** Environment build configuration issues

**Why:** Environment builds have specific requirements

**Detection:** Environment build config without proper output settings

```typescript
// ⚠️ Warning - environments may conflict
export default defineConfig({
  environments: {
    client: {
      build: {
        outDir: 'dist',
      },
    },
    server: {
      build: {
        outDir: 'dist',  // Same as client!
      },
    },
  },
});

// ✅ Good - separate output directories
export default defineConfig({
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
      },
    },
    server: {
      build: {
        outDir: 'dist/server',
      },
    },
  },
});
```

**Error message:** `Environment build outputs should be separate`

**Tip:** `Use different outDir for each environment`

**Severity:** warning

---

## Part 10: Framework Integration

### 56. `vite-config/sveltekit-plugin`

**What it catches:** SvelteKit without sveltekit() plugin

**Why:** SvelteKit requires its Vite plugin

**Detection:** SvelteKit project without @sveltejs/kit/vite plugin

```typescript
// ❌ Bad - SvelteKit project without plugin
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],  // Wrong plugin for SvelteKit
});

// ✅ Good - SvelteKit plugin
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
});
```

**Error message:** `SvelteKit project should use sveltekit() plugin from '@sveltejs/kit/vite'`

**Tip:** `Import sveltekit from '@sveltejs/kit/vite' instead of svelte from '@sveltejs/vite-plugin-svelte'`

**Severity:** error

---

### 57. `vite-config/svelte-preprocess`

**What it catches:** Svelte without preprocessor configuration

**Why:** TypeScript/SCSS need vitePreprocess

**Detection:** Svelte using TS/SCSS without vitePreprocess

```typescript
// ❌ Bad - TypeScript without preprocess
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],  // No preprocess for TypeScript
});

// ✅ Good - with vitePreprocess
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
    }),
  ],
});

// ✅ Good - SvelteKit handles this automatically
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],  // Includes vitePreprocess
});
```

**Error message:** `Svelte with TypeScript needs vitePreprocess configuration`

**Tip:** `Add preprocess: vitePreprocess() to svelte() plugin options`

**Severity:** warning

---

### 58. `vite-config/no-conflicting-frameworks`

**What it catches:** Multiple framework plugins

**Why:** Can't have React and Vue plugins in same config

**Detection:** Multiple framework plugins in plugins array

```typescript
// ❌ Bad - multiple frameworks
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [react(), vue()],  // Can't use both!
});

// ❌ Bad - Svelte and React
import { svelte } from '@sveltejs/vite-plugin-svelte';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [svelte(), react()],
});

// ✅ Good - single framework
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
```

**Error message:** `Multiple framework plugins detected: ${frameworks}`

**Tip:** `Use only one framework plugin per Vite config`

**Severity:** error

---

### 59. `vite-config/cloudflare-adapter-config`

**What it catches:** Cloudflare adapter without proper Vite config

**Why:** Cloudflare needs specific SSR and resolve settings

**Detection:** Cloudflare adapter without corresponding Vite config

```typescript
// ❌ Bad - Cloudflare adapter without Vite SSR config
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Missing SSR config for Cloudflare
});

// ✅ Good - Cloudflare-compatible config
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: true,
    target: 'webworker',
  },
  resolve: {
    conditions: ['workerd', 'worker', 'browser'],
  },
});
```

**Error message:** `Cloudflare adapter needs SSR configuration in Vite config`

**Tip:** `Add ssr.noExternal: true and resolve.conditions for Cloudflare`

**Severity:** warning

---

## Part 11: Vite 7/8 Migration

### 60. `vite-config/node-version-requirement`

**What it catches:** Vite 7+ without required Node.js version

**Why:** Vite 7 requires Node.js 20.19+ or 22.12+

**Detection:** package.json engines or .nvmrc with incompatible version

```json
// ❌ Bad - package.json
{
  "engines": {
    "node": ">=18"  // Vite 7 needs 20.19+
  }
}

// ✅ Good - package.json
{
  "engines": {
    "node": ">=20.19 || >=22.12"
  }
}
```

**Error message:** `Vite 7+ requires Node.js 20.19+ or 22.12+`

**Tip:** `Update engines in package.json and .nvmrc`

**Severity:** error

---

### 61. `vite-config/esbuild-to-rolldown`

**What it catches:** esbuild options that need migration to Rolldown

**Why:** Vite 8 uses Rolldown instead of esbuild

**Detection:** esbuild-specific options in Vite 8+ config

```typescript
// ❌ Bad (Vite 8+) - esbuild options
export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
});

// ✅ Good (Vite 8+) - equivalent in Rolldown
export default defineConfig({
  // JSX handled differently in Rolldown
  build: {
    rolldownOptions: {
      // Rolldown-specific JSX config
    },
  },
});
```

**Error message:** `esbuild options may need migration for Vite 8`

**Tip:** `Check Vite 8 migration guide for esbuild to Rolldown equivalents`

**Severity:** warning (Vite 8+)

---

### 62. `vite-config/rollup-to-rolldown`

**What it catches:** Rollup-specific options in Vite 8

**Why:** Rolldown has different API than Rollup

**Detection:** Rollup-specific options or plugins in Vite 8+ config

```typescript
// ⚠️ Warning (Vite 8+) - check Rollup plugin compatibility
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  plugins: [commonjs()],  // May need Rolldown equivalent
});

// ✅ Good (Vite 8+) - built-in handling
export default defineConfig({
  // Rolldown handles CJS conversion internally
});
```

**Error message:** `Rollup plugin '${name}' may need Rolldown equivalent in Vite 8`

**Tip:** `Check if Rollup plugin has Rolldown support or built-in replacement`

**Severity:** warning (Vite 8+)

---

### 63. `vite-config/baseline-target`

**What it catches:** Not using baseline target in Vite 7+

**Why:** baseline-widely-available is new recommended target

**Detection:** Using old 'modules' target in Vite 7+

```typescript
// ⚠️ Info (Vite 7+) - new default target
export default defineConfig({
  build: {
    target: 'modules',  // Old default
  },
});

// ✅ Good (Vite 7+) - baseline target
export default defineConfig({
  build: {
    target: 'baseline-widely-available',
  },
});
```

**Error message:** `Consider 'baseline-widely-available' target (Vite 7+ recommended)`

**Tip:** `baseline-widely-available auto-updates to match Baseline Widely Available browsers`

**Severity:** info

---

### 64. `vite-config/legacy-browser-support`

**What it catches:** Missing legacy plugin for old browser support

**Why:** @vitejs/plugin-legacy needed for older browsers

**Detection:** ES5/ES6 target without legacy plugin

```typescript
// ❌ Bad - trying to target old browsers without plugin
export default defineConfig({
  build: {
    target: 'es2015',  // Needs legacy plugin for IE11
  },
});

// ✅ Good - with legacy plugin
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
});
```

**Error message:** `Legacy browser support requires @vitejs/plugin-legacy`

**Tip:** `Install and configure @vitejs/plugin-legacy for older browsers`

**Severity:** warning

---

## Part 12: Security & Best Practices

### 65. `vite-config/no-env-exposure`

**What it catches:** Exposing sensitive env vars to client

**Why:** VITE_ prefixed vars are exposed to client code

**Detection:** Sensitive env vars with VITE_ prefix

```typescript
// ❌ Bad - exposing secret
// .env
VITE_API_SECRET=secret123  // Exposed to client!
VITE_DATABASE_URL=postgres://...  // Exposed!

// ✅ Good - keep secrets server-side
// .env
API_SECRET=secret123  // Not exposed (no VITE_ prefix)
DATABASE_URL=postgres://...

// .env
VITE_API_URL=https://api.example.com  // OK to expose
VITE_APP_NAME=MyApp  // OK to expose
```

**Error message:** `VITE_${name} exposes '${name}' to client - verify not sensitive`

**Tip:** `Remove VITE_ prefix from sensitive variables`

**Severity:** warning

---

### 66. `vite-config/define-stringify`

**What it catches:** Define values not properly stringified

**Why:** Define does string replacement - needs JSON.stringify for strings

**Detection:** String values in `define` not using JSON.stringify

```typescript
// ❌ Bad - string not stringified
export default defineConfig({
  define: {
    __APP_VERSION__: '1.0.0',  // Becomes: const v = 1.0.0 (error!)
  },
});

// ❌ Bad - object not stringified
export default defineConfig({
  define: {
    __CONFIG__: { api: 'url' },  // Won't work
  },
});

// ✅ Good - JSON.stringify
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),  // Becomes: const v = "1.0.0"
    __CONFIG__: JSON.stringify({ api: 'url' }),
  },
});

// ✅ Good - booleans and numbers don't need stringify
export default defineConfig({
  define: {
    __DEV__: true,
    __VERSION_NUMBER__: 1,
  },
});
```

**Error message:** `define values should use JSON.stringify for strings and objects`

**Tip:** `Use JSON.stringify(value) for strings and objects in define`

**Severity:** error

---

### 67. `vite-config/no-eval-sourcemap`

**What it catches:** eval sourcemaps in production

**Why:** eval sourcemaps are insecure for production

**Detection:** sourcemap set to 'eval' or similar in production config

```typescript
// ❌ Bad - eval sourcemap in production
export default defineConfig({
  build: {
    sourcemap: 'inline',  // Exposes source in production
  },
});

// ✅ Good - hidden sourcemap for production
export default defineConfig({
  build: {
    sourcemap: 'hidden',  // Upload to error tracking
  },
});

// ✅ Good - conditional
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode === 'production' ? 'hidden' : true,
  },
}));
```

**Error message:** `Avoid inline/eval sourcemaps in production`

**Tip:** `Use sourcemap: 'hidden' for production error tracking`

**Severity:** warning

---

### 68. `vite-config/clearScreen`

**What it catches:** Missing clearScreen preference

**Why:** Some developers prefer not clearing screen

**Detection:** No clearScreen config

```typescript
// ⚠️ Info - consider clearScreen preference
export default defineConfig({
  // clearScreen defaults to true
});

// ✅ Good - explicit preference
export default defineConfig({
  clearScreen: false,  // Keep previous output
});
```

**Error message:** `Consider clearScreen: false to preserve terminal output`

**Tip:** `Set clearScreen: false to keep terminal history`

**Severity:** info

---

### 69. `vite-config/logLevel`

**What it catches:** Verbose logging in production

**Why:** Excessive logging slows build and clutters output

**Detection:** `logLevel: 'info'` or higher in production config

```typescript
// ⚠️ Info - consider log level
export default defineConfig({
  logLevel: 'info',  // Default, may be verbose
});

// ✅ Good - reduce noise
export default defineConfig(({ mode }) => ({
  logLevel: mode === 'production' ? 'warn' : 'info',
}));

// ✅ Good - silent for CI
export default defineConfig({
  logLevel: process.env.CI ? 'silent' : 'info',
});
```

**Error message:** `Consider logLevel: 'warn' for cleaner output`

**Tip:** `Set logLevel: 'warn' or 'error' for production builds`

**Severity:** info

---

## Part 13: Additional Options

### 70. `vite-config/json-stringify`

**What it catches:** Missing JSON stringify optimization

**Why:** JSON imports can be optimized for named exports

**Detection:** JSON imports without json.stringify config

```typescript
// ⚠️ Info - consider JSON optimization
export default defineConfig({
  // Default JSON handling
});

// ✅ Good - optimize JSON
export default defineConfig({
  json: {
    stringify: true,  // Better tree-shaking
  },
});

// ✅ Good - named exports from JSON
export default defineConfig({
  json: {
    namedExports: true,  // import { key } from './data.json'
    stringify: true,
  },
});
```

**Error message:** `Consider json.stringify for better JSON import optimization`

**Tip:** `Set json: { stringify: true } for better tree-shaking`

**Severity:** info

---

### 71. `vite-config/assetsInclude`

**What it catches:** Custom assets not included

**Why:** Non-standard assets need explicit inclusion

**Detection:** Importing custom file types without assetsInclude

```typescript
// ⚠️ Info - may need assetsInclude
// If importing .glb, .hdr, etc.
export default defineConfig({
  // Default only includes common assets
});

// ✅ Good - include custom asset types
export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.hdr', '**/*.gltf'],
});
```

**Error message:** `Consider assetsInclude for custom asset types`

**Tip:** `Add custom patterns to assetsInclude`

**Severity:** info

---

### 72. `vite-config/publicDir`

**What it catches:** publicDir conflicts

**Why:** publicDir files are copied as-is, may conflict

**Detection:** publicDir pointing to src or other source directory

```typescript
// ❌ Bad - publicDir is source
export default defineConfig({
  publicDir: 'src/assets',  // Source files copied raw!
});

// ✅ Good - dedicated public directory
export default defineConfig({
  publicDir: 'public',
});

// ✅ Good - static directory
export default defineConfig({
  publicDir: 'static',
});

// ✅ Good - disable if using assets import
export default defineConfig({
  publicDir: false,
});
```

**Error message:** `publicDir should not be a source directory`

**Tip:** `Use dedicated 'public' or 'static' directory`

**Severity:** warning

---

### 73. `vite-config/cacheDir`

**What it catches:** cacheDir in source control

**Why:** Cache should be gitignored

**Detection:** cacheDir not in typical ignored location

```typescript
// ⚠️ Warning - ensure cacheDir is gitignored
export default defineConfig({
  cacheDir: '.cache',  // Make sure this is in .gitignore
});

// ✅ Good - default location (node_modules/.vite)
export default defineConfig({
  // Uses node_modules/.vite by default
});

// ✅ Good - explicit in gitignored location
export default defineConfig({
  cacheDir: 'node_modules/.vite',
});
```

**Error message:** `Ensure cacheDir '${dir}' is in .gitignore`

**Tip:** `Use default or add custom cacheDir to .gitignore`

**Severity:** info

---

### 74. `vite-config/appType`

**What it catches:** Wrong appType for project

**Why:** appType affects HTML handling and middleware

**Detection:** `appType` mismatch with project structure

**Valid values:** `'spa'`, `'mpa'`, `'custom'`

```typescript
// ❌ Bad - SPA type for MPA project
// (Multiple HTML entry points but using spa)
export default defineConfig({
  appType: 'spa',
});

// ✅ Good - match project type
export default defineConfig({
  appType: 'spa',  // Single index.html
});

// ✅ Good - MPA
export default defineConfig({
  appType: 'mpa',  // Multiple HTML files
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin/index.html',
      },
    },
  },
});

// ✅ Good - custom for SSR
export default defineConfig({
  appType: 'custom',  // SSR app
});
```

**Error message:** `appType '${type}' may not match project structure`

**Tip:** `Use 'spa' for single HTML, 'mpa' for multiple, 'custom' for SSR`

**Severity:** warning

---

### 75-87. Additional Rules

### 75. `vite-config/preview-port`

Same pattern as server.port for preview configuration.

### 76. `vite-config/preview-host`

Same pattern as server.host for preview configuration.

### 77. `vite-config/preview-cors`

Same pattern as server.cors for preview configuration.

### 78. `vite-config/envDir`

Ensure envDir exists and contains .env files.

### 79. `vite-config/envPrefix`

Validate envPrefix is string or array of strings.

### 80. `vite-config/html-minify`

Consider HTML minification for production.

### 81. `vite-config/experimental-warning`

Warn about experimental features that may change.

### 82. `vite-config/future-deprecation-warning`

Warn about deprecated features being removed.

### 83. `vite-config/plugin-return-type`

Ensure plugins return valid plugin objects.

### 84. `vite-config/test-config-separate`

Recommend separate vitest.config.ts for Vitest.

### 85. `vite-config/build-assetsDir`

Validate assetsDir format.

### 86. `vite-config/build-assetsInlineLimit`

Reasonable inline limit for performance.

### 87. `vite-config/server-middlewareMode`

Validate middleware mode usage.

---

## Detection Helpers

For Vite config rules, the linter needs:

1. **Parse JS/TS config** - oxc-parser handles this
2. **Detect Vite version** - From package.json dependencies
3. **Detect framework** - From plugin imports
4. **Validate option values** - Against known valid values
5. **Cross-reference** - With package.json engines, .nvmrc

### Known Framework Plugins

```typescript
const FRAMEWORK_PLUGINS = {
  '@sveltejs/vite-plugin-svelte': 'svelte',
  '@sveltejs/kit/vite': 'sveltekit',
  '@vitejs/plugin-react': 'react',
  '@vitejs/plugin-react-swc': 'react',
  '@vitejs/plugin-vue': 'vue',
  '@vitejs/plugin-vue-jsx': 'vue',
  'astro': 'astro',
};

const VALID_BUILD_TARGETS = [
  'modules',
  'esnext',
  'baseline-widely-available',
  ...Array.from({ length: 10 }, (_, i) => `es${2015 + i}`),
];

const VALID_LIB_FORMATS = ['es', 'cjs', 'umd', 'iife'];

const VALID_WORKER_FORMATS = ['es', 'iife'];
```

---

## Summary

| Category | Rule Count | Severity Mix |
|----------|------------|--------------|
| Core Configuration | 10 | 4 error, 3 warning, 3 info |
| Build Options | 12 | 6 error, 3 warning, 3 info |
| Server Options | 8 | 3 error, 3 warning, 2 info |
| Dependency Optimization | 6 | 1 error, 3 warning, 2 info |
| SSR Options | 4 | 2 error, 1 warning, 1 info |
| CSS Options | 5 | 3 error, 0 warning, 2 info |
| Resolve Options | 5 | 0 error, 3 warning, 2 info |
| Worker Options | 3 | 1 error, 1 warning, 1 info |
| Environment Options | 2 | 1 error, 1 warning, 0 info |
| Framework Integration | 4 | 2 error, 2 warning, 0 info |
| Vite 7/8 Migration | 5 | 1 error, 3 warning, 1 info |
| Security & Best Practices | 5 | 1 error, 2 warning, 2 info |
| Additional Options | 18 | 2 error, 4 warning, 12 info |

**Total: 87 rules**

- **Errors:** 27 (must fix)
- **Warnings:** 29 (should fix)
- **Info:** 31 (consider/optional)

Sources:
- [Vite 7.0 Release](https://vite.dev/blog/announcing-vite7)
- [Vite 8 Beta Announcement](https://vite.dev/blog/announcing-vite8-beta)
- [Vite Migration from v7](https://main.vite.dev/guide/migration)
- [Vite Breaking Changes](https://vite.dev/changes/)
