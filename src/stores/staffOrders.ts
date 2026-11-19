import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { KioskOrder, OrderStatus } from '@/services/orders'
import {
  listStaffOrders,
  subscribeStaffOrders,
  updateStaffOrderStatus,
} from '@/services/staffOrders'

export const useStaffOrdersStore = defineStore('staffOrders', () => {
  const orders = ref<KioskOrder[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const errorMessage = ref('')

  let subscriberCount = 0
  let unsubscribeRealtime: (() => void) | null = null

  const byOldestFirst = (a: KioskOrder, b: KioskOrder) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.queueNumber - b.queueNumber

  const waitingOrders = computed(() =>
    orders.value
      .filter((order) => order.status === 'pending' || order.status === 'confirmed')
      .sort(byOldestFirst),
  )
  const cookingOrders = computed(() =>
    orders.value.filter((order) => order.status === 'cooking').sort(byOldestFirst),
  )
  const readyOrders = computed(() =>
    orders.value.filter((order) => order.status === 'ready').sort(byOldestFirst),
  )
  const completedOrders = computed(() =>
    orders.value.filter((order) => order.status === 'completed'),
  )
  const finishedOrders = computed(() =>
    orders.value.filter((order) => order.status === 'completed' || order.status === 'rejected'),
  )

  const activeCount = computed(
    () => waitingOrders.value.length + cookingOrders.value.length + readyOrders.value.length,
  )
  const servedCount = computed(() => completedOrders.value.length)
  const totalSales = computed(() =>
    completedOrders.value.reduce((sum, order) => sum + order.total, 0),
  )

  async function refresh(): Promise<void> {
    loading.value = !loaded.value
    errorMessage.value = ''
    try {
      orders.value = await listStaffOrders()
      loaded.value = true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to load orders.'
    } finally {
      loading.value = false
    }
  }

  async function setOrderStatus(token: string, nextStatus: OrderStatus): Promise<KioskOrder> {
    errorMessage.value = ''
    const updated = await updateStaffOrderStatus(token, nextStatus)
    const index = orders.value.findIndex((order) => order.token === token)
    if (index >= 0) {
      orders.value[index] = updated
    } else {
      await refresh()
    }
    return updated
  }

  function startWatching(): () => void {
    subscriberCount += 1
    if (subscriberCount === 1) {
      void refresh()
      unsubscribeRealtime = subscribeStaffOrders(() => {
        void refresh()
      })
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1)
      if (subscriberCount === 0 && unsubscribeRealtime) {
        unsubscribeRealtime()
        unsubscribeRealtime = null
      }
    }
  }

  return {
    orders,
    loading,
    loaded,
    errorMessage,
    waitingOrders,
    cookingOrders,
    readyOrders,
    completedOrders,
    finishedOrders,
    activeCount,
    servedCount,
    totalSales,
    refresh,
    setOrderStatus,
    startWatching,
  }
})
