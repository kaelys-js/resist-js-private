/**
 * Playwright E2E test configuration.
 *
 * Runs the SvelteKit preview server on `PREVIEW_HOST:PREVIEW_PORT`,
 * then executes Chromium-based E2E tests against it. In CI, retries
 * failed tests twice and generates HTML + GitHub reporter output.
 *
 * @module
 */

import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

/** Host address for the preview server. */
const PREVIEW_HOST = '127.0.0.1';

/** Port for the preview server. */
const PREVIEW_PORT = 4173;

/** Base URL for all test navigation. */
const PREVIEW_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	timeout: 30_000,
	expect: { timeout: 5000 },
	reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['list']],
	use: {
		baseURL: PREVIEW_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 10_000,
		navigationTimeout: 15_000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: `pnpm build && pnpm preview --port ${PREVIEW_PORT} --host ${PREVIEW_HOST}`,
		url: PREVIEW_URL,
		reuseExistingServer: !isCI,
		timeout: 120_000,
		stdout: 'ignore',
		stderr: 'pipe',
	},
});
