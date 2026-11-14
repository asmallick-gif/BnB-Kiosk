<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '@/assets/logos/bnb-logo.svg'
import { menuCategories, menuPromotion, type MenuItem } from '@/data/menu'

const route = useRoute()
const router = useRouter()
const menuScroller = ref<HTMLElement | null>(null)
const categoryNav = ref<HTMLElement | null>(null)
const activeCategory = ref(menuCategories[0]?.id ?? '')
const quantities = ref<Record<string, number>>({})
const reviewDialog = ref<HTMLDialogElement | null>(null)
const failedImages = ref(new Set<string>())
const orderType = computed(() => (route.query.type === 'take-out' ? 'Take-out' : 'Dine-in'))
const items = menuCategories.flatMap((category) => category.items)
const orderItems = computed(() => items.filter((item) => (quantities.value[item.id] ?? 0) > 0))
const itemCount = computed(() => Object.values(quantities.value).reduce((sum, n) => sum + n, 0))
const total = computed(() =>
  items.reduce((sum, item) => sum + item.price * (quantities.value[item.id] ?? 0), 0),
)
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function updateActiveCategory() {
  const scroller = menuScroller.value
  if (!scroller) return
  const readingLine =
    scroller.getBoundingClientRect().top + Math.min(100, scroller.clientHeight * 0.2)
  let current = menuCategories[0]?.id ?? ''
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

function addItem(item: MenuItem) {
  if (item.available) quantities.value[item.id] = (quantities.value[item.id] ?? 0) + 1
}
function cancelOrder() {
  quantities.value = {}
  router.push('/')
}
onMounted(updateActiveCategory)
</script>

<template>
  <main class="menu-screen">
    <header class="menu-header">
      <div class="menu-brand">
        <span
          class="menu-logo"
          role="img"
          aria-label="Bake'n Brew"
          :style="{ maskImage: `url(${logo})`, WebkitMaskImage: `url(${logo})` }"
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
          v-for="category in menuCategories"
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
        @scroll.passive="updateActiveCategory"
      >
        <section
          v-for="category in menuCategories"
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
                  :disabled="!item.available"
                  :aria-label="`Add ${item.name} to order`"
                  @click="addItem(item)"
                >
                  Add to order
                </button>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>

    <footer class="order-bar">
      <button type="button" class="cancel-button" @click="cancelOrder">Cancel<br />Order</button>
      <div class="order-summary">
        <div>
          <span class="order-type">{{ orderType }} · Sample menu</span>
          <p class="total" aria-live="polite">Total: {{ money(total) }}</p>
        </div>
        <button
          type="button"
          class="view-order"
          :disabled="!itemCount"
          @click="reviewDialog?.showModal()"
        >
          View my order<span v-if="itemCount" class="order-count">{{ itemCount }}</span>
        </button>
      </div>
    </footer>

    <dialog ref="reviewDialog" class="order-dialog" aria-labelledby="review-title">
      <h2 id="review-title">Your {{ orderType.toLowerCase() }} order</h2>
      <p class="review-note">Sample menu preview</p>
      <ul>
        <li v-for="item in orderItems" :key="item.id">
          <span>{{ quantities[item.id] }} × {{ item.name }}</span
          ><strong>{{ money(item.price * (quantities[item.id] ?? 0)) }}</strong>
        </li>
      </ul>
      <p class="review-total">Total: {{ money(total) }}</p>
      <button type="button" class="view-order" @click="reviewDialog?.close()">Back to menu</button>
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
  grid-template-columns: var(--rail) 1fr;
  gap: 3vw;
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid #e8e8e4;
}
.menu-brand {
  display: grid;
  place-items: center;
  padding: 2vw;
}
.menu-logo {
  width: 100%;
  aspect-ratio: 183 / 114;
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
  padding: 1.5vw 3vw;
  align-self: center;
}
.promotion h1 {
  font-size: clamp(24px, 4vw, 64px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: 0.06em;
  max-width: 10ch;
  margin-bottom: 1vw;
}
.promotion ul {
  list-style: none;
  padding: 0;
  font-size: clamp(10px, 1.5vw, 24px);
  font-weight: 600;
  line-height: 1.5;
}
.promotion-photo {
  display: grid;
  place-items: center;
  background: #e7ead7;
  color: #4d6024;
  min-width: 0;
  border-radius: 40% 0 0 40%;
  font-size: clamp(12px, 1.8vw, 24px);
}
.promotion-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.promotion-price {
  position: absolute;
  left: 48%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #111;
  font-size: clamp(10px, 1.5vw, 22px);
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
  inset: 0;
  margin: auto;
  width: min(90vw, 600px);
  max-height: 80dvh;
  padding: 32px;
  border: 0;
  border-radius: 24px;
  background: #fff;
  color: #111;
}
.order-dialog::backdrop {
  background: rgb(0 0 0 / 55%);
}
.order-dialog h2 {
  font-weight: 700;
  line-height: 1.2;
}
.review-note {
  color: #62634e;
  margin-top: 8px;
}
.order-dialog ul {
  list-style: none;
  padding: 0;
  margin-block: 24px;
}
.order-dialog li {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding-block: 12px;
  border-bottom: 1px solid #e8e8e4;
}
.review-total {
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: 700;
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
    display: none;
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
