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
        name: 'Spanish Latte',
        price: 180,
        image: '/menu/spanish-latte.png',
        available: true,
      },
      {
        id: 'best-sellers-2',
        name: 'Iced Latte',
        price: 170,
        image: '/menu/iced-latte.png',
        available: true,
      },
      {
        id: 'best-sellers-3',
        name: 'Cheesy Poppers Fries',
        price: 170,
        image: '/menu/cheesy-poppers-fries.png',
        available: true,
      },
      {
        id: 'best-sellers-4',
        name: 'Mac N Cheese',
        price: 250,
        image: '/menu/mac-n-cheese.png',
        available: true,
      },
      {
        id: 'best-sellers-5',
        name: 'Biscoff Matcha',
        price: 180,
        image: '/menu/biscoff-matcha.png',
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
        name: 'Classic Fries',
        price: 130,
        image: '/menu/classic-fries.png',
        available: true,
      },
      {
        id: 'starters-2',
        name: 'Cheesy Fries',
        price: 140,
        image: '/menu/cheesy-fries.png',
        available: true,
      },
      {
        id: 'starters-3',
        name: 'Chicken Poppers Fries',
        price: 170,
        image: '/menu/chicken-poppers-fries.png',
        available: true,
      },
      {
        id: 'starters-4',
        name: 'Beef Nachos',
        price: 190,
        image: '/menu/beef-nachos.png',
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
  title: 'Matcha Series',
  lines: ['Rose Matcha', 'Strawberry Matcha', 'Matcha Seasalt Foam'],
  priceLabel: '₱170.00',
  image: '/menu/matcha-series.png',
  imageAlt: 'Two Bake’n Brew matcha drinks with strawberry layers',
}
