<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import StaffAuthField from '@/components/staff/StaffAuthField.vue'
import StaffAuthLayout from '@/components/staff/StaffAuthLayout.vue'
import { sanitizeInternalRedirect } from '@/lib/security'
import { useStaffAuthStore } from '@/stores/staffAuth'

const route = useRoute()
const router = useRouter()
const authStore = useStaffAuthStore()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const isResetting = ref(false)
const errorMessage = ref('')
const statusMessage = ref('')

function resolvePostLoginTarget() {
  return sanitizeInternalRedirect(route.query.redirect) ?? { name: 'staff-queue' }
}

async function handleSubmit() {
  if (isSubmitting.value) return
  errorMessage.value = ''
  statusMessage.value = ''
  isSubmitting.value = true

  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    })
    password.value = ''
    await router.push(resolvePostLoginTarget())
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to sign in. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleForgotPassword() {
  if (isResetting.value) return
  errorMessage.value = ''
  statusMessage.value = ''
  isResetting.value = true

  try {
    await authStore.resetPassword(email.value)
    statusMessage.value = authStore.isLocalDemo
      ? 'Local preview mode: password reset instructions would be emailed once Supabase is connected.'
      : 'If an account matches that email, a password reset link has been sent.'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to send password reset instructions.'
  } finally {
    isResetting.value = false
  }
}
</script>

<template>
  <StaffAuthLayout title="Staff Login">
    <form class="staff-auth-form" novalidate @submit.prevent="handleSubmit">
      <div class="staff-auth-fields">
        <StaffAuthField
          id="staff-login-email"
          v-model="email"
          label="Email Address"
          type="email"
          placeholder="Enter your work email"
          autocomplete="email"
          :disabled="isSubmitting"
        />

        <StaffAuthField
          id="staff-login-password"
          v-model="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          :disabled="isSubmitting"
        />
      </div>

      <div class="staff-forgot-row">
        <button
          type="button"
          class="staff-forgot-button"
          :disabled="isSubmitting || isResetting"
          @click="handleForgotPassword"
        >
          Forgot Password
        </button>
      </div>

      <p v-if="errorMessage" class="staff-feedback staff-feedback--error" role="alert">
        {{ errorMessage }}
      </p>
      <p v-else-if="statusMessage" class="staff-feedback staff-feedback--status" role="status">
        {{ statusMessage }}
      </p>

      <div class="staff-auth-actions">
        <button
          type="submit"
          class="staff-auth-submit staff-auth-submit--login"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Logging in...' : 'Login' }}
        </button>

        <p class="staff-auth-switch staff-auth-switch--login">
          <span>Don&rsquo;t have an account?</span>
          {{ ' ' }}
          <RouterLink :to="{ name: 'staff-register' }" class="staff-auth-link staff-auth-link--signup">
            Sign-up
          </RouterLink>
        </p>
      </div>
    </form>
  </StaffAuthLayout>
</template>

<style scoped>
.staff-auth-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: min(293px, 100%);
  margin-inline: auto;
}

.staff-auth-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.staff-forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.staff-forgot-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #5d7706;
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 1.2px;
  cursor: pointer;
}

.staff-forgot-button:hover:not(:disabled) {
  text-decoration: underline;
}

.staff-forgot-button:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 2px;
  border-radius: 4px;
}

.staff-forgot-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.staff-feedback {
  margin: 16px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0.4px;
}

.staff-feedback--error {
  background-color: #fdf1ef;
  border: 1px solid #d98278;
  color: #8f2419;
}

.staff-feedback--status {
  background-color: #f3f7e7;
  border: 1px solid #9db44f;
  color: #2c4003;
}

.staff-auth-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding-top: 24px;
  width: 100%;
}

.staff-auth-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 2.4px;
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    filter 140ms ease;
}

.staff-auth-submit--login {
  background-color: #5d7706;
  box-shadow: 0 6px 0 0 #124702;
}

.staff-auth-submit--login:hover:not(:disabled) {
  filter: brightness(1.06);
}

.staff-auth-submit--login:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 3px 0 0 #124702;
}

.staff-auth-submit:focus-visible {
  outline: 3px solid #0c3201;
  outline-offset: 4px;
}

.staff-auth-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.staff-auth-switch {
  margin: 18px 0 0;
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 1.2px;
  text-align: center;
}

.staff-auth-switch--login {
  color: #898781;
}

.staff-auth-link {
  font-weight: 900;
  text-decoration: none;
}

.staff-auth-link:hover {
  text-decoration: underline;
}

.staff-auth-link:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 2px;
  border-radius: 4px;
}

.staff-auth-link--signup {
  color: #c77824;
}
</style>
