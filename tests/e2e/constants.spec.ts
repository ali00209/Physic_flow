import { expect, test } from '@playwright/test'

test('a constant from the panel goes on the canvas, and your own constant is saved', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: 'Constants', exact: true }).click()
	await expect(page.locator('.cd-list')).toContainText('Gravity (Earth surface)')

	await page.locator('.cd-row', { hasText: 'Gravity (Earth surface)' }).getByRole('button', { name: '+ add' }).click()
	await expect(page.locator('.react-flow__node')).toHaveCount(1)
	await expect(page.locator('.react-flow__node')).toContainText('9.80665')

	await page.getByRole('button', { name: 'Constants', exact: true }).click()
	await page.getByPlaceholder('Name, e.g. Spring constant').fill('Spring constant')
	await page.getByPlaceholder('Symbol, e.g. k').fill('k')
	await page.getByPlaceholder('Value with unit, e.g. 250 N/m').fill('250 N/m')
	await page.getByRole('button', { name: 'Save constant' }).click()
	await expect(page.locator('.cd-list')).toContainText('Spring constant')

	await page.reload()
	await page.getByRole('button', { name: 'Constants', exact: true }).click()
	await expect(page.locator('.cd-list')).toContainText('Spring constant')
})
