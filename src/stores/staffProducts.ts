import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  listStaffProducts,
  subscribeStaffProducts,
  updateStaffProductStock,
  type ProductStockUpdate,
  type StaffProduct,
} from '@/services/staffProducts'

export const useStaffProductsStore = defineStore('staffProducts', () => {
  const products = ref<StaffProduct[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const errorMessage = ref('')

  let subscriberCount = 0
  let unsubscribeRealtime: (() => void) | null = null

  const availableCount = computed(() => products.value.filter((item) => item.available).length)
  const unavailableCount = computed(() => products.value.filter((item) => !item.available).length)
  const totalCount = computed(() => products.value.length)

  async function refresh(): Promise<void> {
    loading.value = !loaded.value
    errorMessage.value = ''
    try {
      products.value = await listStaffProducts()
      loaded.value = true
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Unable to load menu availability.'
    } finally {
      loading.value = false
    }
  }

  async function updateProduct(id: string, update: ProductStockUpdate): Promise<StaffProduct> {
    errorMessage.value = ''
    const updated = await updateStaffProductStock(id, update)
    const index = products.value.findIndex((item) => item.id === id)
    if (index >= 0) {
      products.value[index] = updated
    } else {
      await refresh()
    }
    return updated
  }

  function startWatching(): () => void {
    subscriberCount += 1
    if (subscriberCount === 1) {
      void refresh()
      unsubscribeRealtime = subscribeStaffProducts(() => {
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
    products,
    loading,
    loaded,
    errorMessage,
    availableCount,
    unavailableCount,
    totalCount,
    refresh,
    updateProduct,
    startWatching,
  }
})
