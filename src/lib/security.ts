// Shared input validation, sanitization, and client-side auth security helpers.
// Note: Server-side SQL injection protection is enforced by parameterized Supabase RPCs,
// PostgreSQL CHECK constraints, and Row Level Security in docs/supabase-staff-schema.sql.

const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i
const FULL_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,79}$/u
const NAME_PART_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{0,39}$/u
const MIDDLE_INITIAL_PATTERN = /^[\p{L}\p{M}]{1,2}\.?$/u
const HOME_ADDRESS_PATTERN = /^[\p{L}\p{M}\d\s,.'#/\-()]{0,200}$/u
const SAFE_AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const INVITE_CODE_PATTERN = /^[A-Z0-9-]{6,32}$/
const PRODUCT_ID_PATTERN = /^[a-z0-9-]{1,64}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MAX_EMAIL_LENGTH = 254
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

export function stripControlChars(value: string): string {
  let result = ''
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code > 0x1f && code !== 0x7f) result += value[i]
  }
  return result
}

export function validateEmail(raw: string): string {
  const email = stripControlChars(raw).trim().toLowerCase()
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new Error('Please enter a valid work email address.')
  }
  return email
}

export function validateFullName(raw: string): string {
  const cleaned = stripControlChars(raw).trim().replace(/\s+/g, ' ')
  if (cleaned.length < 2 || cleaned.length > 80 || !FULL_NAME_PATTERN.test(cleaned)) {
    throw new Error('Please enter a valid full name (letters, spaces, hyphens, or apostrophes).')
  }
  return cleaned
}

export function validateNamePart(raw: string, fieldLabel: string): string {
  const cleaned = stripControlChars(raw).trim().replace(/\s+/g, ' ')
  if (cleaned.length < 1 || cleaned.length > 40 || !NAME_PART_PATTERN.test(cleaned)) {
    throw new Error(`Please enter a valid ${fieldLabel.toLowerCase()}.`)
  }
  return cleaned
}

export function validateMiddleInitial(raw: string): string {
  const cleaned = stripControlChars(raw).trim().toUpperCase()
  if (!cleaned) return ''
  if (!MIDDLE_INITIAL_PATTERN.test(cleaned)) {
    throw new Error('Middle initial should be 1 to 2 letters.')
  }
  return cleaned.replace(/\.$/, '')
}

export function validateHomeAddress(raw: string): string {
  const cleaned = stripControlChars(raw).trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  if (cleaned.length > 200 || !HOME_ADDRESS_PATTERN.test(cleaned)) {
    throw new Error('Home address contains unsupported characters or exceeds 200 characters.')
  }
  return cleaned
}

export function validateAvatarValue(raw: string | null | undefined): string {
  if (!raw) return ''
  const cleaned = stripControlChars(raw).trim()
  if (!cleaned) return ''
  if (SAFE_AVATAR_DATA_URL.test(cleaned)) {
    // Limit base64 payload to ~2.8MB (roughly a 2MB source image)
    if (cleaned.length > 2_900_000) {
      throw new Error('Avatar image must be smaller than 2 MB.')
    }
    return cleaned
  }
  try {
    const parsed = new URL(cleaned)
    if (parsed.protocol === 'https:') {
      return cleaned
    }
  } catch {
    // Fall through to error
  }
  throw new Error('Avatar must be a PNG, JPEG, or WebP image.')
}

export function validateInvitationCode(raw: string): string {
  const code = stripControlChars(raw).trim().toUpperCase()
  if (!INVITE_CODE_PATTERN.test(code)) {
    throw new Error('Invitation code must contain only letters, numbers, and hyphens.')
  }
  return code
}

export function validateNewPassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    )
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must include at least one letter and one number.')
  }
  return password
}

export function validateLoginPassword(password: string): string {
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Please enter your password.')
  }
  return password
}

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function validateProductId(raw: string): string {
  const id = stripControlChars(raw).trim()
  if (!PRODUCT_ID_PATTERN.test(id)) {
    throw new Error('Invalid product identifier.')
  }
  return id
}

export function validateStockQuantity(quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999) {
    throw new Error('Quantity must be a whole number between 0 and 999.')
  }
  return quantity
}

export function sanitizeInternalRedirect(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = stripControlChars(raw).trim()
  // Block protocol-relative URLs (//evil.com), backslashes (/\evil.com), or non-relative paths.
  if (!cleaned.startsWith('/') || cleaned.startsWith('//') || cleaned.includes('\\')) {
    return null
  }
  return cleaned
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export async function hashSecretWithSalt(secret: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export interface AttemptThrottle {
  checkAllowed: (key: string) => void
  recordFailure: (key: string) => void
  reset: (key: string) => void
}

export function createAttemptThrottle(maxAttempts = 5, lockoutMs = 60_000): AttemptThrottle {
  const attempts = new Map<string, { count: number; lockedUntil: number }>()

  return {
    checkAllowed(key: string) {
      const entry = attempts.get(key)
      if (!entry) return
      const remaining = entry.lockedUntil - Date.now()
      if (remaining > 0) {
        const seconds = Math.ceil(remaining / 1000)
        throw new Error(`Too many failed attempts. Please wait ${seconds}s and try again.`)
      }
      if (entry.lockedUntil > 0 && remaining <= 0) {
        attempts.delete(key)
      }
    },
    recordFailure(key: string) {
      const current = attempts.get(key) ?? { count: 0, lockedUntil: 0 }
      const nextCount = current.count + 1
      attempts.set(key, {
        count: nextCount,
        lockedUntil: nextCount >= maxAttempts ? Date.now() + lockoutMs : 0,
      })
    },
    reset(key: string) {
      attempts.delete(key)
    },
  }
}
