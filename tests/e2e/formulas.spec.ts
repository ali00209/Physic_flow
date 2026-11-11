import { expect, test } from '@playwright/test'

test('a formula made by the user is saved and listed after a reload', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: '+ Physics formula ▾' }).click()
	await page.getByRole('button', { name: /Create your own formula/ }).click()

	await page.getByPlaceholder("e.g. Ohm's law").fill("Ohm's law")
	await page.getByPlaceholder('e.g. V = I R').fill('V = I R')
	const rows = page.locator('.fd-var')
	const fill = async (i: number, values: string[]) => {
		const inputs = rows.nth(i).locator('input')
		for (const [j, v] of values.entries()) await inputs.nth(j).fill(v)
	}
	await fill(0, ['V', 'Voltage', 'V', '', 'I*R'])
	await fill(1, ['I', 'Current', 'A', '', 'V/R'])
	await page.getByRole('button', { name: '+ variable' }).click()
	await fill(2, ['R', 'Resistance', 'ohm', '', 'V/I'])
	await page.getByRole('button', { name: 'Save formula' }).click()

	// Saving reopens the formula menu, so the new formula is listed straight away.
	await expect(page.locator('.menu')).toContainText("Ohm's law")

	await page.reload()
	await page.getByRole('button', { name: '+ Physics formula ▾' }).click()
	await expect(page.locator('.menu')).toContainText("Ohm's law")
})
