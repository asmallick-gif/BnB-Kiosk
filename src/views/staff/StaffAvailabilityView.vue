<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { StaffProduct } from '@/services/staffProducts'
import { useStaffProductsStore } from '@/stores/staffProducts'
import searchIcon from '@/assets/staff/available/search-icon.svg'
import qtyMinus from '@/assets/staff/available/qty-minus.svg'
import qtyPlus from '@/assets/staff/available/qty-plus.svg'
import filterBadgeAll from '@/assets/staff/available/filter-badge-all.svg'
import filterBadgeAvailable from '@/assets/staff/available/filter-badge-available.svg'
import filterBadgeUnavailable from '@/assets/staff/available/filter-badge-unavailable.svg'
import toastDotUnavailable from '@/assets/staff/available/toast-dot-unavailable.svg'
import toastDotAvailable from '@/assets/staff/dashboard/toast-dot.svg'

type AvailabilityFilter = 'all' | 'available' | 'unavailable'

const productsStore = useStaffProductsStore()

const searchQuery = ref('')
const activeFilter = ref<AvailabilityFilter>('all')
const busyProductId = ref<string | null>(null)
const toastState = ref<{ text: string; unavailable: boolean } | null>(null)

let stopWatching: (() => void) | null = null
let toastTimer: number | null = null

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return productsStore.products.filter((item) => {
    if (activeFilter.value === 'available' && !item.available) return false
    if (activeFilter.value === 'unavailable' && item.available) return false
    if (!query) return true
    return (
      item.name.toLowerCase().includes(query) || item.categoryName.toLowerCase().includes(query)
    )
  })
})

function formatPrice(price: number): string {
  return `₱${price.toFixed(2)}`
}

function showToast(text: string, unavailable: boolean) {
  toastState.value = { text, unavailable }
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastState.value = null
    toastTimer = null
  }, 4000)
}

async function applyStockUpdate(
  product: StaffProduct,
  nextAvailable: boolean,
  nextQuantity: number,
) {
  if (busyProductId.value) return
  const clampedQuantity = Math.max(0, Math.min(999, nextQuantity))
  const resolvedAvailable = clampedQuantity === 0 ? false : nextAvailable
  const availabilityChanged = resolvedAvailable !== product.available

  busyProductId.value = product.id
  try {
    const updated = await productsStore.updateProduct(product.id, {
      available: resolvedAvailable,
      quantity: clampedQuantity,
    })
    if (availabilityChanged) {
      showToast(
        updated.available ? `${updated.name} is available` : `${updated.name} is unavailable`,
        !updated.available,
      )
    }
  } catch {
    // Store sets errorMessage for the alert banner.
  } finally {
    busyProductId.value = null
  }
}

async function handleToggleAvailability(product: StaffProduct) {
  const nextAvailable = !product.available
  const nextQuantity = nextAvailable && product.quantity === 0 ? 1 : product.quantity
  await applyStockUpdate(product, nextAvailable, nextQuantity)
}

async function handleAdjustQuantity(product: StaffProduct, delta: number) {
  const nextQuantity = Math.max(0, Math.min(999, product.quantity + delta))
  if (nextQuantity === product.quantity) return
  const nextAvailable = nextQuantity === 0 ? false : product.available || delta > 0
  await applyStockUpdate(product, nextAvailable, nextQuantity)
}

onMounted(() => {
  stopWatching = productsStore.startWatching()
})

