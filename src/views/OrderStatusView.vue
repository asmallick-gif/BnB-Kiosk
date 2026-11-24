<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import logo from '@/assets/logos/bnb-logo.svg'
import { formatElapsedDuration, formatPhp } from '@/lib/format'
import {
  activeOrderKey,
  getOrder,
  isLocalOrderDemo,
  isOrderConfirmed,
  queueLabel,
  type KioskOrder,
} from '@/services/orders'

const route = useRoute()
const router = useRouter()
const order = ref<KioskOrder | null>(null)
const error = ref('')
const qr = ref('')
const qrError = ref(false)
const title = ref<HTMLHeadingElement | null>(null)
const feedbackOpen = ref(false)
const nowMs = ref(Date.now())
const kiosk = computed(() => route.query.kiosk === '1')
const confirmed = computed(() => !!order.value && isOrderConfirmed(order.value))
const rejected = computed(() => order.value?.status === 'rejected')
const label = computed(() => (order.value ? queueLabel(order.value.queueNumber) : ''))
const trackingUrl = computed(
  () =>
    new URL(
      router.resolve({ name: 'order-status', params: { token: route.params.token as string } })
        .href,
      window.location.origin,
    ).href,
)
const money = formatPhp
const isTerminalStatus = (status: KioskOrder['status'] | undefined) =>
  status === 'completed' || status === 'rejected'
const showElapsed = computed(() => Boolean(order.value && !isTerminalStatus(order.value.status)))
const elapsedLabel = computed(() =>
  order.value ? formatElapsedDuration(order.value.createdAt, nowMs.value) : '',
)
const progressLabel = computed(
  () =>
    ({
      pending: 'Waiting for confirmation/payment',
      confirmed: 'Order confirmed',
      cooking: 'Your order is cooking',
      ready: 'Your order is ready',
      completed: 'Order completed',
      rejected: 'Please see the cashier',
    })[order.value?.status ?? 'pending'],
)
let timer: ReturnType<typeof setTimeout> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let alive = true
let refreshing = false

function stopClock() {
  if (clockTimer !== undefined) {
    clearInterval(clockTimer)
    clockTimer = undefined
  }
}

watch(showElapsed, (active) => {
  if (active) {
    nowMs.value = Date.now()
    if (clockTimer === undefined) {
      clockTimer = setInterval(() => {
        nowMs.value = Date.now()
      }, 1000)
    }
  } else {
    stopClock()
  }
})

async function refresh() {
  if (!alive || refreshing) return
  refreshing = true
  clearTimeout(timer)
  const token = route.params.token as string
  try {
    const result = await getOrder(token)
    if (!alive || token !== route.params.token) return
    order.value = result
    error.value = ''
  } catch (cause) {
    if (alive && token === route.params.token)
      error.value =
        cause instanceof Error ? cause.message : 'Unable to check your order. Reconnecting…'
  } finally {
    refreshing = false
    if (alive && !isTerminalStatus(order.value?.status)) {
      timer = setTimeout(refresh, 2500)
    }
  }
}
watch(
  () => route.params.token,
  () => {
    order.value = null
    qr.value = ''
    error.value = ''
    refresh()
  },
)
watch(confirmed, async (value) => {
  if (!value || !kiosk.value) return
  const token = route.params.token
  try {
    const dataUrl = await QRCode.toDataURL(trackingUrl.value, {
      width: 480,
      margin: 4,
      errorCorrectionLevel: 'M',
    })
    if (!alive || token !== route.params.token) return
    qr.value = dataUrl
    qrError.value = false
  } catch {
    qrError.value = true
  }
  await nextTick()
  title.value?.focus()
})
function done() {
  if (window.sessionStorage.getItem(activeOrderKey) === route.params.token) {
    window.sessionStorage.removeItem(activeOrderKey)
    window.sessionStorage.removeItem('bnb.order-request')
  }
  router.replace('/')
}
function refreshIfActive() {
  if (!isTerminalStatus(order.value?.status)) void refresh()
}
onMounted(async () => {
  await refresh()
  if (!alive) return
  title.value?.focus()
  window.addEventListener('storage', refreshIfActive)
  window.addEventListener('online', refreshIfActive)
})
onUnmounted(() => {
  alive = false
  clearTimeout(timer)
  stopClock()
  window.removeEventListener('storage', refreshIfActive)
  window.removeEventListener('online', refreshIfActive)
})
</script>

