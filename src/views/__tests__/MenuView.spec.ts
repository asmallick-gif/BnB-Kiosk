import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MenuView from '../MenuView.vue'

describe('order review', () => {
  let wrapper: VueWrapper

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  })

  beforeEach(async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/menu', component: MenuView }],
    })
    await router.push('/menu?type=take-out')
    await router.isReady()
    wrapper = mount(MenuView, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    await flushPromises()
    wrapper.get('dialog').element.setAttribute('open', '')
  })

  afterEach(() => wrapper.unmount())

  const clickButton = async (label: string) => {
    await wrapper.get(`button[aria-label="${label}"]`).trigger('click')
  }

  it('opens checkout with current totals and preserves the cart when returning to edit', async () => {
    expect(wrapper.get('.checkout-button').attributes('disabled')).toBeDefined()
    await clickButton('Add Spanish Latte to order')
    await clickButton('Add Mac N Cheese to order')
    await clickButton('Increase Spanish Latte quantity')
    await wrapper.get('.checkout-button').trigger('click')
    await flushPromises()

    expect(wrapper.get('#receipt-title').text()).toBe('Receipt Preview')
    expect(wrapper.get('.receipt-header p').text()).toBe('Take-out - 3 items')
    expect(wrapper.findAll('.receipt-items li').map((item) => item.text())).toEqual([
      '2 × Spanish Latte₱360.00',
      '1 × Mac N Cheese₱250.00',
    ])
    expect(wrapper.get('.receipt-total').text()).toBe('Total₱610.00')
    expect(document.activeElement).toBe(wrapper.get('#receipt-title').element)
    expect(wrapper.get<HTMLInputElement>('input[value="cash"]').element.checked).toBe(true)
    await wrapper.get('input[value="e-wallet"]').setValue()

    await wrapper.get('.back-button').trigger('click')
    await flushPromises()
    expect(wrapper.get('#review-title').text()).toBe('Your take-out order')
    expect(wrapper.get('output[aria-label="Quantity of Spanish Latte"]').text()).toBe('2')
    expect(wrapper.get('.review-total').text()).toBe('Total₱610.00')
    expect(document.activeElement).toBe(wrapper.get('.add-more-button').element)
    await wrapper.get('.checkout-button').trigger('click')
    expect(wrapper.get<HTMLInputElement>('input[value="e-wallet"]').element.checked).toBe(true)
  })

  it('keeps line prices, totals, and the menu count in sync when quantities change', async () => {
    await clickButton('Add Spanish Latte to order')
    await clickButton('Add Mac N Cheese to order')
    expect(wrapper.get('.review-totals').text()).toContain('Subtotal:₱430.00')
    expect(wrapper.get('.review-totals').text()).toContain('Discount:₱0.00')

    await clickButton('Increase Spanish Latte quantity')
    expect(wrapper.get('output[aria-label="Quantity of Spanish Latte"]').text()).toBe('2')
    expect(wrapper.get('.review-item-price').text()).toBe('₱360.00')
    expect(wrapper.get('.review-total').text()).toBe('Total₱610.00')
    expect(wrapper.get('.order-count').text()).toBe('3')
    expect(wrapper.get('.total').text()).toBe('Total: ₱610.00')

    await clickButton('Decrease Spanish Latte quantity')
    expect(wrapper.get('.review-total').text()).toBe('Total₱430.00')
    expect(wrapper.get('.order-count').text()).toBe('2')
  })

  it('removes items at zero and provides a way back when the order becomes empty', async () => {
    await clickButton('Add Spanish Latte to order')
    await clickButton('Add Mac N Cheese to order')
    await clickButton('Decrease Spanish Latte quantity')
    await flushPromises()
    expect(wrapper.find('output[aria-label="Quantity of Spanish Latte"]').exists()).toBe(false)
    expect(wrapper.findAll('.review-item')).toHaveLength(1)
    expect(wrapper.get('.review-total').text()).toBe('Total₱250.00')
    expect(document.activeElement).toBe(wrapper.get('.add-more-button').element)

    await clickButton('Decrease Mac N Cheese quantity')
    await flushPromises()
    expect(wrapper.findAll('.review-item')).toHaveLength(0)
    expect(wrapper.get('[role="status"]').text()).toContain('Your order is empty')
    expect(wrapper.get('.review-total').text()).toBe('Total₱0.00')
    expect(wrapper.get('.order-summary .view-order').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.checkout-button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.order-count').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('.add-more-button').element)
  })
})
