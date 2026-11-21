<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { composeFullName, splitFullName } from '@/services/staffAuth'
import { useStaffAuthStore } from '@/stores/staffAuth'
import passwordBlindIcon from '@/assets/staff/password-blind.png'
import toastDot from '@/assets/staff/dashboard/toast-dot.svg'

const authStore = useStaffAuthStore()

const firstName = ref('')
const lastName = ref('')
const middleInitial = ref('')
const email = ref('')
const homeAddress = ref('')
const avatarUrl = ref('')
const selectedFileName = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const savingProfile = ref(false)
const savingPassword = ref(false)
const profileError = ref('')
const passwordError = ref('')
const avatarError = ref('')
const toastMessage = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)
let toastTimer: number | null = null

const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function syncFormFromUser() {
  const user = authStore.user
  if (!user) return
  const split = splitFullName(user.fullName)
  firstName.value = user.firstName ?? split.firstName
  lastName.value = user.lastName ?? split.lastName
  middleInitial.value = user.middleInitial ?? split.middleInitial
  email.value = user.email
  homeAddress.value = user.homeAddress ?? ''
  avatarUrl.value = user.avatarUrl ?? ''
  selectedFileName.value = ''
  profileError.value = ''
  avatarError.value = ''
}

watch(
  () => authStore.user,
  () => {
    syncFormFromUser()
  },
  { immediate: true },
)

const displayName = computed(() => {
  const composed = composeFullName(firstName.value, middleInitial.value, lastName.value)
  return composed || authStore.user?.fullName || 'Staff Member'
})

const avatarInitials = computed(() => {
  const first = firstName.value.trim().charAt(0)
  const last = lastName.value.trim().charAt(0)
  const combined = `${first}${last}`.toUpperCase()
  if (combined) return combined
  return (authStore.user?.email.charAt(0) || 'S').toUpperCase()
})

const isProfileDirty = computed(() => {
  const user = authStore.user
  if (!user) return false
  const split = splitFullName(user.fullName)
  return (
    firstName.value.trim() !== (user.firstName ?? split.firstName).trim() ||
    lastName.value.trim() !== (user.lastName ?? split.lastName).trim() ||
    middleInitial.value.trim().toUpperCase() !==
      (user.middleInitial ?? split.middleInitial).trim().toUpperCase() ||
    email.value.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
    homeAddress.value.trim() !== (user.homeAddress ?? '').trim() ||
    avatarUrl.value !== (user.avatarUrl ?? '')
  )
})

const passwordChecks = computed(() => ({
  length: newPassword.value.length >= 8 && newPassword.value.length <= 128,
  letter: /[A-Za-z]/.test(newPassword.value),
  number: /\d/.test(newPassword.value),
  matches: newPassword.value.length > 0 && newPassword.value === confirmPassword.value,
}))

const canSubmitPassword = computed(
  () =>
    !savingPassword.value &&
    passwordChecks.value.length &&
    passwordChecks.value.letter &&
    passwordChecks.value.number &&
    passwordChecks.value.matches,
)

function formatShortDate(iso?: string): string {
  if (!iso) return 'Not recorded'
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts))
}

function formatDateTime(iso?: string): string {
  if (!iso) return 'Current session'
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 'Current session'
  const datePart = formatShortDate(iso)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts))
  return `${datePart}, ${timePart}`
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 4000)
}

function triggerAvatarPicker() {
  avatarError.value = ''
  fileInputRef.value?.click()
}

function handleAvatarSelected(event: Event) {
  avatarError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    avatarError.value = 'Please choose a PNG, JPEG, or WebP image.'
    return
  }
  if (file.size > MAX_AVATAR_BYTES) {
    avatarError.value = 'Image must be smaller than 2 MB.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      avatarUrl.value = reader.result
      selectedFileName.value = file.name
    }
  }
  reader.onerror = () => {
    avatarError.value = 'Could not read the selected image. Please try another file.'
  }
  reader.readAsDataURL(file)
}

function handleRemoveAvatar() {
  avatarUrl.value = ''
  selectedFileName.value = ''
  avatarError.value = ''
}

async function handleSaveProfile() {
  if (savingProfile.value) return
  profileError.value = ''
  avatarError.value = ''
  savingProfile.value = true

  try {
    await authStore.updateProfile({
      firstName: firstName.value,
      lastName: lastName.value,
      middleInitial: middleInitial.value,
      email: email.value,
      homeAddress: homeAddress.value,
      avatarUrl: avatarUrl.value,
    })
    selectedFileName.value = ''
    showToast('Profile changes saved')
  } catch (error) {
    profileError.value = error instanceof Error ? error.message : 'Unable to save profile changes.'
  } finally {
    savingProfile.value = false
  }
}

