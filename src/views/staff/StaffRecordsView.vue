<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatPhp } from '@/lib/format'
import { isLocalOrderDemo } from '@/services/orders'
import {
  buildRecordsCsv,
  buildServedItemRows,
  filterCompletedOrdersByDate,
  formatDateRangeSubtitle,
  formatRecordDateParts,
  isDateInRange,
  sortServedItemRows,
  summarizeServedRecords,
  type DateRangePreset,
  type OrderTypeFilter,
  type RecordSortKey,
  type SortDirection,
} from '@/services/staffRecords'
import { useStaffOrdersStore } from '@/stores/staffOrders'
import searchIcon from '@/assets/staff/available/search-icon.svg'
import sortArrow from '@/assets/staff/record/sort-arrow.svg'

const ordersStore = useStaffOrdersStore()

const dateRange = ref<DateRangePreset>('today')
const searchQuery = ref('')
const orderTypeFilter = ref<OrderTypeFilter>('all')
const sortBy = ref<RecordSortKey>('date')
const sortDirection = ref<SortDirection>('desc')

const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
]

const dateSubtitle = computed(() => formatDateRangeSubtitle(dateRange.value))

const completedOrdersInRange = computed(() =>
  filterCompletedOrdersByDate(ordersStore.orders, dateRange.value),
)

const cancelledCount = computed(
  () =>
    ordersStore.orders.filter(
      (order) => order.status === 'rejected' && isDateInRange(order.createdAt, dateRange.value),
    ).length,
)

const summary = computed(() => summarizeServedRecords(completedOrdersInRange.value))

const allRowsInRange = computed(() => buildServedItemRows(completedOrdersInRange.value))

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = allRowsInRange.value.filter((row) => {
    if (orderTypeFilter.value !== 'all' && row.orderType !== orderTypeFilter.value) {
      return false
    }
    if (!query) return true
    return (
      row.orderLabel.toLowerCase().includes(query) ||
      String(row.queueNumber).includes(query) ||
      row.itemName.toLowerCase().includes(query)
    )
  })
  return sortServedItemRows(filtered, sortBy.value, sortDirection.value)
})

const sortSummaryLabel = computed(() => {
  if (sortBy.value === 'date') {
    return sortDirection.value === 'desc' ? 'Newest first' : 'Oldest first'
  }
  const labels: Record<RecordSortKey, string> = {
    orderId: 'Order ID',
    item: 'Item',
    qty: 'Qty',
    orderType: 'Order type',
    amount: 'Amount',
    date: 'Date',
  }
  return `${labels[sortBy.value]} (${sortDirection.value === 'asc' ? 'A–Z / Low' : 'Z–A / High'})`
})

const formatCurrency = formatPhp

function toggleSort(column: RecordSortKey) {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = column
    sortDirection.value = column === 'item' || column === 'orderType' ? 'asc' : 'desc'
  }
}

function toggleNewestOldest() {
  if (sortBy.value !== 'date') {
    sortBy.value = 'date'
    sortDirection.value = 'desc'
    return
  }
  sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
}