onUnmounted(() => {
  stopWatching?.()
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="available-page">
    <div class="available-container">
      <header class="available-toolbar">
        <label class="available-search">
          <img
            :src="searchIcon"
            alt=""
            aria-hidden="true"
            class="available-search__icon"
          />
          <input
            v-model="searchQuery"
            type="search"
            class="available-search__input"
            placeholder="Search"
            aria-label="Search menu items"
          />
        </label>

        <div class="available-filters" role="tablist" aria-label="Filter items by availability">
          <button
            type="button"
            role="tab"
            class="filter-pill"
            :class="{ 'filter-pill--active': activeFilter === 'all' }"
            :aria-selected="activeFilter === 'all'"
            @click="activeFilter = 'all'"
          >
            <span class="filter-pill__label">All items</span>
            <span class="filter-pill__badge">
              <img
                :src="filterBadgeAll"
                alt=""
                aria-hidden="true"
                width="20"
                height="20"
                class="filter-pill__badge-bg"
              />
              <span class="filter-pill__badge-count">{{ productsStore.totalCount }}</span>
            </span>
          </button>

          <button
            type="button"
            role="tab"
            class="filter-pill"
            :class="{ 'filter-pill--active': activeFilter === 'available' }"
            :aria-selected="activeFilter === 'available'"
            @click="activeFilter = 'available'"
          >
            <span class="filter-pill__label">Available</span>
            <span class="filter-pill__badge">
              <img
                :src="filterBadgeAvailable"
                alt=""
                aria-hidden="true"
                width="20"
                height="20"
                class="filter-pill__badge-bg"
              />
              <span class="filter-pill__badge-count">{{ productsStore.availableCount }}</span>
            </span>
          </button>

          <button
            type="button"
            role="tab"
            class="filter-pill"
            :class="{ 'filter-pill--active': activeFilter === 'unavailable' }"
            :aria-selected="activeFilter === 'unavailable'"
            @click="activeFilter = 'unavailable'"
          >
            <span class="filter-pill__label">Unavailable</span>
            <span class="filter-pill__badge">
              <img
                :src="filterBadgeUnavailable"
                alt=""
                aria-hidden="true"
                width="20"
                height="20"
                class="filter-pill__badge-bg"
              />
              <span class="filter-pill__badge-count">{{ productsStore.unavailableCount }}</span>
            </span>
          </button>
        </div>
      </header>

      <p v-if="productsStore.errorMessage" class="available-error" role="alert">
        {{ productsStore.errorMessage }}
      </p>

      <div class="available-table">
        <div class="available-table__head" aria-hidden="true">
          <span class="available-col--avail">Available</span>
          <span class="available-col--name">Name</span>
          <span class="available-col--price">Price</span>
          <span class="available-col--qty">Quantity</span>
        </div>

        <div class="available-table__body">
          <div v-if="productsStore.loading && !productsStore.loaded" class="available-empty">
            Loading menu items...
          </div>

          <div v-else-if="!filteredProducts.length" class="available-empty">
            No menu items match the current filter.
          </div>

          <div
            v-for="product in filteredProducts"
            v-else
            :key="product.id"
            class="available-row"
            :data-available="product.available"
          >
            <div class="available-col--avail">
              <button
                type="button"
                class="avail-pill"
                :class="product.available ? 'avail-pill--yes' : 'avail-pill--no'"
                :aria-label="`Toggle ${product.name} availability (currently ${product.available ? 'Yes' : 'No'})`"
                :aria-pressed="product.available"
                :disabled="busyProductId === product.id"
                @click="handleToggleAvailability(product)"
              >
                <span class="avail-pill__text">{{ product.available ? 'Yes' : 'No' }}</span>
              </button>
            </div>

            <div class="available-col--name">
              <span class="available-row__name">{{ product.name }}</span>
            </div>

            <div class="available-col--price">
              <span class="available-row__price">{{ formatPrice(product.price) }}</span>
            </div>

            <div class="available-col--qty">
              <div class="qty-stepper" :aria-label="`Quantity controls for ${product.name}`">
                <button
                  type="button"
                  class="qty-stepper__jump"
                  :aria-label="`Decrease ${product.name} quantity by 5`"
                  :disabled="busyProductId === product.id || product.quantity === 0"
                  @click="handleAdjustQuantity(product, -5)"
                >
                  -5
                </button>

                <button
                  type="button"
                  class="qty-stepper__icon-btn"
                  :aria-label="`Decrease ${product.name} quantity by 1`"
                  :disabled="busyProductId === product.id || product.quantity === 0"
                  @click="handleAdjustQuantity(product, -1)"
                >
                  <img :src="qtyMinus" alt="" aria-hidden="true" width="18" height="18" class="qty-stepper__icon" />
                </button>

                <span class="qty-stepper__value">{{ product.quantity }}</span>

                <button
                  type="button"
                  class="qty-stepper__icon-btn"
                  :aria-label="`Increase ${product.name} quantity by 1`"
                  :disabled="busyProductId === product.id || product.quantity >= 999"
                  @click="handleAdjustQuantity(product, 1)"
                >
                  <img :src="qtyPlus" alt="" aria-hidden="true" width="18" height="18" class="qty-stepper__icon" />
                </button>

                <button
                  type="button"
                  class="qty-stepper__jump"
                  :aria-label="`Increase ${product.name} quantity by 5`"
                  :disabled="busyProductId === product.id || product.quantity >= 999"
                  @click="handleAdjustQuantity(product, 5)"
                >
                  +5
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toastState" class="available-toast" role="status" aria-live="polite">
      <img
        :src="toastState.unavailable ? toastDotUnavailable : toastDotAvailable"
        alt=""
        aria-hidden="true"
        width="10"
        height="10"
        class="available-toast__dot"
      />
      <span class="available-toast__text">{{ toastState.text }}</span>
    </div>
  </section>
</template>

<style scoped>
.available-page {
  position: relative;
  flex: 1;
  min-height: 100%;
  background-color: #f6f6f6;
  padding: 28px 36px 36px;
}

.available-container {
  width: min(775px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.available-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.available-search {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  width: 225px;
  height: 42px;
  padding: 0 12px 0 9px;
  background-color: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
}

.available-search:focus-within {
  border-color: #5d7706;
  box-shadow: 0 0 0 2px rgba(93, 119, 6, 0.16);
}

.available-search__icon {
  display: block;
  width: 17.091px;
  height: 17px;
  flex-shrink: 0;
}

.available-search__input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #000000;
  font-size: 16px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 1.6px;
  outline: none;
}

.available-search__input::placeholder {
  color: #000000;
  opacity: 1;
}

.available-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 146px;
  height: 30px;
  padding: 0 14px;
  border: 1px solid #5d7706;
  border-radius: 15px;
  background-color: #ffffff;
  color: #5f5e5a;
  font-size: 16px;
  font-weight: 400;
  line-height: normal;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.filter-pill:hover {
  background-color: #f4f7ea;
}

.filter-pill--active {
  background-color: #eaf2d3;
  color: #293802;
}

.filter-pill--active .filter-pill__label {
  font-weight: 600;
}

.filter-pill:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 2px;
}

.filter-pill__badge {
  position: relative;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.filter-pill__badge-bg {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
}

.filter-pill__badge-count {
  position: relative;
  z-index: 1;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.available-error {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid #d98278;
  border-radius: 10px;
  background-color: #fdf1ef;
  color: #8f2419;
  font-size: 13px;
}

.available-table {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 140px);
  min-height: 460px;
  max-height: 608px;
  background-color: #ffffff;
  border: 2px solid #5d7706;
  border-radius: 15px;
  overflow: hidden;
}

.available-table__head {
  display: grid;
  grid-template-columns: 112px minmax(170px, 1fr) 136px 190px;
  align-items: center;
  height: 51px;
  flex-shrink: 0;
  padding: 0 22px;
  background-color: #5d7706;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.6px;
}

.available-table__head span {
  font-weight: 700;
}

.available-table__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 15px 9px;
  overflow-y: auto;
}

.available-empty {
  padding: 44px 16px;
  color: #5f5e5a;
  font-size: 14px;
  text-align: center;
}

.available-row {
  display: grid;
  grid-template-columns: 112px minmax(170px, 1fr) 136px 190px;
  align-items: center;
  min-height: 49px;
  flex-shrink: 0;
  padding: 6px 13px;
  background-color: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
}

.available-col--avail {
  display: flex;
  align-items: center;
}

.available-col--name {
  min-width: 0;
  padding-right: 12px;
}

.available-col--price {
  text-align: center;
}

.available-col--qty {
  display: flex;
  justify-content: center;
}

.avail-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 63px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 20px;
  color: #ffffff;
  cursor: pointer;
  transition: filter 120ms ease;
}

.avail-pill--yes {
  background-color: #279305;
}

.avail-pill--no {
  background-color: #ec0b0b;
}

.avail-pill:hover:not(:disabled) {
  filter: brightness(1.08);
}

.avail-pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.avail-pill__text {
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.3px;
}

.available-row__name {
  display: block;
  color: #000000;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 1.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.available-row__price {
  color: #5f5e5a;
  font-size: 16px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.6px;
  font-variant-numeric: tabular-nums;
}

.qty-stepper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.qty-stepper__jump {
  padding: 2px 3px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #000000;
  font-size: 16px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.6px;
  cursor: pointer;
}

.qty-stepper__jump:hover:not(:disabled) {
  background-color: #f3f1ea;
}

.qty-stepper__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.qty-stepper__icon {
  display: block;
  width: 18px;
  height: 18px;
}

.qty-stepper__value {
  min-width: 28px;
  color: #000000;
  font-size: 16px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.6px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.qty-stepper__jump:disabled,
.qty-stepper__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-stepper__jump:focus-visible,
.qty-stepper__icon-btn:focus-visible,
.avail-pill:focus-visible {
  outline: 2px solid #5d7706;
  outline-offset: 2px;
}

.available-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 160px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  background-color: #405909;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
}

.available-toast__dot {
  display: block;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.available-toast__text {
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1px;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .available-page {
    padding: 20px 16px 28px;
  }

  .available-table__head,
  .available-row {
    grid-template-columns: 84px minmax(120px, 1fr) 105px 165px;
    padding-inline: 12px;
  }
}

@media (max-width: 680px) {
  .available-table__head {
    display: none;
  }

  .available-row {
    grid-template-columns: 1fr auto;
    row-gap: 8px;
    padding: 12px;
  }

  .available-col--price {
    text-align: left;
  }

  .available-col--qty {
    justify-content: flex-end;
  }
}
</style>
