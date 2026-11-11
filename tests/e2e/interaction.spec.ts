import { expect, test, type Locator, type Page } from '@playwright/test'

/** Drags from one handle to a point, the way a person would. */
async function dragWireTo(page: Page, from: Locator, to: { x: number; y: number }) {
	const a = await from.boundingBox()
	if (!a) throw new Error('source handle not visible')
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
	await page.mouse.down()
	await page.mouse.move(to.x, to.y, { steps: 15 })
	await page.mouse.up()
}

test('typing in the middle of an input keeps the caret where it is', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()
	await page.getByRole('button', { name: '+ output' }).first().click()

	const name = page.locator('input[placeholder="name"]').first()
	await name.fill('massive')
	await name.click()
	await page.keyboard.press('Home')
	await page.keyboard.press('ArrowRight')
	await page.keyboard.press('ArrowRight')
	await page.keyboard.type('X')
	await expect(name).toHaveValue('maXssive')

	const text = page.locator('textarea').first()
	await text.fill('abcdef')
	await text.click()
	await page.keyboard.press('Control+Home')
	await page.keyboard.press('ArrowRight')
	await page.keyboard.press('ArrowRight')
	await page.keyboard.type('Z')
	await expect(text).toHaveValue('abZcdef')
})

test('a wire dropped on empty canvas offers nodes to spawn, and the chosen one is wired', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()
	await page.getByRole('button', { name: '+ output' }).first().click()
	await expect(page.locator('.react-flow__node')).toHaveCount(1)

	const out = page.locator('.react-flow__node .react-flow__handle-right').first()
	await dragWireTo(page, out, { x: 1000, y: 680 })

	const picker = page.locator('.picker')
	await expect(picker).toBeVisible()
	await picker.locator('input').fill('calc')
	await page.keyboard.press('Enter')

	await expect(page.locator('.react-flow__node')).toHaveCount(2)
	await expect(page.locator('.react-flow__edge')).toHaveCount(1)
	await expect(picker).toHaveCount(0)
})

test('a wire dropped on a sheet body adds an input row to that sheet and connects it', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()
	await page.getByRole('button', { name: '+ output' }).first().click()
	await page.getByRole('button', { name: '+ Calculation sheet' }).click()

	const sheets = page.locator('.react-flow__node')
	await expect(sheets).toHaveCount(2)
	const target = sheets.nth(1)
	await expect(target.locator('.react-flow__handle-left')).toHaveCount(0)

	const out = sheets.nth(0).locator('.react-flow__handle-right').first()
	const box = await target.boundingBox()
	if (!box) throw new Error('target sheet not visible')
	await dragWireTo(page, out, { x: box.x + box.width / 2, y: box.y + box.height / 2 })

	await expect(target.locator('.react-flow__handle-left')).toHaveCount(1)
	await expect(page.locator('.react-flow__edge')).toHaveCount(1)
	await expect(page.locator('.picker')).toHaveCount(0)
})