function handleExportCsv() {
  if (!filteredRows.value.length) return
  const csv = buildRecordsCsv(filteredRows.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bnb-order-records-${dateRange.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="records-page">
    <div class="records-container">
      <header class="records-header">
        <div>
          <h1 class="records-header__title">Order records</h1>
          <p class="records-header__subtitle">Review served orders and sales.</p>
        </div>

        <div class="records-date-control">
          <div class="records-select-pill">
            <svg
              class="records-calendar-icon"
              viewBox="0 0 18 18"
              width="16"
              height="16"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="3.5"
                width="14"
                height="12.5"
                rx="2.2"
                stroke="#405909"
                stroke-width="1.5"
              />
              <path d="M2 7.2h14" stroke="#405909" stroke-width="1.5" />
              <path
                d="M5.5 1.8v3M12.5 1.8v3"
                stroke="#405909"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <select
              v-model="dateRange"
              class="records-select-pill__native"
              aria-label="Filter records by date range"
            >
              <option v-for="option in dateRangeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <span class="records-select-chevron" aria-hidden="true">&#9662;</span>
          </div>
          <p class="records-date-control__subtitle">{{ dateSubtitle }}</p>
        </div>
      </header>

      <section class="records-summary" aria-label="Sales summary">
        <div class="summary-metric">
          <p class="summary-metric__label">Items served</p>
          <p class="summary-metric__value">{{ summary.itemsServed }}</p>
          <p class="summary-metric__sub">
            {{ summary.completedOrderCount }}
            {{ summary.completedOrderCount === 1 ? 'completed order' : 'completed orders' }}
          </p>
        </div>

        <div class="summary-metric summary-metric--divided">
          <p class="summary-metric__label">Total sales</p>
          <p class="summary-metric__value">{{ formatCurrency(summary.totalSales) }}</p>
          <p class="summary-metric__sub">From served orders</p>
        </div>

        <div class="summary-metric summary-metric--divided">
          <p class="summary-metric__label">Best-selling item</p>
          <p class="summary-metric__value summary-metric__value--item">
            {{ summary.bestSeller ? summary.bestSeller.name : '—' }}
          </p>
          <p class="summary-metric__sub">
            {{ summary.bestSeller ? `${summary.bestSeller.quantity} sold` : 'No sales yet' }}
          </p>
        </div>
      </section>

      <div class="records-toolbar">
        <label class="records-search">
          <img :src="searchIcon" alt="" aria-hidden="true" class="records-search__icon" />
          <input
            v-model="searchQuery"
            type="search"
            class="records-search__input"
            placeholder="Search order ID or item"
            aria-label="Search order ID or item"
          />
        </label>

        <div class="records-type-pill">
          <select
            v-model="orderTypeFilter"
            class="records-type-pill__native"
            aria-label="Filter by order type"
          >
            <option value="all">All order types</option>
            <option value="Dine-in">Dine-in</option>
            <option value="Take-out">Take-out</option>
          </select>
          <span class="records-select-chevron" aria-hidden="true">&#9662;</span>
        </div>
      </div>

      <div class="records-section-head">
        <h2 class="records-section-head__title">Served items</h2>
        <button type="button" class="records-sort-toggle" @click="toggleNewestOldest">
          {{ sortSummaryLabel }}
        </button>
      </div>

      <p v-if="ordersStore.errorMessage" class="records-error" role="alert">
        {{ ordersStore.errorMessage }}
      </p>

      <div class="records-table-card">
        <div class="records-table-scroll">
          <table class="records-table">
            <thead>
              <tr>
                <th scope="col" class="col-order">
                  <button type="button" class="th-sort-btn" @click="toggleSort('orderId')">
                    <span>Order ID</span>
                    <img
                      :src="sortArrow"
                      alt=""
                      aria-hidden="true"
                      class="th-sort-icon"
                      :class="{
                        'th-sort-icon--active': sortBy === 'orderId',
                        'th-sort-icon--asc': sortBy === 'orderId' && sortDirection === 'asc',
                      }"
                    />
                  </button>
                </th>
                <th scope="col" class="col-item">
                  <button type="button" class="th-sort-btn" @click="toggleSort('item')">
                    <span>Item</span>
                    <img
                      :src="sortArrow"
                      alt=""
                      aria-hidden="true"
                      class="th-sort-icon"
                      :class="{
                        'th-sort-icon--active': sortBy === 'item',
                        'th-sort-icon--asc': sortBy === 'item' && sortDirection === 'asc',
                      }"
                    />
                  </button>
                </th>
                <th scope="col" class="col-qty">
                  <button
                    type="button"
                    class="th-sort-btn th-sort-btn--center"
                    @click="toggleSort('qty')"
                  >
                    <span>Qty</span>
                    <img
                      :src="sortArrow"
                      alt=""
                      aria-hidden="true"
                      class="th-sort-icon"
                      :class="{
                        'th-sort-icon--active': sortBy === 'qty',
                        'th-sort-icon--asc': sortBy === 'qty' && sortDirection === 'asc',
                      }"
                    />
                  </button>
                </th>
                <th scope="col" class="col-type">
                  <button type="button" class="th-sort-btn" @click="toggleSort('orderType')">
                    <span>Order type</span>
                    <img
                      :src="sortArrow"
                      alt=""
                      aria-hidden="true"
                      class="th-sort-icon"
                      :class="{
                        'th-sort-icon--active': sortBy === 'orderType',
                        'th-sort-icon--asc': sortBy === 'orderType' && sortDirection === 'asc',
                      }"
                    />
                  </button>
                </th>
                <th scope="col" class="col-amount">
                  <button
                    type="button"
                    class="th-sort-btn th-sort-btn--right"
                    @click="toggleSort('amount')"
                  >
                    <span>Amount</span>
                    <img
                      :src="sortArrow"
                      alt=""
                      aria-hidden="true"
                      class="th-sort-icon"
                      :class="{
                        'th-sort-icon--active': sortBy === 'amount',
                        'th-sort-icon--asc': sortBy === 'amount' && sortDirection === 'asc',
                      }"
                    />
                  </button>
                </th>
                <th scope="col" class="col-date">
                  <button type="button" class="th-sort-btn" @click="toggleSort('date')">
                    <span>Date &amp; time</span>
                    <img
                      :src="sortArrow"
                      alt=""
                      aria-hidden="true"
                      class="th-sort-icon"
                      :class="{
                        'th-sort-icon--active': sortBy === 'date',
                        'th-sort-icon--asc': sortBy === 'date' && sortDirection === 'asc',
                      }"
                    />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="ordersStore.loading && !ordersStore.loaded">
                <td colspan="6" class="records-table__empty">Loading order records...</td>
              </tr>

              <tr v-else-if="!filteredRows.length">
                <td colspan="6" class="records-table__empty">
                  No served items found for {{ dateSubtitle }}.
                </td>
              </tr>

              <tr v-for="row in filteredRows" v-else :key="row.rowKey" class="records-row">
                <td class="col-order records-cell--order">{{ row.orderLabel }}</td>
                <td class="col-item records-cell--item">
                  <span>{{ row.itemName }}</span>
                  <span
                    v-if="summary.bestSeller && row.itemName === summary.bestSeller.name"
                    class="best-seller-tag"
                  >
                    Best seller
                  </span>
                </td>
                <td class="col-qty records-cell--qty">{{ row.quantity }}</td>
                <td class="col-type records-cell--type">{{ row.orderType }}</td>
                <td class="col-amount records-cell--amount">{{ formatCurrency(row.amount) }}</td>
                <td class="col-date records-cell--date">
                  <span class="records-date-day">{{ formatRecordDateParts(row.createdAt).date }}</span>
                  <span class="records-date-time">
                    {{ formatRecordDateParts(row.createdAt).time }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="records-table-footer">
          <span class="records-table-footer__count">
            Showing {{ filteredRows.length }} of {{ allRowsInRange.length }}
            {{ allRowsInRange.length === 1 ? 'item' : 'items' }}
          </span>
          <button
            type="button"
            class="records-export-btn"
            :disabled="!filteredRows.length"
            @click="handleExportCsv"
          >
            Export CSV
          </button>
        </div>
      </div>

      <footer class="records-footnote">
        <p class="records-footnote__note">
          Amounts are per row. Cancelled orders are excluded from this summary{{
            cancelledCount > 0 ? ` (${cancelledCount} cancelled)` : ''
          }}.
        </p>
        <p v-if="isLocalOrderDemo" class="records-footnote__mode">Local preview</p>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.records-page {
  flex: 1;
  min-height: 100%;
  background-color: #f8f8f6;
  padding: 16px 26px 20px;
  color: #111111;
}

.records-container {
  width: min(820px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.records-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.records-header__title {
  margin: 0;
  color: #0b0c08;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.records-header__subtitle {
  margin: 4px 0 0;
  color: #5f5e5a;
  font-size: 14px;
  font-weight: 400;
}

.records-date-control {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.records-select-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 36px;
  min-width: 174px;
  padding: 0 32px 0 12px;
  border: 1.5px solid #5d7706;
  border-radius: 18px;
  background-color: #ffffff;
}

.records-calendar-icon {
  flex-shrink: 0;
  margin-right: 8px;
  pointer-events: none;
}

.records-select-pill__native {
  appearance: none;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  color: #1a1b14;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
}

.records-select-chevron {
  position: absolute;
  right: 12px;
  color: #405909;
  font-size: 12px;
  pointer-events: none;
}

.records-date-control__subtitle {
  margin: 0;
  color: #3f4038;
  font-size: 13px;
  font-weight: 500;
}

.records-summary {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1.25fr;
  padding: 16px 24px;
  border-radius: 18px;
  background-color: #f9f3dd;
}

.summary-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.summary-metric--divided {
  padding-left: 24px;
  border-left: 1px solid #e1d8ba;
}

.summary-metric__label {
  margin: 0;
  color: #5f5e5a;
  font-size: 14px;
  font-weight: 700;
}

.summary-metric__value {
  margin: 0;
  color: #0b0c08;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.summary-metric__value--item {
  font-size: 24px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-metric__sub {
  margin: 0;
  color: #5f5e5a;
  font-size: 13px;
  font-weight: 400;
}

.records-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.records-search {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 240px;
  max-width: 480px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #d5d3ca;
  border-radius: 10px;
  background-color: #ffffff;
}

.records-search:focus-within {
  border-color: #5d7706;
  box-shadow: 0 0 0 2px rgba(93, 119, 6, 0.16);
}

.records-search__icon {
  display: block;
  width: 17.091px;
  height: 17px;
  flex-shrink: 0;
}

.records-search__input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #111111;
  font-size: 14px;
  outline: none;
}

.records-search__input::placeholder {
  color: #6e6c65;
}

.records-type-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 190px;
  height: 38px;
  padding: 0 32px 0 16px;
  border: 1.5px solid #5d7706;
  border-radius: 19px;
  background-color: #ffffff;
}

.records-type-pill__native {
  appearance: none;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  color: #3f4038;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
}

.records-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
}

.records-section-head__title {
  margin: 0;
  color: #0b0c08;
  font-size: 19px;
  font-weight: 800;
}

.records-sort-toggle {
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #5f5e5a;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.records-sort-toggle:hover {
  background-color: #eceae2;
  color: #111111;
}

.records-error {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid #d98278;
  border-radius: 10px;
  background-color: #fdf1ef;
  color: #8f2419;
  font-size: 13px;
}

.records-table-card {
  display: flex;
  flex-direction: column;
  border: 1.5px solid #5d7706;
  border-radius: 14px;
  background-color: #ffffff;
  overflow: hidden;
}

.records-table-scroll {
  width: 100%;
  max-height: 396px;
  overflow: auto;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.records-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: #5d7706;
}

.records-table th {
  padding: 11px 14px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.th-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.th-sort-btn span {
  font-weight: 700;
}

.th-sort-btn--center {
  margin: 0 auto;
}

.th-sort-btn--right {
  margin-left: auto;
}

.th-sort-icon {
  display: block;
  width: 8.66px;
  height: 7.5px;
  opacity: 0.45;
  transform: rotate(180deg);
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.th-sort-icon--active {
  opacity: 1;
}

.th-sort-icon--asc {
  transform: rotate(0deg);
}

.records-table td {
  padding: 9px 14px;
  border-bottom: 1px solid #ebe8df;
  font-size: 14px;
  vertical-align: middle;
}

.records-row:hover {
  background-color: #fbfaf5;
}

.col-order {
  width: 102px;
}

.col-qty {
  width: 72px;
  text-align: center;
}

.col-type {
  width: 126px;
}

.col-amount {
  width: 122px;
  text-align: right;
}

.col-date {
  width: 132px;
}

.records-cell--order {
  font-weight: 800;
  color: #0b0c08;
  font-variant-numeric: tabular-nums;
}

.records-cell--item {
  font-weight: 600;
  color: #161712;
}

.records-cell--item > span:first-child {
  font-weight: 600;
}

.best-seller-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background-color: #fdf1d0;
  color: #7c4b0e;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}

.records-cell--qty {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.records-cell--type {
  font-weight: 600;
  color: #26271f;
}

.records-cell--amount {
  font-weight: 700;
  color: #111111;
  font-variant-numeric: tabular-nums;
}

.records-cell--date {
  line-height: 1.25;
}

.records-date-day {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #161712;
}

.records-date-time {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #5f5e5a;
}

.records-table__empty {
  padding: 40px 16px;
  text-align: center;
  color: #5f5e5a;
}

.records-table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background-color: #ffffff;
  border-top: 1px solid #ebe8df;
}

.records-table-footer__count {
  color: #5f5e5a;
  font-size: 13px;
}

.records-export-btn {
  padding: 5px 12px;
  border: 1px solid #5d7706;
  border-radius: 8px;
  background-color: #ffffff;
  color: #405909;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.records-export-btn:hover:not(:disabled) {
  background-color: #5d7706;
  color: #ffffff;
}

.records-export-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.records-footnote {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #5f5e5a;
}

.records-footnote__note,
.records-footnote__mode {
  margin: 0;
}

@media (max-width: 860px) {
  .records-summary {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .summary-metric--divided {
    padding-left: 0;
    padding-top: 14px;
    border-left: 0;
    border-top: 1px solid #e1d8ba;
  }
}
</style>
