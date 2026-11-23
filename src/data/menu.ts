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
        name: 'Hungarian Sausage with Mushroom Sauce',
        price: 190,
        image: '/menu/hungarian-sausage-mushroom-sauce.png',
        available: true,
      },
      {
        id: 'rice-meals-2',
        name: 'Chicken Cheese Steak',
        price: 190,
        image: '/menu/chicken-cheese-steak.png',
        available: true,
      },
      {
        id: 'rice-meals-3',
        name: 'Beef Bulgogi',
        price: 190,
        image: '/menu/beef-bulgogi.png',
        available: true,
      },
      {
        id: 'rice-meals-4',
        name: 'Omurice',
        price: 190,
        image: '/menu/omurice.png',
        available: true,
      },
      {
        id: 'rice-meals-5',
        name: 'Chicken Steak w/ Mashed Potato',
        price: 220,
        image: '/menu/chicken-steak-mashed-potato.png',
        available: true,
      },
      {
        id: 'rice-meals-6',
        name: 'Pork Steak w/ Mashed Potato',
        price: 230,
        image: '/menu/pork-steak-mashed-potato.png',
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
        name: 'Mac N Cheese',
        price: 250,
        image: '/menu/mac-n-cheese.png',
        available: true,
      },
      {
        id: 'pasta-2',
        name: 'Cajun Shrimp',
        price: 270,
        image: '/menu/cajun-shrimp.png',
        available: true,
      },
      {
        id: 'pasta-3',
        name: 'Chicken Alfredo',
        price: 270,
        image: '/menu/chicken-alfredo.png',
        available: true,
      },
      {
        id: 'pasta-4',
        name: 'Chicken Pesto',
        price: 270,
        image: '/menu/chicken-pesto.png',
        available: true,
      },
      {
        id: 'pasta-5',
        name: 'Truffle Mushroom',
        price: 280,
        image: '/menu/truffle-mushroom.png',
        available: true,
      },
      {
        id: 'pasta-6',
        name: 'Kiniing Aglio Olio',
        price: 280,
        image: '/menu/kiniing-aglio-olio.png',
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
        name: 'Samyang Fries',
        price: 180,
        image: '/menu/samyang-fries.png',
        available: true,
      },
      {
        id: 'noodles-2',
        name: 'Samyang Poppers',
        price: 200,
        image: '/menu/samyang-poppers.png',
        available: true,
      },
      {
        id: 'noodles-3',
        name: 'Samyang Chicken Steak',
        price: 210,
        image: '/menu/samyang-chicken-steak.png',
        available: true,
      },
      {
        id: 'noodles-4',
        name: 'Mi Goreng Stirfry Veggies',
        price: 210,
        image: '/menu/mi-goreng-stirfry-veggies.png',
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
        name: 'Chicken Wings — 3 pcs with rice',
        price: 170,
        image: '/menu/chicken-wings-3pcs-rice.png',
        available: true,
      },
      {
        id: 'chicken-wings-2',
        name: 'Chicken Wings — 8 pcs',
        price: 270,
        image: '/menu/chicken-wings-8pcs.png',
        available: true,
      },
    ],
  },
  {
    id: 'burgers',
    name: 'Burgers',
    items: [
      {
        id: 'burgers-1',
        name: 'Chicken Korean Crunch',
        price: 200,
        image: '/menu/chicken-korean-crunch.png',
        available: true,
      },
      {
        id: 'burgers-2',
        name: 'Classic Cheese Beef Burger',
        price: 220,
        image: '/menu/classic-cheese-beef-burger.png',
        available: true,
      },
    ],
  },
  {
    id: 'hot-coffee',
    name: 'Hot Coffee',
    items: [
      {
        id: 'hot-coffee-1',
        name: 'Espresso',
        price: 140,
        image: '/menu/espresso.png',
        available: true,
      },
      {
        id: 'hot-coffee-2',
        name: 'Long Black',
        price: 160,
        image: '/menu/long-black.png',
        available: true,
      },
      {
        id: 'hot-coffee-3',
        name: 'Cafe Latte',
        price: 180,
        image: '/menu/cafe-latte.png',
        available: true,
      },
      {
        id: 'hot-coffee-4',
        name: 'Cappuccino',
        price: 180,
        image: '/menu/cappuccino.png',
        available: true,
      },
      {
        id: 'hot-coffee-5',
        name: 'Flat White',
        price: 180,
        image: '/menu/flat-white.png',
        available: true,
      },
      {
        id: 'hot-coffee-6',
        name: 'Spanish Latte',
        price: 180,
        image: '/menu/hot-spanish-latte.png',
        available: true,
      },
      {
        id: 'hot-coffee-7',
        name: 'V60',
        price: 190,
        image: '/menu/v60.png',
        available: true,
      },
    ],
  },
  {
    id: 'iced-coffee',
    name: 'Iced Coffee',
    items: [
      {
        id: 'iced-coffee-1',
        name: 'Iced Long Black',
        price: 170,
        image: '/menu/iced-long-black.png',
        available: true,
      },
      {
        id: 'iced-coffee-2',
        name: 'Iced Latte',
        price: 190,
        image: '/menu/iced-coffee-latte.png',
        available: true,
      },
      {
        id: 'iced-coffee-3',
        name: 'Iced Spanish Latte',
        price: 190,
        image: '/menu/iced-spanish-latte.png',
        available: true,
      },
      {
        id: 'iced-coffee-4',
        name: 'Iced V60',
        price: 190,
        image: '/menu/iced-v60.png',
        available: true,
      },
    ],
  },
  {
    id: 'hojicha',
    name: 'Hojicha',
    items: [
      {
        id: 'hojicha-1',
        name: 'Hojicha Latte',
        price: 160,
        image: '/menu/hojicha-latte.png',
        available: true,
      },
      {
        id: 'hojicha-2',
        name: 'Hojicha Seasalt',
        price: 180,
        image: '/menu/hojicha-seasalt.png',
        available: true,
      },
      {
        id: 'hojicha-3',
        name: 'Hojicha Black Sesame Caramel',
        price: 180,
        image: '/menu/hojicha-black-sesame-caramel.png',
        available: true,
      },
    ],
  },
  {
    id: 'bakers-coffee',
    name: 'Baker’s Coffee Menu',
    items: [
      {
        id: 'bakers-coffee-1',
        name: 'Vietnamese Latte',
        price: 190,
        image: '/menu/vietnamese-latte.png',
        available: true,
      },
      {
        id: 'bakers-coffee-2',
        name: 'Cinespresso',
        price: 190,
        image: '/menu/cinespresso.png',
        available: true,
      },
      {
        id: 'bakers-coffee-3',
        name: 'Coconut Espresso',
        price: 190,
        image: '/menu/coconut-espresso.png',
        available: true,
      },
      {
        id: 'bakers-coffee-4',
        name: 'Pumpkin Iced Latte',
        price: 190,
        image: '/menu/pumpkin-iced-latte.png',
        available: true,
      },
      {
        id: 'bakers-coffee-5',
        name: 'Dirty Chai Latte',
        price: 190,
        image: '/menu/dirty-chai-latte.png',
        available: true,
      },
    ],
  },
  {
    id: 'non-coffee',
    name: 'Non-Coffee (Milk Based)',
    items: [
      {
        id: 'non-coffee-1',
        name: 'Iced Cocoa Thick Latte',
        price: 170,
        image: '/menu/iced-cocoa-thick-latte.png',
        available: true,
      },
      {
        id: 'non-coffee-2',
        name: 'Strawberry Choco',
        price: 170,
        image: '/menu/strawberry-choco.png',
        available: true,
      },
      {
        id: 'non-coffee-3',
        name: 'Biscoff Caramel Latte',
        price: 170,
        image: '/menu/biscoff-caramel-latte.png',
        available: true,
      },
      {
        id: 'non-coffee-4',
        name: 'Oreo Chocolate Latte',
        price: 170,
        image: '/menu/oreo-chocolate-latte.png',
        available: true,
      },
      {
        id: 'non-coffee-5',
        name: 'Hot Cocoa Latte',
        price: 170,
        image: '/menu/hot-cocoa-latte.png',
        available: true,
      },
    ],
  },
  {
    id: 'matcha-series',
    name: 'Matcha Series',
    items: [
      {
        id: 'matcha-series-1',
        name: 'Classic Matcha',
        price: 170,
        image: '/menu/classic-matcha.png',
        available: true,
      },
      {
        id: 'matcha-series-2',
        name: 'Strawberry Matcha',
        price: 170,
        image: '/menu/strawberry-matcha.png',
        available: true,
      },
      {
        id: 'matcha-series-3',
        name: 'Matcha Seasalt Foam',
        price: 170,
        image: '/menu/matcha-seasalt-foam.png',
        available: true,
      },
      {
        id: 'matcha-series-4',
        name: 'Biscoff Matcha',
        price: 170,
        image: '/menu/biscoff-matcha-series.png',
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
