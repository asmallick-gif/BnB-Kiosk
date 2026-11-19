<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { queueLabel, type KioskOrder, type OrderStatus } from '@/services/orders'
import {
  getAllowedNextStatuses,
  listStaffOrders,
  subscribeStaffOrders,
  updateStaffOrderStatus,
} from '@/services/staffOrders'

const orders = ref<KioskOrder[]>([])
const loading = ref(true)
const errorMessage = ref('')
const busyToken = ref<string | null>(null)

let unsubscribe: (() => void) | null = null

const activeOrders = computed(() =>
  orders.value.filter((order) => !['completed', 'rejected'].includes(order.status)),
)

async function refreshOrders() {
  errorMessage.value = ''
  try {
    orders.value = await listStaffOrders()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load orders.'
  } finally {
    loading.value = false
  }
}

async function advanceOrder(token: string, nextStatus: OrderStatus) {
  if (busyToken.value) return
  busyToken.value = token
  errorMessage.value = ''
  try {
    await updateStaffOrderStatus(token, nextStatus)
    await refreshOrders()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to update order status.'
  } finally {
    busyToken.value = null
  }
}

function actionLabel(status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Confirm Payment'
    case 'rejected':
      return 'Reject'
    case 'cooking':
      return 'Start Cooking'
    case 'ready':
      return 'Mark Ready'
    case 'completed':
      return 'Complete'
    default:
      return status
  }
}

onMounted(() => {
  void refreshOrders()
  unsubscribe = subscribeStaffOrders(() => {
    void refreshOrders()
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <section class="staff-page">
    <div class="staff-page__header">
      <div>
        <h1 class="staff-page__title">Order Queue</h1>
        <p class="staff-page__subtitle">
          Placeholder queue view connected to the staff order service. Ready for your Figma layout.
        </p>
      </div>
      <button type="button" class="staff-refresh-btn" :disabled="loading" @click="refreshOrders">
        Refresh
      </button>
    </div>

    <p v-if="errorMessage" class="staff-alert" role="alert">{{ errorMessage }}</p>

    <div v-if="loading" class="staff-empty">Loading orders...</div>
    <div v-else-if="!activeOrders.length" class="staff-empty">
      No active orders right now. Submit an order on the kiosk to see it appear here.
    </div>
    <div v-else class="staff-order-grid">
      <article v-for="order in activeOrders" :key="order.token" class="staff-order-card">
        <div class="staff-order-card__top">
          <span class="staff-order-card__queue">{{ queueLabel(order.queueNumber) }}</span>
          <span class="staff-order-card__status" :data-status="order.status">
            {{ order.status }}
          </span>
        </div>

        <p class="staff-order-card__meta">
          {{ order.orderType }} &middot; {{ order.paymentMethod }} &middot; &#8369;{{
            order.total.toFixed(2)
          }}
        </p>

        <ul class="staff-order-card__items">
          <li v-for="item in order.items" :key="item.id">
            {{ item.quantity }}&times; {{ item.name }}
          </li>
        </ul>

        <div class="staff-order-card__actions">
          <button
            v-for="nextStatus in getAllowedNextStatuses(order.status)"
            :key="nextStatus"
            type="button"
            class="staff-action-btn"
            :class="{ 'staff-action-btn--danger': nextStatus === 'rejected' }"
            :disabled="busyToken === order.token"
            @click="advanceOrder(order.token, nextStatus)"
          >
            {{ actionLabel(nextStatus) }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.staff-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.staff-page__title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}

.staff-page__subtitle {
  margin: 4px 0 0;
  color: #6e6c65;
  font-size: 13px;
}

.staff-refresh-btn {
  padding: 8px 16px;
  border: 1px solid #898781;
  border-radius: 10px;
  background-color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.staff-alert {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #d98278;
  border-radius: 12px;
  background-color: #fdf1ef;
  color: #8f2419;
  font-size: 13px;
}

.staff-empty {
  padding: 40px 24px;
  border: 3px dashed #e1dbc7;
  border-radius: 20px;
  background-color: #ffffff;
  text-align: center;
  color: #6e6c65;
}

.staff-order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.staff-order-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 2px solid #e1dbc7;
  border-radius: 18px;
  background-color: #ffffff;
}

.staff-order-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.staff-order-card__queue {
  font-size: 20px;
  font-weight: 800;
}

.staff-order-card__status {
  padding: 4px 10px;
  border-radius: 999px;
  background-color: #f3ecce;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.staff-order-card__meta {
  margin: 0;
  font-size: 13px;
  color: #6e6c65;
}

.staff-order-card__items {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}

.staff-order-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.staff-action-btn {
  flex: 1;
  padding: 9px 12px;
  border: 0;
  border-radius: 10px;
  background-color: #5d7706;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.staff-action-btn--danger {
  background-color: #c77824;
}

.staff-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
