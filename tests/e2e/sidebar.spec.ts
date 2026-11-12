import { expect, test } from '@playwright/test'

test('a node dragged from the sidebar lands on the canvas', async ({ page }) => {
	await page.goto('/')
	await page.getByPlaceholder('Search nodes…').fill('Calculation sheet')
	await page.locator('.sb-item', { hasText: 'Calculation sheet' }).dragTo(page.locator('.react-flow__pane'), {
		targetPosition: { x: 600, y: 350 },
	})
	await expect(page.locator('.react-flow__node')).toHaveCount(1)
})

test('search narrows the sidebar, and formulas are grouped by subject', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('.sb-sub', { hasText: 'Mechanics' })).toHaveCount(1)
	await expect(page.locator('.sb-sub', { hasText: 'Electricity & magnetism' })).toHaveCount(1)

	await page.getByPlaceholder('Search nodes…').fill('gravity')
	await expect(page.locator('.sb-item', { hasText: 'Gravity (Earth surface)' })).toBeVisible()
	await expect(page.locator('.sb-item', { hasText: 'Coulomb' })).toHaveCount(0)
})
