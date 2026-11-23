<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '@/assets/logos/bnb-logo.svg'
import { menuPromotion } from '@/data/menu'
import {
  isLocalMenuDemo,
  listMenuProducts,
  type Product,
  type ProductCategory,
} from '@/services/products'
import CheckoutView from './CheckoutView.vue'
import { activeOrderKey } from '@/services/orders'

const route = useRoute()
const router = useRouter()
const menuScroller = ref<HTMLElement | null>(null)
const categoryNav = ref<HTMLElement | null>(null)
const categories = ref<ProductCategory[]>([])
const loadingMenu = ref(true)
const menuError = ref('')
const activeCategory = ref('')
const quantities = ref<Record<string, number>>({})
const reviewDialog = ref<HTMLDialogElement | null>(null)
const viewOrderButton = ref<HTMLButtonElement | null>(null)
const addMoreButton = ref<HTMLButtonElement | null>(null)
const isClosingReview = ref(false)
const checkoutStep = ref(false)
const paymentMethod = ref<'cash' | 'e-wallet'>('cash')
const failedImages = ref(new Set<string>())
const orderType = computed(() => (route.query.type === 'take-out' ? 'Take-out' : 'Dine-in'))
const items = computed(() => categories.value.flatMap((category) => category.items))
const orderItems = computed(() =>
  items.value.filter((item) => (quantities.value[item.id] ?? 0) > 0),
)
const checkoutItems = computed(() =>
  orderItems.value.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: quantities.value[item.id] ?? 0,
    lineTotal: item.price * (quantities.value[item.id] ?? 0),
  })),
)
const itemCount = computed(() => Object.values(quantities.value).reduce((sum, n) => sum + n, 0))
const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * (quantities.value[item.id] ?? 0), 0),
)
const discount = 0
const total = computed(() => subtotal.value - discount)
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function updateActiveCategory() {
  const scroller = menuScroller.value
  if (!scroller) return
  const readingLine =
    scroller.getBoundingClientRect().top + Math.min(100, scroller.clientHeight * 0.2)
  let current = categories.value[0]?.id ?? ''
  for (const section of scroller.querySelectorAll<HTMLElement>('.menu-section')) {
    if (section.getBoundingClientRect().top <= readingLine) current = section.id
  }
  activeCategory.value = current
}

