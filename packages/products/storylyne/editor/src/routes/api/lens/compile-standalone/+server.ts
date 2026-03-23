/**
 * Compile Standalone HTML API — Svelte Compiler + esbuild Bundle + Tailwind CSS
 *
 * Server route that compiles a Svelte component into a fully self-contained,
 * interactive HTML file. The output includes compiled JS (Svelte runtime +
 * component code), Tailwind CSS (only the classes used by the component),
 * and theme custom properties — all inlined into a single HTML document.
 *
 * Pipeline:
 * 1. Read `.svelte` source + recursively resolve internal `@/ui/*` imports
 * 2. Compile each `.svelte` file via `svelte/compiler` (`generate: 'client'`)
 * 3. Bundle all compiled JS + Svelte runtime via esbuild `build()` (IIFE, single file)
 * 4. Extract Tailwind class candidates from all sources → generate CSS via `tailwindcss` compile API
 * 5. Assemble self-contained HTML document with inlined JS, CSS, and theme vars
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str, Bool } from '@/schemas/common';
import { compile as svelteCompile, compileModule as svelteCompileModule } from 'svelte/compiler';
import { build as esbuildBuild } from 'esbuild';
import { compile as tailwindCompile } from '@tailwindcss/node';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/*  Resolve workspace paths                                            */
/* ------------------------------------------------------------------ */

/**
 * Resolve the absolute path to `packages/shared/ui/src/` from the project root.
 *
 * @returns Absolute path to the UI source directory
 */
function resolveUiSrcDir(): Str {
  const currentDir: Str = dirname(fileURLToPath(import.meta.url)) as Str;
  let dir: Str = currentDir;
  for (let i: Num = 0 as Num; i < 20; i++) {
    try {
      statSync(join(dir, 'pnpm-workspace.yaml'));
      return join(dir, 'packages', 'shared', 'ui', 'src') as Str;
    } catch {
      /* Not the root yet — continue walking up */
      dir = dirname(dir) as Str;
    }
  }
  return resolve(currentDir, '..', '..', '..', '..', '..', '..', 'shared', 'ui', 'src') as Str;
}

/**
 * Resolve the absolute path to the editor `src/` directory.
 *
 * @returns Absolute path to the editor source directory
 */
function resolveEditorSrcDir(): Str {
  const currentDir: Str = dirname(fileURLToPath(import.meta.url)) as Str;
  let dir: Str = currentDir;
  for (let i: Num = 0 as Num; i < 20; i++) {
    try {
      statSync(join(dir, 'pnpm-workspace.yaml'));
      return join(dir, 'packages', 'products', 'storylyne', 'editor', 'src') as Str;
    } catch {
      /* Not the root yet — continue walking up */
      dir = dirname(dir) as Str;
    }
  }
  return resolve(currentDir, '..', '..', '..', '..') as Str;
}

/* ------------------------------------------------------------------ */
/*  File discovery & reading                                           */
/* ------------------------------------------------------------------ */

/**
 * Recursively collect all `.svelte` and `.ts`/`.js` files that a component
 * directory depends on within `@/ui/`. Returns a map of absolute path → source.
 *
 * @param componentDir - Component directory name (e.g. 'button')
 * @param uiSrcDir - Absolute path to the UI source root
 * @returns Map of file paths to their source contents
 */
