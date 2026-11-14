export interface MenuItem {
  id: string
  name: string
  price: number
  image: string
  available: boolean
}

export interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

// Replace these sample names/prices. Put images in public/menu/ and use
// image: '/menu/your-photo.jpg'. An empty image shows the placeholder.
export const menuCategories: MenuCategory[] = [
  {
    id: 'best-sellers',
    name: 'Best Sellers',
    items: [
      {
        id: 'best-sellers-1',
        name: 'Best seller item 1',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'best-sellers-2',
        name: 'Best seller item 2',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'best-sellers-3',
        name: 'Best seller item 3',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'best-sellers-4',
        name: 'Best seller item 4',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'best-sellers-5',
        name: 'Best seller item 5',
        price: 150,
        image: '',
        available: true,
      },
    ],
  },
  {
    id: 'starters',
    name: 'Starter',
    items: [
      {
        id: 'starters-1',
        name: 'Starter item 1',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'starters-2',
        name: 'Starter item 2',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'starters-3',
        name: 'Starter item 3',
        price: 150,
        image: '',
        available: true,
      },
    ],
  },
  {
    id: 'rice-meals',
    name: 'Rice Meals',
    items: [
      {
        id: 'rice-meals-1',
        name: 'Rice meal item 1',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'rice-meals-2',
        name: 'Rice meal item 2',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'rice-meals-3',
        name: 'Rice meal item 3',
        price: 150,
        image: '',
        available: true,
      },
    ],
  },
  {
    id: 'pasta',
    name: 'Pasta',
    items: [
      {
        id: 'pasta-1',
        name: 'Pasta item 1',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'pasta-2',
        name: 'Pasta item 2',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'pasta-3',
        name: 'Pasta item 3',
        price: 150,
        image: '',
        available: true,
      },
    ],
  },
  {
    id: 'noodles',
    name: 'Noodles',
    items: [
      {
        id: 'noodles-1',
        name: 'Noodle item 1',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'noodles-2',
        name: 'Noodle item 2',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'noodles-3',
        name: 'Noodle item 3',
        price: 150,
        image: '',
        available: true,
      },
    ],
  },
  {
    id: 'chicken-wings',
    name: 'Chicken Wings',
    items: [
      {
        id: 'chicken-wings-1',
        name: 'Chicken wings item 1',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'chicken-wings-2',
        name: 'Chicken wings item 2',
        price: 150,
        image: '',
        available: true,
      },
      {
        id: 'chicken-wings-3',
        name: 'Chicken wings item 3',
        price: 150,
        image: '',
        available: true,
      },
    ],
  },
]

export const menuPromotion = {
  title: 'Featured Series',
  lines: ['Featured item one', 'Featured item two', 'Featured item three'],
  priceLabel: '₱—',
  image: '', // Example: '/menu/promotion.jpg'
  imageAlt: 'Featured menu items',
}
