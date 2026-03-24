/**
 * Playwright E2E Preset
 *
 * @module
 *
 * Shared Playwright configuration factory for SvelteKit product packages.
 * Defines defaults for CI handling, browser projects, preview server,
 * timeouts, and reporters. Products call `createPlaywrightConfig()` in
 * their `playwright.config.ts` with optional overrides.
 *
 * @example
 * ```typescript
 * // packages/products/my-app/playwright.config.ts
 * import { createPlaywrightConfig } from '@/test-presets/playwright';
 * export default createPlaywrightConfig();
 * ```
 *
 * @example
 * ```typescript
 * // Custom port and extra browser
 * import { createPlaywrightConfig } from '@/test-presets/playwright';
 * import { devices } from '@playwright/test';
 * export default createPlaywrightConfig({
 *   previewPort: 4200,
 *   projects: [
 *     { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
 *     { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
 *   ],
 * });
 * ```
 */

import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import * as v from 'valibot';

import { PathSchema, HostnameSchema, CommandSchema, type Str, type Bool } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for Playwright E2E preset options. */
const PlaywrightPresetOptionsSchema = v.strictObject({
  /** Directory containing E2E test files (default: `'./e2e'`). */
  testDir: v.optional(PathSchema, './e2e'),
  /** Port for the preview server (default: `4173`). */
  previewPort: v.optional(v.number(), 4173),
  /** Host address for the preview server (default: `'127.0.0.1'`). */
  previewHost: v.optional(HostnameSchema, '127.0.0.1'),
  /** Command to build and start the preview server. Auto-generated from host/port if omitted. */
  buildCommand: v.optional(CommandSchema),
  /** Test timeout in milliseconds (default: `30_000`). */
  timeout: v.optional(v.number(), 30_000),
  /** Web server startup timeout in milliseconds (default: `120_000`). */
  webServerTimeout: v.optional(v.number(), 120_000),
  /** Browser projects to test against (default: Chromium only). */
  projects: v.optional(v.custom<PlaywrightTestConfig['projects']>((): Bool => true)), // cast safe: external Playwright type
});

/** Options for configuring a Playwright E2E preset. See {@link PlaywrightPresetOptionsSchema}. */
export type PlaywrightPresetOptions = v.InferOutput<typeof PlaywrightPresetOptionsSchema>;

// =============================================================================
// API
// =============================================================================

/**
 * Creates a Playwright E2E configuration for a SvelteKit product package.
 *
 * @param {PlaywrightPresetOptions} rawOptions - Customisation options (port, host, browsers, timeouts)
 * @returns {PlaywrightTestConfig} A complete Playwright `PlaywrightTestConfig`
 *
 * @example
 * ```typescript
 * import { createPlaywrightConfig } from '@/test-presets/playwright';
 * export default createPlaywrightConfig({ previewPort: 4200 });
 * ```
 */
export function createPlaywrightConfig(rawOptions: PlaywrightPresetOptions): PlaywrightTestConfig {
  const optionsResult: Result<PlaywrightPresetOptions> = safeParse(
    PlaywrightPresetOptionsSchema,
    rawOptions,
  );

  if (!optionsResult.ok) {
    throw optionsResult.error; // integration boundary: playwright config doesn't understand Result
  }

  const {
    testDir,
    previewPort,
    previewHost,
    timeout,
    webServerTimeout,
    projects,
    buildCommand: buildCommandOpt,
    // cast safe: safeParse validates, shallow destructure into mutable bindings
  }: PlaywrightPresetOptions = optionsResult.data as PlaywrightPresetOptions;

  const isCI: Bool = Boolean(process.env.CI);
  const previewUrl: Str = `http://${previewHost}:${previewPort}`;

  const buildCommand: Str =
    buildCommandOpt ?? `pnpm build && pnpm preview --port ${previewPort} --host ${previewHost}`;

  return defineConfig({
    testDir,
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    timeout,
    expect: { timeout: 5000 },
    reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['list']],
    use: {
      baseURL: previewUrl,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      actionTimeout: 10_000,
      navigationTimeout: 15_000,
    },
    projects: projects ?? [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
    ],
    webServer: {
      command: buildCommand,
      url: previewUrl,
      reuseExistingServer: !isCI,
      timeout: webServerTimeout,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  });
}
