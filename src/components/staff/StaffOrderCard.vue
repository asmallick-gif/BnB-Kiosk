<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatElapsedDuration } from '@/lib/format'
import { queueLabel, type KioskOrder, type OrderStatus } from '@/services/orders'
import cardDivider from '@/assets/staff/dashboard/card-divider.svg'

const props = defineProps<{
  order: KioskOrder
  nowMs: number
  busy?: boolean
}>()

const emit = defineEmits<{
  advance: [payload: { order: KioskOrder; nextStatus: OrderStatus }]
}>()

const checkedItemIds = ref<string[]>([])

function toggleItem(itemId: string) {
  if (checkedItemIds.value.includes(itemId)) {
    checkedItemIds.value = checkedItemIds.value.filter((id) => id !== itemId)
  } else {
    checkedItemIds.value = [...checkedItemIds.value, itemId]
  }
}

function isItemChecked(itemId: string): boolean {
  return checkedItemIds.value.includes(itemId)
}

const elapsedLabel = computed(() => formatElapsedDuration(props.order.createdAt, props.nowMs))

const paymentSummary = computed(() => {
  const method = props.order.paymentMethod === 'e-wallet' ? 'E-wallet' : 'Cash'
  return `${method} · ₱${props.order.total.toFixed(0)}`
})

const actionConfig = computed<{ label: string; nextStatus: OrderStatus; variant: string } | null>(
  () => {
    switch (props.order.status) {
      case 'confirmed':
        return { label: 'Start Cooking', nextStatus: 'cooking', variant: 'cooking' }
      case 'cooking':
        return { label: 'Mark Ready', nextStatus: 'ready', variant: 'ready' }
      case 'ready':
        return { label: 'Mark Served', nextStatus: 'completed', variant: 'served' }
      default:
        return null
    }
  },
)
</script>

<template>
  <article class="order-card" :data-status="order.status">
    <header class="order-card__header">
      <span class="order-card__queue-pill">{{ queueLabel(order.queueNumber) }}</span>
      <span class="order-card__type">{{ order.orderType }}</span>
    </header>

    <div class="order-card__columns" aria-hidden="true">
      <span>Qty</span>
      <span>Item</span>
    </div>

    <img :src="cardDivider" alt="" aria-hidden="true" width="197" height="1" class="order-card__divider" />

    <ul class="order-card__items">
      <li
        v-for="item in order.items"
        :key="item.id"
        class="order-card__item"
        :class="{ 'order-card__item--checked': isItemChecked(item.id) }"
      >
        <span class="order-card__qty">{{ item.quantity }}</span>
        <span class="order-card__name">{{ item.name }}</span>
        <button
          type="button"
          class="order-card__checkbox"
          :class="{ 'order-card__checkbox--checked': isItemChecked(item.id) }"
          :aria-label="`Mark ${item.name} prepared`"
          :aria-pressed="isItemChecked(item.id)"
          @click="toggleItem(item.id)"
        >
          <span v-if="isItemChecked(item.id)" class="order-card__checkmark" aria-hidden="true">
            &#10003;
          </span>
        </button>
      </li>
    </ul>

    <img :src="cardDivider" alt="" aria-hidden="true" width="197" height="1" class="order-card__divider" />

    <footer v-if="order.status === 'pending'" class="order-card__footer order-card__footer--prompt">
      <div class="payment-prompt" role="group" :aria-label="`Payment confirmation for ${queueLabel(order.queueNumber)}`">
        <div class="payment-prompt__meta">
          <span class="payment-prompt__badge">{{ paymentSummary }}</span>
          <span class="payment-prompt__timer">{{ elapsedLabel }}</span>
        </div>
        <p class="payment-prompt__question">Paid &amp; receipt issued?</p>
        <div class="payment-prompt__actions">
          <button
            type="button"
            class="payment-prompt__btn payment-prompt__btn--proceed"
            title="Customer has paid and received their physical receipt"
            :disabled="busy"
            @click="emit('advance', { order, nextStatus: 'confirmed' })"
          >
            Proceed
          </button>
          <button
            type="button"
            class="payment-prompt__btn payment-prompt__btn--cancel"
            title="Customer wants to cancel their order"
            :disabled="busy"
            @click="emit('advance', { order, nextStatus: 'rejected' })"
          >
            Cancel
          </button>
        </div>
      </div>
    </footer>

    <footer v-else class="order-card__footer">
      <div class="elapsed-pill">
        <span class="elapsed-pill__label">Time Elapsed</span>
        <span class="elapsed-pill__time">{{ elapsedLabel }}</span>
      </div>

      <button
        v-if="actionConfig"
        type="button"
        class="order-card__cta"
        :class="`order-card__cta--${actionConfig.variant}`"
        :disabled="busy"
        @click="emit('advance', { order, nextStatus: actionConfig.nextStatus })"
      >
        {{ actionConfig.label }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.order-card {
  display: flex;
  flex-direction: column;
  height: 277px;
  width: 100%;
  background-color: #ffffff;
  border: 2px solid #5d7706;
  overflow: hidden;
}

.order-card__header {
  display: flex;
  align-items: center;
  height: 28px;
  flex-shrink: 0;
  padding: 0 6px 0 2px;
  background-color: #5d7706;
}

.order-card__queue-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 67px;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  background-color: #ffffff;
  color: #000000;
  font-size: 15px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.5px;
}

