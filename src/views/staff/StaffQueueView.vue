<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import StaffOrderCard from '@/components/staff/StaffOrderCard.vue'
import { isLocalOrderDemo, queueLabel, type KioskOrder, type OrderStatus } from '@/services/orders'
import { useStaffOrdersStore } from '@/stores/staffOrders'
import badgeWaiting from '@/assets/staff/dashboard/badge-waiting.svg'
import badgeCooking from '@/assets/staff/dashboard/badge-cooking.svg'
import badgeReady from '@/assets/staff/dashboard/badge-ready.svg'
import toastDot from '@/assets/staff/dashboard/toast-dot.svg'

type QueueTab = 'waiting' | 'cooking' | 'ready'

const ordersStore = useStaffOrdersStore()

const activeTab = ref<QueueTab>('waiting')
const busyToken = ref<string | null>(null)
const nowMs = ref(Date.now())
const toastMessage = ref('')

let clockTimer: number | null = null
let toastTimer: number | null = null

const todayLabel = computed(() => {
  const now = new Date(nowMs.value)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const formattedSales = computed(() =>
  ordersStore.totalSales > 0 ? `₱${ordersStore.totalSales.toLocaleString('en-PH')}` : '',
)

const visibleOrders = computed(() => {
  switch (activeTab.value) {
    case 'cooking':
      return ordersStore.cookingOrders
    case 'ready':
      return ordersStore.readyOrders
    default:
      return ordersStore.waitingOrders
  }
})

const emptyStateMessage = computed(() => {
  if (activeTab.value === 'cooking') return 'No orders currently cooking.'
  if (activeTab.value === 'ready') return 'No orders ready for pickup.'
  return isLocalOrderDemo
    ? 'No orders waiting right now. Submit an order on the kiosk tab to see it appear here.'
    : 'No orders waiting right now.'
})

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 4000)
}

function toastSummary(order: KioskOrder, nextStatus: OrderStatus): string {
  const num = queueLabel(order.queueNumber)
  switch (nextStatus) {
    case 'confirmed':
      return `Order ${num}: Payment Confirmed`
    case 'rejected':
      return `Order ${num}: Order Cancelled`
    case 'cooking':
      return `Order ${num}: Started Cooking`
    case 'ready':
      return `Order ${num}: Ready for Pickup`
    case 'completed':
      return `Order ${num}: Marked Served`
    default:
      return `Order ${num}: Updated`
  }
}

async function handleAdvance(payload: { order: KioskOrder; nextStatus: OrderStatus }) {
  if (busyToken.value) return
  busyToken.value = payload.order.token
  try {
    await ordersStore.setOrderStatus(payload.order.token, payload.nextStatus)
    showToast(toastSummary(payload.order, payload.nextStatus))
  } catch {
    // Store sets errorMessage for the alert banner.
  } finally {
    busyToken.value = null
  }
}

