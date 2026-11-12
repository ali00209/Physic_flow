import { expect, test, type Locator, type Page } from '@playwright/test'

const nodes = (page: Page) => page.locator('.react-flow__node')

async function dragWire(page: Page, from: Locator, to: Locator) {
	const a = await from.boundingBox()
	const b = await to.boundingBox()
	if (!a || !b) throw new Error('handle not found')
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
	await page.mouse.down()
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 })
	await page.mouse.up()
}

test('the canvas loads with no error boxes', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', (e) => errors.push(e.message))
	await page.goto('/')
	await expect(page.getByRole('button', { name: '+ Calculation sheet' })).toBeVisible()
	expect(errors).toEqual([])
	await expect(page.getByText('Error', { exact: true })).toHaveCount(0)
})

test('the toolbar adds a sheet and a formula card', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()
	await page.getByRole('button', { name: /Physics formula/ }).click()
	await page.getByRole('button', { name: /Newton's second law/ }).click()
	await expect(nodes(page)).toHaveCount(2)
	await expect(page.locator('.react-flow__node-calc')).toHaveCount(1)
	await expect(page.locator('.react-flow__node-formula')).toHaveCount(1)
})

test('a wire from a sheet output solves a formula, and sheet edits flow through', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()

	const sheet = page.locator('.react-flow__node-calc')
	await sheet.getByRole('button', { name: '+ output' }).click()
	await sheet.getByPlaceholder('name').fill('mass')
	await sheet.locator('textarea').fill('mass = 10 kg')

	await page.getByRole('button', { name: /Physics formula/ }).click()
	await page.getByRole('button', { name: /Newton's second law/ }).click()
	const formula = page.locator('.react-flow__node-formula')
	await formula.locator('input').nth(2).fill('10 m/s^2') // a

	const out = sheet.locator('.react-flow__handle.source')
	const m = formula.locator('[data-handleid="in:m"]')
	await dragWire(page, out, m)

	await expect(formula).toContainText('F = 100 N')

	await sheet.locator('textarea').fill('mass = 20 kg')
	await expect(formula).toContainText('F = 200 N')
})

test('a wire that would make a loop is refused with a message', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()
	const sheet = page.locator('.react-flow__node-calc')
	await sheet.getByRole('button', { name: '+ output' }).click()
	await sheet.getByRole('button', { name: '+ input' }).click()
	await sheet.getByPlaceholder('name').nth(0).fill('mass')
	await sheet.getByPlaceholder('name').nth(1).fill('q')
	await sheet.locator('textarea').fill('mass = 10 kg')

	await page.getByRole('button', { name: /Physics formula/ }).click()
	await page.getByRole('button', { name: /Newton's second law/ }).click()
	const formula = page.locator('.react-flow__node-formula')

	await dragWire(page, sheet.locator('.react-flow__handle.source'), formula.locator('[data-handleid="in:m"]'))
	await dragWire(page, formula.locator('[data-handleid="out"]'), sheet.locator('.react-flow__handle.target'))
	await expect(page.locator('.notice')).toContainText('loop')
})
