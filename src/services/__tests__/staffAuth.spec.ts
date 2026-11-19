import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  getCurrentStaffUser,
  loginStaff,
  logoutStaff,
  registerStaff,
  requestPasswordReset,
} from '../staffAuth'

describe('staff authentication service (local preview)', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

  beforeAll(() => {
    const storage = new JSDOM('', { url: 'https://kiosk.test' }).window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  })

  afterAll(() => {
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor)
  })

  beforeEach(() => window.localStorage.clear())

  it('registers a staff account, persists session, signs out, and signs back in', async () => {
    const created = await registerStaff({
      fullName: 'Maria Santos',
      email: 'Maria.Santos@BakeNBrew.ph',
      invitationCode: 'BNB-2026',
      password: 'Password123',
    })

    expect(created.requiresEmailConfirmation).toBe(false)
    expect(created.user.email).toBe('maria.santos@bakenbrew.ph')
    expect(created.user.fullName).toBe('Maria Santos')
    expect(await getCurrentStaffUser()).toEqual(created.user)

    await logoutStaff()
    expect(await getCurrentStaffUser()).toBeNull()

    const signedIn = await loginStaff({
      email: 'maria.santos@bakenbrew.ph',
      password: 'Password123',
    })
    expect(signedIn).toEqual(created.user)
  })

  it('rejects duplicate email registration and invalid login credentials', async () => {
    await registerStaff({
      fullName: 'Juan Dela Cruz',
      email: 'juan@bakenbrew.ph',
      invitationCode: 'BNB-01',
      password: 'Password123',
    })

    await expect(
      registerStaff({
        fullName: 'Juan Clone',
        email: 'juan@bakenbrew.ph',
        invitationCode: 'BNB-01',
        password: 'Password123',
      }),
    ).rejects.toThrow('already exists')

    await expect(
      loginStaff({
        email: 'juan@bakenbrew.ph',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid email address or password')
  })

  it('validates registration fields and password reset email', async () => {
    await expect(
      registerStaff({
        fullName: '',
        email: 'staff@bakenbrew.ph',
        invitationCode: 'BNB-01',
        password: 'Password123',
      }),
    ).rejects.toThrow('full name')

    await expect(
      registerStaff({
        fullName: 'Ana',
        email: 'staff@bakenbrew.ph',
        invitationCode: '',
        password: 'Password123',
      }),
    ).rejects.toThrow('invitation code')

    await expect(
      registerStaff({
        fullName: 'Ana',
        email: 'staff@bakenbrew.ph',
        invitationCode: 'BNB-01',
        password: 'short',
      }),
    ).rejects.toThrow('at least 8 characters')

    await expect(requestPasswordReset('not-an-email')).rejects.toThrow('work email')
    await expect(requestPasswordReset('ana@bakenbrew.ph')).resolves.toBeUndefined()
  })
})
