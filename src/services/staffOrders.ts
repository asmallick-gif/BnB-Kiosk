import { supabase } from '@/lib/supabase'
import { isValidUuid } from '@/lib/security'
import {
  isLocalOrderDemo,
  localOrderPrefix,
  parseOrder,
  type KioskOrder,
  type OrderStatus,
} from '@/services/orders'

const validStatuses = new Set<OrderStatus>([
  'pending',
  'confirmed',
  'cooking',
  'ready',
  'completed',
  'rejected',
])

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['cooking'],
  cooking: ['ready'],
  ready: ['completed'],
  completed: [],
  rejected: [],
}

export function getAllowedNextStatuses(status: OrderStatus): OrderStatus[] {
  return allowedTransitions[status] ?? []
}

function readLocalDemoOrders(): KioskOrder[] {
  const orders: KioskOrder[] = []
  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith(localOrderPrefix)) continue
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    try {
      orders.push(parseOrder(JSON.parse(raw)))
    } catch {
      // Ignore malformed local preview entries
    }
  }
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function listStaffOrders(): Promise<KioskOrder[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc('staff_list_orders')
    if (error) {
      throw new Error(error.message || 'Unable to load orders.')
    }
    const rows = Array.isArray(data) ? data : []
    return rows.map((entry) => parseOrder(entry))
  }

  if (!isLocalOrderDemo) {
    throw new Error('Staff order service is unavailable. Please configure Supabase.')
  }

  return readLocalDemoOrders()
}

export async function updateStaffOrderStatus(
  token: string,
  nextStatus: OrderStatus,
): Promise<KioskOrder> {
  if (!validStatuses.has(nextStatus)) {
    throw new Error('Invalid order status.')
  }

  if (supabase) {
    if (!isValidUuid(token)) {
      throw new Error('Invalid order token.')
    }
    const { data, error } = await supabase.rpc('staff_update_order_status', {
      p_token: token,
      p_status: nextStatus,
    })
    if (error) {
      throw new Error(error.message || 'Unable to update order status.')
    }
    return parseOrder(data)
  }

  if (!isLocalOrderDemo) {
    throw new Error('Staff order service is unavailable. Please configure Supabase.')
  }

  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith(localOrderPrefix)) continue
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    let order: KioskOrder
    try {
      order = parseOrder(JSON.parse(raw))
    } catch {
      continue
    }
    if (order.token !== token) continue

    if (!getAllowedNextStatuses(order.status).includes(nextStatus)) {
      throw new Error(`Cannot change order from ${order.status} to ${nextStatus}.`)
    }

    const updated: KioskOrder = { ...order, status: nextStatus }
    window.localStorage.setItem(key, JSON.stringify(updated))
    return updated
  }

  throw new Error('Order could not be found.')
}

export function subscribeStaffOrders(onChange: () => void): () => void {
  const client = supabase
  if (client) {
    const channel = client
      .channel('staff-orders-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        onChange()
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }

  if (isLocalOrderDemo) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(localOrderPrefix)) {
        onChange()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }

  return () => {}
}
