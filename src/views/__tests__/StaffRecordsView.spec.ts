import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { JSDOM } from 'jsdom'
import StaffShellView from '../staff/StaffShellView.vue'
import StaffRecordsView from '../staff/StaffRecordsView.vue'
import type { KioskOrder } from '@/services/orders'
import { useStaffAuthStore } from '@/stores/staffAuth'

describe('StaffRecordsView', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => window.localStorage.clear())

  function seedDemoOrder(order: KioskOrder) {
    window.localStorage.setItem(`bnb.demo-order.${order.requestId}`, JSON.stringify(order))
  }

  async function mountRecords() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useStaffAuthStore()
    authStore.user = { id: 'staff-1', email: 'manager@bakenbrew.ph', fullName: 'Manager Ben' }
    authStore.initialized = true

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: StaffShellView,
          children: [
            { path: 'queue', name: 'staff-queue', component: { template: '<div />' } },
            { path: 'availability', name: 'staff-availability', component: { template: '<div />' } },
            { path: 'records', name: 'staff-records', component: StaffRecordsView },
            { path: 'account', name: 'staff-account', component: { template: '<div />' } },
          ],
        },
        { path: '/login', name: 'staff-login', component: { template: '<div />' } },
      ],
    })
    await router.push('/records')
    await router.isReady()

    const wrapper = mount(StaffShellView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }

  it('renders KPI summary, filters by order type and search, and excludes cancelled orders', async () => {
    const nowIso = new Date().toISOString()

    seedDemoOrder({
      token: 'tok-24',
      requestId: 'req-24',
      queueNumber: 24,
      orderType: 'Dine-in',
      paymentMethod: 'cash',
      items: [
        { id: 'best-sellers-1', name: 'Spanish Latte', quantity: 2, lineTotal: 360 },
        { id: 'pasta-2', name: 'Chicken Alfredo', quantity: 1, lineTotal: 220 },
      ],
      subtotal: 580,
      discount: 0,
      total: 580,
      status: 'completed',
      createdAt: nowIso,
    })

    seedDemoOrder({
      token: 'tok-23',
      requestId: 'req-23',
      queueNumber: 23,
      orderType: 'Take-out',
      paymentMethod: 'e-wallet',
      items: [{ id: 'best-sellers-1', name: 'Spanish Latte', quantity: 2, lineTotal: 360 }],
      subtotal: 360,
      discount: 0,
      total: 360,
      status: 'completed',
      createdAt: nowIso,
    })

    seedDemoOrder({
      token: 'tok-22',
      requestId: 'req-22',
      queueNumber: 22,
      orderType: 'Take-out',
      paymentMethod: 'cash',
      items: [{ id: 'starters-1', name: 'Classic Fries', quantity: 5, lineTotal: 650 }],
      subtotal: 650,
      discount: 0,
      total: 650,
      status: 'rejected',
      createdAt: nowIso,
    })

    const wrapper = await mountRecords()

    const metricValues = wrapper.findAll('.summary-metric__value').map((n) => n.text())
    expect(metricValues[0]).toBe('5')
    expect(metricValues[1]).toBe('₱940.00')
    expect(metricValues[2]).toBe('Spanish Latte')

    expect(wrapper.findAll('.records-row')).toHaveLength(3)

    // Filter by Take-out
    await wrapper.get('.records-type-pill__native').setValue('Take-out')
    await flushPromises()
    expect(wrapper.findAll('.records-row')).toHaveLength(1)
    expect(wrapper.get('.records-cell--order').text()).toBe('#023')

    // Reset filter and search by item name
    await wrapper.get('.records-type-pill__native').setValue('all')
    await wrapper.get('.records-search__input').setValue('Alfredo')
    await flushPromises()
    expect(wrapper.findAll('.records-row')).toHaveLength(1)
    expect(wrapper.get('.records-cell--item').text()).toContain('Chicken Alfredo')

    wrapper.unmount()
  })
})
