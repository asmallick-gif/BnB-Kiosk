import { supabase } from '@/lib/supabase'
import {
  createAttemptThrottle,
  hashSecretWithSalt,
  timingSafeEqualString,
  validateAvatarValue,
  validateEmail,
  validateFullName,
  validateHomeAddress,
  validateInvitationCode,
  validateLoginPassword,
  validateMiddleInitial,
  validateNamePart,
  validateNewPassword,
} from '@/lib/security'

export interface StaffUser {
  id: string
  email: string
  fullName: string
  firstName?: string
  lastName?: string
  middleInitial?: string
  homeAddress?: string
  avatarUrl?: string
  role?: string
  joinedAt?: string
  previousLoginAt?: string
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

export interface StaffProfileUpdateInput {
  firstName: string
  lastName: string
  middleInitial: string
  email: string
  homeAddress: string
  avatarUrl: string
}

export interface StaffRegistrationResult {
  user: StaffUser
  requiresEmailConfirmation: boolean
}

interface LocalDemoStaffRecord {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  middleInitial?: string
  email: string
  homeAddress?: string
  avatarUrl?: string
  role?: string
  joinedAt?: string
  previousLoginAt?: string
  lastLoginAt?: string
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
    throttleTrackedKeys.forEach((key) => loginThrottle.reset(key))
    throttleTrackedKeys.clear()
  }
}

const throttleTrackedKeys = new Set<string>()

export function splitFullName(fullName: string): {
  firstName: string
  middleInitial: string
  lastName: string
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', middleInitial: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0] ?? '', middleInitial: '', lastName: '' }
  if (parts.length === 2) {
    return { firstName: parts[0] ?? '', middleInitial: '', lastName: parts[1] ?? '' }
  }
  const middleToken = parts[1] ?? ''
  if (middleToken.replace(/\.$/, '').length <= 2) {
    return {
      firstName: parts[0] ?? '',
      middleInitial: middleToken.replace(/\.$/, '').toUpperCase(),
      lastName: parts.slice(2).join(' '),
    }
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    middleInitial: '',
    lastName: parts[parts.length - 1] ?? '',
  }
}

export function composeFullName(
  firstName: string,
  middleInitial: string,
  lastName: string,
): string {
  const parts = [firstName.trim()]
  if (middleInitial.trim()) {
    parts.push(`${middleInitial.trim().replace(/\.$/, '')}.`)
  }
  if (lastName.trim()) {
    parts.push(lastName.trim())
  }
  return parts.filter(Boolean).join(' ')
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

function toStaffUser(
  id: string,
  email: string,
  fullName?: string,
  extra?: Partial<Omit<StaffUser, 'id' | 'email' | 'fullName'>>,
): StaffUser {
  const resolvedName = fullName?.trim() || email.split('@')[0] || 'Staff Member'
  const split = splitFullName(resolvedName)
  return {
    id,
    email,
    fullName: resolvedName,
    firstName: extra?.firstName ?? split.firstName,
    lastName: extra?.lastName ?? split.lastName,
    middleInitial: extra?.middleInitial ?? split.middleInitial,
    homeAddress: extra?.homeAddress ?? '',
    avatarUrl: extra?.avatarUrl ?? '',
    role: extra?.role ?? 'Staff',
    joinedAt: extra?.joinedAt,
    previousLoginAt: extra?.previousLoginAt,
  }
}

function fromSupabaseAuthUser(authUser: {
  id: string
  email?: string
  created_at?: string
  last_sign_in_at?: string
  user_metadata?: Record<string, unknown>
}): StaffUser {
  const meta = authUser.user_metadata ?? {}
  const str = (key: string) => (typeof meta[key] === 'string' ? meta[key] : undefined)
  return toStaffUser(authUser.id, authUser.email ?? '', str('full_name'), {
    firstName: str('first_name'),
    lastName: str('last_name'),
    middleInitial: str('middle_initial'),
    homeAddress: str('home_address'),
    avatarUrl: str('avatar_url'),
    role: str('role') ?? 'Staff',
    joinedAt: authUser.created_at,
    previousLoginAt: authUser.last_sign_in_at,
  })
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
    return fromSupabaseAuthUser(data.user)
  }

  if (!isLocalStaffAuthDemo) {
    throw new Error('Staff authentication is unavailable. Please configure Supabase.')
  }

  const accounts = readDemoAccounts()
  const accountIndex = accounts.findIndex((entry) => entry.email === email)
  const account = accountIndex >= 0 ? accounts[accountIndex] : undefined
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
  const nowIso = new Date().toISOString()
  const previousLoginAt = account.lastLoginAt ?? account.joinedAt ?? nowIso
  const updatedAccount: LocalDemoStaffRecord = {
    ...account,
    previousLoginAt,
    lastLoginAt: nowIso,
  }
  accounts[accountIndex] = updatedAccount
  writeDemoAccounts(accounts)

  const user = toStaffUser(updatedAccount.id, updatedAccount.email, updatedAccount.fullName, {
    firstName: updatedAccount.firstName,
    lastName: updatedAccount.lastName,
    middleInitial: updatedAccount.middleInitial,
    homeAddress: updatedAccount.homeAddress,
    avatarUrl: updatedAccount.avatarUrl,
    role: updatedAccount.role ?? 'Staff',
    joinedAt: updatedAccount.joinedAt,
    previousLoginAt: updatedAccount.previousLoginAt,
  })
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
  const split = splitFullName(fullName)

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: split.firstName,
          last_name: split.lastName,
          middle_initial: split.middleInitial,
          invitation_code: invitationCode,
        },
      },
    })
    if (error || !data.user) {
      throw new Error(error?.message || 'Could not create your staff account. Please try again.')
    }
    return {
      user: fromSupabaseAuthUser(data.user),
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
  const nowIso = new Date().toISOString()

  const record: LocalDemoStaffRecord = {
    id: crypto.randomUUID(),
    fullName,
    firstName: split.firstName,
    lastName: split.lastName,
    middleInitial: split.middleInitial,
    email,
    homeAddress: '',
    avatarUrl: '',
    role: 'Staff',
    joinedAt: nowIso,
    previousLoginAt: nowIso,
    lastLoginAt: nowIso,
    invitationCodeHash,
    passwordSalt,
    passwordHash,
  }
  writeDemoAccounts([...accounts, record])
  const user = toStaffUser(record.id, record.email, record.fullName, {
    firstName: record.firstName,
    lastName: record.lastName,
    middleInitial: record.middleInitial,
    homeAddress: record.homeAddress,
    avatarUrl: record.avatarUrl,
    role: record.role,
    joinedAt: record.joinedAt,
    previousLoginAt: record.previousLoginAt,
  })
  window.localStorage.setItem(demoSessionKey, JSON.stringify(user))
  return { user, requiresEmailConfirmation: false }
}

