import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;
const storylyneEditorSrc = path.resolve(root, 'packages/products/storylyne/editor/src');

/**
 * Explicit `@/` path aliases for Svelte test projects.
 *
 * The `vite-tsconfig-paths` plugin doesn't resolve `@/` value imports from Svelte-compiled
 * component output. These prefix aliases mirror root tsconfig paths so Vite's resolver
 * can handle extension mapping (`.js` → `.ts`) normally after prefix substitution.
 */
const sharedPathAliases: Array<{ find: string; replacement: string }> = [
  // Order: specific exact paths → slash-suffixed prefixes → bare entrypoints
  // 1. Specific subpath files that have a non-standard extension or need exact resolution
  {
    find: '@/locale/svelte',
    replacement: path.resolve(root, 'packages/shared/locale/src/svelte.svelte.ts'),
  },
  {
    find: '@/config/test/harness/',
    replacement: `${path.resolve(root, 'packages/shared/config/test/src/harness')}/`,
  },
  {
    find: '@/config/test/harness',
    replacement: path.resolve(root, 'packages/shared/config/test/src/harness/index.ts'),
  },
  // 2. Slash-suffixed prefixes — match subpath imports, let Vite resolve extensions
  {
    find: '@/schemas/result/',
    replacement: `${path.resolve(root, 'packages/shared/schemas/result/src')}/`,
  },
  {
    find: '@/schemas/function/',
    replacement: `${path.resolve(root, 'packages/shared/schemas/function/src')}/`,
  },
  {
    find: '@/schemas/generic/',
    replacement: `${path.resolve(root, 'packages/shared/schemas/generic/src')}/`,
  },
  {
    find: '@/utils/result/',
    replacement: `${path.resolve(root, 'packages/shared/utils/result/src')}/`,
  },
  {
    find: '@/utils/core/',
    replacement: `${path.resolve(root, 'packages/shared/utils/core/src')}/`,
  },
  {
    find: '@/utils/beacon/',
    replacement: `${path.resolve(root, 'packages/shared/utils/beacon/src')}/`,
  },
  {
    find: '@/utils/web-vitals/',
    replacement: `${path.resolve(root, 'packages/shared/utils/web-vitals/src')}/`,
  },
  {
    find: '@/utils/devtools/',
    replacement: `${path.resolve(root, 'packages/shared/utils/devtools/src')}/`,
  },
  {
    find: '@/schemas/core-config/',
    replacement: `${path.resolve(root, 'packages/shared/schemas/core-config/src')}/`,
  },
  {
    find: '@/config/core/',
    replacement: `${path.resolve(root, 'packages/shared/config/core/src')}/`,
  },
  { find: '@/locale/', replacement: `${path.resolve(root, 'packages/shared/locale/src')}/` },
  {
    find: '@/config/test/',
    replacement: `${path.resolve(root, 'packages/shared/config/test/src')}/`,
  },
  { find: '@/ui/', replacement: `${path.resolve(root, 'packages/shared/ui/src')}/` },
  // 3. Bare entrypoints — exact package imports
  {
    find: '@/schemas/common',
    replacement: path.resolve(root, 'packages/shared/schemas/common/src/index.ts'),
  },
  {
    find: '@/schemas/result',
    replacement: path.resolve(root, 'packages/shared/schemas/result/src/result.ts'),
  },
  {
    find: '@/schemas/function',
    replacement: path.resolve(root, 'packages/shared/schemas/function/src/function.ts'),
  },
  {
    find: '@/utils/core',
    replacement: path.resolve(root, 'packages/shared/utils/core/src/index.ts'),
  },
  { find: '@/ui', replacement: path.resolve(root, 'packages/shared/ui/src/index.ts') },
];

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: false,
    restoreMocks: true,
    isolate: true,
    pool: 'forks',
    sequence: { shuffle: false },
    passWithNoTests: true,
    bail: 0,
    retry: 0,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    include: ['src/**/*.test.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.bench.ts', 'src/**/*.d.ts'],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
      reportsDirectory: 'coverage',
      reporter: ['text-summary', 'json', 'html'],
      skipFull: true,
      reportOnFailure: true,
    },
    reporters: ['default', 'json'],
    outputFile: { json: 'coverage/test-results.json' },
    projects: [
      {
        extends: true,
        test: {
          name: 'schemas-common',
          root: 'packages/shared/schemas/common',
        },
      },
      {
        extends: true,
        test: {
          name: 'schemas-result',
          root: 'packages/shared/schemas/result',
        },
      },
      {
        extends: true,
        test: {
          name: 'schemas-function',
          root: 'packages/shared/schemas/function',
        },
      },
      {
        extends: true,
        test: {
          name: 'schemas-generic',
          root: 'packages/shared/schemas/generic',
        },
      },
      {
        extends: true,
        test: {
          name: 'utils-result',
          root: 'packages/shared/utils/result',
        },
      },
      {
        extends: true,
        define: {
          __APP_VERSION__: JSON.stringify('0.0.0-test'),
          __GIT_COMMIT__: JSON.stringify('abc1234'),
          __GIT_COMMIT_FULL__: JSON.stringify('abc1234def5678901234567890abcdef12345678'),
          __GIT_BRANCH__: JSON.stringify('test-branch'),
          __GIT_DIRTY__: 'false',
          __BUILD_TIMESTAMP__: JSON.stringify('2026-01-01T00:00:00.000Z'),
        },
        test: {
          name: 'utils-core',
          root: 'packages/shared/utils/core',
        },
      },
      {
        extends: true,
        test: {
          name: 'utils-beacon',
          root: 'packages/shared/utils/beacon',
        },
      },
      {
        extends: true,
        plugins: [svelte({ hot: false })],
        test: {
          name: 'utils-web-vitals',
          root: 'packages/shared/utils/web-vitals',
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        plugins: [svelte({ hot: false })],
        define: {
          __APP_VERSION__: JSON.stringify('0.0.0-test'),
          __GIT_COMMIT__: JSON.stringify('abc1234'),
          __GIT_COMMIT_FULL__: JSON.stringify('abc1234def5678901234567890abcdef12345678'),
          __GIT_BRANCH__: JSON.stringify('test-branch'),
          __GIT_DIRTY__: 'false',
          __BUILD_TIMESTAMP__: JSON.stringify('2026-01-01T00:00:00.000Z'),
        },
        test: {
          name: 'utils-devtools',
          root: 'packages/shared/utils/devtools',
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          name: 'locale',
          root: 'packages/shared/locale',
          exclude: ['src/**/*.svelte.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [svelte({ hot: false })],
        test: {
          name: 'locale-svelte',
          root: 'packages/shared/locale',
          environment: 'jsdom',
          include: ['src/**/*.svelte.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          root: 'packages/shared/ui',
          exclude: ['src/**/*.svelte.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [svelte({ hot: false }), svelteTesting()],
        test: {
          name: 'ui-svelte',
          root: 'packages/shared/ui',
          environment: 'jsdom',
          include: ['src/**/*.svelte.test.ts'],
          alias: [...sharedPathAliases],
          server: {
            deps: {
              inline: ['svelte'],
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'config-core',
          root: 'packages/shared/config/core',
        },
      },
      {
        extends: true,
        test: {
          name: 'config-tooling-vite',
          root: 'packages/shared/config/tooling/vite',
        },
      },
      {
        extends: true,
        test: {
          name: 'config-tooling-svelte',
          root: 'packages/shared/config/tooling/svelte',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'lint',
          root: 'packages/shared/config/tooling/lint',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [svelte({ hot: false }), svelteTesting()],
        define: {
          __APP_VERSION__: JSON.stringify('0.0.0-test'),
          __GIT_COMMIT__: JSON.stringify('abc1234'),
          __GIT_COMMIT_FULL__: JSON.stringify('abc1234def5678901234567890abcdef12345678'),
          __GIT_BRANCH__: JSON.stringify('test-branch'),
          __GIT_DIRTY__: 'false',
          __BUILD_TIMESTAMP__: JSON.stringify('2026-01-01T00:00:00.000Z'),
        },
        test: {
          name: 'storylyne-editor',
          root: 'packages/products/storylyne/editor',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.ts'],
          exclude: ['e2e/**', 'node_modules/**', '.svelte-kit/**'],
          setupFiles: ['./src/test-setup-component.ts'],
          alias: [
            { find: '$lib', replacement: path.join(storylyneEditorSrc, 'lib') },
            {
              find: '$app/environment',
              replacement: path.join(storylyneEditorSrc, 'test-mocks/app-environment.ts'),
            },
            {
              find: '$app/navigation',
              replacement: path.join(storylyneEditorSrc, 'test-mocks/app-navigation.ts'),
            },
            {
              find: '$app/state',
              replacement: path.join(storylyneEditorSrc, 'test-mocks/app-state.ts'),
            },
            ...sharedPathAliases,
          ],
          server: {
            deps: {
              inline: ['@lucide/svelte', 'bits-ui', 'mode-watcher', 'runed', 'svelte-toolbelt'],
            },
          },
        },
      },
    ],
  },
});
