import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { listStaffProducts, updateStaffProductStock } from '../staffProducts'

describe('staff products service (local preview)', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => window.localStorage.clear())

  it('lists menu products, persists stock updates, and marks 0 stock unavailable', async () => {
    const initial = await listStaffProducts()
    expect(initial.length).toBeGreaterThan(0)
    const first = initial[0]!
    expect(first.available).toBe(true)
    expect(first.quantity).toBe(10)

    const depleted = await updateStaffProductStock(first.id, { available: true, quantity: 0 })
    expect(depleted.quantity).toBe(0)
    expect(depleted.available).toBe(false)

    const reloaded = await listStaffProducts()
    expect(reloaded.find((item) => item.id === first.id)?.available).toBe(false)
    expect(reloaded.find((item) => item.id === first.id)?.quantity).toBe(0)
  })

  it('rejects invalid product IDs and out-of-range quantities', async () => {
    await expect(
      updateStaffProductStock("best-sellers-1'; DROP TABLE products;--", {
        available: true,
        quantity: 5,
      }),
    ).rejects.toThrow('Invalid product identifier')

    await expect(
      updateStaffProductStock('best-sellers-1', { available: true, quantity: -1 }),
    ).rejects.toThrow('between 0 and 999')

    await expect(
      updateStaffProductStock('best-sellers-1', { available: true, quantity: 1000 }),
    ).rejects.toThrow('between 0 and 999')
  })
})
