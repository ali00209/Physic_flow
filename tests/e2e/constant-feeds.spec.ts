import { expect, test } from '@playwright/test'

test('adding a formula whose default is a constant also adds the constant, wired in', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Physics formula ▾' }).click()
	await page.locator('.menu button', { has: page.getByText('Gravitational potential energy', { exact: true }) }).click()

	await expect(page.locator('.react-flow__node')).toHaveCount(2)
	await expect(page.locator('.react-flow__edge')).toHaveCount(1)
	await expect(page.locator('.react-flow__node').filter({ hasText: 'Gravity (Earth surface)' })).toHaveCount(1)
})
