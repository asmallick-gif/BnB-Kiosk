import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import QRCode from 'qrcode'
import OrderStatusView from '../OrderStatusView.vue'
import { getOrder, type KioskOrder } from '@/services/orders'

vi.mock('@/services/orders', () => ({
  activeOrderKey: 'bnb.active-order',
  isLocalOrderDemo: false,
  isOrderConfirmed: (order: KioskOrder) =>
    ['confirmed', 'cooking', 'ready', 'completed'].includes(order.status),
  queueLabel: (number: number) => `#${String(number).padStart(3, '0')}`,
  getOrder: vi.fn<typeof getOrder>(),
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn<(text: string, options?: unknown) => Promise<string>>(),
  },
}))

const baseOrder: KioskOrder = {
  token: '550e8400-e29b-41d4-a716-446655440000',
  requestId: '660e8400-e29b-41d4-a716-446655440000',
  queueNumber: 7,
  orderType: 'Dine-in',
  paymentMethod: 'cash',
  items: [{ id: 'best-sellers-1', name: 'Spanish Latte', quantity: 1, lineTotal: 180 }],
  subtotal: 180,
  discount: 0,
  total: 180,
  status: 'pending',
  createdAt: new Date().toISOString(),
}

let wrapper: VueWrapper | undefined

async function mountStatus(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/order/:token', name: 'order-status', component: OrderStatusView },
    ],
  })
  await router.push(path)
  await router.isReady()
  wrapper = mount(OrderStatusView, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-24T05:00:00.000Z'))
  vi.resetAllMocks()
  window.sessionStorage.clear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
})

describe('OrderStatusView lifecycle, QR fallback, and polling', () => {
  it('renders pending payment instructions and polls until confirmed, then shows QR', async () => {
    const createdAt = '2026-11-24T04:58:30.000Z'
    vi.mocked(getOrder)
      .mockResolvedValueOnce({ ...baseOrder, status: 'pending', createdAt })
      .mockResolvedValueOnce({ ...baseOrder, status: 'confirmed', createdAt })
    vi.mocked(QRCode.toDataURL as unknown as (text: string, options?: unknown) => Promise<string>).mockResolvedValue(
      'data:image/png;base64,abc',
    )

    const { wrapper: screen } = await mountStatus(`/order/${baseOrder.token}?kiosk=1`)
    expect(screen.get('h1').text()).toBe('Waiting for confirmation/payment')
    expect(screen.get('.payment-summary').text()).toContain('₱180.00')
    expect(screen.get('.elapsed-pill__time').text()).toBe('00:01:30')

    await vi.advanceTimersByTimeAsync(2500)
    await flushPromises()

    expect(screen.get('h1').text()).toBe('Queue Number')
    expect(screen.get('.queue-number').text()).toBe('#007')
    expect(screen.get('.elapsed-pill__time').text()).toBe('00:01:32')
    expect(screen.get('.tracking-qr').attributes('src')).toBe('data:image/png;base64,abc')
  })

  it('shows a live ticking elapsed timer on the customer tracking view and hides it when completed', async () => {
    const createdAt = '2026-11-24T04:53:10.000Z'
    vi.mocked(getOrder)
      .mockResolvedValueOnce({ ...baseOrder, status: 'cooking', createdAt })
      .mockResolvedValueOnce({ ...baseOrder, status: 'completed', createdAt })

    const { wrapper: screen } = await mountStatus(`/order/${baseOrder.token}`)
    expect(screen.get('h1').text()).toBe('Your order is cooking')
    expect(screen.get('.elapsed-pill__label').text()).toBe('Time Elapsed')
    expect(screen.get('.elapsed-pill__time').text()).toBe('00:06:50')

    await vi.advanceTimersByTimeAsync(2000)
    expect(screen.get('.elapsed-pill__time').text()).toBe('00:06:52')

    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(screen.get('h1').text()).toBe('Order completed')
    expect(screen.find('.elapsed-pill').exists()).toBe(false)
  })

  it('shows a fallback message when QR generation fails', async () => {
    vi.mocked(getOrder).mockResolvedValue({ ...baseOrder, status: 'confirmed' })
    vi.mocked(QRCode.toDataURL as unknown as (text: string, options?: unknown) => Promise<string>).mockRejectedValue(
      new Error('QR failed'),
    )

    const { wrapper: screen } = await mountStatus(`/order/${baseOrder.token}?kiosk=1`)
    expect(screen.get('[role="status"]').text()).toContain('QR code unavailable')
  })

  it('stops background polling once an order reaches a terminal status', async () => {
    vi.mocked(getOrder).mockResolvedValue({ ...baseOrder, status: 'rejected' })

    const { wrapper: screen } = await mountStatus(`/order/${baseOrder.token}?kiosk=1`)
    expect(screen.get('h1').text()).toBe('Please see the cashier')
    expect(screen.find('.elapsed-pill').exists()).toBe(false)
    expect(getOrder).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(10_000)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(getOrder).toHaveBeenCalledTimes(1)
  })
})
