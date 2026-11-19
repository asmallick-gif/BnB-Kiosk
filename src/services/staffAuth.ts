import { supabase } from '@/lib/supabase'

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
  invitationCode: string
  password: string
}

// Local development adapter lets staff auth UI be exercised before Supabase auth is configured.
// Deliberately unavailable in production builds.
export const isLocalStaffAuthDemo = !supabase && import.meta.env.DEV

const demoAccountsKey = 'bnb.staff.demo-accounts'
const demoSessionKey = 'bnb.staff.demo-session'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

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
  const email = normalizeEmail(input.email)
  const password = input.password

  if (!emailPattern.test(email)) {
    throw new Error('Please enter a valid work email address.')
  }
  if (!password) {
    throw new Error('Please enter your password.')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      throw new Error(error?.message || 'Invalid email address or password.')
    }
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
  if (!account || account.password !== password) {
    throw new Error('Invalid email address or password.')
  }

  const user = toStaffUser(account.id, account.email, account.fullName)
  window.localStorage.setItem(demoSessionKey, JSON.stringify(user))
  return user
}

export async function registerStaff(
  input: StaffRegistrationInput,
): Promise<StaffRegistrationResult> {
  const fullName = input.fullName.trim()
  const email = normalizeEmail(input.email)
  const invitationCode = input.invitationCode.trim()
  const password = input.password

  if (!fullName) {
    throw new Error('Please enter your full name.')
  }
  if (!emailPattern.test(email)) {
    throw new Error('Please enter a valid work email address.')
  }
  if (!invitationCode) {
    throw new Error('Please enter your staff invitation code.')
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.')
  }

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

  const accounts = readDemoAccounts()
  if (accounts.some((entry) => entry.email === email)) {
    throw new Error('An account with this work email already exists.')
  }

  const record: LocalDemoStaffRecord = {
    id: crypto.randomUUID(),
    fullName,
    email,
    invitationCode,
    password,
  }
  writeDemoAccounts([...accounts, record])
  const user = toStaffUser(record.id, record.email, record.fullName)
  window.localStorage.setItem(demoSessionKey, JSON.stringify(user))
  return { user, requiresEmailConfirmation: false }
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const email = normalizeEmail(emailInput)
  if (!emailPattern.test(email)) {
    throw new Error('Please enter your work email address to reset your password.')
  }

  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/staff/login`,
    })
    if (error) {
      throw new Error(error.message || 'Unable to send password reset email.')
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
