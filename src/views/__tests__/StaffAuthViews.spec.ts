import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import StaffLoginView from '../StaffLoginView.vue'
import StaffRegisterView from '../StaffRegisterView.vue'
import { createStaffRoutes, installStaffAuthGuard } from '@/router/staffRoutes'
import {
  getCurrentStaffUser,
  loginStaff,
  logoutStaff,
  registerStaff,
  requestPasswordReset,
  subscribeStaffAuthChanges,
} from '@/services/staffAuth'

vi.mock('@/services/staffAuth', () => ({
  isLocalStaffAuthDemo: true,
  getCurrentStaffUser: vi.fn<typeof getCurrentStaffUser>().mockResolvedValue(null),
  loginStaff: vi.fn<typeof loginStaff>(),
  logoutStaff: vi.fn<typeof logoutStaff>(),
  registerStaff: vi.fn<typeof registerStaff>(),
  requestPasswordReset: vi.fn<typeof requestPasswordReset>(),
  subscribeStaffAuthChanges: vi
    .fn<typeof subscribeStaffAuthChanges>()
    .mockImplementation(() => () => {}),
}))

function createTestRouter(prefix = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: createStaffRoutes(prefix),
  })
  installStaffAuthGuard(router)
  return router
}

afterEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentStaffUser).mockResolvedValue(null)
  vi.mocked(subscribeStaffAuthChanges).mockImplementation(() => () => {})
})

describe('staff login, registration, and route guards', () => {
  it('redirects unauthenticated visitors from protected staff routes to login', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter('')

    await router.push('/queue')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('staff-login')
    expect(router.currentRoute.value.query.redirect).toBe('/queue')
  })

  it('renders Staff Login, toggles password visibility, and redirects to queue on login', async () => {
    vi.mocked(loginStaff).mockResolvedValue({
      id: 'staff-1',
      email: 'barista@bakenbrew.ph',
      fullName: 'Clara Reyes',
    })

    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter('')
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(StaffLoginView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Staff Login')

    const passwordInput = wrapper.get('#staff-login-password')
    expect(passwordInput.attributes('type')).toBe('password')

    await wrapper.get('button[aria-label="Show Password"]').trigger('click')
    expect(passwordInput.attributes('type')).toBe('text')

    await wrapper.get('#staff-login-email').setValue('barista@bakenbrew.ph')
    await passwordInput.setValue('Password123')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(
      () => {
        expect(router.currentRoute.value.name).toBe('staff-queue')
      },
      { timeout: 5000 },
    )

    expect(loginStaff).toHaveBeenCalledWith({
      email: 'barista@bakenbrew.ph',
      password: 'Password123',
    })

    wrapper.unmount()
  })

  it('validates password confirmation on registration before calling registerStaff', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter('/staff')
    await router.push('/staff/register')
    await router.isReady()

    const wrapper = mount(StaffRegisterView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Create a Staff Account')

    await wrapper.get('#staff-register-name').setValue('Marco Cruz')
    await wrapper.get('#staff-register-email').setValue('marco@bakenbrew.ph')
    await wrapper.get('#staff-register-code').setValue('BNB-STAFF-01')
    await wrapper.get('#staff-register-password').setValue('Password123')
    await wrapper.get('#staff-register-confirm-password').setValue('Different123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(registerStaff).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toBe('Passwords do not match.')

    vi.mocked(registerStaff).mockResolvedValue({
      user: { id: 'staff-2', email: 'marco@bakenbrew.ph', fullName: 'Marco Cruz' },
      requiresEmailConfirmation: true,
    })

    await wrapper.get('#staff-register-confirm-password').setValue('Password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(registerStaff).toHaveBeenCalledWith({
      fullName: 'Marco Cruz',
      email: 'marco@bakenbrew.ph',
      invitationCode: 'BNB-STAFF-01',
      password: 'Password123',
    })
    expect(wrapper.get('[role="status"]').text()).toContain('marco@bakenbrew.ph')

    wrapper.unmount()
  })
})
