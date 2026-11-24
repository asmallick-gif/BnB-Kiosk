import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { getOrder, submitOrder } from '../orders'
import { getAllowedNextStatuses, listStaffOrders, updateStaffOrderStatus } from '../staffOrders'

describe('staff order service (local preview)', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => window.localStorage.clear())

  it('lists kiosk orders and advances them through valid staff lifecycle statuses', async () => {
    const created = await submitOrder({
      requestId: crypto.randomUUID(),
      orderType: 'Dine-in',
      paymentMethod: 'cash',
      items: [{ id: 'best-sellers-1', quantity: 1 }],
    })

    const listed = await listStaffOrders()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.token).toBe(created.token)
    expect(getAllowedNextStatuses('pending')).toEqual(['confirmed', 'rejected'])

    const confirmed = await updateStaffOrderStatus(created.token, 'confirmed')
    expect(confirmed.status).toBe('confirmed')
    expect((await getOrder(created.token)).status).toBe('confirmed')

    const cooking = await updateStaffOrderStatus(created.token, 'cooking')
    expect(cooking.status).toBe('cooking')

    const ready = await updateStaffOrderStatus(created.token, 'ready')
    expect(ready.status).toBe('ready')

    const completed = await updateStaffOrderStatus(created.token, 'completed')
    expect(completed.status).toBe('completed')
  })

  it('blocks skipping lifecycle stages', async () => {
    const created = await submitOrder({
      requestId: crypto.randomUUID(),
      orderType: 'Take-out',
      paymentMethod: 'e-wallet',
      items: [{ id: 'best-sellers-1', quantity: 1 }],
    })

    await expect(updateStaffOrderStatus(created.token, 'ready')).rejects.toThrow(
      'Cannot change order from pending to ready',
    )
  })

  it('ignores malformed local preview entries when updating a valid order', async () => {
    window.localStorage.setItem('bnb.demo-order.corrupted', '{broken')
    const created = await submitOrder({
      requestId: crypto.randomUUID(),
      orderType: 'Dine-in',
      paymentMethod: 'cash',
      items: [{ id: 'best-sellers-1', quantity: 1 }],
    })

    const confirmed = await updateStaffOrderStatus(created.token, 'confirmed')
    expect(confirmed.status).toBe('confirmed')
  })
})
