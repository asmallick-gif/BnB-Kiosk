import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { getOrder, isOrderConfirmed, submitOrder, type OrderRequest } from '../orders'

const request = (): OrderRequest => ({
  requestId: crypto.randomUUID(),
  orderType: 'Dine-in',
  paymentMethod: 'cash',
  items: [{ id: 'best-sellers-1', quantity: 2 }],
})

describe('kiosk order lifecycle', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
  beforeAll(() => {
    // Node 26's experimental global storage masks jsdom storage in this runner.
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })
  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })
  beforeEach(() => window.localStorage.clear())

  it('creates a pending snapshot using catalog prices, with idempotent retries', async () => {
    const input = request()
    const first = await submitOrder(input)
    const second = await submitOrder(input)
    expect(first.status).toBe('pending')
    expect(first.total).toBe(360)
    expect(first.items[0]?.name).toBe('Spanish Latte')
    expect(second.token).toBe(first.token)
    expect(window.localStorage.length).toBe(1)
    expect(await getOrder(first.token)).toEqual(first)
    expect(isOrderConfirmed(first)).toBe(false)
  })

  it.each(['confirmed', 'cooking', 'ready', 'completed'] as const)(
    'only enables tracking after staff status %s',
    async (status) => {
      const order = await submitOrder(request())
      expect(isOrderConfirmed({ ...order, status })).toBe(true)
      expect(isOrderConfirmed({ ...order, status: 'rejected' })).toBe(false)
    },
  )

  it.each([0, -1, 0.5, 100])(
    'rejects invalid quantity %s without saving an order',
    async (quantity) => {
      const input = request()
      input.items[0]!.quantity = quantity
      await expect(submitOrder(input)).rejects.toThrow('quantities')
      expect(window.localStorage.length).toBe(0)
    },
  )

  it('does not manufacture an order for an unknown tracking token', async () => {
    await expect(getOrder(crypto.randomUUID())).rejects.toThrow('could not be found')
    expect(window.localStorage.length).toBe(0)
  })

  it('ignores malformed local preview entries instead of crashing order submission or lookup', async () => {
    window.localStorage.setItem('bnb.demo-order.corrupted', '{not-json')
    window.localStorage.setItem(
      'bnb.demo-order.incomplete',
      JSON.stringify({ token: 'bad', queueNumber: 1, status: 'pending' }),
    )

    const order = await submitOrder(request())
    expect(order.queueNumber).toBe(1)
    expect(await getOrder(order.token)).toEqual(order)
  })
})
