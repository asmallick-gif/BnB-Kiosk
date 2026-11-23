import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listMenuProducts } from '../products'

type QueryResult = Promise<{ data: unknown; error: { message: string } | null }>
interface QueryMock {
  select: ReturnType<typeof vi.fn<(columns: string) => QueryMock>>
  order: ReturnType<typeof vi.fn<(column: string, options: { ascending: boolean }) => QueryMock>>
  abortSignal: ReturnType<typeof vi.fn<(signal: AbortSignal) => QueryResult>>
}

const api = vi.hoisted(() => {
  const query: QueryMock = {
    select: vi.fn<(columns: string) => QueryMock>(),
    order: vi.fn<(column: string, options: { ascending: boolean }) => QueryMock>(),
    abortSignal: vi.fn<(signal: AbortSignal) => QueryResult>(),
  }
  return {
    client: null as null | { from: ReturnType<typeof vi.fn<(table: string) => QueryMock>> },
    query,
  }
})
vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return api.client
  },
}))

const row = {
  id: 'best-sellers-1',
  category_id: 'best-sellers',
  name: 'API Spanish Latte',
  price: '185.50',
  available: true,
  stock_quantity: 3,
}

beforeEach(() => {
  vi.resetAllMocks()
  api.client = { from: vi.fn<(table: string) => QueryMock>().mockReturnValue(api.query) }
  api.query.select.mockReturnValue(api.query)
  api.query.order.mockReturnValue(api.query)
  api.query.abortSignal.mockResolvedValue({ data: [row], error: null })
})
afterEach(() => vi.useRealTimers())

describe('customer product API', () => {
  it('reads API prices and names, retaining known categories and photos', async () => {
    const categories = await listMenuProducts()
    expect(api.client?.from).toHaveBeenCalledWith('products')
    expect(api.query.select).toHaveBeenCalledWith(
      'id, category_id, name, price, available, stock_quantity',
    )
    expect(api.query.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(categories).toHaveLength(1)
    expect(categories[0]?.name).toBe('Best Sellers')
    expect(categories[0]?.items).toEqual([
      {
        id: row.id,
        name: row.name,
        price: 185.5,
        image: '/menu/spanish-latte.png',
        available: true,
        stockQuantity: 3,
      },
    ])
  })

  it('marks zero stock and explicitly unavailable products unavailable', async () => {
    api.query.abortSignal.mockResolvedValue({
      data: [
        { ...row, stock_quantity: 0 },
        { ...row, id: 'best-sellers-2', available: false },
      ],
      error: null,
    })
    const categories = await listMenuProducts()
    expect(categories[0]?.items.map((item) => item.available)).toEqual([false, false])
  })

  it('preserves category order and supports new database products without fabricated photos', async () => {
    api.query.abortSignal.mockResolvedValue({
      data: [
        { ...row, id: 'special-1', category_id: 'special-drinks' },
        { ...row, id: 'pasta-2', category_id: 'pasta' },
        row,
      ],
      error: null,
    })
    const categories = await listMenuProducts()
    expect(categories.map((category) => category.id)).toEqual([
      'best-sellers',
      'pasta',
      'special-drinks',
    ])
    expect(categories[2]?.items[0]?.image).toBe('')
  })

  it('keeps an empty catalog empty instead of substituting sample products', async () => {
    api.query.abortSignal.mockResolvedValue({ data: [], error: null })
    expect(await listMenuProducts()).toEqual([])
  })

  it.each([
    null,
    [{ ...row, price: -1 }],
    [{ ...row, price: '' }],
    [{ ...row, stock_quantity: 1.5 }],
    [{ ...row, available: 'false' }],
    [{ ...row, category_id: 'bad selector]' }],
    [row, row],
  ])('rejects malformed or duplicate API data: %j', async (data) => {
    api.query.abortSignal.mockResolvedValue({ data, error: null })
    await expect(listMenuProducts()).rejects.toThrow('invalid response')
  })

  it('returns an understandable message on API and network failures', async () => {
    api.query.abortSignal.mockResolvedValueOnce({
      data: null,
      error: { message: 'internal details' },
    })
    await expect(listMenuProducts()).rejects.toThrow('We could not load the menu')
    api.query.abortSignal.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(listMenuProducts()).rejects.toThrow('We could not load the menu')
  })

  it('aborts a request that exceeds ten seconds', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    api.query.abortSignal.mockImplementation((value: AbortSignal) => {
      signal = value
      return new Promise((resolve) => {
        value.addEventListener('abort', () =>
          resolve({ data: null, error: { message: 'aborted' } }),
        )
      })
    })
    await Promise.all([
      expect(listMenuProducts()).rejects.toThrow('We could not load the menu'),
      vi.advanceTimersByTimeAsync(10_000),
    ])
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('retains the unconfigured development preview', async () => {
    api.client = null
    const categories = await listMenuProducts()
    expect(categories.flatMap((category) => category.items)).toHaveLength(27)
    expect(categories[0]?.items[0]?.stockQuantity).toBeNull()
  })
})
