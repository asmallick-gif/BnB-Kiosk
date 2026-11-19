import { supabase } from '@/lib/supabase'
import {
  createAttemptThrottle,
  hashSecretWithSalt,
  timingSafeEqualString,
  validateEmail,
  validateFullName,
  validateInvitationCode,
  validateLoginPassword,
  validateNewPassword,
} from '@/lib/security'

export interface StaffUser {
  id: string
  email: string
  fullName: string
}

export interface StaffLoginInput {
  email: string
  password: string
}

export interface StaffRegistrationInput {
  fullName: string
  email: string
  invitationCode: string
  password: string
}

export interface StaffRegistrationResult {
  user: StaffUser
  requiresEmailConfirmation: boolean
}

interface LocalDemoStaffRecord {
  id: string
  fullName: string
  email: string
  invitationCodeHash: string
  passwordSalt: string
  passwordHash: string
}

// Local development adapter lets staff auth UI be exercised before Supabase auth is configured.
// Deliberately unavailable in production builds.
export const isLocalStaffAuthDemo = !supabase && import.meta.env.DEV

// Dev-only invitation code for local preview testing (override via VITE_STAFF_DEV_INVITE_CODE).
// In production with Supabase, invitation codes are verified server-side against public.staff_invitations.
export const LOCAL_DEV_INVITATION_CODE = (
  import.meta.env.VITE_STAFF_DEV_INVITE_CODE || 'BNB-5JSN-SYN3'
)
  .trim()
  .toUpperCase()

const demoAccountsKey = 'bnb.staff.demo-accounts'
const demoSessionKey = 'bnb.staff.demo-session'
const loginThrottle = createAttemptThrottle(5, 60_000)

export function resetLoginThrottleForTests(): void {
  if (import.meta.env.MODE === 'test') {
    // Recreating throttle state per email is handled by reset; expose clear via helper below.
    throttleTrackedKeys.forEach((key) => loginThrottle.reset(key))
    throttleTrackedKeys.clear()
  }
}

const throttleTrackedKeys = new Set<string>()

function readDemoAccounts(): LocalDemoStaffRecord[] {
  const raw = window.localStorage.getItem(demoAccountsKey)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LocalDemoStaffRecord[]) : []
  } catch {
    return []
  }
}

function writeDemoAccounts(accounts: LocalDemoStaffRecord[]): void {
  window.localStorage.setItem(demoAccountsKey, JSON.stringify(accounts))
}

function toStaffUser(id: string, email: string, fullName?: string): StaffUser {
  return {
    id,
    email,
    fullName: fullName?.trim() || email.split('@')[0] || 'Staff Member',
  }
}

export async function loginStaff(input: StaffLoginInput): Promise<StaffUser> {
  const email = validateEmail(input.email)
  const password = validateLoginPassword(input.password)

  throttleTrackedKeys.add(email)
  loginThrottle.checkAllowed(email)

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      loginThrottle.recordFailure(email)
      throw new Error('Invalid email address or password.')
    }
    loginThrottle.reset(email)
    const metaName =
      typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : undefined
    return toStaffUser(data.user.id, data.user.email ?? email, metaName)
  }

  if (!isLocalStaffAuthDemo) {
    throw new Error('Staff authentication is unavailable. Please configure Supabase.')
  }

  const account = readDemoAccounts().find((entry) => entry.email === email)
  if (!account) {
    loginThrottle.recordFailure(email)
    throw new Error('Invalid email address or password.')
  }

  const candidateHash = await hashSecretWithSalt(password, account.passwordSalt)
  if (!timingSafeEqualString(candidateHash, account.passwordHash)) {
    loginThrottle.recordFailure(email)
    throw new Error('Invalid email address or password.')
  }

  loginThrottle.reset(email)
  const user = toStaffUser(account.id, account.email, account.fullName)
  window.localStorage.setItem(demoSessionKey, JSON.stringify(user))
  return user
}

export async function registerStaff(
  input: StaffRegistrationInput,
): Promise<StaffRegistrationResult> {
  const fullName = validateFullName(input.fullName)
  const email = validateEmail(input.email)
  const invitationCode = validateInvitationCode(input.invitationCode)
  const password = validateNewPassword(input.password)

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          invitation_code: invitationCode,
        },
      },
    })
    if (error || !data.user) {
      throw new Error(error?.message || 'Could not create your staff account. Please try again.')
    }
    return {
      user: toStaffUser(data.user.id, data.user.email ?? email, fullName),
      requiresEmailConfirmation: !data.session,
    }
  }

  if (!isLocalStaffAuthDemo) {
    throw new Error('Staff registration is unavailable. Please configure Supabase.')
  }

  if (!timingSafeEqualString(invitationCode, LOCAL_DEV_INVITATION_CODE)) {
    throw new Error('Invalid or expired staff invitation code.')
  }

  const accounts = readDemoAccounts()
  if (accounts.some((entry) => entry.email === email)) {
    throw new Error('An account with this work email already exists.')
  }

  const passwordSalt = crypto.randomUUID()
  const passwordHash = await hashSecretWithSalt(password, passwordSalt)
  const invitationCodeHash = await hashSecretWithSalt(invitationCode, 'bnb-invite')

  const record: LocalDemoStaffRecord = {
    id: crypto.randomUUID(),
    fullName,
    email,
    invitationCodeHash,
    passwordSalt,
    passwordHash,
  }
  writeDemoAccounts([...accounts, record])
  const user = toStaffUser(record.id, record.email, record.fullName)
  window.localStorage.setItem(demoSessionKey, JSON.stringify(user))
  return { user, requiresEmailConfirmation: false }
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const email = validateEmail(emailInput)

  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      throw new Error('Unable to send password reset email. Please try again later.')
    }
    return
  }

  if (!isLocalStaffAuthDemo) {
    throw new Error('Password reset is unavailable. Please configure Supabase.')
  }
}

export async function getCurrentStaffUser(): Promise<StaffUser | null> {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.user) return null
    const user = data.session.user
    const metaName =
      typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined
    return toStaffUser(user.id, user.email ?? '', metaName)
  }

  if (!isLocalStaffAuthDemo) return null
  const raw = window.localStorage.getItem(demoSessionKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StaffUser>
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return toStaffUser(parsed.id, parsed.email, parsed.fullName)
    }
    return null
  } catch {
    return null
  }
}

export async function logoutStaff(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut()
    return
  }
  if (isLocalStaffAuthDemo) {
    window.localStorage.removeItem(demoSessionKey)
  }
}

export function subscribeStaffAuthChanges(
  onChange: (user: StaffUser | null) => void,
): () => void {
  if (supabase) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user
      if (!authUser) {
        onChange(null)
        return
      }
      const metaName =
        typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : undefined
      onChange(toStaffUser(authUser.id, authUser.email ?? '', metaName))
    })
    return () => subscription.unsubscribe()
  }

  if (isLocalStaffAuthDemo) {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== demoSessionKey) return
      void getCurrentStaffUser().then(onChange)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }

  return () => {}
}
