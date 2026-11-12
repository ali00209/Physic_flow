import type { Page } from '@playwright/test'

/** Opens a toolbar dropdown and picks one of its items. */
export async function addFromMenu(page: Page, menu: string, item: string | RegExp) {
	await page.getByRole('button', { name: menu, exact: true }).click()
	await page.locator('.menu').getByRole('button', { name: item }).click()
}