<template>
  <main class="status-screen">
    <div class="status-pattern" aria-hidden="true">
      <span
        v-for="index in 4"
        :key="index"
        :style="{ maskImage: `url(${logo})`, WebkitMaskImage: `url(${logo})` }"
      ></span>
    </div>
    <div class="status-layout">
      <section
        :class="['status-card', { 'qr-card': confirmed && kiosk }]"
        aria-labelledby="status-title"
      >
        <template v-if="confirmed && kiosk">
          <h1 id="status-title" ref="title" tabindex="-1">Queue Number</h1>
          <p class="queue-number">{{ label }}</p>
          <a class="tracking-link" :href="trackingUrl" aria-label="Open order tracking">
            <img
              v-if="qr"
              class="tracking-qr"
              :src="qr"
              :alt="`QR code to track order ${label}`"
              width="480"
              height="480"
            />
            <span v-else>Open order tracking</span>
          </a>
          <p v-if="!qr" role="status">
            {{
              qrError
                ? 'QR code unavailable. Use the tracking link above.'
                : 'Preparing your tracking code…'
            }}
          </p>
          <h2>Scan to track your order</h2>
        </template>
        <template v-else>
          <div v-if="!confirmed && !rejected" class="waiting-spinner" aria-hidden="true"></div>
          <p v-if="order" class="order-reference">Order {{ label }}</p>
          <h1 id="status-title" ref="title" tabindex="-1">
            {{ order ? progressLabel : 'Checking your order…' }}
          </h1>
          <p v-if="!order">Please wait while we check your order.</p>
          <template v-else-if="rejected">
            <p>Your order needs attention. Please speak with the cashier before ordering again.</p>
          </template>
          <template v-else-if="!confirmed">
            <p>
              Your order has been sent. Please
              {{
                order.paymentMethod === 'cash'
                  ? 'pay at the counter'
                  : 'show your GCash/Maya payment to the cashier'
              }}.
            </p>
            <p>
              The cashier will confirm your payment and order. Your tracking QR code will appear
              here automatically.
            </p>
            <div class="payment-summary">
              <span>{{ order.paymentMethod === 'cash' ? 'Cash' : 'E-wallet' }}</span
              ><strong>{{ money(order.total) }}</strong>
            </div>
            <p class="waiting-note" role="status">
              Waiting for the cashier. Your order has not started cooking yet.
            </p>
          </template>
          <template v-else>
            <p role="status">{{ progressLabel }}</p>
            <ol class="order-progress" aria-label="Order progress">
              <li :aria-current="order.status === 'confirmed' ? 'step' : undefined">Confirmed</li>
              <li :aria-current="order.status === 'cooking' ? 'step' : undefined">Cooking</li>
              <li :aria-current="order.status === 'ready' ? 'step' : undefined">Ready</li>
              <li :aria-current="order.status === 'completed' ? 'step' : undefined">Completed</li>
            </ol>
          </template>
        </template>
        <div v-if="showElapsed" class="elapsed-pill" aria-label="Time elapsed">
          <span class="elapsed-pill__label">Time Elapsed</span>
          <time class="elapsed-pill__time">{{ elapsedLabel }}</time>
        </div>
        <p v-if="error" class="connection-error" role="alert">
          {{ error }} Your order will not be submitted again.
        </p>
        <button v-if="error" type="button" class="retry-button" @click="refresh">
          Check again
        </button>
      </section>
      <footer v-if="(confirmed && kiosk) || rejected" class="status-actions">
        <button
          v-if="confirmed"
          class="feedback-button"
          type="button"
          @click="feedbackOpen = !feedbackOpen"
          :aria-expanded="feedbackOpen"
        >
          Have Feedback?
        </button>
        <p v-if="feedbackOpen" class="feedback-message">
          Please share your feedback with our team when you collect your order.
        </p>
        <button class="done-button" type="button" @click="done">Done</button>
        <p v-if="confirmed">Done scanning? Tap Done</p>
      </footer>
      <p v-if="isLocalOrderDemo" class="demo-notice">
        Local preview · orders and tracking work in this browser only.
      </p>
    </div>
  </main>
</template>

