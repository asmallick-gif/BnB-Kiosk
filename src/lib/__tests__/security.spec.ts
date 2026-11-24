import { describe, expect, it } from 'vitest'
import {
  createAttemptThrottle,
  hashSecretWithSalt,
  isValidUuid,
  sanitizeInternalRedirect,
  timingSafeEqualString,
  validateEmail,
  validateFullName,
  validateInvitationCode,
  validateNewPassword,
} from '../security'

describe('security validation and sanitization helpers', () => {
  it('rejects SQL injection and XSS payloads in email, name, and invitation code', () => {
    expect(() => validateEmail("admin' OR '1'='1@test.com")).toThrow('valid work email')
    expect(() => validateEmail('user@example.com; DROP TABLE users;--')).toThrow('valid work email')
    expect(() => validateFullName("Robert'); DROP TABLE staff_profiles;--")).toThrow('valid full name')
    expect(() => validateFullName('<script>alert(1)</script>')).toThrow('valid full name')
    expect(() => validateInvitationCode("' OR 1=1 --")).toThrow('letters, numbers, and hyphens')
    expect(() => validateInvitationCode('BNB-5JSN-SYN3; SELECT *')).toThrow(
      'letters, numbers, and hyphens',
    )
  })

  it('normalizes valid email, name, invitation code, and checks password strength', () => {
    expect(validateEmail('  Maria.Santos@BakeNBrew.ph \n')).toBe('maria.santos@bakenbrew.ph')
    expect(validateFullName("  Maria   O'Connor-Cruz  ")).toBe("Maria O'Connor-Cruz")
    expect(validateInvitationCode(' bnb-5jsn-syn3 ')).toBe('BNB-5JSN-SYN3')

    expect(() => validateNewPassword('12345678')).toThrow('letter and one number')
    expect(() => validateNewPassword('abcdefgh')).toThrow('letter and one number')
    expect(() => validateNewPassword('Pass1')).toThrow('between 8 and 128')
    expect(validateNewPassword('Coffee2026')).toBe('Coffee2026')
  })

  it('blocks open redirects and validates UUIDs', () => {
    expect(sanitizeInternalRedirect('/queue')).toBe('/queue')
    expect(sanitizeInternalRedirect('/staff/queue')).toBe('/staff/queue')
    expect(sanitizeInternalRedirect('https://evil.com')).toBeNull()
    expect(sanitizeInternalRedirect('//evil.com')).toBeNull()
    expect(sanitizeInternalRedirect('/\\evil.com')).toBeNull()

    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidUuid("550e8400' OR '1'='1")).toBe(false)
  })

  it('hashes secrets with salt and throttles repeated failed attempts', async () => {
    const hashA = await hashSecretWithSalt('Password123', 'salt-1')
    const hashB = await hashSecretWithSalt('Password123', 'salt-2')
    expect(hashA).toHaveLength(64)
    expect(hashA).not.toBe(hashB)
    expect(timingSafeEqualString(hashA, hashA)).toBe(true)
    expect(timingSafeEqualString(hashA, hashB)).toBe(false)

    const throttle = createAttemptThrottle(3, 60_000)
    throttle.recordFailure('a@b.com')
    throttle.recordFailure('a@b.com')
    expect(() => throttle.checkAllowed('a@b.com')).not.toThrow()
    throttle.recordFailure('a@b.com')
    expect(() => throttle.checkAllowed('a@b.com')).toThrow('Too many failed attempts')
    throttle.reset('a@b.com')
    expect(() => throttle.checkAllowed('a@b.com')).not.toThrow()

    throttle.recordFailure('b@b.com')
    throttle.recordFailure('b@b.com')
    throttle.recordFailure('b@b.com')
    expect(() => throttle.checkAllowed('b@b.com')).toThrow('Too many failed attempts')
    throttle.clear()
    expect(() => throttle.checkAllowed('b@b.com')).not.toThrow()
  })
})
