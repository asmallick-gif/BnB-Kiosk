import { describe, expect, it } from 'vitest'
import type { KioskOrder } from '../orders'
import {
  buildRecordsCsv,
  buildServedItemRows,
  filterCompletedOrdersByDate,
  sortServedItemRows,
  summarizeServedRecords,
} from '../staffRecords'

function makeOrder(overrides: Partial<KioskOrder>): KioskOrder {
  return {
    token: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    queueNumber: 1,
    orderType: 'Dine-in',
    paymentMethod: 'cash',
    items: [{ id: 'best-sellers-1', name: 'Spanish Latte', quantity: 1, lineTotal: 180 }],
    subtotal: 180,
    discount: 0,
    total: 180,
    status: 'completed',
    createdAt: '2026-11-20T02:45:00.000Z',
    ...overrides,
  }
}

describe('staff records analytics and CSV helpers', () => {
  const now = new Date('2026-11-20T12:00:00')

  it('filters completed orders by date range and excludes cancelled or pending orders', () => {
    const orders: KioskOrder[] = [
      makeOrder({ queueNumber: 24, createdAt: '2026-11-20T10:45:00' }),
      makeOrder({ queueNumber: 23, createdAt: '2026-11-17T09:00:00' }),
      makeOrder({ queueNumber: 22, createdAt: '2026-11-02T09:00:00' }),
      makeOrder({ queueNumber: 21, status: 'rejected', createdAt: '2026-11-20T10:50:00' }),
      makeOrder({ queueNumber: 20, status: 'pending', createdAt: '2026-11-20T10:55:00' }),
    ]

    expect(filterCompletedOrdersByDate(orders, 'today', now).map((o) => o.queueNumber)).toEqual([
      24,
    ])
    expect(filterCompletedOrdersByDate(orders, 'week', now).map((o) => o.queueNumber)).toEqual([
      24, 23,
    ])
    expect(filterCompletedOrdersByDate(orders, 'month', now).map((o) => o.queueNumber)).toEqual([
      24, 23, 22,
    ])
    expect(filterCompletedOrdersByDate(orders, 'all', now)).toHaveLength(3)
  })

  it('counts total qty served, sums total sales, and picks highest-qty best seller', () => {
    const orders: KioskOrder[] = [
      makeOrder({
        queueNumber: 24,
        total: 420,
        items: [
          { id: 'best-sellers-1', name: 'Spanish Latte', quantity: 2, lineTotal: 240 },
          { id: 'pasta-2', name: 'Chicken Alfredo', quantity: 1, lineTotal: 180 },
        ],
      }),
      makeOrder({
        queueNumber: 23,
        orderType: 'Take-out',
        total: 240,
        items: [{ id: 'best-sellers-1', name: 'Spanish Latte', quantity: 2, lineTotal: 240 }],
      }),
      makeOrder({
        queueNumber: 22,
        total: 150,
        items: [{ id: 'best-sellers-4', name: 'Mac n Cheese', quantity: 1, lineTotal: 150 }],
      }),
      makeOrder({
        queueNumber: 99,
        status: 'rejected',
        total: 999,
        items: [{ id: 'x', name: 'Cancelled Drink', quantity: 10, lineTotal: 999 }],
      }),
    ]

    const summary = summarizeServedRecords(orders)
    expect(summary.itemsServed).toBe(6)
    expect(summary.completedOrderCount).toBe(3)
    expect(summary.totalSales).toBe(810)
    expect(summary.bestSeller).toEqual({ name: 'Spanish Latte', quantity: 4 })

    const rows = buildServedItemRows(orders)
    expect(rows).toHaveLength(4)

    const sortedByQty = sortServedItemRows(rows, 'qty', 'asc')
    expect(sortedByQty[0]?.quantity).toBe(1)
    expect(sortedByQty[3]?.quantity).toBe(2)
  })

  it('neutralizes CSV formula injection payloads when exporting', () => {
    const rows = buildServedItemRows([
      makeOrder({
        queueNumber: 5,
        items: [{ id: 'x', name: '=CMD|calc', quantity: 1, lineTotal: 100 }],
      }),
    ])
    const csv = buildRecordsCsv(rows)
    expect(csv).toContain('"\'=CMD|calc"')
  })
})
