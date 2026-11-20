import { menuCategories } from '@/data/menu'
import { validateProductId, validateStockQuantity } from '@/lib/security'
import { supabase } from '@/lib/supabase'

export interface StaffProduct {
  id: string
  categoryId: string
  categoryName: string
  name: string
  price: number
  available: boolean
  quantity: number
}

export interface ProductStockUpdate {
  available: boolean
  quantity: number
}

interface StoredProductOverride {
  available: boolean
  quantity: number
}

export const isLocalStaffProductsDemo = !supabase && import.meta.env.DEV
const localProductsKey = 'bnb.demo-products'

function buildDefaultProducts(): StaffProduct[] {
  return menuCategories.flatMap((category) =>
    category.items.map((item) => ({
      id: item.id,
      categoryId: category.id,
      categoryName: category.name,
      name: item.name,
      price: item.price,
      available: item.available,
      quantity: item.available ? 10 : 0,
    })),
  )
}

function readLocalOverrides(): Record<string, StoredProductOverride> {
  const raw = window.localStorage.getItem(localProductsKey)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, StoredProductOverride>)
      : {}
  } catch {
    return {}
  }
}

function writeLocalOverrides(overrides: Record<string, StoredProductOverride>): void {
  window.localStorage.setItem(localProductsKey, JSON.stringify(overrides))
}

function normalizeUpdate(update: ProductStockUpdate): ProductStockUpdate {
  const quantity = validateStockQuantity(update.quantity)
  // An item with 0 stock cannot remain available.
  const available = quantity === 0 ? false : Boolean(update.available)
  return { available, quantity }
}

export async function listStaffProducts(): Promise<StaffProduct[]> {
  const defaults = buildDefaultProducts()

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('id, category_id, name, price, available, stock_quantity')
      .order('id', { ascending: true })

    if (error) {
      throw new Error(error.message || 'Unable to load menu availability.')
    }

    if (!Array.isArray(data) || data.length === 0) {
      return defaults
    }

    const categoryNames = new Map(menuCategories.map((cat) => [cat.id, cat.name]))
    return data.map((row) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      categoryName: categoryNames.get(String(row.category_id)) ?? String(row.category_id),
      name: String(row.name),
      price: Number(row.price),
      available: Boolean(row.available),
      quantity:
        typeof row.stock_quantity === 'number'
          ? row.stock_quantity
          : Boolean(row.available)
            ? 10
            : 0,
    }))
  }

  if (!isLocalStaffProductsDemo) {
    throw new Error('Menu availability service is unavailable. Please configure Supabase.')
  }

  const overrides = readLocalOverrides()
  return defaults.map((product) => {
    const override = overrides[product.id]
    if (!override) return product
    const quantity = Number.isSafeInteger(override.quantity)
      ? Math.max(0, Math.min(999, override.quantity))
      : product.quantity
    return {
      ...product,
      quantity,
      available: quantity === 0 ? false : Boolean(override.available),
    }
  })
}

export async function updateStaffProductStock(
  productId: string,
  update: ProductStockUpdate,
): Promise<StaffProduct> {
  const id = validateProductId(productId)
  const next = normalizeUpdate(update)

  if (supabase) {
    const { data, error } = await supabase.rpc('staff_update_product_availability', {
      p_id: id,
      p_available: next.available,
      p_quantity: next.quantity,
    })
    if (error || !data) {
      throw new Error(error?.message || 'Unable to update item availability.')
    }
    const row = data as {
      id: string
      categoryId: string
      name: string
      price: number
      available: boolean
      quantity: number
    }
    const categoryName =
      menuCategories.find((cat) => cat.id === row.categoryId)?.name ?? row.categoryId
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryName,
      name: row.name,
      price: Number(row.price),
      available: Boolean(row.available),
      quantity: Number(row.quantity),
    }
  }

  if (!isLocalStaffProductsDemo) {
    throw new Error('Menu availability service is unavailable. Please configure Supabase.')
  }

  const defaults = buildDefaultProducts()
  const base = defaults.find((item) => item.id === id)
  if (!base) {
    throw new Error('Menu item could not be found.')
  }

  const overrides = readLocalOverrides()
  overrides[id] = next
  writeLocalOverrides(overrides)

  return {
    ...base,
    available: next.available,
    quantity: next.quantity,
  }
}

export function subscribeStaffProducts(onChange: () => void): () => void {
  const client = supabase
  if (client) {
    const channel = client
      .channel('staff-products-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        onChange()
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }

  if (isLocalStaffProductsDemo) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === localProductsKey) {
        onChange()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }

  return () => {}
}
