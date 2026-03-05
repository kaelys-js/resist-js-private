import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

// TODO: Proper Commenting
// TODO: Host & Port From Shared Constant

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
		baseURL: 'http://127.0.0.1:4173',
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
		command: 'pnpm build && pnpm preview --port 4173 --host 127.0.0.1',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !isCI,
		timeout: 120_000,
		stdout: 'ignore',
		stderr: 'pipe',
	},
});
