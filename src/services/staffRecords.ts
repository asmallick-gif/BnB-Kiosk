import { queueLabel, type KioskOrder } from '@/services/orders'

export type DateRangePreset = 'today' | 'week' | 'month' | 'all'
export type OrderTypeFilter = 'all' | 'Dine-in' | 'Take-out'
export type RecordSortKey = 'orderId' | 'item' | 'qty' | 'orderType' | 'amount' | 'date'
export type SortDirection = 'asc' | 'desc'

export interface ServedItemRow {
  rowKey: string
  orderToken: string
  queueNumber: number
  orderLabel: string
  itemId: string
  itemName: string
  quantity: number
  orderType: KioskOrder['orderType']
  amount: number
  createdAt: string
  timestamp: number
}

export interface ServedRecordsSummary {
  itemsServed: number
  completedOrderCount: number
  totalSales: number
  bestSeller: {
    name: string
    quantity: number
  } | null
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function isDateInRange(isoDate: string, preset: DateRangePreset, now = new Date()): boolean {
  if (preset === 'all') return true
  const timestamp = Date.parse(isoDate)
  if (Number.isNaN(timestamp)) return false

  const target = new Date(timestamp)
  const todayStart = startOfLocalDay(now)
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()

  if (preset === 'today') {
    return timestamp >= todayStart && timestamp < tomorrowStart
  }

  if (preset === 'week') {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()
    return timestamp >= weekStart && timestamp < tomorrowStart
  }

  // 'month'
  return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth()
}

export function formatDateRangeSubtitle(preset: DateRangePreset, now = new Date()): string {
  const day = now.getDate()
  const month = SHORT_MONTHS[now.getMonth()] ?? ''
  const year = now.getFullYear()

  if (preset === 'today') {
    return `${day} ${month} ${year}`
  }

  if (preset === 'week') {
    const start = new Date(year, now.getMonth(), day - 6)
    const startMonth = SHORT_MONTHS[start.getMonth()] ?? ''
    if (start.getFullYear() !== year) {
      return `${start.getDate()} ${startMonth} ${start.getFullYear()} – ${day} ${month} ${year}`
    }
    return `${start.getDate()} ${startMonth} – ${day} ${month} ${year}`
  }

  if (preset === 'month') {
    return `${month} ${year}`
  }

  return 'All recorded dates'
}

export function filterCompletedOrdersByDate(
  orders: KioskOrder[],
  preset: DateRangePreset,
  now = new Date(),
): KioskOrder[] {
  return orders.filter(
    (order) => order.status === 'completed' && isDateInRange(order.createdAt, preset, now),
  )
}

export function buildServedItemRows(completedOrders: KioskOrder[]): ServedItemRow[] {
  const rows: ServedItemRow[] = []

  for (const order of completedOrders) {
    if (order.status !== 'completed') continue
    const timestamp = Date.parse(order.createdAt)
    const orderLabel = queueLabel(order.queueNumber)

    order.items.forEach((item, index) => {
      rows.push({
        rowKey: `${order.token}-${item.id}-${index}`,
        orderToken: order.token,
        queueNumber: order.queueNumber,
        orderLabel,
        itemId: item.id,
        itemName: item.name,
        quantity: item.quantity,
        orderType: order.orderType,
        amount: item.lineTotal,
        createdAt: order.createdAt,
        timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
      })
    })
  }

  return rows
}

export function summarizeServedRecords(completedOrders: KioskOrder[]): ServedRecordsSummary {
  const servedOrders = completedOrders.filter((order) => order.status === 'completed')
  let itemsServed = 0
  let totalSales = 0

  const itemTotals = new Map<string, { name: string; quantity: number; revenue: number }>()

  for (const order of servedOrders) {
    totalSales += order.total
    for (const item of order.items) {
      itemsServed += item.quantity
      const key = item.name.trim().toLowerCase()
      const current = itemTotals.get(key) ?? { name: item.name, quantity: 0, revenue: 0 }
      current.quantity += item.quantity
      current.revenue += item.lineTotal
      itemTotals.set(key, current)
    }
  }

  let bestSeller: ServedRecordsSummary['bestSeller'] = null
  let bestRevenue = -1

  for (const entry of itemTotals.values()) {
    if (
      !bestSeller ||
      entry.quantity > bestSeller.quantity ||
      (entry.quantity === bestSeller.quantity && entry.revenue > bestRevenue) ||
      (entry.quantity === bestSeller.quantity &&
        entry.revenue === bestRevenue &&
        entry.name.localeCompare(bestSeller.name) < 0)
    ) {
      bestSeller = { name: entry.name, quantity: entry.quantity }
      bestRevenue = entry.revenue
    }
  }

  return {
    itemsServed,
    completedOrderCount: servedOrders.length,
    totalSales,
    bestSeller,
  }
}

export function sortServedItemRows(
  rows: ServedItemRow[],
  sortBy: RecordSortKey,
  direction: SortDirection,
): ServedItemRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'orderId':
        cmp = a.queueNumber - b.queueNumber
        break
      case 'item':
        cmp = a.itemName.localeCompare(b.itemName)
        break
      case 'qty':
        cmp = a.quantity - b.quantity
        break
      case 'orderType':
        cmp = a.orderType.localeCompare(b.orderType)
        break
      case 'amount':
        cmp = a.amount - b.amount
        break
      case 'date':
      default:
        cmp = a.timestamp - b.timestamp || a.queueNumber - b.queueNumber
        break
    }
    if (cmp !== 0) return cmp * factor
    return b.queueNumber - a.queueNumber
  })
}

export function formatRecordDateParts(isoDate: string): { date: string; time: string } {
  const timestamp = Date.parse(isoDate)
  if (Number.isNaN(timestamp)) return { date: '—', time: '' }
  const d = new Date(timestamp)
  const day = d.getDate()
  const month = SHORT_MONTHS[d.getMonth()] ?? ''
  const hours24 = d.getHours()
  const meridiem = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return {
    date: `${day} ${month}`,
    time: `${hours12}:${minutes} ${meridiem}`,
  }
}

function escapeCsvCell(value: string | number): string {
  const raw = String(value)
  // Guard against CSV formula injection in spreadsheet tools.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildRecordsCsv(rows: ServedItemRow[]): string {
  const header = ['Order ID', 'Item', 'Qty', 'Order Type', 'Amount (PHP)', 'Date & Time']
  const lines = rows.map((row) => {
    const parts = formatRecordDateParts(row.createdAt)
    return [
      row.orderLabel,
      row.itemName,
      row.quantity,
      row.orderType,
      row.amount.toFixed(2),
      `${parts.date} ${parts.time}`.trim(),
    ]
      .map(escapeCsvCell)
      .join(',')
  })
  return [header.map(escapeCsvCell).join(','), ...lines].join('\r\n')
}
