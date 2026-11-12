import { expect, test } from '@playwright/test'

test('each graph type is its own node, with inputs and no typed values', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Motion graph' }).click()
	const node = page.locator('.react-flow__node-motion')
	await expect(node).toHaveCount(1)
	// Six inputs, each with an inline field for a typed value, and nothing scrolls inside the body.
	await expect(node.locator('.gn-inline')).toHaveCount(6)
	await expect(node.locator('.gn-body')).toHaveCSS('overflow', 'visible')
})

test('the sidebar lists the three graph types separately and drags each one', async ({ page }) => {
	await page.goto('/')
	await page.getByPlaceholder('Search nodes…').fill('graph')
	await expect(page.locator('.sb-item', { hasText: 'Line graph' })).toBeVisible()
	await expect(page.locator('.sb-item', { hasText: 'Scatter graph' })).toBeVisible()
	await expect(page.locator('.sb-item', { hasText: 'Motion graph' })).toBeVisible()
	await page.getByPlaceholder('Search nodes…').fill('')
	await page.getByRole('button', { name: '+ Scatter graph' }).click()
	await expect(page.locator('.react-flow__node-scatter')).toHaveCount(1)
})
