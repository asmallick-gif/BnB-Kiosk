<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { queueLabel, type KioskOrder } from '@/services/orders'
import { listStaffOrders } from '@/services/staffOrders'

const orders = ref<KioskOrder[]>([])
const loading = ref(true)

const finishedOrders = computed(() =>
  orders.value.filter((order) => ['completed', 'rejected'].includes(order.status)),
)

onMounted(async () => {
  try {
    orders.value = await listStaffOrders()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="staff-page">
    <h1 class="staff-page__title">Order Records</h1>
    <p class="staff-page__subtitle">
      Placeholder records view for completed and rejected orders. Ready for your Figma layout.
    </p>

    <div v-if="loading" class="staff-empty">Loading records...</div>
    <div v-else-if="!finishedOrders.length" class="staff-empty">No completed or rejected orders yet.</div>
    <ul v-else class="staff-records-list">
      <li v-for="order in finishedOrders" :key="order.token" class="staff-records-row">
        <strong>{{ queueLabel(order.queueNumber) }}</strong>
        <span>{{ order.orderType }} &middot; {{ order.paymentMethod }}</span>
        <span>&#8369;{{ order.total.toFixed(2) }}</span>
        <span class="staff-records-status">{{ order.status }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.staff-page {
  padding: 28px;
  border: 3px dashed #e1dbc7;
  border-radius: 20px;
  background-color: #ffffff;
}

.staff-page__title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
}

.staff-page__subtitle {
  margin: 0 0 20px;
  color: #6e6c65;
  font-size: 14px;
}

.staff-empty {
  color: #6e6c65;
  font-size: 14px;
}

.staff-records-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.staff-records-row {
  display: grid;
  grid-template-columns: 90px 1fr 110px 100px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background-color: #f9f3dd;
  font-size: 14px;
}

.staff-records-status {
  text-transform: capitalize;
  font-weight: 700;
}
</style>