function scrollToCategory(id: string) {
  const scroller = menuScroller.value
  const section = scroller?.querySelector<HTMLElement>(`#${id}`)
  if (!scroller || !section) return
  scroller.scrollTo({
    top:
      scroller.scrollTop +
      section.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}

watch(activeCategory, async (id) => {
  await nextTick()
  const nav = categoryNav.value
  const button = nav?.querySelector<HTMLElement>(`[data-category="${id}"]`)
  if (!nav || !button) return
  const top = button.getBoundingClientRect().top - nav.getBoundingClientRect().top
  if (top < 0) nav.scrollBy({ top })
  else if (top + button.offsetHeight > nav.clientHeight)
    nav.scrollBy({ top: top + button.offsetHeight - nav.clientHeight })
})

function canAddItem(item: Product) {
  return item.available && (quantities.value[item.id] ?? 0) < Math.min(99, item.stockQuantity ?? 99)
}
function addItem(item: Product) {
  if (canAddItem(item)) quantities.value[item.id] = (quantities.value[item.id] ?? 0) + 1
}
async function decreaseItem(item: Product) {
  const quantity = quantities.value[item.id] ?? 0
  if (quantity > 1) {
    quantities.value[item.id] = quantity - 1
  } else if (quantity === 1) {
    delete quantities.value[item.id]
    await nextTick()
    addMoreButton.value?.focus()
  }
}
function cancelOrder() {
  quantities.value = {}
  router.push('/')
}
function openReview() {
  if (!itemCount.value || reviewDialog.value?.open) return
  isClosingReview.value = false
  checkoutStep.value = false
  reviewDialog.value?.showModal()
}
function proceedToCheckout() {
  if (!itemCount.value || isClosingReview.value) return
  reviewDialog.value?.close()
  checkoutStep.value = true
}
async function editOrder() {
  checkoutStep.value = false
  await nextTick()
  reviewDialog.value?.showModal()
  addMoreButton.value?.focus()
}
function closeReview() {
  if (isClosingReview.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reviewDialog.value?.close()
  } else {
    isClosingReview.value = true
  }
}
function finishReviewClose() {
  if (!isClosingReview.value) return
  reviewDialog.value?.close()
  isClosingReview.value = false
}
function restoreMenuFocus() {
  if (checkoutStep.value) return
  if (itemCount.value) viewOrderButton.value?.focus()
  else menuScroller.value?.focus()
}
async function loadMenu() {
  if (!loadingMenu.value) loadingMenu.value = true
  menuError.value = ''
  try {
    categories.value = await listMenuProducts()
    activeCategory.value = categories.value[0]?.id ?? ''
  } catch (error) {
    categories.value = []
    menuError.value =
      error instanceof Error ? error.message : 'We could not load the menu. Please try again.'
  } finally {
    loadingMenu.value = false
  }
  await nextTick()
  updateActiveCategory()
}
onMounted(() => {
  const token = window.sessionStorage.getItem(activeOrderKey)
  if (token)
    router.replace({
      name: 'order-status',
      params: { token },
      query: { kiosk: '1' },
    })
  else void loadMenu()
})
</script>

<template>
  <CheckoutView
    v-if="checkoutStep"
    v-model:payment-method="paymentMethod"
    :order-type="orderType"
    :items="checkoutItems"
    :item-count="itemCount"
    :subtotal="subtotal"
    :discount="discount"
    :total="total"
    @back="editOrder"
  />
  <main v-show="!checkoutStep" class="menu-screen">
    <header class="menu-header">
      <div class="menu-brand">
        <span
          class="menu-logo"
          role="img"
          aria-label="Bake'n Brew"
          :style="{
            maskImage: `url(${logo})`,
            WebkitMaskImage: `url(${logo})`,
          }"
        ></span>
      </div>
      <section class="promotion" aria-label="Featured menu items">
        <div class="promotion-copy">
          <h1>{{ menuPromotion.title }}</h1>
          <ul>
            <li v-for="line in menuPromotion.lines" :key="line">{{ line }}</li>
          </ul>
        </div>
        <div class="promotion-photo">
          <img
            v-if="menuPromotion.image && !failedImages.has('promotion')"
            :src="menuPromotion.image"
            :alt="menuPromotion.imageAlt"
            @error="failedImages.add('promotion')"
          />
          <span v-else>Featured image</span>
        </div>
        <div class="promotion-price">
          Starts at<strong>{{ menuPromotion.priceLabel }}</strong>
        </div>
      </section>
    </header>

    <div class="menu-body">
      <nav ref="categoryNav" class="category-nav" aria-label="Menu categories">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          :data-category="category.id"
          :aria-controls="category.id"
          :aria-current="activeCategory === category.id ? 'location' : undefined"
          :class="['category-button', { 'is-active': activeCategory === category.id }]"
          @click="scrollToCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </nav>
      <div
        ref="menuScroller"
        class="menu-content"
        tabindex="0"
        aria-label="Menu items"
        :aria-busy="loadingMenu"
        @scroll.passive="updateActiveCategory"
      >
        <div v-if="loadingMenu" class="menu-message" role="status">Loading menu…</div>
        <div v-else-if="menuError" class="menu-message" role="alert">
          <p>{{ menuError }}</p>
          <button type="button" class="menu-retry" @click="loadMenu">Try again</button>
        </div>
        <div v-else-if="!categories.length" class="menu-message" role="status">
          <p>No menu items are available right now. Please ask the cashier.</p>
          <button type="button" class="menu-retry" @click="loadMenu">Try again</button>
        </div>
        <template v-else>
          <section
            v-for="category in categories"
            :id="category.id"
            :key="category.id"
            class="menu-section"
            :aria-labelledby="`${category.id}-heading`"
          >
            <h2 :id="`${category.id}-heading`">{{ category.name }}</h2>
            <article v-for="item in category.items" :key="item.id" class="menu-item">
              <div class="product-image">
                <img
                  v-if="item.image && !failedImages.has(item.id)"
                  :src="item.image"
                  :alt="item.name"
                  loading="lazy"
                  @error="failedImages.add(item.id)"
                />
                <div v-else class="image-placeholder" aria-label="Product image placeholder">
                  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <rect x="5" y="7" width="38" height="34" rx="4" />
                    <circle cx="17" cy="18" r="4" />
                    <path d="m6 35 12-11 9 8 7-6 9 9" />
                  </svg>
                  <span>Product image</span>
                </div>
              </div>
              <div class="product-details">
                <h3>{{ item.name }}</h3>
                <p :class="['availability', { unavailable: !item.available }]">
                  {{ item.available ? 'Available' : 'Unavailable' }}
                </p>
                <div class="product-actions">
                  <span class="product-price">{{ money(item.price) }}</span>
                  <button
                    type="button"
                    class="add-button"
                    :disabled="!canAddItem(item)"
                    :aria-label="`Add ${item.name} to order`"
                    @click="addItem(item)"
                  >
                    Add to order
                  </button>
                </div>
              </div>
            </article>
          </section>
        </template>
      </div>
    </div>

    <footer class="order-bar">
      <button type="button" class="cancel-button" @click="cancelOrder">Cancel<br />Order</button>
      <div class="order-summary">
        <div>
          <span class="order-type"
            >{{ orderType }}<template v-if="isLocalMenuDemo"> · Sample menu</template></span
          >
          <p class="total" aria-live="polite">Total: {{ money(total) }}</p>
        </div>
        <button
          ref="viewOrderButton"
          type="button"
          class="view-order"
          :disabled="!itemCount"
          aria-haspopup="dialog"
          @click="openReview"
        >
          View my order<span v-if="itemCount" class="order-count">{{ itemCount }}</span>
        </button>
      </div>
    </footer>

    <dialog
      ref="reviewDialog"
      :class="['order-dialog', { 'is-closing': isClosingReview }]"
      aria-labelledby="review-title"
      @cancel.prevent="closeReview"
      @close="restoreMenuFocus"
      @animationend.self="finishReviewClose"
    >
      <header class="review-header">
        <h2 id="review-title">Your {{ orderType.toLowerCase() }} order</h2>
      </header>
      <div class="review-content">
        <ul v-if="orderItems.length" class="review-items" aria-label="Items in your order">
          <li v-for="item in orderItems" :key="item.id" class="review-item">
            <div class="quantity-controls" role="group" :aria-label="`${item.name} quantity`">
              <button
                type="button"
                class="quantity-button"
                :aria-label="`Decrease ${item.name} quantity`"
                @click="decreaseItem(item)"
              >
                −
              </button>
              <output :aria-label="`Quantity of ${item.name}`">{{ quantities[item.id] }}</output>
              <button
                type="button"
                class="quantity-button"
                :aria-label="`Increase ${item.name} quantity`"
                :disabled="!canAddItem(item)"
                @click="addItem(item)"
              >
                +
              </button>
            </div>
            <span class="review-item-name">{{ item.name }}</span>
            <span class="review-item-price">{{
              money(item.price * (quantities[item.id] ?? 0))
            }}</span>
          </li>
        </ul>
        <p v-else class="review-empty" role="status">
          Your order is empty. Tap Add more to choose your items.
        </p>
      </div>
      <footer class="review-footer">
        <dl class="review-totals" aria-live="polite" aria-atomic="true">
          <div>
            <dt>Subtotal:</dt>
            <dd>{{ money(subtotal) }}</dd>
          </div>
          <div>
            <dt>Discount:</dt>
            <dd>{{ money(discount) }}</dd>
          </div>
          <div class="review-total">
            <dt>Total</dt>
            <dd>{{ money(total) }}</dd>
          </div>
        </dl>
        <div class="review-actions">
          <button
            ref="addMoreButton"
            type="button"
            class="add-more-button"
            autofocus
            @click="closeReview"
          >
            Add more
          </button>
          <button
            type="button"
            class="checkout-button"
            :disabled="!itemCount || isClosingReview"
            @click="proceedToCheckout"
          >
            Proceed to Checkout
          </button>
        </div>
      </footer>
    </dialog>
  </main>
</template>

<style scoped>
.menu-screen {
  --olive: #617900;
  --cream: #f9f3dd;
  --rail: 21.5%;
  height: 100dvh;
  display: grid;
  grid-template-rows: clamp(160px, 18dvh, 320px) minmax(0, 1fr) clamp(100px, 10dvh, 180px);
  background: #fff;
  color: #111;
}
button {
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;
}
button:not(:disabled):active {
  transform: scale(0.98);
}
button:focus-visible,
.menu-content:focus-visible {
  outline: 3px solid #617900;
  outline-offset: -5px;
}
button:disabled {
  cursor: default;
  opacity: 0.5;
}
.menu-header {
  display: grid;
  min-height: 0;
  grid-template-columns: var(--rail) 1fr;
  gap: 3vw;
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid #e8e8e4;
}
.menu-brand {
  position: relative;
  display: grid;
  min-height: 0;
  place-items: center;
  padding: 2vw;
}
.menu-logo {
  position: absolute;
  inset: clamp(8px, 2vw, 32px);
  background: var(--olive);
  mask-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
}
.promotion {
  display: grid;
  grid-template-columns: 54% 46%;
  position: relative;
  overflow: hidden;
  border: 1px solid #344900;
  border-radius: clamp(20px, 3vw, 48px);
  background: var(--olive);
  color: #fff;
}
.promotion-copy {
  padding: clamp(8px, 1dvh, 20px) 3vw;
  align-self: center;
}
.promotion h1 {
  font-size: clamp(22px, min(4vw, 4dvh), 64px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: 0.06em;
  max-width: 10ch;
  margin-bottom: 1vw;
}
.promotion ul {
  list-style: none;
  padding: 0;
  font-size: clamp(10px, min(1.5vw, 1.4dvh), 24px);
  font-weight: 600;
  line-height: 1.5;
}
.promotion-photo {
  position: relative;
  display: grid;
  place-items: center;
  background: #e7ead7;
  color: #4d6024;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 40% 0 0 40%;
  font-size: clamp(12px, 1.8vw, 24px);
}
.promotion-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 55%;
}
.promotion-price {
  position: absolute;
  left: 48%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(18%, 13dvh);
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #111;
  font-size: clamp(10px, min(1.5vw, 1.5dvh), 22px);
  font-weight: 700;
}
.promotion-price strong {
  font-size: 1.35em;
}
.menu-body {
  display: grid;
  grid-template-columns: var(--rail) minmax(0, 1fr);
  min-height: 0;
}
.category-nav {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 3vw 2vw;
  background: #f6f6f6;
  display: flex;
  flex-direction: column;
  gap: 2vw;
  scrollbar-width: thin;
  scrollbar-color: #b7bc9c transparent;
}
.category-button {
  flex-shrink: 0;
  min-height: clamp(96px, 16vw, 260px);
  width: 100%;
  padding: 12px;
  border: 3px solid transparent;
  border-radius: clamp(20px, 3vw, 48px);
  background: #fff;
  color: #111;
  font-size: clamp(16px, 2.4vw, 34px);
  letter-spacing: 0.05em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.category-button.is-active {
  border-color: var(--olive);
  color: var(--olive);
  font-weight: 700;
}
.menu-content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #b7bc9c transparent;
}
.menu-section {
  min-height: 100%;
  padding: 3vw 3vw 1vw 2.5vw;
}
.menu-message {
  padding: 32px 24px;
  color: #62634e;
  font-size: clamp(18px, 2.4vw, 30px);
  line-height: 1.5;
}
.menu-retry {
  margin-top: 20px;
  min-height: 48px;
  padding: 12px 24px;
  border: 0;
  border-radius: 24px;
  background: var(--olive);
  color: #fff;
}
.menu-section h2 {
  font-size: clamp(24px, 3.5vw, 52px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.2;
  margin-bottom: 2vw;
}
.menu-item {
  display: grid;
  grid-template-columns: 28% minmax(0, 1fr);
  gap: 3vw;
  align-items: center;
  min-height: clamp(155px, 20vw, 340px);
  padding-block: 2vw;
}
.product-image {
  aspect-ratio: 1;
  min-width: 0;
}
.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.image-placeholder {
  width: 100%;
  height: 100%;
  background: #f4f3ec;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #76765c;
  font-size: clamp(10px, 1.2vw, 18px);
}
.image-placeholder svg {
  width: 36%;
  stroke: currentColor;
  stroke-width: 1.5;
}
.product-details {
  min-width: 0;
}
.product-details h3 {
  font-size: clamp(18px, 2.4vw, 36px);
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.availability {
  color: #297b13;
  font-size: clamp(13px, 1.5vw, 24px);
  margin-top: 6px;
}
.availability.unavailable {
  color: #80551f;
}
.product-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: clamp(20px, 3vw, 50px);
}
.product-price {
  font-size: clamp(16px, 2.2vw, 34px);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.add-button {
  border: 0;
  border-radius: 999px;
  background: var(--cream);
  color: #111;
  min-height: 48px;
  padding: 10px 2.4vw;
  font-size: clamp(14px, 2vw, 30px);
  white-space: nowrap;
}
.order-bar {
  display: grid;
  grid-template-columns: var(--rail) minmax(0, 1fr);
  border-top: 1px solid #e8e8e4;
  background: #fff;
  padding-bottom: env(safe-area-inset-bottom);
}
.cancel-button {
  border: 0;
  background: #b96a1b;
  color: #fff;
  font-size: clamp(18px, 3vw, 42px);
  font-weight: 700;
  letter-spacing: 0.06em;
}
.order-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 3vw;
}
.order-type {
  font-size: clamp(11px, 1.4vw, 18px);
  color: #62634e;
}
.total {
  font-size: clamp(20px, 2.9vw, 42px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.view-order {
  position: relative;
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  padding: 14px 3vw;
  background: var(--olive);
  color: #fff;
  font-size: clamp(16px, 2.3vw, 34px);
  font-weight: 700;
}
.order-count {
  position: absolute;
  right: -3px;
  top: -12px;
  min-width: 30px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #b96a1b;
  color: #fff;
  font-size: 20px;
}
@media (hover: hover) {
  .add-button:hover {
    background: #eee4bc;
  }
  .category-button:hover {
    background: #f9faef;
  }
  .view-order:not(:disabled):hover {
    background: #4e6200;
  }
}
.order-dialog {
  position: fixed;
  inset: auto 0 0;
  margin: 0 auto;
  width: min(100%, 1024px);
  max-width: 100%;
  height: 79dvh;
  max-height: 100dvh;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: clamp(32px, 12vw, 150px) clamp(32px, 12vw, 150px) 0 0;
  background: #fff;
  color: #111;
}
.order-dialog[open] {
  display: flex;
  flex-direction: column;
  animation: order-sheet-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.order-dialog[open].is-closing {
  animation: order-sheet-out 200ms cubic-bezier(0.4, 0, 1, 1) both;
  pointer-events: none;
}
.order-dialog::backdrop {
  background: rgb(0 0 0 / 38%);
  animation: order-backdrop-in 240ms ease both;
}
.order-dialog.is-closing::backdrop {
  animation: order-backdrop-in 200ms ease reverse both;
}
@keyframes order-sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes order-sheet-out {
  to {
    transform: translateY(100%);
  }
}
@keyframes order-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.review-header {
  flex-shrink: 0;
  padding: clamp(16px, 2.5dvh, 40px) clamp(32px, 10vw, 104px);
  border-bottom: 2px solid #92928c;
  text-align: center;
}
.order-dialog h2 {
  font-size: clamp(24px, min(5vw, 5dvh), 60px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}
.review-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: clamp(12px, 2dvh, 40px) clamp(16px, 5vw, 52px);
}
.review-items {
  list-style: none;
  padding: 0;
  margin: 0;
}
.review-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(12px, 4vw, 48px);
  padding-block: clamp(12px, 2dvh, 24px);
  font-size: clamp(17px, min(3.2vw, 3.5dvh), 34px);
}
.quantity-controls {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.8vw, 24px);
}
.quantity-controls output {
  min-width: 2ch;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.quantity-button {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 6px;
  border: 0;
  border-radius: 12px;
  background: var(--cream);
  color: #111;
  font-size: 30px;
  line-height: 1;
}
.review-item-name {
  overflow-wrap: anywhere;
}
.review-item-price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.review-empty {
  padding-block: 16px;
  text-align: center;
  color: #62634e;
  font-size: clamp(17px, 2.5vw, 28px);
}
.review-footer {
  flex-shrink: 0;
  padding: 0 clamp(16px, 5vw, 52px) max(24px, env(safe-area-inset-bottom));
}
.review-totals {
  margin: 0;
  padding: clamp(12px, 2dvh, 40px) clamp(16px, 4vw, 48px);
  border: 2px dashed #74746e;
  font-size: clamp(18px, min(3vw, 3dvh), 32px);
  font-variant-numeric: tabular-nums;
}
.review-totals > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.review-totals dd {
  margin: 0;
  white-space: nowrap;
}
.review-total {
  font-weight: 700;
}
.review-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: clamp(16px, 3dvh, 60px);
}
.add-more-button,
.checkout-button {
  min-height: 52px;
  padding: 12px 24px;
  border: 0;
  border-radius: 24px;
  background: #b96a1b;
  box-shadow: 0 6px 0 #925713;
  color: #fff;
  font-size: clamp(18px, 3vw, 32px);
  font-weight: 700;
  letter-spacing: 0.04em;
}
.add-more-button:not(:disabled):active,
.checkout-button:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #925713;
}
.checkout-button {
  background: var(--olive);
  box-shadow: 0 6px 0 #465800;
}
.checkout-button:not(:disabled):active {
  box-shadow: 0 2px 0 #465800;
}
@media (hover: hover) {
  .add-more-button:hover {
    background: #a45a12;
  }
  .checkout-button:not(:disabled):hover,
  .quantity-button:not(:disabled):hover {
    background: #4e6200;
    color: #fff;
  }
}
@media (max-width: 600px) {
  .review-item {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px 16px;
  }
  .review-item-name {
    grid-column: 1 / -1;
    grid-row: 1;
  }
  .review-actions {
    padding-top: 20px;
    flex-wrap: wrap;
  }
  .review-actions button {
    flex: 1 1 auto;
    padding-inline: 16px;
    font-size: 18px;
  }
}
@media (max-height: 500px) {
  .order-dialog {
    height: 96dvh;
  }
  .review-header {
    padding-block: 12px;
  }
  .review-footer {
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
  .review-totals {
    padding-block: 8px;
  }
  .review-actions {
    padding-top: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
  .menu-screen button:not(:disabled):active {
    transform: none;
  }
  .order-dialog[open],
  .order-dialog::backdrop {
    animation: none;
  }
}
@media (max-width: 600px) {
  .menu-screen {
    --rail: 24%;
    grid-template-rows: 140px minmax(0, 1fr) 110px;
  }
  .menu-header {
    gap: 1vw;
    padding-right: 8px;
  }
  .promotion-price {
    inset: auto 8px 8px auto;
    transform: none;
    width: 70px;
    font-size: 10px;
  }
  .promotion h1 {
    font-size: 22px;
  }
  .promotion-photo {
    font-size: 11px;
    text-align: center;
  }
  .category-button {
    padding: 8px 4px;
    font-size: 14px;
    min-height: 96px;
    border-radius: 20px;
  }
  .menu-item {
    gap: 12px;
  }
  .product-actions {
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .add-button {
    width: 100%;
    padding-inline: 10px;
  }
  .order-summary {
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 12px;
  }
  .total {
    font-size: 18px;
  }
  .view-order {
    min-height: 44px;
    padding: 10px 18px;
    font-size: 14px;
  }
}
</style>
