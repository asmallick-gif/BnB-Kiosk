<script setup lang="ts">
import { onMounted, ref } from 'vue'
import logo from '@/assets/logos/bnb-logo.svg'
import { useRouter } from 'vue-router'
import { formatPhp } from '@/lib/format'
import { activeOrderKey, isLocalOrderDemo, submitOrder, type OrderRequest } from '@/services/orders'

const props = defineProps<{
  orderType: string
  items: { id: string; name: string; quantity: number; lineTotal: number }[]
  itemCount: number
  subtotal: number
  discount: number
  total: number
}>()
const emit = defineEmits<{ back: [] }>()
const paymentMethod = defineModel<'cash' | 'e-wallet'>('paymentMethod', { default: 'cash' })
const title = ref<HTMLHeadingElement | null>(null)
const router = useRouter()
const isSubmitting = ref(false)
const submissionError = ref('')
const money = formatPhp

onMounted(() => title.value?.focus())

function readSavedOrderRequest(): { fingerprint: string; requestId: string } | null {
  const saved = window.sessionStorage.getItem('bnb.order-request')
  if (!saved) return null
  try {
    const parsed = JSON.parse(saved) as Partial<{ fingerprint: string; requestId: string }>
    return typeof parsed.fingerprint === 'string' && typeof parsed.requestId === 'string'
      ? { fingerprint: parsed.fingerprint, requestId: parsed.requestId }
      : null
  } catch {
    return null
  }
}

