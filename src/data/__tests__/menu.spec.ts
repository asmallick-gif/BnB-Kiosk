import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { menuCategories } from '../menu'

const projectRoot = resolve(__dirname, '../../..')

describe('menu catalog and database seed integrity', () => {
  it('includes all expected categories including Hojicha, Baker’s Coffee Menu, Non-Coffee, and Matcha Series', () => {
    const categoryIds = menuCategories.map((category) => category.id)
    expect(categoryIds).toEqual(
      expect.arrayContaining(['hojicha', 'bakers-coffee', 'non-coffee', 'matcha-series']),
    )

    const itemsById = new Map(
      menuCategories.flatMap((category) => category.items.map((item) => [item.id, item] as const)),
    )

    expect(itemsById.get('hojicha-1')).toMatchObject({ name: 'Hojicha Latte', price: 160 })
    expect(itemsById.get('hojicha-3')).toMatchObject({
      name: 'Hojicha Black Sesame Caramel',
      price: 180,
    })
    expect(itemsById.get('bakers-coffee-1')).toMatchObject({
      name: 'Vietnamese Latte',
      price: 190,
    })
    expect(itemsById.get('bakers-coffee-5')).toMatchObject({
      name: 'Dirty Chai Latte',
      price: 190,
    })
    expect(itemsById.get('non-coffee-1')).toMatchObject({
      name: 'Iced Cocoa Thick Latte',
      price: 170,
    })
    expect(itemsById.get('non-coffee-5')).toMatchObject({ name: 'Hot Cocoa Latte', price: 170 })
    expect(itemsById.get('matcha-series-1')).toMatchObject({ name: 'Classic Matcha', price: 170 })
    expect(itemsById.get('matcha-series-4')).toMatchObject({ name: 'Biscoff Matcha', price: 170 })
  })

  it('keeps unique valid product IDs, non-empty local images, and matching Supabase seed rows', () => {
    const allItems = menuCategories.flatMap((category) =>
      category.items.map((item) => ({ categoryId: category.id, item })),
    )
    const ids = allItems.map((entry) => entry.item.id)
    expect(new Set(ids).size).toBe(ids.length)

    const schemaSql = readFileSync(resolve(projectRoot, 'docs/supabase-staff-schema.sql'), 'utf8')

    for (const { categoryId, item } of allItems) {
      expect(item.id).toMatch(/^[a-z0-9-]{1,64}$/)
      expect(categoryId).toMatch(/^[a-z0-9-]{1,64}$/)
      expect(item.price).toBeGreaterThan(0)

      const imagePath = resolve(projectRoot, 'public', item.image.replace(/^\//, ''))
      expect(existsSync(imagePath), `Missing image file for ${item.id}: ${item.image}`).toBe(true)
      expect(statSync(imagePath).size).toBeGreaterThan(0)

      expect(
        schemaSql.includes(`('${item.id}', '${categoryId}',`),
        `Missing SQL seed row for ${item.id} in docs/supabase-staff-schema.sql`,
      ).toBe(true)
    }
  })
})
