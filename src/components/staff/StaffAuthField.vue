<script setup lang="ts">
import { computed, ref } from 'vue'
import passwordBlindIcon from '@/assets/staff/password-blind.png'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue: string
    type?: 'text' | 'email' | 'password'
    placeholder?: string
    autocomplete?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'text',
    placeholder: '',
    autocomplete: undefined,
    required: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isPasswordVisible = ref(false)
const isPasswordField = computed(() => props.type === 'password')
const resolvedType = computed(() =>
  isPasswordField.value && isPasswordVisible.value ? 'text' : props.type,
)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="staff-field">
    <label :for="id" class="staff-field__label">{{ label }}</label>
    <div class="staff-field__control">
      <input
        :id="id"
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        class="staff-field__input"
        :class="{ 'staff-field__input--password': isPasswordField }"
        @input="onInput"
      />
      <button
        v-if="isPasswordField"
        type="button"
        class="staff-field__toggle"
        :class="{ 'staff-field__toggle--visible': isPasswordVisible }"
        :aria-label="isPasswordVisible ? `Hide ${label}` : `Show ${label}`"
        :aria-pressed="isPasswordVisible"
        :disabled="disabled"
        @click="isPasswordVisible = !isPasswordVisible"
      >
        <img
          :src="passwordBlindIcon"
          alt=""
          aria-hidden="true"
          width="25"
          height="21"
          class="staff-field__toggle-icon"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.staff-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.staff-field__label {
  color: #000000;
  font-size: 12px;
  font-weight: 700;
  line-height: 15px;
  letter-spacing: 1.2px;
}

.staff-field__control {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.staff-field__input {
  width: 100%;
  height: 29px;
  padding: 0 12px;
  background-color: #ffffff;
  border: 1px solid #898781;
  border-radius: 10px;
  color: #000000;
  font-size: 12px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 1.2px;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.staff-field__input--password {
  padding-right: 40px;
}

.staff-field__input::placeholder {
  color: #6e6c65;
  opacity: 1;
}

.staff-field__input:focus {
  outline: none;
  border-color: #5d7706;
  box-shadow: 0 0 0 2px rgba(93, 119, 6, 0.2);
}

.staff-field__input:disabled {
  background-color: #f6f4ee;
  cursor: not-allowed;
}

.staff-field__toggle {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: opacity 140ms ease;
}

.staff-field__toggle--visible {
  opacity: 0.5;
}

.staff-field__toggle:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 1px;
}

.staff-field__toggle-icon {
  display: block;
  width: 25px;
  height: 21px;
  object-fit: contain;
  pointer-events: none;
}
</style>
