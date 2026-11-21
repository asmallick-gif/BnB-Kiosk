import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { JSDOM } from 'jsdom'
import StaffShellView from '../staff/StaffShellView.vue'
import StaffAvailabilityView from '../staff/StaffAvailabilityView.vue'
import { useStaffAuthStore } from '@/stores/staffAuth'

describe('StaffAvailabilityView', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => window.localStorage.clear())

  async function mountAvailability() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useStaffAuthStore()
    authStore.user = { id: 'staff-1', email: 'staff@bakenbrew.ph', fullName: 'Staff Mia' }
    authStore.initialized = true

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: StaffShellView,
          children: [
            { path: 'queue', name: 'staff-queue', component: { template: '<div />' } },
            {
              path: 'availability',
              name: 'staff-availability',
              component: StaffAvailabilityView,
            },
            { path: 'records', name: 'staff-records', component: { template: '<div />' } },
            { path: 'account', name: 'staff-account', component: { template: '<div />' } },
          ],
        },
        { path: '/login', name: 'staff-login', component: { template: '<div />' } },
      ],
    })
    await router.push('/availability')
    await router.isReady()

    const wrapper = mount(StaffShellView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }

  it('toggles item availability, adjusts quantity by +/-1 and +/-5, filters, and shows toast', async () => {
    const wrapper = await mountAvailability()

    // Search for Spanish Latte
    await wrapper.get('.available-search__input').setValue('Spanish Latte')
    await flushPromises()

    expect(wrapper.findAll('.available-row')).toHaveLength(1)
    expect(wrapper.get('.available-row__name').text()).toBe('Spanish Latte')
    expect(wrapper.get('.avail-pill').text()).toBe('Yes')
    expect(wrapper.get('.qty-stepper__value').text()).toBe('10')

    // Click -5 twice to bring quantity from 10 -> 5 -> 0 (auto-marks unavailable + toast)
    await wrapper.get('button[aria-label="Decrease Spanish Latte quantity by 5"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.qty-stepper__value').text()).toBe('5')

    await wrapper.get('button[aria-label="Decrease Spanish Latte quantity by 5"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.qty-stepper__value').text()).toBe('0')
    expect(wrapper.get('.avail-pill').text()).toBe('No')
    expect(wrapper.get('.available-toast').text()).toContain('Spanish Latte is unavailable')

    // Clear search and filter by Unavailable
    await wrapper.get('.available-search__input').setValue('')
    const filterTabs = wrapper.findAll('[role="tab"]')
    await filterTabs[2]!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.available-row')).toHaveLength(1)
    expect(wrapper.get('.available-row__name').text()).toBe('Spanish Latte')

    // Toggle back to Available (auto bumps qty from 0 to 1)
    await wrapper.get('.avail-pill').trigger('click')
    await flushPromises()
    expect(wrapper.get('.available-toast').text()).toContain('Spanish Latte is available')
    expect(wrapper.findAll('.available-row')).toHaveLength(0)

    wrapper.unmount()
  })
})
