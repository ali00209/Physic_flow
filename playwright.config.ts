import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 30_000,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://localhost:5173',
		// Set CHROMIUM_PATH to use a browser you already have; otherwise Playwright uses its own.
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
		trace: process.env.CI ? 'retain-on-failure' : 'off',
		screenshot: process.env.CI ? 'only-on-failure' : 'off',
	},
	webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
})
