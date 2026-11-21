import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getCurrentStaffUser,
  isLocalStaffAuthDemo,
  loginStaff,
  logoutStaff,
  registerStaff,
  requestPasswordReset,
  subscribeStaffAuthChanges,
  updateStaffPassword,
  updateStaffProfile,
  type StaffLoginInput,
  type StaffProfileUpdateInput,
  type StaffRegistrationInput,
  type StaffRegistrationResult,
  type StaffUser,
} from '@/services/staffAuth'

export const useStaffAuthStore = defineStore('staffAuth', () => {
  const user = ref<StaffUser | null>(null)
  const initialized = ref(false)
  const isLocalDemo = isLocalStaffAuthDemo

  let initPromise: Promise<void> | null = null
  let unsubscribeAuth: (() => void) | null = null

  const isAuthenticated = computed(() => user.value !== null)

  async function init(): Promise<void> {
    if (initialized.value) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      try {
        user.value = await getCurrentStaffUser()
      } finally {
        initialized.value = true
        if (!unsubscribeAuth) {
          unsubscribeAuth = subscribeStaffAuthChanges((nextUser) => {
            user.value = nextUser
          })
        }
      }
    })()

    return initPromise
  }

  async function login(input: StaffLoginInput): Promise<StaffUser> {
    const signedIn = await loginStaff(input)
    user.value = signedIn
    initialized.value = true
    return signedIn
  }

  async function register(input: StaffRegistrationInput): Promise<StaffRegistrationResult> {
    const result = await registerStaff(input)
    if (!result.requiresEmailConfirmation) {
      user.value = result.user
      initialized.value = true
    }
    return result
  }

  async function updateProfile(input: StaffProfileUpdateInput): Promise<StaffUser> {
    const updated = await updateStaffProfile(input)
    user.value = updated
    return updated
  }

  async function changePassword(input: {
    newPassword: string
    confirmPassword: string
  }): Promise<void> {
    await updateStaffPassword(input)
  }

  async function resetPassword(email: string): Promise<void> {
    await requestPasswordReset(email)
  }

  async function logout(): Promise<void> {
    await logoutStaff()
    user.value = null
  }

  return {
    user,
    initialized,
    isAuthenticated,
    isLocalDemo,
    init,
    login,
    register,
    updateProfile,
    changePassword,
    resetPassword,
    logout,
  }
})
