import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { listMenuProducts, type ProductCategory } from '@/services/products'
import MenuView from '../MenuView.vue'

vi.mock('@/services/products', () => ({
  isLocalMenuDemo: false,
  listMenuProducts: vi.fn<() => Promise<ProductCategory[]>>(),
}))
const catalog: ProductCategory[] = [
  {
    id: 'best-sellers',
    name: 'Best Sellers',
    items: [
      {
        id: 'best-sellers-1',
        name: 'Spanish Latte',
        price: 185.5,
        image: '/menu/spanish-latte.png',
        available: true,
        stockQuantity: 2,
      },
      {
        id: 'best-sellers-2',
        name: 'Iced Latte',
        price: 175,
        image: '/menu/iced-latte.png',
        available: false,
        stockQuantity: 0,
      },
    ],
  },
]
let wrapper: VueWrapper | undefined
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
beforeEach(() => {
  vi.resetAllMocks()
  window.sessionStorage.clear()
  vi.mocked(listMenuProducts).mockResolvedValue(catalog)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

async function openMenu() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/menu', component: MenuView }],
  })
  await router.push('/menu?type=dine-in')
  await router.isReady()
  wrapper = mount(MenuView, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  return wrapper
}

describe('customer menu API states', () => {
  it('shows loading without sample items until the request completes', async () => {
    let resolve!: (value: ProductCategory[]) => void
    vi.mocked(listMenuProducts).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const screen = await openMenu()
    expect(screen.get('.menu-content [role="status"]').text()).toBe('Loading menu…')
    expect(screen.findAll('.menu-item')).toHaveLength(0)
    expect(screen.get('.view-order').attributes('disabled')).toBeDefined()
    resolve(catalog)
    await flushPromises()
    expect(screen.findAll('.menu-item')).toHaveLength(2)
    expect(screen.get('.product-price').text()).toBe('₱185.50')
    expect(screen.get('.product-image img').attributes('src')).toBe('/menu/spanish-latte.png')
    expect(screen.get('.order-type').text()).toBe('Dine-in')
  })

  it('uses API prices in review and checkout, blocks unavailable items, and caps stock', async () => {
    const screen = await openMenu()
    await flushPromises()
    const add = screen.get('button[aria-label="Add Spanish Latte to order"]')
    expect(
      screen.get('button[aria-label="Add Iced Latte to order"]').attributes('disabled'),
    ).toBeDefined()
    await add.trigger('click')
    await screen.get('.view-order').trigger('click')
    const increase = screen.get('button[aria-label="Increase Spanish Latte quantity"]')
    await increase.trigger('click')
    expect(increase.attributes('disabled')).toBeDefined()
    expect(add.attributes('disabled')).toBeDefined()
    expect(screen.get('.review-total').text()).toBe('Total₱371.00')
    await screen.get('button[aria-label="Decrease Spanish Latte quantity"]').trigger('click')
    expect(increase.attributes('disabled')).toBeUndefined()
    await screen.get('.checkout-button').trigger('click')
    await flushPromises()
    expect(screen.get('.receipt-total').text()).toBe('Total₱185.50')
  })

  it('shows a failure with retry, then recovers without substituting sample items', async () => {
    vi.mocked(listMenuProducts).mockRejectedValueOnce(new Error('We could not load the menu.'))
    const screen = await openMenu()
    await flushPromises()
    expect(screen.get('[role="alert"]').text()).toContain('We could not load the menu.')
    expect(screen.findAll('.menu-item')).toHaveLength(0)
    await screen.get('.menu-retry').trigger('click')
    await flushPromises()
    expect(listMenuProducts).toHaveBeenCalledTimes(2)
    expect(screen.find('[role="alert"]').exists()).toBe(false)
    expect(screen.findAll('.menu-item')).toHaveLength(2)
  })

  it('explains an empty catalog and allows another attempt', async () => {
    vi.mocked(listMenuProducts).mockResolvedValueOnce([])
    const screen = await openMenu()
    await flushPromises()
    expect(screen.get('.menu-content [role="status"]').text()).toContain(
      'No menu items are available',
    )
    expect(screen.get('.view-order').attributes('disabled')).toBeDefined()
    await screen.get('.menu-retry').trigger('click')
    await flushPromises()
    expect(screen.findAll('.menu-item')).toHaveLength(2)
  })

  it('scrolls safely to categories whose slug starts with a digit', async () => {
    vi.mocked(listMenuProducts).mockResolvedValueOnce([
      {
        id: '2-for-1',
        name: '2 For 1 Deals',
        items: catalog[0]!.items,
      },
    ])
    const screen = await openMenu()
    await flushPromises()

    const scroller = screen.get('.menu-content').element as HTMLElement
    scroller.scrollTo = vi.fn<() => void>()
    await screen.get('button[data-category="2-for-1"]').trigger('click')
    expect(scroller.scrollTo).toHaveBeenCalledTimes(1)
  })
})