function collectComponentSources(componentDir: Str, uiSrcDir: Str): Map<Str, Str> {
  const sources: Map<Str, Str> = new Map();
  const queue: Str[] = [join(uiSrcDir, componentDir) as Str];
  const visited: Set<Str> = new Set();

  while (queue.length > 0) {
    const dir: Str | undefined = queue.shift();
    if (!dir) continue;
    if (visited.has(dir)) continue;
    visited.add(dir);

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      /* Directory doesn't exist — skip */
      continue;
    }

    for (const entry of entries) {
      const filePath: Str = join(dir, entry) as Str;
      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          // Skip examples/ subdirectory — not needed for standalone build
          if (entry !== 'examples' && entry !== 'node_modules') {
            queue.push(filePath as Str);
          }
          continue;
        }
      } catch {
        /* Stat failed — skip */
        continue;
      }

      // Collect .svelte, .ts, .js files
      if (entry.endsWith('.svelte') || entry.endsWith('.ts') || entry.endsWith('.js')) {
        try {
          sources.set(filePath as Str, readFileSync(filePath, 'utf8') as Str);
        } catch {
          /* Read failed — skip */
        }
      }
    }

    // Scan sources for ../sibling-dir/ imports to also collect dependencies
    for (const [, src] of sources) {
      const importMatches: RegExpMatchArray[] = [
        ...src.matchAll(/from\s+['"]\.\.\/([^/'"\s]+)\//g),
        ...src.matchAll(/from\s+['"]\.\/([^/'"\s]+)\//g),
      ];
      for (const match of importMatches) {
        const siblingDir: Str = join(uiSrcDir, match[1]) as Str;
        if (!visited.has(siblingDir)) {
          queue.push(siblingDir);
        }
      }
    }
  }

  return sources;
}

/* ------------------------------------------------------------------ */
/*  Tailwind CSS extraction                                            */
/* ------------------------------------------------------------------ */

/**
 * Extract Tailwind CSS class candidates from source code.
 * Uses a simple regex to find all potential class-like strings.
 *
 * @param sources - Map of file paths to source contents
 * @returns Array of candidate class strings
 */
function extractCandidates(sources: Map<Str, Str>): Str[] {
  const candidates: Set<Str> = new Set();
  // Regex: match potential Tailwind classes (alphanumeric, hyphens, colons, slashes, brackets, dots)
  const classRegex: RegExp = /(?:class[=:]\s*["'`{]|@apply\s+)([^"'`}]+)/g;
  const tokenRegex: RegExp = /[a-zA-Z0-9_\-:.!/[\]]+/g;

  for (const [, source] of sources) {
    // Extract from class attributes and @apply directives
    let match: RegExpExecArray | null;
    classRegex.lastIndex = 0;
    match = classRegex.exec(source);
    while (match !== null) {
      const classStr: Str = match[1] as Str;
      let token: RegExpExecArray | null;
      tokenRegex.lastIndex = 0;
      token = tokenRegex.exec(classStr);
      while (token !== null) {
        candidates.add(token[0] as Str);
        token = tokenRegex.exec(classStr);
      }
      match = classRegex.exec(source);
    }

    // Also do a broad scan for Tailwind-looking tokens in template strings, cn() calls, etc.
    const broadRegex: RegExp = /\b([a-z][a-z0-9]*(?:-[a-z0-9/[\].]+)*(?:\/[a-z0-9]+)?)\b/g;
    broadRegex.lastIndex = 0;
    match = broadRegex.exec(source);
    while (match !== null) {
      candidates.add(match[1] as Str);
      match = broadRegex.exec(source);
    }
  }

  return [...candidates] as Str[];
}

/**
 * Generate Tailwind CSS for the given candidates using the project's app.css config.
 *
 * @param candidates - Array of class name candidates
 * @param editorSrcDir - Path to editor src/ directory
 * @returns Generated CSS string
 */
async function generateTailwindCss(candidates: Str[], editorSrcDir: Str): Promise<Str> {
  // Read app.css for the Tailwind config (theme, custom variants, etc.)
  let appCss: Str;
  try {
    appCss = readFileSync(join(editorSrcDir, 'app.css'), 'utf8') as Str;
  } catch {
    /* Can't read app.css — return empty */
    return '' as Str;
  }

  // Strip @source and @import 'tw-animate-css' — we handle sources manually
  // Keep @import 'tailwindcss', @custom-variant, @theme, :root, .dark, etc.
  const cleanedCss: Str = appCss
    .replaceAll(/@source\s+['"][^'"]+['"];?\s*/g, '')
    .replaceAll(/@import\s+['"]tw-animate-css['"];?\s*/g, '') as Str;

  try {
    const compiled = await tailwindCompile(cleanedCss, {
      base: editorSrcDir,
      onDependency: () => {
        /* standalone build — no need to track file dependencies */
      },
    });
    const css: Str = compiled.build(candidates) as Str;

    // If not dark mode, strip .dark { ... } blocks to reduce size
    // (keeping them doesn't hurt but is unnecessary)
    return css;
  } catch {
    /* Tailwind compilation failed — return the raw theme vars as fallback */
    const fallback: Str[] = [];
    // Extract :root and .dark blocks from app.css as minimum viable CSS
    const blockRegex: RegExp = /(:root|\.dark)\s*\{[^}]+\}/g;
    let blockMatch: RegExpExecArray | null;
    blockRegex.lastIndex = 0;
    blockMatch = blockRegex.exec(appCss);
    while (blockMatch !== null) {
      fallback.push(blockMatch[0]);
      blockMatch = blockRegex.exec(appCss);
    }
    return fallback.join('\n') as Str;
  }
}

/* ------------------------------------------------------------------ */
/*  Workspace alias resolution                                         */
/* ------------------------------------------------------------------ */

/** Exact `@/` alias → filesystem path mappings (from root tsconfig.json). */
const EXACT_ALIASES: ReadonlyArray<[Str, Str]> = [
  ['@/schemas/common' as Str, 'packages/shared/schemas/common/src/index.ts' as Str],
  ['@/schemas/result' as Str, 'packages/shared/schemas/result/src/result.ts' as Str],
  ['@/schemas/function' as Str, 'packages/shared/schemas/function/src/function.ts' as Str],
  ['@/utils/core' as Str, 'packages/shared/utils/core/src/index.ts' as Str],
  ['@/ui' as Str, 'packages/shared/ui/src/index.ts' as Str],
  ['@/locale/svelte' as Str, 'packages/shared/locale/src/svelte.svelte.ts' as Str],
  ['@/test-presets/harness' as Str, 'packages/shared/config/test/src/harness/index.ts' as Str],
];

/** Wildcard `@/` alias prefix → filesystem prefix mappings. */
const WILDCARD_ALIASES: ReadonlyArray<[Str, Str]> = [
  ['@/schemas/result/' as Str, 'packages/shared/schemas/result/src/' as Str],
  ['@/schemas/function/' as Str, 'packages/shared/schemas/function/src/' as Str],
  ['@/schemas/generic/' as Str, 'packages/shared/schemas/generic/src/' as Str],
  ['@/utils/result/' as Str, 'packages/shared/utils/result/src/' as Str],
  ['@/utils/core/' as Str, 'packages/shared/utils/core/src/' as Str],
  ['@/locale/' as Str, 'packages/shared/locale/src/' as Str],
  ['@/test-presets/harness/' as Str, 'packages/shared/config/test/src/harness/' as Str],
  ['@/test-presets/' as Str, 'packages/shared/config/test/src/' as Str],
  ['@/ui/' as Str, 'packages/shared/ui/src/' as Str],
];

/**
 * Resolve a `@/` prefixed import to an absolute filesystem path using
 * the workspace's tsconfig path mappings.
 *
 * @param importPath - The import specifier (e.g. `@/schemas/common`)
 * @param workspaceRoot - Absolute path to the monorepo root
 * @returns Resolved absolute path, or `undefined` if not a known alias
 */
function resolveWorkspaceAlias(importPath: Str, workspaceRoot: Str): Str | undefined {
  // Check exact matches first
  for (const [alias, target] of EXACT_ALIASES) {
    if (importPath === alias) {
      return join(workspaceRoot, target) as Str;
    }
  }

  // Check wildcard prefix matches
  for (const [prefix, targetPrefix] of WILDCARD_ALIASES) {
    if (importPath.startsWith(prefix)) {
      const rest: Str = importPath.slice(prefix.length) as Str;
      const basePath: Str = join(workspaceRoot, targetPrefix, rest) as Str;

      // Try with .ts extension first (most tsconfig wildcards map to *.ts)
      const withTs: Str = `${basePath}.ts` as Str;
      try {
        statSync(withTs);
        return withTs;
      } catch {
        /* Not a .ts file — try other extensions */
      }

      // Try as-is (could be .svelte, .js, or exact path)
      try {
        statSync(basePath);
        return basePath;
      } catch {
        /* Not found — try index */
      }

      // Try index.ts / index.js
      for (const indexFile of ['index.ts', 'index.js']) {
        const indexPath: Str = join(basePath, indexFile) as Str;
        try {
          statSync(indexPath);
          return indexPath;
        } catch {
          /* Not found — try next */
        }
      }

      // Return with .ts as best guess — let esbuild surface the error if wrong
      return withTs;
    }
  }

  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Svelte compilation + esbuild bundling                              */
/* ------------------------------------------------------------------ */

/**
 * Compile a single `.svelte` file to client-side JavaScript.
 *
 * @param source - Svelte source code
 * @param filename - File name for error messages
 * @returns Compiled JavaScript code
 */
function compileSvelteFile(source: Str, filename: Str): Str {
  const result = svelteCompile(source, {
    generate: 'client',
    filename,
    css: 'injected',
  });
  return result.js.code as Str;
}

/**
 * Bundle all component JS into a single IIFE using esbuild.
 * Resolves internal `@/ui/*` imports, `../sibling/` imports, and npm packages.
 *
 * @param entryCode - The entry point JS code (compiled main component + mount)
 * @param compiledFiles - Map of virtual path → compiled JS for internal files
 * @param uiSrcDir - Absolute path to UI source root
 * @param componentDir - Main component directory name
 * @returns Bundled JavaScript string
 */
async function bundleWithEsbuild(
  entryCode: Str,
  compiledFiles: Map<Str, Str>,
  uiSrcDir: Str,
  componentDir: Str,
): Promise<Str> {
  const result = await esbuildBuild({
    stdin: {
      contents: entryCode,
      resolveDir: join(uiSrcDir, componentDir),
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    platform: 'browser',
    target: 'es2022',
    plugins: [
      {
        name: 'svelte-ui-resolver',
        setup(build) {
          const workspaceRoot: Str = resolve(uiSrcDir, '..', '..', '..', '..') as Str;

          // Resolve @/ workspace aliases (e.g., @/schemas/common → packages/shared/...)
          build.onResolve({ filter: /^@\// }, (args) => {
            const resolved: Str | undefined = resolveWorkspaceAlias(
              args.path as Str,
              workspaceRoot,
            );
            if (resolved) {
              if (compiledFiles.has(resolved)) {
                return { path: resolved, namespace: 'svelte-compiled' };
              }
              return { path: resolved };
            }
          });

          // Resolve compiled .svelte files
          build.onResolve({ filter: /\.svelte$/ }, (args) => {
            const resolved: Str = resolve(args.resolveDir, args.path) as Str;
            if (compiledFiles.has(resolved)) {
              return { path: resolved, namespace: 'svelte-compiled' };
            }
          });

          // Resolve .js/.ts imports from UI source tree
          build.onResolve({ filter: /^\.\.?\// }, (args) => {
            // Try exact path first, then with extensions
            const base: Str = resolve(args.resolveDir, args.path) as Str;
            const candidates: Str[] = [
              base,
              `${base}.js`,
              `${base}.ts`,
              join(base, 'index.js') as Str,
              join(base, 'index.ts') as Str,
            ] as Str[];

            for (const candidate of candidates) {
              if (compiledFiles.has(candidate)) {
                return { path: candidate, namespace: 'svelte-compiled' };
              }
              try {
                statSync(candidate);
                return { path: candidate };
              } catch {
                /* Not found — try next */
              }
            }
          });

          // Load compiled Svelte/TS files from our virtual map
          build.onLoad({ filter: /.*/, namespace: 'svelte-compiled' }, (args) => {
            const contents: Str | undefined = compiledFiles.get(args.path as Str);
            if (contents) {
              // Use correct loader based on file extension
              const loader: 'js' | 'ts' = args.path.endsWith('.ts') ? 'ts' : 'js';
              return { contents, loader, resolveDir: dirname(args.path) };
            }
          });

          // Compile .svelte.js/.svelte.ts rune modules from node_modules (bits-ui, etc.)
          build.onLoad({ filter: /\.svelte\.[jt]s$/ }, (args) => {
            try {
              const source: Str = readFileSync(args.path, 'utf8') as Str;
              const compiled = svelteCompileModule(source, {
                filename: basename(args.path) as Str,
              });
              return {
                contents: compiled.js.code,
                loader: 'js' as const,
                resolveDir: dirname(args.path),
              };
            } catch {
              /* compileModule failed — pass through as JS */
              return {
                contents: readFileSync(args.path, 'utf8'),
                loader: 'js' as const,
                resolveDir: dirname(args.path),
              };
            }
          });

          // Compile .svelte component files from node_modules (bits-ui, etc.) on the fly
          build.onLoad({ filter: /\.svelte$/ }, (args) => {
            try {
              const source: Str = readFileSync(args.path, 'utf8') as Str;
              const compiled = svelteCompile(source, {
                generate: 'client',
                filename: basename(args.path) as Str,
                css: 'injected',
              });
              return {
                contents: compiled.js.code,
                loader: 'js' as const,
                resolveDir: dirname(args.path),
              };
            } catch {
              /* Svelte compilation failed — return empty module as fallback */
              return { contents: 'export default {};', loader: 'js' as const };
            }
          });
        },
      },
    ],
  });

  if (result.outputFiles && result.outputFiles.length > 0) {
    return result.outputFiles[0].text as Str;
  }
  return '' as Str;
}

/* ------------------------------------------------------------------ */
/*  HTML assembly                                                      */
/* ------------------------------------------------------------------ */

/**
 * Read the full app.css to extract theme custom property blocks.
 *
 * @param editorSrcDir - Path to editor src directory
 * @param darkMode - Whether dark mode is active
 * @param theme - Active theme name
 * @returns CSS text with :root and .dark custom properties
 */
function extractThemeVars(editorSrcDir: Str, darkMode: Bool, theme: Str): Str {
  let appCss: Str;
  try {
    appCss = readFileSync(join(editorSrcDir, 'app.css'), 'utf8') as Str;
  } catch {
    return '' as Str;
  }

  const blocks: Str[] = [];
  // Extract :root block (always needed)
  const rootMatch: RegExpMatchArray | null = appCss.match(/:root\s*\{[^}]+\}/);
  if (rootMatch) blocks.push(rootMatch[0] as Str);

  // Extract .dark block if in dark mode
  if (darkMode) {
    const darkMatch: RegExpMatchArray | null = appCss.match(/\.dark\s*\{[^}]+\}/);
    if (darkMatch) blocks.push(darkMatch[0] as Str);
  }

  // Extract theme-specific blocks
  if (theme) {
    const themeRegex: RegExp = new RegExp(`\\[data-theme=['"]${theme}['"]\\]\\s*\\{[^}]+\\}`, 'g');
    let themeMatch: RegExpExecArray | null;
    themeRegex.lastIndex = 0;
    themeMatch = themeRegex.exec(appCss);
    while (themeMatch !== null) {
      blocks.push(themeMatch[0] as Str);
      themeMatch = themeRegex.exec(appCss);
    }

    // Also get dark variant of the theme
    if (darkMode) {
      const darkThemeRegex: RegExp = new RegExp(
        `\\[data-theme=['"]${theme}['"]\\]\\.dark\\s*\\{[^}]+\\}`,
        'g',
      );
      let darkThemeMatch: RegExpExecArray | null;
      darkThemeRegex.lastIndex = 0;
      darkThemeMatch = darkThemeRegex.exec(appCss);
      while (darkThemeMatch !== null) {
        blocks.push(darkThemeMatch[0] as Str);
        darkThemeMatch = darkThemeRegex.exec(appCss);
      }
    }
  }

  return blocks.join('\n\n') as Str;
}

/**
 * Assemble the final self-contained HTML document.
 *
 * @param bundledJs - Bundled JavaScript (IIFE or ESM)
 * @param tailwindCss - Generated Tailwind CSS
 * @param themeVars - CSS custom property blocks
 * @param darkMode - Whether dark mode is active
 * @param theme - Active theme name
 * @param componentName - Display name for the title
 * @returns Complete HTML document string
 */
function assembleHtml(
  bundledJs: Str,
  tailwindCss: Str,
  themeVars: Str,
  darkMode: Bool,
  theme: Str,
  componentName: Str,
): Str {
  const htmlAttrs: Str[] = ['lang="en"' as Str];
  if (darkMode) htmlAttrs.push('class="dark"' as Str);
  if (theme) htmlAttrs.push(`data-theme="${theme}"` as Str);

  return `<!DOCTYPE html>
<html ${htmlAttrs.join(' ')}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${componentName} — Lens Standalone</title>
  <style>
${themeVars}

${tailwindCss}

/* Base resets */
*, *::before, *::after { box-sizing: border-box; border-color: var(--border); }
body {
  margin: 0;
  padding: 24px;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  background-color: var(--background);
  color: var(--foreground);
  ${darkMode ? 'color-scheme: dark;' : 'color-scheme: light;'}
}
  </style>
</head>
<body>
  <div id="lens-standalone-root"></div>
  <script type="module">
${bundledJs}
  </script>
</body>
</html>` as Str;
}

/* ------------------------------------------------------------------ */
/*  Request handler                                                    */
/* ------------------------------------------------------------------ */

/**
 * POST handler — compiles a Svelte component into a standalone HTML file.
 *
 * Request body:
 * ```json
 * {
 *   "componentDir": "button",
 *   "props": { "variant": "default", "size": "md" },
 *   "children": "Click me",
 *   "darkMode": true,
 *   "theme": "midnight"
 * }
 * ```
 *
 * @param event - SvelteKit request event
 * @param event.request - HTTP request with JSON body
 * @returns HTML document as text/html response
 */
export const POST: RequestHandler = async ({ request }) => {
  let body: {
    componentDir: Str;
    props?: Record<Str, unknown>;
    children?: Str;
    darkMode?: Bool;
    theme?: Str;
  };

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { componentDir, props = {}, children = '', darkMode = false, theme = '' } = body;

  if (!componentDir || typeof componentDir !== 'string') {
    return new Response('Missing componentDir', { status: 400 });
  }

  const uiSrcDir: Str = resolveUiSrcDir();
  const editorSrcDir: Str = resolveEditorSrcDir();

  // 1. Collect all source files for this component and its dependencies
  const sources: Map<Str, Str> = collectComponentSources(componentDir, uiSrcDir);

  if (sources.size === 0) {
    return new Response(`Component directory "${componentDir}" not found`, { status: 404 });
  }

  // 2. Compile all .svelte and .svelte.ts/.svelte.js files
  const compiledFiles: Map<Str, Str> = new Map();
  const svelteModuleRegex: RegExp = /\.svelte\.[jt]s$/;

  for (const [filePath, source] of sources) {
    if (svelteModuleRegex.test(filePath)) {
      // Rune module files (.svelte.ts / .svelte.js) — use compileModule()
      try {
        const compiled = svelteCompileModule(source, {
          filename: basename(filePath),
        });
        compiledFiles.set(filePath, compiled.js.code as Str);
      } catch {
        /* compileModule failed — pass through as-is for esbuild */
        compiledFiles.set(filePath, source);
      }
    } else if (filePath.endsWith('.svelte')) {
      try {
        const compiled: Str = compileSvelteFile(source, basename(filePath) as Str);
        compiledFiles.set(filePath, compiled);
      } catch {
        /* Compilation failed — skip this file */
      }
    } else {
      // Pass through .ts/.js files as-is (esbuild will handle them)
      compiledFiles.set(filePath, source);
    }
  }

  // 3. Find the primary component file (matches dir name or is PascalCase)
  const primaryFileName: Str = componentDir
    .replaceAll(/-([a-z])/g, (_, c: Str) => c.toUpperCase())
    .replace(/^[a-z]/, (c: Str) => c.toUpperCase()) as Str;
  const primaryCandidates: Str[] = [
    join(uiSrcDir, componentDir, `${primaryFileName}.svelte`) as Str,
    // Try exact kebab-to-Pascal (e.g., button → Button.svelte)
  ];

  // Also scan for the first .svelte file matching the convention
  for (const [filePath] of compiledFiles) {
    if (filePath.endsWith('.svelte') && filePath.includes(`/${componentDir}/`)) {
      primaryCandidates.push(filePath);
    }
  }

  let primaryPath: Str | undefined;
  for (const candidate of primaryCandidates) {
    if (compiledFiles.has(candidate)) {
      primaryPath = candidate;
      break;
    }
  }

  if (!primaryPath) {
    return new Response(`Could not find primary .svelte file in "${componentDir}"`, {
      status: 404,
    });
  }

  // 4. Build a wrapper Svelte component that provides context (Tooltip.Provider, etc.)
  //    then generate entry code that mounts the wrapper
  const propsJson: Str = JSON.stringify(props) as Str;
  const primaryBasename: Str = basename(primaryPath) as Str;
  const wrapperPath: Str = join(dirname(primaryPath), '__standalone_wrapper__.svelte') as Str;

  const wrapperSource: Str = `<script>
  import { Tooltip } from 'bits-ui';
  import Component from './${primaryBasename}';
  let { ...restProps } = $props();
</script>

<Tooltip.Provider>
  <Component {...restProps} />
</Tooltip.Provider>` as Str;

  // Compile the wrapper and add to virtual files
  try {
    const wrapperCompiled: Str = compileSvelteFile(
      wrapperSource,
      '__standalone_wrapper__.svelte' as Str,
    );
    compiledFiles.set(wrapperPath, wrapperCompiled);
  } catch {
    /* Wrapper compilation failed — fall back to direct mount without providers */
  }

  const hasWrapper: Bool = compiledFiles.has(wrapperPath);
  const mountImport: Str = hasWrapper
    ? `./__standalone_wrapper__.svelte`
    : (`./${primaryBasename}` as Str);

  const entryCode: Str = `
import { mount } from 'svelte';
import Component from '${mountImport}';

const target = document.getElementById('lens-standalone-root');
const props = ${propsJson};
${children ? `props.children = (anchor) => { const span = document.createElement('span'); span.textContent = ${JSON.stringify(children)}; anchor.before(span); };` : ''}
mount(Component, { target, props });
` as Str;

  // 5. Bundle everything with esbuild
  let bundledJs: Str;
  try {
    bundledJs = await bundleWithEsbuild(entryCode, compiledFiles, uiSrcDir, componentDir);
  } catch (error: unknown) {
    const msg: Str = error instanceof Error ? error.message : 'Unknown bundling error';
    return new Response(`esbuild bundling failed: ${msg}`, { status: 500 });
  }

  // 6. Generate Tailwind CSS for the component's classes
  const candidates: Str[] = extractCandidates(sources);
  const tailwindCss: Str = await generateTailwindCss(candidates, editorSrcDir);

  // 7. Extract theme custom properties
  const themeVars: Str = extractThemeVars(editorSrcDir, darkMode, theme);

  // 8. Assemble the HTML document
  const html: Str = assembleHtml(
    bundledJs,
    tailwindCss,
    themeVars,
    darkMode,
    theme,
    primaryFileName,
  );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${componentDir}-standalone.html"`,
      'Cache-Control': 'no-cache',
    },
  });
};