export async function updateStaffProfile(input: StaffProfileUpdateInput): Promise<StaffUser> {
  const firstName = validateNamePart(input.firstName, 'First name')
  const lastName = validateNamePart(input.lastName, 'Last name')
  const middleInitial = validateMiddleInitial(input.middleInitial)
  const email = validateEmail(input.email)
  const homeAddress = validateHomeAddress(input.homeAddress)
  const avatarUrl = validateAvatarValue(input.avatarUrl)
  const fullName = composeFullName(firstName, middleInitial, lastName)

  if (supabase) {
    const { data: userData, error: authError } = await supabase.auth.updateUser({
      email,
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        middle_initial: middleInitial,
        home_address: homeAddress,
        avatar_url: avatarUrl,
      },
    })
    if (authError || !userData.user) {
      throw new Error(authError?.message || 'Unable to save profile changes.')
    }

    const { error: rpcError } = await supabase.rpc('staff_update_own_profile', {
      p_first_name: firstName,
      p_last_name: lastName,
      p_middle_initial: middleInitial,
      p_home_address: homeAddress,
      p_avatar_url: avatarUrl,
    })
    if (rpcError) {
      throw new Error(rpcError.message || 'Unable to sync staff profile record.')
    }

    return fromSupabaseAuthUser(userData.user)
  }

  if (!isLocalStaffAuthDemo) {
    throw new Error('Profile updates are unavailable. Please configure Supabase.')
  }

  const current = await getCurrentStaffUser()
  if (!current) {
    throw new Error('Please sign in again before updating your account.')
  }

  const accounts = readDemoAccounts()
  const duplicate = accounts.find((entry) => entry.email === email && entry.id !== current.id)
  if (duplicate) {
    throw new Error('Another staff account is already using this email address.')
  }

  const idx = accounts.findIndex((entry) => entry.id === current.id)
  if (idx >= 0) {
    accounts[idx] = {
      ...accounts[idx]!,
      fullName,
      firstName,
      lastName,
      middleInitial,
      email,
      homeAddress,
      avatarUrl,
    }
    writeDemoAccounts(accounts)
  }

  const updated = toStaffUser(current.id, email, fullName, {
    firstName,
    lastName,
    middleInitial,
    homeAddress,
    avatarUrl,
    role: current.role,
    joinedAt: current.joinedAt,
    previousLoginAt: current.previousLoginAt,
  })
  window.localStorage.setItem(demoSessionKey, JSON.stringify(updated))
  return updated
}

export async function updateStaffPassword(input: {
  newPassword: string
  confirmPassword: string
}): Promise<void> {
  const newPassword = validateNewPassword(input.newPassword)
  if (newPassword !== input.confirmPassword) {
    throw new Error('New passwords do not match.')
  }

  if (supabase) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      throw new Error(error.message || 'Unable to update password.')
    }
    return
  }

  if (!isLocalStaffAuthDemo) {
    throw new Error('Password updates are unavailable. Please configure Supabase.')
  }

  const current = await getCurrentStaffUser()
  if (!current) {
    throw new Error('Please sign in again before changing your password.')
  }

  const accounts = readDemoAccounts()
  const idx = accounts.findIndex((entry) => entry.id === current.id)
  if (idx >= 0) {
    const passwordSalt = crypto.randomUUID()
    const passwordHash = await hashSecretWithSalt(newPassword, passwordSalt)
    accounts[idx] = {
      ...accounts[idx]!,
      passwordSalt,
      passwordHash,
    }
    writeDemoAccounts(accounts)
  }
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
    return fromSupabaseAuthUser(data.session.user)
  }

  if (!isLocalStaffAuthDemo) return null
  const raw = window.localStorage.getItem(demoSessionKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StaffUser>
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return toStaffUser(parsed.id, parsed.email, parsed.fullName, {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        middleInitial: parsed.middleInitial,
        homeAddress: parsed.homeAddress,
        avatarUrl: parsed.avatarUrl,
        role: parsed.role,
        joinedAt: parsed.joinedAt,
        previousLoginAt: parsed.previousLoginAt,
      })
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
      onChange(fromSupabaseAuthUser(authUser))
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
