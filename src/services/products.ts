import { menuCategories, type MenuCategory, type MenuItem } from '@/data/menu'
import { supabase } from '@/lib/supabase'

export interface Product extends MenuItem {
  stockQuantity: number | null
}

export interface ProductCategory extends MenuCategory {
  items: Product[]
}

export const isLocalMenuDemo = !supabase && import.meta.env.DEV
const loadError = 'We could not load the menu. Please try again or ask the cashier.'
const invalidResponse = 'The menu service returned an invalid response. Please ask the cashier.'
const knownItems = new Map(
  menuCategories.flatMap((category) => category.items.map((item) => [item.id, item])),
)
const identifier = /^[a-z0-9-]{1,64}$/

function parseProduct(value: unknown): {
  categoryId: string
  product: Product
} {
  if (!value || typeof value !== 'object') throw new Error(invalidResponse)
  const row = value as Record<string, unknown>
  const price =
    typeof row.price === 'number' || (typeof row.price === 'string' && row.price.trim())
      ? Number(row.price)
      : NaN
  if (
    typeof row.id !== 'string' ||
    !identifier.test(row.id) ||
    typeof row.category_id !== 'string' ||
    !identifier.test(row.category_id) ||
    typeof row.name !== 'string' ||
    !row.name.trim() ||
    row.name.length > 120 ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof row.available !== 'boolean' ||
    typeof row.stock_quantity !== 'number' ||
    !Number.isSafeInteger(row.stock_quantity) ||
    row.stock_quantity < 0 ||
    row.stock_quantity > 999
  )
    throw new Error(invalidResponse)

  return {
    categoryId: row.category_id,
    product: {
      id: row.id,
      name: row.name.trim(),
      price,
      image: knownItems.get(row.id)?.image ?? '',
      available: row.available && row.stock_quantity > 0,
      stockQuantity: row.stock_quantity,
    },
  }
}

export async function listMenuProducts(): Promise<ProductCategory[]> {
  if (!supabase) {
    if (!isLocalMenuDemo) throw new Error('The menu is unavailable. Please ask the cashier.')
    return menuCategories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({ ...item, stockQuantity: null })),
    }))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let data: unknown
  try {
    const result = await supabase
      .from('products')
      .select('id, category_id, name, price, available, stock_quantity')
      .order('id', { ascending: true })
      .abortSignal(controller.signal)
    if (result.error) throw new Error(loadError)
    data = result.data
  } catch {
    throw new Error(loadError)
  } finally {
    clearTimeout(timeout)
  }

  if (!Array.isArray(data)) throw new Error(invalidResponse)
  const grouped = new Map<string, Product[]>()
  const ids = new Set<string>()
  for (const value of data) {
    const { categoryId, product } = parseProduct(value)
    if (ids.has(product.id)) throw new Error(invalidResponse)
    ids.add(product.id)
    if (!grouped.has(categoryId)) grouped.set(categoryId, [])
    grouped.get(categoryId)!.push(product)
  }

  // Keep the designed category order and local photos without adding missing API products.
  const categories: ProductCategory[] = []
  for (const category of menuCategories) {
    const products = grouped.get(category.id)
    if (products) {
      categories.push({
        id: category.id,
        name: category.name,
        items: products,
      })
      grouped.delete(category.id)
    }
  }
  for (const [id, products] of grouped) {
    categories.push({ id, name: id.replace(/-/g, ' '), items: products })
  }
  return categories
}
