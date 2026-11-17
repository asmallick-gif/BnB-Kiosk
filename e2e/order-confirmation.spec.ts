import { expect, test } from '@playwright/test'

test('waits across reloads until the separate staff actor confirms payment, then shows QR tracking', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1024, height: 1615 })
  await page.goto('/menu?type=take-out')
  await page.getByRole('button', { name: 'Add Spanish Latte to order', exact: true }).click()
  await page.getByRole('button', { name: 'View my order' }).click()
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click()
  await page.getByRole('radio', { name: /^E-wallet/ }).check()
  await page.getByRole('button', { name: 'Confirm Order', exact: true }).dblclick()
  await expect(
    page.getByRole('heading', { name: 'Waiting for confirmation/payment', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('show your GCash/Maya payment', { exact: false })).toBeVisible()
  await expect(page.getByRole('img', { name: /QR code to track/ })).toHaveCount(0)
  const pendingUrl = page.url()
  const countOrders = () =>
    page.evaluate(
      () => Object.keys(localStorage).filter((key) => key.startsWith('bnb.demo-order.')).length,
    )
  expect(await countOrders()).toBe(1)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Waiting for confirmation/payment', exact: true }),
  ).toBeVisible()
  expect(await countOrders()).toBe(1)
  await page.screenshot({ path: 'test-results/order-pending.png', fullPage: true })
  await page.setViewportSize({ width: 375, height: 667 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1024, height: 1615 })

  // This tab represents the independently developed staff service. There is no
  // customer-facing bypass or automatic timer that confirms an order.
  const staff = await context.newPage()
  await staff.goto('/')
  await staff.evaluate(() => {
    const key = Object.keys(localStorage).find((entry) => entry.startsWith('bnb.demo-order.'))!
    const order = JSON.parse(localStorage.getItem(key)!)
    if (order.status !== 'pending') throw new Error('Expected an unpaid pending order')
    localStorage.setItem(key, JSON.stringify({ ...order, status: 'confirmed' }))
  })
  await expect(page.getByRole('heading', { name: 'Queue Number', exact: true })).toBeVisible()
  const qr = page.getByRole('img', { name: /QR code to track/ })
  await expect(qr).toHaveAttribute('src', /^data:image\/png;base64,/)
  await page.screenshot({ path: 'test-results/order-qr.png', fullPage: true })
  await page.setViewportSize({ width: 375, height: 667 })
  await expect(qr).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1024, height: 1615 })

  const trackingUrl = await page
    .getByRole('link', { name: 'Open order tracking' })
    .getAttribute('href')
  await staff.goto(trackingUrl!)
  await expect(staff.getByRole('heading', { name: 'Order confirmed', exact: true })).toBeVisible()
  await staff.evaluate(() => {
    const key = Object.keys(localStorage).find((entry) => entry.startsWith('bnb.demo-order.'))!
    const order = JSON.parse(localStorage.getItem(key)!)
    localStorage.setItem(key, JSON.stringify({ ...order, status: 'cooking' }))
  })
  await expect(
    staff.getByRole('heading', { name: 'Your order is cooking', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Dine-in', exact: true })).toBeVisible()
  expect(await countOrders()).toBe(1)
  expect(page.url()).not.toBe(pendingUrl)
  expect(await page.evaluate(() => sessionStorage.getItem('bnb.active-order'))).toBeNull()
})

test('shows a missing-order message without a QR or accidental resubmission', async ({ page }) => {
  await page.goto(`/order/${crypto.randomUUID()}?kiosk=1`)
  await expect(page.getByRole('alert')).toContainText('could not be found')
  await expect(page.getByRole('img', { name: /QR code to track/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Check again' }).click()
  expect(
    await page.evaluate(
      () => Object.keys(localStorage).filter((key) => key.startsWith('bnb.demo-order.')).length,
    ),
  ).toBe(0)
})
