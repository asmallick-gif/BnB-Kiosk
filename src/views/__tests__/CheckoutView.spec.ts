import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CheckoutView from '../CheckoutView.vue'
import { submitOrder } from '@/services/orders'

vi.mock('@/services/orders', () => ({
  activeOrderKey: 'bnb.active-order',
  isLocalOrderDemo: false,
  submitOrder: vi.fn<typeof submitOrder>(),
}))

const props = {
  orderType: 'Dine-in',
  itemCount: 1,
  items: [{ id: 'best-sellers-1', name: 'Spanish Latte', quantity: 1, lineTotal: 180 }],
  subtotal: 180,
  discount: 0,
  total: 180,
}
async function checkout() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/order/:token', name: 'order-status', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return { wrapper: mount(CheckoutView, { props, global: { plugins: [router] } }), router }
}
afterEach(() => {
  vi.resetAllMocks()
  window.sessionStorage.clear()
})

describe('order submission', () => {
  it('keeps the receipt after failure and retries with the same request ID', async () => {
    vi.mocked(submitOrder).mockRejectedValue(new Error('Unable to send your order.'))
    const { wrapper } = await checkout()
    await wrapper.get('.confirm-button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to send your order.')
    expect(wrapper.get('.receipt-total').text()).toBe('Total₱180.00')
    await wrapper.get('.confirm-button').trigger('click')
    await flushPromises()
    const calls = vi.mocked(submitOrder).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0]![0].requestId).toBe(calls[1]![0].requestId)
    expect(window.sessionStorage.getItem('bnb.active-order')).toBeNull()
    wrapper.unmount()
  })

  it('blocks duplicate taps and payment changes while submission is in flight', async () => {
    let reject!: (error: Error) => void
    vi.mocked(submitOrder).mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = fail
        }),
    )
    const { wrapper } = await checkout()
    await wrapper.get('.confirm-button').trigger('click')
    await wrapper.get('.confirm-button').trigger('click')
    expect(submitOrder).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.confirm-button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.back-button').attributes('disabled')).toBeDefined()
    reject(new Error('Offline'))
    await flushPromises()
    expect(wrapper.get('.confirm-button').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
})
