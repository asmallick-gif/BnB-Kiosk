import { menuCategories } from '@/data/menu'
import { supabase } from '@/lib/supabase'

export type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'ready' | 'completed' | 'rejected'
export interface OrderItem {
  id: string
  name: string
  quantity: number
  lineTotal: number
}
export interface KioskOrder {
  token: string
  requestId: string
  queueNumber: number
  orderType: 'Dine-in' | 'Take-out'
  paymentMethod: 'cash' | 'e-wallet'
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  status: OrderStatus
  createdAt: string
}
export interface OrderRequest {
  requestId: string
  orderType: string
  paymentMethod: 'cash' | 'e-wallet'
  items: { id: string; quantity: number }[]
}

// The development adapter allows kiosk UI work before the staff backend is deployed.
// It is deliberately unavailable in a production build.
export const isLocalOrderDemo = !supabase && import.meta.env.DEV
export const activeOrderKey = 'bnb.active-order'
const localPrefix = 'bnb.demo-order.'
const acceptedStatuses: OrderStatus[] = ['confirmed', 'cooking', 'ready', 'completed']
export const isOrderConfirmed = (order: KioskOrder) => acceptedStatuses.includes(order.status)
export const queueLabel = (number: number) => `#${String(number).padStart(3, '0')}`

function parseOrder(data: unknown): KioskOrder {
  const order = data as KioskOrder
  if (
    !order ||
    typeof order.token !== 'string' ||
    !Number.isSafeInteger(order.queueNumber) ||
    !['pending', 'confirmed', 'cooking', 'ready', 'completed', 'rejected'].includes(order.status)
  ) {
    throw new Error('The order service returned an invalid response.')
  }
  return order
}

export async function submitOrder(request: OrderRequest): Promise<KioskOrder> {
  if (supabase) {
    const { data, error } = await supabase.rpc('create_kiosk_order', { p_request: request })
    if (error) throw new Error('Your order could not be sent. Please try again or ask the cashier.')
    return parseOrder(data)
  }
  if (!isLocalOrderDemo)
    throw new Error('Ordering is unavailable. Please ask the cashier for help.')
  const create = () => {
    const existing = window.localStorage.getItem(localPrefix + request.requestId)
    if (existing) return parseOrder(JSON.parse(existing))
    const catalog = menuCategories.flatMap((category) => category.items)
    if (
      !request.items.length ||
      !['Dine-in', 'Take-out'].includes(request.orderType) ||
      !['cash', 'e-wallet'].includes(request.paymentMethod)
    )
      throw new Error('Please review your order.')
    const items = request.items.map((entry) => {
      const item = catalog.find((product) => product.id === entry.id && product.available)
      if (
        !item ||
        !Number.isSafeInteger(entry.quantity) ||
        entry.quantity < 1 ||
        entry.quantity > 99
      ) {
        throw new Error('Please review the items and quantities in your order.')
      }
      return {
        id: item.id,
        name: item.name,
        quantity: entry.quantity,
        lineTotal: item.price * entry.quantity,
      }
    })
    const orders = Object.keys(window.localStorage)
      .filter((key) => key.startsWith(localPrefix))
      .map((key) => parseOrder(JSON.parse(window.localStorage.getItem(key)!)))
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const order: KioskOrder = {
      token: crypto.randomUUID(),
      requestId: request.requestId,
      queueNumber: Math.max(0, ...orders.map((entry) => entry.queueNumber)) + 1,
      orderType: request.orderType as KioskOrder['orderType'],
      paymentMethod: request.paymentMethod,
      items,
      subtotal: total,
      discount: 0,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    window.localStorage.setItem(localPrefix + request.requestId, JSON.stringify(order))
    return order
  }
  return navigator.locks ? navigator.locks.request('bnb-create-order', create) : create()
}

export async function getOrder(token: string): Promise<KioskOrder> {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_kiosk_order', { p_token: token })
    if (error) throw new Error('Unable to check your order. Reconnecting…')
    if (!data) throw new Error('This order could not be found. Please ask the cashier.')
    return parseOrder(data)
  }
  if (!isLocalOrderDemo) throw new Error('Order tracking is unavailable. Please ask the cashier.')
  for (const key of Object.keys(window.localStorage).filter((key) => key.startsWith(localPrefix))) {
    const order = parseOrder(JSON.parse(window.localStorage.getItem(key)!))
    if (order.token === token) return order
  }
  throw new Error('This order could not be found. Please ask the cashier.')
}