.order-card__type {
  flex: 1;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.5px;
  text-align: center;
  white-space: nowrap;
}

.order-card__columns {
  display: grid;
  grid-template-columns: 45px 1fr;
  padding: 14px 9px 4px;
  color: #5f5e5a;
  font-size: 10px;
  font-weight: 500;
  line-height: normal;
  letter-spacing: 1px;
}

.order-card__divider {
  display: block;
  width: 197px;
  max-width: 100%;
  height: 1px;
  margin: 0 auto;
  flex-shrink: 0;
}

.order-card__items {
  flex: 1;
  min-height: 0;
  list-style: none;
  margin: 0;
  padding: 8px 14px 6px 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.order-card__item {
  display: grid;
  grid-template-columns: 31px minmax(0, 1fr) 15px;
  align-items: start;
  gap: 4px;
  color: #000000;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 1px;
}

.order-card__item--checked .order-card__name,
.order-card__item--checked .order-card__qty {
  color: #898781;
  text-decoration: line-through;
}

.order-card__name {
  text-transform: uppercase;
  overflow-wrap: break-word;
}

.order-card__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 12px;
  margin-top: 1px;
  padding: 0;
  border: 2px solid #898781;
  background-color: #ffffff;
  cursor: pointer;
}

.order-card__checkbox--checked {
  border-color: #5d7706;
  background-color: #5d7706;
}

.order-card__checkmark {
  color: #ffffff;
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
}

.order-card__footer {
  height: 94px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px 12px;
}

.order-card__footer--prompt {
  justify-content: center;
  padding: 6px 10px 8px;
  background-color: #fdfaf0;
}

.elapsed-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 30px;
  border-radius: 16px;
  background-color: #fdf1d0;
  color: #000000;
  text-align: center;
}

.elapsed-pill__label {
  font-size: 6.25px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.625px;
}

.elapsed-pill__time {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
}

.order-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 20px;
  margin-top: 19px;
  border: 0;
  border-radius: 5px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1px;
  cursor: pointer;
  transition:
    transform 100ms ease,
    box-shadow 100ms ease,
    filter 120ms ease;
}

.order-card__cta--cooking {
  background-color: #c77824;
  box-shadow: 0 7px 0 0 #8f571a;
}

.order-card__cta--cooking:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 4px 0 0 #8f571a;
}

.order-card__cta--ready {
  background-color: #5d7706;
  box-shadow: 0 7px 0 0 #124702;
}

.order-card__cta--ready:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 4px 0 0 #124702;
}

.order-card__cta--served {
  background-color: #405909;
  box-shadow: 0 7px 0 0 #124702;
}

.order-card__cta--served:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 4px 0 0 #124702;
}

.order-card__cta:hover:not(:disabled) {
  filter: brightness(1.06);
}

.order-card__cta:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.payment-prompt {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.payment-prompt__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 4px;
}

.payment-prompt__badge {
  padding: 2px 6px;
  border-radius: 999px;
  background-color: #fdf1d0;
  color: #3d3415;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.payment-prompt__timer {
  color: #5f5e5a;
  font-size: 8.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.payment-prompt__question {
  margin: 0;
  color: #131508;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.5px;
  text-align: center;
}

.payment-prompt__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin-top: 2px;
}

.payment-prompt__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  border: 0;
  border-radius: 5px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  cursor: pointer;
  transition:
    transform 100ms ease,
    box-shadow 100ms ease,
    filter 120ms ease;
}

.payment-prompt__btn--proceed {
  background-color: #5d7706;
  box-shadow: 0 5px 0 0 #124702;
}

.payment-prompt__btn--proceed:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 3px 0 0 #124702;
}

.payment-prompt__btn--cancel {
  background-color: #b83a2d;
  box-shadow: 0 5px 0 0 #7a2118;
}

.payment-prompt__btn--cancel:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 3px 0 0 #7a2118;
}

.payment-prompt__btn:hover:not(:disabled) {
  filter: brightness(1.06);
}

.payment-prompt__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