async function handleSavePassword() {
  if (savingPassword.value) return
  passwordError.value = ''
  savingPassword.value = true

  try {
    await authStore.changePassword({
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })
    newPassword.value = ''
    confirmPassword.value = ''
    showNewPassword.value = false
    showConfirmPassword.value = false
    showToast('Password updated')
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : 'Unable to update password.'
  } finally {
    savingPassword.value = false
  }
}

onUnmounted(() => {
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="account-page">
    <div class="account-container">
      <header class="account-header">
        <div>
          <h1 class="account-header__title">My Account</h1>
          <p class="account-header__subtitle">
            Manage your staff profile, avatar, and sign-in password.
          </p>
        </div>
        <span v-if="authStore.isLocalDemo" class="account-mode-pill">Local preview</span>
      </header>

      <section class="identity-band" aria-label="Staff identity and session history">
        <div class="identity-band__profile">
          <div class="avatar-frame">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="`${displayName} avatar`"
              class="avatar-frame__img"
            />
            <span v-else class="avatar-frame__initials" aria-hidden="true">
              {{ avatarInitials }}
            </span>
          </div>

          <div class="identity-band__details">
            <div class="identity-band__name-row">
              <p class="identity-band__name">{{ displayName }}</p>
              <span class="identity-band__role">{{ authStore.user?.role || 'Staff' }}</span>
            </div>
            <p class="identity-band__email">{{ authStore.user?.email }}</p>

            <div class="avatar-controls">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                aria-label="Choose avatar image"
                @change="handleAvatarSelected"
              />
              <button type="button" class="avatar-btn" @click="triggerAvatarPicker">
                Change Avatar
              </button>
              <button
                v-if="avatarUrl"
                type="button"
                class="avatar-remove-btn"
                @click="handleRemoveAvatar"
              >
                Remove
              </button>
              <span class="avatar-hint">
                {{ selectedFileName || 'PNG, JPG, WebP · max 2 MB' }}
              </span>
            </div>
            <p v-if="avatarError" class="inline-error inline-error--compact" role="alert">
              {{ avatarError }}
            </p>
          </div>
        </div>

        <dl class="identity-meta">
          <div class="identity-meta__row">
            <dt class="identity-meta__label">Joined since</dt>
            <dd class="identity-meta__value">{{ formatShortDate(authStore.user?.joinedAt) }}</dd>
          </div>
          <div class="identity-meta__row">
            <dt class="identity-meta__label">Previous login</dt>
            <dd class="identity-meta__value">
              {{ formatDateTime(authStore.user?.previousLoginAt) }}
            </dd>
          </div>
        </dl>
      </section>

      <div class="account-surface">
        <form class="account-section" novalidate @submit.prevent="handleSaveProfile">
          <div class="section-head">
            <h2 class="section-head__title">Profile details</h2>
            <span v-if="isProfileDirty" class="dirty-badge">Unsaved changes</span>
          </div>

          <div class="field-grid field-grid--name">
            <div class="field">
              <label for="account-last-name" class="field__label">Last Name</label>
              <input
                id="account-last-name"
                v-model="lastName"
                type="text"
                class="field__input"
                autocomplete="family-name"
                placeholder="Dela Cruz"
                required
                :disabled="savingProfile"
              />
            </div>

            <div class="field">
              <label for="account-first-name" class="field__label">First Name</label>
              <input
                id="account-first-name"
                v-model="firstName"
                type="text"
                class="field__input"
                autocomplete="given-name"
                placeholder="Juan"
                required
                :disabled="savingProfile"
              />
            </div>

            <div class="field">
              <label for="account-middle-initial" class="field__label">Middle Initial</label>
              <input
                id="account-middle-initial"
                v-model="middleInitial"
                type="text"
                maxlength="2"
                class="field__input field__input--centered"
                placeholder="M"
                :disabled="savingProfile"
              />
            </div>
          </div>

          <div class="field-grid field-grid--contact">
            <div class="field">
              <label for="account-email" class="field__label">Email Address</label>
              <input
                id="account-email"
                v-model="email"
                type="email"
                class="field__input"
                autocomplete="email"
                placeholder="staff@bakenbrew.ph"
                required
                :disabled="savingProfile"
              />
            </div>

            <div class="field">
              <label for="account-home-address" class="field__label">Home Address</label>
              <input
                id="account-home-address"
                v-model="homeAddress"
                type="text"
                class="field__input"
                autocomplete="street-address"
                placeholder="Street, Barangay, City"
                :disabled="savingProfile"
              />
            </div>
          </div>

          <p v-if="profileError" class="inline-error" role="alert">{{ profileError }}</p>

          <div class="section-actions">
            <button
              type="button"
              class="btn-secondary"
              :disabled="!isProfileDirty || savingProfile"
              @click="syncFormFromUser"
            >
              Reset
            </button>
            <button
              type="submit"
              class="btn-primary btn-primary--olive"
              :disabled="!isProfileDirty || savingProfile"
            >
              {{ savingProfile ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>

        <form
          class="account-section account-section--divided"
          novalidate
          @submit.prevent="handleSavePassword"
        >
          <div class="section-head">
            <h2 class="section-head__title">Password &amp; security</h2>
            <span class="section-head__hint">Minimum 8 characters with a letter and a number</span>
          </div>

          <div class="field-grid field-grid--password">
            <div class="field">
              <label for="account-new-password" class="field__label">Set New Password</label>
              <div class="password-wrap">
                <input
                  id="account-new-password"
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="field__input field__input--password"
                  autocomplete="new-password"
                  placeholder="Create a new password"
                  :disabled="savingPassword"
                />
                <button
                  type="button"
                  class="password-toggle"
                  :class="{ 'password-toggle--active': showNewPassword }"
                  :aria-label="showNewPassword ? 'Hide Set New Password' : 'Show Set New Password'"
                  :aria-pressed="showNewPassword"
                  @click="showNewPassword = !showNewPassword"
                >
                  <img
                    :src="passwordBlindIcon"
                    alt=""
                    aria-hidden="true"
                    width="20"
                    height="17"
                    class="password-toggle__icon"
                  />
                </button>
              </div>
            </div>

            <div class="field">
              <label for="account-confirm-password" class="field__label">Confirm New Password</label>
              <div class="password-wrap">
                <input
                  id="account-confirm-password"
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="field__input field__input--password"
                  autocomplete="new-password"
                  placeholder="Re-enter new password"
                  :disabled="savingPassword"
                />
                <button
                  type="button"
                  class="password-toggle"
                  :class="{ 'password-toggle--active': showConfirmPassword }"
                  :aria-label="
                    showConfirmPassword
                      ? 'Hide Confirm New Password'
                      : 'Show Confirm New Password'
                  "
                  :aria-pressed="showConfirmPassword"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <img
                    :src="passwordBlindIcon"
                    alt=""
                    aria-hidden="true"
                    width="20"
                    height="17"
                    class="password-toggle__icon"
                  />
                </button>
              </div>
            </div>
          </div>

          <p v-if="passwordError" class="inline-error" role="alert">{{ passwordError }}</p>

          <div class="section-actions section-actions--split">
            <ul class="password-checks" aria-label="Password requirements">
              <li class="password-check" :class="{ 'password-check--met': passwordChecks.length }">
                8+ chars
              </li>
              <li class="password-check" :class="{ 'password-check--met': passwordChecks.letter }">
                Letter
              </li>
              <li class="password-check" :class="{ 'password-check--met': passwordChecks.number }">
                Number
              </li>
              <li class="password-check" :class="{ 'password-check--met': passwordChecks.matches }">
                Matches
              </li>
            </ul>

            <button
              type="submit"
              class="btn-primary btn-primary--amber"
              :disabled="!canSubmitPassword"
            >
              {{ savingPassword ? 'Updating...' : 'Save Password' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="toastMessage" class="account-toast" role="status" aria-live="polite">
      <img :src="toastDot" alt="" aria-hidden="true" width="10" height="10" class="account-toast__dot" />
      <span class="account-toast__text">{{ toastMessage }}</span>
    </div>
  </section>
</template>

<style scoped>
.account-page {
  flex: 1;
  min-height: 100%;
  background-color: #f8f8f6;
  padding: 20px 26px 28px;
  color: #111111;
}

.account-container {
  width: min(820px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.account-header__title {
  margin: 0;
  color: #0b0c08;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.account-header__subtitle {
  margin: 4px 0 0;
  color: #5f5e5a;
  font-size: 14px;
}

.account-mode-pill {
  padding: 5px 12px;
  border: 1px solid #d5ceb4;
  border-radius: 999px;
  background-color: #f9f3dd;
  color: #4f4c3f;
  font-size: 12px;
  font-weight: 600;
}

.identity-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 232px;
  gap: 20px;
  align-items: center;
  padding: 18px 22px;
  border-radius: 16px;
  background-color: #f9f3dd;
}

.identity-band__profile {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.avatar-frame {
  width: 82px;
  height: 82px;
  flex-shrink: 0;
  border-radius: 14px;
  background-color: #405909;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #ffffff;
}

.avatar-frame__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-frame__initials {
  color: #f9f3dd;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.identity-band__details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.identity-band__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.identity-band__name {
  margin: 0;
  color: #0b0c08;
  font-size: 19px;
  font-weight: 800;
  line-height: 1.2;
}

.identity-band__role {
  padding: 2px 9px;
  border-radius: 999px;
  background-color: #e7efc8;
  color: #314505;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.identity-band__email {
  margin: 0;
  color: #4f4c3f;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.avatar-btn {
  height: 30px;
  padding: 0 12px;
  border: 1.5px solid #5d7706;
  border-radius: 8px;
  background-color: #ffffff;
  color: #314505;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.avatar-btn:hover {
  background-color: #5d7706;
  color: #ffffff;
}

.avatar-remove-btn {
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #8f2419;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.avatar-remove-btn:hover {
  text-decoration: underline;
}

.avatar-hint {
  color: #5c5746;
  font-size: 11.5px;
}

.identity-meta {
  margin: 0;
  padding-left: 20px;
  border-left: 1px solid #e1d8ba;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.identity-meta__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.identity-meta__label {
  color: #5c5746;
  font-size: 11.5px;
  font-weight: 700;
}

.identity-meta__value {
  margin: 0;
  color: #0b0c08;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.account-surface {
  border: 1.5px solid #5d7706;
  border-radius: 14px;
  background-color: #ffffff;
  overflow: hidden;
}

.account-section {
  padding: 20px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.account-section--divided {
  border-top: 1px solid #ebe8df;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.section-head__title {
  margin: 0;
  color: #0b0c08;
  font-size: 16px;
  font-weight: 800;
}

.section-head__hint {
  color: #5f5e5a;
  font-size: 12px;
}

.dirty-badge {
  padding: 2px 9px;
  border-radius: 999px;
  background-color: #fdf1d0;
  color: #7c4b0e;
  font-size: 11.5px;
  font-weight: 700;
}

.field-grid {
  display: grid;
  gap: 14px;
}

.field-grid--name {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 118px;
}

.field-grid--contact {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
}

.field-grid--password {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.field__label {
  color: #161712;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}

.field__input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #cfcdc4;
  border-radius: 10px;
  background-color: #ffffff;
  color: #0b0c08;
  font-size: 14px;
  caret-color: #5d7706;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.field__input--centered {
  text-align: center;
  text-transform: uppercase;
}

.field__input--password {
  padding-right: 40px;
}

.field__input::placeholder {
  color: #76746c;
}

.field__input:focus {
  outline: none;
  border-color: #5d7706;
  box-shadow: 0 0 0 3px rgba(93, 119, 6, 0.16);
}

.field__input:disabled {
  background-color: #f6f4ee;
  cursor: not-allowed;
}

.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: opacity 140ms ease;
}

.password-toggle--active {
  opacity: 0.48;
}

.password-toggle__icon {
  display: block;
  width: 20px;
  height: 17px;
  object-fit: contain;
  pointer-events: none;
}

.inline-error {
  margin: 0;
  padding: 9px 12px;
  border: 1px solid #d98278;
  border-radius: 10px;
  background-color: #fdf1ef;
  color: #8f2419;
  font-size: 12.5px;
  line-height: 1.4;
}

.inline-error--compact {
  margin-top: 4px;
  padding: 6px 10px;
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 2px;
}

.section-actions--split {
  justify-content: space-between;
}

.password-checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.password-check {
  padding: 3px 9px;
  border: 1px solid #dfddd4;
  border-radius: 999px;
  background-color: #f8f8f6;
  color: #5f5e5a;
  font-size: 11.5px;
  font-weight: 600;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.password-check--met {
  border-color: #9db44f;
  background-color: #eef5d9;
  color: #2f4304;
}

.btn-secondary {
  height: 38px;
  padding: 0 16px;
  border: 1px solid #cfcdc4;
  border-radius: 10px;
  background-color: #ffffff;
  color: #3f4038;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f4f3ee;
  border-color: #9c998e;
}

.btn-primary {
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    filter 140ms ease,
    transform 100ms ease;
}

.btn-primary--olive {
  background-color: #5d7706;
}

.btn-primary--amber {
  background-color: #c77824;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.06);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.avatar-btn:focus-visible,
.avatar-remove-btn:focus-visible,
.password-toggle:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 2px;
}

.account-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 170px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  background-color: #405909;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
}

.account-toast__dot {
  display: block;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.account-toast__text {
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 820px) {
  .identity-band {
    grid-template-columns: 1fr;
  }

  .identity-meta {
    padding-left: 0;
    padding-top: 12px;
    border-left: 0;
    border-top: 1px solid #e1d8ba;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .field-grid--name,
  .field-grid--contact,
  .field-grid--password {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .avatar-btn,
  .field__input,
  .password-toggle,
  .password-check,
  .btn-secondary,
  .btn-primary {
    transition: none;
  }
}
</style>
