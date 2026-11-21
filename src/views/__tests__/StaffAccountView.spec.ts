import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { JSDOM } from 'jsdom'
import StaffShellView from '../staff/StaffShellView.vue'
import StaffAccountView from '../staff/StaffAccountView.vue'
import { LOCAL_DEV_INVITATION_CODE, loginStaff, logoutStaff, registerStaff } from '@/services/staffAuth'
import { useStaffAuthStore } from '@/stores/staffAuth'

describe('StaffAccountView profile and password management', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => window.localStorage.clear())

  async function mountAccount() {
    const { user } = await registerStaff({
      fullName: 'Maria Santos',
      email: 'maria@bakenbrew.ph',
      invitationCode: LOCAL_DEV_INVITATION_CODE,
      password: 'Password123',
    })

    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useStaffAuthStore()
    authStore.user = user
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
            { path: 'records', name: 'staff-records', component: { template: '<div />' } },
            { path: 'account', name: 'staff-account', component: StaffAccountView },
          ],
        },
        { path: '/login', name: 'staff-login', component: { template: '<div />' } },
      ],
    })
    await router.push('/account')
    await router.isReady()

    const wrapper = mount(StaffShellView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }

  it('populates staff profile fields, saves edits, and updates password securely', async () => {
    const wrapper = await mountAccount()

    expect(wrapper.get('h1').text()).toBe('My Account')
    expect((wrapper.get('#account-first-name').element as HTMLInputElement).value).toBe('Maria')
    expect((wrapper.get('#account-last-name').element as HTMLInputElement).value).toBe('Santos')
    expect((wrapper.get('#account-email').element as HTMLInputElement).value).toBe(
      'maria@bakenbrew.ph',
    )

    // Save Changes is disabled until fields are edited
    expect(wrapper.get('.btn-primary--olive').attributes('disabled')).toBeDefined()

    // Update profile fields
    await wrapper.get('#account-middle-initial').setValue('R')
    await wrapper.get('#account-home-address').setValue('123 Sampaguita St, Quezon City')
    await flushPromises()

    expect(wrapper.get('.dirty-badge').text()).toBe('Unsaved changes')
    await wrapper.get('form.account-section').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.account-toast').text()).toContain('Profile changes saved')
    expect(wrapper.get('.identity-band__name').text()).toBe('Maria R. Santos')

    // Update password and verify sign-in works with the new password
    await wrapper.get('#account-new-password').setValue('NewBrew2026')
    await wrapper.get('#account-confirm-password').setValue('NewBrew2026')
    await wrapper.get('form.account-section--divided').trigger('submit')

    await vi.waitFor(() => {
      expect(wrapper.get('.account-toast').text()).toContain('Password updated')
    })

    await logoutStaff()
    const signedIn = await loginStaff({
      email: 'maria@bakenbrew.ph',
      password: 'NewBrew2026',
    })
    expect(signedIn.fullName).toBe('Maria R. Santos')
    expect(signedIn.homeAddress).toBe('123 Sampaguita St, Quezon City')

    wrapper.unmount()
  })
})
