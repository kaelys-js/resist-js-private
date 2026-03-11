/**
 * Base Test Preset
 *
 * Shared Vitest configuration inherited by all environment-specific presets
 * (node, svelte, worker). Defines defaults for isolation, coverage, reporters,
 * and timeouts.
 *
 * @module
 */

import type { ViteUserConfig } from 'vitest/config';

/**
 * Base test configuration shared across all presets.
 *
 * Intentionally not exported as a standalone preset — consumers
 * should use node/svelte/worker which extend this with the
 * correct environment and plugins.
 */
export const baseTestConfig: ViteUserConfig['test'] = {
  // --- Globals & Imports ---
  // Explicit imports preferred (`import { test, expect } from 'vitest'`).
  // Svelte preset overrides to true (Testing Library requires it).
  globals: false,

  // --- Mock Hygiene ---
  // restoreMocks: after each test, restore spied/mocked functions
  // to their original implementation. Prevents mock leakage between tests.
  restoreMocks: true,

  // --- Isolation ---
  // Each test file runs in its own thread context.
  // Prevents shared state pollution between files.
  isolate: true,

  // --- Pool ---
  // 'threads' uses node:worker_threads — fastest for pure JS/TS.
  // Worker preset overrides to @cloudflare/vitest-pool-workers.
  // Switch to 'forks' if using native addons (Prisma, bcrypt, canvas).
  pool: 'threads',

  // --- Execution ---
  // Don't shuffle — preserves Vitest's cache-based ordering
  // (runs slowest tests first for better parallelism).
  // Use `--sequence.shuffle` in CI to detect hidden test coupling.
  sequence: { shuffle: false },

  // Pass if a package has no test files yet. Essential for monorepos
  // where packages are at different stages of test coverage.
  passWithNoTests: true,

  // Don't bail — show all failures. Use `--bail 1` in CI for fast feedback.
  bail: 0,

  // Don't auto-retry. Retries mask flaky tests. Fix them instead.
  // For E2E, override in the consuming config.
  retry: 0,

  // --- Timeouts ---
  // 10s is generous for unit tests (most should complete in <100ms).
  // Catches genuinely hung tests without excessive waiting.
  testTimeout: 10_000,
  hookTimeout: 10_000,

  // --- File Discovery ---
  // Colocated tests: src/foo.ts → src/foo.test.ts
  include: ['src/**/*.test.ts'],

  // --- Benchmarks ---
  // Colocated: src/foo.ts → src/foo.bench.ts
  // Only runs with `vitest bench`, not `vitest run`.
  benchmark: {
    include: ['src/**/*.bench.ts'],
    reporters: ['default'],
  },

  // --- Coverage ---
  coverage: {
    provider: 'v8',

    include: ['src/**/*.ts'],
    exclude: [
      // Test and benchmark files
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/*.bench.ts',
      // Type-only files
      'src/**/*.d.ts',
    ],

    // Industry-standard thresholds.
    // Branches lower because exhaustive branch coverage
    // often leads to testing implementation details.
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },

    reportsDirectory: 'coverage',
    reporter: [
      'text-summary', // Quick terminal summary
      'json', // Machine-readable for CI / QA dashboard
      'html', // Browsable local report
    ],

    // Don't clutter terminal with fully-covered files.
    skipFull: true,

    // Still generate report even if tests fail —
    // useful for understanding partial coverage during debugging.
    reportOnFailure: true,
  },

  // --- Reporters ---
  // 'default' for terminal, 'json' for CI tooling and QA dashboard.
  reporters: ['default', 'json'],
  outputFile: {
    json: 'coverage/test-results.json',
  },
};