onMounted(() => {
  clockTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (clockTimer !== null) window.clearInterval(clockTimer)
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="queue-page">
    <header class="queue-topbar">
      <div class="queue-tabs" role="tablist" aria-label="Order queue stages">
        <button
          type="button"
          role="tab"
          class="queue-tab"
          :class="{ 'queue-tab--active': activeTab === 'waiting' }"
          :aria-selected="activeTab === 'waiting'"
          @click="activeTab = 'waiting'"
        >
          <span class="queue-tab__label">WAITING</span>
          <span class="queue-tab__badge">
            <img :src="badgeWaiting" alt="" aria-hidden="true" width="20" height="20" class="queue-tab__badge-bg" />
            <span class="queue-tab__badge-num">{{ ordersStore.waitingOrders.length }}</span>
          </span>
        </button>

        <button
          type="button"
          role="tab"
          class="queue-tab"
          :class="{ 'queue-tab--active': activeTab === 'cooking' }"
          :aria-selected="activeTab === 'cooking'"
          @click="activeTab = 'cooking'"
        >
          <span class="queue-tab__label">COOKING</span>
          <span class="queue-tab__badge">
            <img :src="badgeCooking" alt="" aria-hidden="true" width="20" height="20" class="queue-tab__badge-bg" />
            <span class="queue-tab__badge-num">{{ ordersStore.cookingOrders.length }}</span>
          </span>
        </button>

        <button
          type="button"
          role="tab"
          class="queue-tab"
          :class="{ 'queue-tab--active': activeTab === 'ready' }"
          :aria-selected="activeTab === 'ready'"
          @click="activeTab = 'ready'"
        >
          <span class="queue-tab__label">READY</span>
          <span class="queue-tab__badge">
            <img :src="badgeReady" alt="" aria-hidden="true" width="20" height="20" class="queue-tab__badge-bg" />
            <span class="queue-tab__badge-num">{{ ordersStore.readyOrders.length }}</span>
          </span>
        </button>
      </div>

      <div class="queue-metrics">
        <p class="queue-metric">
          <span class="queue-metric__label">Served:</span>
          <strong v-if="ordersStore.servedCount > 0" class="queue-metric__value">
            {{ ordersStore.servedCount }}
          </strong>
        </p>

        <p class="queue-metric">
          <span class="queue-metric__label">Sales:</span>
          <strong v-if="formattedSales" class="queue-metric__value">{{ formattedSales }}</strong>
        </p>

        <time class="queue-date" :datetime="todayLabel">{{ todayLabel }}</time>
      </div>
    </header>

    <div class="queue-body">
      <p v-if="ordersStore.errorMessage" class="queue-error" role="alert">
        {{ ordersStore.errorMessage }}
      </p>

      <div v-if="ordersStore.loading && !ordersStore.loaded" class="queue-empty">
        Loading orders...
      </div>

      <div v-else-if="!visibleOrders.length" class="queue-empty">
        {{ emptyStateMessage }}
      </div>

      <div v-else class="queue-cards-grid">
        <StaffOrderCard
          v-for="order in visibleOrders"
          :key="order.token"
          :order="order"
          :now-ms="nowMs"
          :busy="busyToken === order.token"
          @advance="handleAdvance"
        />
      </div>
    </div>

    <div v-if="toastMessage" class="queue-toast" role="status" aria-live="polite">
      <img :src="toastDot" alt="" aria-hidden="true" width="10" height="10" class="queue-toast__dot" />
      <span class="queue-toast__text">{{ toastMessage }}</span>
    </div>
  </section>
</template>

<style scoped>
.queue-page {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 100%;
  background-color: #f8f8f6;
}

.queue-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 70px;
  padding: 10px 20px 10px 19px;
  background-color: #ffffff;
  box-shadow: 0 6px 12.9px 0 rgba(0, 0, 0, 0.08);
}

.queue-tabs {
  display: flex;
  align-items: center;
  gap: 28px;
}

.queue-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.queue-tab__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 25px;
  padding: 2px 10px;
  border-radius: 15px;
  color: #000000;
  font-size: 16px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.6px;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.queue-tab--active .queue-tab__label {
  background-color: #5f5e5a;
  color: #ffffff;
}

.queue-tab:hover:not(.queue-tab--active) .queue-tab__label {
  background-color: #ecebe7;
}

.queue-tab:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 2px;
  border-radius: 15px;
}

.queue-tab__badge {
  position: absolute;
  top: 0;
  right: -8px;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.queue-tab__badge-bg {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
}

.queue-tab__badge-num {
  position: relative;
  z-index: 1;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.queue-metrics {
  display: flex;
  align-items: center;
  gap: 56px;
  margin-left: auto;
}

.queue-metric {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: #5f5e5a;
  font-size: 16px;
  font-weight: 500;
  line-height: normal;
  letter-spacing: 1.6px;
  white-space: nowrap;
}

.queue-metric__value {
  color: #000000;
  font-weight: 700;
}

.queue-date {
  color: #000000;
  font-size: 16px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.6px;
  white-space: nowrap;
}

.queue-body {
  flex: 1;
  padding: 13px 12px 72px;
}

.queue-error {
  margin: 0 0 12px;
  padding: 10px 14px;
  border: 1px solid #d98278;
  border-radius: 10px;
  background-color: #fdf1ef;
  color: #8f2419;
  font-size: 13px;
}

.queue-empty {
  padding: 48px 24px;
  border: 2px dashed #d6d3c8;
  border-radius: 14px;
  background-color: #ffffff;
  color: #5f5e5a;
  font-size: 14px;
  text-align: center;
}

.queue-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(195px, 1fr));
  gap: 10px;
  padding: 10px 0;
  background-color: #f6f6f6;
}

.queue-toast {
  position: fixed;
  right: 14px;
  bottom: 20px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 210px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  background-color: #405909;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
}

.queue-toast__dot {
  display: block;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.queue-toast__text {
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1px;
  white-space: nowrap;
}

@media (max-width: 1020px) {
  .queue-cards-grid {
    grid-template-columns: repeat(3, minmax(190px, 1fr));
  }

  .queue-metrics {
    gap: 24px;
  }
}

@media (max-width: 820px) {
  .queue-cards-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 480px) {
  .queue-cards-grid {
    grid-template-columns: 1fr;
  }

  .queue-tabs {
    gap: 14px;
  }
}
</style>