<style scoped>
.status-screen {
  --olive: #617900;
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  padding: max(40px, 14.8dvh, env(safe-area-inset-top)) clamp(20px, 6vw, 96px)
    max(32px, 3dvh, env(safe-area-inset-bottom));
  background: #f9f3dd;
  color: #111;
}
.status-pattern {
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.status-pattern span {
  position: absolute;
  width: clamp(140px, 22vw, 240px);
  aspect-ratio: 1.6;
  background: #4b4b33;
  opacity: 0.12;
  transform: rotate(-22deg);
  mask-size: contain;
  mask-repeat: no-repeat;
}
.status-pattern span:nth-child(1) {
  top: 5%;
  right: 20%;
}
.status-pattern span:nth-child(2) {
  top: 50%;
  right: -4%;
}
.status-pattern span:nth-child(3) {
  bottom: 24%;
  left: 3%;
}
.status-pattern span:nth-child(4) {
  bottom: 0;
  right: 8%;
}
.status-layout {
  max-width: 690px;
  margin: auto;
}
.status-card {
  padding: clamp(28px, 5vw, 64px);
  border: 2px solid #696963;
  border-radius: clamp(32px, 10vw, 110px);
  background: #fff;
  text-align: center;
}
h1 {
  font-size: clamp(28px, 4.2vw, 46px);
  line-height: 1.25;
  font-weight: 600;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
/* These headings receive programmatic focus for announcements, not interaction. */
h1:focus {
  outline: none;
}
.status-card > p {
  margin-top: 24px;
  font-size: clamp(18px, 2.6vw, 28px);
  line-height: 1.55;
}
.status-card .order-reference {
  color: var(--olive);
  font-weight: 700;
  margin: 0 0 20px;
}
.status-card .queue-number {
  color: var(--olive);
  margin: 16px 0 24px;
  font-size: clamp(52px, 7vw, 76px);
  font-weight: 800;
}
.tracking-qr {
  display: block;
  width: min(100%, 480px);
  height: auto;
  margin: 0 auto 24px;
}
.qr-card {
  padding-bottom: clamp(36px, 6vw, 80px);
}
.qr-card h1 {
  font-weight: 400;
}
h2 {
  font-size: clamp(24px, 4vw, 44px);
  line-height: 1.3;
  font-weight: 700;
}
.tracking-link {
  display: block;
  color: #465800;
  min-height: 44px;
  font-size: 17px;
}
.waiting-spinner {
  width: 76px;
  height: 76px;
  border: 7px solid #e7ead7;
  border-top-color: var(--olive);
  border-radius: 50%;
  margin: 8px auto 36px;
  animation: waiting-turn 1.4s linear infinite;
}
.payment-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 32px;
  border-block: 1px dashed #93968a;
  padding: 20px 0;
  font-size: clamp(20px, 3vw, 30px);
}
.payment-summary strong {
  font-weight: 700;
  white-space: nowrap;
}
.status-card .waiting-note {
  color: #62634e;
  font-size: clamp(16px, 2vw, 21px);
}
.elapsed-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 156px;
  margin-top: 28px;
  padding: 10px 24px;
  border-radius: 999px;
  background: #fdf1d0;
  color: #111;
}
.elapsed-pill__label {
  color: #5c5746;
  font-size: clamp(11px, 1.3vw, 13px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.08em;
}
.elapsed-pill__time {
  margin-top: 2px;
  font-size: clamp(18px, 2.4vw, 24px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.status-actions {
  display: grid;
  gap: 24px;
  margin-top: clamp(32px, 9dvh, 150px);
  text-align: center;
}
button {
  font: inherit;
  min-height: 52px;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 160ms ease,
    transform 120ms ease;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #465800;
  outline-offset: 5px;
}
.feedback-button,
.done-button {
  border: 0;
  border-radius: clamp(20px, 3vw, 32px);
  padding: 20px;
  background: var(--olive);
  box-shadow: 0 7px 0 #354500;
  color: #fff;
  font-size: clamp(28px, 4.8vw, 50px);
  font-weight: 700;
  letter-spacing: 0.06em;
}
.done-button {
  background: #c97920;
  box-shadow: 0 7px 0 #925713;
}
.status-actions > p {
  font-size: clamp(18px, 3.5vw, 38px);
  letter-spacing: 0.04em;
}
.feedback-message {
  padding: 16px;
  background: #fff;
  border-radius: 16px;
}
.connection-error {
  color: #942f19;
}
.retry-button {
  margin-top: 16px;
  border: 1px solid var(--olive);
  color: #465800;
  background: #f9f3dd;
  padding: 8px 20px;
  border-radius: 12px;
}
.order-progress {
  display: grid;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin-top: 28px;
  text-align: left;
  font-size: 22px;
}
.order-progress li {
  padding: 12px 16px;
  border-radius: 12px;
  background: #f4f3ec;
}
.order-progress [aria-current] {
  background: #e7ead7;
  color: #465800;
  font-weight: 700;
}
.demo-notice {
  margin-top: 24px;
  text-align: center;
  color: #62634e;
  font-size: 16px;
}
@media (hover: hover) {
  .feedback-button:hover {
    background: #4e6200;
  }
  .done-button:hover {
    background: #b96a1b;
  }
}
button:active {
  transform: scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .waiting-spinner {
    animation: none;
  }
  button {
    transition: none;
  }
  button:active {
    transform: none;
  }
}
@keyframes waiting-turn {
  to {
    transform: rotate(360deg);
  }
}
</style>
