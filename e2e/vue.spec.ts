import { test, expect } from '@playwright/test'

test('keeps the order editable through review and checkout', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1615 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Take-out', exact: true }).click()
  const viewOrder = page.getByRole('button', { name: 'View my order' })
  await expect(viewOrder).toBeDisabled()
  await page.getByRole('button', { name: 'Add Spanish Latte to order', exact: true }).click()
  await page.getByRole('button', { name: 'Add Mac N Cheese to order', exact: true }).first().click()
  await viewOrder.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Proceed to Checkout' })).toBeInViewport()
  await dialog.getByRole('button', { name: 'Increase Spanish Latte quantity' }).click()
  await expect(dialog.locator('.review-total')).toHaveText('Total₱610.00')
  await dialog.getByRole('button', { name: 'Proceed to Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Receipt Preview', exact: true })).toBeFocused()
  await expect(page.getByLabel('Checkout items')).toContainText('2 × Spanish Latte')
  await expect(page.locator('.receipt-total')).toHaveText('Total₱610.00')
  await expect(page.getByRole('radio', { name: /^Cash/ })).toBeChecked()
  await page.screenshot({ path: 'test-results/receipt-preview.png', fullPage: true })
  await page.getByRole('radio', { name: /^E-wallet/ }).check()
  await page.getByRole('button', { name: 'Back to order' }).click()
  await expect(dialog.getByLabel('Quantity of Spanish Latte', { exact: true })).toHaveText('2')
  await dialog.getByRole('button', { name: 'Proceed to Checkout' }).click()
  await expect(page.getByRole('radio', { name: /^E-wallet/ })).toBeChecked()
  await page.getByRole('button', { name: 'Back to order' }).click()
  await dialog.getByRole('button', { name: 'Add more' }).click()
  await expect(dialog).toBeHidden()
  await expect(viewOrder).toBeFocused()
  await viewOrder.click()
  await expect(dialog.getByLabel('Quantity of Spanish Latte', { exact: true })).toHaveText('2')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(viewOrder).toBeFocused()
})

for (const viewport of [
  { width: 1024, height: 1638 },
  { width: 375, height: 667 },
  { width: 667, height: 375 },
]) {
  test(`keeps checkout visible with a long order at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/menu?type=dine-in')
    // Add from every category without relying on the product list's scroll position.
    await page.locator('.add-button:not(:disabled)').evaluateAll((buttons) => {
      for (const button of buttons) (button as HTMLButtonElement).click()
    })
    await page.getByRole('button', { name: 'View my order' }).click()
    const dialog = page.getByRole('dialog')
    const checkout = dialog.getByRole('button', { name: 'Proceed to Checkout' })
    await expect(checkout).toBeInViewport({ ratio: 1 })
    await expect(dialog.getByRole('button', { name: 'Add more' })).toBeInViewport({ ratio: 1 })
    const layout = await dialog.evaluate((element) => {
      const list = element.querySelector('.review-content') as HTMLElement
      return {
        scrolls: list.scrollHeight > list.clientHeight,
        overflows: element.scrollWidth > element.clientWidth,
      }
    })
    expect(layout).toEqual({ scrolls: true, overflows: false })
    await page.screenshot({
      path: `test-results/order-review-${viewport.width}x${viewport.height}.png`,
    })
    await checkout.click()
    await expect(page.getByRole('heading', { name: 'Receipt Preview', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm Order', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Confirm Order', exact: true })).toBeInViewport({
      ratio: 1,
    })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({
      path: `test-results/checkout-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    })
  })
}

test('supports reduced motion and disables checkout after removing the last item', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/menu')
  await page.getByRole('button', { name: 'Add Spanish Latte to order', exact: true }).click()
  const viewOrder = page.getByRole('button', { name: 'View my order' })
  await viewOrder.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveCSS('animation-name', 'none')
  await dialog.getByRole('button', { name: 'Decrease Spanish Latte quantity' }).click()
  await expect(dialog.getByRole('button', { name: 'Proceed to Checkout' })).toBeDisabled()
  await expect(dialog.getByRole('status')).toContainText('Your order is empty')
  await expect(dialog.getByRole('button', { name: 'Add more' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Add more' }).click()
  await expect(dialog).toBeHidden()
  await expect(viewOrder).toBeDisabled()
})
