<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import StaffAuthField from '@/components/staff/StaffAuthField.vue'
import StaffAuthLayout from '@/components/staff/StaffAuthLayout.vue'
import { useStaffAuthStore } from '@/stores/staffAuth'

const router = useRouter()
const authStore = useStaffAuthStore()

const fullName = ref('')
const email = ref('')
const invitationCode = ref('')
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const statusMessage = ref('')

async function handleSubmit() {
  if (isSubmitting.value) return
  errorMessage.value = ''
  statusMessage.value = ''

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  isSubmitting.value = true
  try {
    const result = await authStore.register({
      fullName: fullName.value,
      email: email.value,
      invitationCode: invitationCode.value,
      password: password.value,
    })
    password.value = ''
    confirmPassword.value = ''

    if (result.requiresEmailConfirmation) {
      statusMessage.value = `Account created for ${result.user.email}. Please verify your email before logging in.`
    } else {
      await router.push({ name: 'staff-queue' })
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to create your staff account.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <StaffAuthLayout title="Create a Staff Account">
    <form class="staff-auth-form" novalidate @submit.prevent="handleSubmit">
      <div class="staff-auth-fields">
        <StaffAuthField
          id="staff-register-name"
          v-model="fullName"
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          autocomplete="name"
          :disabled="isSubmitting"
        />

        <StaffAuthField
          id="staff-register-email"
          v-model="email"
          label="Email Address"
          type="email"
          placeholder="Enter your work email"
          autocomplete="email"
          :disabled="isSubmitting"
        />

        <StaffAuthField
          id="staff-register-code"
          v-model="invitationCode"
          label="Invitation Code"
          type="text"
          placeholder="Enter your staff code"
          autocomplete="off"
          :disabled="isSubmitting"
        />

        <StaffAuthField
          id="staff-register-password"
          v-model="password"
          label="Password"
          type="password"
          placeholder="Create a password"
          autocomplete="new-password"
          :disabled="isSubmitting"
        />

        <StaffAuthField
          id="staff-register-confirm-password"
          v-model="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          autocomplete="new-password"
          :disabled="isSubmitting"
        />
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
          class="staff-auth-submit staff-auth-submit--register"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Creating...' : 'Create account' }}
        </button>

        <p class="staff-auth-switch staff-auth-switch--register">
          <span>Already have an account?</span>
          {{ ' ' }}
          <RouterLink :to="{ name: 'staff-login' }" class="staff-auth-link staff-auth-link--login">
            Login here
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

.staff-feedback {
  margin: 12px 0 0;
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

.staff-auth-submit--register {
  background-color: #c77824;
  box-shadow: 0 6px 0 0 #8f571a;
}

.staff-auth-submit--register:hover:not(:disabled) {
  filter: brightness(1.06);
}

.staff-auth-submit--register:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 3px 0 0 #8f571a;
}

.staff-auth-submit:focus-visible {
  outline: 3px solid #59330b;
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

.staff-auth-switch--register {
  color: #0c3201;
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

.staff-auth-link--login {
  color: #5d7706;
}
</style>
