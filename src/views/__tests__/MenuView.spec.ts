import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MenuView from '../MenuView.vue'

describe('order review', () => {
  let wrapper: VueWrapper

  beforeEach(async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/menu', component: MenuView }],
    })
    await router.push('/menu?type=take-out')
    await router.isReady()
    wrapper = mount(MenuView, { attachTo: document.body, global: { plugins: [router] } })
    wrapper.get('dialog').element.setAttribute('open', '')
  })

  afterEach(() => wrapper.unmount())

  const clickButton = async (label: string) => {
    await wrapper.get(`button[aria-label="${label}"]`).trigger('click')
  }

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
    expect(wrapper.find('.order-count').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('.add-more-button').element)
  })
})
