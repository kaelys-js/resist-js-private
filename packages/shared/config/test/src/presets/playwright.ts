/**
 * Playwright E2E Preset
 *
 * Shared Playwright configuration factory for SvelteKit product packages.
 * Defines defaults for CI handling, browser projects, preview server,
 * timeouts, and reporters. Products call `createPlaywrightConfig()` in
 * their `playwright.config.ts` with optional overrides.
 *
 * @example
 * ```ts
 * // packages/products/my-app/playwright.config.ts
 * import { createPlaywrightConfig } from '@/test-presets/presets/playwright';
 * export default createPlaywrightConfig();
 * ```
 *
 * @example
 * ```ts
 * // Custom port and extra browser
 * import { createPlaywrightConfig } from '@/test-presets/presets/playwright';
 * import { devices } from '@playwright/test';
 * export default createPlaywrightConfig({
 *   previewPort: 4200,
 *   projects: [
 *     { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
 *     { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
 *   ],
 * });
 * ```
 *
 * @module
 */

import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Options for configuring a Playwright E2E preset.
 */
export type PlaywrightPresetOptions = {
  /** Directory containing E2E test files (default: `'./e2e'`). */
  testDir?: string;
  /** Port for the preview server (default: `4173`). */
  previewPort?: number;
  /** Host address for the preview server (default: `'127.0.0.1'`). */
  previewHost?: string;
  /** Command to build and start the preview server. Auto-generated from host/port if omitted. */
  buildCommand?: string;
  /** Test timeout in milliseconds (default: `30_000`). */
  timeout?: number;
  /** Web server startup timeout in milliseconds (default: `120_000`). */
  webServerTimeout?: number;
  /** Browser projects to test against (default: Chromium only). */
  projects?: PlaywrightTestConfig['projects'];
};

/**
 * Creates a Playwright E2E configuration for a SvelteKit product package.
 *
 * @param options - Customisation options (port, host, browsers, timeouts)
 * @returns A complete Playwright `PlaywrightTestConfig`
 *
 * @example
 * ```ts
 * import { createPlaywrightConfig } from '@/test-presets/presets/playwright';
 * export default createPlaywrightConfig({ previewPort: 4200 });
 * ```
 */
export function createPlaywrightConfig(
  options: PlaywrightPresetOptions = {},
): PlaywrightTestConfig {
  const {
    testDir = './e2e',
    previewPort = 4173,
    previewHost = '127.0.0.1',
    timeout = 30_000,
    webServerTimeout = 120_000,
    projects,
  } = options;

  const isCI = Boolean(process.env.CI);
  const previewUrl = `http://${previewHost}:${previewPort}`;
  const buildCommand =
    options.buildCommand ??
    `pnpm build && pnpm preview --port ${previewPort} --host ${previewHost}`;

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
