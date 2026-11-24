import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  getCurrentStaffUser,
  LOCAL_DEV_INVITATION_CODE,
  loginStaff,
  logoutStaff,
  registerStaff,
  requestPasswordReset,
  resetLoginThrottleForTests,
} from '../staffAuth'

describe('staff authentication service (local preview + security checks)', () => {
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
    resetLoginThrottleForTests()
  })

  it('registers a staff account with the valid invitation code, hashes password, and signs back in', async () => {
    const created = await registerStaff({
      fullName: 'Maria Santos',
      email: 'Maria.Santos@BakeNBrew.ph',
      invitationCode: LOCAL_DEV_INVITATION_CODE.toLowerCase(),
      password: 'Password123',
    })

    expect(created.requiresEmailConfirmation).toBe(false)
    expect(created.user.email).toBe('maria.santos@bakenbrew.ph')
    expect(created.user.fullName).toBe('Maria Santos')
    expect(await getCurrentStaffUser()).toEqual(created.user)

    // Ensure plaintext password is never stored in localStorage
    const rawAccounts = window.localStorage.getItem('bnb.staff.demo-accounts') ?? ''
    expect(rawAccounts).not.toContain('Password123')

    await logoutStaff()
    expect(await getCurrentStaffUser()).toBeNull()

    const signedIn = await loginStaff({
      email: 'maria.santos@bakenbrew.ph',
      password: 'Password123',
    })
    expect(signedIn).toEqual(created.user)
  })

  it('rejects invalid invitation codes, duplicate emails, and SQL injection payloads', async () => {
    await expect(
      registerStaff({
        fullName: 'Juan Dela Cruz',
        email: 'juan@bakenbrew.ph',
        invitationCode: 'WRONG-CODE-99',
        password: 'Password123',
      }),
    ).rejects.toThrow('Invalid or expired staff invitation code')

    await expect(
      registerStaff({
        fullName: "Admin'; DROP TABLE orders;--",
        email: 'juan@bakenbrew.ph',
        invitationCode: LOCAL_DEV_INVITATION_CODE,
        password: 'Password123',
      }),
    ).rejects.toThrow('valid full name')

    await registerStaff({
      fullName: 'Juan Dela Cruz',
      email: 'juan@bakenbrew.ph',
      invitationCode: LOCAL_DEV_INVITATION_CODE,
      password: 'Password123',
    })

    await expect(
      registerStaff({
        fullName: 'Juan Clone',
        email: 'juan@bakenbrew.ph',
        invitationCode: LOCAL_DEV_INVITATION_CODE,
        password: 'Password123',
      }),
    ).rejects.toThrow('already exists')

    await expect(
      loginStaff({
        email: 'juan@bakenbrew.ph',
        password: 'wrong-password1',
      }),
    ).rejects.toThrow('Invalid email address or password')
  })

  it('locks out repeated failed login attempts and validates password policy', async () => {
    await registerStaff({
      fullName: 'Ana Reyes',
      email: 'ana@bakenbrew.ph',
      invitationCode: LOCAL_DEV_INVITATION_CODE,
      password: 'Password123',
    })
    await logoutStaff()

    for (let i = 0; i < 5; i += 1) {
      await expect(
        loginStaff({ email: 'ana@bakenbrew.ph', password: 'WrongPassword1' }),
      ).rejects.toThrow('Invalid email address or password')
    }

    await expect(
      loginStaff({ email: 'ana@bakenbrew.ph', password: 'Password123' }),
    ).rejects.toThrow('Too many failed attempts')

    await expect(
      registerStaff({
        fullName: 'New User',
        email: 'new@bakenbrew.ph',
        invitationCode: LOCAL_DEV_INVITATION_CODE,
        password: 'onlyletters',
      }),
    ).rejects.toThrow('letter and one number')

    await expect(requestPasswordReset('not-an-email')).rejects.toThrow('work email')
    await expect(requestPasswordReset('ana@bakenbrew.ph')).resolves.toBeUndefined()
  })

  it('strips unsafe avatar URLs when restoring a session from storage', async () => {
    window.localStorage.setItem(
      'bnb.staff.demo-session',
      JSON.stringify({
        id: 'staff-xss',
        email: 'xss@bakenbrew.ph',
        fullName: 'Safe Staff',
        avatarUrl: 'javascript:alert(1)',
      }),
    )

    const user = await getCurrentStaffUser()
    expect(user?.avatarUrl).toBe('')
  })
})
