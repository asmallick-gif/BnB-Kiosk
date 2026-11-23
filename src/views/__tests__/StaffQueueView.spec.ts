import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { JSDOM } from 'jsdom'
import StaffShellView from '../staff/StaffShellView.vue'
import StaffQueueView from '../staff/StaffQueueView.vue'
import { submitOrder } from '@/services/orders'
import { useStaffAuthStore } from '@/stores/staffAuth'

describe('StaffQueueView payment prompt and order lifecycle', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => {
    window.localStorage.clear()
  })

  async function mountQueue() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useStaffAuthStore()
    authStore.user = { id: 'staff-1', email: 'cashier@bakenbrew.ph', fullName: 'Cashier Ana' }
    authStore.initialized = true

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: StaffShellView,
          children: [
            { path: 'queue', name: 'staff-queue', component: StaffQueueView },
            { path: 'availability', name: 'staff-availability', component: { template: '<div />' } },
            { path: 'records', name: 'staff-records', component: { template: '<div />' } },
            { path: 'account', name: 'staff-account', component: { template: '<div />' } },
          ],
        },
        { path: '/login', name: 'staff-login', component: { template: '<div />' } },
      ],
    })
    await router.push('/queue')
    await router.isReady()

    const wrapper = mount(StaffShellView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }

  it('requires Proceed or Cancel on pending orders before unlocking Start Cooking', async () => {
    await submitOrder({
      requestId: crypto.randomUUID(),
      orderType: 'Dine-in',
      paymentMethod: 'cash',
      items: [
        { id: 'best-sellers-1', quantity: 1 },
        { id: 'pasta-1', quantity: 1 },
      ],
    })
    await submitOrder({
      requestId: crypto.randomUUID(),
      orderType: 'Take-out',
      paymentMethod: 'e-wallet',
      items: [{ id: 'best-sellers-1', quantity: 1 }],
    })

    const wrapper = await mountQueue()

    // Both orders start pending in WAITING with Proceed / Cancel prompt and no Start Cooking button yet
    const cards = wrapper.findAll('.order-card')
    expect(cards).toHaveLength(2)
    expect(wrapper.findAll('.order-card__cta')).toHaveLength(0)
    expect(wrapper.findAll('.payment-prompt__btn--proceed')).toHaveLength(2)
    expect(wrapper.findAll('.payment-prompt__btn--cancel')).toHaveLength(2)

    // Cancel the second (FIFO) order (#002)
    const secondCard = cards[1]!
    expect(secondCard.get('.order-card__queue-pill').text()).toBe('#002')
    await secondCard.get('.payment-prompt__btn--cancel').trigger('click')
    await flushPromises()

    expect(wrapper.get('.queue-toast').text()).toContain('Order #002: Order Cancelled')
    expect(wrapper.findAll('.order-card')).toHaveLength(1)

    // Proceed on the remaining order (#001) to confirm payment & physical receipt
    const remainingCard = wrapper.get('.order-card')
    expect(remainingCard.get('.order-card__queue-pill').text()).toBe('#001')
    await remainingCard.get('.payment-prompt__btn--proceed').trigger('click')
    await flushPromises()

    expect(wrapper.get('.queue-toast').text()).toContain('Order #001: Payment Confirmed')

    // Start Cooking is now unlocked on #001
    const startCookingBtn = wrapper.get('.order-card__cta--cooking')
    expect(startCookingBtn.text()).toBe('Start Cooking')
    await startCookingBtn.trigger('click')
    await flushPromises()

    expect(wrapper.get('.queue-toast').text()).toContain('Order #001: Started Cooking')
    expect(wrapper.findAll('.order-card')).toHaveLength(0)

    // Switch to COOKING tab and verify #001 is there
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1]!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.order-card')).toHaveLength(1)
    expect(wrapper.get('.order-card__cta--ready').text()).toBe('Mark Ready')

    wrapper.unmount()
  })

  it('displays an error alert and re-enables actions when accepting an order fails', async () => {
    await submitOrder({
      requestId: crypto.randomUUID(),
      orderType: 'Dine-in',
      paymentMethod: 'cash',
      items: [{ id: 'best-sellers-1', quantity: 1 }],
    })

    const wrapper = await mountQueue()
    // Simulate a backend rejection (e.g., insufficient stock or missing order)
    window.localStorage.clear()

    const proceedBtn = wrapper.get('.payment-prompt__btn--proceed')
    await proceedBtn.trigger('click')
    await flushPromises()

    expect(wrapper.get('.queue-error').text()).toContain('Order could not be found.')
    expect(wrapper.find('.queue-toast').exists()).toBe(false)
    expect(proceedBtn.attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })
})