async function confirmOrder() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  submissionError.value = ''
  try {
    const payload = {
      orderType: props.orderType,
      paymentMethod: paymentMethod.value,
      items: props.items.map(({ id, quantity }) => ({ id, quantity })),
    }
    const previous = readSavedOrderRequest()
    const fingerprint = JSON.stringify(payload)
    const requestId =
      previous?.fingerprint === fingerprint ? previous.requestId : crypto.randomUUID()
    window.sessionStorage.setItem('bnb.order-request', JSON.stringify({ fingerprint, requestId }))
    const order = await submitOrder({ ...payload, requestId } satisfies OrderRequest)
    window.sessionStorage.setItem(activeOrderKey, order.token)
    await router.replace({
      name: 'order-status',
      params: { token: order.token },
      query: { kiosk: '1' },
    })
  } catch (error) {
    submissionError.value =
      error instanceof Error ? error.message : 'Unable to send your order. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="checkout-screen">
    <div class="checkout-pattern" aria-hidden="true">
      <span
        v-for="index in 6"
        :key="index"
        :style="{ maskImage: `url(${logo})`, WebkitMaskImage: `url(${logo})` }"
      ></span>
    </div>
    <button type="button" class="back-button" :disabled="isSubmitting" @click="emit('back')">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m14 6-6 6 6 6M8 12h12" />
      </svg>
      Back to order
    </button>

    <div class="checkout-layout">
      <section class="receipt" aria-labelledby="receipt-title">
        <header class="receipt-header">
          <h1 id="receipt-title" ref="title" tabindex="-1">Receipt Preview</h1>
          <p>{{ orderType }} - {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}</p>
        </header>

        <ul class="receipt-items" aria-label="Checkout items">
          <li v-for="item in items" :key="item.id">
            <span>{{ item.quantity }} × {{ item.name }}</span>
            <span>{{ money(item.lineTotal) }}</span>
          </li>
        </ul>

        <dl class="receipt-adjustments">
          <div>
            <dt>Subtotal</dt>
            <dd>{{ money(subtotal) }}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{{ money(discount) }}</dd>
          </div>
        </dl>
        <dl class="receipt-total">
          <div>
            <dt>Total</dt>
            <dd>{{ money(total) }}</dd>
          </div>
        </dl>

        <fieldset class="payment-methods" :disabled="isSubmitting">
          <legend>Payment Method</legend>
          <label class="payment-option">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="5" y="9" width="38" height="25" rx="3" />
              <path
                d="M11 39 34 44l2-5M11 17a3 3 0 0 0 3-3m20 0a3 3 0 0 0 3 3M11 26a3 3 0 0 1 3 3m20 0a3 3 0 0 1 3-3"
              />
              <ellipse cx="24" cy="22" rx="4" ry="6" />
            </svg>
            <span><strong>Cash</strong><span>Pay at the counter</span></span>
            <input v-model="paymentMethod" type="radio" name="payment-method" value="cash" />
          </label>
          <label class="payment-option">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M38 7H12a5 5 0 0 0-5 5v25a4 4 0 0 0 4 4h29V15H12a3 3 0 0 1 0-6" />
              <path d="M40 24H29v10h11" />
              <circle cx="33" cy="29" r="1" />
            </svg>
            <span><strong>E-wallet</strong><span>Pay with GCash/Maya</span></span>
            <input v-model="paymentMethod" type="radio" name="payment-method" value="e-wallet" />
          </label>
        </fieldset>
      </section>

      <footer class="confirmation">
        <button
          type="button"
          class="confirm-button"
          :disabled="isSubmitting || !itemCount"
          :aria-busy="isSubmitting"
          @click="confirmOrder"
        >
          {{ isSubmitting ? 'Sending order…' : 'Confirm Order' }}
        </button>
        <p class="confirmation-hint">Your cashier will confirm your order and payment next.</p>
        <p v-if="submissionError" class="confirmation-notice" role="alert">{{ submissionError }}</p>
        <p v-if="isLocalOrderDemo" class="demo-notice">
          Local preview · orders sync between tabs in this browser only.
        </p>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.checkout-screen {
  --olive: #617900;
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  padding: max(88px, 8.5dvh, env(safe-area-inset-top)) clamp(16px, 6vw, 96px)
    max(32px, 4dvh, env(safe-area-inset-bottom));
  background: var(--olive);
  color: #111;
}
.checkout-pattern {
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.checkout-pattern span {
  position: absolute;
  width: clamp(140px, 20vw, 230px);
  aspect-ratio: 1.6;
  background: #354500;
  opacity: 0.22;
  transform: rotate(-22deg);
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}
.checkout-pattern span:nth-child(1) {
  top: 5%;
  left: 10%;
}
.checkout-pattern span:nth-child(2) {
  top: 5%;
  right: 20%;
}
.checkout-pattern span:nth-child(3) {
  top: 49%;
  right: -4%;
}
.checkout-pattern span:nth-child(4) {
  top: 66%;
  left: 3%;
}
.checkout-pattern span:nth-child(5) {
  bottom: 7%;
  right: 22%;
}
.checkout-pattern span:nth-child(6) {
  bottom: -2%;
  right: 6%;
}
.checkout-layout {
  width: min(100%, 680px);
  margin-inline: auto;
  display: grid;
  gap: clamp(32px, 5.8dvh, 96px);
  animation: checkout-in 240ms ease-out both;
}
.receipt {
  width: 90%;
  margin-inline: auto;
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
}
.receipt-header {
  padding: clamp(20px, 2.2vw, 28px);
  border-bottom: 1px solid #73736f;
}
.receipt-header h1,
.payment-methods legend {
  font-size: clamp(26px, 3.6vw, 38px);
  font-weight: 700;
  line-height: 1.25;
}
.receipt-header p {
  margin-top: 6px;
  color: #6b6b65;
  font-size: clamp(16px, 2.3vw, 24px);
}
.receipt-items {
  list-style: none;
  padding: clamp(24px, 4vw, 52px);
  min-height: clamp(170px, 16dvh, 264px);
  font-size: clamp(17px, 2.3vw, 24px);
}
.receipt-items li,
.receipt-adjustments > div,
.receipt-total > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 20px;
}
.receipt-items li + li,
.receipt-adjustments > div + div {
  margin-top: 12px;
}
.receipt-items li > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.receipt-items li > span:last-child,
dd {
  margin: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.receipt-adjustments {
  padding: clamp(24px, 4vw, 44px) clamp(24px, 4vw, 52px) 24px;
  border-top: 2px dashed #888881;
  font-size: clamp(17px, 2.3vw, 24px);
}
.receipt-total {
  padding: 24px clamp(24px, 4vw, 52px) clamp(32px, 4vw, 52px);
  border-top: 1px solid #73736f;
  font-size: clamp(26px, 3.6vw, 38px);
}
.receipt-total dt,
.receipt-total dd {
  font-weight: 700;
}
.payment-methods {
  margin: 0;
  padding: 0 clamp(24px, 4vw, 48px) clamp(40px, 7.5dvh, 120px);
  border: 0;
  min-width: 0;
}
.payment-methods legend {
  margin-left: clamp(-24px, -2vw, -8px);
  margin-bottom: clamp(24px, 3.2dvh, 52px);
}
.payment-option {
  display: grid;
  grid-template-columns: clamp(36px, 5vw, 60px) minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(14px, 3vw, 40px);
  min-height: 96px;
  padding: 14px clamp(14px, 2.6vw, 28px);
  border: 1px solid #64645e;
  border-radius: 8px;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 160ms ease,
    border-color 160ms ease;
}
.payment-option + .payment-option {
  margin-top: 16px;
}
.payment-option:has(input:checked) {
  border-color: var(--olive);
}
.payment-option:has(input:focus-visible) {
  outline: 3px solid var(--olive);
  outline-offset: 4px;
}
.payment-option svg {
  width: 100%;
  stroke: #969893;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.payment-option strong {
  display: block;
  font-size: clamp(24px, 3.2vw, 34px);
  font-weight: 700;
}
.payment-option span span {
  display: block;
  margin-top: 4px;
  font-size: clamp(15px, 2vw, 21px);
}
.payment-option input {
  width: 30px;
  height: 30px;
  margin: 0;
  accent-color: var(--olive);
  cursor: pointer;
}
button {
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.demo-notice {
  color: #fff;
  text-align: center;
  margin-top: 16px;
  font-size: 16px;
}
button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 5px;
}
.back-button {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: clamp(16px, 3vw, 40px);
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 8px 16px;
  border: 1px solid rgb(255 255 255 / 60%);
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-weight: 600;
}
.back-button svg {
  width: 24px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 2;
}
.confirm-button {
  width: 100%;
  min-height: clamp(64px, 8dvh, 128px);
  padding: 20px 24px;
  border: 0;
  border-radius: clamp(20px, 3vw, 32px);
  background: #c97920;
  box-shadow: 0 7px 0 #925713;
  color: #fff;
  font-size: clamp(28px, 4.6vw, 50px);
  font-weight: 700;
  letter-spacing: 0.08em;
  transition:
    background-color 160ms ease,
    transform 120ms ease,
    box-shadow 120ms ease;
}
.confirm-button:active {
  transform: translateY(4px);
  box-shadow: 0 3px 0 #925713;
}
.confirmation-hint {
  margin-top: 16px;
  color: #fff;
  font-size: clamp(17px, 2.7vw, 32px);
  letter-spacing: 0.05em;
  text-align: center;
}
.confirmation-notice {
  margin-top: 24px;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  font-size: 18px;
}
@media (hover: hover) {
  .payment-option:hover {
    background: #faf9ee;
  }
  .confirm-button:hover {
    background: #b96a1b;
  }
  .back-button:hover {
    background: rgb(255 255 255 / 12%);
  }
}
@media (max-width: 480px) {
  .receipt {
    width: 100%;
  }
  .payment-methods {
    padding-inline: 20px;
  }
  .payment-methods legend {
    margin-left: 0;
  }
  .payment-option {
    gap: 12px;
    padding-inline: 12px;
  }
  .payment-option input {
    width: 26px;
    height: 26px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .checkout-layout {
    animation: none;
  }
  .payment-option,
  .confirm-button {
    transition: none;
  }
  .confirm-button:active {
    transform: none;
  }
}
@keyframes checkout-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
