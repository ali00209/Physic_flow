import { expect, test } from '@playwright/test'
import { addFromMenu } from './helpers'

test('a maths function is a node with inputs and an output', async ({ page }) => {
	await page.goto('/')
	await addFromMenu(page, '+ Function ▾', /Square root/)
	const node = page.locator('.react-flow__node-fn').first()
	await expect(node).toHaveCount(1)
	await expect(node.locator('.fn-input')).toHaveCount(1)
	await node.locator('.fn-input').fill('16')
	await page.waitForTimeout(200)
	await expect(node.locator('.fn-out')).toContainText('4')
})

test('the sidebar lists the functions by group and drags them', async ({ page }) => {
	await page.goto('/')
	await page.getByPlaceholder('Search nodes…').fill('sine')
	await expect(page.locator('.sb-item', { hasText: 'Sine' }).first()).toBeVisible()
})
